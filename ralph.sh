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
# Usage:
#   ./ralph.sh                                   # 5 agents, local mode
#   RALPH_AGENTS=3 ./ralph.sh                    # 3 parallel agents
#   RALPH_SANDBOX=1 ./ralph.sh                   # Isolate each agent in a Docker sandbox microVM (recommended for AFK)
#   RALPH_PRD_NUMBER=42 ./ralph.sh               # Point agents at a PRD issue for context
#   RALPH_MAX_ITER=10 ./ralph.sh                 # Cap at 10 issues per agent then stop
#   RALPH_TIMEOUT=7200 ./ralph.sh                # Claude timeout in seconds per issue (default: 3600)
#   RALPH_MODEL=claude-opus-4-7 ./ralph.sh       # Override model (default: claude-sonnet-4-6)

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Config — all overridable via env vars
# ─────────────────────────────────────────────────────────────
REPO="${RALPH_REPO:-ChazUK/crewcircle-app}"
NUM_AGENTS="${RALPH_AGENTS:-5}"
MAX_ITER="${RALPH_MAX_ITER:-20}"        # Max issues per agent before it self-terminates
SANDBOX="${RALPH_SANDBOX:-0}"           # 1 = wrap each claude invocation in Docker
PRD_NUMBER="${RALPH_PRD_NUMBER:-}"      # GitHub issue # that contains the PRD (optional)
AGENT_TIMEOUT="${RALPH_TIMEOUT:-3600}"  # Seconds before killing a hung claude process
CLAUDE_MODEL="${RALPH_MODEL:-claude-sonnet-4-6}" # Model passed to --model flag

