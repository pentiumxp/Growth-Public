# HANDOFF

Last compacted: 2026-06-18T09:26:52.492Z

This active handoff was automatically compacted before a Codex Mobile continuation.
The previous full handoff was archived and should be opened only when old provenance is explicitly needed.

## 2026-06-19T00:00+0800 - Fanfan Computing And AI Literacy KG Pack

- Status: source pack generated and imported into the local Mac development
  SQLite database. No production deploy, release approval, scheduler
  permission, Gateway call, or learner-state mutation was performed.
- Added `docs/GROWTH_COMPUTING_AI_LITERACY_KG_PLAN.md`.
- Updated `docs/GROWTH_DOCS_INDEX.md` and
  `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md` to point to the new plan.
- Added generator
  `scripts/build-fanfan-computing-ai-literacy-graph-pack.js`.
- Added source pack
  `knowledge-graph/fanfan-computing-ai-literacy-v1.json`.
- Added dry-run hash/count regression coverage in
  `tests/learning-graph-import-service.test.js`.
- Planning decision:
  - create a separate breadth-first domain pack,
    `domain_pack_fanfan_computing_ai_literacy_v1`;
  - do not extend the Cambridge pathway pack and do not make Python->C++ the
    primary route;
  - keep Python as the practical tool layer while centering problem definition,
    AI coding workflow, computing breadth, data/web/API literacy,
    systems/security context, AI literacy, product thinking, history, and
    ethics.
- Proposed import identity:
  `kg_import_20260619_fanfan_computing_ai_literacy_v1`,
  `version=2026-06-19-v1`, `domain=computing_ai_literacy`.
- Source pack validation:
  - sha256:
    `c30acd8ddbf4610f3a7b7b723b003687619596b75f1108eb45518962f0ba5db9`;
  - source documents: `19`;
  - domain packs: `1`;
  - nodes: `83`;
  - edges: `140`;
  - prerequisite edges: `58`;
  - validation clean: duplicate node ids `0`, duplicate edge ids `0`,
    missing endpoints `0`, prerequisite cycles `0`, rejected records `0`,
    unsafe raw-content keys `0`, absolute source paths `0`.
- Local development DB readback:
  - target: `data/growth-learning.sqlite3`;
  - backup:
    `data/backups/growth-learning-before-graph-import-20260618T224501Z.sqlite3`;
  - post-import totals: imports `2`, domain packs `2`, graph nodes `377`,
    graph edges `469`.
- Source strategy recorded:
  K-12 CS Framework, CSTA, Teach Computing KS3, Raspberry Pi curriculum,
  AI4K12, UNESCO AI competency for students, CS2023, Computer History Museum,
  Stanford Encyclopedia of Philosophy AI entry, Python official tutorial, and
  OpenAI Codex docs, plus MDN Learn, Pro Git, and Pygame docs.
- Local learner placement summary recorded from the Fanfan Python archive:
  Fanfan is beyond beginner syntax and has project evidence around games, OOP,
  Git/GitHub, APIs, HTML/CSS/JS, scraping, CSV, exceptions, and session/history
  persistence. The main new gap is structured AI-coding workflow rather than
  "wish-making" prompts.
- Privacy boundary:
  use only bounded summary evidence; do not copy raw chat logs, answer keys,
  full submissions, raw prompts, raw model output, private payloads, token-like
  values, local attachment bodies, or copyrighted source bodies into graph
  records.
- Remaining work:
  - production import is still pending and must use explicit target database
    selection plus backup;
  - visible target provisioning for Fanfan's new domain pack is pending;
  - first computing/AI literacy card recipes or target selections are pending.

## Compaction Summary

- Workspace: `/Users/hermes-dev/HermesMobileDev/plugins/growth`
- Original active handoff bytes: `1361926`
- Archived full handoff: `/Users/hermes-dev/HermesMobileDev/plugins/growth/.agent-context/archive/context-compaction-20260618_092652/HANDOFF.full-before-context-budget.md`
- Preserved recent active context chars: `15173`

## Startup Guidance

- Read `.agent-context/PROJECT_CONTEXT.md` first.
- Read this compact `.agent-context/HANDOFF.md` for current status.
- Do not load the archived full handoff unless the user asks for old provenance or the compact handoff is insufficient.
- Before changing any latest-version, backup, deployment, or runtime-state fact, verify current repo/runtime state or the latest source-thread handoff; archived old sections are provenance only.
- Keep future handoff updates concise: current state, changed files, validation, risks, and next steps.
- Do not store raw secrets, tokens, one-time approvals, hidden UI state, long logs, or bulky generated output.

## Preserved Recent Handoff Tail

## 2026-06-18T00:15+0800 - Subject-specific daily rubric catalog expansion

- Status:
  - Implemented local Growth H2 rubric catalog/generalization package.
  - No SQLite schema migration, route permission change, UI change, Gateway
    boundary change, production deploy, or release evidence collection was
    executed in this slice.
