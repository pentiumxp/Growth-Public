# Growth Documentation Index

Last updated: 2026-06-12.

## Rule

Growth-specific product, architecture, implementation, runbook, and handoff
documents belong in this Growth plugin workspace. The Home AI app repository
can keep historical copies or platform-level references, but Growth work should
read and update the plugin-local documents first.

Canonical Home AI platform contracts still live in the Home AI app workspace.
Do not copy broad platform contracts, deployment runbooks, Gateway runtime
docs, Action Inbox docs, Web Push docs, or reference-memory docs here unless
they become Growth-owned.

## Current Plugin-Local Docs

| Document | Purpose |
| --- | --- |
| `docs/HOME_AI_PLATFORM_CONTRACT.md` | Growth-local platform pointer and validation matrix. |
| `docs/GROWTH_PLUGIN_ARCHITECTURE.md` | Current plugin service/module architecture and harness map. |
| `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md` | Native KG import, planning, binding, and runtime migration boundary. |
| `docs/GROWTH_CARD_GENERATION_RULES.md` | Consolidated card generation rules for new Growth card authoring. |
| `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` | Owner card generation management flow, UI plan, API contract, and harness plan. |
| `docs/GROWTH_CARD_INTERACTION_FLOW.md` | Learner-facing generated card submission, one-shot evaluation, optional reflection, audio evidence, and harness contract. |
| `docs/home-ai-growth/` | Migrated Home AI Growth-specific docs kept in their original structure for continuity. |

## Migrated Home AI Growth Docs

These files were copied from `/Users/hermes-dev/HermesMobileDev/app/docs` into
the Growth plugin workspace on 2026-06-11. Treat these plugin-local paths as
the working copies for future Growth design and implementation work.

### Modules

- `docs/home-ai-growth/MODULES/growth-learning.md`

### Implementation Notes

- `docs/home-ai-growth/IMPLEMENTATION_NOTES/async-growth-evaluation-queue.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-architecture.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-design.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-requirements.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-learning-workflow-contract-harness.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-pluginization-plan.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-flow.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-implementation.md`
- `docs/home-ai-growth/IMPLEMENTATION_NOTES/learning-mastery-profile.md`

### Runbooks

- `docs/home-ai-growth/RUNBOOKS/growth-card-stuck-waiting-ai.md`
- `docs/home-ai-growth/RUNBOOKS/growth-submit-button-disabled.md`

### FanFan Learning Design Notes

- `docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_DESIGN.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_IMPLEMENTATION.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_ARCHITECTURE.zh-CN.md`
- `docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_IMPLEMENTATION_V1_1.zh-CN.md`

## Boundary

- Plugin-local Growth docs may reference Home AI platform contracts by absolute
  path because those contracts remain centralized.
- Plugin-local Growth docs should not require agents to open Home AI app Growth
  docs to understand card generation, KG planning, evaluation, rewards, or
  runbooks.
- Imported historical docs may contain old Home AI code paths such as
  `adapters/*` or `server-routes/*`. Those paths are historical implementation
  references, not a license to copy Home AI server code into the plugin.
- New Growth documentation should be written in English unless it is explicitly
  user-facing product copy.
