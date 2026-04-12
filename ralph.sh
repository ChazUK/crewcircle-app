#!/usr/bin/env bash
# ralph.sh — Autonomous multi-agent GitHub issue solver for crew-circle-app
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
#   ./ralph.sh                         # 3 agents, local mode
#   RALPH_AGENTS=5 ./ralph.sh          # 5 parallel agents
#   RALPH_SANDBOX=1 ./ralph.sh         # Isolate each agent in a Docker sandbox microVM (recommended for AFK)
#   RALPH_PRD_NUMBER=42 ./ralph.sh     # Point agents at a PRD issue for context
#   RALPH_MAX_ITER=10 ./ralph.sh       # Cap at 10 issues per agent then stop

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Config — all overridable via env vars
# ─────────────────────────────────────────────────────────────
REPO="${RALPH_REPO:-ChazUK/crew-circle-app}"
NUM_AGENTS="${RALPH_AGENTS:-5}"
MAX_ITER="${RALPH_MAX_ITER:-20}"       # Max issues per agent before it self-terminates
SANDBOX="${RALPH_SANDBOX:-0}"          # 1 = wrap each claude invocation in Docker
PRD_NUMBER="${RALPH_PRD_NUMBER:-}"     # GitHub issue # that contains the PRD (optional)

CLAIMED_LABEL="ralph-in-progress"
BLOCKED_LABEL="blocked"
PRD_LABEL="prd"
ASSIGNEE="ChazUK"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RALPH_DIR="$SCRIPT_DIR/.ralph"
WORKTREES_DIR="$RALPH_DIR/worktrees"
LOG_DIR="$RALPH_DIR/logs"

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

# ─────────────────────────────────────────────────────────────
# Cleanup on exit / Ctrl-C
# ─────────────────────────────────────────────────────────────
AGENT_PIDS=()

cleanup() {
  info "Shutting down — releasing any in-flight claims..."
  for pid in "${AGENT_PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
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
  # Prune worktrees
  git -C "$SCRIPT_DIR" worktree prune 2>/dev/null || true
  rm -rf "$WORKTREES_DIR"
  # Remove persistent sandboxes now that all agents are done
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
  for cmd in gh git jq claude; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    echo "Install guide:" >&2
    echo "  gh:     https://cli.github.com" >&2
    echo "  claude: npm install -g @anthropic-ai/claude-code" >&2
    echo "  jq:     brew install jq" >&2
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
}

# Returns JSON of the oldest open, unclaimed, unblocked, unassigned issue — or empty.
find_next_issue() {
  gh issue list \
    --repo "$REPO" \
    --state open \
    --limit 200 \
    --json number,title,body,labels,assignees,createdAt \
    --jq "
      [
        .[] |
        select(
          (.labels | map(.name) |
            (contains([\"$BLOCKED_LABEL\"]) or contains([\"$PRD_LABEL\"]))
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

mark_blocked() {
  local number="$1"
  gh issue edit "$number" \
    --add-label "$BLOCKED_LABEL" \
    --remove-label "$CLAIMED_LABEL" \
    --repo "$REPO" 2>/dev/null || true
  # Assignment to $ASSIGNEE stays as a permanent record
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
- **Domain:** UK film/TV production crew short term hiring tool (see \`UBIQUITOUS_LANGUAGE.md\`)

## Available Skills
Use these /skills to list all available skills to help you with specific tasks (invoke with /skill-name):

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
- Read \`UBIQUITOUS_LANGUAGE.md\` for domain terminology
- Explore the relevant files (\`src/\`, \`convex/\`) before touching anything
- Check \`git log --oneline -20\` for recent related changes

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
Storybook React Native version and follow existing \`.stories.tsx\` files in \`src/\` as
reference before writing your own.

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
    cat > "$worktree/.ralph-run.sh" << 'RUNNER'
#!/usr/bin/env bash
set -euo pipefail
# Read prompt into a variable — avoids re-expansion of special chars when passing to -p
prompt=$(cat .ralph-prompt.txt)
exec claude --dangerously-skip-permissions --verbose --output-format stream-json -p "$prompt"
RUNNER
    chmod +x "$worktree/.ralph-run.sh"

    docker sandbox run claude "$worktree" \
      -- bash .ralph-run.sh \
      2>&1 > "$log_file"

    rm -f "$worktree/.ralph-prompt.txt" "$worktree/.ralph-run.sh" 2>/dev/null || true
  else
    # Local mode: run claude directly in the worktree
    (
      cd "$worktree"
      # Read prompt into a variable — avoids re-expansion of special chars when passing to -p
      local prompt
      prompt=$(cat "$prompt_file")
      claude --dangerously-skip-permissions --verbose --output-format stream-json \
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

    # ── Find next unclaimed issue ──────────────────────────────
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
      agent_log "$agent_id" "lost race to claim #$issue_number — retrying..."
      sleep $((RANDOM % 5 + 1))
      continue
    fi
    agent_log "$agent_id" "claimed #$issue_number: $issue_title"

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
    local output=""
    local run_exit=0
    output=$(run_claude "$worktree" "$prompt_file" "$log_file" 2>&1) || run_exit=$?

    if [[ $run_exit -ne 0 ]]; then
      warn "Agent #$agent_id — claude exited with code $run_exit for issue #$issue_number"
    fi

    rm -f "$prompt_file"

    # ── Parse the promise signal ───────────────────────────────
    if echo "$output" | grep -q '<promise>COMPLETE</promise>'; then
      agent_log "$agent_id" "#$issue_number — COMPLETE. PR created, moving on."
      gh issue edit "$issue_number" --remove-label "$CLAIMED_LABEL" --repo "$REPO" 2>/dev/null || true
      # Assignment to $ASSIGNEE stays permanently — prevents re-claiming on future runs.
      # GitHub will auto-close the issue when the PR is merged ("Closes #N").

    elif echo "$output" | grep -q '<promise>BLOCKED</promise>'; then
      agent_log "$agent_id" "#$issue_number — BLOCKED signal received"
      mark_blocked "$issue_number"

    else
      warn "Agent #$agent_id — no promise signal for #$issue_number. Marking blocked. Check: $log_file"
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

To retry, remove the \`blocked\` label and \`${ASSIGNEE}\` assignee from this issue.
COMMENT
)"
      gh issue comment "$issue_number" --body "$comment_body" --repo "$REPO" 2>/dev/null || \
        warn "Could not post failure comment on #$issue_number"
      mark_blocked "$issue_number"
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
  info "  sandbox:   $([ "$SANDBOX" == "1" ] && echo "Docker" || echo "local")"
  [[ -n "$PRD_NUMBER" ]] && info "  PRD issue:  #$PRD_NUMBER"
  echo >&2

  check_deps
  ensure_labels

  mkdir -p "$WORKTREES_DIR" "$LOG_DIR"

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