- Implemented behavior:
  - `learning-card-rubric-policy-service` now resolves
    `daily_subject_practice_v1` to stable subject-specific rubric policies for
    mathematics, history, geography, and computer science, while preserving a
    generic subject fallback for unknown subjects.
  - The service exposes a bounded `subjectCatalog()` summary with policy ids,
    recipe ids, domains/subjects, dimension ids, and evidence keys.
  - `learning-card-generation-recipe-policy-service.context()` now includes
    bounded `rubricCatalog` readback plus selected generation-default
    `rubricPolicyId` and `rubricDimensionIds`.
  - Generic daily subject generation for mathematics now sends
    `rubric:daily_mathematics_v1` through the existing generation/authoring
    path and persists that bounded policy in generated card `raw_json`.
  - Gateway evaluation input now resolves the mathematics policy from card
    raw metadata and validates mathematics rubric dimensions such as
    `math_reasoning_explanation`.
  - The Growth local platform pointer and handoff were updated to canonical
    Home AI platform contract version `20260618-v4`.
  - All new rubric fields remain summary-only and do not expose raw learner
    answers, transcripts, raw prompts, raw model output, hidden answers,
    private paths, provider config, credentials, or source document bodies.
- Documentation updated:
  - `.agent-context/HANDOFF.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/TEST_MATRIX.md`.
- Validation passed:
  - `node --test tests/learning-card-rubric-policy-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-evaluation-service.test.js`
    passed `29/29`.
  - `node --test tests/learning-card-rubric-policy-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-evaluation-service.test.js tests/learning-evidence-ledger-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-profile-v2-service.test.js tests/learning-profile-feedback-evidence-service.test.js tests/learning-card-ai-loop-harness.test.js tests/growth-architecture-boundary.test.js`
    passed `89/89`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `node scripts/check-growth-docs-locality.js` passed with
    `requiredCount=37`.
  - `npm run --silent check` passed with `runtimeCount=223`.
  - `git diff --check` passed.
  - `codegraph sync && codegraph status` reported the index is up to date,
    with the existing earlier-engine advisory.
- Remaining next-step candidates:
  - render subject rubric catalog/readback in the embedded Owner UI;
  - add more subject-specific rubric policies as actual domain packs require
    them;
  - collect central visual/release evidence and real production
    profile-feedback evidence before treating the product surface as complete.

## 2026-06-18T00:45+0800 - Formal stage-assessment rubric closure

- Status:
  - Implemented local Growth H1/H2 formal-checkpoint rubric/evidence package.
  - No SQLite schema migration, route permission change, UI change, Gateway
    boundary change, production deploy, or release evidence collection was
    executed in this slice.
- Implemented behavior:
  - `learning-card-rubric-policy-service` now resolves formal
    `stage_assessment` / `formal_assessment` cards to
    `rubric:stage_assessment_v1:<subject>` before daily subject fallback.
    The V1 formal rubric uses independent understanding,
    transfer/application, evidence/reasoning, and reflection-calibration
    dimensions.
  - `learning-card-generation-service` can resolve rubric policy for
    non-recipe formal cards without applying daily recipe defaults.
  - `learning-stage-assessment-service` now preserves target
    `domainPackId`, `domain`, and `subject` scope into card generation and
    injects the formal checkpoint rubric through the Growth service graph.
  - Stage assessment route normalization accepts `domainPackId`, `domain`, and
    `subject` only when present, preserving old route DTO shape for existing
    callers.
  - `learning-card-evaluation-service` resolves rubric policy from explicit
    card raw metadata, card role, or `formal_assessment` completion policy, so
    legacy formal cards can still validate formal rubric dimensions.
  - `evaluation-jobs` / `projection` now preserve only bounded public
    `skillResults`, `rubricPolicyId`, and `rubricResults` readback from
    stored evaluations. The evidence ledger can therefore write formal
    rubric-bearing high-weight stage evidence from persisted public DTOs.
  - `learning-card-ai-loop-harness` now proves Owner activation -> generated
    formal card -> one submission -> Gateway evaluation with formal rubric ->
    ledger/Profile update -> cooldown, including duplicate submission and
    reflection rejection.
  - All new rubric fields remain summary-only and do not expose raw learner
    answers, transcripts, raw prompts, raw model output, hidden answers,
    private paths, provider config, credentials, or source document bodies.
- Documentation updated:
  - `.agent-context/HANDOFF.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/TEST_MATRIX.md`.
