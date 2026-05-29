<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Project Does

**Detected:** bun monorepo, with authentication (Better Auth), database (Drizzle → postgresql, 99 models), and AI integration (Anthropic). 7422 source files, 481 test files.
**Detected issues:** 1 warning — run `ana scan` for details

The open-source platform to build AI agents and run your agentic workforce. Connect 1,000+ integrations and LLMs to orchestrate agentic workflows.

*What does this product do? Who uses it? What problem does it solve?*

## Architecture

**Detected:** bun · 17 packages (sim, docs, @sim/realtime, @sim/audit, @sim/auth)
**Detected surfaces:** docs (apps/docs, TypeScript, Next.js), sim (apps/sim, TypeScript, Next.js)
**Detected:** 5 directories mapped: .github/, apps/, docker/, packages/, scripts/
**Detected deployment:** GitHub Actions

*How is the codebase organized and why? What are the layer boundaries?*

## Where to Make Changes

*Common tasks and where to find the relevant code. What files are entry points for what kind of work?*

## Key Decisions

*Technology choices and patterns that look wrong but are intentional. What was tried and rejected?*

## Key Files

- Database schema: `packages/db/schema.ts`
- CI pipeline: `.github/workflows/ci.yml`, `.github/workflows/docs-embeddings.yml`, `.github/workflows/i18n.yml` + 6 more

*Add: database client location, auth config, AI wrapper, shared types, test helpers.*

## What Looks Wrong But Is Intentional

*Patterns that seem wrong for this stack but are deliberate. Anti-intuitive decisions with rationale.*

## Active Constraints

*Current priorities. Areas under active refactoring. Features not to touch right now.*

## Domain Vocabulary

*Terms with project-specific meaning. E.g., "workspace" = pnpm workspace package, not Slack workspace.*
