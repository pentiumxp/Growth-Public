# Growth Knowledge Graph Migration

## Purpose

This document is the Growth plugin-local pointer for the Home AI Growth
Knowledge Graph contract. It records the current migration boundary and prevents
the plugin runtime from treating the existing pilot card projection as a native
knowledge graph implementation.

The canonical source documents currently live in the Home AI app repository:

- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/growth-knowledge-graph-requirements.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/growth-knowledge-graph-architecture.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/growth-knowledge-graph-design.md`
- `/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/growth-knowledge-graph-implementation.md`

Those documents define Growth Knowledge Graph as a graph-guided card planning
layer. It constrains what formal learning cards can be generated, which
prerequisites and evidence they bind to, and how stage assessments declare
coverage. It is not a full courseware database and must not be hard-coded to
K12.

## Current Runtime State

As of the 2026-06-11 import, the Growth plugin production SQLite database owns
the native graph import/source tables for the recovered Fan Fan seed pack.

The currently migrated Growth plugin runtime is focused on:

- plugin SQLite read projection;
- migrated audio playback;
- workspace-bound MCP read tools;
- submission and reflection evidence writes;
- async evaluation processing;
- Growth-local coin settlement;
- bounded Growth event emission.

Existing production learning tables such as `learning_curriculum_references`,
`learning_programs`, `learning_plan_drafts`, and `learning_task_cards` remain
projection/runtime learning records. They are not the graph source of truth.
Old board projection cards, old Knowledge Graph pilot cards, and old evergreen
cards are considered regenerable runtime rows. They do not need to be preserved
as long-term card assets once native graph planning and a replacement generator
can create fresh cards. Historical learner evidence, evaluation, audio, and
reward rows should remain auditable; card cleanup should retire rows from the
board instead of hard-deleting them.

Native graph planning is not yet enforced for card generation. The plugin now
has protected runtime endpoints for creating `learning_graph_plans` and
`learning_card_graph_bindings`, but these records are still a planning/binding
layer. Existing production card generation, board projection, submission,
evaluation, reward, and reflection flows remain compatibility-safe and do not
require graph bindings.

## Known Pilot Projection

The known Fan Fan bridge pilot is a card/program projection, not the native
graph source of truth:

- Program: `lprogram_fanfan_igcse_bridge_pilot_v1`
- Draft: `ldraft_fanfan_igcse_bridge_pilot_v1`
- Sequence group: `kg_fanfan_igcse_bridge_pilot_v1`
- Workspace: `weixin_stephen`
- Size: 12 cards
- Subjects: English, Mathematics, Science
- Route: Lower Secondary to IGCSE readiness

The pilot proves that a graph-shaped plan was projected into cards, but it does
not prove that the Growth plugin has imported the full domain pack or can
validate graph prerequisites.

The pilot cards are now treated as legacy projection rows. They can be retired
from the board and regenerated later from the native graph source rather than
kept as compatibility cards.

## Recovered Source Pack

The Home AI documents reference this historical source pack path:

```text
workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json
```

The file was recovered from the old Windows `Agent` workspace on 2026-06-11
into Mac staging, not into this plugin runtime:

```text
/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json
```

Recovered metadata:

- size: `602934` bytes
- sha256:
  `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`
- schemaVersion: `hermes.learningGraphSeed.v0.1`
- importId: `kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1`
- version: `2026-05-27-v1`
- privacyClass: `summary_only`
- sourceDocuments: `15`
- domainPacks: `1`
- nodes: `294`
- edges: `329`

Related recovered files and hashes are recorded in:

```text
/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/recovered-files-manifest.json
/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/uk-hk-curriculum-foundation-manifest.json
```

This recovery is a source artifact only. Before runtime migration, the source
pack must still be imported through a dry-run harness and validated as a
bounded Growth domain pack fixture.

If recovered, do not place raw private learner content, raw prompts, answer
keys, paid source material, or full copyrighted source bodies in this plugin
repository. The importable pack should contain bounded graph metadata, source
references, node summaries, prerequisite edges, and evidence summaries only.

## Migration Boundary

### Phase 0: Local Contract Pointer

Add Growth plugin-local documentation that points to the app-side canonical
contract and records the runtime gap. This document is that pointer.

No schema change, runtime service, production deployment, or data import is
required for Phase 0.

### Phase 1: Source Pack Recovery Or Recreation

Recover or recreate the missing domain pack as a bounded source artifact.

Rules:

- source pack must be independent of Home AI app runtime paths;
- source metadata must include source family, version, stage/subject where
  applicable, import timestamp or source version, and content hash when a local
  source file is used;
- source pack must be learner-level aware and must not activate distant IGCSE or
  A-Level nodes as current targets for younger learners without an explicit
  bridge plan.

### Phase 2: Native Schema And Repository

Implement plugin-local graph persistence and repository access before any card
generation uses the graph.

Implemented plugin-side modules:

- `src/stores/growth-learning-sqlite/graph-schema.js`
- `src/stores/growth-learning-sqlite/graph-repository.js`
- `src/services/learning-graph-import-service.js`
- `tests/learning-graph-repository.test.js`

Still planned before graph-required card generation:

- `src/services/learning-graph-node-service.js`

Implemented after the native import:

- `src/services/learning-graph-plan-service.js`
- `src/services/learning-card-graph-binding-service.js`
- `tests/learning-graph-plan-binding-service.test.js`

The repository must validate stable ids, required source metadata, missing
prerequisites, cycles, privacy markers, and summary-only constraints.

Native graph tables now created by the repository:

- `learning_graph_imports`
- `learning_graph_domain_packs`
- `learning_graph_nodes`
- `learning_graph_edges`
- `learning_graph_plans`
- `learning_card_graph_bindings`

Only the import/domain-pack/node/edge tables are populated by the source-pack
import script. Plan and card-binding tables are created empty for the later
planning phase.

### Phase 3: Dry-Run Import Harness

Add an import script and tests that can parse the source pack without mutating
production data by default, then write native bounded graph rows only when
`--write --target-db` is passed.

Implemented files:

- `scripts/import-learning-graph-pack.js`
- `tests/learning-graph-import-service.test.js`
- `src/services/learning-graph-import-service.js`

Dry-run output should report:

- domain pack id and version;
- node count;
- edge count;
- rejected records with bounded reasons;
- prerequisite and cycle findings;
- privacy/source-content violations.

Current command:

```bash
node scripts/import-learning-graph-pack.js \
  --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --dry-run \
  --json
