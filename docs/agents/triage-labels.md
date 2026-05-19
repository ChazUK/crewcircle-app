# Triage Labels

This file defines the label vocabulary for issues in this repo and the state machine that governs how labels move as an issue progresses.

## Labels

| Label               | Meaning                                                 | Set by                           |
| ------------------- | ------------------------------------------------------- | -------------------------------- |
| `needs-triage`      | Incoming issue, maintainer needs to evaluate it         | Reporter / default on new issues |
| `needs-info`        | Waiting on reporter for more information                | Triager                          |
| `blocked`           | Waiting on a referenced dependency to merge first       | Triager or agent                 |
| `ready-for-agent`   | Fully specified, ready for an autonomous (AFK) agent    | Triager                          |
| `ready-for-human`   | Requires human implementation (or agent handed it back) | Triager or agent                 |
| `agent-in-progress` | An autonomous agent has claimed this issue              | Agent (on pickup)                |
| `wontfix`           | Will not be actioned                                    | Triager                          |

An issue carries exactly **one** state label from the table above at a time. Other labels (`bug`, `prd`, `typescript`, etc.) are descriptors and orthogonal to state.

## State machine

```
                       ┌──────────────────┐
   new issue  ───────► │  needs-triage    │
                       └────────┬─────────┘
                                │ triager classifies
              ┌─────────────────┼──────────────────┬─────────────┬─────────┐
              ▼                 ▼                  ▼             ▼         ▼
       ┌────────────┐   ┌───────────────┐   ┌──────────────┐  ┌──────┐  ┌────────┐
       │ needs-info │   │ready-for-agent│   │ready-for-    │  │block │  │wontfix │
       │            │   │               │   │human         │  │ed    │  │(final) │
       └─────┬──────┘   └───────┬───────┘   └──────┬───────┘  └──┬───┘  └────────┘
             │ reporter         │ agent picks      │ human picks │ blocker
             │ responds         │ it up            │ it up       │ closes
             ▼                  ▼                  ▼             │
       ┌────────────┐   ┌────────────────┐         │             ▼
       │needs-triage│   │agent-in-progress│        │     ready-for-agent
       └────────────┘   └────────┬────────┘        │     or ready-for-human
                                 │                 │     (re-triage)
              ┌──────────────────┼─────────────────┴───┐
              │ PR opened        │ can't complete      │ dep emerges
              ▼                  ▼                     ▼
        (label removed —    ready-for-human         blocked
         PR `Closes #N`     + comment naming        + comment naming
         is the source      what failed             the blocker
         of truth)
```

## Transitions

| From                | Trigger                         | To                                    | Notes                                                                        |
| ------------------- | ------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `needs-triage`      | Triager classifies              | any other state label                 | Triager replaces `needs-triage` with the chosen state.                       |
| `needs-info`        | Reporter answers                | `needs-triage`                        | Triager re-evaluates with the new information.                               |
| `blocked`           | Referenced blocker closes       | `ready-for-agent` / `ready-for-human` | Triager re-routes based on whether the issue is agent-ready.                 |
| `ready-for-agent`   | Agent claims the issue          | `agent-in-progress`                   | Agent must swap the label as the first step of pickup.                       |
| `agent-in-progress` | Agent opens PR with `Closes #N` | (no state label)                      | The PR–issue link is the source of truth; do not add a post-PR label.        |
| `agent-in-progress` | Agent can't finish              | `ready-for-human`                     | Agent leaves a comment explaining what failed before swapping the label.     |
| `agent-in-progress` | Upstream dependency emerges     | `blocked`                             | Agent leaves a comment naming the blocker (`Blocked by #N`) before swapping. |
| `ready-for-human`   | Re-triage as agent-ready        | `ready-for-agent`                     | Optional reverse path after scope clarification.                             |
| `wontfix`           | (terminal)                      | —                                     | Close the issue. Do not transition back.                                     |

## Invariants

- Every open issue has exactly one state label from the table above. If you remove one, add the next one in the same operation.
- `agent-in-progress` is set **only by an agent**, and **only after** removing `ready-for-agent`.
- An agent must never set `wontfix`. That is a maintainer decision.
- An agent must never delete its own `agent-in-progress` label without either opening a PR or transitioning to `ready-for-human` / `blocked` with a comment.