CLAIMED_LABEL="ralph-in-progress"
BLOCKED_LABEL="blocked"
READY_LABEL="ready-for-agent"
HUMAN_LABEL="ready-for-human"
PRD_LABEL="prd"
ASSIGNEE="ChazUK"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$SCRIPT_DIR/.ralph"
WORKTREES_DIR="$RALPH_DIR/worktrees"
LOG_DIR="$RALPH_DIR/logs"
LOCK_FILE="$RALPH_DIR/ralph.lock"

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
  # Assignment to $ASSIGNEE stays as a permanent record so issues are never re-claimed.
  local claimed
  claimed=$(gh issue list \
    --repo "$REPO" --state open \
    --label "$CLAIMED_LABEL" \
    --json number --jq '.[].number' 2>/dev/null || true)
  for num in $claimed; do
    warn "Releasing in-flight claim on issue #$num"
    gh issue edit "$num" --remove-label "$CLAIMED_LABEL" --repo "$REPO" 2>/dev/null || true
  done

  # Remove worktrees one-by-one via git so the registry is updated alongside the directory.
  # (git worktree prune only removes entries for already-missing directories, so it would
  # be a no-op if called before rm -rf and leave stale entries if called after.)
  if [[ -d "$WORKTREES_DIR" ]]; then
    for wt_path in "$WORKTREES_DIR"/agent-*/; do
      [[ -d "$wt_path" ]] || continue
      git -C "$SCRIPT_DIR" worktree remove --force "$wt_path" 2>/dev/null || true
    done
  fi
  git -C "$SCRIPT_DIR" worktree prune 2>/dev/null || true
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
        ) |
        select(
          (.assignees | map(.login) | contains([\"$ASSIGNEE\"])) | not
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

  for num in $blockers; do
    local state
    state=$(gh issue view "$num" --repo "$REPO" --json state --jq '.state' 2>/dev/null || echo "OPEN")
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
      gh issue edit "$num" \
        --add-label "$READY_LABEL" \
        --remove-label "$BLOCKED_LABEL" \
        --repo "$REPO" 2>/dev/null || true
    fi
  done
}

# Atomically claim an issue by assigning it. Returns 0 if successful.
claim_issue() {
  local number="$1"
  gh issue edit "$number" --add-label "$CLAIMED_LABEL" --add-assignee "$ASSIGNEE" --repo "$REPO" 2>/dev/null || return 1
  # Re-read to guard against tiny race window between two agents
  local assignees
  assignees=$(gh issue view "$number" \
    --repo "$REPO" --json assignees \
    --jq '.assignees[].login' 2>/dev/null || echo "")
  echo "$assignees" | grep -q "^${ASSIGNEE}$"
}

release_issue() {
  local number="$1"
  # Only called when losing a claim race — removes both label and assignment
  gh issue edit "$number" --remove-label "$CLAIMED_LABEL" --remove-assignee "$ASSIGNEE" --repo "$REPO" 2>/dev/null || true
}

# Called when unresolved "Blocked by #N" dependencies are detected before the agent runs.
mark_dependency_blocked() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$BLOCKED_LABEL" \
    --remove-label "$CLAIMED_LABEL" \
    --remove-label "$READY_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}

# Called when an agent signals BLOCKED or crashes — needs human attention, not a dependency issue.
mark_agent_stuck() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$HUMAN_LABEL" \
    --remove-label "$CLAIMED_LABEL" \
    --remove-label "$READY_LABEL" \
    --repo "$REPO" 2>/dev/null || true
}


# ─────────────────────────────────────────────────────────────
# Agent prompt
# ─────────────────────────────────────────────────────────────
build_prompt() {
  local issue_number="$1"
  local issue_title="$2"
  local issue_body="$3"
  local branch="$4"

  local prd_section=""
  if [[ -n "$PRD_NUMBER" ]]; then
    prd_section="
## Reference Architecture (PRD)
Fetch and read issue #${PRD_NUMBER} for the full product spec:
\`\`\`bash
gh issue view ${PRD_NUMBER} --repo ${REPO}
\`\`\`
Use it as your authoritative reference for architecture, conventions, and scope."
  fi

  cat <<PROMPT
# Ralph Agent — Implementing Issue #${issue_number}

You are an autonomous Ralph agent. Your sole job this session is to implement the GitHub
issue below, get all checks green, open a pull request, and output a completion signal.

---

## Issue #${issue_number}: ${issue_title}

${issue_body}

---
${prd_section}

## Repository
- **GitHub repo:** ${REPO}
- **Working branch:** \`${branch}\` (already checked out — do NOT switch branches)
- **Stack:** React Native (Expo) + Convex backend, TypeScript strict mode
- **Domain:** UK film/TV production crew short term hiring tool (see \`CONTEXT.md\`)

## Available Skills
Run \`/skills\` to list all installed skills. Relevant ones for this project:
- \`/heroui-native\` — HeroUI Native component docs and patterns
- \`/convex\` — Convex backend patterns and guidelines
- \`/tdd\` — test-driven development loop
- \`/diagnose\` — disciplined debugging for hard bugs
- \`/github-issues\` — create or update GitHub issues via MCP

---

## Instructions

### Step 0 — Progress file
Create \`progress.txt\` in the repo root now (do NOT commit it — add to .gitignore if missing):

\`\`\`
{
  "issue": {
    "number": ${issue_number},
    "title": "${issue_title}"
  },
  "status": "started",
  "steps_completed": [],
  "current_step": "understanding the issue",
  "decisions": [],
  "blockers": []
}
\`\`\`

Update it at the start of every step so a future iteration can resume without re-exploring.

### Step 1 — Understand before implementing
- Re-read the issue carefully
- Read \`CLAUDE.md\` — it contains project-wide coding rules that override everything else
- Read \`CONTEXT.md\` for domain terminology
- If touching any Convex code, read \`convex/_generated/ai/guidelines.md\` before writing a single line
- Explore the relevant files (\`src/\`, \`convex/\`) before touching anything
- Check \`git log --oneline -20\` for recent related changes

### Step 1b — Adding packages
The worktree does NOT have its own node_modules. Existing packages resolve by walking up to the
parent repo's node_modules — they are available without any install step.

If the implementation genuinely requires a package that is not already installed:
\`\`\`bash
npx expo install <package>   # Expo-compatible packages — updates package.json and installs
npm install <package>        # everything else
\`\`\`
Then follow the output — Expo will tell you if app.config.ts needs a plugin entry.

**Do NOT substitute an inferior workaround for a missing package.** If the spec calls for
\`expo-*\`, install \`expo-*\`. Workarounds that paper over a missing dependency
ship broken behaviour and pass code review because they compile.

### Step 2 — Plan (small steps)
Break the work into the smallest possible independent commits.
One logical change per commit. Smaller steps = higher quality output.

### Step 3 — Implement using TDD (where applicable)
For new functionality:
1. Write a failing test first
2. Make it pass with minimal code
3. Refactor
4. Test for edge cases

Use \`/tdd\` skill if helpful for structuring the loop.

### Step 3b — Storybook file (required for all UI components)
If the issue creates or modifies a React Native component, you **must** also create a
Storybook story file at the same level as the component:

\`\`\`
src/components/ui/MyComponent.stories.tsx   # mirrors MyComponent.tsx
\`\`\`

The story file must:
- Import the component and any required types
- Export a default meta object typed with \`Meta<typeof MyComponent>\`
- Export a named story for **every meaningful visual variation** (e.g. Default, WithLabel,
  Placeholder, Disabled, Selected, Error) so a reviewer can see all states without running
  the full app
- Use \`StoryObj<typeof MyComponent>\` for each story
- Pass realistic \`args\` values — no empty strings or undefined where a real value would be shown

Storybook is already installed in this project — check \`package.json\` for the exact
Storybook React Native version and follow existing \`.stories.tsx\` files in \`src/components\` as
reference before writing your own.

Do not create Stories for components that are not UI components (e.g. app routes, hooks, utils, etc.).

### Step 4 — Feedback loops (MUST all pass before opening a PR)
Run these in order and fix every failure before continuing:
\`\`\`bash
npx tsc --noEmit          # type-checking (zero errors allowed)
npm run lint              # oxlint
npm run fmt:check         # oxfmt formatting
npm run test 2>/dev/null  # run test suites
\`\`\`

Do NOT open a PR if any check fails. Fix the failures first.

### Step 5 — Commit
Commit messages must follow Conventional Commits and reference the issue:
\`\`\`
type(scope): short description

Longer explanation if needed.

Closes #${issue_number}
\`\`\`

Do NOT commit: \`progress.txt\`, \`.env\` files, secrets, debug code, or \`console.log\`.

### Step 6 — Open a pull request
\`\`\`bash
git push origin ${branch}
gh pr create \\
  --repo ${REPO} \\
  --base main \\
  --title "type(scope): #${issue_number} description" \\
  --body "$(cat <<'PRBODY'
## Summary
<!-- What changed and why -->

## Test Plan
<!-- Steps to verify this works -->

## Checklist
- [ ] TypeScript compiles with zero errors
- [ ] Lint passes
- [ ] Formatting passes
- [ ] Tests pass (or no test script exists yet)

Closes #${issue_number}
PRBODY
)"
\`\`\`

### Step 7 — Output your result

If the PR is open and all checks pass:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

If something blocks you (missing dependency, unclear spec, requires human decision):
1. Post a comment on issue #${issue_number} explaining what is blocking
2. Output:
\`\`\`
<promise>BLOCKED</promise>
\`\`\`

---

## Quality bar (this is production code)
- TypeScript \`strict: true\` — no \`any\`, no ts-ignore without comment
- No debug code (\`console.log\`, TODO, FIXME) left in committed files
- Accessible UI components (labels, a11y props)
- Error handling for all user-facing mutations
- Follow existing code patterns — read before you write
- **Every new or modified UI component must have a \`.stories.tsx\` file covering all visual variations**

Begin now. Update \`progress.txt\` first, then explore, then implement.
PROMPT
}

# ─────────────────────────────────────────────────────────────
# Run claude (local or Docker sandbox)
# ─────────────────────────────────────────────────────────────
run_claude() {
  local worktree="$1"
  local prompt_file="$2"
  local log_file="$3"

  if [[ "$SANDBOX" == "1" ]]; then
    # Docker sandbox mode: each agent runs in an isolated microVM via `docker sandbox run`.
    # The worktree directory syncs at the same absolute path inside the VM.
    # Each worktree gets its own named sandbox (claude-agent-N); they are fully isolated
    # from each other and from the host outside the workspace.
    # Requires: Docker Desktop 4.58+ (macOS/Windows).
    #
    # We stage the prompt and a runner script in the worktree root so they're accessible
    # inside the sandbox at the same absolute path. In a git worktree, .git is a FILE
    # (not a directory), so we can't use .git/ subdirs. Instead we drop the files into
    # the worktree root and register them in the per-worktree git exclude so the agent
    # never accidentally commits them.
    local gitdir
    gitdir=$(git -C "$worktree" rev-parse --git-dir)
    cp "$prompt_file" "$worktree/.ralph-prompt.txt"
    printf '.ralph-prompt.txt\n.ralph-run.sh\n' >> "$gitdir/info/exclude"
    cat > "$worktree/.ralph-run.sh" << RUNNER
#!/usr/bin/env bash
set -euo pipefail
# Read prompt into a variable — avoids re-expansion of special chars when passing to -p
prompt=\$(cat .ralph-prompt.txt)
exec claude --dangerously-skip-permissions --verbose --output-format stream-json --model "${CLAUDE_MODEL}" -p "\$prompt"
RUNNER
    chmod +x "$worktree/.ralph-run.sh"

    docker sandbox run claude "$worktree" \
      -- bash .ralph-run.sh \
      > "$log_file" 2>&1

    rm -f "$worktree/.ralph-prompt.txt" "$worktree/.ralph-run.sh" 2>/dev/null || true
  else
    # Local mode: run claude directly in the worktree
    (
      cd "$worktree"
      # Read prompt into a variable — avoids re-expansion of special chars when passing to -p
      local prompt
      prompt=$(cat "$prompt_file")
      timeout "$AGENT_TIMEOUT" \
        claude --dangerously-skip-permissions --verbose --output-format stream-json \
          --model "$CLAUDE_MODEL" \
          -p "$prompt" \
        > "$log_file" 2>&1
    )
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
      release_issue "$issue_number"
      sleep $((RANDOM % 5 + 1))
      continue
    fi
    agent_log "$agent_id" "claimed #$issue_number: $issue_title"

    # ── Verify dependencies are resolved (safety net) ──────────
    if ! all_blockers_resolved "$issue_body"; then
      agent_log "$agent_id" "#$issue_number has unresolved dependencies — marking blocked and skipping"
      mark_dependency_blocked "$issue_number"
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
    local worktree="${WORKTREES_DIR}/agent-${agent_id}"

    # Remove stale worktree if present
    git -C "$SCRIPT_DIR" worktree remove --force "$worktree" 2>/dev/null || true
    rm -rf "$worktree"

    # Fetch latest main and create fresh branch
    git -C "$SCRIPT_DIR" fetch origin main --quiet 2>/dev/null || \
      warn "Could not fetch origin/main — working from local main"

    # Delete stale remote-tracking or local branch if it exists
    git -C "$SCRIPT_DIR" branch -D "$branch" 2>/dev/null || true

    if ! git -C "$SCRIPT_DIR" worktree add -b "$branch" "$worktree" origin/main 2>/dev/null; then
      git -C "$SCRIPT_DIR" worktree add -b "$branch" "$worktree" main
    fi

    # ── Build the prompt ───────────────────────────────────────
    local prompt_file="$RALPH_DIR/prompt-agent${agent_id}-issue${issue_number}.txt"
    build_prompt "$issue_number" "$issue_title" "$issue_body" "$branch" > "$prompt_file"

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
      gh issue edit "$issue_number" \
        --remove-label "$CLAIMED_LABEL" \
        --remove-label "$READY_LABEL" \
        --repo "$REPO" 2>/dev/null || true
      # Assignment to $ASSIGNEE stays permanently — prevents re-claiming on future runs.
      # GitHub will auto-close the issue when the PR is merged ("Closes #N").

    elif grep -q '<promise>BLOCKED</promise>' "$log_file" 2>/dev/null; then
      agent_log "$agent_id" "#$issue_number — BLOCKED signal received (marking $HUMAN_LABEL)"
      mark_agent_stuck "$issue_number"

    else
      warn "Agent #$agent_id — no promise signal for #$issue_number. Marking $HUMAN_LABEL. Check: $log_file"
      # Extract the most useful error detail from the log:
      # prefer the last API error message, otherwise fall back to the last result/error line
      local error_detail=""
      if [[ -f "$log_file" ]]; then
        error_detail=$(python3 -c "
import sys, json
lines = open('$log_file').readlines()
# Walk backwards looking for a meaningful error
for line in reversed(lines):
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        # Explicit API error in result
        if obj.get('type') == 'result' and obj.get('is_error'):
            print(obj.get('result','').strip())
            sys.exit(0)
        # Error text in assistant message
        if obj.get('type') == 'assistant':
            for block in obj.get('message',{}).get('content',[]):
                if block.get('type') == 'text':
                    txt = block.get('text','').strip()
                    if 'error' in txt.lower() or 'blocked' in txt.lower():
                        print(txt[:500])
                        sys.exit(0)
    except Exception:
        pass
" 2>/dev/null || true)
      fi

      local comment_body
      comment_body="$(cat <<COMMENT
**Ralph agent crashed on this issue** (exit code: ${run_exit})

**Error:**
\`\`\`
${error_detail:-No structured error found — agent produced no promise signal}
\`\`\`

**Full log:** \`${log_file}\`

To retry, remove the \`${HUMAN_LABEL}\` label and \`${ASSIGNEE}\` assignee from this issue, then re-add \`${READY_LABEL}\`.
COMMENT
)"
      gh issue comment "$issue_number" --body "$comment_body" --repo "$REPO" 2>/dev/null || \
        warn "Could not post failure comment on #$issue_number"
      mark_agent_stuck "$issue_number"
    fi

    # ── Tidy up worktree (sandbox is reused across issues to avoid re-downloading the template) ──
    git -C "$SCRIPT_DIR" worktree remove --force "$worktree" 2>/dev/null || true

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