```

Write command shape:

```bash
node scripts/import-learning-graph-pack.js \
  --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --write \
  --json
```

Readback command shape:

```bash
node scripts/import-learning-graph-pack.js \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --readback \
  --import-id kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1 \
  --json
```

Write mode checkpoints/truncates the target WAL, creates a timestamped SQLite
backup, then imports the source pack idempotently by replacing rows for the
same `importId`. It stores source metadata, graph nodes, and graph edges. It
does not copy PDF/HTML source bodies, raw prompts, learner answers, answer
keys, or private payloads into the runtime database.

The first harness is validation-only and does not create
`learning_graph_*` tables. It checks:

- supported `schemaVersion`;
- root `privacyClass=summary_only`;
- required domain pack, node, and edge fields;
- duplicate node and edge ids;
- missing edge endpoints;
- prerequisite cycles;
- unsafe raw-content key names such as raw prompt, full text, transcript,
  answer key, private payload, cookies, passwords, secrets, or access keys;
- absolute or UNC source-document paths.

The recovered Fan Fan graph passed the dry-run harness:

- source sha256 matched
  `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
- `sourceDocuments`: `15`;
- `domainPacks`: `1`;
- `nodes`: `294`;
- `edges`: `329`;
- `prerequisite_edges`: `34`;
- duplicate node ids: `0`;
- duplicate edge ids: `0`;
- missing edge endpoints: `0`;
- prerequisite cycles: `0`;
- rejected records: `0`;
- unsafe raw-content keys: `0`;
- absolute source-document paths: `0`.

The harness reports `cross_domain_prerequisites_require_review` as a warning.
The recovered pack currently has 12 cross-domain prerequisite edges, mainly
from Lower Secondary English/Science into IGCSE ESL/Biology/Chemistry/Physics
targets. This warning is not a runtime import blocker in the dry-run phase, but
the native repository/import phase must either model these as explicit bridge
nodes or record an approved cross-domain bridge policy before graph-required
card generation is enabled.

Temporary write validation against a throwaway SQLite database passed with:

- imports: `1`;
- domain packs: `1`;
- nodes: `294`;
- edges: `329`;
- prerequisite edges: `34`;
- plans: `0`;
- card bindings: `0`.

Production import completed on 2026-06-11:

- target DB:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3`;
- backup:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-graph-import-20260611T104021Z.sqlite3`;
- `learning_graph_imports`: `1`;
- `learning_graph_domain_packs`: `1`;
- `learning_graph_nodes`: `294`;
- `learning_graph_edges`: `329`;
- `learning_graph_plans`: `0`;
- `learning_card_graph_bindings`: `0`;
- import prerequisite edges: `34`;
- SQLite `PRAGMA quick_check`: `ok`;
- Growth status/board smoke after import still returned
  `source=growth-plugin-sqlite` for `weixin_stephen`.

