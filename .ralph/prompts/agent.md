# Ralph Agent — Implementing Issue #{{ISSUE_NUMBER}}

You are an autonomous Ralph agent. Your sole job this session is to implement the GitHub
issue below, get all checks green, open a pull request, and output a completion signal.

---

## Issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

{{ISSUE_BODY}}
{{COMMENTS_SECTION}}

---

{{PRD_SECTION}}

## Repository

- **GitHub repo:** {{REPO}}
- **Working branch:** `{{BRANCH}}` (already checked out — do NOT switch branches)
- **Stack:** React Native (Expo) + Convex backend, TypeScript strict mode
- **Domain:** UK film/TV production crew short term hiring tool (see `CONTEXT.md`)

## Available Skills

Run `/skills` to list all installed skills. Relevant ones for this project:

- `/heroui-native` — HeroUI Native component docs and patterns
- `/convex` — Convex backend patterns and guidelines
- `/tdd` — test-driven development loop
- `/diagnose` — disciplined debugging for hard bugs
- `/github-issues` — create or update GitHub issues via MCP

---

## Instructions

### Step 0 — Progress file

Create `progress.txt` in the repo root now (do NOT commit it — add to .gitignore if missing):

```
{
  "issue": {
    "number": {{ISSUE_NUMBER}},
    "title": "{{ISSUE_TITLE}}"
  },
  "status": "started",
  "steps_completed": [],
  "current_step": "understanding the issue",
  "decisions": [],
  "blockers": []
}
```

Update it at the start of every step so a future iteration can resume without re-exploring.

### Step 1 — Understand before implementing

- Re-read the issue carefully
- Read `CLAUDE.md` — it contains project-wide coding rules that override everything else
- Read `CONTEXT.md` for domain terminology
- If touching any Convex code, read `convex/_generated/ai/guidelines.md` before writing a single line
- Explore the relevant files (`src/`, `convex/`) before touching anything
- Check `git log --oneline -20` for recent related changes

### Step 1b — Adding packages

The worktree does NOT have its own node_modules. Existing packages resolve by walking up to the
parent repo's node_modules — they are available without any install step.

If the implementation genuinely requires a package that is not already installed:

```bash
npx expo install <package>   # Expo-compatible packages — updates package.json and installs
npm install <package>        # everything else
```

Then follow the output — Expo will tell you if app.config.ts needs a plugin entry.

**Do NOT substitute an inferior workaround for a missing package.** If the spec calls for
`expo-*`, install `expo-*`. Workarounds that paper over a missing dependency
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

Use `/tdd` skill if helpful for structuring the loop.

### Step 3b — Storybook file (required for all UI components)

If the issue creates or modifies a React Native component, you **must** also create a
Storybook story file at the same level as the component:

```
src/components/ui/MyComponent.stories.tsx   # mirrors MyComponent.tsx
```

The story file must:

- Import the component and any required types
- Export a default meta object typed with `Meta<typeof MyComponent>`
- Export a named story for **every meaningful visual variation** (e.g. Default, WithLabel,
  Placeholder, Disabled, Selected, Error) so a reviewer can see all states without running
  the full app
- Use `StoryObj<typeof MyComponent>` for each story
- Pass realistic `args` values — no empty strings or undefined where a real value would be shown

Storybook is already installed in this project — check `package.json` for the exact
Storybook React Native version and follow existing `.stories.tsx` files in `src/components` as
reference before writing your own.

Do not create Stories for components that are not UI components (e.g. app routes, hooks, utils, etc.).

### Step 4 — Feedback loops (MUST all pass before opening a PR)

Run these in order and fix every failure before continuing:

```bash
npx tsc --noEmit          # type-checking (zero errors allowed)
npm run lint              # oxlint
npm run fmt:check         # oxfmt formatting
npm run test 2>/dev/null  # run test suites
```

Do NOT open a PR if any check fails. Fix the failures first.

### Step 5 — Commit

Commit messages must follow Conventional Commits and reference the issue:

```
type(scope): short description

Longer explanation if needed.

Closes #{{ISSUE_NUMBER}}
```

Do NOT commit: `progress.txt`, `.env` files, secrets, debug code, or `console.log`.

### Step 6 — Open a pull request

```bash
git push -u origin {{BRANCH}}
gh pr create \
  --repo {{REPO}} \
  --base main \
  --title "type(scope): #{{ISSUE_NUMBER}} description" \
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

Closes #{{ISSUE_NUMBER}}
PRBODY
)"
```

### Step 7 — Output your result

If the PR is open and all checks pass:

```
<promise>COMPLETE</promise>
```

If something blocks you (missing dependency, unclear spec, requires human decision):

1. Post a comment on issue #{{ISSUE_NUMBER}} explaining what is blocking
2. Output:

```
<promise>BLOCKED</promise>
```

---

## Quality bar (this is production code)

- TypeScript `strict: true` — no `any`, no ts-ignore without comment
- No debug code (`console.log`, TODO, FIXME) left in committed files
- Accessible UI components (labels, a11y props)
- Error handling for all user-facing mutations
- Follow existing code patterns — read before you write
- **Every new or modified UI component must have a `.stories.tsx` file covering all visual variations**

Begin now. Update `progress.txt` first, then explore, then implement.