- Validation passed:
  - `node --test tests/learning-card-rubric-policy-service.test.js tests/learning-stage-assessment-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-evaluation-service.test.js tests/learning-evidence-ledger-service.test.js tests/learning-card-ai-loop-harness.test.js`
    passed `40/40`.
  - `node --test tests/growth-routes.test.js tests/learning-stage-assessment-service.test.js tests/learning-card-ai-loop-harness.test.js`
    passed `67/67`.
  - `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-projection.test.js tests/growth-evaluation-service.test.js tests/learning-evidence-audit-service.test.js tests/learning-cycle-audit-service.test.js tests/learning-profile-v2-service.test.js tests/learning-profile-feedback-evidence-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    passed `125/125`.
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `git diff --check`;
  - `codegraph sync && codegraph status` -> index up to date, with the
    existing earlier-engine advisory unchanged.
- Remaining next-step candidates:
  - render formal rubric readback in the embedded Owner audit UI;
  - collect central visual/release evidence for the implemented Owner controls;
  - run production planner/daily-loop/profile-feedback smoke with real target
    config before treating the product surface as complete;
  - add richer subject-specific rubric catalogs as actual domain packs require
    them.

## 2026-06-18T01:20+0800 - Owner generation rubric readback UI closure

- Status:
  - Implemented bounded formal stage-assessment rubric readback in the Owner
    generation panel.
  - Bumped the static asset query version to
    `20260618-stage-rubric-readback-v1` so mobile clients do not reuse the
    older cached generation UI.
  - No SQLite schema migration, Gateway provider change, host route import, raw
    prompt exposure, production deploy, or release activation was performed in
    this slice.
- Implemented behavior:
  - `learning-stage-checkpoint-controls-service` resolves the formal
    `stage_assessment` rubric through `learning-card-rubric-policy-service`
    and exposes only a bounded public summary: policy id, card role,
    completion policy, duration policy, dimension ids, and evidence keys.
  - `src/app/services.js` injects the rubric policy service into the stage
    checkpoint controls service without adding host Growth dependencies.
  - `learning-card-generation-context-service` now includes a bounded
    `rubricCatalog` projection so Owner UI and authoring context can reference
    available rubric ids without raw rubric payloads.
  - `growth-card-generation-ui.js` renders the stage checkpoint rubric readback
    from the controls DTO: policy id, `formal_assessment`, one evaluation, one
    reflection, 25-30 minutes, rubric dimensions, and evidence keys.
  - `growth-homeai-legacy.css` adds light/dark/mobile styling for the rubric
    readback panel while preserving the existing embedded layout guard shape.
- Documentation updated:
  - `.agent-context/HANDOFF.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/TEST_MATRIX.md`.
- Validation passed:
  - `node --check src/services/learning-stage-checkpoint-controls-service.js src/services/learning-card-generation-context-service.js src/app/services.js public/growth-card-generation-ui.js`
  - `node --test tests/learning-stage-checkpoint-controls-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`
    passed `52/52`.
  - `node --test tests/learning-stage-checkpoint-controls-service.test.js tests/growth-stage-checkpoint-controls-smoke-script.test.js tests/learning-stage-assessment-service.test.js tests/growth-stage-assessment-smoke-script.test.js tests/growth-routes.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`
    passed `150/150` after fixing the CSS mobile selector shape.
  - `node --test tests/learning-card-generation-context-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-rubric-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-ai-loop-harness.test.js`
    passed `36/36`.
  - `node scripts/check-growth-docs-locality.js` passed with
    `requiredCount=37`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `npm run --silent check` passed with `runtimeCount=223`.
  - `git diff --check` passed.
  - Local static service on fallback port `4991` served the new JS/CSS and the
    updated asset query version; no old `20260616-digest-create-ui-v1` query
    string was present in the served root page.
  - In-app Browser was unavailable in this Codex session, and Playwright was
    not installed locally; do not treat this as central visual evidence.
- Remaining next-step candidates:
  - collect central visual/release evidence from the Home AI visual toolchain
    before production release closure;
  - run production planner/daily-loop/profile-feedback smoke with real target
    config;
  - add richer subject-specific rubric catalogs as actual domain packs require
    them.

## 2026-06-18T01:04+0800 - Release bundle task-evidence summary-only closure

- Status:
  - Fixed the release evidence bundle/readiness contract gap found during final
    release-evidence validation.
  - Overall Growth backend/release-evidence target is approximately 98.5%
    complete after this slice. The remaining gap is not the card loop or bundle
    shape; it is production-release evidence/config completion.
- Implemented behavior:
  - `learning-automation-release-evidence-bundle-service` now wraps every task
    evidence object as formal summary-only evidence with:
    `schemaVersion`, `privacyClass=summary_only`, `summaryOnly=true`,
    bounded task/source metadata, and `readyForReleaseEvidence`.
  - Passing task evidence can now be consumed by
    `npm run smoke:release-readiness -- --evidence-bundle-file <bundle>`
    without being rejected as `release_evidence_summary_only_required`.
  - Blocked task evidence remains `ok=false`, `status=blocked`, and
    `readyForReleaseEvidence=false`; this does not convert missing external
    prerequisites into pass evidence.
  - Central visual/UI task evidence still preserves the more specific smoke
    schema when provided, while retaining the summary-only/readiness wrapper.
- Documentation updated:
  - `.agent-context/HANDOFF.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/TEST_MATRIX.md`.
- Validation passed:
  - `node --check src/services/learning-automation-release-evidence-bundle-service.js`
  - `node --test tests/learning-automation-release-evidence-bundle-service.test.js tests/growth-release-evidence-bundle-script.test.js`
    passed `49/49`.
  - `node --test tests/learning-automation-release-readiness-service.test.js tests/growth-release-readiness-smoke-script.test.js tests/learning-automation-release-evidence-bundle-audit-service.test.js tests/growth-release-evidence-bundle-audit-smoke-script.test.js`
    passed `35/35`.
  - Actual bundle/readiness smoke readback using the Home AI central visual
    summary artifact:
    - bundle: `taskCount=24`, `passedCount=18`, `blockedCount=6`;
    - readiness from the new bundle:
      `summaryOnlyFailureCount=0`;
    - `centralVisualEvidence` read back as `checkStatus=pass`,
      `evidenceStatus=pass`, schema
      `growth.learningAutomationCentralVisualEvidence.v1`;
    - readiness remains `blocked` because Owner/UI/platform/data evidence is
      still incomplete, not because the bundle task-evidence wrapper is
      invalid.
  - `npm run test:release-union` passed `255/255`.
  - `node scripts/check-growth-docs-locality.js` passed with
    `requiredCount=37`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `npm run --silent check` passed with `runtimeCount=223`.
  - `git diff --check` passed.
  - `codegraph sync && codegraph status` -> index up to date; existing earlier
    engine advisory unchanged.
- Remaining next-step candidates:
  - close true release-readiness blockers: Gateway endpoint/config,
    completed-cycle/profile-feedback evidence, visible target provisioning,
    stage-assessment target selectors, platform Action Inbox/Web Push evidence,
    Owner/UI visual evidence, reviewed digest/failure-policy/handoff/worker
    target records, and explicit release approvals;
  - do not treat the blocked bundle as production release approval;
  - run production deploy only after the remaining release evidence and Owner
    approval gates are intentionally satisfied.

## 2026-06-19T07:35+0800 - Fanfan computing AI literacy production release

- Status:
  - Released the Fanfan Computing and AI Literacy breadth graph pack to Mac
    production through the central Home AI macOS deployment contract, then
    imported it into the production Growth learning SQLite database.
  - Provisioned the new graph target for Fanfan's production workspace and
    published one production test learning card that can be opened through the
    normal Growth card flow.
- Production source deploy:
  - Central command path:
    `/Users/hermes-dev/HermesMobileDev/app/scripts/deploy-macos-production.js`
    via `npm run deploy:macos -- --plugin growth`.
  - Source commit deployed: `cd31158a1b8e` (`Add Fanfan computing AI literacy
    graph pack`).
  - Production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260618T230116Z-plugin-growth-manual`.
  - Manifest health passed after service restart.
  - Non-blocking central auth audit note: `codexIssueCount=0`; existing
    non-Codex audit issue count remained non-zero.