### Phase 4: Graph Plan Service

Add a service that creates `learningGraphPlan` records from native graph data.

Implemented files:

- `src/services/learning-graph-plan-service.js`
- `src/services/learning-card-graph-binding-service.js`
- `tests/learning-graph-plan-binding-service.test.js`

The model may propose candidate temporary nodes, but service validation is
authoritative.

Current implementation notes:

- focused `teaching` and `practice` plans require exactly one target node;
- `integration_practice` may carry multiple target nodes;
- `stage_assessment` requires explicit coverage node ids;
- target nodes, prerequisite nodes, and assessment coverage nodes must exist in
  native graph tables;
- plans and card bindings are stored in `learning_graph_plans` and
  `learning_card_graph_bindings`;
- formal-card validation can fail closed with
  `learning_graph_plan_required`, but this validation is not yet wired into
  production card authoring.

Runtime API boundary added after the service layer:

- `POST /api/v1/growth/graph/plans`
  - requires the workspace-local bearer and a writable `workspace_id`;
  - normalizes snake_case and camelCase input into
    `learningGraphPlanService.createPlan`;
  - writes only bounded plan metadata over already-imported graph nodes.
- `POST /api/v1/growth/cards/:taskCardId/graph-binding`
  - requires the workspace-local bearer and a writable `workspace_id`;
  - binds the URL card id, not a caller-provided body override;
  - normalizes node ids, card role, assessment coverage, and repair metadata
    into `learningCardGraphBindingService.bindCard`.

The runtime API harness is `tests/growth-routes.test.js`; it verifies bearer
authorization, workspace id normalization, URL card-id precedence, and 400
mapping for graph service rejections.

### Phase 5: Card Generation Integration

Only after the schema, import harness, and plan service are in place should new
formal card generation require graph plans.

Integration rules:

- new formal cards require `learningGraphPlanId` when graph-required mode is
  enabled;
- old compatibility cards, old pilot cards, and old evergreen cards may be
  retired and regenerated; they should not drive future architecture;
- stage assessments must declare coverage node ids;
- difficulty feedback updates planning evidence and must not become a formal
  mastery failure by itself.

Status: not yet implemented. Existing card generation and production card
workflow remain unchanged.

### Phase 5a: Regenerable Card Retirement Harness

Added a bounded retirement harness for old projection rows:

- `src/stores/growth-learning-sqlite/card-retirement.js`
- `src/services/growth-card-retirement-service.js`
- `scripts/retire-growth-cards.js`
- `tests/growth-card-retirement-service.test.js`

Default behavior:

- dry-run by default;
- requires `--workspace-id`;
- selects non-hidden, non-native-graph-bound cards in the workspace;
- includes evergreen cards by default because they can be regenerated;
- excludes cards with `learning_card_graph_bindings` or raw
  `learningGraphPlanId` unless explicitly overridden;
- writes only `learning_task_cards.status='retired'`, activation metadata, and
  `raw_json.growthRetirement`;
- cancels open `pending`/`retry`/`processing` evaluation jobs for retired cards;
- preserves submissions, evaluations, reflections, audio blobs, artifacts, and
  reward rows.

Production write shape:

```bash
node scripts/retire-growth-cards.js \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --workspace-id weixin_stephen \
  --write \
  --json
```

## Non-Goals

- Do not move the entire Home AI Growth built-in module back into this plugin.
- Do not treat the 12-card pilot as the full source graph.
- Do not make imported source paths runtime dependencies.
- Do not add graph enforcement before import and validation harnesses exist.
- Do not store raw learner answers, raw model output, full transcripts, answer
  keys, paid source content, or full copyrighted source bodies in graph records.
- Do not hard-code the graph schema to K12, grade, or school subjects.

## Acceptance Checklist

Before Growth plugin runtime can claim native Knowledge Graph support:

- native graph tables exist in the plugin SQLite schema;
- repository tests prove stable ids, prerequisite validation, and cycle
  rejection;
- import dry-run and write-mode harnesses can process a bounded domain pack
  with a rollback backup;
- graph plan tests prove formal cards cannot be published without a valid plan
  when graph-required mode is enabled;
- route tests prove protected graph plan and card-binding writes cannot bypass
  the workspace bearer or URL card-id binding;
- retirement tests prove old regenerable cards can be removed from the board
  without hard-deleting learner history;
- stage assessment tests prove explicit coverage node binding;
- public projections remain summary-only.
