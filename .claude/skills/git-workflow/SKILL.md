---
name: git-workflow
description: "Invoke before any git operations — branching, committing, merging, or creating pull requests. Contains project-specific branch naming, commit format, and merge strategy."
---

# Git Workflow

## Detected
- Default branch: main
- Contributors: 55
- Ana CLI: pipeline artifacts committed via `ana artifact save` with [slug] prefix. Build agent creates `{branchPrefix}{slug}` branches (read `branchPrefix` from `.ana/ana.json`, default `feature/`). Co-author from ana.json.

## Rules
- Conventional commits: `type(scope): message`. Types: `feat`, `fix`, `improvement`, `chore`, `docs`. Scope is the feature area (e.g., `integrations`, `auth`, `copilot`).
- Commit each logical change separately. Don't batch unrelated changes into one commit.
- Stage specific files for each commit. Avoid `git add .` or `git add -A` — review what you're committing.
- Pre-commit runs lint only (`bunx lint-staged`). Tests and type-check run in CI, not locally.
- Merge strategy: full merge commits. Not squash, not rebase. Preserves commit history.
- Always rebase before merging PRs that touch registry files (`tools/registry.ts`, `blocks/registry.ts`, `triggers/registry.ts`, `icons.tsx`). These are the most common source of merge conflicts.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