- Production graph import:
  - Graph source:
    `knowledge-graph/fanfan-computing-ai-literacy-v1.json`.
  - Pack id: `domain_pack_fanfan_computing_ai_literacy_v1`.
  - Import id: `kg_import_20260619_fanfan_computing_ai_literacy_v1`.
  - Production DB backup:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-graph-import-20260618T230145Z.sqlite3`.
  - Import readback passed with `83` nodes, `140` edges, `58` prerequisite
    edges, `10` subjects, zero duplicate ids, zero missing endpoints, zero
    prerequisite cycles, zero rejected records, zero unsafe raw-content keys,
    and zero absolute source paths.
  - Production DB totals after import: `2` imports, `2` packs, `377` nodes,
    `469` edges.
- Production target provisioning:
  - Workspace/learner: `weixin_stephen` / `weixin_stephen` (Fanfan visible
    target).
  - Program id: `program_fanfan_computing_ai_literacy_preview`.
  - Provision id: `lgprov_b4de21114f04335135`.
  - Target node: `kg_compute_ai_coding_requirements`.
  - Resolve readback passed with `targetEnabled=true`, mode
    `explicit_provision`, domain pack
    `domain_pack_fanfan_computing_ai_literacy_v1`, domain
    `computing_ai_literacy`, subject `software_engineering_ai_coding`.
- Production test card:
  - Generated through the production Growth card generation service with
    Gateway authoring and validation. The first attempt hit a transient
    `fetch failed`; the second attempt reached Gateway but failed validation on
    missing `teachingFlow.quickCheck.instruction`; the successful retry used
    the daily subject practice evidence defaults and was repaired/validated by
    the service before publish.
  - Task card id: `ltask_597aa663cd0e9838bf`.
  - Title: `Turn a game feature wish into a clear AI coding request`.
  - Learning graph plan id: `lgp_203d28cc775d4ac75e`.
  - Generation key:
    `fanfan-computing-ai-literacy-requirements-preview-20260619`.
  - Gateway mode: `json`; repaired: `true`.
  - DB readback passed: card is `published`, workspace/learner are
    `weixin_stephen`, role is `practice`, planned date is `2026-06-18`,
    planned minutes is `12`, completion policy is `daily_score_once`, domain
    is `computing_ai_literacy`, and skill ids contain
    `kg_compute_ai_coding_requirements`.
  - Graph binding readback passed:
    `ltask_597aa663cd0e9838bf` -> `lgp_203d28cc775d4ac75e` with
    node ids `["kg_compute_ai_coding_requirements"]`.
  - Service-level card GET passed at
    `/api/v1/growth/cards/ltask_597aa663cd0e9838bf?workspaceId=weixin_stephen`.
- Remaining next-step candidates:
  - Owner should open Home AI production, enter Growth/Fanfan, and inspect the
    published card content through the normal card flow.
  - If the card is acceptable, keep the pack provision active and start adding
    more cards/recipes from the new graph; if not, revise the graph node text
    or add subject-specific rubric support for `software_engineering_ai_coding`.

## 2026-06-19T07:39+0800 - Fanfan computing AI test card corrected to daily-loop chain

- Status:
  - Corrected the product interpretation for the production test card. A
    one-time ordinary practice card should be treated as part of the perpetual
    daily learning chain: the card content is completed once, then the
    daily-loop/operating-loop path supplies the next card after learner
    evidence and profile feedback exist.
  - The earlier production test card was generated through the lower-level
    card generation service and therefore did not have a
    `learning_growth_plan_drafts` published-plan audit row. It was valid as a
    standalone generated card, but not the right production test artifact for
    the perpetual chain expectation.
- Corrected production card:
  - Generated through `learning-daily-loop-service.advance()` with explicit
    write approval and the same graph scope:
    workspace/learner `weixin_stephen`, program
    `program_fanfan_computing_ai_literacy_preview`, domain pack
    `domain_pack_fanfan_computing_ai_literacy_v1`, domain
    `computing_ai_literacy`, subject `software_engineering_ai_coding`, target
    node `kg_compute_ai_coding_requirements`.
  - New task card id: `ltask_f78ad952048de374f0`.
  - New title: `Make a clearer AI coding request`.
  - Published plan draft id: `lgplan_cf888f6b8dbcb844eb`.
  - Selected item id: `daily_kg_compute_ai_coding_requirements_practice_001`.
  - Learning graph plan id: `lgp_203d28cc775d4ac75e`.
  - Daily-loop readback passed with `dailyLoopOutcome=published`,
    `dailyLoopPublishTransaction=committed`, `dailyLoopGenerationOk=true`,
    `dailyLoopGenerationRecipeId=daily_subject_practice_v1`, and graph binding
    to `kg_compute_ai_coding_requirements`.
  - Service-level card GET passed for
    `/api/v1/growth/cards/ltask_f78ad952048de374f0?workspaceId=weixin_stephen`;
    projection status is `published`, role is `practice`, and primary action
    is `submit`.
  - Current cycle completeness correctly has published-plan evidence and is
    waiting only for real learner completion artifacts:
    `evaluation_evidence` and `profile_delta_audit`.
- Retired superseded standalone card:
  - Retired old task card `ltask_597aa663cd0e9838bf` with reason
    `superseded_by_daily_loop_evergreen_card`.
  - Retirement dry-run matched exactly one card and zero learner submissions,
    evaluations, reflections, audio blobs, evaluation jobs, or reward rows.
  - Production backup before retirement:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260618T233743Z.sqlite3`.
  - Retirement write passed with `retired_count=1` and SQLite
    `quick_check=ok`.
