<!-- SCAFFOLD - Setup will fill this file -->

# Project Context

## What This Project Does

**Detected:** bun monorepo, with authentication (Better Auth), database (Drizzle → postgresql, 99 models), and AI integration (Anthropic). 7422 source files, 481 test files.
**Detected issues:** 1 warning — run `ana scan` for details

The open-source platform to build AI agents and run your agentic workforce. Connect 1,000+ integrations and LLMs to orchestrate agentic workflows.

Sim is the open-source AI workspace where teams build, deploy, and manage AI agents. Open source and self-hostable is core to the identity — you can run it with `npx simstudio` or Docker Compose in minutes, with support for local models via Ollama and vLLM, not just cloud APIs. The canvas (visual workflow builder) is the primary interface — it's how people think about agent workflows visually, like Figma for AI agents. Teams connect 1,000+ integrations and every major LLM to create agents that automate real work. The integrations are the product — new ones are being added constantly, and that's where most development energy goes. The workspace includes workflows, a knowledge base, tables, files, and logs — it's a full environment, not a single-purpose tool.

**Target user:** Teams that want to build AI agent workflows without writing everything from scratch. Existing tools are either too technical — you write all the orchestration code yourself — or too locked down — no-code but no customization, no self-hosting, closed source. Sim is visual-first so anyone can build, but fully open source so developers can extend, self-host, and see the code. The 1,000+ integrations mean you connect to what you already use instead of rebuilding connections.

## Architecture

**Detected:** bun · 17 packages (sim, docs, @sim/realtime, @sim/audit, @sim/auth)
**Detected surfaces:** docs (apps/docs, TypeScript, Next.js), sim (apps/sim, TypeScript, Next.js)
**Detected:** 5 directories mapped: .github/, apps/, docker/, packages/, scripts/
**Detected deployment:** GitHub Actions

Turborepo monorepo with 17 packages. The primary app (`apps/sim`) is a Next.js App Router application. Key layers:

- **Canvas/Frontend** — ReactFlow-based visual workflow editor. Zustand stores (20+) manage canvas mode, execution state, undo-redo, panel state. React Query hooks in `hooks/queries/` handle all server state.
- **Blocks** — 200+ block types in `blocks/blocks/`, each a `BlockConfig` with subBlocks (UI fields), tool wiring, and I/O definitions. Registered in `blocks/registry.ts`.
- **Tools** — 1,000+ tool definitions across 219 service folders in `tools/`. Each `ToolConfig` maps params to HTTP request to response transform. Registered in `tools/registry.ts` (6,150 lines — the biggest file in the codebase, and high-churn).
- **Triggers** — 48+ trigger families in `triggers/` (webhooks, polling, scheduled). Registered in `triggers/registry.ts`.
- **Connectors** — 30 knowledge base connectors in `connectors/` for document ingestion into vector stores.
- **Executor** — DAG-based workflow engine in `executor/`. Topologically sorts blocks, resolves variables between block outputs, calls tools via handlers. Supports human-in-the-loop pause/resume and large-value offloading to S3.
- **Providers** — 18 LLM providers in `providers/` with a comprehensive model catalog (`models.ts`, 84KB) including pricing and capabilities.
- **Mothership/Copilot** — AI command center. Chat modes: ask, build, plan, agent. Backend is an external service (`copilot.sim.ai`). Mothership settings, enabled models, and auto-allowed tools stored per workspace.
- **API Contracts** — All HTTP boundaries defined in `lib/api/contracts/`. Routes and clients share the same contract — no ad-hoc Zod in routes, no wire types in hooks.
- **Auth** — Better Auth with SSO, organization multi-tenancy, email OTP, Stripe billing integration, JWT, OIDC provider support. Config in `lib/auth/auth.ts`.
- **Realtime** — Separate Socket.IO server (`apps/realtime/`) for collaboration. Redis-backed room manager for multi-pod, in-memory for single-pod.
- **Database** — PostgreSQL with Drizzle ORM, 99 tables in `packages/db/schema.ts`. pgvector for knowledge base embeddings.

Data flow: Canvas → Serializer → DB → Trigger fires → DAGExecutor sorts blocks → Block handler calls tool → Tool makes API request → Response stored in execution context → Logs persisted.

## Where to Make Changes

- **To add a new integration:** Create `tools/{service}/` (types + tool files), register in `tools/registry.ts`. Add block in `blocks/blocks/{service}.ts`, register in `blocks/registry.ts`. Add icon in `components/icons.tsx`. Optionally add trigger in `triggers/{service}/`. This is the most common type of change — tools, blocks, icons, and registries travel together.
- **To add a new LLM provider:** Add provider folder in `providers/`, add model entries to `providers/models.ts`, register in `providers/registry.ts`.
- **To modify workflow execution:** `executor/execution/executor.ts` (DAGExecutor), `executor/handlers/` (block handlers), `executor/dag/` (graph logic).
- **To add a new API endpoint:** Define contract in `lib/api/contracts/`, implement route in `app/api/`, add React Query hook in `hooks/queries/`.
- **To modify the canvas UI:** `app/workspace/[workspaceId]/` pages, `stores/canvas-mode/` and other canvas stores.
- **To change auth behavior:** `lib/auth/auth.ts` (Better Auth config), `packages/auth/` (shared auth package).
- **To add a knowledge base connector:** `connectors/{service}/`, register in connector registry.
- **To modify the database schema:** `packages/db/schema.ts`, then run `cd packages/db && bun run db:migrate`.

