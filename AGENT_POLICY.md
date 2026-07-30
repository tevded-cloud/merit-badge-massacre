# Agent permissions policy

Merit Badge Massacre is built almost entirely by AI agents dispatched by an
orchestrating agent. This is the written tiered policy for what an agent may
do without asking, and what needs explicit permission first. Until now the
only written permissions text lived buried inside `.claude\agents\release-gate.md`;
this file is the one place to check.

## Tier 1: do freely

- Read anything in the repo.
- Run the validator: `npm run rooms:check` or `node tools/validate_rooms.cjs`
  (with `--layout`, `--json`, `--verbose`, `--selftest`).
- Run read-only greps, searches, and scripts that do not write to the repo or
  to any external system.

## Tier 2: do as part of an assigned unit

- Edit source and docs inside your assigned file set, as scoped by the brief
  that dispatched you.
- Stay inside that file set. Another agent may hold the rest of the repo at
  the same time.

## Tier 3: ASK FIRST

- Mass delete of files or content.
- Installing or changing dependencies (`npm install`, adding a package).
- Anything touching the save format or storage keys (localStorage keys,
  camp save fields, migration logic).
- Running `npm run dist` or `npm run pack` (produces a real desktop build).
- Rewriting history (rebase, amend, force push).

## Tier 4: NEVER without the creator present

- Force push.
- Deploying to the live site (tevded.com/critters).
- Anything involving credentials.

## Git

Agents do not run git. The orchestrator commits. One commit per unit.