- Automation caveat:
  - Mac production launchd currently has the evaluation worker enabled, but no
    background automation scheduler/worker env gates are enabled. The corrected
    card is now in the correct daily-loop chain for the next-card policy, but
    unattended post-completion generation still depends on the separate
    operating-loop/background-scheduler release gates or an explicit Owner
    run-next action.

## 2026-06-19T07:58+0800 - Fanfan card authoring clarity and X high Gateway config

- Status:
  - Tightened Growth Gateway card authoring prompts so generated daily cards
    must be self-contained for a 13-year-old learner, with concrete titles,
    brief method explanation, labelled worked examples, numbered guided steps,
    exact submission instructions, completion criteria, and evidence keys that
    match the submitted artifact.
  - Added explicit Gateway reasoning-effort support for Growth authoring and
    planner Responses requests. Production Growth now sends
    `model=gpt-5.5` plus `reasoning_effort=xhigh` for authoring and planner
    calls, matching the Home AI ChatGPT 5.5 / X high product posture.
- Commits:
  - Growth plugin: `67844291c46d` (`Improve Growth card authoring clarity`).
  - Home AI central app: `20517a8d` (`Support Growth Gateway reasoning config`).
- Validation:
  - `node --check src/config/env.js src/app/services.js src/services/growth-gateway-authoring-client.js src/services/growth-gateway-planner-client.js`
    passed.
  - `node --test tests/learning-card-authoring-service.test.js tests/learning-plan-orchestrator-service.test.js tests/growth-learning-sqlite-store.test.js`
    passed `42/42`.
  - `npm run --silent check` passed with `runtimeCount=237`.
  - Home AI central installer validation passed:
    `node --check scripts/install-growth-launchd-service.js && node tests/install-growth-launchd-service.test.js`.
  - `git diff --check` passed in both Growth and Home AI app worktrees.
