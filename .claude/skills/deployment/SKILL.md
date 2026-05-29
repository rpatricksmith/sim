---
name: deployment
description: "Invoke when working on deployment configuration, CI/CD pipelines, environment variables, or release processes. Contains project-specific deploy platform conventions."
---

# Deployment

## Detected
- CI: GitHub Actions

## Rules
- Push to main goes live. Main is the production path — multiple deploys per day, same-day merges.
- Staging branch triggers Docker builds to a staging environment for pre-production validation.
- PRs get the full CI gate: lint, type-check, tests, feature flag validation. All must pass before merge.
- Feature flag validation enforces naming conventions (flags start with `is` or `get`) and no hardcoded booleans.
- Version releases triggered by commit message pattern `v{major}.{minor}.{patch}: description` on main.
- Docker images built for AMD64 + ARM64, pushed to both ECR (internal) and GHCR (public/self-hosters).
- Self-hosters pull from GHCR or run `npx simstudio`.
- Tests run with `--run` flag (non-interactive, no watch mode) in CI.
- Blacksmith runners: 8vcpu for primary jobs, 4vcpu for secondary.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