High-churn files (where development is concentrated right now): `components/icons.tsx`, `tools/registry.ts`, `blocks/registry.ts`, `packages/db/schema.ts` — all related to adding integrations.

## Key Decisions

- **Registry pattern over dynamic discovery:** All blocks, tools, triggers, and connectors are statically imported and registered in central registry files. This makes the files large but keeps the dependency graph explicit and tree-shakeable.
- **API contracts as single source of truth:** Routes and clients share Zod schemas from `lib/api/contracts/`. Enforced by `bun run check:api-validation` audit script in CI.
- **External Copilot service:** Mothership/Copilot runs as a separate service (`copilot.sim.ai`), not embedded in the main app. Likely for isolation, scaling, and cost tracking independently.
- **DAG execution model:** Workflows execute as directed acyclic graphs, not linear chains. Enables parallel block execution and complex branching.

## Key Files

- Database schema: `packages/db/schema.ts`
- CI pipeline: `.github/workflows/ci.yml`, `.github/workflows/docs-embeddings.yml`, `.github/workflows/i18n.yml` + 6 more
- Auth config: `apps/sim/lib/auth/auth.ts`
- Workflow executor: `apps/sim/executor/execution/executor.ts`
- Tool registry: `apps/sim/tools/registry.ts` (1,000+ tools)
- Block registry: `apps/sim/blocks/registry.ts` (200+ blocks)
- Trigger registry: `apps/sim/triggers/registry.ts`
- LLM model catalog: `apps/sim/providers/models.ts`
- API contract definitions: `apps/sim/lib/api/contracts/`
- API validation audit: `scripts/check-api-validation-contracts.ts`
- Icon definitions: `apps/sim/components/icons.tsx`

## What Looks Wrong But Is Intentional

- **6,150-line registry file (`tools/registry.ts`):** Looks like it should be auto-generated or dynamically discovered, but it's manually maintained. The static import pattern ensures tree-shaking works and all tools are available at compile time.
- **Separate realtime server:** The Socket.IO server is a separate app (`apps/realtime/`), not integrated into Next.js. This is intentional — WebSocket servers don't fit Next.js's request-response model and need their own scaling.
- **`icons.tsx` is a single file with every integration icon.** It's in the top 3 highest-churn files. Looks like it should be split or auto-generated, but it's maintained manually alongside `registry.ts`. Adding a new integration means touching `icons.tsx`, `registry.ts`, and the tool/block files — they travel together.

## Active Constraints

- Integration velocity is the top priority — new services are being added constantly. RB2B, ZoomInfo, Wiza, Apollo, QuickBooks all landed recently. Most development energy goes into `tools/`, `blocks/`, and the registries.
- Slack integration is getting deeper — OAuth scoping, private channel visibility, user-specific access. Not just a basic integration.
- Copilot/Mothership is being built out — chat modes, message persistence, auto-allowed tools. The AI command center is a major product surface in active development.
- Execution log limits were just raised to 3MB/512KB — observability of workflow runs is being improved.
- Better Auth just got upgraded — auth is actively evolving, not stable.

## Domain Vocabulary

- **Block** — An executable unit on the canvas. Each block has a type (service name), subBlocks (UI form fields), tool wiring, and I/O definitions. Not a UI component — a workflow primitive.
- **Tool** — An API integration definition. Maps parameters to an HTTP request and transforms the response. A block references one or more tools. There are 1,000+ tools across 219 services.
- **Trigger** — An event source that starts a workflow. Types: webhook (external push), polling (periodic pull), schedule (cron). 48+ trigger families.
- **Connector** — A knowledge base integration that syncs documents from an external source into a vector store. 30 connectors (Slack, Gmail, etc.).
- **Workflow** — A DAG of blocks connected by edges on the canvas. Serialized as blocks + edges + trigger config + variables.
- **Mothership** — Sim's AI command center. Natural language interface for building and managing workflows. Capitalized.
- **Copilot** — The backend AI service powering Mothership. External service at `copilot.sim.ai`.
- **Workspace** — A multi-tenant organizational unit. Users belong to workspaces. Workflows, credentials, and settings are workspace-scoped.
- **Surface** — In the monorepo context, a deployable package with its own build/test/lint commands (e.g., `sim`, `docs`).
- **SubBlock** — A UI form field within a block definition. 57 types (short-input, dropdown, code editor, file-upload, etc.). Controls how users configure a block on the canvas.
- **Execution** — A single run of a workflow. Tracked by execution ID, produces logs per block, supports pause/resume for human-in-the-loop.
- **Provider** — An LLM provider (OpenAI, Anthropic, Google, etc.). 18 providers with a model catalog tracking pricing and capabilities.