- Production deployment:
  - Deployed Growth commit `67844291c46d` through the central macOS plugin
    deployment contract.
  - Production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260618T235428Z-plugin-growth-manual`.
  - Manifest health passed after restart.
  - Central auth audit remained non-blocking for this deploy:
    `codexIssueCount=0`; existing non-Codex profile issues remain.
  - Reinstalled `com.hermesmobile.plugin.growth` LaunchDaemon through the
    central installer with:
    `GROWTH_GATEWAY_AUTHORING_MODEL=gpt-5.5`,
    `GROWTH_GATEWAY_AUTHORING_REASONING_EFFORT=xhigh`,
    `GROWTH_GATEWAY_PLANNER_MODEL=gpt-5.5`, and
    `GROWTH_GATEWAY_PLANNER_REASONING_EFFORT=xhigh`.
  - Launchd readback confirmed those four env vars plus the existing Gateway
    endpoint/protocol values.
  - Production deployment evidence passed with `checkCount=4`,
    `failedCheckCount=0`, `serviceRunning=true`, `manifestOk=true`,
    `healthOk=true`, and `sqliteIntegrityOk=true`.
  - Home AI proxy planner-readiness passed for Fanfan computing/AI literacy:
    `plannerReadinessOk=true`, `gatewayMode=json`, target
    `kg_compute_ai_coding_requirements`.
- New production card:
  - Generated through the Home AI proxy daily-loop advance route with explicit
    write approval and the same Fanfan graph scope.
  - New task card id: `ltask_9aed14f0c47b11cecd`.
  - Title: `Rewrite one game feature wish into a clear AI coding request`.
  - Published plan draft id: `lgplan_b5044658e04a4dcd9f`.
  - Selected item id: `daily_software_requirements_practice_001`.
  - Learning graph plan id: `lgp_203d28cc775d4ac75e`.
  - Daily-loop readback passed with `dailyLoopOutcome=published`,
    `dailyLoopPublishTransaction=committed`, `dailyLoopGenerationOk=true`,
    `dailyLoopGenerationGatewayMode=json`, and target binding to
    `kg_compute_ai_coding_requirements`.
  - Service-level card GET passed for
    `/api/v1/growth/cards/ltask_9aed14f0c47b11cecd?workspaceId=weixin_stephen`;
    projection status is `published`, primary action is `submit`, and the
    card detail includes the clearer micro-lesson, labelled weak/improved
    example, numbered guided-practice steps, exact four-section submission
    artifact, and completion criteria.
- Retired superseded card:
  - Retired previous daily-loop test card `ltask_f78ad952048de374f0` with
    reason `superseded_by_clearer_xhigh_authoring_card`.
  - Retirement dry-run matched exactly one card and zero learner submissions,
    evaluations, reflections, audio blobs, evaluation jobs, artifacts, or
    reward rows.
  - Production backup before retirement:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260618T235826Z.sqlite3`.
  - Retirement write passed with `retired_count=1` and SQLite
    `quick_check=ok`.
- Current Owner-visible test target:
  - Open Home AI production -> Growth/Fanfan and use the normal card flow for
    `ltask_9aed14f0c47b11cecd`.
  - Current cycle completeness is intentionally incomplete until Fanfan submits
    real learner evidence; it waits for `evaluation_evidence` and
    `profile_delta_audit`.

## 2026-06-19T09:35+0800 - XuLu Computing And AI Literacy Daily Cards

- Scope:
  - Copied/provisioned the Fanfan computing and AI literacy domain pack path for
    XuLu/Eileen's workspace `user-a87aaa61`.
  - The reused production domain pack is
    `domain_pack_fanfan_computing_ai_literacy_v1`, domain
    `computing_ai_literacy`, subject `software_engineering_ai_coding`.
- Workspace enablement:
  - Home AI Growth authorization now includes `user-a87aaa61`.
  - Growth workspace binding exists for
    `growth:user-a87aaa61` / Hermes workspace `user-a87aaa61`, display name
    `Eileen`.
  - Home AI plugin list readback for `user-a87aaa61` includes `growth`.
  - Growth view-target readback lists Eileen for Owner-visible target
    switching.
- Target provisioning:
  - Added explicit provision
    `lgprov_6ff36d69f85315a2a8` for program
    `program_xulu_computing_ai_literacy_daily`.
  - Target provisioning readback passed for:
    `kg_compute_ai_coding_context`,
    `kg_compute_ai_coding_requirements`, and
    `kg_compute_ai_coding_task_breakdown`.
- Code changes:
  - `421e82a` (`Adapt Growth card authoring to learner profile`) makes
    authoring prompts adapt to supplied summary-only learner profile rather
    than a fixed 13-year-old default.
  - `471bc84` (`Preserve learner summary in daily loop routes`) forwards
    `learnerSummary` / `learner_summary` through daily-loop HTTP routes so
    Home AI proxy requests reach card authoring with the learner profile.
