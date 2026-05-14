#!/usr/bin/env bash
# ralph.sh — Autonomous multi-agent GitHub issue solver for crewcircle-app
#
# Spawns N Claude Code agents in parallel. Each agent:
#   1. Claims the oldest open, unblocked GitHub issue
#   2. Implements it in a git worktree (TDD, lint, type-check)
#   3. Creates a pull request and moves on to the next issue
#
# PRs are reviewed by HITL. Re-run ralph.sh after merging
# to pick up newly available issues. GitHub auto-closes issues via
# "Closes #N" in the PR body.
#
# Pattern: https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
#
# Prerequisites:
#   gh        — GitHub CLI (run: gh auth login)
#   claude    — Claude Code CLI (run: npm install -g @anthropic-ai/claude-code)
#   git, jq
#
# Usage (run from the repo root):
#   ./.ralph/ralph.sh                                   # 5 agents, local mode
#   RALPH_AGENTS=3 ./.ralph/ralph.sh                    # 3 parallel agents
#   RALPH_SANDBOX=1 ./.ralph/ralph.sh                   # Isolate each agent in a Docker sandbox microVM (recommended for AFK)
#   RALPH_PRD_NUMBER=42 ./.ralph/ralph.sh               # Point agents at a PRD issue for context
#   RALPH_MAX_ITER=10 ./.ralph/ralph.sh                 # Cap at 10 issues per agent then stop
#   RALPH_TIMEOUT=7200 ./.ralph/ralph.sh                # Claude timeout in seconds per issue (default: 3600)
#   RALPH_MODEL=claude-opus-4-7 ./.ralph/ralph.sh       # Override model (default: claude-sonnet-4-6)
#
# Layout:
#   .ralph/            ← source code (committed)
#     ralph.sh         ← this script
#     parse_claude_error.py
#     render_prompt.py
#     prompts/         ← prompt templates ({{NAME}} placeholders)
#     .runtime/        ← runtime state (gitignored): logs, worktrees, lock, generated prompts

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Config — all overridable via env vars
# ─────────────────────────────────────────────────────────────
REPO="${RALPH_REPO:-ChazUK/crewcircle-app}"
NUM_AGENTS="${RALPH_AGENTS:-5}"
MAX_ITER="${RALPH_MAX_ITER:-20}"        # Max issues per agent before it self-terminates
SANDBOX="${RALPH_SANDBOX:-0}"           # 1 = wrap each claude invocation in Docker
PRD_NUMBER="${RALPH_PRD_NUMBER:-}"      # GitHub issue # that contains the PRD (optional)
AGENT_TIMEOUT="${RALPH_TIMEOUT:-600}"   # Seconds before killing a hung claude process
CLAUDE_MODEL="${RALPH_MODEL:-claude-sonnet-4-6}" # Model passed to --model flag
CLAUDE_EFFORT="${RALPH_EFFORT:-high}" # Effort passed to --max-tokens flag

CLAIMED_LABEL="ralph-in-progress"
BLOCKED_LABEL="blocked"
READY_LABEL="ready-for-agent"
HUMAN_LABEL="ready-for-human"
PRD_LABEL="prd"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
STATE_DIR="$SCRIPT_DIR/.runtime"
WORKTREES_DIR="$STATE_DIR/worktrees"
LOG_DIR="$STATE_DIR/logs"
LOCK_FILE="$STATE_DIR/ralph.lock"

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────
_ts() { date '+%H:%M:%S'; }
info()  { printf '\033[36m[ralph %s]\033[0m %s\n' "$(_ts)" "$*" >&2; }
warn()  { printf '\033[33m[ralph %s]\033[0m %s\n' "$(_ts)" "$*" >&2; }
err()   { printf '\033[31m[ralph %s ERROR]\033[0m %s\n' "$(_ts)" "$*" >&2; }
agent_log() {
  local id="$1"; shift
  printf '\033[35m[agent#%s %s]\033[0m %s\n' "$id" "$(_ts)" "$*" >&2
}

