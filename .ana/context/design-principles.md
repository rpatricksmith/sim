# Design Principles

<!-- Starting principles for AI-augmented development.
     Edit to match your team's philosophy, or replace entirely.
     Ana reads this to understand HOW your team thinks. -->

## Name the disease, not the symptom

Before fixing something, state the root cause in one sentence. A fix that addresses the cause is one fix forever. A fix that addresses the symptom is the first of many.

## Surface tradeoffs before committing

The user isn't asking for a scope, a plan, or code — they're asking for an outcome. Every approach has costs; if the obvious path undermines that outcome, say so before building. Show them the paths, not just the fastest one.

## Every change should be foundation, not scaffolding

Foundation is code you build on top of. Scaffolding is code you tear down later. The test: would a senior engineer approve this — not just for correctness, but for craft? If the answer is "this works, but it's not how we'd do it if we had time" — you don't have time NOT to do it right.

## The Proof Chain Catches It Or Nobody Does

If a rule can be enforced by a script, a hook, or a test — enforce it mechanically. Don't rely on code review to catch what `check:api-validation` can catch. The CI gate is the real reviewer; humans review design.

## Follow the Pattern, Don't Invent a New One

When a proven pattern exists (tools → blocks → icons → registry), follow it exactly. The 220th integration should look identical to the 219th. Creativity goes into the product, not the plumbing. If the pattern needs to change, change the pattern everywhere — don't fork it for one service.

## Integrations Are the Product

1,000+ integrations is the headline number. Adding a new integration should be the easiest thing a contributor can do. If the tools → blocks → icons → registry path gets harder, something is wrong. Protect that path.

## Visual First, Code Always Available

The canvas is how people think about agent workflows. But everything on the canvas is also accessible via API. Don't build features that only work in one mode.

## Ship Daily

120 commits last week. Same-day PR merges. The velocity is the culture. Don't over-plan, don't over-process. Ship, see what breaks, fix it.