- Production deployment:
  - Deployed Growth commit `471bc84a9fd5` through the central macOS plugin
    deployment contract.
  - Production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260619T092314Z-plugin-growth-manual`.
  - Manifest health passed after restart.
  - Auth profile audit remained non-blocking for this deploy:
    `codexIssueCount=0`; existing non-Codex profile issues remain.
  - Launchd readback confirmed:
    `GROWTH_GATEWAY_AUTHORING_MODEL=gpt-5.5`,
    `GROWTH_GATEWAY_AUTHORING_REASONING_EFFORT=xhigh`,
    `GROWTH_GATEWAY_PLANNER_MODEL=gpt-5.5`, and
    `GROWTH_GATEWAY_PLANNER_REASONING_EFFORT=xhigh`.
- Validation:
  - `node --check src/routes/growth-routes.js` passed.
  - `node --test tests/growth-routes.test.js` passed `64/64`.
  - `node --test tests/learning-card-authoring-service.test.js tests/learning-card-generation-service.test.js tests/learning-plan-publisher-service.test.js`
    passed `32/32`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `node scripts/check-growth-docs-locality.js` passed.
  - `npm run --silent check` passed with `runtimeCount=237`.
  - `git diff --check` passed before commit.
- New production XuLu/Eileen cards:
  - `ltask_276ab6eb0eb2ddf70f`: `Write a clear AI help note for a tiny game
    change`, target `kg_compute_ai_coding_context`.
  - `ltask_ecb5115115559799d4`: `Turn One Game Wish Into a Clear Build
    Request`, target `kg_compute_ai_coding_requirements`.
  - `ltask_330704a82cee3bb2a3`: `Make a 3-step checklist for a tiny game
    change`, target `kg_compute_ai_coding_task_breakdown`.
  - All three are `published`, `practice`, `primaryAction=submit`,
    `completionPolicy=daily_score_once`, and graph-bound to the expected node.
  - DB readback confirmed persisted learner profile:
    `schoolYear=Year 2`, `educationStage=primary`, `ageYears=7-8`, with a
    low-reading-load primary learner audience description.
  - Home AI same-origin proxy card GET returned HTTP 200 for all three.
- Retired superseded XuLu cards:
  - Retired the first three unprofiled test cards generated before the
    daily-loop route fix:
    `ltask_48a34906ae13d60632`,
    `ltask_0116ba6f890dd07b8b`, and
    `ltask_62d69971062dc1d7d5`.
  - Retirement dry-run matched exactly those three cards.
  - Retirement write passed with `retired_count=3`, `remaining=0`, and SQLite
    `quick_check=ok`.
  - Production backup before retirement:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260619T092732Z.sqlite3`.
- Current test path:
  - Open Home AI production as Owner, switch Growth target to Eileen/XuLu, and
    use the normal card flow for the three `ltask_*` card ids above.
  - Cycle completeness is intentionally incomplete until XuLu submits real
    learner evidence; it waits for `evaluation_evidence` and
    `profile_delta_audit`.
  - No unattended scheduler was enabled in this task.

## 2026-06-19T09:50+0800 - XuLu Owner-Workspace English And Math Daily Cards

- Scope correction:
  - User clarified the source profile is the Home AI Owner production workspace,
    not the older `/Users/xuxin/HermesMobile` reference workspace.
  - Summary-only source files were read from
    `/Users/hermes-host/HermesMobile/data/drive/users/owner/Hermes-徐欣/路路`
    and sibling `Eileen` material. Raw medical, gene, score-table, and report
    details were not copied into Growth docs, handoff, or card requests.
  - Learner profile constraints used for authoring only at summary level:
    Year 2 primary learner at Harrow; low-pressure, one-step instructions;
    concrete-before-abstract scaffolding; reduced working-memory load; no
    speed pressure, comparison, or multi-instruction prompts.
- Target provisioning:
  - Computing/AI literacy provision `lgprov_6ff36d69f85315a2a8` for
    `program_xulu_computing_ai_literacy_daily` is now `inactive` with source
    `owner_scope_change`.
  - English provision `lgprov_887ecb7953b5598a30` is `active` for
    `program_xulu_english_math_daily`,
    `domain_pack_fanfan_cambridge_pathway_v1`, domain `english`, subject
    `english`.
  - Mathematics provision `lgprov_7b4198f2b6e6d05cd4` is `active` for the same
    program/domain pack, domain `mathematics`, subject `mathematics`.
  - Resolve readback passed for:
    `kg_ls_english_reading_explicit_meaning_in_texts` and
    `kg_ls_mathematics_number_place_value_ordering_and_rounding`.
  - Resolve readback for `kg_compute_ai_coding_requirements` now fails closed
    with `learning_target_not_provisioned`, confirming CS is not enabled.
- Route/code fix:
  - Commit `a814790` (`Preserve daily loop recipe selection`) adds `recipeId`
    / `recipe_id` forwarding through daily-loop HTTP body normalization so
    non-English subject cards do not silently fall back to
    `daily_english_v1`.
  - Updated `tests/growth-routes.test.js` to assert daily-loop draft/advance
    recipe forwarding, and `docs/GROWTH_CARD_GENERATION_RULES.md` to record
    the rule.