# Recursively kill a PID and all its descendants (bottom-up to avoid orphans).
kill_tree() {
  local pid="$1" sig="${2:-TERM}"
  local children
  children=$(pgrep -P "$pid" 2>/dev/null) || true
  for child in $children; do
    kill_tree "$child" "$sig"
  done
  kill -"$sig" "$pid" 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────
# Cleanup on exit / Ctrl-C
# ─────────────────────────────────────────────────────────────
AGENT_PIDS=()
_CLEANUP_DONE=0

cleanup() {
  # Guard against re-entry: EXIT trap fires after INT/TERM handlers return, which would
  # run cleanup a second time and produce duplicate "Releasing claim" API calls.
  [[ "$_CLEANUP_DONE" == "1" ]] && return 0
  _CLEANUP_DONE=1

  info "Shutting down — sending SIGTERM to all agent processes..."

  # SIGTERM each agent's entire process tree (covers nested claude/timeout processes).
  # Simple kill "$pid" only reaches the direct bash subshell; claude runs as a grandchild
  # and would survive as an orphan without the recursive kill_tree approach.
  if [[ ${#AGENT_PIDS[@]} -gt 0 ]]; then
    for pid in "${AGENT_PIDS[@]}"; do
      kill_tree "$pid" TERM
    done

    # Give agents up to 10 s to shut down gracefully before force-killing.
    local deadline=$(( $(date +%s) + 10 ))
    for pid in "${AGENT_PIDS[@]}"; do
      while kill -0 "$pid" 2>/dev/null && [[ $(date +%s) -lt $deadline ]]; do
        sleep 1
      done
    done

    # Force-kill any survivors and reap zombies.
    for pid in "${AGENT_PIDS[@]}"; do
      kill_tree "$pid" KILL
    done
  fi
  wait 2>/dev/null || true

  # Release ralph-in-progress label from any issues still actively being worked on.
  local claimed
  claimed=$(gh issue list \
    --repo "$REPO" --state open \
    --label "$CLAIMED_LABEL" \
    --json number --jq '.[].number' 2>/dev/null || true)
  for num in $claimed; do
    warn "Releasing in-flight claim on issue #$num"
    release_claim "$num"
  done

  # Remove worktrees one-by-one so the registry stays consistent with the filesystem.
  if [[ -d "$WORKTREES_DIR" ]]; then
    for wt_path in "$WORKTREES_DIR"/agent-*/; do
      [[ -d "$wt_path" ]] || continue
      teardown_agent_worktree "$wt_path"
    done
  fi
  git -C "$REPO_ROOT" worktree prune 2>/dev/null || true
  rm -rf "$WORKTREES_DIR"
  rm -f "$LOCK_FILE"

  # Remove persistent sandboxes now that all agents are done.
  if [[ "$SANDBOX" == "1" ]]; then
    for i in $(seq 1 "$NUM_AGENTS"); do
      docker sandbox rm "claude-agent-${i}" 2>/dev/null || true
    done
  fi
}
trap cleanup EXIT INT TERM

# ─────────────────────────────────────────────────────────────
# Prerequisites
# ─────────────────────────────────────────────────────────────
check_deps() {
  local missing=()
  for cmd in gh git jq claude timeout; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    echo "Install guide:" >&2
    echo "  gh:      https://cli.github.com" >&2
    echo "  claude:  npm install -g @anthropic-ai/claude-code" >&2
    echo "  jq:      brew install jq" >&2
    echo "  timeout: brew install coreutils  (macOS only)" >&2
    exit 1
  fi

  if ! gh auth status &>/dev/null; then
    err "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
  fi

  if [[ "$SANDBOX" == "1" ]]; then
    if ! command -v docker &>/dev/null; then
      warn "RALPH_SANDBOX=1 but docker not found — falling back to local execution"
      SANDBOX=0
    fi
  fi
}

# ─────────────────────────────────────────────────────────────
# GitHub helpers
# ─────────────────────────────────────────────────────────────
ensure_labels() {
  gh label create "$CLAIMED_LABEL" \
    --color "fbca04" \
    --description "Claimed by a Ralph agent" \
    --repo "$REPO" 2>/dev/null || true
  gh label create "$PRD_LABEL" \
    --color "e4e669" \
    --description "Product Requirements Document — skipped by Ralph agents" \
    --repo "$REPO" 2>/dev/null || true
  gh label create "$READY_LABEL" \
    --color "0075ca" \
    --description "Ready for a Ralph agent to pick up" \
    --repo "$REPO" 2>/dev/null || true
  gh label create "$HUMAN_LABEL" \
    --color "e4e669" \
    --description "Agent got stuck — needs human input" \
    --repo "$REPO" 2>/dev/null || true
  gh label create "$BLOCKED_LABEL" \
    --color "d93f0b" \
    --description "Waiting on dependencies to be merged first" \
    --repo "$REPO" 2>/dev/null || true
}

# Returns JSON of the oldest open, ready-for-agent, unclaimed issue — or empty.
find_next_issue() {
  gh issue list \
    --repo "$REPO" \
    --state open \
    --label "$READY_LABEL" \
    --limit 200 \
    --json number,title,body,labels,assignees,createdAt \
    --jq "
      [
        .[] |
        select(
          (.labels | map(.name) |
            (contains([\"$BLOCKED_LABEL\"]) or contains([\"$PRD_LABEL\"]) or contains([\"$CLAIMED_LABEL\"]))
          ) | not
        )
      ]
      | sort_by(.createdAt)
      | first
      // empty
    " 2>/dev/null || true
}

# Parse "Blocked by #N" lines from an issue body and return the issue numbers.
get_blocker_numbers() {
  local body="$1"
  echo "$body" | grep -oiE 'Blocked by #[0-9]+' | grep -oE '[0-9]+' || true
}

# Return 0 if every "Blocked by #N" issue in the body is CLOSED, 1 otherwise.
all_blockers_resolved() {
  local body="$1"
  local blockers
  blockers=$(get_blocker_numbers "$body")

  [[ -z "$blockers" ]] && return 0

  local blocker_num state
  for blocker_num in $blockers; do
    state=$(gh issue view "$blocker_num" --comments --repo "$REPO" --json state --jq '.state' 2>/dev/null || echo "OPEN")
    if [[ "$state" != "CLOSED" ]]; then
      return 1
    fi
  done
  return 0
}

# Scan every open issue labelled "blocked" and re-label it "ready-for-agent"
# if all its dependencies are now closed.
unblock_resolved_issues() {
  local blocked_issues
  blocked_issues=$(gh issue list \
    --repo "$REPO" \
    --state open \
    --label "$BLOCKED_LABEL" \
    --limit 200 \
    --json number,body 2>/dev/null || true)

  [[ -z "$blocked_issues" || "$blocked_issues" == "[]" ]] && return

  echo "$blocked_issues" | jq -c '.[]' | while read -r issue; do
    local num body
    num=$(echo "$issue" | jq -r '.number')
    body=$(echo "$issue" | jq -r '.body // ""')

    if all_blockers_resolved "$body"; then
      info "Issue #$num dependencies resolved — marking $READY_LABEL"
      mark_ready_after_unblock "$num"
    fi
  done
}

# Atomically claim an issue by adding the in-progress label. Returns 0 if successful.
claim_issue() {
  local number="$1"
  gh issue edit "$number" --add-label "$CLAIMED_LABEL" --repo "$REPO" 2>/dev/null || return 1
  # Re-read to guard against tiny race window between two agents
  local labels
  labels=$(gh issue view "$number" \
    --repo "$REPO" --json labels \
    --jq '.labels[].name' 2>/dev/null || echo "")
  echo "$labels" | grep -q "^${CLAIMED_LABEL}$"
}

# Release the in-progress claim without changing any other state.
# Used when an agent loses a claim race or the orchestrator shuts down mid-run.
release_claim() {
  local number="$1"
  gh issue edit "$number" --remove-label "$CLAIMED_LABEL" --repo "$REPO" 2>/dev/null || true
}

# Fetch issue comments as a formatted Markdown block. Empty if there are none.
fetch_issue_comments() {
  local number="$1"
  gh issue view "$number" --repo "$REPO" --json comments \
    --jq '.comments
      | map("### Comment by @\(.author.login) at \(.createdAt)\n\n\(.body)")
      | join("\n\n---\n\n")
    ' 2>/dev/null || true
}

# Called when unresolved "Blocked by #N" dependencies are detected before the agent runs.
mark_blocked_on_dependency() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$BLOCKED_LABEL" \
    --remove-label "$CLAIMED_LABEL" \
    --remove-label "$READY_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}

# Called when an agent signals BLOCKED or crashes — needs human attention, not a dependency issue.
mark_needs_human() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$HUMAN_LABEL" \
    --remove-label "$CLAIMED_LABEL" \
    --remove-label "$READY_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}

# Clear workflow labels — the PR is open and "Closes #N" will close the issue on merge.
mark_done() {
  local number="$1"
  gh issue edit "$number" \
    --remove-label "$CLAIMED_LABEL" \
    --remove-label "$READY_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}

# Move a blocked issue back to ready-for-agent — all its "Blocked by #N" dependencies have closed.
mark_ready_after_unblock() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$READY_LABEL" \
    --remove-label "$BLOCKED_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}


# ─────────────────────────────────────────────────────────────
# Agent prompt
# ─────────────────────────────────────────────────────────────
# Render a prompt template fragment by passing args through the environment.
# The template lives in prompts/; placeholders are {{NAME}}.
_render_prompt_fragment() {
  local template="$1"
  python3 "$SCRIPT_DIR/render_prompt.py" "$SCRIPT_DIR/prompts/$template"
}

build_prompt() {
  local issue_number="$1"
  local issue_title="$2"
  local issue_body="$3"
  local branch="$4"
  local issue_comments="$5"

  local comments_section=""
  if [[ -n "$issue_comments" ]]; then
    comments_section=$(ISSUE_COMMENTS="$issue_comments" \
      _render_prompt_fragment comments-section.md)
  fi

  local prd_section=""
  if [[ -n "$PRD_NUMBER" ]]; then
    prd_section=$(PRD_NUMBER="$PRD_NUMBER" REPO="$REPO" \
      _render_prompt_fragment prd-section.md)
  fi

  ISSUE_NUMBER="$issue_number" \
  ISSUE_TITLE="$issue_title" \
  ISSUE_BODY="$issue_body" \
  BRANCH="$branch" \
  REPO="$REPO" \
  COMMENTS_SECTION="$comments_section" \
  PRD_SECTION="$prd_section" \
    _render_prompt_fragment agent.md
}

# ─────────────────────────────────────────────────────────────
# Worktree lifecycle
# ─────────────────────────────────────────────────────────────

# Create a fresh worktree for an agent on a new branch off the latest origin/main.
# Echoes the worktree path on stdout so the caller can capture it.
setup_agent_worktree() {
  local agent_id="$1" branch="$2"
  local worktree="${WORKTREES_DIR}/agent-${agent_id}"

  # Remove stale worktree if present
  git -C "$REPO_ROOT" worktree remove --force "$worktree" 2>/dev/null || true
  rm -rf "$worktree"

  git -C "$REPO_ROOT" fetch origin main --quiet 2>/dev/null || \
    warn "Could not fetch origin/main — working from local main"

  # Delete stale remote-tracking or local branch if it exists
  git -C "$REPO_ROOT" branch -D "$branch" 2>/dev/null || true

  if ! git -C "$REPO_ROOT" worktree add -b "$branch" "$worktree" origin/main 2>/dev/null; then
    git -C "$REPO_ROOT" worktree add -b "$branch" "$worktree" main
  fi

  # Set the new branch's upstream to origin/main so `git status`, `git pull`, and the
  # eventual `git checkout` after worktree removal all behave as expected. Without this,
  # the branch lives in a limbo state until the agent's first push.
  git -C "$worktree" branch --set-upstream-to=origin/main "$branch" 2>/dev/null || true

  echo "$worktree"
}

# Remove a worktree by path. Safe to call on a path that no longer exists.
# Removing via `git worktree remove` (rather than rm -rf) keeps the worktree registry
# in sync — `git worktree prune` only cleans entries for already-missing directories,
# so it would be a no-op if called before rm -rf and leave stale entries if called after.
teardown_agent_worktree() {
  local worktree="$1"
  git -C "$REPO_ROOT" worktree remove --force "$worktree" 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────
# Claude executor — local and Docker-sandbox adapters
# ─────────────────────────────────────────────────────────────

# Local adapter: run claude directly in the worktree, bounded by AGENT_TIMEOUT.
run_claude_local() {
  local worktree="$1" prompt_file="$2" log_file="$3"
  (
    cd "$worktree"
    # Read prompt into a variable — avoids re-expansion of special chars when passing to -p
    local prompt
    prompt=$(cat "$prompt_file")
    timeout "$AGENT_TIMEOUT" \
      claude --dangerously-skip-permissions --verbose --output-format stream-json \
        --model "$CLAUDE_MODEL" \
        --effort "$CLAUDE_EFFORT" \
        -p "$prompt" \
      > "$log_file" 2>&1
  )
}

# Docker-sandbox adapter: each agent runs in an isolated microVM via `docker sandbox run`.
# The worktree syncs at the same absolute path inside the VM. Each agent gets its own
# named sandbox (claude-agent-N), fully isolated from the host outside the workspace.
# Requires Docker Desktop 4.58+ (macOS/Windows).
#
# Stages the prompt and a runner script in the worktree root so they're accessible inside
# the sandbox at the same absolute path. In a git worktree, .git is a FILE (not a directory),
# so we can't use .git/ subdirs — instead we drop the files into the worktree root and
# register them in the per-worktree git exclude so the agent never accidentally commits them.
run_claude_sandbox() {
  local worktree="$1" prompt_file="$2" log_file="$3"
  local gitdir
  gitdir=$(git -C "$worktree" rev-parse --git-dir)
  cp "$prompt_file" "$worktree/.ralph-prompt.txt"
  printf '.ralph-prompt.txt\n.ralph-run.sh\n' >> "$gitdir/info/exclude"
  cat > "$worktree/.ralph-run.sh" << RUNNER
#!/usr/bin/env bash
set -euo pipefail
# Read prompt into a variable — avoids re-expansion of special chars when passing to -p
prompt=\$(cat .ralph-prompt.txt)
exec claude --dangerously-skip-permissions --verbose --output-format stream-json --model "${CLAUDE_MODEL}" --effort "${CLAUDE_EFFORT}" -p "\$prompt"
RUNNER
  chmod +x "$worktree/.ralph-run.sh"

  docker sandbox run claude "$worktree" \
    -- bash .ralph-run.sh \
    > "$log_file" 2>&1

  rm -f "$worktree/.ralph-prompt.txt" "$worktree/.ralph-run.sh" 2>/dev/null || true
}

# Dispatcher — picks the adapter based on SANDBOX.
run_claude() {
  if [[ "$SANDBOX" == "1" ]]; then
    run_claude_sandbox "$@"
  else
    run_claude_local "$@"
  fi
}

# ─────────────────────────────────────────────────────────────
# Single agent loop (runs as a background process)
# ─────────────────────────────────────────────────────────────
agent_loop() {
  local agent_id="$1"
  local iter=0

  agent_log "$agent_id" "started (max $MAX_ITER issues)"

  while [[ $iter -lt $MAX_ITER ]]; do
    iter=$((iter + 1))
    agent_log "$agent_id" "iter $iter/$MAX_ITER — scanning for issues..."

    # ── Re-label blocked issues whose dependencies have closed (agent #1 only) ──
    # Running this from every agent in parallel is wasteful and causes redundant API calls.
    [[ "$agent_id" == "1" ]] && unblock_resolved_issues

    # ── Find next ready-for-agent issue ───────────────────────────
    local issue_json
    issue_json=$(find_next_issue)

    if [[ -z "$issue_json" ]]; then
      agent_log "$agent_id" "no unclaimed issues available. Waiting 30s..."
      sleep 30
      # Try one more time then exit rather than spinning forever
      issue_json=$(find_next_issue)
      if [[ -z "$issue_json" ]]; then
        agent_log "$agent_id" "still no issues. Exiting."
        break
      fi
    fi

    local issue_number issue_title issue_body
    issue_number=$(echo "$issue_json" | jq -r '.number')
    issue_title=$(echo "$issue_json"  | jq -r '.title')
    issue_body=$(echo "$issue_json"   | jq -r '.body // "(no description)"')

    # ── Claim the issue ────────────────────────────────────────
    if ! claim_issue "$issue_number"; then
      agent_log "$agent_id" "lost race to claim #$issue_number — releasing and retrying..."
      release_claim "$issue_number"
      sleep $((RANDOM % 5 + 1))
      continue
    fi
    agent_log "$agent_id" "claimed #$issue_number: $issue_title"

    # ── Verify dependencies are resolved (safety net) ──────────
    if ! all_blockers_resolved "$issue_body"; then
      agent_log "$agent_id" "#$issue_number has unresolved dependencies — marking blocked and skipping"
      mark_blocked_on_dependency "$issue_number"
      continue
    fi

    # ── Set up isolated git worktree ───────────────────────────
    local title_slug
    title_slug=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g' | cut -c1-50)

    # Derive conventional-commit branch type from the issue title
    local branch_type="feat"
    if echo "$issue_title" | grep -iEq '^(fix|bug|hotfix|patch|correct|repair)'; then
      branch_type="fix"
    elif echo "$issue_title" | grep -iEq '^(chore|update|upgrade|bump|clean|refactor|tidy|docs|ci|test|style)'; then
      branch_type="chore"
    fi
    local branch="${branch_type}/${issue_number}-${title_slug}"
    local worktree
    worktree=$(setup_agent_worktree "$agent_id" "$branch")

    # ── Fetch issue comments for additional context ────────────
    local issue_comments
    issue_comments=$(fetch_issue_comments "$issue_number")
    if [[ -n "$issue_comments" ]]; then
      agent_log "$agent_id" "fetched comments for #$issue_number"
    fi

    # ── Build the prompt ───────────────────────────────────────
    local prompt_file="$STATE_DIR/prompt-agent${agent_id}-issue${issue_number}.txt"
    build_prompt "$issue_number" "$issue_title" "$issue_body" "$branch" "$issue_comments" > "$prompt_file"

    local log_file="$LOG_DIR/agent-${agent_id}-issue-${issue_number}.log"
    agent_log "$agent_id" "running claude on #$issue_number... (log: $log_file)"

    # ── Run the agent ──────────────────────────────────────────
    local run_exit=0
    run_claude "$worktree" "$prompt_file" "$log_file" || run_exit=$?

    if [[ $run_exit -eq 124 ]]; then
      warn "Agent #$agent_id — claude timed out after ${AGENT_TIMEOUT}s for issue #$issue_number"
    elif [[ $run_exit -ne 0 ]]; then
      warn "Agent #$agent_id — claude exited with code $run_exit for issue #$issue_number"
    fi

    rm -f "$prompt_file"

    # ── Parse the promise signal (read from log file — claude output goes there directly) ──
    if grep -q '<promise>COMPLETE</promise>' "$log_file" 2>/dev/null; then
      agent_log "$agent_id" "#$issue_number — COMPLETE. PR created, moving on."
      mark_done "$issue_number"
      # GitHub will auto-close the issue when the PR is merged ("Closes #N").

    elif grep -q '<promise>BLOCKED</promise>' "$log_file" 2>/dev/null; then
      agent_log "$agent_id" "#$issue_number — BLOCKED signal received (marking $HUMAN_LABEL)"
      mark_needs_human "$issue_number"

    else
      warn "Agent #$agent_id — no promise signal for #$issue_number. Marking $HUMAN_LABEL. Check: $log_file"
      local error_detail=""
      if [[ -f "$log_file" ]]; then
        error_detail=$(python3 "$SCRIPT_DIR/parse_claude_error.py" "$log_file" 2>/dev/null || true)
      fi

      local comment_body
      comment_body="$(cat <<COMMENT
**Ralph agent crashed on this issue** (exit code: ${run_exit})

**Error:**
\`\`\`
${error_detail:-No structured error found — agent produced no promise signal}
\`\`\`

**Full log:** \`${log_file}\`

To retry, remove the \`${HUMAN_LABEL}\` label from this issue and re-add \`${READY_LABEL}\`.
COMMENT
)"
      gh issue comment "$issue_number" --body "$comment_body" --repo "$REPO" 2>/dev/null || \
        warn "Could not post failure comment on #$issue_number"
      mark_needs_human "$issue_number"
    fi

    # ── Tidy up worktree (sandbox is reused across issues to avoid re-downloading the template) ──
    teardown_agent_worktree "$worktree"

    # Brief pause before grabbing the next issue
    sleep 5
  done

  agent_log "$agent_id" "reached max iterations ($MAX_ITER). Done."
}

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
main() {
  info "Ralph — autonomous issue solver"
  info "  repo:      $REPO"
  info "  agents:    $NUM_AGENTS"
  info "  max iter:  $MAX_ITER issues/agent"
  info "  model:     $CLAUDE_MODEL"
  info "  effort:    $CLAUDE_EFFORT"
  info "  sandbox:   $([ "$SANDBOX" == "1" ] && echo "Docker" || echo "local")"
  [[ -n "$PRD_NUMBER" ]] && info "  PRD issue:  #$PRD_NUMBER"
  echo >&2

  check_deps
  ensure_labels

  mkdir -p "$WORKTREES_DIR" "$LOG_DIR"

  # Prevent two concurrent ralph.sh instances from trampling each other's worktrees.
  if [[ -f "$LOCK_FILE" ]]; then
    local old_pid
    old_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
      err "Another ralph.sh instance is already running (PID: $old_pid). Exiting."
      exit 1
    fi
    warn "Stale lock from PID ${old_pid:-unknown} — cleaning up and continuing."
  fi
  echo "$$" > "$LOCK_FILE"

  info "Spawning $NUM_AGENTS agents..."

  for i in $(seq 1 "$NUM_AGENTS"); do
    agent_loop "$i" &
    AGENT_PIDS+=($!)
    info "Agent #$i started (pid $!)"
    # Stagger starts to reduce issue-claiming races
    sleep 3
  done

  info "All agents running. Logs in: $LOG_DIR"
  info "Press Ctrl+C to stop and release all claims."
  echo >&2

  # Wait for all agents to finish
  local exit_code=0
  for pid in "${AGENT_PIDS[@]}"; do
    wait "$pid" || exit_code=$?
  done

  if [[ $exit_code -eq 0 ]]; then
    info "All agents finished successfully."
  else
    warn "Some agents exited with non-zero status. Check logs in $LOG_DIR"
  fi
}

main "$@"