- Production deployment:
  - Deployed Growth commit `a81479043dd3` through the central macOS plugin
    deployment contract.
  - Production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260619T094642Z-plugin-growth-manual`.
  - Restart label: `com.hermesmobile.plugin.growth`.
  - Manifest health passed after restart.
  - Auth profile audit remained non-blocking:
    `codexIssueCount=0`; existing non-Codex profile issues remain.
  - Launchd readback confirmed Gateway authoring/planner model settings:
    `gpt-5.5` and `xhigh`.
- Validation:
  - `node --check src/routes/growth-routes.js` passed.
  - `node --test tests/growth-routes.test.js` passed `64/64`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `npm run --silent check` passed with `runtimeCount=237`.
  - `git diff --check` passed before commit.
  - Home AI same-origin proxy card GET returned HTTP 200 for both final cards.
- Retired cards:
  - Retired the three profiled computing cards after the Owner narrowed scope
    to English and math only:
    `ltask_276ab6eb0eb2ddf70f`,
    `ltask_ecb5115115559799d4`, and
    `ltask_330704a82cee3bb2a3`.
  - Retirement backup:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260619T093510Z.sqlite3`.
  - Retired wrong-recipe math card `ltask_fcdb66ab74a3ea99c5` after detecting
    `dailyLoopGenerationRecipeId=daily_english_v1`.
  - Retirement backup:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260619T094727Z.sqlite3`.
  - Retired old unprofiled math trial card `ltask_35941e135c59cd56` so the
    current XuLu daily card set contains only the new profiled English and math
    cards.
  - Retirement backup:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260619T094915Z.sqlite3`.
  - All retirement writes reported SQLite `quick_check=ok`.
- Final production XuLu/Eileen cards:
  - English:
    `ltask_27c13fe5efd2ab7584` -
    `Find one clear answer in a short text`, domain `english`, role
    `practice`, target `kg_ls_english_reading_explicit_meaning_in_texts`.
  - Mathematics:
    `ltask_c66c84d5c6ab9e1b40` -
    `Order Three 2-Digit Numbers Using Tens and Ones`, domain `mathematics`,
    role `practice`, target
    `kg_ls_mathematics_number_place_value_ordering_and_rounding`.
  - Both are `published`, `primaryAction=submit`, graph-bound to the expected
    node, and persist summary-only learner profile fields:
    `schoolYear=Year 2`, `educationStage=primary`.
  - Content structure spot-check passed: both cards include concrete
    learning target, micro-lesson, guided practice with exact artifact, and
    quick-check submission/completion criteria.
  - Board readback currently shows one current daily lane card and one
    hidden-future queued card; direct card detail GET works for both ids. This
    matches the one-at-a-time daily queue behavior, not missing card storage.
- Current test path:
  - Open Home AI production as Owner, switch Growth target to Eileen/XuLu.
  - The current visible card should be the English daily practice card; the
    mathematics card is already published and queued as the next daily card.
  - No computer science card or provision is active for XuLu.
  - No unattended scheduler was enabled in this task.

## 2026-06-19T12:25+0800 - XuLu English/Math Parallel Visibility Hotfix

- Issue:
  - Owner reported that XuLu/Eileen's workspace showed only the English card.
  - Production board readback showed both final cards were `published`, but the
    mathematics card was hidden as a future sequence card because both cards
    lacked explicit `sequenceGroupId` and therefore fell back to the same
    `program:program_xulu_english_math_daily` group.
- Production data repair:
  - Created SQLite backup before repair:
    `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-xulu-sequence-group-repair-20260619T122244Z.sqlite3`.
  - Updated final XuLu cards to subject-level sequence groups:
    - English `ltask_27c13fe5efd2ab7584`:
      `program_xulu_english_math_daily:subject:english`.
    - Mathematics `ltask_c66c84d5c6ab9e1b40`:
      `program_xulu_english_math_daily:subject:mathematics`.
  - SQLite `quick_check` passed before and after repair.
  - Home AI proxy board readback after repair returned
    `visibleCardCount=2`, `hiddenFutureCardCount=0`, and today lane containing
    both final card ids.
- Code prevention:
  - Commit `766d416` (`Group generated daily cards by subject`) makes generated
    daily cards persist subject-level `sequenceGroupId` by default through
    `card-authoring-publisher`.
  - Same-subject cards still use the existing current-card-then-next sequence
    behavior; different subjects in the same learning program can be visible in
    parallel.
  - Updated `tests/learning-card-generation-service.test.js` and
    `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Production deployment:
  - Deployed Growth commit `766d4160e878` through the central macOS plugin
    deployment contract.
  - Production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260619T122525Z-plugin-growth-manual`.
  - Restart label: `com.hermesmobile.plugin.growth`.
  - Manifest health passed after restart.
  - Auth profile audit remained non-blocking:
    `codexIssueCount=0`; existing non-Codex profile issues remain.
- Validation:
  - `node --check src/stores/growth-learning-sqlite/card-authoring-publisher.js`
    passed.
  - `node --test tests/learning-card-generation-service.test.js` passed `9/9`.
  - `node --test tests/growth-docs-locality.test.js` passed `2/2`.
  - `npm run --silent check` passed with `runtimeCount=237`.
  - `git diff --check` passed before commit.
  - Post-deploy Home AI same-origin proxy board GET returned HTTP 200 with
    `visibleCardCount=2`, `hiddenFutureCardCount=0`, and both final card ids in
    the today lane.
