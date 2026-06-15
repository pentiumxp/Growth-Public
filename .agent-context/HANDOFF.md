# HANDOFF

## Home AI Platform Contract Pointer

- Home AI platform contract version: `20260611-v3`.
- Local pointer: `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Canonical Home AI docs live under:
  `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.
- Do not record raw secrets, access keys, workspace keys, launch tokens, or
  private payloads in this handoff.

## 2026-06-15T10:45Z - Learner Cycle To Loop-State Smoke Chain

- Status: implemented and locally validated; commit/push follows this handoff
  update. No production deploy is required because only harness, docs, and
  workspace context changed.
- Scope:
  - expanded `tests/growth-learner-cycle-smoke-script.test.js` with a minimal
    summary-only science graph seed in the temporary SQLite fixture;
  - after the write-gated `smoke-growth-learner-cycle.js --operation full`
    path completes one card, the harness runs the no-write
    `smoke-growth-learning-loop-state.js` against the same temporary DB;
  - the chained smoke requires `growth.learningLoopState.v1`,
    `status=ready_to_draft`, `nextAction.action=draft_daily_plan`, complete
    cycle audit, empty missing-required list, a target-bound recommendation,
    and no raw learner/model content leakage.
- Docs updated:
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/PROJECT_CONTEXT.md`.
- Validation passed before commit:
  - `node --test tests/growth-learner-cycle-smoke-script.test.js`;
  - `node --test tests/growth-learner-cycle-smoke-script.test.js
    tests/growth-learning-loop-state-smoke-script.test.js
    tests/learning-loop-state-service.test.js
    tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run --silent check`;
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`245` files, `3,139` nodes,
    `12,152` edges, index up to date).

## 2026-06-15T10:30Z - Post-Cycle Learning Loop State Harness

- Status: implemented and locally validated; commit/push follows this handoff
  update. No production deploy is required because only harness, docs, and
  workspace context changed.
- Scope:
  - expanded `tests/learning-card-ai-loop-harness.test.js` to instantiate the
    same audit/context/daily-loop/learning-loop-state service chain used by the
    normal Growth service graph;
  - the Fanfan science vertical harness now proves a completed daily card can
    flow from planner draft, publish, learner evidence, Gateway evaluation,
    evidence ledger, Profile V2, profile-delta audit, and trajectory
    recommendation into `growth.learningLoopState.v1`;
  - the post-cycle state assertion requires `status=ready_to_draft`,
    `nextAction.action=draft_daily_plan`,
    `nextAction.reason=next_strategy:repair`, complete cycle audit,
    profile-delta/evaluation evidence counts, empty missing-required list, and
    no raw learner/model content leakage.
- Docs updated:
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/PROJECT_CONTEXT.md`.
- Validation passed:
  - `node --test tests/learning-card-ai-loop-harness.test.js`;
  - `node --test tests/learning-card-ai-loop-harness.test.js
    tests/learning-loop-state-service.test.js
    tests/growth-learning-loop-state-smoke-script.test.js
    tests/learning-daily-loop-service.test.js
    tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run --silent check`;
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`245` files, `3,135` nodes,
    `12,144` edges, index up to date);
  - `npm test -- --test-reporter=spec` (`534` tests).

## 2026-06-15T10:20Z - Audit Completeness Privacy Projection Refined

- Status: implemented, locally validated, pushed to both remotes, deployed to
  Mac production, and production-smoked with a no-write learner-cycle audit.
- Commit pushed to both `origin/main` and `public/main`:
  `70edd1b` `Refine Growth audit privacy projection`.
- Scope:
  - updated `src/services/learning-audit-completeness-service.js` so
    `privacy_projection` scans public cycle-audit DTO keys for raw/private
    fields instead of scanning arbitrary text values;
  - raw/private keys such as raw prompt, raw model output, transcript, answer
    key, private path, provider config, credentials, cookies, tokens, and
    passwords still block completeness;
  - safe public text values that mention words such as token, transcript,
    secret, prompt, or cookie no longer create a privacy false positive.
- Harness:
  - expanded `tests/learning-audit-completeness-service.test.js` with
    safe-public-text and raw/private-key regression coverage.
- Validation passed:
  - `node --check src/services/learning-audit-completeness-service.js`;
  - `node --test tests/learning-audit-completeness-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/growth-learner-cycle-smoke-script.test.js
    tests/growth-architecture-boundary.test.js`.
  - `node --test tests/learning-audit-completeness-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-automation-proposal-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-learner-cycle-smoke-script.test.js
    tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`534` tests);
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`245` files, `3,135` nodes,
    `12,129` edges).
- Docs updated:
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `.agent-context/PROJECT_CONTEXT.md`.
- Home AI AI Ops required deployment checks passed:
  - `node --check scripts/deploy-macos-production.js`;
  - `node tests/macos-production-deploy-script.test.js`;
  - `node tests/production-status-smoke-harness.test.js`;
  - `node --check` for the changed Growth service and test;
  - `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI `git diff --check`.
- Production deploy:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --source /Users/hermes-dev/HermesMobileDev/plugins/growth --execute --password-file <private-local-password-file> --json`;
  - source commit: `70edd1b33570`;
  - production path:
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260615T095326Z-plugin-growth-manual`;
  - restarted launchd label:
    `com.hermesmobile.plugin.growth`;
  - deploy validation passed: shared auth permission repair, launchd running,
    manifest health, and production profile audit with `codexIssueCount=0`.
- Production no-write learner-cycle smoke:
  - target:
    `workspaceId=weixin_fanfan`, `learnerId=fanfan`,
    `taskCardId=ltask_0e08f9a1b630b0ffe9`,
    `planDraftId=lgplan_aa609b3996102fb5b9`,
    `targetNodeId=kg_lower_secondary_science`;
  - result: `ok=true`, `operation=audit`,
    `schemaVersion=growth.learningLearnerCycleSmoke.v1`,
    `privacyClass=summary_only`, card `status=published`,
    `laneId=today`, `primaryAction=submit`, `planDraftCount=1`,
    `hasPublishedPlan=true`, `evidenceCount=0`, `profileDeltaCount=0`,
    `privacy_projection=true`, `complete=false`,
    `readyForAutomation=false`;
  - missing required findings are now only `evaluation_evidence` and
    `profile_delta_audit`, which are real gaps until a real learner
    submission/evaluation/profile-delta cycle exists. No production learner
    write was performed.
- AI Ops evidence appended:
  - `evidence-b1ddbf03-bd07-489a-b005-832f9e41d472`;
  - `evidence-35a6cfbf-69c0-4fd6-b9ff-96b92cdb062c`.

## 2026-06-15T10:03Z - Learner Cycle Smoke Deployed

- Status: implemented, locally validated, pushed to both remotes, deployed to
  Mac production, and production-smoked with a no-write audit.
- Commit pushed to both `origin/main` and `public/main`:
  `3ed5517` `Add Growth learner cycle smoke`.
- Production deploy:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --source /Users/hermes-dev/HermesMobileDev/plugins/growth --execute --password-file <private-local-password-file> --json`;
  - source commit: `3ed55177e051`;
  - production path:
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260615T094156Z-plugin-growth-manual`;
  - restarted launchd label:
    `com.hermesmobile.plugin.growth`;
  - deploy validation passed: shared auth permission repair, launchd running,
    manifest health URL, and production profile audit with `codexIssueCount=0`.
- Scope:
  - added `src/services/learning-learner-cycle-service.js`, a service-owned
    learner daily-card cycle facade with `audit`, `submit`, `evaluate`,
    `reflect`, and `full` operations;
  - wired `learningLearnerCycleService` into `src/app/services.js`;
  - added `scripts/smoke-growth-learner-cycle.js` and
    `npm run smoke:learner-cycle`;
  - added `tests/growth-learner-cycle-smoke-script.test.js`;
  - expanded `tests/growth-architecture-boundary.test.js` and
    `package.json` syntax coverage.
- Boundary:
  - the smoke defaults to no-write `audit`;
  - `submit`, `evaluate`, `reflect`, and `full` require explicit
    `--allow-write`;
  - the CLI delegates only through `learning-learner-cycle-service`, which in
    turn delegates to `growthService.submitEvidence`,
    `growthEvaluationService.processEvaluationQueue`,
    `growthService.submitReflection`, `learning-cycle-audit-service`, and
    `learning-audit-completeness-service`;
  - it does not import repositories, call Gateway directly, publish plans,
    generate cards, run schedulers, deliver notifications, or activate stage
    assessments;
  - output is summary-only `growth.learningLearnerCycleSmoke.v1` and must not
    echo learner answer text, reflection text, transcripts, raw prompts, answer
    keys, raw model output, credentials, or provider config.
- Harness behavior:
  - the new sub-process harness prepares a temporary daily-card SQLite
    fixture, runs `full` through the smoke CLI, verifies one submission, one
    evaluation, one reflection, one completed evaluation job, evidence ledger,
    profile-delta audit, mastery-state update, completed card status, and no
    learner text leakage in CLI output;
  - it also covers no-write default audit, explicit write gate, invalid JSON,
    missing workspace, and privacy-risk input rejection.
- Validation passed:
  - `node --check src/services/learning-learner-cycle-service.js &&
    node --check scripts/smoke-growth-learner-cycle.js`;
  - `node --test tests/growth-learner-cycle-smoke-script.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run --silent check` (`runtimeCount=145`, `checkedCount=145`);
  - `npm test -- --test-reporter=spec` (`532` tests);
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`245` files, `3,132` nodes,
    `12,118` edges; index up to date, with an informational older-engine
    rebuild notice).
- Docs updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`.
- Production note: do not run `submit`, `reflect`, or `full` against the
  existing Fanfan production science card unless Owner explicitly supplies a
  real learner submission/reflection. Use default no-write `audit` for
  production smoke.
- Production no-write smoke:
  - command ran as `hermes-host` from the deployed plugin source with
    `GROWTH_DATA_OWNER=plugin` and the production Growth SQLite path;
  - target:
    `workspaceId=weixin_fanfan`, `learnerId=fanfan`,
    `taskCardId=ltask_0e08f9a1b630b0ffe9`,
    `planDraftId=lgplan_aa609b3996102fb5b9`,
    `targetNodeId=kg_lower_secondary_science`;
  - result: `ok=true`, `operation=audit`,
    `schemaVersion=growth.learningLearnerCycleSmoke.v1`,
    `privacyClass=summary_only`, card `status=published`,
    `laneId=today`, `primaryAction=submit`, `planDraftCount=1`,
    `hasPublishedPlan=true`, `evidenceCount=0`, `profileDeltaCount=0`,
    `complete=false`, `readyForAutomation=false`;
  - missing required findings are currently `evaluation_evidence`,
    `profile_delta_audit`, and `privacy_projection`, which is expected until a
    real learner submission/evaluation/profile-delta cycle exists. No
    production learner write was performed.
- AI Ops evidence appended:
  `evidence-2b5965f5-eb89-4852-8095-6e196646dddc`.

## 2026-06-15T09:18Z - Fanfan Science Target Provisioned And Daily Card Published

- Status: deployed to Mac production, smoke validated, and one Fanfan science
  daily card generated through the Growth-owned Gateway/daily-loop path. This
  remains an Owner-supervised manual loop; writeful scheduling is still
  disabled.
- Commits pushed to both `origin/main` and `public/main`:
  - `08fdfb5` `Add Growth target provisioning smoke`;
  - `23e9e10` `Enforce Growth daily card duration bounds`.
- Production deploys:
  - `08fdfb590721` deployed to
    `/Users/hermes-host/HermesMobile/plugins/growth`, backup
    `/Users/hermes-host/HermesMobile/backups/deploy/20260615T090602Z-plugin-growth-manual`;
  - `23e9e10c1ec3` deployed to
    `/Users/hermes-host/HermesMobile/plugins/growth`, backup
    `/Users/hermes-host/HermesMobile/backups/deploy/20260615T091433Z-plugin-growth-manual`;
  - both deploys used the central Home AI Mac deploy script with plugin
    `data/` and `runtime/` excluded, restarted
    `com.hermesmobile.plugin.growth`, passed manifest health, and had
    `codexIssueCount=0` in the production profile audit.
- Production writes and bounded ids:
  - target provision:
    `lgprov_19071e825cc7130393` for
    `workspaceId=weixin_fanfan`, `learnerId=fanfan`,
    `domainPackId=domain_pack_fanfan_cambridge_pathway_v1`,
    `domain=science`, `subject=science`, `status=active`;
  - controlled daily-loop draft:
    `planDraftId=lgplan_aa609b3996102fb5b9`,
    `itemId=daily_science_stabilize_kg_lower_secondary_science_001`;
  - controlled daily-loop publish generated
    `taskCardId=ltask_0e08f9a1b630b0ffe9` and
    `learningGraphPlanId=lgp_1d019cf16ca5e5bf1d`, bound to
    `targetNodeId=kg_lower_secondary_science`;
  - no raw card body, learner answer, prompt, raw model output, answer key, or
    source-document body was recorded in handoff/docs.
- Production data repair:
  - the first generated science card exposed a publisher bug: model
    `expectedTimeMinutes=12` was persisted as expected range `12-17`;
  - code now validates ordinary generated daily cards at 10-15 minutes and
    persists `expected_duration_minutes_min=10` /
    `expected_duration_minutes_max=15`; stage assessment cards validate and
    persist 25-30 minutes;
  - bounded one-row production repair updated only
    `ltask_0e08f9a1b630b0ffe9` from `12-17` to `10-15`, preserving
    `planned_minutes=12`;
  - repair backup:
    `/Users/hermes-host/HermesMobile/backups/data-repair/growth-duration-20260615T091535Z.sqlite3`;
  - `PRAGMA quick_check` returned `ok` before and after, and the repair update
    changed exactly one row.
- Validation passed:
  - Growth focused:
    `node --test tests/learning-target-provisioning-service.test.js
    tests/growth-target-provisioning-smoke-script.test.js
    tests/growth-daily-loop-smoke-script.test.js
    tests/learning-card-generation-context-service.test.js
    tests/growth-routes.test.js` (`60` tests);
  - Growth duration focused:
    `node --test tests/learning-card-authoring-service.test.js
    tests/learning-card-generation-service.test.js
    tests/growth-daily-loop-smoke-script.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-architecture-boundary.test.js` (`61` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=143`, `checkedCount=143`);
  - `npm test -- --test-reporter=spec` (`526` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`242` files, `3,065` nodes,
    `11,871` edges; index up to date);
  - Home AI H1 checks:
    `node tests/hermes-plugin-service.test.js`,
    `node tests/hermes-plugin-authorization-service.test.js`,
    `node tests/plugin-capability-activation-service.test.js`,
    `node tests/plugin-workspace-platform-contract-check.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `npm run --silent deploy:macos -- --target home-ai --json`, and
    Home AI `git diff --check`.
- Production smoke passed:
  - `npm run smoke:target-provisioning` readback returned
    `mode=explicit_provision`, selected `science`, and selected
    `kg_lower_secondary_science`;
  - `npm run smoke:daily-loop` draft and publish both ran as the production
    service user with Gateway Responses protocol and explicit `--allow-write`;
  - SQLite readback showed the card row as
    `workspace_id=weixin_fanfan`, `learner_id=fanfan`, `domain=science`,
    `task_card_type=practice`, `status=published`, `card_role=practice`,
    `planned_minutes=12`, expected duration `10-15`, and graph binding to
    `kg_lower_secondary_science`;
  - `GET /api/v1/growth/status?workspace_id=weixin_fanfan` returned
    `ok=true`, `quick_check=ok`, `foreign_key_issues=0`,
    `learning_plan_drafts=1`, and `learning_task_cards=1`;
  - `npm run smoke:learning-loop-state` returned `ok=true`,
    `status=audit_incomplete`, target provisioned, one published plan, and
    `nextAction=complete_cycle_audit` because the card has not yet been
    submitted/evaluated/profile-delta audited;
  - `npm run smoke:release-readiness` with Owner UI, Owner audit UI, central
    visual, production planner, daily-loop preview, learning-loop state, and
    production daily-loop write evidence returned `ok=true`,
    `readyForOwnerLoop=true`, `readyForReleaseReview=false`, and
    `writefulSchedulingAllowed=false`.
- AI Ops evidence appended:
  `evidence-436a13f0-d15e-419d-b57e-74613885f517`.
- Boundary notes:
  - the browser still does not call Gateway, compute learning policy, mutate
    Profile V2, or publish automatically;
  - `smoke:target-provisioning` and `smoke:daily-loop` delegate only through
    Growth services and require explicit write flags for writes;
  - release-readiness remains advisory and no-write by default;
  - full automation release review remains incomplete because proposal,
    digest, action handoff, scheduler execution/run/worker-target UI, platform
    Action Inbox/Web Push, active failure policy, and explicit writeful
    approvals are not complete.

## 2026-06-15T08:49Z - Growth Owner Target Provision Controls Deployed

- Status: deployed to Mac production and smoke validated. This is an Owner-loop
  UI/control deployment, not full unattended automation release.
- Commits pushed to both `origin/main` and `public/main`:
  - `716f1d7` `Wire Owner target provision controls`;
  - `ffabbbf` `Record Growth central visual evidence`.
- Production deploy:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --source /Users/hermes-dev/HermesMobileDev/plugins/growth --execute --password-file <private-local-password-file> --json`;
  - source commit: `ffabbbf4ef55`;
  - production path:
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260615T084612Z-plugin-growth-manual`;
  - restarted launchd label:
    `com.hermesmobile.plugin.growth`;
  - deploy validation passed: launchd state `running`, manifest health
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`, and production
    profile audit had `codexIssueCount=0`.
- Production smoke passed:
  - deployed static files include
    `20260615-target-provision-controls-ui-v1`,
    `data-card-generation-target-provisioning`,
    `targetProvisioning`, and `provisionGrowthDomainPack`;
  - direct manifest returned plugin id `growth` and embedded-app metadata;
  - `GET /api/v1/growth/status?workspace_id=weixin_fanfan` returned
    `quick_check=ok`, `foreign_key_issues=0`, and Fanfan production SQLite
    counts currently show no task cards yet;
  - `GET /api/v1/growth/status?workspace_id=weixin_stephen` returned
    `quick_check=ok`, `foreign_key_issues=0`, and Stephen production SQLite
    counts include `learning_task_cards=50`;
  - central Home AI `embedded-plugin-shell` visual harness passed for
    `pluginId=growth` with screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260615T084336Z.png`;
  - production no-write `smoke:planner-readiness` ran as `hermes-host` using
    production Gateway token-path permissions, reached Gateway with
    `gatewayMode=json`, and returned one validated daily science plan item for
    `domain_pack_fanfan_cambridge_pathway_v1`;
  - production no-write `smoke:daily-loop-preview` and
    `smoke:learning-loop-state` passed for Fanfan science and correctly report
    `nextAction=provision_learning_target` until Owner explicitly provisions
    that domain pack/subject;
  - `smoke:release-readiness` with Owner daily UI, Owner audit UI, central
    visual, production planner, daily-loop preview, and learning-loop state
    evidence returned `ok=true`, `readyForOwnerLoop=true`,
    `readyForReleaseReview=false`, and `writefulSchedulingAllowed=false`.
- Boundary notes:
  - no production business write was performed by the smoke commands;
  - a direct dev-user planner smoke failed before this with `EACCES` on the
    production Gateway token path, which is expected because production token
    files are readable by the production service user, not the dev user;
  - the correct production domain pack id exposed by `graphOptions` is
    `domain_pack_fanfan_cambridge_pathway_v1`, not the older staging shorthand
    `uk_hk_curriculum_foundation`.
- AI Ops evidence appended:
  `evidence-a637b1bf-3397-4edb-bad2-546d40795f53`.
- Remaining product work:
  - Owner must still explicitly provision Fanfan science in the UI before
    daily-loop draft/publish can generate a science card;
  - richer older-cycle selection/history controls over the implemented
    current-card cycle drilldown;
  - formal stage-checkpoint UI;
  - proposal/digest/action/execution/run/worker-target UI and platform
    Action Inbox/Web Push evidence;
  - full automation release review remains incomplete and writeful scheduling
    remains disabled.

## 2026-06-15T08:44Z - Growth Owner Target Provision Controls Central Visual Evidence

- Status: implemented, documented, locally validated, and centrally visual
  validated for embedded-plugin shell. Not deployed in this slice.
- Change classification: Home AI AI Ops intake returned H1 under Plugin
  Platform, Topics, Provisioning, And MCP because the Owner browser surface now
  creates or updates visible-target domain-pack provisions.
- Scope:
  - `public/growth-api-client.js` now forwards selected
    `domainPackId`/`domain`/`subject`/horizon/minutes into generation-context
    reads and exposes `provisionGrowthDomainPack` over the existing Owner-only
    `POST /api/v1/growth/domain-pack-provisions` facade;
  - `public/growth-card-generation-ui.js` now renders
    `targetProvisioning`, domain-pack and subject selectors, apply/provision
    controls, selected-scope structured preview data, and target rows that let
    Owner inspect non-sample learners before provisioning;
  - `public/app.js` owns the provision draft state, applies selected graph
    options to context refresh, calls the provision facade, clears stale
    draft/publish/cycle state after provisioning, and refreshes learning-loop
    state;
  - `public/growth-homeai-legacy.css` covers the provision panel, selector grid,
    44px actions, mobile single-column layout, and dark/system contrast;
  - `public/index.html` static version bumped to
    `20260615-target-provision-controls-ui-v1`;
  - docs updated in Growth workspace:
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`,
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - this slice did not change backend route/service behavior; it uses the
    existing `learning-target-provisioning-service`, repository, and
    `domain-pack-provisions` route;
  - browser code still does not call Gateway directly, import Home AI old
    Growth server logic, read repositories/SQLite tables, compute learning
    policy, mutate Profile V2 locally, evaluate submissions, schedule, notify,
    activate stage assessments, publish automatically, or bypass visible-target
    checks;
  - provision payloads are summary-only scope metadata: workspace id, learner
    id, domain-pack id, domain, subject, status, and source. Raw answers,
    transcripts, prompts, raw model output, answer keys, source-document
    bodies, private paths, credentials, and provider config remain excluded.
- Validation passed:
  - syntax checks for touched public JS;
  - focused
    `node --test tests/growth-frontend-adapter.test.js
    tests/growth-embedded-layout.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`103` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`240` files, `3,030` nodes,
    `11,788` edges; index up to date);
  - Home AI app required H1 gate:
    `node tests/hermes-plugin-service.test.js`,
    `node tests/hermes-plugin-authorization-service.test.js`,
    `node tests/plugin-capability-activation-service.test.js`, and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI app `git diff --check`.
  - central Home AI visual harness:
    `npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/ --theme dark --timeout-ms 70000 --json`.
- Visual evidence:
  - local browser-mode Playwright mobile checks used the Home AI workspace
    Playwright dependency and system Chrome against `http://127.0.0.1:4882/`
    with Owner headers injected;
  - screenshots:
    `tmp/visual/growth-owner-target-provision-controls-mobile-dark.png`,
    `tmp/visual/growth-owner-target-provision-after-submit-mobile-dark.png`,
    and
    `tmp/visual/growth-owner-target-provision-controls-forced-dark-mobile.png`;
  - verified `data-card-generation-target-provisioning` visible, provision
    button visible and 44px tall, active settings panel scrollHeight `5525` vs
    clientHeight `725`, forced dark panel background
    `rgba(22, 26, 29, 0.98)`, text color `rgb(245, 247, 246)`, and primary
    button background `rgb(47, 119, 129)`.
  - central iOS/PWA `embedded-plugin-shell` passed for `pluginId=growth`:
    client version `20260614-plugin-audit-v770`, viewport `402x714`, plugin
    shell/frame `402x628`, no horizontal overflow, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260615T084336Z.png`
    with `320312` bytes. The run used measurement fallback after a WebDriver
    `Unexpected EOF`, but the bounded harness returned `ok=true` and all
    scenario assertions passed.
- AI Ops evidence appended:
  `evidence-ebbc4dee-7e2e-44b4-89ec-8c634b3a07d6` and
  `evidence-d9bb8c50-95ef-4863-85ab-f7fe17ac4e93`.
- Remaining product work:
  - richer older-cycle selection/history controls over the implemented
    current-card cycle drilldown;
  - production release evidence and production smoke before deployment;
  - production planner/daily-loop release smoke on the actual target;
  - proposal/digest/action/execution UI after the current Owner daily-loop and
    target-provisioning controls are product-complete.

## 2026-06-15T08:17Z - Growth Owner Cycle Audit Drilldown UI Slice

- Status: implemented, documented, and locally validated. Not deployed in this
  slice.
- Change classification: Home AI AI Ops intake returned H3 Architecture
  Documentation And Harness Map; Growth treated the actual browser projection
  as H2 because it changes Owner-visible audit/completeness status.
- Scope:
  - `public/growth-api-client.js` now exposes `fetchGrowthCycleAudit` and
    `fetchGrowthCycleCompleteness` over the existing read-only
    `GET /api/v1/growth/learning-cycles/audit` and
    `GET /api/v1/growth/learning-cycles/completeness` facades, preserving
    direct `workspaceId` vs Home AI proxy `targetWorkspaceId` handling;
  - `public/growth-card-generation-ui.js` now derives a bounded
    `createCycleAuditQueryPayload` from card-generation context, latest
    draft/publish result, generated card id, and `ownerAudit`, renders
    `data-card-generation-cycle-drilldown`, timeline rows, completeness
    findings, missing-required count, and a manual `读取单卡审计` action;
  - `public/app.js` owns `cycleDrilldown` UI state, binds
    `data-card-generation-cycle-audit-refresh`, calls both read facades, shows
    visible loading/error/ready state, clears stale drilldown state when a new
    draft/publish/stage activation starts, and attempts a silent drilldown
    refresh after daily or stage publication;
  - `public/growth-homeai-legacy.css` covers the cycle drilldown, timeline,
    findings, mobile single-column layout, 44px action button, and dark/system
    contrast;
  - `public/index.html` static version bumped to
    `20260615-cycle-audit-drilldown-ui-v1`;
  - docs updated in Growth workspace:
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - this slice did not change backend service policy or route behavior;
  - browser code still does not call Gateway directly, import Home AI old
    Growth server logic, read repositories/SQLite tables, compute learning
    policy, compute Profile V2 diffs, join audit data itself, evaluate
    submissions, schedule, notify, activate stage assessments, or publish
    automatically;
  - cycle query payloads are bounded ids only. Raw answers, transcripts,
    prompts, raw model output, answer keys, source-document bodies, private
    paths, credentials, and provider config remain excluded.
- Validation passed:
  - syntax checks for touched public JS;
  - focused
    `node --test tests/growth-frontend-adapter.test.js
    tests/growth-embedded-layout.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`109` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`240` files, `3,018` nodes,
    `11,689` edges; index up to date);
  - Home AI app required H3 gate:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app `git diff --check`.
- Visual evidence:
  - local browser-mode Playwright mobile dark check used the Home AI workspace
    Playwright dependency and system Chrome against `http://127.0.0.1:4882/`
    with Owner headers injected;
  - screenshots:
    `tmp/visual/growth-owner-cycle-drilldown-mobile-dark.png` and
    `tmp/visual/growth-owner-cycle-drilldown-fanfan-mobile-dark.png`;
  - verified `data-card-generation-cycle-drilldown` visible, manual audit
    button visible with 44px height, active settings panel scrollHeight `4907`
    vs clientHeight `725`, dark panel background `rgba(22, 26, 29, 0.98)`,
    text color `rgb(245, 247, 246)`, and primary button color contrast. Local
    dev data had no current published cycle anchor, so the audit button was
    correctly disabled while layout reachability was verified.
- AI Ops evidence appended:
  `evidence-643d18c0-342f-4ae4-b19a-260538efaf7b`.
- Remaining product work:
  - product-grade learner/domain-pack/subject provision controls in Owner UI;
  - richer older-cycle selection/history controls over the implemented
    current-card cycle drilldown;
  - central Home AI embedded-plugin visual harness and production release
    evidence before deployment;
  - proposal/digest/action/execution UI after Owner audit and target
    provisioning controls are product-complete.

## 2026-06-15T07:52Z - Growth Owner Audit/Correction UI Slice

- Status: implemented, documented, and locally validated. Not deployed in this
  slice.
- Change classification: Home AI AI Ops intake returned H3 Architecture
  Documentation And Harness Map, but Growth treated this as higher-risk UI glue
  because Owner correction writes create durable learning evidence.
- Scope:
  - `public/growth-api-client.js` now exposes
    `submitGrowthProfileCorrection` over
    `POST /api/v1/growth/profile-corrections`;
  - `public/growth-card-generation-ui.js` now renders a context-level
    `ownerAudit` panel in the Owner `生成` tab, including plan audit counts,
    persisted profile-delta summaries, correction history, and a bounded Owner
    correction form;
  - `public/app.js` wires correction note/action state, submits through the
    Growth API client, shows visible submit/failure/success state, and refreshes
    card-generation context plus `growth.learningLoopState.v1` after success;
  - `public/growth-homeai-legacy.css` covers the audit/correction panel,
    textarea/select controls, mobile reachability, and dark/system contrast;
  - `public/index.html` static version bumped to
    `20260615-owner-audit-correction-ui-v1`;
  - docs updated in Growth workspace:
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - browser code still does not call Gateway directly, import old Home AI
    Growth server logic, inspect SQLite repositories, compute learning policy,
    compute Profile V2 diffs, mutate Profile V2 optimistically, evaluate
    submissions, schedule, notify, activate stage assessments, or auto-publish;
  - correction payloads are bounded summary-only review action/reason plus
    graph/evaluation ids from service DTOs. Raw answers, transcripts, prompts,
    raw model output, answer keys, source-document bodies, private paths,
    credentials, and provider config remain excluded.
- Validation passed:
  - syntax checks for touched public JS;
  - focused
    `node --test tests/growth-frontend-adapter.test.js
    tests/growth-embedded-layout.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`119` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`240` files, `3,002` nodes,
    `11,600` edges; index up to date);
  - Home AI app required H3 gate:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app `git diff --check`.
- Visual evidence:
  - local Playwright mobile dark check used the Home AI workspace Playwright
    dependency and system Chrome against `http://127.0.0.1:4882/` with Owner
    headers injected;
  - screenshots:
    `tmp/visual/growth-owner-audit-correction-mobile-dark.png` (`47625`
    bytes) and
    `tmp/visual/growth-owner-audit-correction-submit-mobile-dark.png`
    (`60534` bytes);
  - verified active settings tab panel scrollHeight `4351` vs clientHeight
    `725`, `ownerAudit` visible, correction textarea visible, and `保存纠偏`
    button reachable in dark mode. Local dev data had only `weixin_stephen`
    visible and not target-enabled, so the submit button was correctly disabled
    while layout reachability was still verified.
- AI Ops evidence appended:
  `evidence-0bb12893-8069-4c18-9e42-7524ff577699`.
- Remaining product work:
  - product-grade learner/domain-pack/subject provision controls in Owner UI;
  - explicit single-cycle drilldown over `GET /api/v1/growth/learning-cycles/audit`
    and `GET /api/v1/growth/learning-cycles/completeness`;
  - central Home AI embedded-plugin visual harness and production release
    evidence before deployment.

## 2026-06-15T07:36Z - Growth Owner Daily-Loop Draft/Publish UI Slice

- Status: implemented, documented, and locally validated. Not deployed in this
  slice.
- Change classification: Home AI AI Ops intake returned H3 Architecture
  Documentation And Harness Map, but Growth treated the browser action path as
  higher risk because Owner clicks can draft/publish learning cards.
- Scope:
  - `public/growth-api-client.js` now exposes `draftGrowthDailyLoop` and
    `publishGrowthDailyLoop` over the existing Owner-only daily-loop facade;
  - `public/app.js` changed Owner `生成` from legacy direct
    `cards/generate` submission to two explicit actions:
    `draftDailyLoopFromUi` and `publishDailyLoopFromUi`;
  - `public/growth-card-generation-ui.js` renders separate `规划下一张` and
    `发布为卡片` buttons, bounded plan draft preview, publish-attempt state,
    five-step progress, and blocked/error feedback;
  - `public/growth-homeai-legacy.css` covers the new plan preview, mobile
    scroll, five-step progress layout, and dark/system contrast;
  - `public/index.html` static version bumped to
    `20260615-daily-loop-draft-publish-ui-v1`;
  - docs updated in Growth workspace:
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`,
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_DOCS_INDEX.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - browser code still does not call Gateway directly, import old Home AI
    Growth server logic, compute Profile V2 or learning policy locally,
    evaluate submissions, schedule, notify, activate stage assessments, or
    auto-publish;
  - legacy `generateGrowthCard` remains in the API client only as a
    compatibility helper for the existing direct generation route.
- Validation passed:
  - syntax checks for touched public/test files;
  - focused
    `node --test tests/growth-frontend-adapter.test.js
    tests/growth-embedded-layout.test.js tests/learning-daily-loop-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`108` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`240` files, `2,988` nodes,
    `11,517` edges; index up to date);
  - Home AI app required H3 gate:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app `git diff --check`;
  - local Playwright visual check using system Chrome because the Playwright
    package browser cache was missing. Mobile dark evidence:
    `tmp/visual/growth-owner-daily-loop-draft-publish-mobile-dark.png`
    (`157811` bytes) and
    `tmp/visual/growth-owner-daily-loop-publishing-progress-mobile-dark.png`
    (`130117` bytes). Verified `.growth-shell` scrollHeight `3829` vs
    clientHeight `844`, visible `发布为卡片` button, and visible progress panel.
- AI Ops evidence appended:
  `evidence-2b9892d3-a6e9-4dfb-93d1-2f145c1a1142`.
- Remaining product work:
  - richer scope/domain-pack/subject selection and explicit provisioning
    controls in the Owner UI;
  - Owner audit/correction drilldown after completion;
  - central Home AI embedded-plugin visual harness and production release
    evidence before deployment.

## 2026-06-15T07:18Z - Growth Owner Generation Learning-Loop State UI Slice

- Status: implemented, documented, and locally validated. This slice connects
  the existing Owner-only `GET /api/v1/growth/learning-loop/state` backend
  readback to the embedded Owner `生成` tab as a compact read-only
  status/next-action panel.
- Change classification: Home AI AI Ops intake classified the task as H3
  Architecture Documentation And Harness Map. Because the actual change touches
  embedded UI code, Growth also ran focused frontend/layout/route/architecture
  harnesses. No production deploy was executed.
- Scope:
  - `public/growth-api-client.js` now exposes `fetchLearningLoopState` and uses
    direct `workspaceId` vs Home AI proxy `targetWorkspaceId` consistently with
    card-generation context;
  - `public/app.js` loads learning-loop state after card-generation context,
    keeps failures visible in the generation state panel, and refreshes the
    state after daily or stage card publication without clearing the generated
    preview;
  - `public/growth-card-generation-ui.js` renders
    `data-learning-loop-state-panel` with status, next action, weakness count,
    audit-gap count, and stage-checkpoint state;
  - `public/growth-homeai-legacy.css` adds mobile-safe and dark/system theme
    styling for the compact panel;
  - `public/index.html` static query version bumped to
    `20260615-learning-loop-state-ui-v1`;
  - `src/routes/growth-routes.js` now parses daily-loop/learning-loop
    `targetNodeIds` query values as bounded CSV arrays before delegating to the
    service boundary;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`, and
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`.
- Boundary:
  - this is read-only UI glue over existing Growth service routes;
  - the browser does not compute learning policy, call Gateway, draft/publish
    plans, generate cards outside the existing generation route, evaluate,
    schedule, deliver notifications, activate stage assessments, or mutate
    learner state from the state panel.
- Validation passed:
  - syntax checks for touched public JS, route, and tests;
  - focused
    `node --test tests/growth-frontend-adapter.test.js
    tests/growth-embedded-layout.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`
    (`101` tests).
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - `codegraph sync && codegraph status` (`240` files, `2,976` nodes,
    `11,509` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI app required H3 gate:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app `git diff --check`;
  - local Playwright mobile dark Owner generation visual check using the Home
    AI workspace Playwright dependency against `http://127.0.0.1:4882/` with
    Owner headers injected. Evidence screenshots:
    `tmp/visual/growth-owner-generation-loop-state-mobile-dark-panel.png`
    (`141254` bytes) and
    `tmp/visual/growth-owner-generation-loop-state-mobile-dark-button.png`
    (`160037` bytes). The Browser plugin `iab` instance was unavailable in
    this Codex session, so Browser-specific evidence was not claimed.
- AI Ops evidence appended:
  `evidence-c49fc35c-cf7a-45a1-aa73-080289332a62`.
- Remaining product work:
  - full planner draft/publish UI and provision controls are still pending;
  - central Home AI embedded-plugin visual harness is still required before
    production UI deployment.

## 2026-06-15T06:38Z - Growth Learning Loop State Slice

- Status: implemented, documented, and locally validated. This slice adds a
  compact summary-only Owner learning-loop state readback so the embedded
  daily workbench can read one status and one next action before using the
  existing daily-loop draft/publish execution boundary.
- Change classification: AI Ops intake classified the task as H3 Architecture
  Documentation And Harness Map. Because the slice also touches service,
  route, smoke, and docs, the Growth focused/broad gates and Home AI required
  contract gates were run. No production deploy was executed.
- Scope:
  - new service:
    `src/services/learning-loop-state-service.js`;
  - new Owner-only route:
    `GET /api/v1/growth/learning-loop/state`;
  - new no-write CLI:
    `npm run smoke:learning-loop-state`;
  - new script:
    `scripts/smoke-growth-learning-loop-state.js`;
  - new harnesses:
    `tests/learning-loop-state-service.test.js` and
    `tests/growth-learning-loop-state-smoke-script.test.js`;
  - route and architecture harness coverage added in
    `tests/growth-routes.test.js` and
    `tests/growth-architecture-boundary.test.js`;
  - `package.json` `check` now syntax-checks the new service and smoke
    script;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`,
    `docs/GROWTH_LEARNING_OPERATING_LOOP.md`,
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`, and
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`.
- Boundary:
  - output schema is `growth.learningLoopState.v1`;
  - output is `privacyClass=summary_only` and `summaryOnly=true`;
  - the service composes `learning-daily-loop-service.preview` and read-only
    `learning-stage-assessment-service.stageReadiness`;
  - next-action output can point Owner to target provisioning, graph/context
    repair, planner config, audit completion, stage-checkpoint review, daily
    draft, daily publish, or manual review;
  - the service and smoke CLI do not import repositories, call Gateway, call
    model vendors, publish plans, generate cards, evaluate submissions, run
    schedulers, deliver notifications or handoffs, activate stage assessments,
    or mutate learner state.
- Validation passed:
  - syntax checks for the new service, script, tests, app services, routes,
    and architecture test;
  - focused
    `node --test tests/learning-loop-state-service.test.js
    tests/growth-learning-loop-state-smoke-script.test.js
    tests/learning-daily-loop-service.test.js
    tests/learning-stage-assessment-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`88` tests);
  - operational smoke:
    `npm run --silent smoke:learning-loop-state -- --workspace-id
    weixin_fanfan --learner-id fanfan --domain science --subject science
    --json` over a temporary empty SQLite DB;
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - `codegraph sync && codegraph status` (`240` files, `2,967` nodes,
    `11,483` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI app required gate:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI platform pointer checks:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI app `git diff --check`.
- AI Ops evidence appended:
  `evidence-4bcb9170-a7a9-4517-872c-71a5587a3402`.
- Remaining work:
  - embed the new `GET /api/v1/growth/learning-loop/state` projection in the
    Owner `生成` tab as the top-level compact state/next-action surface;
  - run central embedded-plugin visual harness before any production UI deploy;
  - production learning-loop state smoke was promoted into release-readiness
    evidence in the 2026-06-15T06:51Z slice below.

## 2026-06-15T06:51Z - Growth Learning Loop State Release Evidence Gate

- Status: implemented, documented, validated, and ready to commit. This slice
  promotes the no-write learning-loop state smoke into the release-readiness
  evidence contract and into the summary-only release evidence bundle builder.
- Change classification: H1 by Home AI AI Ops because this changes
  release-readiness and production deployment review evidence. No production
  deploy was executed; the Mac deploy command was run in default plan-only
  mode.
- Scope:
  - `learning-automation-release-readiness-service` now requires
    `productionLearningLoopStateSmokeEvidence` and emits the
    `production_learning_loop_state_smoke_evidence` check;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-learning-loop-state-smoke-evidence`;
  - `learning-automation-release-evidence-bundle-service` now includes the
    `learning_loop_state` default task, backed by
    `scripts/smoke-growth-learning-loop-state.js`;
  - release-readiness, release-evidence-bundle, smoke-script, and architecture
    harnesses assert the new evidence key, CLI flag, task id, and no-write
    script binding;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`, and
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`.
- Boundary:
  - the release-readiness service remains advisory and no-write;
  - the release evidence bundle remains summary-only
    `growth.learningAutomationReleaseEvidenceBundle.v1`;
  - neither boundary calls Gateway, daily-loop draft/publish, card generation,
    evaluation, scheduler execution, notification delivery, stage activation,
    learner-state mutation, or production deployment.
- Validation passed:
  - syntax checks for the modified services, scripts, and tests;
  - focused
    `node --test tests/learning-automation-release-readiness-service.test.js
    tests/learning-automation-release-evidence-bundle-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/growth-release-evidence-bundle-script.test.js
    tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`50` tests);
  - operational bundle/readiness smoke over a temporary SQLite DB with
    `learning_loop_state`, producing
    `productionLearningLoopStateSmokeEvidence` and a passing
    `production_learning_loop_state_smoke_evidence` readiness check;
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=142`, `checkedCount=142`);
  - `npm test -- --test-reporter=spec` (`521` tests);
  - `codegraph sync && codegraph status` (`240` files, `2,967` nodes,
    `11,483` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI app required H1 gates:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `npm run --silent deploy:macos -- --target home-ai --json`
    (plan-only), and Home AI app `git diff --check`;
  - Home AI platform pointer checks:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops evidence appended:
  `evidence-d315f688-405c-4c85-8c2c-69dcec141caf`.
- Remaining work:
  - expose the learning-loop state readback in the Owner generation UI;
  - continue the supervised daily-loop/release UI work without enabling
    unattended scheduling or production writes.

## 2026-06-15T06:18Z - Growth Release Evidence Bundle Builder Slice

- Status: implemented and locally validated. This slice adds a service-owned
  summary-only builder for `growth.learningAutomationReleaseEvidenceBundle.v1`
  so release-readiness evidence can be assembled from existing no-write or
  default-disabled smoke CLIs without hand-splicing JSON in Codex.
- Change classification: H1 by Home AI AI Ops because this changes release
  evidence collection and production-readiness review tooling. No production
  deploy was executed.
- Scope:
  - new service:
    `src/services/learning-automation-release-evidence-bundle-service.js`;
  - new CLI:
    `npm run smoke:release-evidence-bundle`;
  - new script:
    `scripts/build-growth-release-evidence-bundle.js`;
  - new harnesses:
    `tests/learning-automation-release-evidence-bundle-service.test.js` and
    `tests/growth-release-evidence-bundle-script.test.js`;
  - `package.json` `check` now syntax-checks the new service and script;
  - `tests/growth-architecture-boundary.test.js` now guards the builder as
    service-owned, summary-only, no-write, and not a release switch;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_DOCS_INDEX.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`,
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`, and
    `docs/GROWTH_LEARNING_OPERATING_LOOP.md`.
- Boundary:
  - the builder runs selected smoke CLIs through an injected command runner;
  - default task coverage includes planner readiness, daily-loop preview,
    scheduler dry-run, action handoff, scheduler execution, scheduler run,
    scheduler worker target, and scheduler worker smoke evidence;
  - output is summary-only and excludes raw stdout/stderr, raw learner content,
    prompts, model output, provider configuration, credentials, and private
    paths;
  - the builder has no route, no repository, no service-graph import, no
    Gateway/model calls, no daily-loop direct call, no publication, no card
    generation, no evaluation, no scheduler execution/tick bypass, no
    notification delivery, no stage activation, no learner-state mutation, and
    no production deploy authority.
- Validation passed:
  - syntax checks for the new service, script, tests, and architecture test;
  - focused
    `node --test tests/learning-automation-release-evidence-bundle-service.test.js
    tests/growth-release-evidence-bundle-script.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`49` tests);
  - operational builder smoke:
    `npm run --silent smoke:release-evidence-bundle -- --workspace-id
    smoke_workspace --learner-id smoke_learner --program-id smoke_program
    --domain science --subject science --task action_handoff --output-file
    <tmp>/bundle.json --json`;
  - operational readiness consumption:
    `npm run --silent smoke:release-readiness -- --workspace-id
    smoke_workspace --evidence-bundle-file <tmp>/bundle.json --json`;
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=140`, `checkedCount=140`);
  - `npm test -- --test-reporter=spec` (`509` tests);
  - `codegraph sync && codegraph status` (`236` files, `2,915` nodes,
    `11,280` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI `git diff --check`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-f4fc1470-bd79-49ad-a19d-8af0c9be974e`.
- Next implementation target:
  - use the release evidence bundle path as the backend review gate for the
    next Owner-supervised daily-loop or release-readiness UI slice; do not
    treat release evidence as permission to enable writeful background
    scheduling.

## 2026-06-15T05:59Z - Growth Owner Audit Smoke Full Readback Slice

- Status: implemented and locally validated. This slice completes the
  service-owned Owner audit smoke readback by adding evidence-audit and
  profile-delta-audit DTOs to the existing cycle/completeness/correction
  aggregate.
- Change classification: H1 by Home AI AI Ops because this changes operational
  smoke/release evidence for the learning-cycle audit boundary. No production
  deploy was executed.
- Scope:
  - `scripts/smoke-growth-owner-audit.js` now delegates the default read-only
    audit operation to:
    `learningCycleAuditService.listCycleAudit`,
    `learningAuditCompletenessService.evaluateCycleCompleteness`,
    `learningEvidenceAuditService.listEvidenceAudit`,
    `learningProfileDeltaAuditService.listProfileDeltas`, and
    `learningOwnerCorrectionService.listCorrections`;
  - correction writes still require `--operation correction --allow-write`,
    call only `learningOwnerCorrectionService.recordCorrection`, and then
    refresh the full bounded audit DTO set;
  - `tests/growth-owner-audit-smoke-script.test.js` now proves five-service
    readback, full refresh after correction, write gate, parse failures,
    privacy-risk rejection, and empty-DB read-only behavior;
  - `tests/growth-architecture-boundary.test.js` guards the expanded service
    ownership and no-direct-Gateway/repository/scheduler/stage boundary;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`, and
    `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`.
- Boundary:
  - the smoke CLI still imports only `readEnv` and `createServices`;
  - it does not import SQLite repositories, inspect tables, call Gateway or
    model vendors, call daily-loop services, draft or publish plans, generate
    cards, evaluate submissions, execute scheduler actions, run scheduler
    ticks, deliver notifications, activate stage assessments, mutate learner
    state outside Owner correction, or act as a deploy/release switch;
  - all returned DTOs remain summary-only service projections.
- Validation passed:
  - `node --check scripts/smoke-growth-owner-audit.js`;
  - `node --check tests/growth-owner-audit-smoke-script.test.js`;
  - focused
    `node --test tests/growth-owner-audit-smoke-script.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`84` tests);
  - operational read-only
    `npm run --silent smoke:owner-audit -- --workspace-id smoke_workspace
    --learner-id smoke_learner --program-id smoke_program --domain science
    --subject science --json`, returning top-level `evidenceAudit` and
    `profileDeltaAudit` without requiring write permission;
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=138`, `checkedCount=138`);
  - `npm test -- --test-reporter=spec` (`501` tests);
  - `codegraph sync && codegraph status` (`232` files, `2,859` nodes,
    `11,144` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI required checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI `git diff --check`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-b2ca9bff-5234-46d7-a9f3-cc462f892698`.

## 2026-06-15T05:47Z - Growth Stage Assessment Smoke Harness Slice

- Status: implemented and locally validated. This slice adds a service-owned
  operational smoke for the formal checkpoint boundary so stage-assessment
  readiness/eligibility/activation/completion can be exercised without Codex
  ad hoc calls.
- Change classification: H1 by Home AI AI Ops because this adds operational
  smoke/release evidence for a persistence and workflow boundary. No
  production deploy was executed.
- Scope:
  - new CLI: `npm run smoke:stage-assessment`;
  - new script: `scripts/smoke-growth-stage-assessment.js`;
  - new harness: `tests/growth-stage-assessment-smoke-script.test.js`;
  - `package.json` `check` now syntax-checks the new runtime script;
  - `tests/growth-architecture-boundary.test.js` now guards the CLI as
    service-owned and write-gated;
  - Growth docs updated:
    `.agent-context/PROJECT_CONTEXT.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`, and
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`.
- Boundary:
  - default operation is read-only `readiness` through
    `learningStageAssessmentService.stageReadiness`;
  - `eligibility`, `activate`, and `complete` require explicit
    `--allow-write`;
  - `activate` also requires an explicit `activationSource`;
  - `complete` requires a cycle id and task-card id;
  - the CLI delegates only to `learning-stage-assessment-service` through the
    normal service graph;
  - the CLI must not import repositories, call Gateway directly, call plan
    publication, generate through plan services, evaluate submissions, run
    automation, deliver notifications, or mutate learner state outside the
    stage-assessment service.
- Validation passed:
  - syntax checks for the new script and harness;
  - focused
    `node --test tests/learning-stage-assessment-service.test.js
    tests/learning-stage-assessment-cycles-repository.test.js
    tests/growth-stage-assessment-smoke-script.test.js
    tests/learning-card-generation-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`
    (`84` tests);
  - operational read-only
    `npm run --silent smoke:stage-assessment -- --workspace-id smoke_workspace
    --target-node-id smoke_node --json`, returning dormant readiness without
    writing a stage cycle;
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=138`, `checkedCount=138`);
  - `npm test -- --test-reporter=spec` (`501` tests);
  - `codegraph sync && codegraph status` (`232` files, `2,859` nodes,
    `11,141` edges; index up to date);
  - Growth `git diff --check`;
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI `git diff --check`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-6b073cbb-25b6-4a2a-89e5-56806f07ca57`.

## 2026-06-15T05:32Z - Growth Persisted Release Approval Records Slice

- Status: implemented and locally validated. This slice closes the previous
  backend gap where release-readiness accepted temporary approval input but did
  not persist explicit approval records for each writeful config gate.
- Change classification: H2 by Growth local scope because it adds SQLite
  persistence, Owner write routes, readiness input fallback, and smoke harness
  for release evidence. Home AI AI Ops intake classified the slice as H3
  architecture-doc/Harness map work and required
  `node tests/architecture-code-test-harness-map.test.js` plus diff hygiene.
- Scope:
  - new repository:
    `src/stores/growth-learning-sqlite/automation-release-approvals.js`;
  - new table:
    `learning_growth_automation_release_approvals`;
  - new service:
    `src/services/learning-automation-release-approval-service.js`;
  - new routes:
    visible-target scoped
    `GET /api/v1/growth/automation/release-approvals` and Owner-only
    `POST /api/v1/growth/automation/release-approvals`;
  - new smoke CLI:
    `npm run smoke:release-approval`;
  - `learning-automation-release-readiness-service` now reads active persisted
    approval records through the approval service and projects
    `releaseReview.persistedApprovalKeys`;
  - release-readiness query approval parsing no longer treats absent approval
    query params as explicit false, so persisted approvals are not accidentally
    hidden by omitted parameters;
  - Growth docs and platform pointer now document the approval boundary.
- Boundary:
  - persisted approvals are summary-only evidence records for canonical gates:
    `writefulExecutionApproval`, `backgroundSchedulerApproval`, and
    `backgroundWorkerApproval`;
  - approval records do not flip runtime config and readiness still always
    returns `writefulSchedulingAllowed=false`;
  - the release approval CLI defaults to read-only list, supports read-only bag
    projection, and requires explicit `--allow-write` for record;
  - no Gateway calls, plan publication, card generation, evaluation, scheduler
    execution, scheduler ticks, notification delivery, stage activation,
    learner-state mutation, production deploy, or direct repository access from
    smoke CLIs were added.
- Validation passed:
  - syntax checks for touched runtime files, tests, and `package.json`;
  - focused
    `node --test tests/learning-automation-release-approval-repository.test.js
    tests/learning-automation-release-approval-service.test.js
    tests/growth-automation-release-approval-smoke-script.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js
    tests/growth-docs-locality.test.js` (`89` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `npm run --silent check` (`runtimeCount=137`, `checkedCount=137`);
  - operational read-only
    `npm run smoke:release-approval -- --workspace-id smoke_workspace
    --learner-id smoke_learner --json`;
  - `npm test -- --test-reporter=spec` (`495` tests);
  - `codegraph sync && codegraph status` (`230` files, `2,824` nodes,
    `11,037` edges; index up to date);
  - Home AI required check:
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Growth and Home AI `git diff --check`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-a060610d-dc9c-43f4-8e8a-602e7930133b`;
  - production deploy was not executed because this was a Growth local
    backend/Harness/docs slice and the user did not request deployment.

## 2026-06-15T05:10Z - Growth Release Readiness Evidence Bundle Input Slice

- Status: implemented and locally validated. This slice lets
  `npm run smoke:release-readiness` accept versioned summary-only release
  evidence bundles so Owner/platform/production evidence can be passed as one
  structured artifact instead of many independent flags.
- Change classification: H2 Growth release-readiness/Harness input boundary by
  local scope. Home AI AI Ops classified it as H3 architecture-doc/Harness map
  work and required architecture-map, touched-file syntax, and diff-hygiene
  checks.
- Scope:
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--evidence-bundle-file <path>` and `--evidence-bundle-json <json>`;
  - supported bundle schema:
    `growth.learningAutomationReleaseEvidenceBundle.v1`;
  - bundle `scope`, `evidence`, `releaseApproval`, `requestedBy`, and
    `createdAt` are summary-only defaults;
  - explicit CLI scope, `--evidence-json`, `--release-approval-json`, and
    evidence/approval flags override bundle values;
  - bundle parsing rejects unsupported schema, non-summary-only class, and
    privacy-risk keys before readiness evaluation;
  - the CLI `--limit` helper now correctly falls back when no limit flag is
    supplied instead of coercing an empty value to `1`;
  - release-readiness smoke-script and architecture-boundary Harness tests now
    cover bundle parsing, file+inline merge, explicit overrides, privacy
    failure, and existing no-write/snapshot behavior.
- Boundary:
  - no release-readiness service decision logic changed;
  - no new write path was added;
  - readiness remains no-write by default and writes snapshots only with
    explicit `--write-snapshot`;
  - the boundary still keeps `writefulSchedulingAllowed=false`;
  - no Gateway calls, plan publication, scheduler execution, scheduler ticks,
    action handoff delivery, notification delivery, stage activation,
    learner-state mutation, or production deploy were performed.
- Validation passed:
  - syntax checks for the touched Growth smoke script and tests;
  - `node --test tests/growth-release-readiness-smoke-script.test.js
    tests/growth-architecture-boundary.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js` (`76` tests);
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --evidence-bundle-file <tmp> --json`,
    which returned `owner_daily_ui_evidence` and
    `production_scheduler_dry_run_smoke_evidence` as `pass` while readiness
    stayed `incomplete` and `writefulSchedulingAllowed=false`;
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`483` tests);
  - `codegraph sync && codegraph status` (`224` files, `2,751` nodes,
    `10,802` edges; index up to date);
  - Home AI required checks:
    `node tests/architecture-code-test-harness-map.test.js`, absolute
    `node --check` commands for the touched Growth files, and Growth/Home AI
    `git diff --check`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-f043236d-636f-4f10-92b6-3f5e47ddb216`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T05:00Z - Growth Release Readiness Scheduler Dry-Run Smoke Evidence Gate Slice

- Status: implemented and locally validated. This slice separates the external
  production scheduler dry-run smoke evidence from the release-readiness
  service's internal no-write scheduler dry-run safety check.
- Change classification: H2 backend/Harness/docs evidence boundary by Growth
  scope. Home AI AI Ops classified it as H1 because the task included
  release-readiness, production, scheduler, and deployment terms, so the
  required Mac production docs, deployment harnesses, and plan-only deploy check
  were run.
- Scope:
  - `learning-automation-release-readiness-service` now requires
    `production_scheduler_dry_run_smoke_evidence` before release review;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-scheduler-dry-run-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence key, CLI flag, and required action
    `run_production_scheduler_dry_run_smoke`;
  - Growth project context, implementation plan, next-stage plan, architecture
    doc, and platform pointer now distinguish production scheduler dry-run
    smoke evidence from `npm run smoke:scheduler-dry-run` and the internal
    release-readiness no-write scheduler dry-run safety check.
- Boundary:
  - the new check is summary-only external evidence input;
  - the existing internal scheduler dry-run safety check remains
    `production_scheduler_dry_run` and calls only no-write dry-run behavior;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - no Gateway calls, plan publication, scheduler execution, scheduler ticks,
    action handoff delivery, notification delivery, stage activation,
    learner-state mutation, or production deploy were performed.
- Validation passed:
  - syntax checks for the touched Growth service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-scheduler-dry-run-smoke-evidence --json`, which returned
    `production_scheduler_dry_run_smoke_evidence` and
    `production_scheduler_dry_run` as `pass` while the overall readiness stayed
    `incomplete` and `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,749` edges; index up to date);
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, absolute
    `node --check` commands for the touched Growth files, plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`, and Growth
    and Home AI `git diff --check`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-d019ee22-2ec2-40ba-add1-98f67163e4f4`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T04:50Z - Growth Release Readiness Planner Evidence Harness Coverage Slice

- Status: implemented and locally validated. This slice closes a coverage gap
  where `learning-automation-release-readiness-service` and
  `scripts/smoke-growth-release-readiness.js` already supported
  `productionPlannerReadinessEvidence` /
  `--production-planner-readiness-evidence`, but the release-readiness
  smoke-script harness, service pass/missing assertions, architecture guard,
  and Growth docs did not all name that evidence flag explicitly.
- Change classification: H3 docs/Harness contract coverage by code surface;
  Home AI AI Ops classified it as H1 because the task included production and
  deployment keywords, so the required Mac production docs, deployment
  harnesses, and plan-only deploy check were run.
- Scope:
  - release-readiness smoke-script tests now parse and project
    `--production-planner-readiness-evidence`;
  - release-readiness service tests now assert
    `production_planner_readiness_evidence` in both all-pass and missing
    evidence paths;
  - the architecture boundary test now guards the CLI flag, smoke-script
    harness coverage, service key, and required action
    `run_production_planner_readiness_smoke`;
  - Growth project context, implementation plan, next-stage plan, architecture
    doc, and platform pointer now state that this evidence comes from
    `npm run smoke:planner-readiness`.
- Boundary:
  - no runtime service behavior changed;
  - no production planner smoke was run in production during this slice;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - no Gateway calls, plan publication, scheduler execution, scheduler ticks,
    notification delivery, stage activation, learner-state mutation, or
    production deploy were performed.
- Validation passed:
  - syntax checks for the touched Growth tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-planner-readiness-evidence --json`, which returned
    `production_planner_readiness_evidence` as `pass` while the overall
    readiness stayed `incomplete` and `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,747` edges; index up to date);
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, absolute
    `node --check` commands for the touched Growth test files, plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`, and Growth
    and Home AI `git diff --check`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-be79b2eb-0b58-4e45-bd72-c84431d1ecaa`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T04:45Z - Growth Release Readiness Automation UI Evidence Gate Slice

- Status: implemented and locally validated. This slice makes automation
  digest UI, automation action handoff UI, scheduler execution UI, scheduler
  run UI, and scheduler worker-target UI evidence explicit release-readiness
  checks without implementing those UI surfaces, enabling writeful scheduling,
  calling Gateway, publishing plans, evaluating submissions, running scheduler
  ticks, delivering notifications, activating stage assessments, or mutating
  learner state.
- Change classification: H2 backend/Harness/docs evidence boundary by Growth
  scope because it changes release-readiness contract evidence. Home AI AI Ops
  intake classified the slice as H3 and required architecture documentation
  mapping, touched-file syntax checks, and diff hygiene; no visual lane or
  deployment plan was required.
- Scope:
  - `learning-automation-release-readiness-service` now requires
    `automation_digest_ui_evidence`,
    `automation_action_handoff_ui_evidence`,
    `scheduler_execution_ui_evidence`, `scheduler_run_ui_evidence`, and
    `scheduler_worker_target_ui_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--automation-digest-ui-evidence`,
    `--automation-action-handoff-ui-evidence`,
    `--scheduler-execution-ui-evidence`, `--scheduler-run-ui-evidence`, and
    `--scheduler-worker-target-ui-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence keys, CLI flags, and required actions;
  - Growth implementation, next-stage, architecture, platform pointer, and
    project-context docs now summarize proposal/digest/action/execution/run/
    worker-target UI evidence as release-review prerequisites.
- Boundary:
  - the new checks are summary-only external evidence inputs; they do not prove
    the UI exists by themselves;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - this slice must not call Gateway, daily-loop services, action handoff
    delivery, publication, evaluation, scheduler execution, scheduler ticks,
    notification delivery, stage activation, direct repositories from the CLI,
    or learner-state mutation.
- Validation passed:
  - `npm run --silent check` (`runtimeCount=134`, `checkedCount=134`);
  - `npm test -- --test-reporter=spec` (`481` tests);
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --automation-digest-ui-evidence
    --automation-action-handoff-ui-evidence
    --scheduler-execution-ui-evidence --scheduler-run-ui-evidence
    --scheduler-worker-target-ui-evidence --json`, which returned all five
    new UI checks as `pass` while the overall readiness stayed `incomplete`
    and `writefulSchedulingAllowed=false`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,747` edges; index up to date);
  - Home AI required checks: `node tests/architecture-code-test-harness-map.test.js`,
    absolute `node --check` commands for the touched Growth files, and Growth
    and Home AI `git diff --check`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-d7ce7a95-ffe4-4a38-bb4e-1789fa2c07c7`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T04:36Z - Growth Release Readiness Scheduler Worker Target Smoke Evidence Slice

- Status: implemented and locally validated. This slice makes production
  scheduler worker target smoke evidence from
  `npm run smoke:scheduler-worker-target` a required release-readiness check
  without enabling background workers, production scheduling, scheduler run or
  execution, action handoff delivery, Gateway calls, plan publication,
  evaluation, stage activation, notification delivery, or learner-state
  mutation.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of release/scheduler/worker/Gateway
  runtime keywords; only required non-deploy checks and the plan-only deploy
  command were run.
- Scope:
  - `learning-automation-release-readiness-service` now includes
    `production_scheduler_worker_target_smoke_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-scheduler-worker-target-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence key and required action;
  - Growth local implementation, next-stage, architecture, platform pointer,
    and project-context docs now state that
    `npm run smoke:scheduler-worker-target` evidence is required before release
    review.
- Boundary:
  - the new check is summary-only evidence input, expected to be collected by
    running the scheduler worker-target smoke separately;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - the boundary must not call Gateway, daily-loop services, action handoff
    delivery, publication, evaluation, scheduler execution, scheduler ticks,
    notification delivery, stage activation, direct repositories from the CLI,
    or learner-state mutation.
- Validation passed:
  - syntax checks for the touched service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-scheduler-worker-target-smoke-evidence --json`, which returned
    the new check as `pass` while the overall readiness stayed `incomplete` and
    `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth and Home AI `git diff --check`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,737` edges; index up to date);
  - Home AI required checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, absolute `node
    --check` commands for the touched Growth files, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-481173c4-d136-4500-8f1d-e93a3c7bd29d`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T04:31Z - Growth Release Readiness Scheduler Execution/Run Smoke Evidence Slice

- Status: implemented and locally validated. This slice makes production
  scheduler execution smoke evidence from `npm run smoke:scheduler-execution`
  and production scheduler run smoke evidence from `npm run smoke:scheduler-run`
  required release-readiness checks without enabling writeful execution,
  background scheduling, scheduler ticks, action handoff delivery, Gateway
  calls, plan publication, evaluation, stage activation, notification
  delivery, or learner-state mutation.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of release/scheduler/deployment
  keywords; only required non-deploy checks and the plan-only deploy command
  were run.
- Scope:
  - `learning-automation-release-readiness-service` now includes
    `production_scheduler_execution_smoke_evidence` and
    `production_scheduler_run_smoke_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-scheduler-execution-smoke-evidence` and
    `--production-scheduler-run-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    both new evidence keys and required actions;
  - Growth local implementation, next-stage, architecture, platform pointer,
    and project-context docs now state that `npm run smoke:scheduler-execution`
    and `npm run smoke:scheduler-run` evidence are required before release
    review.
- Boundary:
  - the new checks are summary-only evidence inputs, expected to be collected by
    running the scheduler execution/run smoke scripts separately;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - the boundary must not call Gateway, daily-loop services, action handoff
    delivery, publication, evaluation, scheduler execution, scheduler ticks,
    notification delivery, stage activation, direct repositories from the CLI,
    or learner-state mutation.
- Validation passed:
  - syntax checks for the touched service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-scheduler-execution-smoke-evidence
    --production-scheduler-run-smoke-evidence --json`, which returned both new
    checks as `pass` while the overall readiness stayed `incomplete` and
    `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth and Home AI `git diff --check`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,735` edges; index up to date);
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, absolute `node
    --check` commands for the touched Growth files, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-3ff866c5-d146-4fd2-b053-431f27cc10dc`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T04:27Z - Growth Release Readiness Action Handoff Smoke Evidence Slice

- Status: implemented and locally validated. This slice makes production
  action handoff smoke evidence from `npm run smoke:action-handoff` a required
  release-readiness check without enabling writeful scheduling, calling the
  action handoff service from the release-readiness boundary, delivering
  notifications, calling Gateway, drafting/publishing plans, evaluating
  submissions, executing scheduler actions, running scheduler ticks, activating
  stage assessments, or mutating learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of release/action/deployment
  keywords; only required non-deploy checks and the plan-only deploy command
  were run.
- Scope:
  - `learning-automation-release-readiness-service` now includes
    `production_action_handoff_smoke_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-action-handoff-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence key and required action;
  - Growth local implementation, next-stage, architecture, platform pointer,
    and project-context docs now state that `npm run smoke:action-handoff`
    evidence is required before release review.
- Boundary:
  - the new check is summary-only evidence input, expected to be collected by
    running `npm run smoke:action-handoff` separately;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - the boundary must not call Gateway, daily-loop services, action handoff
    delivery, publication, evaluation, scheduler execution, scheduler ticks,
    notification delivery, stage activation, direct repositories from the CLI,
    or learner-state mutation.
- Validation passed:
  - syntax checks for the touched service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-action-handoff-smoke-evidence --json`, which returned the new
    check as `pass` while the overall readiness stayed `incomplete` and
    `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth and Home AI `git diff --check`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,731` edges; index up to date);
  - Home AI required checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, absolute `node
    --check` commands for the touched Growth files, and plan-only
    `npm run --silent deploy:macos -- --target home-ai --json`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-b6459495-c743-4ffe-899b-bc4d3ebbbdcb`;
  - production deploy was not executed because this was a Growth local
    Harness/docs slice and the user did not request deployment.
- Note: the Home AI app deploy plan reported unrelated existing dirty files in
  the app workspace. They were not modified by this Growth slice.

## 2026-06-15T04:18Z - Growth Release Readiness Daily-Loop Preview Evidence Slice

- Status: implemented and locally validated. This slice makes production
  daily-loop preview smoke evidence a required release-readiness check without
  enabling writeful scheduling, calling the daily-loop service from the
  release-readiness boundary, drafting/publishing plans, calling Gateway,
  executing schedulers, delivering notifications, activating stage assessments,
  or mutating learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of release/deployment keywords;
  only non-deploy checks were run.
- Scope:
  - `learning-automation-release-readiness-service` now includes
    `production_daily_loop_preview_smoke_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-daily-loop-preview-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence key and required action;
  - Growth local implementation, next-stage, architecture, platform pointer,
    and project-context docs now state that `npm run smoke:daily-loop-preview`
    evidence is required before release review.
- Boundary:
  - the new check is summary-only evidence input, expected to be collected by
    running `npm run smoke:daily-loop-preview` separately;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - the boundary must not call Gateway, daily-loop services, publication,
    evaluation, scheduler execution, scheduler ticks, notification delivery,
    stage activation, direct repositories from the CLI, or learner-state
    mutation.
- Validation passed:
  - syntax checks for the touched service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-daily-loop-preview-smoke-evidence --json`, which returned the
    new check as `pass` while the overall readiness stayed `incomplete` and
    `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth and Home AI `git diff --check`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,729` edges; index up to date);
  - Home AI required non-deploy checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`, and
    `node tests/production-status-smoke-harness.test.js`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-23cee4ca-6343-431e-84c9-4ff762dccd1a`;
  - `npm run --silent deploy:macos -- --target home-ai --json` and production
    deploy were not executed because this was a Growth local Harness/docs
    slice and the user did not request deployment.

## 2026-06-15T04:12Z - Growth Release Readiness Worker Smoke Evidence Slice

- Status: implemented and locally validated. This slice makes production
  scheduler worker smoke evidence a required release-readiness check without
  enabling writeful scheduling, background worker timers, scheduler execution,
  publication, Gateway calls, notification delivery, stage activation, or
  learner-state mutation.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of release/deployment/scheduler
  keywords; only non-deploy checks were run.
- Scope:
  - `learning-automation-release-readiness-service` now includes
    `production_scheduler_worker_smoke_evidence`;
  - `scripts/smoke-growth-release-readiness.js` now accepts
    `--production-scheduler-worker-smoke-evidence`;
  - release-readiness service, smoke-script, and architecture harnesses assert
    the new evidence key and required action;
  - Growth local implementation, next-stage, architecture, platform pointer,
    and project-context docs now state that `npm run smoke:scheduler-worker`
    evidence is required before release review.
- Boundary:
  - the new check is summary-only evidence input;
  - `npm run smoke:release-readiness` remains no-write by default and writes
    snapshots only with explicit `--write-snapshot`;
  - release readiness remains advisory and always returns
    `writefulSchedulingAllowed=false`;
  - the boundary must not call Gateway, daily-loop services, publication,
    evaluation, scheduler execution, scheduler ticks, notification delivery,
    stage activation, direct repositories from the CLI, or learner-state
    mutation.
- Validation passed:
  - syntax checks for the touched service, smoke script, and tests;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=35`);
  - `node --test tests/growth-docs-locality.test.js`;
  - operational temporary-SQLite
    `npm run smoke:release-readiness -- --workspace-id smoke_workspace
    --production-scheduler-worker-smoke-evidence --json`, which returned the
    new check as `pass` while the overall readiness stayed `incomplete` and
    `writefulSchedulingAllowed=false`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth and Home AI `git diff --check`;
  - `codegraph sync && codegraph status` (`224` files, `2,739` nodes,
    `10,727` edges; index up to date);
  - Home AI required non-deploy checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and
    `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI platform pointer checker:
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`.
- AI Ops control-plane evidence:
  - evidence ledger id:
    `evidence-32f78212-c42d-4cf6-9b56-9af5078d28f1`;
  - `npm run --silent deploy:macos -- --target home-ai --json` and production
    deploy were not executed because this was a Growth local Harness/docs
    slice and the user did not request deployment.

## 2026-06-15T04:02Z - Growth Scheduler Worker Smoke CLI Slice

- Status: Growth automation scheduler worker/lease boundary now has a
  service-owned operational smoke entry. This slice did not deploy, enable
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, enable
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`, start worker timers outside
  the service, execute scheduler actions directly, inspect delivered handoffs,
  publish cards, call Gateway, call model vendors, generate cards, evaluate
  learner submissions, deliver action handoffs, activate stage assessments,
  enqueue work, or mutate learner evidence/profile state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of scheduler/deployment keywords;
  only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-scheduler-worker.js`;
  - added `npm run smoke:scheduler-worker`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-scheduler-worker-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `status` is the default operation and delegates to
    `learningAutomationSchedulerWorkerService.tickTargets`;
  - while `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false`, the expected
    disabled result is wrapped as no-write smoke evidence and must not create
    worker lease or scheduler run tables in an empty SQLite database;
  - when the worker is enabled, `tick` and `tick-targets` require explicit
    `--allow-write` and still delegate only to
    `learningAutomationSchedulerWorkerService.tick` / `tickTargets`;
  - with `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=false`, write-gated
    worker evidence records blocked lease/run state rather than publication;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run directly,
    call scheduler run/execution services directly, list or deliver handoffs
    directly, publish directly, generate cards, evaluate submissions, activate
    stage assessments, or mutate learner state outside the worker service.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-scheduler-worker.js`;
  - `node --check tests/growth-automation-scheduler-worker-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-scheduler-worker-smoke-script.test.js
    tests/learning-automation-scheduler-worker-service.test.js
    tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/growth-architecture-boundary.test.js` (`47` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=134`, `checkedCount=134`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent smoke:scheduler-worker -- --workspace-id smoke_workspace --json`
    with a temporary empty SQLite DB precreated for disabled no-write status
    evidence;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`481` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`224` JavaScript files, `2,739`
    nodes, `10,725` edges; index up to date).
- AI Ops control-plane evidence:
  - Home AI required docs from the intake packet had been read in this turn,
    including Gateway/runtime, deployment, production closure, and
    architecture/harness maps;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - Growth platform pointer changes were also checked with
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - AI Ops evidence ledger id:
    `evidence-15318d39-26ed-4a24-8650-1a0b716fb285`;
  - `npm run --silent deploy:macos -- --target home-ai --json` and production
    deploy were not executed because this is a local Growth Harness/docs slice
    and the user did not request deployment.

## 2026-06-15T03:52Z - Growth Scheduler Worker Target Smoke CLI Slice

- Status: Growth automation scheduler worker target configuration now has a
  service-owned operational smoke entry. This slice did not deploy, enable
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, enable
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`, start worker timers, claim
  leases, run scheduler ticks, call scheduler execution, inspect delivered
  handoffs, publish cards, call Gateway, call model vendors, generate cards,
  evaluate learner submissions, deliver action handoffs, activate stage
  assessments, enqueue work, or mutate learner evidence/profile state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of scheduler/deployment keywords;
  only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-scheduler-worker-target.js`;
  - added `npm run smoke:scheduler-worker-target`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-scheduler-worker-target-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `list` is the default read-only operation and delegates to
    `learningAutomationSchedulerWorkerTargetService.listTargets`;
  - `runnable` / `list-runnable` is read-only and delegates only to
    `learningAutomationSchedulerWorkerTargetService.listRunnableTargets`;
  - `create` and `review` require explicit `--allow-write` and delegate only
    to `learningAutomationSchedulerWorkerTargetService.createTarget` /
    `reviewTarget`;
  - created targets stay `proposed`, reviewed `enabled` targets still keep
    `productionSchedulingAllowed=false`, and environment JSON targets are not
    production approval;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run directly,
    call scheduler run/execution, list or deliver handoffs directly, publish
    directly, generate cards, evaluate submissions, run worker timers, claim
    leases, activate stage assessments, or mutate learner state outside the
    worker-target service.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-scheduler-worker-target.js`;
  - `node --check tests/growth-automation-scheduler-worker-target-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-scheduler-worker-target-smoke-script.test.js
    tests/learning-automation-scheduler-worker-target-service.test.js
    tests/learning-automation-scheduler-worker-target-repository.test.js
    tests/learning-automation-scheduler-worker-service.test.js
    tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`81` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=133`, `checkedCount=133`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent smoke:scheduler-worker-target -- --workspace-id smoke_workspace --json`
    with a temporary empty SQLite DB precreated for read-only list evidence;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`475` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`222` JavaScript files, `2,704`
    nodes, `10,633` edges; index up to date).
- AI Ops control-plane evidence:
  - Home AI required docs from the intake packet were read at their entry
    sections, including Gateway/runtime, deployment, production closure, and
    architecture/harness maps;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - Growth platform pointer changes were also checked with
    `node scripts/plugin-workspace-platform-contract-check.js --json` and
    `node tests/plugin-workspace-platform-contract-check.test.js`;
  - AI Ops evidence ledger id:
    `evidence-3d648d79-7d54-4dd9-98bb-266e266a32f2`;
  - `npm run --silent deploy:macos -- --target home-ai --json` and production
    deploy were not executed because this is a local Growth Harness/docs slice
    and the user did not request deployment.

## 2026-06-15T03:38Z - Growth Scheduler Run Smoke CLI Slice

- Status: Growth automation scheduler run/tick now has a service-owned
  operational smoke entry. This slice did not deploy, enable
  `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, enable
  `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`, list delivered handoffs during
  disabled run, execute scheduler actions, publish cards, call Gateway, call
  model vendors, generate cards, evaluate learner submissions, deliver action
  handoffs, run worker timers, activate stage assessments, enqueue work, or
  mutate learner state outside the scheduler run service boundary.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of scheduler/deployment keywords;
  only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-scheduler-run.js`;
  - added `npm run smoke:scheduler-run`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-scheduler-run-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `list` is the default read-only operation and delegates to
    `learningAutomationSchedulerRunService.listRuns`;
  - `run` / `run-once` requires explicit `--allow-write` and delegates only to
    `learningAutomationSchedulerRunService.runOnce`;
  - with background scheduling disabled, explicit run records bounded
    `blocked` state with
    `learning_automation_background_scheduler_disabled`;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run directly,
    call scheduler execution directly, list or deliver handoffs directly,
    publish directly, generate cards, evaluate submissions, run worker timers,
    activate stage assessments, or mutate learner state outside the scheduler
    run service.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-scheduler-run.js`;
  - `node --check tests/growth-automation-scheduler-run-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-scheduler-run-smoke-script.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`82` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=132`, `checkedCount=132`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent smoke:scheduler-run -- --workspace-id smoke_workspace --json`
    with a temporary empty SQLite DB precreated for read-only list evidence;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`470` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`220` JavaScript files, `2,672`
    nodes, `10,550` edges; index up to date).
- AI Ops control-plane evidence:
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-4e2ef604-4b29-4c45-81d2-af43fec0fccd`;
  - production deploy was not executed because this is a local Growth
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T03:23Z - Growth Scheduler Execution Smoke CLI Slice

- Status: Growth automation scheduler execution now has a service-owned
  operational smoke entry. This slice did not deploy, enable
  `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED`, publish cards, call Gateway,
  call model vendors, generate cards, evaluate learner submissions, deliver
  action handoffs, run scheduler ticks, activate stage assessments, enqueue
  workers, or mutate learner state outside the execution service boundary.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of execution/deployment keywords;
  only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-scheduler-execution.js`;
  - added `npm run smoke:scheduler-execution`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-scheduler-execution-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated
    `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `list` is the default read-only operation and delegates to
    `learningAutomationSchedulerExecutionService.listExecutions`;
  - `execute` requires explicit `--allow-write`, requires a handoff id and
    proposal id, and delegates to
    `learningAutomationSchedulerExecutionService.executeOnce`;
  - with writeful execution disabled, explicit execution records bounded
    `blocked` state with
    `learning_automation_scheduler_execution_disabled`;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run directly,
    publish directly, generate cards, evaluate submissions, run scheduler
    ticks, deliver action handoffs, activate stage assessments, or mutate
    learner state outside the scheduler execution service.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-scheduler-execution.js`;
  - `node --check tests/growth-automation-scheduler-execution-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-scheduler-execution-smoke-script.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-execution-repository.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`74` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=131`, `checkedCount=131`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent smoke:scheduler-execution -- --workspace-id smoke_workspace --json`
    with a temporary empty SQLite DB precreated for read-only list evidence;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`465` tests);
  - Growth `git diff --check`.
- AI Ops control-plane evidence:
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-2e297a63-0784-4af5-89f5-e27f57b6fab8`;
  - production deploy was not executed because this is a local Growth
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T03:11Z - Growth Automation Digest Smoke CLI Slice

- Status: Growth automation digest now has a service-owned operational smoke
  entry. This slice did not deploy, enable automation config, execute
  scheduler actions, run scheduler ticks, call Gateway, publish cards,
  evaluate learner submissions, deliver notifications or action handoffs,
  activate stage assessments, enqueue workers, or mutate learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of deployment/architecture-doc
  keywords; only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-digest.js`;
  - added `npm run smoke:digest`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-digest-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `list` is the default read-only operation and delegates to
    `learningAutomationDigestService.listDigests`;
  - `get` is read-only, requires a digest id, and delegates to
    `learningAutomationDigestService.getDigest`;
  - `create` requires explicit `--allow-write` and delegates to
    `learningAutomationDigestService.createDigest`;
  - `review` requires explicit `--allow-write`, requires a digest id, and
    delegates to `learningAutomationDigestService.reviewDigest`;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, publish, generate cards,
    evaluate submissions, record proposal execution, execute scheduler
    actions, run scheduler ticks, deliver action handoffs, or activate stage
    assessments.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-digest.js`;
  - `node --check tests/growth-automation-digest-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-digest-smoke-script.test.js
    tests/learning-automation-digest-service.test.js
    tests/learning-automation-digest-repository.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/growth-architecture-boundary.test.js` (`38` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=130`, `checkedCount=130`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`460` tests);
  - `npm run --silent smoke:digest -- --workspace-id smoke_workspace --json`
    with a temporary empty SQLite DB precreated for read-only list evidence;
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`216` JavaScript files, `2,614`
    nodes, `10,400` edges; index up to date).
- AI Ops control-plane evidence:
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-bd124485-b417-41a9-9537-70af38b9d8d1`;
  - production deploy was not executed because this is a local Growth
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T02:59Z - Growth Failure Policy Smoke CLI Slice

- Status: Growth automation failure policy now has a service-owned operational
  smoke entry. This slice did not deploy, enable automation config, execute
  scheduler actions, run scheduler ticks, call Gateway, publish cards,
  evaluate learner submissions, deliver notifications, activate stage
  assessments, or mutate learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of deployment/architecture-doc
  keywords; only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-failure-policy.js`;
  - added `npm run smoke:failure-policy`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-failure-policy-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `readiness` is the default read-only operation and delegates to
    `learningAutomationFailurePolicyService.evaluateReadiness`;
  - `list` is read-only and delegates to
    `learningAutomationFailurePolicyService.listPolicies`;
  - `create` requires explicit `--allow-write` and delegates to
    `learningAutomationFailurePolicyService.createPolicy`;
  - `review` requires explicit `--allow-write`, requires a policy id, and
    delegates to `learningAutomationFailurePolicyService.reviewPolicy`;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run, publish,
    generate cards, evaluate submissions, execute scheduler actions, run
    scheduler ticks, call action handoff, or activate stage assessments.
- Validation passed:
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=129`, `checkedCount=129`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `node --test tests/growth-automation-failure-policy-smoke-script.test.js
    tests/learning-automation-failure-policy-service.test.js
    tests/learning-automation-failure-policy-repository.test.js
    tests/growth-architecture-boundary.test.js` (`33` tests);
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`455` tests);
  - Growth `git diff --check`;
  - `codegraph sync && codegraph status` (`214` JavaScript files, `2,582`
    nodes, `10,313` edges; index up to date).
- AI Ops control-plane evidence:
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-48372130-0170-4cc6-88a1-7d10af54a31d`;
  - production deploy was not executed because this is a local Growth
    Harness/docs slice and the user did not request deployment.

## 2026-06-15T02:46Z - Growth Action Handoff Smoke CLI Slice

- Status: Growth action handoff now has a service-owned operational smoke
  entry. This slice did not deploy, enable automation config, execute
  scheduler actions, run scheduler ticks, call Gateway, publish cards,
  evaluate learner submissions, activate stage assessments, or mutate learner
  state. Delivery smoke may emit a bounded Growth automation event through
  `growth-event-service` and records delivered or visible `delivery_failed`
  handoff status.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI
  AI Ops intake classified it as H1 because of deployment/architecture-doc
  keywords; only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-automation-action-handoff.js`;
  - added `npm run smoke:action-handoff`;
  - wired the new runtime script into `npm run check`;
  - added `tests/growth-automation-action-handoff-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - `list` is the default read-only operation and delegates to
    `learningAutomationActionHandoffService.listHandoffs`;
  - `create` requires explicit `--allow-write`, requires a reviewed digest id,
    and delegates to `learningAutomationActionHandoffService.createHandoff`;
  - `deliver` requires explicit `--allow-write`, requires a handoff id, and
    delegates to `learningAutomationActionHandoffService.deliverHandoff`;
  - the CLI must not import repositories directly, inspect
    `learning_growth_` tables, call Gateway, call scheduler dry-run, publish,
    generate cards, evaluate submissions, execute scheduler actions, run
    scheduler ticks, or activate stage assessments.
- Validation passed:
  - `node --check scripts/smoke-growth-automation-action-handoff.js`;
  - `node --check tests/growth-automation-action-handoff-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-automation-action-handoff-smoke-script.test.js
    tests/learning-automation-action-handoff-service.test.js
    tests/learning-automation-action-handoff-repository.test.js
    tests/growth-architecture-boundary.test.js` (`31` tests);
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=128`, `checkedCount=128`, no missing/stale/duplicate
    entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`449` tests);
  - `git diff --check`.
- Broad validation passed:
  - `codegraph sync && codegraph status` (`212` JavaScript files, `2,554`
    nodes, `10,245` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of deployment/architecture-doc keywords even though this Growth
    change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-242dc188-b590-4a82-ac68-8d6f45490cd9`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15T02:33Z - Growth Runtime Syntax Coverage Gate Slice

- Status: Growth runtime syntax coverage is now a generic check gate instead
  of a manually audited subset. This slice did not change runtime behavior,
  deploy, enable automation config, execute scheduler actions, run scheduler
  ticks, call Gateway, publish cards, evaluate learner submissions, deliver
  notifications, activate stage assessments, or mutate learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI AI
  Ops intake classified it as H1 because of Gateway/runtime/deploy/docs
  keywords; only non-deploy checks were run.
- Scope:
  - added `scripts/check-growth-syntax-coverage.js`;
  - wired `node --check scripts/check-growth-syntax-coverage.js` and
    `node scripts/check-growth-syntax-coverage.js` into `npm run check`;
  - changed `tests/growth-architecture-boundary.test.js` so the check gate
    covers every runtime JavaScript file under `scripts/`, `src/`, and
    `public/`, not only automation/audit backend files;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - the checker only reads `package.json` and local file names;
  - it fails on missing runtime JS check coverage, stale check entries, or
    duplicate check entries;
  - it does not read private learner content, connect to SQLite, call Gateway,
    start servers, alter config, or execute workflow actions.
- Validation passed:
  - `node --check scripts/check-growth-syntax-coverage.js`;
  - `node scripts/check-growth-syntax-coverage.js`
    (`runtimeCount=127`, `checkedCount=127`, no missing/stale/duplicate
    entries);
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js` (`17` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`444` tests);
  - `git diff --check`.
- Broad validation passed:
  - `codegraph sync && codegraph status` (`210` JavaScript files, `2,524`
    nodes, `10,171` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of Gateway/runtime/deployment/architecture-doc keywords even though
    this Growth change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-d11b2c7f-67a9-4973-8b7d-b1ccd81bbd64`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15T02:27Z - Growth Backend Check Gate Completion Slice

- Status: Growth backend Harness syntax coverage is hardened. This slice did
  not change runtime behavior, deploy, enable automation config, execute
  scheduler actions, run scheduler ticks, call Gateway, publish cards,
  evaluate learner submissions, deliver notifications, activate stage
  assessments, or mutate learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI AI
  Ops intake classified it as H1 because of Gateway/runtime/deploy/docs
  keywords; only non-deploy checks were run.
- Scope:
  - extended `npm run check` to syntax-check all current
    `src/services/learning-automation-*.js` files,
    `src/services/learning-evidence-audit-service.js`,
    `src/services/learning-plan-audit-service.js`, and
    `src/stores/growth-learning-sqlite/automation-*.js`;
  - added `tests/growth-architecture-boundary.test.js` coverage that reads the
    current file list and `package.json` so future automation/audit backend
    files cannot be missed by the check gate;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`, and
    `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Boundary:
  - this is a Harness/check-gate correction only;
  - release readiness remains advisory and `writefulSchedulingAllowed` remains
    false;
  - no production smoke, central visual harness, runtime config change, or
    production deploy was performed.
- Validation passed:
  - `node --test tests/growth-architecture-boundary.test.js` (`17` tests);
  - dynamic check-coverage audit (`21` required automation/audit backend files,
    no missing check entries);
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`444` tests);
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`209` JavaScript files, `2,516`
    nodes, `10,161` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of Gateway/runtime/deployment/architecture-doc keywords even though
    this Growth change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-e5a4d6a2-c71b-4145-8170-c05b2bd4bdaa`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15 Growth Release-Readiness Approval Evidence Harness Slice

- Status: release-readiness approval evidence coverage is hardened. This slice
  did not change runtime behavior, deploy, enable automation config, execute
  scheduler actions, run scheduler ticks, call Gateway, publish cards, evaluate
  learner submissions, deliver notifications, activate stage assessments, or
  mutate learner state.
- Change classification: H2 backend/Harness/docs evidence boundary.
- Scope:
  - extended `tests/learning-automation-release-readiness-service.test.js` to
    cover release approval aliases (`releaseApproval`, `approvals`, and
    top-level approval fields), enabled-config approval pass states, and
    enabled-config blocked states when approval is missing;
  - extended `tests/growth-release-readiness-smoke-script.test.js` to cover
    `--background-scheduler-approval` together with existing approval flags;
  - documented release approval input forms in
    `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` and
    `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Boundary:
  - release approval evidence remains advisory review evidence only;
  - `writefulSchedulingAllowed` remains false;
  - enabled writeful execution, background scheduler, or background worker
    config without matching explicit release approval is reported as blocked;
  - approval evidence must not act as a runtime switch, deployment switch, or
    scheduler permission by itself.
- Focused validation passed:
  - `node --check tests/learning-automation-release-readiness-service.test.js`;
  - `node --check tests/growth-release-readiness-smoke-script.test.js`;
  - `node --test tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`66` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.
- Broad validation passed:
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`443` tests);
  - `codegraph sync && codegraph status` (`209` JavaScript files, `2,514`
    nodes, `10,157` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of Gateway/runtime/deployment/architecture-doc keywords even though
    this Growth change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-a1798d0c-8568-47ad-a338-05953b220e10`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15 Growth Owner Audit/Correction Smoke Slice

- Status: Owner audit/correction now has a service-owned operational smoke
  entry. This slice did not deploy, change runtime config, run Gateway traffic,
  generate cards, evaluate learner submissions, execute scheduler actions, run
  scheduler ticks, deliver notifications, activate stage assessments, or mutate
  production learner state.
- Change classification: H2 backend/Harness/docs evidence boundary. Home AI AI
  Ops intake classified it as H1 because of Gateway/runtime/deploy/docs
  keywords; only non-deploy checks were run.
- Scope:
  - added `scripts/smoke-growth-owner-audit.js`;
  - added `npm run smoke:owner-audit` and `npm run check` syntax coverage;
  - added `tests/growth-owner-audit-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js`;
  - updated Growth-local architecture, platform pointer, system scheme,
    closed-loop plan, roadmap, operating-loop blueprint, implementation plan,
    next-stage plan, project context, and this handoff.
- Boundary:
  - default operation is read-only `audit`;
  - read-only audit delegates through the normal Growth service graph to
    `learningCycleAuditService.listCycleAudit`,
    `learningAuditCompletenessService.evaluateCycleCompleteness`, and
    `learningOwnerCorrectionService.listCorrections`;
  - `correction` requires explicit `--allow-write` and delegates only to
    `learningOwnerCorrectionService.recordCorrection`, then refreshes bounded
    audit DTOs;
  - the CLI rejects privacy-risk input and must not import repositories,
    inspect SQLite tables, call Gateway, call daily-loop services, draft or
    publish plans, generate cards, evaluate submissions, execute scheduler
    actions, run scheduler ticks, deliver notifications, or activate stage
    assessments.
- Focused validation passed:
  - `node --check scripts/smoke-growth-owner-audit.js`;
  - `node --check tests/growth-owner-audit-smoke-script.test.js`;
  - `node --check tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-owner-audit-smoke-script.test.js`;
  - `node --test tests/growth-owner-audit-smoke-script.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`69` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`441` tests);
  - `codegraph sync && codegraph status` (`209` JavaScript files, `2,514`
    nodes, `10,155` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of Gateway/runtime/deployment/architecture-doc keywords even though
    this Growth change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-6e836671-5f00-434a-b47d-6e121f68cb3d`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15 Growth Release-Readiness Daily-Loop Write-Smoke Evidence Slice

- Status: release-readiness now treats production controlled daily-loop
  draft/publish smoke evidence as a separate required readiness check. This
  slice did not deploy, enable Gateway config, change runtime config, execute
  scheduler actions, deliver notifications, activate stage assessments, run
  production write smoke, or mutate production learner state.
- Change classification: H2 backend/Harness evidence boundary.
- Scope:
  - updated `learning-automation-release-readiness-service` to emit
    `production_daily_loop_write_smoke_evidence`;
  - updated `scripts/smoke-growth-release-readiness.js` to accept
    `--production-daily-loop-write-smoke-evidence`;
  - updated release-readiness service/repository/CLI tests;
  - updated `tests/growth-architecture-boundary.test.js` so
    release-readiness remains evidence-only and must not call Gateway,
    daily-loop services, plan publication, card generation, evaluation,
    scheduler execution/ticks, notification delivery, or stage activation;
  - updated Growth-local scheme, roadmap, next-stage, implementation,
    architecture, platform pointer, and project context docs.
- Boundary:
  - the release-readiness service accepts only summary evidence for controlled
    daily-loop write-smoke completion;
  - actual daily-loop draft/publish evidence still comes from the controlled
    daily-loop CLI or approved production smoke process;
  - release-readiness itself does not execute daily-loop draft/publish,
    generate cards, publish plans, call Gateway, schedule, notify, or alter
    learner state;
  - snapshots persist the new evidence through bounded `checks_json` /
    summary DTOs in `learning_growth_automation_release_readiness`.
- Focused validation passed:
  - `node -c src/services/learning-automation-release-readiness-service.js`;
  - `node -c scripts/smoke-growth-release-readiness.js`;
  - `node -c tests/learning-automation-release-readiness-service.test.js`;
  - `node -c tests/growth-release-readiness-smoke-script.test.js`;
  - `node -c tests/growth-architecture-boundary.test.js`;
  - `node --test tests/learning-automation-release-readiness-repository.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/growth-release-readiness-smoke-script.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`63` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`434` tests);
  - `codegraph sync && codegraph status` (`207` JavaScript files, `2,476`
    nodes, `10,046` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth backend/docs/Harness slice as `H1`
    because of Gateway/runtime/deployment/architecture-doc keywords even though
    this Growth change did not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-8ad7855f-c421-40a1-b2ec-881dc4f0839f`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15 Growth Controlled Daily-Loop Draft/Publish Smoke CLI Slice

- Status: controlled daily-loop smoke CLI is implemented locally and wired
  into local Harness/check gates. This slice did not deploy, enable Gateway
  config, change runtime config, execute scheduler actions, deliver
  notifications, activate stage assessments, or run production write smoke.
- Change classification: H2 backend/Harness evidence boundary.
- Scope:
  - added `scripts/smoke-growth-daily-loop.js`;
  - added `npm run smoke:daily-loop`;
  - added the script to `npm run check`;
  - added `tests/growth-daily-loop-smoke-script.test.js`;
  - fixed `growth-gateway-planner-client` so native `fetch`/Gateway `Response`
    objects are read through `response.text()` before generic body handling;
  - extended `tests/growth-architecture-boundary.test.js` so the new CLI is
    guarded as service-owned glue over `createServices` and
    `learningDailyLoopService.preview/draft/publish`.
- Boundary:
  - default operation is `preview`, which remains no-write;
  - `draft` and `publish` require explicit `--allow-write`;
  - `publish` additionally requires `--plan-draft-id`;
  - the CLI instantiates the normal Growth service graph through `readEnv` and
    `createServices`, then delegates only to `learningDailyLoopService`;
  - it must not import SQLite repositories directly, call Gateway directly,
    draft/publish through the plan publisher directly, call card generation
    directly, evaluate submissions, run scheduler dry-run/execution/ticks,
    deliver notifications, activate stage assessments, or act as a runtime
    release/deploy switch.
- Focused validation passed:
  - `node -c scripts/smoke-growth-daily-loop.js`;
  - `node -c tests/growth-daily-loop-smoke-script.test.js`;
  - `node -c tests/growth-architecture-boundary.test.js`;
  - `node -c src/services/growth-gateway-planner-client.js`;
  - `node --test tests/growth-daily-loop-smoke-script.test.js` (`6` tests).
- Focused daily-loop validation passed:
  - `node --test tests/growth-daily-loop-smoke-script.test.js
    tests/growth-daily-loop-preview-smoke-script.test.js
    tests/learning-daily-loop-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-card-generation-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`93` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`434` tests);
  - `codegraph sync && codegraph status` (`207` JavaScript files, `2,476`
    nodes, `10,046` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth CLI/Harness slice as `H1` because of
    Gateway/runtime/deployment keywords even though this Growth change did not
    deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and Home AI
    `git diff --check`;
  - AI Ops evidence ledger id:
    `evidence-11a06952-33b0-4b73-9b2c-fa261d84ab02`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment.

## 2026-06-15 Growth Daily-Loop Preview Smoke CLI Slice

- Status: daily-loop preview smoke CLI is implemented and wired into local
  Harness. This slice does not deploy, enable Gateway config, create plan
  drafts, publish plans, generate cards, evaluate submissions, run scheduler
  dry-runs, execute scheduler actions, run scheduler ticks, deliver
  notifications, activate stage assessments, mutate learner state, write
  SQLite, or change production runtime config.
- Change classification: H2 backend/Harness evidence boundary.
- Scope:
  - added `scripts/smoke-growth-daily-loop-preview.js`;
  - added `npm run smoke:daily-loop-preview`;
  - added the script and `learning-daily-loop-service.js` to
    `npm run check`;
  - added `tests/growth-daily-loop-preview-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js` so the CLI is guarded
    as service-owned glue over `createServices` and
    `learningDailyLoopService.preview`;
  - updated Growth-local architecture/implementation/next-stage/platform
    pointer docs and `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - default and only behavior is no-write preview evaluation through
    `learningDailyLoopService.preview`;
  - CLI input is bounded scope/filter JSON plus structured selectors for
    workspace, learner, program, plan draft, task card, evaluation,
    profile-delta, evidence, correction, source, graph target nodes,
    domain pack, domain, subject, horizon, available minutes, limit, and
    requested-by metadata;
  - privacy-risk keys fail closed through the daily-loop service privacy scan;
  - the CLI must not import SQLite repositories directly, call Gateway,
    draft/publish plans, generate cards, evaluate submissions, run scheduler
    dry-run/execution/ticks, deliver handoffs, activate stage assessments,
    mutate learner state, or act as a runtime release switch.
- Focused validation passed:
  - `node -c scripts/smoke-growth-daily-loop-preview.js`;
  - `node -c tests/growth-daily-loop-preview-smoke-script.test.js`;
  - `node -c tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-daily-loop-preview-smoke-script.test.js
    tests/learning-daily-loop-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`86` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`427` tests);
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`205` JavaScript files, `2,428`
    nodes, `9,930` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth CLI/Harness slice as `H1` because of
    Gateway/runtime/deployment keywords even though this Growth change did not
    deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and Home AI
    `git diff --check`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment;
  - appended evidence record
    `evidence-cd38f5bb-d59c-44d2-8a72-36173a8bce29` to
    `/Users/xuxin/.homeai-qa/evidence-ledger.jsonl`.
- Remaining product/release gaps:
  - Owner daily UI and Owner audit/correction UI product closure;
  - production planner readiness smoke, production daily-loop preview smoke,
    production scheduler dry-run smoke, and production release-readiness smoke
    evidence;
  - proposal/digest/action/execution/run/worker-target/release-readiness UI;
  - Home AI platform Action Inbox/Web Push evidence;
  - central embedded-plugin visual evidence;
  - reviewed enabled production worker targets;
  - explicit release approvals for each writeful config gate.

## 2026-06-15 Growth Scheduler Dry-Run Smoke CLI Slice

- Status: scheduler dry-run smoke CLI is implemented and wired into local
  Harness. This slice does not deploy, enable Gateway config, publish plans,
  generate cards, evaluate submissions, execute scheduler actions, run
  scheduler ticks, start background workers, deliver notifications, activate
  stage assessments, mutate learner state, or change production runtime
  config.
- Change classification: H2 backend/Harness evidence boundary.
- Scope:
  - added `scripts/smoke-growth-scheduler-dry-run.js`;
  - added `npm run smoke:scheduler-dry-run`;
  - added the script and `learning-automation-scheduler-service.js` to
    `npm run check`;
  - added `tests/growth-scheduler-dry-run-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js` so the CLI is guarded
    as service-owned glue over `createServices` and
    `learningAutomationSchedulerService.dryRun`;
  - updated Growth-local architecture/implementation/next-stage/platform
    pointer docs and `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - default behavior is no-write dry-run evaluation through
    `learningAutomationSchedulerService.dryRun`;
  - CLI input is bounded scope/filter JSON plus structured selectors for
    workspace, learner, program, proposal, plan draft, selected item, graph
    target nodes, source cycle ids, domain pack, domain, subject, horizon,
    limit, and requested-by metadata;
  - privacy-risk keys fail closed through the scheduler service privacy scan;
  - the CLI must not import SQLite repositories directly, call Gateway,
    draft/publish plans, publish accepted proposals, generate cards, evaluate
    submissions, execute scheduler actions, run scheduler ticks, deliver
    handoffs, activate stage assessments, mutate learner state, or act as a
    runtime release switch.
- Focused validation passed:
  - `node -c scripts/smoke-growth-scheduler-dry-run.js`;
  - `node -c tests/growth-scheduler-dry-run-smoke-script.test.js`;
  - `node -c tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-scheduler-dry-run-smoke-script.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/growth-architecture-boundary.test.js` (`22` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `node --test tests/growth-scheduler-dry-run-smoke-script.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/learning-automation-proposal-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-target-provisioning-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`72` tests);
  - `npm run --silent check`;
  - `npm test -- --test-reporter=spec` (`422` tests);
  - `git diff --check`;
  - `codegraph sync && codegraph status` (`203` JavaScript files, `2,403`
    nodes, `9,864` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this local Growth CLI/Harness slice as `H1` because of
    scheduler/runtime/deployment keywords even though this Growth change did
    not deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`, and Home AI
    `git diff --check`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment;
  - appended evidence record
    `evidence-2e0248d6-a7eb-403a-8465-3197cdd9572c` to
    `/Users/xuxin/.homeai-qa/evidence-ledger.jsonl`.
- Remaining product/release gaps:
  - Owner daily UI and Owner audit/correction UI product closure;
  - proposal/digest/action/execution/run/worker-target/release-readiness UI;
  - Home AI platform Action Inbox/Web Push evidence;
  - central embedded-plugin visual evidence;
  - production planner readiness smoke, production scheduler dry-run smoke, and
    production release-readiness smoke evidence;
  - reviewed enabled production worker targets;
  - explicit release approvals for each writeful config gate.

## 2026-06-15 Growth AI Learning Scheme Documentation Supplement

- Status: documentation-only scheme supplement completed for the AI-driven
  learning program. This slice does not change runtime code, database schema,
  Gateway config, scheduler config, production data, learner private payloads,
  deployment state, or Home AI platform contracts.
- Change classification: H2 product/architecture documentation update.
- Scope:
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` now defines Growth as a
    supervised learning-program engine rather than a prompt-to-card tool;
  - the scheme records Fanfan as the first concrete operating program while
    keeping learner workspace, domain pack, domain, subject, horizon, time
    budget, graph nodes, and Owner policy parameterized for future targets;
  - the scheme now separates three learning time scales: daily low-pressure
    observation loop, formal stage-checkpoint loop, and longer program
    evolution loop;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` now has an L0-L7 closure
    ladder so future work distinguishes data foundation, backend daily loop,
    browser daily loop, audit/correction loop, checkpoint loop, generalized
    program, supervised automation, and release-reviewable automation;
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` now records the next
    architecture optimization target: close the browser-operable Owner daily
    loop, learner evidence flow, Owner audit/correction flow, formal
    checkpoint controls, and generalized target selector over existing Growth
    services before claiming product closure;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md` now includes a time-scale roadmap for
    daily loop, stage checkpoint loop, and program evolution loop;
  - `docs/GROWTH_DOCS_INDEX.md` and `.agent-context/PROJECT_CONTEXT.md` point
    future threads at these scheme additions.
- Boundary:
  - only three model-entered steps remain allowed: planner, authoring, and
    evaluation, all through Growth Gateway clients;
  - Growth services and repositories remain the durable source of truth for
    profile, provisioning, mastery, stage eligibility, automation permission,
    and release readiness;
  - backend-only automation evidence must not be described as product closure
    unless the matching browser flow and central visual evidence exist.
- Validation passed for this docs-only slice:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.

## 2026-06-15 Growth Release-Readiness Smoke CLI Slice

- Status: release-readiness smoke/snapshot CLI is implemented and wired into
  local Harness. This slice does not deploy, enable Gateway config, enable
  writeful execution, enable scheduler ticks, enable the worker timer, deliver
  notifications, activate stage assessments, or change production runtime
  config.
- Change classification: H2 backend/Harness evidence boundary.
- Scope:
  - added `scripts/smoke-growth-release-readiness.js`;
  - added `npm run smoke:release-readiness`;
  - added the script to `npm run check`;
  - added `tests/growth-release-readiness-smoke-script.test.js`;
  - updated `tests/growth-architecture-boundary.test.js` so the CLI is guarded
    as service-owned glue over `createServices` and
    `learningAutomationReleaseReadinessService`;
  - updated Growth-local scheme/implementation/architecture/platform-pointer
    docs and `.agent-context/PROJECT_CONTEXT.md`.
- Boundary:
  - default behavior is no-write readiness evaluation through
    `learningAutomationReleaseReadinessService.evaluateReadiness`;
  - `--write-snapshot` explicitly delegates to
    `learningAutomationReleaseReadinessService.createSnapshot` and writes only
    summary-only advisory snapshots;
  - CLI inputs are bounded scope fields plus structured summary
    `--evidence-json`, `--release-approval-json`, and evidence/approval flags;
  - privacy-risk keys fail closed through the existing service/repository
    privacy scan;
  - the CLI must not import SQLite repositories directly, call Gateway,
    publish plans, generate cards, evaluate submissions, execute scheduler
    actions, run scheduler ticks, deliver handoffs, activate stage assessments,
    mutate learner state, or act as a platform release switch.
- Focused validation passed:
  - `node -c scripts/smoke-growth-release-readiness.js`;
  - `node -c tests/growth-release-readiness-smoke-script.test.js`;
  - `node -c tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-release-readiness-smoke-script.test.js
    tests/learning-automation-release-readiness-repository.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/growth-architecture-boundary.test.js` (`24` tests);
  - `node --test tests/growth-release-readiness-smoke-script.test.js
    tests/growth-architecture-boundary.test.js` (`16` tests);
  - package script readback confirmed `smoke:release-readiness` and check
    coverage for release-readiness service/repository.
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`417` tests);
  - `codegraph sync && codegraph status` (`201` JavaScript files, `2,377`
    nodes, `9,793` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified this advisory CLI/Harness slice as `H1` because of
    deployment/runtime-config keywords even though this Growth change did not
    deploy or change runtime config;
  - Home AI non-deploy required checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`,
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`,
    `node tests/production-status-smoke-harness.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`, and Home AI
    `git diff --check`;
  - the AI Ops suggested `npm run --silent deploy:macos -- --target home-ai
    --json` was not executed because this slice is not a production deploy and
    the user did not request deployment;
  - appended evidence record
    `evidence-51413ee0-c065-4a0b-92e6-90225f14716e` to
    `/Users/xuxin/.homeai-qa/evidence-ledger.jsonl`.
- Remaining product/release gaps:
  - Owner daily UI and Owner audit/correction UI product closure;
  - proposal/digest/action/execution/run/worker-target/release-readiness UI;
  - Home AI platform Action Inbox/Web Push evidence;
  - central embedded-plugin visual evidence;
  - production planner readiness smoke and production release-readiness smoke
    evidence;
  - production scheduler dry-run evidence;
  - reviewed enabled production worker targets;
  - explicit release approvals for each writeful config gate.

## 2026-06-15 Growth AI Learning Strategic Plan Documentation Update

- Status: documentation-only update completed for the next AI-driven learning
  scheme. No runtime code, database schema, Gateway config, scheduler config,
  deployment, production data, or learner private payload changed in this
  slice.
- Scope:
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md` now defines the five strategic
    product planes: scope/graph, learner state, model drafts, learning action,
    and audit/next step;
  - the scheme now distinguishes `backend-capable`, `browser-operable`,
    `release-reviewable`, and `writeful automation allowed` states so a
    release-readiness snapshot cannot be mistaken for scheduler permission;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md` now records W1-W7
    program-level workstreams: scope/provisioning, daily learning action,
    audit/profile/correction, formal checkpoint, generalized targets,
    supervised automation, and release evidence/operations;
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` now makes the current
    execution decision explicit: complete the Owner daily loop, learner daily
    evidence flow, Owner audit/correction loop, formal checkpoint separation,
    and generalized target closure before treating automation as product
    ready;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md` now records the planning rule that
    progress is measured by closed-loop capability, not by generated-card
    count or automation-backend count;
  - `docs/GROWTH_DOCS_INDEX.md` and `.agent-context/PROJECT_CONTEXT.md` were
    updated to point future threads at these clarified scheme sections.
- Validation passed for this docs-only slice:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Remaining implementation priority after this documentation slice:
  - product-visible Path A remains preferred: finish the Owner-supervised
    daily browser loop over existing Growth service facades, then Owner
    audit/correction UI, then stage-checkpoint UI, then target/domain-pack
    generalization. Backend automation evidence remains secondary and must
    stay non-writeful unless later release gates are explicitly satisfied.

## 2026-06-15 Growth Release-Readiness Architecture Harness Closure

- Status: release-readiness architecture guard is now wired into the Growth
  focused Harness. This slice does not deploy, enable Gateway config, enable
  writeful execution, enable scheduler ticks, enable the worker timer, deliver
  notifications, or change production runtime config.
- Change classification: H2 backend contract/Harness update.
- Scope:
  - updated `tests/growth-architecture-boundary.test.js` so the Service First
    guard now asserts release-readiness composition root wiring, store facade
    repository wiring, route glue, service dependencies, repository ownership,
    summary-only persistence, and forbidden direct behavior;
  - route guard now covers
    `/api/v1/growth/automation/release-readiness`,
    `/api/v1/growth/automation/release-readiness/snapshots`,
    `normalizeAutomationReleaseReadiness*`, and
    `learningAutomationReleaseReadinessService` delegation;
  - service guard now proves release-readiness can use only read/list/dry-run
    dependencies and snapshot persistence while keeping
    `writefulSchedulingAllowed=false` and `advisoryOnly=true`;
  - service guard blocks direct Gateway/vendor calls, direct plan publication,
    accepted-proposal publication, card generation, evaluation, scheduler
    execution, scheduler run, handoff delivery, event emission, stage
    activation, raw learning table access, and raw learner/private payload
    markers in the release-readiness service;
  - repository guard now covers
    `learning_growth_automation_release_readiness`,
    `createLearningAutomationReleaseReadinessRepository`, `saveSnapshot`,
    `listSnapshots`, `summary_only`, privacy class rejection, status
    validation, and public DTO boundary.
- Files changed in this slice:
  - `tests/growth-architecture-boundary.test.js`;
  - `.agent-context/HANDOFF.md`.
- Focused validation passed:
  - syntax checks:
    `node -c src/services/learning-automation-release-readiness-service.js`,
    `node -c src/stores/growth-learning-sqlite/automation-release-readiness.js`,
    `node -c src/routes/growth-routes.js`, and
    `node -c tests/growth-architecture-boundary.test.js`;
  - `node --test tests/learning-automation-release-readiness-repository.test.js
    tests/learning-automation-release-readiness-service.test.js` (`8` tests);
  - `node --test tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`47` tests);
  - combined automation backend gate:
    `node --test tests/learning-automation-release-readiness-repository.test.js
    tests/learning-automation-release-readiness-service.test.js
    tests/learning-automation-scheduler-worker-target-repository.test.js
    tests/learning-automation-scheduler-worker-target-service.test.js
    tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/learning-automation-scheduler-worker-service.test.js
    tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/learning-automation-scheduler-execution-repository.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/learning-automation-digest-repository.test.js
    tests/learning-automation-digest-service.test.js
    tests/learning-automation-failure-policy-repository.test.js
    tests/learning-automation-failure-policy-service.test.js
    tests/learning-automation-action-handoff-repository.test.js
    tests/learning-automation-action-handoff-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`123` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`412` tests);
  - `codegraph sync && codegraph status` (`199` JavaScript files, `2,351`
    nodes, `9,720` edges; index up to date).
- AI Ops control-plane evidence:
  - intake classified the touched Growth harness/handoff slice as `H3`
    Architecture Documentation And Harness Map; visual lane and deployment
    were not required;
  - Home AI required checks passed:
    `node tests/architecture-code-test-harness-map.test.js`,
    `node --check
    /Users/hermes-dev/HermesMobileDev/plugins/growth/tests/growth-architecture-boundary.test.js`,
    and Home AI `git diff --check`;
  - appended evidence record
    `evidence-86ff29e5-3d4e-48a0-b358-4b23615c80a5` to
    `/Users/xuxin/.homeai-qa/evidence-ledger.jsonl`.
- Remaining gates before any production scheduling or unattended automation:
  - Owner daily UI and audit/correction UI product closure;
  - proposal/digest/action/execution/run/worker-target/release-readiness UI;
  - platform Action Inbox/Web Push evidence in Home AI;
  - central embedded-plugin visual evidence;
  - production planner readiness smoke and production scheduler dry-run
    evidence;
  - reviewed enabled production worker targets;
  - explicit release approvals for each writeful config gate.

## 2026-06-15 Growth AI Learning Scheme Documentation Completion

- Status: Growth-local scheme documentation has been tightened for the
  AI-driven closed learning loop and release-readiness evidence boundary. This
  documentation slice does not deploy, enable Gateway config, enable
  scheduling, enable writeful execution, deliver notifications, or change
  production runtime config.
- Change classification: H2 product/architecture documentation update.
- Scope:
  - documented the end-to-end learning mechanism from view-target/provisioning
    through knowledge graph, Profile V2, Gateway planning, validated draft,
    daily card publication, one-shot learner evaluation, evidence ledger,
    profile-delta audit, Owner correction, and next recommendation;
  - clarified that daily practice is the low-pressure 10-15 minute loop and
    stage assessment remains a separate formal checkpoint loop owned by
    `learning-stage-assessment-service`;
  - updated release-readiness wording from planned-only to a Growth-owned
    advisory backend boundary:
    `learning-automation-release-readiness-service`,
    `automation-release-readiness.js`,
    `learning_growth_automation_release_readiness`,
    `GET /api/v1/growth/automation/release-readiness`,
    `GET /api/v1/growth/automation/release-readiness/snapshots`, and
    Owner-only `POST /api/v1/growth/automation/release-readiness/snapshots`;
  - recorded the response contract: stable checks, summary-only evidence,
    config booleans, `readyForOwnerLoop`, `readyForReleaseReview`,
    `releaseReview.advisoryOnly=true`, and
    `writefulSchedulingAllowed=false`;
  - recorded remaining release gaps: product UI evidence, platform
    Action Inbox/Web Push evidence, central embedded-plugin visual evidence,
    production planner readiness smoke, production scheduler dry-run evidence,
    reviewed target evidence, and explicit release approval records.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed for this documentation slice:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=35`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `codegraph status` (`199` JavaScript files, `2,351` nodes, `9,720`
    edges; index up to date).

## 2026-06-15 Growth AI Learning Next-Stage Plan Documentation Slice

- Status: documentation-only next-stage scheme is added. No runtime code,
  database schema, production config, deployment, Gateway config, or scheduler
  enablement changed in this slice.
- Change classification: H2 product/architecture documentation update.
- Scope:
  - added `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md` as the durable
    next-stage execution selector;
  - recorded the preferred next product path as Owner-supervised daily browser
    loop closure over `learning-daily-loop-service`;
  - recorded the backend-only alternative as a release-readiness evidence
    boundary that may persist summary-only snapshots but must not call
    Gateway, publish, evaluate, execute scheduling, run scheduler ticks,
    deliver notifications, activate stage assessments, or mutate learner
    state;
  - documented Fanfan science daily-card sample parameters, readiness
    semantics, release-readiness service/repository/route plan, harness matrix,
    and definition of done;
  - added the new doc to `scripts/check-growth-docs-locality.js` required and
    current docs.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Remaining planned implementation choices from that slice, superseded by the
  newer documentation-completion section above:
  - preferred: finish Owner daily UI, then Owner audit/correction UI;
  - backend-only alternative: the release-readiness boundary is now represented
    in the workspace by
    `learning-automation-release-readiness-service`,
    `automation-release-readiness.js`, and bounded readiness/snapshot routes;
    keep it evidence-only and validate with focused repository/service/route/
    architecture harnesses before treating the backend slice as closed;
  - background writeful scheduling remains blocked until product UI, audit UI,
    proposal/digest/action/execution/run UI, platform Action Inbox/Web Push
    evidence, central visual evidence, production dry-run evidence, reviewed
    enabled worker targets, and explicit release approval exist.

## 2026-06-15 Growth AI Learning Scheme Documentation Refresh

- Status: Growth-local scheme documents are updated for the next AI-driven
  learning-loop plan and the scheduler worker target gate. This slice is
  documentation-only and does not enable production automation, deploy, or
  change runtime config.
- Change classification: H2 architecture/product documentation update.
- Scope:
  - clarified that the product goal is the complete supervised AI learning
    loop, not card generation alone;
  - kept the immediate product-visible priority as Owner-supervised daily UI,
    then Owner audit/correction UI, then formal checkpoint UI, then generalized
    target/domain-pack UI;
  - documented that model-entered steps remain limited to Gateway-only
    planning, authoring, and evaluation with draft-before-write validation;
  - documented the reviewed worker target gate through
    `learning-automation-scheduler-worker-target-service`,
    `automation-scheduler-worker-targets.js`,
    `learning_growth_automation_scheduler_worker_targets`, and
    `/api/v1/growth/automation/scheduler/worker-targets` list/create/review
    routes;
  - recorded that `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` is local
    fallback only and is not production approval;
  - updated service, route, persistence, safety-gate, forbidden-boundary, and
    harness expectations for worker targets.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed for this docs slice:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=34`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Remaining implementation/product gates:
  - Owner daily UI, Owner audit/correction UI, stage-checkpoint UI, target
    provision UI, proposal/digest/action/execution/run/worker-target UI,
    platform Action Inbox/Web Push evidence, central visual evidence,
    production dry-run evidence, and explicit release approval remain future
    gates before unattended production scheduling.

## 2026-06-15 Growth Scheduler Worker Target Backend Slice

- Status: reviewed scheduler worker target backend is implemented and covered
  by focused repository, service, route, worker integration, and architecture
  harnesses. This slice does not enable production background scheduling, does
  not deploy, and does not change production config.
- Change classification: H2 backend workflow and persistence boundary.
- Scope:
  - added `learning-automation-scheduler-worker-target-service`;
  - added `automation-scheduler-worker-targets.js` and
    `learning_growth_automation_scheduler_worker_targets`;
  - added `stableLearningAutomationSchedulerWorkerTargetId`;
  - wired the repository through `growth-learning-sqlite-store`;
  - wired the service through `src/app/services.js`;
  - wired `learning-automation-scheduler-worker-service` to prefer reviewed
    enabled persistent targets before local environment fallback;
  - added visible-target scoped
    `GET /api/v1/growth/automation/scheduler/worker-targets`;
  - added Owner-only
    `POST /api/v1/growth/automation/scheduler/worker-targets`;
  - added Owner-only
    `POST /api/v1/growth/automation/scheduler/worker-targets/:targetId/review`;
  - added `tests/learning-automation-scheduler-worker-target-repository.test.js`;
  - added `tests/learning-automation-scheduler-worker-target-service.test.js`;
  - updated worker service, route, and architecture harnesses for reviewed
    target precedence and forbidden boundaries.
- Boundaries:
  - target creation requires target/domain-pack/subject provisioning before a
    `proposed` summary-only row is stored;
  - review can move targets to `enabled`, `disabled`, or `archived`;
  - enabling rechecks provisioning;
  - archived rows cannot be re-enabled;
  - `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON` remains a local
    fallback only and is not production approval;
  - worker target service must not call Gateway, scheduler run/execution, plan
    publication, card generation, notifications, stage assessment, or learner
    state repositories.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Focused validation passed:
  - syntax checks for worker-target service/repository, worker service, and
    route wiring;
  - `node --test tests/learning-automation-scheduler-worker-target-repository.test.js
    tests/learning-automation-scheduler-worker-target-service.test.js
    tests/learning-automation-scheduler-worker-service.test.js` (`14` tests);
  - `node --test tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`46` tests);
  - combined automation scheduler/worker-target gate:
    `node --test tests/learning-automation-scheduler-worker-target-repository.test.js
    tests/learning-automation-scheduler-worker-target-service.test.js
    tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/learning-automation-scheduler-worker-service.test.js
    tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`84` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=34`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`403` tests);
  - `codegraph sync && codegraph status` (`195` JavaScript files, `2,288`
    nodes, `9,446` edges; index up to date).
- Additional no-write readiness check:
  - `npm run smoke:planner-readiness -- --workspace-id weixin_stephen
    --learner-id fanfan --domain-pack-id uk_hk_curriculum_foundation
    --domain science --subject science --horizon daily_plan
    --available-minutes 15 --json` returned
    `ok=false`, `error=gateway_endpoint_required`, with summary-only context
    and no durable writes. This is expected in the current shell without real
    planner Gateway config and is not production readiness evidence.
- Remaining gates before production unattended scheduling:
  - Owner automation UI, platform Action Inbox/Web Push evidence, central
    visual evidence, production dry-run evidence, reviewed enabled production
    targets, explicit scheduler/worker release config, and explicit release
    approval remain future gates.

## 2026-06-15 Growth Scheduler Worker Lease Backend Slice

- Status: default-disabled scheduler worker/lease backend is now implemented
  locally. This slice does not enable production background scheduling, does
  not deploy, and does not change production config.
- Change classification: H2 backend workflow, timer glue, and persistence
  boundary.
- Scope:
  - added `learning-automation-scheduler-worker-service`;
  - added `automation-scheduler-worker-leases.js` and
    `learning_growth_automation_scheduler_worker_leases`;
  - added `stableLearningAutomationSchedulerWorkerLeaseId`;
  - wired the repository through `growth-learning-sqlite-store`;
  - wired the service through `src/app/services.js`;
  - added default-disabled env/config:
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED`,
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON`,
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_INTERVAL_MS`,
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_LEASE_MS`, and
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_ID`;
  - added optional HTTP timer glue in `src/app/http-server.js`, gated by
    `GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED=false` by default;
  - added `tests/learning-automation-scheduler-worker-lease-repository.test.js`;
  - added `tests/learning-automation-scheduler-worker-service.test.js`;
  - updated `tests/growth-routes.test.js` to prove the worker timer is inert
    while disabled and calls only `tickTargets` when explicitly enabled;
  - updated `tests/growth-architecture-boundary.test.js` with worker/lease
    Service First and forbidden-boundary guards.
- Boundaries:
  - worker service may claim/release summary-only leases and call only
    `learning-automation-scheduler-run-service.runOnce`;
  - run service still enforces
    `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED`, so enabling the worker
    alone cannot list handoffs or publish cards;
  - worker service must not call Gateway, list handoffs, execute scheduler
    actions directly, publish plans, generate cards, notify Action Inbox/Web
    Push, activate stage assessments, or read/write learner state directly;
  - the internal lease nonce is not exposed in public DTOs and is only used to
    prevent stale-worker release races.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Focused validation passed:
  - syntax checks for worker service/repository/tests and wiring files;
  - `node --test tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/learning-automation-scheduler-worker-service.test.js` (`10` tests);
  - `node --test tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`45` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=34`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - combined automation scheduler/worker gate:
    `node --test tests/learning-automation-scheduler-worker-lease-repository.test.js
    tests/learning-automation-scheduler-worker-service.test.js
    tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`75` tests);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`394` tests);
  - `codegraph sync && codegraph status` (`191` JavaScript files,
    `2,237` nodes, `9,209` edges; index up to date).
- Remaining production gates:
  - Owner automation UI, platform Action Inbox/Web Push evidence, central
    visual evidence, production dry-run evidence, reviewed worker target
    config, and explicit release approval remain future gates.

## 2026-06-15 Growth Background Scheduler Run Backend Slice

- Status: default-disabled supervised scheduler run/tick backend is now
  implemented and covered by focused repository, service, route, and
  architecture harnesses. This slice does not enable production background
  scheduling, does not deploy, and does not change production config.
- Change classification: H2 backend workflow and persistence boundary.
- Scope:
  - fixed `learning-automation-scheduler-run-service` so invalid mode fails
    closed with a blocked run, disabled config records blocked state without
    downstream calls, and started/final records for one tick reuse the same
    stable `runId` and `createdAt`;
  - fixed `automation-scheduler-runs.js` migration order so legacy tables add
    bounded columns before indexes are created;
  - added domain and horizon filters to scheduler run listing;
  - added `tests/learning-automation-scheduler-run-repository.test.js`;
  - added `tests/learning-automation-scheduler-run-service.test.js`;
  - updated `tests/growth-routes.test.js` for
    `GET /api/v1/growth/automation/scheduler/runs` and Owner-only
    `POST /api/v1/growth/automation/scheduler/run-once`;
  - updated `tests/growth-architecture-boundary.test.js` with scheduler-run
    wiring and no-direct-Gateway/direct-publish/direct-card-generation/
    stage-activation/table-access guards.
- Boundaries:
  - scheduler run service may list delivered handoffs through
    `learning-automation-action-handoff-service.listHandoffs` only when
    `GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED=true`;
  - each delivered action delegates only to
    `learning-automation-scheduler-execution-service.executeOnce`;
  - scheduler run service must not call Gateway, direct plan publication, card
    generation, authoring, evaluation, Action Inbox/Web Push, queues/workers,
    stage-assessment activation, or SQLite tables directly;
  - production unattended scheduling remains blocked until Owner automation
    UI, platform action evidence, central visual evidence, production dry-run
    evidence, and explicit release approval exist.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Focused validation passed:
  - syntax checks for scheduler-run service/repository/tests;
  - `node --test tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js` (`10` tests);
  - `node --test tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`54` tests).
- Broad validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=34`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - scheduler-run focused gate:
    `node --test tests/learning-automation-scheduler-run-repository.test.js
    tests/learning-automation-scheduler-run-service.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`64` tests);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`383` tests);
  - `codegraph sync && codegraph status` (`187` JavaScript files,
    `2,186` nodes, `8,991` edges; index up to date).
- Remaining gates before production scheduling:
  - Owner automation UI, platform Action Inbox/Web Push evidence, central
    visual evidence, production dry-run evidence, and release approval remain
    future product gates.

## 2026-06-15 Growth Background Scheduler Scheme Documentation Slice

- Status: Growth-local documentation for the background scheduler contract is
  now added and cross-linked. This slice does not enable production background
  scheduling, does not deploy, and does not change production config.
- Purpose:
  - separate four boundaries that must not be conflated: read-only scheduler
    dry-run, default-disabled Owner `execute-once`, default-disabled supervised
    scheduler `run-once` tick, and any future unattended worker;
  - make `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md` the
    owning document before changing scheduler run/tick behavior, scheduler
    config, run persistence, or a future worker;
  - record that scheduler ticks may coordinate delivered handoff actions only
    by delegating to `learning-automation-scheduler-execution-service`;
  - keep Gateway-only, Service First, summary-only, no-direct-publish, and
    no-stage-assessment-activation constraints explicit.
- Documentation updated:
  - added `docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md`;
  - updated `docs/GROWTH_DOCS_INDEX.md`;
  - updated `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - updated `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - updated `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - updated `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - updated `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - updated `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - updated `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - updated `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md`;
  - updated `scripts/check-growth-docs-locality.js`;
  - updated `.agent-context/PROJECT_CONTEXT.md`;
  - updated `.agent-context/HANDOFF.md`.
- Validation target for this docs slice:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.
- Remaining implementation gates:
  - scheduler-run repository/service/route/architecture harnesses are required
    before the scheduler tick boundary is considered closed;
  - Owner automation UI, platform Action Inbox/Web Push evidence, central
    visual evidence, production dry-run evidence, and explicit release approval
    are still required before any background scheduling can be enabled.

## 2026-06-15 Growth Automation Scheduler Execution Documentation Closure

- Status: Growth-local documentation for the default-disabled
  Owner-explicit scheduler execution boundary is now synchronized across the
  scheme, implementation plan, roadmap, operating-loop blueprint, architecture
  map, platform pointer, and workspace context. This slice does not enable
  production writeful automation or background scheduling.
- Purpose:
  - make `docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md` the
    owning document for `owner_explicit_once` execution changes;
  - distinguish three separate boundaries: read-only scheduler dry-run,
    default-disabled Owner `execute-once`, and future background scheduler;
  - record that execution requires delivered handoff, reviewed digest, active
    failure-policy readiness, matching read-only dry-run candidate, accepted
    proposal, Owner role, workspace bearer, visible target, and
    `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`;
  - keep Service First/Gateway-only/summary-only constraints explicit:
    execution delegates only to accepted-proposal publish and must not call
    Gateway, direct plan publish, card generation, notifications, queues,
    stage-assessment activation, or SQLite tables directly.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`
    (`requiredCount=33`, no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - focused scheduler-execution gate:
    `node --test tests/learning-automation-scheduler-execution-repository.test.js
    tests/learning-automation-scheduler-execution-service.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`56` tests);
  - `npm run --silent check`;
  - `npm test` (`372` tests);
  - `codegraph sync && codegraph status` (`183` JavaScript files, `2,137`
    nodes, `8,765` edges; index up to date).
- Remaining product gates:
  - Owner daily UI, audit/correction UI, proposal review UI,
    digest/action/failure-policy/execution UI, platform Action Inbox/Web Push
    evidence, central visual evidence, production dry-run evidence, and an
    explicit release decision are still required before enabling
    `GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED=true`;
  - background scheduler remains a future contract and must not be inferred
    from the implemented `execute-once` backend.

## 2026-06-15 Growth AI Learning System Scheme Documentation Slice

- Status: Growth-local system scheme documentation is updated. This slice does
  not change service code, routes, repositories, database schema, UI,
  production config, deployment state, scheduler behavior, or model behavior.
- Purpose:
  - make the full AI-guided learning product scheme durable in the Growth
    plugin workspace rather than relying on thread-local planning notes;
  - define the product thesis, non-negotiable principles, persistent-state
    source of truth, low-pressure daily policy, formal assessment separation,
    Owner audit/correction responsibilities, Growth/Home AI ownership split,
    model-entered steps, Owner modes, automation maturity ladder,
    implementation package sequence, and harness contract;
  - make later implementation threads start from a Growth-local scheme before
    editing UI, services, repositories, or scheduling logic.
- Documentation updated:
  - added `docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md`;
  - updated `docs/GROWTH_DOCS_INDEX.md` reading order so the system scheme is
    read after the platform pointer and before closed-loop implementation
    docs;
  - updated `scripts/check-growth-docs-locality.js` so the system scheme is a
    required current Growth doc;
  - updated `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - updated `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - updated `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - updated `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - updated `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - updated `docs/GROWTH_AI_CARD_LOOP.md`;
  - updated `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - updated `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - updated `.agent-context/PROJECT_CONTEXT.md`;
  - updated `.agent-context/HANDOFF.md`.
- Implementation guidance:
  - next product-visible slice should remain Owner-supervised daily UI over the
    existing daily-loop facade;
  - audit/correction UI should follow before broader automation trust;
  - writeful scheduling must remain blocked until Owner UI, audit UI,
    proposal/digest/action UI, active failure policy, platform action evidence,
    visual evidence, and scheduler execution harnesses exist.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=32`, no
    missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `rg -n "scheme entry point|single scheme entry" docs scripts
    .agent-context/PROJECT_CONTEXT.md -S` returned no matches.

## 2026-06-15 Growth Automation Action Handoff Backend Slice

- Status: automation action handoff backend is implemented locally and
  documented. This does not implement digest UI, proposal review UI,
  platform Action Inbox/Web Push internals, writeful scheduling, production
  deployment, or visual evidence.
- Change classification: H2 backend workflow and persistence boundary. It adds
  summary-only handoff persistence and bounded notification delivery metadata
  for future scheduling safety, but it does not publish cards, enqueue learning
  work, call Gateway, record proposal execution, or authorize automatic
  execution.
- Scope:
  - added
    `src/stores/growth-learning-sqlite/automation-action-handoffs.js`;
  - added `stableLearningAutomationActionHandoffId` in
    `src/stores/growth-learning-sqlite/identifiers.js`;
  - exposed `learningAutomationActionHandoffRepository` from
    `src/stores/growth-learning-sqlite-store.js`;
  - added `src/services/learning-automation-action-handoff-service.js`;
  - added `learningAutomationDigestService.getDigest`;
  - wired `learningAutomationActionHandoffService` in `src/app/services.js`;
  - added `growth.automation.action_required` event mapping in
    `src/services/growth-event-service.js`;
  - added visible-target scoped
    `GET /api/v1/growth/automation/action-handoffs`;
  - added Owner-only
    `POST /api/v1/growth/automation/action-handoffs`;
  - added Owner-only
    `POST /api/v1/growth/automation/action-handoffs/:handoffId/deliver`;
  - handoff creation requires a reviewed digest and active failure-policy
    readiness before saving a summary-only handoff row;
  - delivery emits bounded metadata through `growth-event-service` and records
    `delivered` or `delivery_failed`;
  - delivery failure is visible but does not mutate learner evidence, profile,
    rewards, card state, proposal execution, or scheduler state.
- Boundaries:
  - action-handoff service may read reviewed digest state through
    `learning-automation-digest-service.getDigest`, check policy readiness
    through `learning-automation-failure-policy-service.evaluateReadiness`,
    save/deliver through its repository, and emit through
    `growth-event-service`;
  - action-handoff service must not call Gateway, model vendors, scheduler
    dry-run, plan publication, card generation, accepted-proposal publication,
    proposal execution recording, queues/workers, stage-assessment activation,
    or SQLite tables directly;
  - repository rejects privacy-risk keys and non-summary privacy classes,
    supports idempotent stable ids, migrates bounded delivery/readiness
    columns before indexes, returns public DTOs, and keeps duplicate delivered
    records idempotent;
  - route logic remains request/auth/target glue.
- Harness/code updated:
  - `src/stores/growth-learning-sqlite/automation-action-handoffs.js`;
  - `src/stores/growth-learning-sqlite/identifiers.js`;
  - `src/stores/growth-learning-sqlite-store.js`;
  - `src/services/learning-automation-action-handoff-service.js`;
  - `src/services/learning-automation-digest-service.js`;
  - `src/services/growth-event-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-automation-action-handoff-repository.test.js`;
  - `tests/learning-automation-action-handoff-service.test.js`;
  - `tests/learning-automation-digest-service.test.js`;
  - `tests/growth-event-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `scripts/check-growth-docs-locality.js`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for touched action-handoff service/repository/digest
    service/event/wiring/routes;
  - focused gate:
    `node --test tests/learning-automation-action-handoff-repository.test.js
    tests/learning-automation-action-handoff-service.test.js
    tests/learning-automation-digest-service.test.js
    tests/growth-event-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`62` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=31`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`363` tests);
  - CodeGraph status (`179` JavaScript files, `2,084` nodes, `8,498`
    edges; no stale-file warning).
- Remaining product gaps:
  - Owner daily UI, audit/correction UI, proposal review UI, digest UI,
    action handoff UI / platform Action Inbox-Web Push evidence, visual
    evidence, and writeful scheduler remain future work.

## 2026-06-15 Growth Automation Failure Policy Backend Slice

- Status: automation rollback/failure-policy backend is implemented locally
  and documented. This does not implement digest UI, proposal review UI,
  notification/Action Inbox handoff, writeful scheduling, production
  deployment, or visual evidence.
- Change classification: H2 backend workflow and persistence boundary. It adds
  summary-only policy persistence and readiness readback for future scheduling
  safety, but it does not publish cards, enqueue work, call Gateway, or
  authorize automatic execution.
- Scope:
  - added
    `src/stores/growth-learning-sqlite/automation-failure-policies.js`;
  - added `stableLearningAutomationFailurePolicyId` in
    `src/stores/growth-learning-sqlite/identifiers.js`;
  - exposed `learningAutomationFailurePolicyRepository` from
    `src/stores/growth-learning-sqlite-store.js`;
  - added `src/services/learning-automation-failure-policy-service.js`;
  - wired `learningAutomationFailurePolicyService` in `src/app/services.js`;
  - added visible-target scoped
    `GET /api/v1/growth/automation/failure-policies`;
  - added visible-target scoped
    `GET /api/v1/growth/automation/failure-policies/readiness`;
  - added Owner-only
    `POST /api/v1/growth/automation/failure-policies`;
  - added Owner-only
    `POST /api/v1/growth/automation/failure-policies/:policyId/review`;
  - policy creation stores a draft summary-only policy/rollback/failure packet;
  - Owner review can move a draft policy to `active`, `archived`, or
    `superseded`;
  - readiness reports `readyForWritefulAutomationPrerequisite=true` only when
    an active scoped policy exists, while always keeping
    `writefulSchedulingAllowed=false`.
- Boundaries:
  - failure-policy service must not call Gateway, model vendors, plan
    publication, card generation, accepted-proposal publication, scheduler
    dry-run, notifications, Action Inbox, queues/workers, stage-assessment
    activation, or SQLite tables directly;
  - repository rejects privacy-risk keys and non-summary privacy classes,
    supports idempotent stable ids, migrates bounded review/policy-version
    columns, returns public DTOs, and rejects conflicting terminal reviews;
  - route logic remains request/auth/target glue.
- Harness/code updated:
  - `src/stores/growth-learning-sqlite/automation-failure-policies.js`;
  - `src/stores/growth-learning-sqlite/identifiers.js`;
  - `src/stores/growth-learning-sqlite-store.js`;
  - `src/services/learning-automation-failure-policy-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-automation-failure-policy-repository.test.js`;
  - `tests/learning-automation-failure-policy-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `scripts/check-growth-docs-locality.js`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for touched failure-policy service/repository/wiring/routes;
  - focused gate:
    `node --test tests/learning-automation-failure-policy-repository.test.js
    tests/learning-automation-failure-policy-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`50` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=30`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `npm run --silent check`;
  - `npm test` (`351` tests);
  - `git diff --check`;
  - CodeGraph status (`175` JavaScript files, `2,029` nodes, `8,255`
    edges; no stale-file warning).
- Remaining product gaps:
  - Owner daily UI, audit/correction UI, proposal review UI, digest UI,
    notification/Action Inbox handoff, visual evidence, and writeful scheduler
    remain future work.

## 2026-06-15 Growth AI Learning Implementation Plan Documentation Slice

- Status: Growth-local implementation scheme documentation is updated. This
  slice did not change service code, routes, repositories, database schema, UI,
  production config, or deployment state.
- Purpose:
  - turn the AI-driven Growth learning direction into a single execution-plan
    document that later Codex threads can use without relying on thread-local
    discussion;
  - make the target outcome, non-negotiable Service First/Gateway-only/
    summary-only boundaries, current backend baseline, model-entered steps,
    durable state ownership, delivery packages, immediate implementation
    choices, and package-level definition of done explicit;
  - keep writeful scheduling blocked until Owner UI/audit/proposal/digest,
    rollback/failure policy, notification/Action Inbox handoff, and harness
    evidence exist.
- Scope:
  - added `docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md`;
  - updated `docs/GROWTH_DOCS_INDEX.md` so the new implementation plan is part
    of the current Growth docs and scheme reading order;
  - updated `scripts/check-growth-docs-locality.js` so the implementation plan
    is required and scanned with the current Growth docs;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md`,
    `docs/GROWTH_LEARNING_OPERATING_LOOP.md`,
    `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`,
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`, and
    `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` to point to the
    execution plan;
  - updated `docs/HOME_AI_PLATFORM_CONTRACT.md` with a Growth-local pointer
    row for the implementation plan;
  - updated `.agent-context/PROJECT_CONTEXT.md` with the new durable plan
    entry.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=29`, no
    missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Remaining product gaps are unchanged:
  - Owner daily UI, audit/correction UI, proposal review UI, digest UI,
    rollback/failure policy, notification/Action Inbox handoff, visual
    evidence, and writeful scheduler remain future work.

## 2026-06-15 Growth Automation Digest Backend Slice

- Status: supervised automation digest backend is implemented locally and
  documented. This does not implement digest UI, notifications, Action Inbox,
  rollback policy, writeful scheduling, production deployment, or visual
  evidence.
- Change classification: H1/H2 backend workflow and persistence boundary. It
  adds summary-only digest persistence over scheduler dry-run results and
  Owner review metadata, but does not publish cards or enqueue work.
- Scope:
  - added `src/stores/growth-learning-sqlite/automation-digests.js`;
  - added `stableLearningAutomationDigestId` in
    `src/stores/growth-learning-sqlite/identifiers.js`;
  - exposed `learningAutomationDigestRepository` from
    `src/stores/growth-learning-sqlite-store.js`;
  - added `src/services/learning-automation-digest-service.js`;
  - wired `learningAutomationDigestService` in `src/app/services.js`;
  - added visible-target scoped `GET /api/v1/growth/automation/digests`;
  - added Owner-only `POST /api/v1/growth/automation/digests`;
  - added Owner-only
    `POST /api/v1/growth/automation/digests/:digestId/review`;
  - digest create calls only `learning-automation-scheduler-service.dryRun`,
    verifies `dryRun=true`, `writePlanned=false`, `writesPerformed=false`,
    and `publishPlanned=false`, then writes a summary-only digest row;
  - digest review records bounded Owner review metadata only.
- Boundaries:
  - digest service must not call Gateway, model vendors, plan publication,
    card generation, proposal publish execution, notifications, Action Inbox,
    queues/workers, stage-assessment activation, or SQLite tables directly;
  - digest repository rejects privacy-risk keys and non-summary privacy
    classes, returns public DTOs, supports idempotent stable ids, and migrates
    bounded review columns;
  - digest route logic remains request/auth/target glue.
- Harness/code updated:
  - `src/stores/growth-learning-sqlite/automation-digests.js`;
  - `src/stores/growth-learning-sqlite/identifiers.js`;
  - `src/stores/growth-learning-sqlite-store.js`;
  - `src/services/learning-automation-digest-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-automation-digest-repository.test.js`;
  - `tests/learning-automation-digest-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for touched digest service/repository/wiring/routes/tests;
  - `node --test tests/learning-automation-digest-repository.test.js
    tests/learning-automation-digest-service.test.js` (`8` tests);
  - `node --test tests/growth-routes.test.js` (`29` tests);
  - `node --test tests/growth-architecture-boundary.test.js` (`11` tests);
  - expanded digest focused gate:
    `node --test tests/learning-automation-digest-repository.test.js
    tests/learning-automation-digest-service.test.js
    tests/learning-automation-scheduler-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`53` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=28`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `npm run --silent check`;
  - `npm test` (`341` tests);
  - CodeGraph status (`171` JavaScript files, `1,978` nodes, `8,034`
    edges; index up to date).
- Remaining product gaps:
  - Owner daily UI, audit/correction UI, proposal review UI, digest UI,
    rollback/failure policy, notification/Action Inbox handoff, visual
    evidence, and writeful scheduler remain future work.

## 2026-06-15 Growth Automation Digest Scheme Documentation Slice

- Status: documentation and docs-locality harness are updated for the
  supervised automation digest gate. No service, route, database, UI,
  production, or deployment behavior was changed in this slice.
- Purpose:
  - define the required digest layer between scheduler dry-run evidence and
    any future writeful scheduler;
  - prevent future scheduling work from skipping Owner-reviewable dry-run
    packets, rollback/failure policy, notification/action handoff, or visual
    evidence.
- Scope:
  - added `docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md`;
  - updated `docs/GROWTH_DOCS_INDEX.md` so the new digest plan is part of the
    Growth-local scheme reading order;
  - updated `scripts/check-growth-docs-locality.js` so the digest plan is a
    required current Growth doc and is scanned for forbidden app Growth doc
    pointers;
  - updated `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` with the digest
    service/repository/route boundary and scheduler block;
  - updated `docs/GROWTH_AI_LEARNING_ROADMAP.md` so Stage 6 is
    "supervised digest and scheduling readiness" rather than writeful
    scheduling;
  - updated `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` with the
    future digest package, state-machine row, durable-record row, and harness
    row;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md` with the digest gate in the
    architecture backlog, extraction targets, and harness map;
  - updated `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` with the later
    automation digest review panel and UI harness expectation;
  - updated `docs/GROWTH_LEARNING_OPERATING_LOOP.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md` with the same durable boundary.
- Digest boundary now documented:
  - future service: `learning-automation-digest-service`;
  - future repository/table: `automation-digests.js` and
    `learning_growth_automation_digests`;
  - future routes: `GET /api/v1/growth/automation/digests`,
    `POST /api/v1/growth/automation/digests`, and
    `POST /api/v1/growth/automation/digests/:digestId/review`;
  - digest creation/review must not call Gateway, publish, record proposal
    execution, notify, call Action Inbox, enqueue, or activate formal
    assessment.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=28`, no
    missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Next implementation priority remains Owner-supervised daily UI and
  audit/correction UI before proposal review UI, digest backend/UI, and any
  writeful scheduler work.

## 2026-06-15 Growth Owner Daily-Loop Backend Facade Slice

- Status: Owner daily-loop backend facade is implemented locally and
  documented. This does not complete the embedded UI and does not deploy.
- Change classification: H1/H2 backend workflow boundary. It adds Owner-only
  daily-loop preview/draft/publish routes over existing services, but does not
  add a new model boundary, scheduler, notification handoff, or direct SQLite
  access.
- Scope:
  - added `src/services/learning-daily-loop-service.js`;
  - wired `learningDailyLoopService` in `src/app/services.js`;
  - added Owner-only `GET /api/v1/growth/daily-loop/preview`;
  - added Owner-only `POST /api/v1/growth/daily-loop/draft`;
  - added Owner-only `POST /api/v1/growth/daily-loop/publish`;
  - routes enforce Owner role and Growth visible-target scope; write routes
    also require workspace bearer authorization;
  - service composes `learning-card-generation-context-service`,
    `learning-plan-publisher-service`, `learning-cycle-audit-service`, and
    `learning-audit-completeness-service`;
  - preview returns bounded context/readiness/actions plus optional cycle audit
    and completeness readback;
  - draft delegates to `learning-plan-publisher-service.draftPlan`;
  - publish delegates to `learning-plan-publisher-service.publishPlanItem`,
    strips generated authoring draft internals, and refreshes bounded cycle
    audit plus completeness DTOs even when publication fails;
  - service rejects privacy-risk keys before downstream calls.
- Boundaries:
  - the daily-loop service must not call Gateway directly, create Gateway
    clients, call card generation directly, inspect SQLite tables, send
    notifications, call Action Inbox, activate stage assessments, or start any
    scheduler;
  - lower-level `learning-plans/draft` and `learning-plans/:id/publish` remain
    available service boundaries, but the next embedded UI should prefer the
    daily-loop facade.
- Harness/code updated:
  - `src/services/learning-daily-loop-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-daily-loop-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for daily-loop service, app services, routes, and touched
    tests;
  - focused route/service/architecture gate:
    `node --test tests/learning-daily-loop-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`47` tests);
  - expanded daily-loop focused gate:
    `node --test tests/learning-daily-loop-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-audit-completeness-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`72` tests);
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `npm run --silent check`;
  - `npm test` (`333` tests);
  - `git diff --check`.
  - CodeGraph status (`167` JavaScript files, `1,926` nodes, `7,786`
    edges).
- Remaining:
  - embedded UI consumption, frontend adapter/layout tests, central visual
    harness, production planner readiness smoke, and deployment remain future
    slices.

## 2026-06-15 Growth Supervised Scheduler Dry-Run Slice

- Status: read-only supervised scheduler dry-run is implemented locally and
  documented. This is not a writeful scheduler and not automatic publication.
- Change classification: H1/H2 backend workflow boundary. It adds an Owner-only
  automation inspection route and service, but performs no durable writes,
  publication, model calls, notifications, or stage activation.
- Scope:
  - added `src/services/learning-automation-scheduler-service.js`;
  - wired `learningAutomationSchedulerService` in `src/app/services.js`;
  - added Owner-only
    `POST /api/v1/growth/automation/scheduler/dry-run`;
  - route requires workspace bearer authorization and Growth visible-target
    scope, then delegates to the scheduler service;
  - service lists `status=accepted` proposals through
    `learning-automation-proposal-service.listProposals`;
  - already-published proposal executions return `skipped_already_published`;
  - remaining accepted proposals recheck source-cycle audit completeness
    through `learning-audit-completeness-service`;
  - audit failures return `blocked_audit` before provisioning is checked;
  - provision failures return `blocked_provisioning`;
  - passing candidates return `would_publish` with an explicit proposal publish
    action, `dryRun=true`, `writePlanned=false`, `writesPerformed=false`, and
    `publishPlanned=false`;
  - the scheduler service must not call Gateway, model vendors,
    `publishPlanItem`, `publishAcceptedProposal`, card generation, authoring,
    evaluation, proposal execution recording, notifications, Action Inbox,
    stage-assessment activation, or direct SQLite tables.
- Harness/code updated:
  - `src/services/learning-automation-scheduler-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-automation-scheduler-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for scheduler service, app services, routes, and touched
    tests;
  - focused scheduler/route/architecture gate:
    `node --test tests/learning-automation-scheduler-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`43` tests).
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - expanded scheduler focused gate:
    `node --test tests/learning-automation-scheduler-service.test.js
    tests/learning-automation-proposal-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-target-provisioning-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`57` tests);
  - `npm run --silent check`;
  - `npm test` (`324` tests);
  - `git diff --check`;
  - CodeGraph status (`165` JavaScript files, `1,894` nodes, `7,588`
    edges).
- Remaining:
  - writeful scheduler remains future work and must wait for rollback/failure
    policy, Owner digest/review UI, and notification / Action Inbox handoff
    harness;
  - product-visible next slice remains Owner-supervised daily UI and
    audit/correction UI.

## 2026-06-15 Growth AI Learning Scheme Documentation Slice

- Status: Growth-local scheme documentation is expanded for the next planning
  and implementation phases. This was documentation-only; no service, route,
  database, UI, production, or deployment behavior was changed in this slice.
- Scope:
  - `docs/GROWTH_DOCS_INDEX.md` now defines the scheme reading order and
    requires every implementation slice to name its owning document, service
    boundary, DTO/persistence boundary, harness, and release evidence instead
    of relying on thread-local discussion;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md` now distinguishes current
    direct generation/backend capability from product-complete AI learning-loop
    capability, defines the end-state capability contract, and records the
    next Owner-supervised daily browser-loop execution package with explicit
    scope, non-goals, and acceptance requirements;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md` now defines a G1-G6 stage-gate map
    and a scheduler dry-run-first rule before any writeful scheduling worker,
    and its immediate next slice now has a ready-to-start contract for inputs,
    backend routes, UI outputs, failure states, and harness;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` now defines the
    implementation package contract: service boundary, DTO/persistence
    boundary, harness boundary, documentation boundary, release evidence
    boundary, and package closure checklist for the Owner-supervised daily
    loop;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md` now has the architecture optimization
    backlog for Owner daily UI, audit/correction UI, stage checkpoint UI,
    multi-workspace/domain-pack closure, proposal review UI, and scheduler
    dry-run;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md` now uses the same priority order
    and explicitly keeps scheduler work behind auditability;
  - `.agent-context/PROJECT_CONTEXT.md` now records that these Growth-local
    documents are the durable planning source for the staged AI learning loop.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Next implementation priority remains the Owner-supervised daily browser loop
  for one Fanfan science daily card, followed by Owner audit/correction UI.

## 2026-06-15 Growth Accepted Proposal Publish Execution Slice

- Status: accepted proposal publish execution is implemented locally and
  documented. This is still not a scheduler. It adds an explicit Owner action
  after proposal acceptance, delegates publication through the existing plan
  publisher, and records bounded proposal execution metadata for audit/retry.
- Change classification: H1 workflow state change because it touches accepted
  proposal execution, publication outcome visibility, idempotency, and
  persistent failure state.
- Scope:
  - `POST /api/v1/growth/automation/proposals/:proposalId/publish` is
    Owner-only, workspace-bearer authorized, and Growth visible-target scoped;
  - route logic delegates to
    `learningAutomationProposalService.publishAcceptedProposal`;
  - `publishAcceptedProposal` requires `status=accepted`;
  - proposed, skipped, expired, and superseded proposals fail closed with
    `learning_automation_proposal_not_accepted`;
  - accepted proposal publication delegates only to
    `learning-plan-publisher-service.publishPlanItem`;
  - successful execution records bounded generated task-card / graph-plan ids
    in `learning_growth_automation_proposals.execution_json`;
  - successful execution is idempotent and does not call the plan publisher
    again;
  - failed or blocked publication records bounded execution metadata and leaves
    the accepted proposal visible for explicit Owner retry;
  - legacy proposal tables are migrated with `execution_json`, `executed_by`,
    and `executed_at`;
  - proposal execution does not call Gateway directly, model vendors, card
    generation directly, authoring/evaluation services directly, formal
    stage-assessment activation, or any scheduler.
- Harness/code updated:
  - `src/stores/growth-learning-sqlite/automation-proposals.js`;
  - `src/services/learning-automation-proposal-service.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-automation-proposal-repository.test.js`;
  - `tests/learning-automation-proposal-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - syntax checks for updated proposal repository/service/routes/tests;
  - focused proposal gate:
    `node --test tests/learning-automation-proposal-repository.test.js
    tests/learning-automation-proposal-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-plan-publisher-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`62` tests).
  - `npm run --silent check`;
  - `npm test` (`319` tests);
  - `git diff --check`;
  - CodeGraph status (`163` JavaScript files, `1,865` nodes, `7,467`
    edges).

## 2026-06-15 Growth Supervised Automation Proposal Decision Slice

- Status: documentation and focused harness coverage are updated for the
  supervised automation proposal decision lifecycle. Repository-level
  privacy/summary-only guards and bounded decision persistence are implemented.
  This is the first
  non-scheduling automation layer: Growth can propose a next learning action
  from a completed auditable cycle and Owner can record an explicit proposal
  decision, but proposal creation/review must not publish cards, activate stage
  assessments, call Gateway directly, call card generation directly, or start a
  scheduler.
- Scope documented:
  - source-cycle id is required before proposal creation;
  - `learning-audit-completeness-service` must report readiness before a new
    plan draft is requested;
  - `learning-target-provisioning-service` must pass for the target learner,
    domain pack, domain, subject, and requested target nodes;
  - proposal creation may draft only through
    `learning-plan-publisher-service.draftPlan`;
  - proposal metadata is summary-only and belongs in
    `learning_growth_automation_proposals`;
  - `automation-proposals.js` rejects privacy-risk keys and non-summary
    privacy classes even if a caller bypasses the service layer;
  - `GET /api/v1/growth/automation/proposals` is visible-target read;
  - `POST /api/v1/growth/automation/proposals` is Owner-only write;
  - `POST /api/v1/growth/automation/proposals/:proposalId/decision` is
    Owner-only write and accepts only `accepted`, `skipped`, `expired`, and
    `superseded`;
  - an `accepted` proposal returns the explicit Owner publish action but does
    not publish the card;
  - duplicate same-status terminal decisions are idempotent; conflicting
    terminal decisions fail with
    `learning_automation_proposal_already_decided`;
  - legacy proposal tables are migrated with bounded decision columns;
  - card publication remains explicit through
    `POST /api/v1/growth/learning-plans/:planDraftId/publish`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check` for updated context/docs files;
  - syntax checks for `learning-automation-proposal-service.js`,
    `automation-proposals.js`, `growth-routes.js`,
    `growth-architecture-boundary.test.js`,
    `learning-automation-proposal-repository.test.js`, and
    `learning-automation-proposal-service.test.js`;
  - focused proposal gate:
    `node --test tests/learning-automation-proposal-repository.test.js
    tests/learning-automation-proposal-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-plan-publisher-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`58` tests).
  - `npm run --silent check`;
  - `npm test` (`315` tests);
  - `git diff --check`;
  - CodeGraph status (`163` JavaScript files, `1,859` nodes, `7,400`
    edges).
- Remaining:
  - add proposal review UI only after Owner plan/audit UI can explain the
    source cycle;
  - do not start scheduler work until proposal review, rollback/failure, and
    notification/action handoff are separately designed and tested.

## 2026-06-15 Growth Audit Completeness Readback Slice

- Status: visible-target scoped audit-completeness readback is implemented
  locally and documented. This slice adds a read-only service and route over
  the existing learning-cycle audit aggregate so Owner UI and future supervised
  automation can tell whether required bounded audit evidence exists before
  treating a cycle as closed. It did not add embedded UI, scheduler workers,
  production config, production data changes, deployment, or real Gateway
  calls.
- Change classification: H2 read API/service-composition change with
  service-first and harness coverage.
- Scope:
  - added `src/services/learning-audit-completeness-service.js`;
  - added `GET /api/v1/growth/learning-cycles/completeness`;
  - the route uses the same Growth visible-target read boundary as
    `learning-cycles/audit`;
  - the route delegates to
    `learningAuditCompletenessService.evaluateCycleCompleteness`;
  - the service reads only the public DTO returned by
    `learning-cycle-audit-service`;
  - required findings cover plan publication, publish-attempt visibility,
    evaluation evidence, profile-delta audit, downstream partial failures, and
    privacy projection;
  - optional findings cover Owner correction and next recommendation
    visibility;
  - output includes `complete`, `readyForAutomation`,
    `summary.missingRequired`, bounded findings, and bounded cycle summary
    data;
  - the service is read-only: it does not inspect SQLite tables directly, call
    Gateway, write durable state, start scheduling, or expose raw learner
    answers, transcripts, prompts, raw model output, source-document bodies,
    private paths, credentials, or provider configuration.
- Harness/code updated:
  - `src/services/learning-audit-completeness-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `package.json`;
  - `tests/learning-audit-completeness-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js` (`requiredCount=27`,
    no missing docs, no forbidden pointers);
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - focused audit-completeness/service/route/architecture gate:
    `node --test tests/learning-audit-completeness-service.test.js
    tests/learning-cycle-audit-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`45` tests);
  - expanded operating-loop gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-audit-completeness-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`108` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`305` tests);
  - `git diff --check`;
  - CodeGraph status (`159` JavaScript files, `1,802` nodes, `7,155`
    edges).
- Remaining:
  - embedded Owner UI rendering for plan preview/provision controls,
    profile-delta/correction/cycle/completeness audit, and planner publish;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - scheduler/automation remains future work and must not use
    `readyForAutomation` as permission to bypass Owner policy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth Plan Publish Attempt Audit Slice

- Status: bounded plan publish-attempt audit metadata is implemented locally.
  This slice changed the plan draft SQLite repository, plan publisher service,
  plan audit service, cycle audit service, focused harnesses, architecture
  guard, docs, and workspace context. It did not add embedded UI, production
  config, production data changes, deployment, or real Gateway calls.
- Change classification: H2 persistence/API-data-contract change with
  service-first and harness coverage.
- Scope:
  - `learning_growth_plan_drafts` now has compatible schema columns for
    `last_publish_status`, `last_publish_error`, `last_publish_stage`,
    `last_publish_item_id`, `last_publish_attempt_at`, and
    `publish_attempt_count`;
  - `learning-plan-drafts.js` adds `markPublishAttempt` and migrates old
    existing plan-draft tables by adding missing columns;
  - successful publish sets latest publish-attempt status to `published`;
  - failed generation, missing selected item, privacy/provisioning block, and
    stage-assessment direct-publish block write bounded latest publish-attempt
    metadata while preserving the draft/unpublished state;
  - stage-checkpoint direct publish remains blocked with
    `stage_assessment_activation_required`;
  - `learning-plan-audit-service` exposes `publishAttempt` and summary counts
    for failed/blocked attempts;
  - `learning-cycle-audit-service` includes `plan_publish_attempt` timeline
    events and summary failed/blocked counts;
  - no raw learner answers, transcripts, prompts, raw model output, source
    bodies, private paths, credentials, or provider config are persisted or
    projected by this metadata.
- Harness/code updated:
  - `src/stores/growth-learning-sqlite/learning-plan-drafts.js`;
  - `src/services/learning-plan-publisher-service.js`;
  - `src/services/learning-plan-audit-service.js`;
  - `src/services/learning-cycle-audit-service.js`;
  - `tests/learning-plan-publisher-service.test.js`;
  - `tests/learning-plan-audit-service.test.js`;
  - `tests/learning-cycle-audit-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed repository/services/tests;
  - focused plan publish-attempt/audit/architecture gate:
    `node --test tests/learning-plan-publisher-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/growth-architecture-boundary.test.js` (`24` tests).
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - expanded operating-loop focused gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`103` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`300` tests);
  - `git diff --check`;
  - CodeGraph status (`157` JavaScript files, `1,779` nodes, `7,049`
    edges).
- Remaining:
  - embedded Owner UI rendering for failed/blocked plan publish attempts,
    planner preview/provision controls, and profile-delta/correction audit;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth Learning Cycle Audit Aggregate Slice

- Status: visible-target scoped learning-cycle audit aggregation is
  implemented locally. This slice changed backend services, Growth routes,
  service/route/architecture harnesses, docs, and workspace context. It did
  not add embedded UI, schema, production config, production data changes,
  deployment, or real Gateway calls.
- Change classification: H2 API/data-contract change with service-first and
  harness coverage.
- Scope:
  - added `src/services/learning-cycle-audit-service.js`;
  - added `GET /api/v1/growth/learning-cycles/audit`;
  - the route delegates to `learning-cycle-audit-service.listCycleAudit`;
  - the route uses the same Growth visible-target read boundary as
    `card-generation/context`, `evidence/audit`, `learning-plans/audit`,
    `profile-delta-audits`, and `profile-corrections`;
  - query filters include `learnerId`, `programId`, `planDraftId`,
    `taskCardId`, `evaluationId`, `profileDeltaId`, `evidenceId`,
    `correctionId`, `sourceId`, comma-separated `targetNodeIds`, and `limit`;
  - the service composes public DTOs from `learning-plan-audit-service`,
    `learning-evidence-audit-service`,
    `learning-profile-delta-audit-service`, and
    `learning-owner-correction-service`;
  - public output includes bounded counts, partial-failure markers,
    sanitized plan/evidence/profile-delta/correction sections, and a timeline;
  - the route does not inspect SQLite tables, and the service does not project
    raw learner answers, transcripts, prompts, raw model output, source bodies,
    private paths, credentials, or provider configuration.
- Harness/code updated:
  - `src/services/learning-cycle-audit-service.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `package.json`;
  - `tests/learning-cycle-audit-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed service/app/routes/tests;
  - focused cycle-audit/service/route/architecture gate:
    `node --test tests/learning-cycle-audit-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-owner-correction-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`48` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - expanded operating-loop gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-cycle-audit-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`101` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`298` tests);
  - `git diff --check`;
  - CodeGraph status (`157` JavaScript files, `1,776` nodes, `7,009`
    edges).
- Remaining:
  - embedded Owner UI rendering for cycle audit, plan/evidence/profile-delta/
    correction audit, and provision controls;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth AI Learning Closed-Loop Plan Documentation

- Status: the Growth AI learning scheme now has a single plugin-local entry
  point in `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`. This slice changed
  documentation, docs-locality harness, and workspace context only; it did not
  add runtime code, schema, UI, production config, production data changes,
  deployment, or real Gateway calls.
- Change classification: H2 product/architecture contract documentation
  change with docs-locality harness coverage.
- Scope:
  - documented the supervised AI learning loop from Owner target selection to
    planner draft, card authoring, learner evidence, one-shot evaluation,
    evidence ledger, Profile V2, profile-delta audit, correction evidence, and
    next recommendation;
  - documented the learner state model, including evidence freshness,
    unknown-versus-weak distinction, daily versus formal evidence weights,
    stale-evidence behavior, pressure signals, and Owner-reviewed corrections;
  - documented the daily practice versus stage-assessment card families and
    reinforced `daily_score_once` as the daily low-pressure policy;
  - documented the three model-entered steps: planner, authoring, and
    evaluation through Gateway only;
  - documented service-first ownership, Owner browser workflow, audit
    requirements, generalization rules, failure policy, staged implementation
    plan, and harness contract;
  - registered the next backend-only implementation slice as a planned
    learning-cycle audit aggregate over plan, evidence, profile-delta, and
    correction readbacks;
  - updated docs-locality checks so the new scheme document is required and
    checked for forbidden Home AI Growth doc pointers.
- Documentation/harness updated:
  - `docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `scripts/check-growth-docs-locality.js`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `npm run --silent check`;
  - `git diff --check`.
- Next implementation slice:
  - implement `learning-cycle-audit-service` plus
    `GET /api/v1/growth/learning-cycles/audit`, with focused service, route,
    architecture, docs-locality, and broad local validation.

## 2026-06-15 Growth Evidence Audit Readback API Slice

- Status: visible-target scoped evidence-ledger audit readback is implemented
  and validated locally. This slice changed backend services, SQLite
  repository filtering, Growth routes, route/service/architecture harnesses,
  docs, and workspace context. It did not add embedded UI, production config,
  production data changes, deployment, or real Gateway calls.
- Change classification: H2 API/data-contract change with service-first and
  harness coverage.
- Scope:
  - added `src/services/learning-evidence-audit-service.js`;
  - added `GET /api/v1/growth/evidence/audit`;
  - the route delegates to
    `learning-evidence-audit-service.listEvidenceAudit`;
  - the route uses the same Growth visible-target read boundary as
    `card-generation/context`, `profile-delta-audits`,
    `learning-plans/audit`, and `profile-corrections`;
  - query filters include `learnerId`, `programId`, `evidenceId`,
    `sourceType`, `sourceId`, `taskCardId`, `cardRole`, `status`,
    comma-separated `targetNodeIds`, and `limit`;
  - `learning_growth_evidence_ledger` listing now supports evidence/source/
    task-card/card-role/status filters through the repository boundary;
  - public DTOs strip raw/private summary fields and include only bounded
    ids, source metadata, graph node ids, score band, status, weight,
    confidence, timestamps, and summary-only audit fields.
- Harness/code updated:
  - `src/services/learning-evidence-audit-service.js`;
  - `src/stores/growth-learning-sqlite/evidence-ledger.js`;
  - `src/app/services.js`;
  - `src/routes/growth-routes.js`;
  - `tests/learning-evidence-audit-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed service/repository/app/routes/tests;
  - focused evidence/route/architecture gate:
    `node --test tests/learning-evidence-audit-service.test.js
    tests/learning-evidence-ledger-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`40` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - expanded operating-loop focused gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-evidence-audit-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`97` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`294` tests);
  - `git diff --check`;
  - CodeGraph status (`155` JavaScript files, `1,749` nodes, `6,825`
    edges).
- Remaining:
  - embedded Owner UI rendering for plan/evidence/profile-delta/correction
    audit and provision controls;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth AI Learning Scheme Playbook Documentation

- Status: the AI-driven learning scheme documentation has been expanded in
  the Growth plugin workspace. This slice changed documentation and workspace
  context only; it did not add runtime code, schema, UI, production config,
  production data changes, deployment, or real Gateway calls.
- Change classification: H2 product/architecture contract documentation
  change with docs-locality and broad local validation.
- Scope:
  - added an Owner workflow playbook for creating one Fanfan science daily
    card from the Growth `生成` tab;
  - documented the default sample selectors: Fanfan target, `fanfan`,
    UK/HK curriculum foundation, `domain=science`, `subject=science`,
    `horizon=daily_plan`, and `availableMinutes=15`;
  - documented the browser-complete daily-card path from context load,
    planner draft, explicit publish, card open, learner completion, and Owner
    audit refresh;
  - documented capability readiness levels from backend foundation through
    Owner-supervised browser loop, closed audit loop, generalized target loop,
    and supervised automation;
  - tightened the planner-backed UI progress/error contract so drafting and
    publishing cannot become silent no-op actions.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - operating-loop focused gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`94` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`291` tests);
  - CodeGraph status (`153` JavaScript files, `1,729` nodes, `6,731`
    edges).

## 2026-06-15 Growth Plan Audit Read Route Slice

- Status: visible-target scoped plan audit readback route is implemented and
  focused-harness validated locally. This slice changed the Growth route layer,
  route tests, architecture guard, docs, and workspace context. It did not add
  embedded UI, schema, production config, production data changes, deployment,
  or real Gateway calls.
- Change classification: H2 API/data-contract change with service-first
  coverage.
- Scope:
  - added `GET /api/v1/growth/learning-plans/audit`;
  - the route delegates to `learning-plan-audit-service.listPlanDrafts`;
  - the route uses the same Growth visible-target read boundary as
    `card-generation/context`, `profile-delta-audits`, and
    `profile-corrections`;
  - query filters include `learnerId`, `programId`, `status`,
    comma-separated `targetNodeIds` / `target_node_ids`, and `limit`;
  - route code does not inspect `learning_growth_plan_drafts` or implement
    plan-audit projection logic directly.
- Harness/code updated:
  - `src/routes/growth-routes.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed route/tests;
  - `node --test tests/growth-routes.test.js
    tests/learning-plan-audit-service.test.js
    tests/growth-architecture-boundary.test.js` (`36` tests).
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - operating-loop focused gate (`94` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`291` tests);
  - CodeGraph status (`153` JavaScript files, `1,729` nodes, `6,731`
    edges).

## 2026-06-15 Growth Plan Audit Readback Backend Slice

- Status: plan audit readback is implemented and validated locally. This slice
  changed backend services, plan-draft repository filtering, Owner generation
  context projection, focused harnesses, architecture docs, and workspace
  context. It did not add embedded UI, production config, production data
  changes, deployment, or real Gateway calls.
- Change classification: H2 backend/data-contract change with service-first
  and harness coverage.
- Scope:
  - new `learning-plan-audit-service` projects recent validated plan drafts
    and publication audit links from `learning_growth_plan_drafts` through the
    existing plan-draft repository;
  - `learning-plan-drafts.js` now supports `programId` filtering in
    `listDrafts`;
  - `learning-card-generation-context-service` now injects the plan audit
    service and exposes bounded `ownerAudit.planAudit` plus top-level
    `planAudit`;
  - `ownerAudit.summary` now includes plan-draft counts, published-plan counts,
    last plan timestamp, and last published timestamp;
  - context public DTOs include plan draft id, horizon, status, selected item,
    generated task-card id, generated graph-plan id, bounded target nodes,
    basis evidence ids, timestamps, and summary-only reasons while stripping
    raw/private fields.
- Harness/code updated:
  - `src/services/learning-plan-audit-service.js`;
  - `src/services/learning-card-generation-context-service.js`;
  - `src/stores/growth-learning-sqlite/learning-plan-drafts.js`;
  - `src/app/services.js`;
  - `tests/learning-plan-audit-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed service/repository/tests;
  - `node --test tests/learning-card-generation-context-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-owner-correction-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`50` tests);
  - operating-loop focused gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-plan-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`93` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`290` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Remaining:
  - embedded Owner UI rendering for plan audit/provision/profile-delta/correction;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth AI Learning Scheme Documentation Update

- Status: the high-level AI-driven learning scheme is now documented in the
  Growth plugin workspace. This slice changed documentation and workspace
  context only; it did not add runtime code, schema, UI, production config,
  production data changes, deployment, or real Gateway calls.
- Canonical Growth-local scheme entry:
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`.
- Scope added to the roadmap:
  - capability model for the complete loop from target selection to the next
    recommendation;
  - scientific learning policy for evidence weight, mastery claims,
    stale-evidence handling, low-pressure planning, and stage assessment
    separation;
  - Owner operating modes for Generate, Audit, Assess, and Review;
  - documentation and harness contract requiring behavior changes to update
    durable docs plus the smallest relevant service/route/AI/UI/visual
    harness.
- Documentation references updated:
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.

## 2026-06-15 Growth Non-Sample Provisioned Vertical Backend Closure

- Status: backend/database/Harness progress toward the multi-workspace and
  domain-pack generalization target is implemented and validated locally. This
  slice changed backend graph persistence/projection, graph plan DTOs, card
  authoring audit metadata, tests, docs, and workspace context. It did not add
  embedded UI, production config, production data changes, deployment, or real
  Gateway calls.
- Change classification: H2 backend/data-contract change with service-first
  and harness coverage.
- Scope:
  - `graph-repository` now infers a node's `domainPackId` from the node domain
    when a multi-pack graph seed omits per-node `domainPackId`, before falling
    back to the first pack;
  - `learning-graph-plan-service` includes `domainPackId`, `domain`, and
    `subject` in graph plan DTOs and stable plan ids;
  - graph plan readback returns those fields from the stored raw plan JSON;
  - `card-authoring-publisher` persists `domainPackId`, `domain`, and
    `subject` inside generated card `raw_json.learningGraph`;
  - `tests/learning-card-ai-loop-harness.test.js` now wires
    `learning-target-provisioning-service` like the app composition root and
    adds a non-sample science vertical: unprovisioned draft/direct generation
    are blocked before planner/authoring Gateway calls, explicit
    domain-pack/subject provision enables draft/publish/evaluate/profile, wrong
    subject remains blocked, and plan/card/evidence/Profile V2/profile-delta
    rows stay target-workspace scoped.
- Harness/code updated:
  - `tests/learning-graph-repository.test.js` covers multi-pack node
    domain-pack inference;
  - `tests/learning-graph-plan-binding-service.test.js` covers graph plan
    domain-pack/domain/subject output;
  - `tests/learning-card-ai-loop-harness.test.js` covers the provisioned
    non-sample science vertical;
  - `tests/growth-architecture-boundary.test.js` guards graph pack inference,
    graph plan provenance, card raw audit provenance, and AI-loop harness
    provisioning coverage.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/HANDOFF.md`.
- Validation passed:
  - syntax checks for changed services/repositories/tests;
  - `node --test tests/learning-graph-repository.test.js
    tests/learning-graph-plan-binding-service.test.js
    tests/learning-card-generation-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-architecture-boundary.test.js` (`36` tests);
  - operating-loop focused gate:
    `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-graph-plan-binding-service.test.js
    tests/learning-card-generation-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`104` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`288` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `codegraph status` (`151` JavaScript files, `1,702` nodes,
    `6,590` edges, index up to date).
- Remaining:
  - embedded Owner target/domain-pack/provision UI and audit rendering;
  - production planner readiness smoke with real Gateway config;
  - central Home AI embedded-plugin visual harness before production UI deploy;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth AI Learning Roadmap Documentation Closure

- Status: the supervised AI learning roadmap has been added to the Growth
  plugin workspace and linked from the existing Growth design documents. This
  slice changed documentation, the docs-locality harness list, and workspace
  context only; it did not add runtime code, schema, UI, production config,
  production data changes, deployment, or real Gateway calls.
- New canonical planning entry:
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`.
- Scope captured:
  - product rules for low-pressure daily practice versus formal stage
    assessments;
  - Gateway-only model-entered steps for planning, authoring, and evaluation;
  - closed-loop state chain from Owner target selection through profile delta,
    Owner correction, and next recommendation;
  - current backend capability baseline;
  - delivery stages for Owner-supervised daily planning UI, audit/correction
    UI, stage checkpoint loop, multi-workspace/domain-pack generalization, and
    later supervised scheduling;
  - data ownership, failure policy, release gates, and the immediate next
    implementation slice.
- Documentation updated:
  - `docs/GROWTH_AI_LEARNING_ROADMAP.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `.agent-context/HANDOFF.md`.
- Harness updated:
  - `scripts/check-growth-docs-locality.js` now requires and scans
    `docs/GROWTH_AI_LEARNING_ROADMAP.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`;
  - `rg -n "[ \\t]$" docs/GROWTH_AI_LEARNING_ROADMAP.md
    docs/GROWTH_LEARNING_OPERATING_LOOP.md
    docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` returned no matches.
- Next implementation entry:
  - implement Stage 1 from the roadmap: the embedded Owner `生成` tab should
    render target/scope, readiness/profile, plan/publish, and audit/next-step
    panels using existing service DTOs and routes, then pass focused frontend
    harness and the central Home AI embedded-plugin visual harness before
    production deploy.

## 2026-06-15 Growth Profile V2 Stale-Evidence Policy Closure

- Status: expanded stale-evidence policy is implemented and focused-harness
  validated locally. This slice changed backend/profile logic, planner-context
  projection, docs, and tests. It did not add schema, production config,
  production data changes, UI changes, deployment, or real Gateway calls.
- Scope:
  - `learning-profile-v2-service` now distinguishes daily learning evidence,
    formal stage-assessment evidence, and Owner correction evidence for
    evidence freshness;
  - daily evidence uses the existing short stale window, formal assessment
    evidence uses a longer freshness window, and Owner-reviewed corrections no
    longer refresh learner-evidence recency;
  - public capability states now expose bounded `evidenceFreshness`,
    learning/formal/daily/correction timestamps, `staleReasons`, and
    `staleEvidence` summaries;
  - stale strengths no longer become stretch hints; Profile V2 emits a
    low-pressure `review` planner hint so stale claims are refreshed before
    stronger claims or formal assessment;
  - `learning-planner-context-service` now carries bounded
    `profileSummary.staleEvidence` into `growth.learningPlanner.input.v1`.
- Harness/code updated:
  - `tests/learning-profile-v2-service.test.js` covers stale strong evidence,
    Owner correction non-refresh behavior, and longer formal assessment
    freshness;
  - `tests/learning-planner-context-service.test.js` proves stale evidence is
    present in planner input;
  - `tests/growth-architecture-boundary.test.js` guards the Profile V2 stale
    policy and planner-context projection markers.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - syntax checks for changed service/tests;
  - `node --test tests/learning-profile-v2-service.test.js
    tests/learning-planner-context-service.test.js
    tests/growth-architecture-boundary.test.js` (`17` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`88` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`285` tests);
  - `git diff --check`;
  - `codegraph status` (`151` JavaScript files, `1,698` nodes,
    `6,519` edges).

## 2026-06-15 Growth AI Learning Loop Plan Documentation Closure

- Status: the next-stage AI-driven learning-loop plan is documented in the
  Growth plugin workspace. This slice changed documentation and workspace
  context only; it did not add runtime code, schema, production config,
  production data changes, or deployment.
- Scope:
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` now defines a staged
    execution roadmap from current backend state through Owner-supervised daily
    planning UI, audit/correction UI, stage-checkpoint UI,
    multi-workspace/domain-pack rollout, and later supervised scheduling;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md` now documents the next
    architecture optimization plan, including Owner-supervised daily loop,
    audit-complete profile loop, stage checkpoint loop, multi-workspace
    generalization, and supervised automation constraints;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` now documents the Owner
    daily-loop screen contract, the four required panels, `ownerAudit` as the
    default readback surface, correction-action behavior, and focused UI
    harness expectations;
  - `docs/GROWTH_DOCS_INDEX.md` and `.agent-context/PROJECT_CONTEXT.md` now
    point to the expanded roadmap and execution blueprint.
- Key product rules captured:
  - daily cards remain 10-15 minute low-pressure cards with one submission,
    one evaluation, and one optional reflection;
  - formal stage assessments stay separate, high-weight, cooldown-aware, and
    activated only through `learning-stage-assessment-service`;
  - only planner, authoring, and evaluation enter Gateway; all other policy,
    validation, audit, profile projection, and persistence stay service-owned;
  - Owner UI must use bounded service DTOs and must not compute profile diffs,
    assemble prompts, call Gateway directly, or mutate Profile V2 optimistically.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `git diff --check`.
- Next implementation entry:
  - build the embedded Owner planner/provision/audit UI slice in the existing
    Growth `生成` tab, using the documented four-panel contract and the
    already implemented backend context/draft/publish/provision/audit routes.

## 2026-06-15 Growth Owner Profile Correction Backend Closure

- Status: Owner-reviewed profile correction backend is implemented and
  validated locally. No UI, production deploy, production config, or
  production data change was made in this slice.
- Scope:
  - added `learning-owner-correction-service`, which validates
    target-provisioning, rejects privacy-risk payloads, writes
    `owner_reviewed_correction` evidence through
    `learning-evidence-ledger-service`, and reads grouped public correction
    DTOs from the same ledger;
  - added Owner-only `POST /api/v1/growth/profile-corrections` and visible
    target-scoped `GET /api/v1/growth/profile-corrections`;
  - `learning-profile-v2-service` now applies
    `owner_reviewed_correction` rows as auditable state adjustments while
    retaining older evidence ids and source types;
  - `src/app/services.js` wires the new service with the existing evidence
    ledger and target-provisioning services;
  - `npm run check` now syntax-checks the new service file.
- Harness/code updated:
  - `tests/learning-owner-correction-service.test.js` proves summary-only
    ledger writes/readback, Profile V2 absorption, privacy rejection, and
    provisioning failure behavior;
  - `tests/growth-routes.test.js` proves profile-correction GET/POST target
    visibility, Owner-only write, workspace-bearer, and service delegation;
  - `tests/growth-architecture-boundary.test.js` guards that Owner correction
    remains service-owned and routes do not touch ledger tables;
  - `tests/learning-profile-v2-service.test.js` remains part of the focused
    gate because Profile V2 aggregation semantics changed.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `node --test tests/learning-owner-correction-service.test.js
    tests/learning-profile-v2-service.test.js tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`38` tests);
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-owner-correction-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`85` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`282` tests);
  - `git diff --check`;
  - `codegraph status` (`151` JavaScript files, `1,686` nodes,
    `6,418` edges, index up to date).
- Remaining:
  - embedded Owner audit UI for profile-delta and profile-correction DTOs;
  - production planner smoke and central visual harness before production UI
    enablement;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth Planner Stage Readiness Projection Closure

- Status: read-only stage-assessment readiness is now projected into planner
  context and Owner-safe generation context locally. No UI, production deploy,
  production config, or production data change was made in this slice.
- Scope:
  - added `learning-stage-assessment-service.stageReadiness()`, a read-only
    eligibility/cooldown/active/dormant projection that does not write
    `learning_growth_stage_assessment_cycles`;
  - `learning-planner-context-service` now injects
    `stageAssessmentService`, includes bounded `stageAssessment` readiness in
    `growth.learningPlanner.input.v1`, and does not call writeful
    `evaluateEligibility()` from planner-context reads;
  - `learning-card-generation-context-service` exposes the same bounded
    stage-assessment readiness inside `plannerContextPreview.stageAssessment`;
  - `src/app/services.js` composition order now creates
    `learningStageAssessmentService` before `learningPlannerContextService`
    so planner context can consume the read-only stage readiness boundary.
- Harness/code updated:
  - `tests/learning-stage-assessment-service.test.js` proves
    `stageReadiness()` is read-only and bounded;
  - `tests/learning-planner-context-service.test.js` proves planner context
    includes bounded stage readiness and coverage node ids;
  - `tests/learning-card-generation-context-service.test.js` proves the
    Owner-safe preview projects stage readiness without raw markers;
  - `tests/growth-architecture-boundary.test.js` guards that planner context
    uses `stageReadiness` and not `evaluateEligibility`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - syntax checks for changed services/tests;
  - `node --test tests/learning-stage-assessment-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/growth-architecture-boundary.test.js` (`28` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`81` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`278` tests);
  - `git diff --check`;
  - `codegraph status` (`149` JavaScript files, `1,654` nodes,
    `6,288` edges, index up to date).

## 2026-06-15 Growth Planner Horizon Policy Backend Closure

- Status: backend planner horizon policy is implemented and focused-harness
  validated locally. No UI, production deploy, production config, or
  production data change was made in this slice.
- Scope:
  - `learning-planner-context-service` now defaults `weekly_plan` and
    `repair_plan` to low-pressure `daily_score_once` roles, and defaults
    `stage_checkpoint_plan` to `formal_assessment` with
    `stage_assessment` as the only default role;
  - `learning-plan-validation-service` validates allowed horizons, rejects
    weekly backlog pressure, rejects weekly formal-assessment items, rejects
    repair plans that become high-pressure or formal, and accepts
    `stage_checkpoint_plan` only when the draft declares
    `learning-stage-assessment-service` activation policy and explicit
    coverage;
  - `learning-plan-publisher-service` refuses direct publication for
    `stage_checkpoint_plan`, `stage_assessment`, or `formal_assessment` items
    with `stage_assessment_activation_required`, so planner output cannot
    bypass `learning-stage-assessment-service`;
  - architecture guard now asserts weekly/stage checkpoint policy markers stay
    service-owned.
- Harness/code updated:
  - `tests/learning-plan-orchestrator-service.test.js` covers weekly
    low-pressure acceptance, weekly backlog/formal rejection, stage-checkpoint
    acceptance with activation policy, and missing activation rejection;
  - `tests/learning-plan-publisher-service.test.js` covers direct
    stage-assessment publish blocking and proves no card generation call or
    draft mutation happens;
  - `tests/growth-architecture-boundary.test.js` guards the policy boundary.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - syntax checks for changed planner validation/context/publisher services
    and focused tests;
  - `node --test tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-planner-context-service.test.js
    tests/growth-architecture-boundary.test.js` (`28` tests).
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`81` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`277` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `149` indexed JavaScript files, `1652` nodes, `6252` edges.
- Remaining:
  - embedded Owner planner/provision/audit UI and production planner smoke
    remain future slices.

## 2026-06-15 Growth Learning Loop Documentation And Audit Read Contract Refresh

- Status: documentation has been refreshed for the supervised AI learning
  operating-loop plan and the profile-delta audit read contract. No UI,
  production deploy, production config, or production data change was made in
  this slice.
- Scope:
  - clarified the staged capability milestones for the AI learning loop:
    backend evidence loop, Owner supervised daily loop, stage checkpoint loop,
    multi-workspace/domain-pack loop, and later supervised automation;
  - documented `GET /api/v1/growth/profile-delta-audits` as the bounded
    readback surface for persisted `learning_growth_profile_delta_audits`
    rows;
  - synchronized the blueprint, main operating-loop document, Owner generation
    UI contract, card-level AI loop, architecture document, platform pointer,
    and project context so future work does not infer implementation state from
    code alone.
- Current backend status:
  - `learning-profile-delta-audit-service` and the read route are implemented
    locally in the working tree;
  - embedded Owner audit UI rendering is still pending;
  - production planner readiness smoke and central visual harness remain
    required before any production rollout of the planner/provision UI.
- Validation passed:
  - `node --test tests/learning-profile-delta-audit-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`
    (`36` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js` (`1` test);
  - `npm run --silent check`;
  - `git diff --check`.

## 2026-06-15 Growth Profile Delta Audit Persistence Closure

- Status: durable post-evaluation profile-delta audit persistence is
  implemented and focused-harness validated locally. No UI,
  production deploy, production config, or production data change was made in
  this slice. The read route was added in a later working-tree continuation and
  is documented in the section above.
- Scope:
  - added `src/stores/growth-learning-sqlite/profile-delta-audits.js`;
  - added stable `stableProfileDeltaAuditId`;
  - `growth-learning-sqlite-store` now exposes
    `profileDeltaAuditRepository`;
  - `src/app/services.js` injects the repository into
    `learning-profile-delta-service`;
  - `learning-profile-delta-service` persists successful bounded deltas after
    computing them, reports persistence failure visibly, and does not throw
    into evaluation completion;
  - persisted rows live in `learning_growth_profile_delta_audits`, are
    idempotent by `(workspace_id, evaluation_id)`, and public DTOs exclude
    raw/private payloads;
  - `package.json` syntax check now includes the new repository.
- Harness/code updated:
  - `tests/learning-profile-delta-audit-repository.test.js` covers record,
    list, duplicate-by-evaluation, privacy-risk key rejection, and
    non-summary privacy-class rejection;
  - `tests/learning-profile-delta-service.test.js` covers persistence success
    and visible persistence failure;
  - `tests/learning-card-ai-loop-harness.test.js` asserts both daily English
    and Fanfan science evaluation flows persist queryable profile-delta audit
    rows without raw marker leakage;
  - `tests/growth-architecture-boundary.test.js` guards repository wiring and
    keeps routes out of profile-delta table internals.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - syntax checks for new/changed repository, service, store, app wiring, and
    harness files;
  - package JSON parse check;
  - `node --test tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-service.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-architecture-boundary.test.js` (`27` tests).
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-profile-delta-audit-repository.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`73` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`269` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `147` indexed JavaScript files, `1633` nodes, `6193` edges.
- Remaining next implementation checks:
  - implement embedded Owner plan preview/provision/profile-delta audit UI in
    the Growth `生成` tab;
  - run `npm run smoke:planner-readiness` against real Gateway config before
    enabling planner UI in production;
  - run central Home AI visual harness before production publish;
  - commit/push/deploy only after the user asks or after UI/production closure
    is ready.

## 2026-06-15 Growth AI Learning Loop Blueprint Documentation Closure

- Status: documentation-only closure for the AI-driven Growth learning-loop
  execution blueprint. No runtime code, schema, UI, deployment, production
  config, or production data was changed in this slice.
- Scope:
  - added `docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md` as the
    execution-ready plan for the supervised AI learning loop;
  - the blueprint records loop state, durable record ownership, model-entered
    steps, daily-vs-stage policy, Fanfan science operational path, next
    implementation slices, durable profile-delta audit persistence plan, and
    harness matrix;
  - synchronized `docs/GROWTH_LEARNING_OPERATING_LOOP.md`,
    `docs/GROWTH_PLUGIN_ARCHITECTURE.md`, `docs/GROWTH_AI_CARD_LOOP.md`,
    `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`,
    `docs/GROWTH_DOCS_INDEX.md`, `docs/HOME_AI_PLATFORM_CONTRACT.md`,
    `.agent-context/PROJECT_CONTEXT.md`, and
    `scripts/check-growth-docs-locality.js`.
- Current boundary clarified:
  - post-evaluation `profile_delta` DTO exists and is returned by evaluation
    processing;
  - durable `learning_growth_profile_delta_audits` persistence/readback is the
    next backend-hardening slice before Owner historical audit UI;
  - embedded Owner planner/provision UI and production planner readiness smoke
    remain later slices.
- Required validation for this documentation slice:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.

## 2026-06-15 Growth Profile Delta Backend Closure

- Status: post-evaluation profile-delta backend service, app wiring, harness,
  and docs are implemented and validated locally. No UI, production deploy, or
  production data change was made in this slice.
- Scope:
  - added `learning-profile-delta-service`, a summary-only audit projection
    over bounded Profile V2 before/after snapshots;
  - `growth-evaluation-service` now snapshots Profile V2 before
    profile/ledger writes, then returns `profile_delta` after ledger/profile
    writes;
  - profile-delta failures are visible but non-fatal and do not duplicate or
    roll back already-persisted evaluation, reward, ledger, stage-cycle, or
    trajectory state;
  - `src/app/services.js` wires `learningProfileDeltaService` after Profile V2
    and injects it into `growthEvaluationService`;
  - `package.json` includes the new service in `npm run check`;
  - no route, browser UI, model boundary, or database table was added for this
    slice.
- Harness/code updated:
  - `tests/learning-profile-delta-service.test.js` covers changed capability
    projection, no-change projection, unavailable Profile V2 behavior, and raw
    legacy profile exclusion;
  - `tests/growth-evaluation-service.test.js` covers profile-delta
    orchestration after ledger writes and visible non-fatal profile-delta
    failure;
  - `tests/learning-card-ai-loop-harness.test.js` now injects the real
    profile-delta service and asserts daily English plus Fanfan science
    verticals return bounded `profile_delta` without raw marker leakage;
  - `tests/growth-architecture-boundary.test.js` guards service-first wiring
    and keeps routes out of profile-delta internals.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - syntax checks for changed service/composition/test files;
  - `node -e "JSON.parse(require('node:fs').readFileSync('package.json','utf8')); console.log('package-json-ok')"`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `node --test tests/learning-profile-delta-service.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-architecture-boundary.test.js` (`26` tests);
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-profile-delta-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-target-provisioning-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`70` tests);
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`266` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `145` indexed JavaScript files, `1611` nodes, `6099` edges.
- Remaining next implementation checks:
  - implement embedded Owner plan preview/provision UI in the Growth `生成`
    tab;
  - expose `profile_delta` in an Owner audit/read surface when the UI audit
    panel is implemented;
  - run `npm run smoke:planner-readiness` against real Gateway config before
    enabling planner UI in production;
  - run central Home AI visual harness before production publish;
  - commit/push/deploy only after the user asks or after the UI/production
    closure slice is ready.

## 2026-06-15 Growth AI Operating Loop Plan Documentation Closure

- Status: documentation-only closure for the AI-driven Growth learning
  operating-loop plan. No runtime code, schema, UI, deployment, or production
  data was changed in this slice.
- User intent captured:
  - Growth should become a supervised AI learning loop, not a one-off card
    generator;
  - Fanfan remains the first sample target, but learner workspace, domain pack,
    subject, horizon, and card role must be parameters;
  - ordinary daily practice stays low-pressure: one submission, one
    evaluation, one optional reflection, completion after first evaluation;
  - formal stage assessment stays separate, higher-weight, cooldown-aware, and
    service-activated;
  - the loop must be auditable: Owner should see why a card was selected, what
    evidence was used, what changed after completion, and what is recommended
    next.
- Documentation updated:
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md` now includes a system-level
    implementation plan, deterministic-vs-model boundary map, acceptance
    criteria, and a Phase 4.6 post-evaluation profile-delta slice;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md` now records profile-delta as a planned
    service boundary and future harness target while keeping current runnable
    harness commands intact;
  - `docs/GROWTH_AI_CARD_LOOP.md` now includes profile-delta audit in the
    card-level loop and harness requirements;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` now states that the Owner
    audit panel should later consume a backend profile-delta DTO instead of
    diffing raw profile payloads in the browser;
  - `docs/GROWTH_DOCS_INDEX.md`,
    `docs/HOME_AI_PLATFORM_CONTRACT.md`, and
    `.agent-context/PROJECT_CONTEXT.md` were synchronized.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`.
- Follow-up:
  - the planned profile-delta backend slice from this documentation closure is
    implemented by the `2026-06-15 Growth Profile Delta Backend Closure`
    section above.

## 2026-06-15 Growth Operating Loop Provisioning Backend Closure

- Status: target/domain-pack provisioning backend and harness validated
  locally; not committed, pushed, deployed, visually tested, or
  production-smoked in this slice.
- Scope:
  - clarified that Growth's future AI learning operating loop separates
    `view-targets` visibility from learning target/domain-pack provisioning;
  - documented `learning-target-provisioning-service`,
    `learning_growth_domain_pack_provisions`, and Owner-only
    `POST /api/v1/growth/domain-pack-provisions` as the planned/implemented
    backend boundary for non-sample learner/domain-pack enablement;
  - recorded `targetProvisioning` as a summary-only generation-context
    projection alongside filtered `graphOptions`;
  - `learning-card-generation-context-service`,
    `learning-plan-publisher-service`, and
    `learning-card-generation-service` now enforce/propagate target
    provisioning before planner draft, plan publish, and direct generation;
  - `growth-routes.js` exposes the Owner-only provision route as HTTP glue over
    the service, still constrained by Growth view-target visibility;
  - expanded the roadmap with Phase 4.5 target/domain-pack provisioning and
    harness criteria before broad multi-workspace rollout.
- Harness/code updated:
  - `tests/learning-target-provisioning-service.test.js` covers Fanfan sample
    fallback, non-sample blocking, explicit provision success, subject
    mismatch, node mismatch, and summary-only DTOs;
  - `tests/learning-card-generation-context-service.test.js` covers
    provisioned non-Fanfan context and raw graph marker exclusion;
  - `tests/learning-plan-publisher-service.test.js` covers draft/publish
    provisioning enforcement and now initializes the draft schema before
    asserting the blocked path writes no draft rows;
  - `tests/learning-card-generation-service.test.js`,
    `tests/growth-routes.test.js`, and
    `tests/growth-architecture-boundary.test.js` guard generation, route, and
    service-first wiring.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_DOCS_INDEX.md`.
- Validation passed:
  - syntax checks for target provisioning, generation context, card generation,
    plan publisher, routes, app service wiring, and changed harness file;
  - `node --test tests/learning-target-provisioning-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-card-generation-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`57` tests);
  - `node --test tests/learning-target-provisioning-service.test.js
    tests/learning-card-generation-context-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-card-generation-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`76` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`260` tests);
  - `git diff --check`.
- CodeGraph status:
  - `143` indexed JavaScript files, `1576` nodes, `5924` edges.
- Remaining next implementation checks:
  - add embedded Owner provision/plan preview UI and central visual harness
    before production deploy;
  - run `npm run smoke:planner-readiness` against real Gateway config before
    enabling planner UI in production;
  - commit/push/deploy only after the user asks or after the UI/production
    closure slice is ready.

## 2026-06-14 Growth Operating Loop Plan Documentation Refresh

- Status: documentation refreshed and focused harness validated locally; not
  committed, pushed, or deployed in this slice.
- User intent captured:
  - Growth should become a fully AI-driven, low-pressure, auditable learning
    operating loop that starts with Fanfan and later generalizes to any
    authorized learner workspace, subject, and knowledge/domain pack;
  - ordinary daily practice cards stay around 10-15 minutes and complete after
    one submission, one evaluation, and one optional reflection;
  - formal stage-assessment cards remain separate higher-weight checkpoint
    cards for updating profile/mastery with stronger evidence;
  - model-entered steps are planner, authoring, and evaluation, all
    Gateway-only draft boundaries before durable writes.
- Documentation updated:
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md` now includes current product
    capability, Fanfan science backend flow, domain-pack/subject selection
    contract, model boundary map, closed-loop state transitions, phase roadmap,
    and harness requirements;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md` now includes the next
    planner-backed Owner flow, `graphOptions` UI controls, plan draft/publish
    routes, no-write planner smoke command, and harness plan additions;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md` now records `graphOptions`, the
    planner readiness smoke boundary, updated next extraction targets, and the
    expanded operating-loop harness map;
  - `docs/GROWTH_CARD_GENERATION_RULES.md` now states that planner-backed
    non-English cards enter through context -> plan draft -> Owner preview ->
    explicit publish, not through a browser free-form prompt;
  - `docs/GROWTH_AI_CARD_LOOP.md` now distinguishes planner/authoring/
    evaluation readiness and includes `graphOptions` in Owner observability;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`, `docs/GROWTH_DOCS_INDEX.md`, and
    `.agent-context/PROJECT_CONTEXT.md` were synchronized.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `node --test tests/learning-plan-orchestrator-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-generation-context-service.test.js` (`19` tests);
  - `node --test tests/learning-card-generation-context-service.test.js
    tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/growth-planner-readiness-smoke-script.test.js
    tests/learning-graph-repository.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`67` tests);
  - plugin `git diff --check`.
- CodeGraph status:
  - `140` indexed JavaScript files, `1528` nodes, `5644` edges, index up to
    date.
- Remaining next slice:
  - implement embedded Owner plan preview and explicit publish UI in the
    Growth `生成` tab;
  - expose existing `graphOptions` as domain-pack/subject controls in that UI;
  - run `npm run smoke:planner-readiness` against real production Gateway
    config before enabling planner UI in production;
  - run central visual harness before production deploy;
  - add provisioning policy for arbitrary learner/domain-pack combinations.

## 2026-06-14 Growth Owner Context Operating Loop Backend Slice

- Status: implemented locally and validated; not committed, pushed, or
  deployed in this slice.
- Scope:
  - `learning-card-generation-context-service` now exposes Owner-safe
    `profileV2`, bounded `evidenceAudit`, `plannerReadiness`, and
    `plannerContextPreview` in the existing card-generation context response;
  - generation context readiness now includes
    `plannerGatewayConfigured`, `plannerContextReady`, `plannerReady`, and
    `operatingLoopGatewayReady`, while direct card generation readiness remains
    separate from full operating-loop readiness;
  - context graph suggestion now honors explicit `domain` / `subject`
    selectors before falling back to English/default graph suggestions;
  - `GET /api/v1/growth/card-generation/context` now forwards bounded query
    selectors (`domain`, `subject`, `domainPackId`, `horizon`,
    `availableMinutes`, `programId`, `cardRole`, `difficultyBand`) after
    target visibility is checked;
  - `src/app/services.js` wires Profile V2, evidence ledger, planner context,
    and planner Gateway readiness into the context service.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Harness added/updated:
  - `tests/learning-card-generation-context-service.test.js` covers planner
    readiness, Profile V2 projection, evidence audit projection, subject
    selector propagation, and raw-marker exclusion;
  - `tests/growth-routes.test.js` covers visible-target-scoped context query
    selector forwarding;
  - `tests/growth-architecture-boundary.test.js` guards the new service
    wiring.
- Validation passed:
  - syntax checks for changed service/route/test files;
  - `node --test tests/learning-card-generation-context-service.test.js`;
  - `node --test tests/growth-routes.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js`;
  - operating-loop focused set including context/routes/Profile V2/planner/
    publisher/AI-loop (`62` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`249` tests);
  - plugin `git diff --check`;
  - Home AI AI Ops H1 checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and app
    `git diff --check`.
- CodeGraph status after edits:
  - `138` indexed JavaScript files, `1512` nodes, `5555` edges.
- AI Ops evidence:
  - `evidence-f9a3bea4-e1e1-4e65-8518-aec165e1ea3f`.
- Remaining next slice:
  - embedded Owner plan preview and explicit publish UI in the Growth `生成`
    tab;
  - production planner Gateway readiness smoke with real config;
  - provisioned domain-pack/subject selector beyond query parameters;
  - central visual harness before production publish.

## 2026-06-14 Growth Learning Operating Loop Documentation Closure

- Status: documentation/harness closure completed locally; not committed,
  pushed, or deployed in this slice.
- Scope:
  - expanded `docs/GROWTH_LEARNING_OPERATING_LOOP.md` from target outline into
    an execution-ready operating-loop plan;
  - documented daily practice cards versus formal stage assessment cards,
    including duration, pressure policy, evidence weight, activation boundary,
    completion behavior, and failure meaning;
  - documented the three model-entered steps: planner, authoring, and
    evaluation. All three remain Gateway-only draft boundaries before durable
    writes;
  - documented the auditable state transition from evidence ledger -> Profile
    V2 -> planner context -> plan draft -> card generation -> learner evidence
    -> evaluation -> rewards -> evidence ledger/Profile V2/trajectory;
  - updated `docs/GROWTH_CARD_GENERATION_RULES.md` with planner-role mapping
    and model-entered step rules;
  - updated `docs/GROWTH_AI_CARD_LOOP.md` to distinguish card-level model
    boundaries from the broader planner boundary;
  - updated `docs/GROWTH_PLUGIN_ARCHITECTURE.md` with Service First,
    modularity, Gateway-only model boundary, extensibility, auditability, and
    remaining production-completeness gaps.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-plan-publisher-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js` (`53` tests);
  - `npm run --silent check`;
  - plugin `git diff --check`;
  - Home AI app H1 checks:
    `node tests/ai-operations-control-plane-service.test.js`,
    `node tests/ai-ops-control-plane-cli.test.js`,
    `node tests/architecture-code-test-harness-map.test.js`,
    `node tests/architecture-refactor-boundary.test.js`,
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and app
    `git diff --check`.
- CodeGraph status before final handoff update:
  - `138` indexed JavaScript files, `1501` nodes, `5435` edges, index
    up to date.
- AI Ops evidence:
  - `evidence-e6558fef-5afb-45a0-b0e4-a6cfd2334746`.
- Remaining next slice:
  - expose planner readiness in the Owner generation context;
  - add embedded Owner plan preview and explicit publish UI in the Growth
    `生成` tab;
  - run central visual harness before production deploy;
  - generalize science/domain-pack selection beyond the harness fixture.

## 2026-06-14 Growth Learning Plan Publisher Backend Slice

- Status: implemented locally and validated; not committed, pushed, or
  deployed in this slice.
- Scope:
  - added `learning_growth_plan_drafts` SQLite repository in
    `src/stores/growth-learning-sqlite/learning-plan-drafts.js`;
  - added stable plan draft ids through `stableLearningPlanDraftId`;
  - added `learning-plan-publisher-service` to persist validated planner
    drafts and publish one selected item through
    `learning-card-generation-service`;
  - wired the repository and service through `growth-learning-sqlite-store`
    and `src/app/services.js`;
  - added backend routes:
    `POST /api/v1/growth/learning-plans/draft` and
    `POST /api/v1/growth/learning-plans/:planDraftId/publish`;
  - route authorization follows existing Growth write policy: Owner
    cross-learner requests are constrained by `viewTargets`, and the route
    remains HTTP glue over the publisher service.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Harness added/updated:
  - `tests/learning-plan-publisher-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - syntax checks for new repository/service/route/harness files;
  - `node --test tests/learning-plan-publisher-service.test.js
    tests/learning-plan-orchestrator-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js`;
  - `node --test tests/growth-routes.test.js
    tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`247` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `138` indexed JavaScript files, `1497` nodes, `5422` edges.
- Runtime behavior changed:
  - validated planner output can now be persisted as summary-only plan draft
    records and explicitly published into the existing card generation path;
  - publish failures leave the stored plan draft in `draft` state;
  - no embedded Owner plan-preview UI, production planner config smoke, or full
    Fanfan science learner-evidence vertical was added in this slice.
- AI Ops evidence:
  - `evidence-764156c1-e5ac-44b5-b40b-63ab8c59da5b`.

## 2026-06-14 Growth Learning Operating Loop Backend Foundation

- Status: implemented locally and validated; not committed, pushed, or
  deployed in this slice.
- Scope:
  - added summary-only evidence ledger storage and
    `learning-evidence-ledger-service`;
  - wired evaluation and learner experience-signal flows to record bounded
    evidence ledger rows;
  - added `learning-profile-v2-service` as a read projection over ledger
    evidence plus optional legacy profile context;
  - added `learning-planner-context-service` for
    `growth.learningPlanner.input.v1` summary-only planner inputs;
  - added `growth-gateway-planner-client`, `learning-plan-validation-service`,
    and draft-only `learning-plan-orchestrator-service`;
  - wired the new services through `src/app/services.js` and added planner
    Gateway env fields in `src/config/env.js`.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`.
- Harness added/updated:
  - `tests/learning-evidence-ledger-service.test.js`;
  - `tests/learning-profile-v2-service.test.js`;
  - `tests/learning-planner-context-service.test.js`;
  - `tests/learning-plan-orchestrator-service.test.js`;
  - `tests/learning-card-ai-loop-harness.test.js`;
  - `tests/growth-evaluation-service.test.js`;
  - `tests/learning-experience-signal-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - syntax checks for new planner/Profile/evidence services and harnesses;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `node --test tests/learning-evidence-ledger-service.test.js
    tests/learning-profile-v2-service.test.js
    tests/learning-planner-context-service.test.js
    tests/learning-plan-orchestrator-service.test.js`;
  - `node --test tests/learning-card-ai-loop-harness.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-experience-signal-service.test.js
    tests/growth-architecture-boundary.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`243` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `135` indexed JavaScript files, `1455` nodes, `5215` edges.
- Runtime behavior changed:
  - daily/formal evaluations now attempt summary-only evidence ledger writes
    after evaluation/profile persistence;
  - learner experience signals now attempt summary-only evidence ledger writes;
  - planner draft services are available in the service graph but no route,
    card publication, Owner plan preview UI, or production planner deployment
    is included yet.
- AI Ops evidence:
  - `evidence-25b75d40-be68-48c7-a980-16dfbd0bf8bf`.

## 2026-06-14 Growth Learning Operating Loop Planning Doc

- Status: documentation-only planning slice completed locally.
- Scope:
  - added `docs/GROWTH_LEARNING_OPERATING_LOOP.md` as the Growth-owned target
    architecture for the AI-driven learning operating loop;
  - defined the long-running loop from knowledge graph, evidence ledger,
    Profile V2, Gateway-backed planning, card authoring, learner execution,
    evaluation, profile update, Owner audit, and multi-workspace/domain-pack
    generalization;
  - specified the planned service boundaries:
    `learning-evidence-ledger-service`, `learning-profile-v2-service`,
    `learning-planner-context-service`,
    `learning-plan-orchestrator-service`,
    `learning-plan-validation-service`, and
    `learning-plan-publisher-service`;
  - documented the next implementation order: evidence ledger, Profile V2,
    planner context, fake Gateway planner harness, Fanfan science daily-card
    plan preview, then plan publication into card generation.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_LEARNING_OPERATING_LOOP.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness/doc guard updated:
  - `scripts/check-growth-docs-locality.js` now requires the new operating-loop
    document and scans it for forbidden current Home AI Growth doc pointers.
- Validation passed:
  - `node --check scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.
- Runtime/code behavior changed: no.
- Production deploy: not run for this documentation-only slice.

## 2026-06-14 Growth Stage Assessment Closed-Loop Profile Slice

- Status: implemented, pushed, deployed, and production-smoked.
- Scope:
  - `learning-mastery-profile-service` now reads card evidence role and
    `mastery_evidence_weight`;
  - formal `stage_assessment` evaluations write weight `1` evidence, can mark
    high-score formal evidence as `mastered`, and include declared assessment
    coverage nodes in the profile update;
  - `mastery-profile` repository now stores summary-only evidence weight
    metadata in `raw_json`, uses weighted score aggregation, and merges legacy
    mastery rows by workspace/learner/program/node before creating a new state
    row;
  - `learning-stage-assessment-service` now exposes
    `recordAssessmentCompletion`, which preserves the original active cycle
    target, generated card id, and activation metadata, then writes
    `status=completed`, `completedAt`, and `cooldownUntil`;
  - `growth-evaluation-service` injects `stageAssessmentService` and delegates
    formal cycle completion after the evaluation/reward/profile/trajectory
    writes;
  - `src/app/services.js` wires the stage assessment service into evaluation
    orchestration.
- Harness added/updated:
  - `tests/learning-mastery-profile-service.test.js` covers formal evidence
    weight, coverage-node profile writes, and raw-answer exclusion;
  - `tests/learning-stage-assessment-service.test.js` covers active-cycle
    completion and cooldown;
  - `tests/growth-evaluation-service.test.js` covers evaluation orchestration
    calling stage assessment completion;
  - `tests/learning-card-ai-loop-harness.test.js` now covers Owner activation
    -> stage assessment generation -> submission -> Gateway evaluation ->
    weighted profile update -> completed cycle -> cooldown projection.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`.
- Validation passed:
  - syntax checks for changed service/store/app modules;
  - focused service and AI-loop tests:
    `node --test tests/learning-mastery-profile-service.test.js
    tests/learning-stage-assessment-service.test.js
    tests/growth-evaluation-service.test.js
    tests/learning-card-ai-loop-harness.test.js`;
  - Growth AI loop focused set from `docs/GROWTH_PLUGIN_ARCHITECTURE.md`
    (`61` tests);
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`231` tests);
  - `git diff --check`.
- CodeGraph status after edits:
  - `124` files, `1334` nodes, `4801` edges.
- Commit/push:
  - Growth commit `a991a7711c1d` pushed to `origin/main` and `public/main`.
- Production deploy:
  - command target: `npm run --silent deploy:macos -- --plugin growth --json
    --reason growth-stage-assessment-profile-loop --execute`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T140543Z-plugin-growth-growth-stage-assessment-profile-loop`;
  - restarted `com.hermesmobile.plugin.growth`;
  - deploy validation passed: launchd running, plugin manifest health passed,
    and `codex_auth_*` blocker count was `0` (`codex-auth-profile-audit`
    still reported unrelated non-`codex_auth_*` legacy issues).
- Production smoke:
  - `GET http://127.0.0.1:4881/api/v1/hermes/plugin/manifest` returned
    plugin id `growth` and the `stage_assessment` action;
  - `GET http://127.0.0.1:4881/api/v1/growth/status?workspaceId=weixin_stephen`
    returned `ok=true` from `growth-plugin-sqlite`;
  - production source contains `recordAssessmentCompletion`,
    `evidenceWeightForTaskCard`, and `evidenceWeightTotal`;
  - production Node runtime loaded
    `learning-stage-assessment-service` and confirmed
    `recordAssessmentCompletion` is callable.
- AI Ops evidence:
  - `evidence-c4204f5a-a0ce-4c9d-ad8c-54d1fb340d67`.

## 2026-06-14 Growth Daily English Three-Step Interaction Slice

- Status: implemented, pushed, deployed, and visually validated.
- Product rule now enforced in the generated daily-card UI:
  - stage rail is `提交 -> 批改 -> 反思`;
  - the `跟做` section is instruction-only and no longer opens a separate
    learner text box;
  - before submission, the card renders exactly one active answer textarea;
  - waiting/failed evaluation states render no active textarea;
  - after the first evaluation, the card renders exactly one reflection
    textarea;
  - after reflection is submitted, the reflection form does not reopen.
- Frontend/controller changes:
  - `public/growth-legacy-task-ui.js` renders the single submission field as
    `data-field="submissionText"` and preserves old `quickCheckText` state only
    as display fallback;
  - `public/growth-card-interaction-controller.js` submits only that single
    answer field, with legacy `quickCheckText` fallback for old in-memory
    drafts, and no longer concatenates guided-practice text into the answer;
  - `public/growth-homeai-legacy.css` aligns the daily flow rail to three
    columns.
- Documentation updated:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Harness updated:
  - `tests/growth-frontend-adapter.test.js` now asserts active textarea counts
    across pre-submit, waiting-evaluation, failed-evaluation, evaluated, and
    reflected states.
- Validation passed:
  - `node --check public/growth-card-interaction-controller.js`;
  - `node --check public/growth-legacy-task-ui.js`;
  - `node --check tests/growth-frontend-adapter.test.js`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run --silent check`;
  - `npm test -- --runInBand` (`227` tests);
  - `git diff --check`.
- Commit/push:
  - Growth commit `8e8140901cf3` pushed to `origin/main` and `public/main`.
- Production deploy:
  - command target: `npm run --silent deploy:macos -- --plugin growth --json
    --reason growth-daily-card-three-step-flow --execute`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T132130Z-plugin-growth-growth-daily-card-three-step-flow`;
  - restarted `com.hermesmobile.plugin.growth`;
  - deploy validation passed with plugin health URL and `codex_auth_*`
    blocker count `0` (`codex-auth-profile-audit` still reported unrelated
    non-`codex_auth_*` legacy issues, which are not blockers for this deploy).
- Production static smoke:
  - `GET http://127.0.0.1:4881/growth-legacy-task-ui.js` contains
    `data-field="submissionText"` and `提交、批改、反思三步`;
  - `GET http://127.0.0.1:4881/growth-homeai-legacy.css` contains
    `.learning-growth-daily-flow { grid-template-columns: repeat(3, ...) }`.
- Central iOS PWA visual harness passed:
  - `embedded-plugin-shell --plugin-id growth`, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260614T132310Z.png`;
  - `dark-growth-surfaces`, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260614T132239Z.png`.
- AI Ops evidence:
  - `evidence-a9e03af9-449d-4619-bb41-bc630973ecfe`.

## 2026-06-14 Growth Evaluation Gateway Readiness Slice

- Status: implemented, pushed, deployed, configured in production launchd, and
  production-smoked.
- Change:
  - `learning-card-generation-context-service` now exposes
    `authoringGatewayConfigured`, `evaluationGatewayConfigured`, and
    `aiLoopGatewayReady` separately while keeping card generation readiness
    gated by authoring Gateway, graph, target, and history readiness;
  - Owner generation UI renders a separate `Gateway evaluation` readiness row
    so deterministic evaluation fallback is visible instead of silent;
  - `tests/learning-card-ai-loop-harness.test.js` now routes evaluation through
    fake `growth-gateway-evaluation-client` plus
    `learning-card-evaluation-service`, not a direct hand-written evaluator;
  - the route harness fixes `submitted_at` to keep queue availability stable
    against real clock drift.
- Home AI installer dependency:
  - `/Users/hermes-dev/HermesMobileDev/app/scripts/install-growth-launchd-service.js`
    now supports `--gateway-evaluation-endpoint`,
    `--gateway-evaluation-access-token-path`,
    `--gateway-evaluation-protocol`, and `--gateway-evaluation-model`;
  - deployment docs now require Growth production AI card evaluation to set
    `GROWTH_GATEWAY_EVALUATION_*` by file path, not raw token.
- Validation passed:
  - Growth focused: `node --test
    tests/learning-card-generation-context-service.test.js
    tests/learning-card-ai-loop-harness.test.js
    tests/learning-card-evaluation-service.test.js
    tests/growth-frontend-adapter.test.js`;
  - Growth full: `npm run --silent check`; `npm test -- --runInBand`
    (`227` tests);
  - Home AI installer: `node --check scripts/install-growth-launchd-service.js`;
    `node tests/install-growth-launchd-service.test.js`;
  - AI Ops intake classified the work as H1 and the required Home AI
    Gateway/deploy checks passed:
    `gateway-run-lifecycle-service`, `gateway-run-start-service`,
    `gateway-run-stream-service`, `runtime-config-provider`,
    `macos-production-deploy-script`, `production-status-smoke-harness`,
    Home AI deploy plan, and `git diff --check`.
- Commit/push:
  - Growth commit `8d324234e76a` pushed to `origin/main` and `public/main`;
  - Home AI commit `8fce09e7ac3b` pushed to `origin/main`.
- Production deploy/config:
  - Home AI deploy reason `growth-evaluation-gateway-installer`, backup
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T084515Z-home-ai-growth-evaluation-gateway-installer`;
  - Growth deploy reason `growth-evaluation-gateway-readiness`, backup
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T084538Z-plugin-growth-growth-evaluation-gateway-readiness`;
  - `scripts/install-growth-launchd-service.js --execute --bootstrap` rewrote
    and restarted `com.hermesmobile.plugin.growth` with both
    `GROWTH_GATEWAY_AUTHORING_*` and `GROWTH_GATEWAY_EVALUATION_*` set by
    endpoint/protocol plus token file path only.
- Production smokes:
  - `launchctl print system/com.hermesmobile.plugin.growth` shows
    `state=running`, `GROWTH_GATEWAY_EVALUATION_ENDPOINT`,
    `GROWTH_GATEWAY_EVALUATION_PROTOCOL=responses`, and
    `GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN_PATH`;
  - Owner card-generation context for `weixin_stephen` returned
    `ready=true`, `authoringGatewayConfigured=true`,
    `evaluationGatewayConfigured=true`, and `aiLoopGatewayReady=true`;
  - a no-write production Gateway evaluation draft smoke passed through
    `growth-gateway-evaluation-client` and `learning-card-evaluation-service`
    with `ok=true`, `gatewayMode=json`, score `85`, and
    `evidenceRefs=["growth-gateway-evaluation:v1"]`;
  - iOS PWA visual harness passed:
    `embedded-plugin-shell --plugin-id growth` screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260614T085055Z.png`;
    `dark-growth-surfaces` screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260614T085102Z.png`.
- AI Ops evidence:
  - `evidence-84963973-8f58-41a9-b96b-1e7202b96cc8`.

## 2026-06-14 Growth AI Card Closed Loop Production Deploy

- Growth commits already pushed before deploy:
  - `6a0630f Add Growth AI card closed loop harness`;
  - `4514a39 Add Growth AI card route loop harness`.
- Home AI deploy-gate fix required for this deploy:
  - central `scripts/deploy-macos-production.js` now runs the bounded
    shared-auth ACL repair before `codex-auth-profile-audit` for every
    non-`sync-only`, non-static Home AI or plugin deploy, not only `home-ai`;
  - this matches `docs/MODULES/deployment.md`, which treats post-repair
    `codex_auth_*` audit issues as real production blockers.
- Production deployment completed through the central Home AI deploy script:
  - command target: `npm run --silent deploy:macos -- --plugin growth --json
    --reason growth-ai-card-closed-loop --execute`;
  - source commit: `4514a39c324a`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T082018Z-plugin-growth-growth-ai-card-closed-loop`;
  - restarted `com.hermesmobile.plugin.growth`.
- Deploy validation passed:
  - `codex-shared-auth-permissions-repair` ran for `plugin:growth` and
    reported `userCount=8`;
  - `launchd-print` reported Growth LaunchDaemon running;
  - plugin health URL
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest` returned the Growth
    manifest;
  - `codex-auth-profile-audit` returned `codexIssueCount=0`. The audit still
    reported 6 non-`codex_auth_*` legacy issues, so they were not deploy
    blockers for this Growth plugin slice.
- Production read smoke passed:
  - `GET /api/v1/growth/status?workspaceId=weixin_fanfan` returned
    plugin-owned SQLite status with `quick_check=ok`;
  - Owner `GET /api/v1/growth/view-targets` returned the sample learner target
    `weixin_stephen` labeled `凡凡`;
  - Owner `GET /api/v1/growth/card-generation/context?targetWorkspaceId=weixin_stephen`
    returned `ready=true`, KG `294` nodes / `329` edges, recipe
    `daily_english_v1`, completion policy `daily_score_once`, and
    `passScoreRequired=false`;
  - `GET /api/v1/growth/board?workspaceId=weixin_stephen` returned two ready
    cards and SQLite integrity `quick_check=ok`.
- Visual evidence passed:
  - Home AI production Playwright mobile smoke passed at
    `http://127.0.0.1:8797/?_hmv=growth-ai-loop-deploy`, client version
    `20260614-plugin-audit-v770`, screenshot
    `/tmp/homeai-growth-ai-loop-production-smoke.png`;
  - central iOS PWA visual harness `embedded-plugin-shell --plugin-id growth`
    passed against production with client version `20260614-plugin-audit-v770`,
    iframe size `402x628`, no horizontal overflow, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260614T082700Z.png`;
  - central iOS PWA visual harness `dark-growth-surfaces` passed against
    production with 38 Growth surface samples, no pale solid backgrounds, no
    low-contrast semantic text, stable bottom-nav samples, screenshot
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-dark-growth-surfaces-20260614T082711Z.png`.
- AI Ops evidence:
  - deploy: `evidence-8dbf71e4-1906-422a-b8df-b1c4cdfb93fd`.

## 2026-06-14 Growth AI Card Route Closed-Loop Harness Slice

- Current workspace state: implemented and locally validated. This handoff
  section is included with the slice commit.
- Previous slice committed and pushed:
  `6a0630f Add Growth AI card closed loop harness`.
- Scope:
  - extended `tests/learning-card-ai-loop-harness.test.js` with an HTTP route
    scenario that uses real Growth services behind `createServer`;
  - route coverage now proves
    `POST /api/v1/growth/cards/generate` -> learner submission route ->
    `POST /api/v1/growth/evaluations/process` -> follow-up generation can
    carry the same generated-card, one-shot evaluation, profile trajectory,
    trajectory recommendation, and accepted lifecycle as the service harness;
  - the route harness checks workspace bearer authorization and route request
    normalization while retaining fake Gateway boundaries and raw-answer marker
    privacy assertions.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`.
- Harness updated:
  - `tests/learning-card-ai-loop-harness.test.js`.
- Validation passed:
  - `node --check tests/learning-card-ai-loop-harness.test.js`;
  - `node --test tests/learning-card-ai-loop-harness.test.js` with 2 passing
    tests.
  - focused AI card loop gate:
    `node --test tests/learning-card-ai-loop-harness.test.js tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js`
    with 50 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 226 passing tests;
  - Home AI app AI Ops Gateway focused checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`, and
    `node tests/runtime-config-provider.test.js`;
  - Home AI app harness-map guard:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in Growth and Home AI app workspaces.
- AI Ops evidence:
  - test: `evidence-c24e9fff-c578-4831-831f-62ea2f60f5cb`.
- CodeGraph status after sync: 124 files, 1317 nodes, 4634 edges.

## 2026-06-14 Growth AI Card Closed-Loop Harness Slice

- Current workspace state: implemented and locally validated. This handoff
  section is included with the slice commit.
- Scope:
  - added `tests/learning-card-ai-loop-harness.test.js` as the H1 service
    workflow harness for generated daily card -> learner evidence -> one
    evaluation -> mastery/profile update -> trajectory recommendation -> next
    card generated from that recommendation -> recommendation accepted after
    publish;
  - the harness uses the real Growth SQLite store, graph planning, card
    authoring, evidence write, evaluation, mastery profile, trajectory,
    recommendation, next-target, and generation services with fake Gateway
    authoring/evaluation boundaries;
  - the harness plants a raw-answer marker in historical SQLite evidence and
    asserts the marker is absent from Gateway authoring input, profile
    projection, and recommendation lifecycle payloads.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added:
  - `tests/learning-card-ai-loop-harness.test.js`.
- Validation passed:
  - `node --check tests/learning-card-ai-loop-harness.test.js`;
  - `node --test tests/learning-card-ai-loop-harness.test.js`;
  - focused AI card loop gate:
    `node --test tests/learning-card-ai-loop-harness.test.js tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js`
    with 49 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 225 passing tests;
  - Home AI app AI Ops Gateway focused checks:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`, and
    `node tests/runtime-config-provider.test.js`;
  - Home AI app harness-map guard:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in Growth and Home AI app workspaces.
- AI Ops evidence:
  - test: `evidence-3d85a19c-1e9b-4805-95ff-e68a4b5eb730`.
- CodeGraph status after sync: 124 files, 1315 nodes, 4631 edges.

## 2026-06-14 Growth Post-Publish Context Refresh Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed as `8422736 Refresh Growth generation context after publish`.
- Previous slice already committed and pushed:
  `8a042e7 Expose Growth recommendation lifecycle`.
- Scope:
  - `public/app.js` refreshes
    `GET /api/v1/growth/card-generation/context` for the selected learner
    after daily-card generation or stage-assessment activation publishes;
  - the refresh replaces only `pageState.cardGeneration.context` and selected
    target workspace, preserving `status="published"`, `generatedResult`, and
    the visible card preview/open-card action;
  - context refresh failure is surfaced as a bounded warning and does not roll
    back the published result;
  - `public/index.html` static asset version was bumped to
    `20260614-post-publish-context-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `node --check public/app.js`;
  - focused app/UI boundary gate:
    `node --test tests/growth-frontend-adapter.test.js tests/growth-architecture-boundary.test.js`
    with 40 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 224 passing tests;
  - Home AI app required check:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in Growth and Home AI app workspaces.
- AI Ops evidence:
  - test: `evidence-4bf31bea-367c-4c4d-982f-34b457e7314b`.
- CodeGraph status after sync: 123 files, 1299 nodes, 4589 edges.

## 2026-06-14 Growth Recommendation Lifecycle Visibility Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed as `8a042e7 Expose Growth recommendation lifecycle`.
- Scope:
  - `learning-profile-projection-service` preserves bounded generated
    card/plan ids and accepted/superseded timestamps from trajectory
    `nextRecommendation` metadata;
  - `learning-card-generation-context-service` now exposes root-level
    `recommendationLifecycle`, derived from selected learner trajectory
    projection and limited to summary-only ids, status, strategy, target nodes,
    short reason, generated ids, supersede id, and timestamps;
  - `public/growth-card-generation-ui.js` renders a read-only "推荐闭环" panel
    in the Owner generation page for pending, accepted, and superseded
    recommendation rows;
  - `public/index.html` static asset version was bumped to
    `20260614-recommendation-lifecycle-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-profile-projection-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `node --check src/services/learning-card-generation-context-service.js`;
  - `node --check src/services/learning-profile-projection-service.js`;
  - `node --check public/growth-card-generation-ui.js`;
  - focused lifecycle visibility gate:
    `node --test tests/learning-profile-projection-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`
    with 53 passing tests.
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node --test tests/growth-docs-locality.test.js tests/growth-card-authoring-boundary.test.js`;
  - `npm run check`;
  - `npm test` with 223 passing tests;
  - Home AI app required check:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in Growth and Home AI app workspaces.
- Visual evidence:
  - central iOS PWA visual harness attempt:
    `node scripts/ios-pwa-visual-harness.js --scenario dark-growth-surfaces --json`
    returned `fetch failed` because the live debug server was unavailable;
  - Playwright mobile fallback rendered the Growth Owner generation panel with
    real Growth CSS/JS at `390x844` in dark and light modes, with no horizontal
    overflow, visible lifecycle statuses, `44px` submit button height, and
    badge contrast `7.43` dark / `6.29` light;
  - screenshots:
    `/tmp/growth-visual-evidence/owner-generation-lifecycle-dark.png`,
    `/tmp/growth-visual-evidence/owner-generation-lifecycle-light.png`.
- AI Ops evidence:
  - test: `evidence-0e8630a3-adf3-4a59-a500-8b61f0e1c980`;
  - visual: `evidence-f496b94c-2fb2-40c3-98f7-371176eaeb46`.
- CodeGraph status after sync: 123 files, 1298 nodes, 4639 edges.

## 2026-06-14 Growth Recommendation Supersede Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - `mastery-profile` repository now supersedes older pending
    `learning_growth_card_trajectories.next_recommendation_json` entries for
    the same learner/program when a newer trajectory recommendation is written;
  - legacy no-status recommendation payloads are treated as pending only when
    they contain a recommendation payload, then can be superseded by a newer
    recommendation;
  - accepted, skipped, expired, and already-superseded recommendations are not
    rewritten by the supersede pass;
  - `learning-card-recommendation-service` already skips superseded rows, so a
    newly accepted latest recommendation can no longer fall back to stale older
    pending work.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-trajectory-service.test.js`;
  - `tests/learning-card-recommendation-service.test.js`.
- Validation passed:
  - focused supersede gate:
    `node --test tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-profile-projection-service.test.js tests/learning-card-generation-service.test.js`
    with 16 passing tests;
  - focused AI loop gate:
    `node --test tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/growth-architecture-boundary.test.js`
    with 58 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `git diff --check` in Growth and Home AI app workspaces;
  - `npm run check`;
  - `npm test` with 223 passing tests;
  - app AI Ops H1 Gateway required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - app architecture map:
    `node tests/architecture-code-test-harness-map.test.js`;
  - CodeGraph status after edits: 123 files, 1294 nodes, 4596 edges.
- AI Ops:
  - evidence id: `evidence-670ec445-7576-48c6-9572-5d9711f804dc`.
- Remaining architecture work:
  - Owner-visible lifecycle history is still not implemented;
  - explicit Owner skip/expire controls are still deferred until product needs
    manual lifecycle override;
  - production deployment still requires central visual and production smoke
    gates.

## 2026-06-14 Growth Recommendation Lifecycle Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - `learning-card-trajectory-service` now writes trajectory
    `nextRecommendation` rows with `status="pending"`, source card/evaluation
    ids, and bounded lifecycle timestamps;
  - `learning-profile-projection-service` preserves bounded trajectory id and
    recommendation lifecycle fields so recommendation projection can make a
    status-aware decision;
  - `learning-card-recommendation-service` now treats legacy no-status
    recommendations as pending, skips `accepted`, `skipped`, `expired`, and
    `superseded` recommendations, and exposes a service method to mark a
    selected trajectory recommendation accepted;
  - `learning-card-next-target-service` carries recommendation id/status and
    evidence basis through target selection, and delegates accepted-status
    writes after generation publishes;
  - `learning-card-generation-service` preserves the selected trajectory
    recommendation as the Gateway `nextCardStrategy`, and after the card
    publisher commits the generated task card and graph binding, marks the
    consumed trajectory recommendation `accepted` with bounded generated card
    and graph-plan ids;
  - `createServices` wires the recommendation service to the
    `masteryProfileRepository` so the lifecycle write stays service-owned;
  - no route now owns recommendation lifecycle logic, and no Home AI old Growth
    server logic or direct model-vendor boundary was introduced.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-trajectory-service.test.js`;
  - `tests/learning-profile-projection-service.test.js`;
  - `tests/learning-card-recommendation-service.test.js`;
  - `tests/learning-card-next-target-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - focused AI loop gate:
    `node --test tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-card-recommendation-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/growth-architecture-boundary.test.js`
    with 57 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node --test tests/growth-docs-locality.test.js tests/growth-card-authoring-boundary.test.js`;
  - `git diff --check` in Growth and Home AI app workspaces;
  - `npm run check`;
  - `npm test` with 222 passing tests;
  - app AI Ops H1 Gateway required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - app architecture map:
    `node tests/architecture-code-test-harness-map.test.js`;
  - CodeGraph status after edits: 123 files, 1290 nodes, 4577 edges.
- AI Ops:
  - H1 Gateway Runtime checks were required because generation input crosses
    the Gateway-backed card authoring boundary;
  - evidence id: `evidence-de61e01b-0508-4d19-a901-d33fadbff24e`.
- Documentation discipline note:
  - this Growth plugin workspace does not have generic
    `docs/DOCS_INDEX.md`, `docs/TEST_MATRIX.md`, or
    `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md`; current startup
    uses `docs/GROWTH_DOCS_INDEX.md` plus
    `docs/HOME_AI_PLATFORM_CONTRACT.md` as the Growth-local index and
    validation matrix.
- Remaining architecture work:
  - add Owner-visible lifecycle history only if Owner needs to see accepted,
    skipped, expired, or superseded recommendation history;
  - add skip/expire/supersede commands only when Product needs Owner override
    controls or automatic stale-recommendation expiry;
  - production deployment still requires the central Home AI visual and
    production smoke gates.

## 2026-06-14 Growth Card Generation Recipe Policy Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-card-generation-recipe-policy-service` as the Service
    First owner of generated-card recipe defaults;
  - V1 owns `daily_english_v1`, English domain/subject defaults, card schema
    version, public recipe context, and `daily_score_once` policy;
  - `learning-card-generation-service` now normalizes generation requests
    through recipe policy before graph planning, while still letting
    recommendation/strategy target selection choose graph target, role, and
    difficulty when Owner did not explicitly provide them;
  - `learning-card-generation-context-service` now returns recipe-policy
    `generationDefaults` from the same service used by generation;
  - the Owner daily-generation payload now sends only target workspace,
    learner id, `recipe_id`, and card schema version; graph target, role,
    difficulty, evidence requirements, completion policy, and generation key
    remain backend-owned for ordinary daily cards;
  - stage-assessment generation stays outside daily recipe defaults and still
    requires explicit coverage.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-generation-recipe-policy-service.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`;
  - `package.json` syntax gate for the new service.
- Validation passed:
  - focused recipe/generation/UI/route gate:
    `node --test tests/learning-card-generation-recipe-policy-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js tests/growth-card-authoring-boundary.test.js`
    with 76 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 219 passing tests;
  - app AI Ops H1 Gateway required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - app architecture map:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in both Growth plugin and Home AI app workspaces;
  - CodeGraph status after edits: 123 files, 1284 nodes, 4522 edges.
- AI Ops:
  - intake classified the concrete code task as H1 Gateway Runtime because the
    change affects generation input before Gateway authoring;
  - deployment and visual lanes were not required by intake; no visible layout
    changed, but the static client key was bumped to
    `20260614-recipe-policy-v1`;
  - evidence id: `evidence-822eac13-d8d8-4bfb-84b1-8f957cd785ee`.
- Remaining architecture work:
  - consider a broader recipe catalog only when another recipe is ready to be
    enabled in the Owner UI;
  - decide whether recipe selection should become Owner-configurable policy per
    learner once more learners are enabled;
  - production deployment still requires the central Home AI visual and
    production smoke gates.

## 2026-06-14 Growth Owner Recommendation Rationale UI Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - extended `learning-card-generation-context-service` to return a bounded
    summary-only `nextCardRecommendation` DTO from the same next-target
    selection path used by actual card generation;
  - the DTO exposes selection mode, recommendation mode/source, selected
    strategy, role, difficulty, support level, target graph ids, bounded
    reason, and count-only evidence/profile summaries;
  - updated the Owner generation UI to render the selected next-card rationale
    in `data-card-generation-recommendation` before generation, including
    trajectory/profile/graph source labels and target metadata;
  - added dark-mode and mobile-safe styling for the recommendation panel and
    bumped Growth static asset URLs to
    `20260614-recommendation-rationale-ui-v1`;
  - kept raw submissions, transcripts, prompts, answer keys, raw model output,
    source refs, private paths, and provider details out of the read context.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-frontend-adapter.test.js`.
- Validation passed:
  - focused Owner recommendation/UI gate:
    `node --test tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`
    with 51 passing tests;
  - syntax checks:
    `node --check src/services/learning-card-generation-context-service.js`
    and `node --check public/growth-card-generation-ui.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 215 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in both Growth plugin and Home AI app workspaces;
  - local Playwright visual smoke for the Owner generation panel using Home AI
    app Playwright:
    `/tmp/growth-recommendation-visual/mobile-dark.png` and
    `/tmp/growth-recommendation-visual/desktop-light.png`; both proved the
    recommendation panel and submit button visible/enabled with no horizontal
    overflow;
  - CodeGraph status after edits: 121 files, 1259 nodes, 4444 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-a6f58435-5a24-4d1b-bdcf-f7ec4a298b89`.
- Remaining architecture work:
  - add a generation recipe/policy service so Owner can request "daily
    English" without knowing graph/domain parameters;
  - decide whether a durable recommendation queue is needed if recommendations
    need accepted/skipped/expired/superseded lifecycle states;
  - production deployment still requires the central Home AI visual and
    production smoke gates.

## 2026-06-14 Growth Next-Card Recommendation Projection Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-card-recommendation-service` as the summary-only
    recommendation projection between trajectory/profile and next-target
    selection;
  - the service promotes the selected learner's latest persisted trajectory
    `nextRecommendation` before falling back to recomputed profile strategy;
  - wired `learning-card-next-target-service` to consume the recommendation
    first, then fall back to profile strategy, bounded history strategy, and
    graph suggestions;
  - wired the app composition root so context preview and actual generation use
    the same recommendation-first target selection path;
  - kept explicit Owner/caller `targetNodeId` authoritative and kept formal
    `stage_assessment` generation on explicit coverage only.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-recommendation-service.test.js`;
  - `tests/learning-card-next-target-service.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - focused recommendation/generation gate:
    `node --test tests/learning-card-recommendation-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-architecture-boundary.test.js`
    with 30 passing tests;
  - `npm run check`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm test` with 214 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in both Growth plugin and Home AI app workspaces;
  - CodeGraph status after edits: 121 files, 1253 nodes, 4355 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-c353fd99-17c1-47ad-9e3a-1ed5554b87ff`.
- Remaining architecture work:
  - expose the selected next-card recommendation and rationale in the Owner
    generation context UI instead of only applying it silently to target
    selection;
  - add an Owner generation recipe/policy service so "daily English" can be
    requested without knowing graph/domain parameters;
  - consider a durable recommendation queue only if recommendation lifecycle
    needs states such as accepted, skipped, expired, or superseded.

## 2026-06-14 Growth Profile-Driven Next Target Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-card-next-target-service` as the Service First boundary for
    default next-card target selection;
  - wired card generation and card generation context to share the same
    next-target service, so Owner preview and actual generation use the same
    selected target;
  - when Owner does not hand-pick a target for an ordinary daily card, Growth
    now selects the next graph node from the learner's summary-only profile and
    next-card strategy before falling back to bounded graph suggestions;
  - explicit `targetNodeId` remains authoritative and validated before use;
  - formal stage assessment generation still requires explicit target coverage
    and does not auto-select a default target;
  - kept the model boundary unchanged: Growth still calls Gateway through the
    authoring client/adapter and does not call provider APIs directly.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-card-next-target-service.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `npm run check`;
  - `npm test` with 209 passing tests;
  - focused AI card loop gate:
    `node --test tests/learning-profile-projection-service.test.js tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-next-target-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js tests/growth-architecture-boundary.test.js`
    with 44 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - app AI Ops intake classified the task as H1 Gateway Runtime because the
    card loop crosses the Gateway model boundary; required app checks passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - app architecture harness:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check` in both Growth plugin and Home AI app workspaces;
  - CodeGraph status after edits: 119 files, 1238 nodes, 4302 edges.
- AI Ops:
  - evidence id: `evidence-bdf3868b-23c2-4b05-a2e9-f3282d89ff1b`;
  - deployment was not required by the intake packet for this slice.
- Remaining architecture work:
  - add a higher-level generation recipe/policy service so Owner can request
    "daily English" without knowing graph/domain parameters;
  - close the loop from evaluation/profile deltas into queued next-card
    recommendations instead of only selecting at generation time;
  - add Owner-visible next-card rationale history once more than one learner is
    enabled.

## 2026-06-14 Growth Owner Evaluation Job Status UI Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - extended `latestEvaluationJob` projection with bounded
    `lastOwnerReview` summary fields from job `raw_json`;
  - updated failed/waiting evaluation panels to show bounded job status:
    attempt count, due retry time, processing lease time, and latest Owner
    retry timestamp;
  - kept `lastError` display Owner-only and bounded; learner views do not
    expose Gateway/provider error details;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-owner-evaluation-status-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-frontend-adapter.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-frontend-adapter.test.js tests/growth-learning-sqlite-store.test.js`
    with 46 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - local Playwright mobile/dark smoke against `http://127.0.0.1:4895/`:
    13 static assets used `20260614-owner-evaluation-status-ui-v1`, old retry
    UI keys were absent, Owner retry button remained visible, and job status /
    Owner-only error text rendered;
  - `npm test` with 204 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1220 nodes, 4247 edges.
- Browser/tooling:
  - Codex in-app Browser was unavailable (`iab` not connected), so local visual
    validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-40380118-b8e5-465a-b32f-b6459e8f526c`.
- Remaining architecture work:
  - consider an Owner-wide evaluation recovery queue instead of only per-card
    actions once there is more than one active learner;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Owner Evaluation Retry UI Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added an Owner-only `重新批改` action to the generated-card failed
    evaluation panel rendered by `public/growth-legacy-task-ui.js`;
  - wired `public/app.js` to dispatch that action through
    `growth-card-interaction-controller`;
  - added `retryEvaluation` in `public/growth-card-interaction-controller.js`;
    it calls `retryGrowthEvaluation`, then requests one evaluation process
    refresh and reloads the card detail;
  - kept non-Owner learners on the visible recovery/read-only state with
    `刷新状态` only;
  - added mobile-safe action wrapping/gap and secondary button contrast in
    `public/growth-homeai-legacy.css`;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-owner-evaluation-retry-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-architecture-boundary.test.js tests/growth-routes.test.js tests/learning-evaluation-owner-review-service.test.js`
    with 59 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - local Playwright mobile/dark smoke against `http://127.0.0.1:4895/`:
    13 static assets used `20260614-owner-evaluation-retry-ui-v1`, old cache
    keys were absent, the failed-evaluation panel rendered, and Owner
    `重新批改` was visible/enabled with `data-workspace-id=weixin_fanfan`;
  - `npm test` with 204 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1220 nodes, 4248 edges.
- Browser/tooling:
  - Codex in-app Browser was unavailable (`iab` not connected), so local visual
    validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-2d36a31f-a00f-443a-a7ec-05e383a25f5d`.
- Remaining architecture work:
  - expose queue retry timing/status or retry history in Owner views if failed
    evaluations become common;
  - consider an Owner-wide evaluation recovery queue instead of only per-card
    action once there is more than one active learner;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Owner Evaluation Retry Slice

- Current workspace state: implemented and locally validated; this handoff
  section is included with the slice commit.
- Scope:
  - added `learning-evaluation-owner-review-service` as the Service First
    Owner recovery boundary for terminal failed evaluation jobs;
  - added `POST /api/v1/growth/evaluations/owner-review`, Owner-only role
    enforcement, view-target scoping, and workspace bearer authorization;
  - added SQLite evaluation-job repository retry support that only accepts
    terminal `failed` jobs, moves them back to `retry`, clears stale lease/error
    fields, and writes bounded `raw.ownerReviews` / `raw.lastOwnerReview`
    audit metadata;
  - kept the learner card contract unchanged: one saved submission, one
    evaluation outcome, one optional reflection, no retry-until-pass loop, and
    no direct Gateway calls from the browser or Owner review route;
  - added `retryGrowthEvaluation` to the frontend API client for Owner surfaces
    and bumped static Growth assets to
    `20260614-owner-evaluation-retry-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-evaluation-owner-review-service.test.js`;
  - `tests/growth-learning-sqlite-evaluation-jobs.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `tests/growth-frontend-adapter.test.js`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/learning-evaluation-owner-review-service.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js tests/growth-frontend-adapter.test.js`
    with 74 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm test` with 202 passing tests;
  - app AI Ops H3 required check from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 117 files, 1219 nodes, 4280 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-ac01e0d2-1ab5-4653-bb4c-afcd680e16cd`.
- Remaining architecture work:
  - Owner UI button/panel work is completed in the following UI slice above;
  - expose queue retry timing/status in card detail if delayed retries become
    common in production;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Visible Evaluation Failure Slice

- Current workspace state: implemented, locally validated, committed and
  pushed as part of the current rollout; not deployed.
- Scope:
  - added bounded `latestEvaluationJob` projection in
    `src/stores/growth-learning-sqlite/projection.js`;
  - added `evaluation_failed` lane/action and `primaryAction=owner_review`
    for daily cards whose evaluation job reaches terminal `failed` without a
    persisted evaluation row;
  - kept one-submission/one-evaluation policy intact: failed evaluation jobs do
    not reopen learner submission and do not create a retry-until-pass flow;
  - updated generated-card detail UI to show `批改未完成`, `需要处理`, Owner
    review guidance, and a visible `刷新状态` action instead of hidden
    `等待批改`;
  - added light/dark/system-dark CSS for the failed evaluation panel;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-evaluation-failure-ui-v1`.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`
    with 49 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 197 passing tests;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - dev-port Chrome smoke against `http://127.0.0.1:4892/` using the current
    workspace server and system Chrome: 13 static assets used
    `20260614-evaluation-failure-ui-v1`, old cache keys were absent, the
    failed evaluation panel scrolled into view, the `刷新状态` button was
    enabled, and dark failed-panel colors were applied;
  - `git diff --check`;
  - CodeGraph status after edits: 115 files, 1208 nodes, 4228 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-f899c712-6e95-4b4a-a14e-ffa9d7e3ce2a`.
- Remaining architecture work:
  - implement an explicit Owner review/repair action route if Owner needs to
    manually retry or mark an evaluation failure resolved;
  - expose queue retry timing/status in card detail if delayed retries become
    common in production;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Evaluation Queue Recovery Harness Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `732fe04`
  (`Add Growth evaluation queue recovery harness`); not deployed.
- Scope:
  - confirmed the existing evaluation queue implementation already protects
    active `processing` leases and allows expired `processing` leases to be
    reclaimed by the next worker through `claimEvaluationJob`;
  - added repository-level harness coverage so active leases are not stolen and
    stale processing jobs are reclaimed with a new lease owner and incremented
    attempt count;
  - added SQLite store/service workflow harness coverage so a simulated worker
    restart leaves the active lease untouched, then resumes the stale job after
    `leaseUntil`, completes the card, clears lease fields, and settles Growth
    rewards exactly once;
  - no runtime service code was changed in this slice because the current
    implementation already satisfied the recovery contract.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-learning-sqlite-evaluation-jobs.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js`
    with 15 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `npm run check`;
  - `npm test` with 194 passing tests;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - `git diff --check`;
  - CodeGraph status after edits: 115 files, 1207 nodes, 4223 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require deployment or visual lane;
  - evidence id: `evidence-b8e02b3b-831c-4cbf-8337-be38b27c5822`.
- Remaining architecture work:
  - add explicit visible-failure/Owner-review projection for jobs that exhaust
    retries, so learners are not left with a hidden failed evaluation state;
  - consider a small queue wake-up/status endpoint if Owner needs to see
    delayed retry timing in the generation or card-detail UI;
  - production deployment still requires the central Home AI visual/prod smoke
    gates.

## 2026-06-14 Growth Stage Assessment Owner UI Slice

- Current workspace state: implemented, locally validated, committed and
  pushed as part of the current rollout; not deployed.
- Scope:
  - added Owner `阶段测评` controls to the Growth `生成` tab, rendered below
    the bounded `学习画像` panel;
  - added frontend API helpers for
    `POST /api/v1/growth/stage-assessments/eligibility` and
    `POST /api/v1/growth/stage-assessments/activate`;
  - wired `public/app.js` so Owner can check eligibility, activate a formal
    stage-assessment card, see progress/error/result state, refresh the board,
    and open the published formal card from the generation surface;
  - kept the UI policy-thin: readiness, cooldown, manual activation, and
    generation state remain owned by `learning-stage-assessment-service`;
  - added dark-mode/mobile CSS for the stage-assessment panel and action row;
  - bumped static Growth asset URLs in `public/index.html` to
    `20260614-stage-assessment-ui-v1` so mobile WebViews do not reuse the old
    card-generation UI bundle.
- Documentation updated:
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/growth-frontend-adapter.test.js` covers stage-assessment API helper
    routes, Owner panel rendering, activation result rendering, and the static
    asset-version guard;
  - `tests/growth-embedded-layout.test.js` covers mobile and dark-mode layout
    selectors for the stage-assessment panel.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js`
    with 31 passing tests;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 192 passing tests;
  - `git diff --check`;
  - dev-port Chrome smoke against `http://127.0.0.1:4891/` using the current
    workspace server and system Chrome: stage-assessment renderer exported,
    13 static assets used `20260614-stage-assessment-ui-v1`, root scroller was
    scrollable (`844` client height, `2513` scroll height), the activation
    button scrolled into view and remained enabled, and dark panel colors were
    applied;
  - app AI Ops H3 required checks from
    `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - CodeGraph status after edits: 115 files, 1207 nodes, 4221 edges.
- AI Ops:
  - correct UI-only intake classified this slice as H3 Architecture
    Documentation And Harness Map, with no deployment or visual lane required;
  - evidence id: `evidence-279e2ce0-86d4-4a53-90bd-557048ed7d18`;
  - a separate trial intake containing the word `closure` classified as Mac
    production deployment H1; that was not used because this rollout is
    commit/push only, not deployment.
- Remaining architecture work:
  - add workflow recovery harnesses for listener restart/stale evaluation
    leases before scaling generated cards;
  - add learner-visible challenge/assessment-entry UI if learner-initiated
    stage challenge is needed;
  - run the central Home AI embedded iOS visual harness and production smoke
    before any production deployment or publish.

## 2026-06-14 Growth Stage Assessment Activation Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `01b6a18`
  (`Add Growth stage assessment activation service`); not deployed.
- Scope:
  - added `stage-assessment-cycles` as the SQLite repository for
    `learning_growth_stage_assessment_cycles`, including imported-schema
    compatibility for `learner_workspace_id`;
  - added `learning-stage-assessment-service` for system eligibility, Owner
    manual activation, learner `executor_challenge`, cooldown policy, and the
    handoff to `learning-card-generation-service`;
  - added `POST /api/v1/growth/stage-assessments/eligibility`,
    `POST /api/v1/growth/stage-assessments/activate`, and
    `POST /api/v1/growth/stage-assessments/challenge`;
  - wired the service in `src/app/services.js` and kept route logic limited to
    JSON parsing, workspace authorization, Owner role checks, and own-workspace
    challenge checks;
  - extended card generation/authoring/publisher metadata so activated
    `stage_assessment` cards persist `stageAssessmentCycleId`, activation
    state/reason/source, cooldown metadata, formal-assessment completion
    metadata, default `300` coin reward metadata, and mastery evidence weight
    `1`;
  - updated `npm run check` to include the new service/repository files.
- Product boundary:
  - ordinary generated cards still use `daily_score_once`: one evaluation, one
    optional reflection, completion after the first evaluation, and
    score-proportional rewards without a pass-line gate;
  - dormant/eligible stage-assessment cycles are not daily homework debt;
  - Owner manual activation records `owner_manual` and may override cooldown;
  - learner challenge activation records `executor_challenge`, can only target
    the executor's own workspace, and respects cooldown;
  - this slice adds backend/service/API readiness only. Broad Owner UI controls
    and production visual evidence remain future work.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-stage-assessment-service.test.js`;
  - `tests/learning-stage-assessment-cycles-repository.test.js`;
  - `tests/learning-card-generation-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `tests/growth-card-authoring-boundary.test.js`;
  - `tests/growth-docs-locality.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-stage-assessment-service.test.js tests/learning-stage-assessment-cycles-repository.test.js`;
  - `node --test tests/learning-card-generation-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/learning-stage-assessment-service.test.js tests/learning-stage-assessment-cycles-repository.test.js tests/learning-card-generation-service.test.js tests/growth-routes.test.js tests/growth-architecture-boundary.test.js tests/growth-card-authoring-boundary.test.js tests/growth-docs-locality.test.js`;
  - app AI Ops required checks from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - `npm run check`;
  - `npm test` with 191 passing tests;
  - `git diff --check`;
  - CodeGraph sync/status after edits: 115 files, 1198 nodes, 4124 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require visual lane or deployment;
  - evidence id: `evidence-2607331a-fda6-4d43-b6d7-08b1b12f39d5`.
- Remaining architecture work:
  - expose stage-assessment eligibility/activation controls in the Owner UI;
  - add a broader workflow recovery harness for listener restart/stale
    evaluation leases before scaling generated cards beyond the initial sample;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Gateway Evaluation Boundary Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `d18d425`
  (`Add Growth AI card loop evaluation boundary`); not deployed.
- Scope:
  - added `growth-gateway-evaluation-client` as the Growth-owned Gateway-only
    model client for card evaluation;
  - added `learning-card-evaluation-service` to assemble bounded authenticated
    evaluation input, call Gateway, parse an evaluation draft, validate schema,
    graph binding, daily-card policy, and privacy, then return the evaluator
    DTO consumed by `growth-evaluation-service`;
  - added `GROWTH_GATEWAY_EVALUATION_*` config fields in `src/config/env.js`;
  - wired `src/app/services.js` so Gateway evaluation is injected only when
    `GROWTH_GATEWAY_EVALUATION_ENDPOINT` is configured. Without that endpoint,
    the existing deterministic evaluator remains the local fallback;
  - extended the card authoring/model boundary guard so it also checks the
    evaluation model boundary and direct-vendor-call exclusions.
- Product boundary:
  - generated daily cards still use `daily_score_once`: one evaluation, one
    optional reflection, completion after the first evaluation, and
    score-proportional reward without pass-line retry;
  - Gateway evaluation output is not persisted directly. It is an evaluation
    draft until validation accepts `growth.card.evaluation.v1`,
    `skillResults` graph binding, daily-card policy, and privacy scans.
- Harness added/updated:
  - `tests/learning-card-evaluation-service.test.js` covers fake Gateway SSE,
    ordinary JSON, official Responses endpoint body, repair prompt body,
    invalid JSON, missing schema fields, privacy-risk output, timeout, and
    evaluator throw behavior for queue retry;
  - `tests/growth-evaluation-service.test.js` now asserts injected Gateway
    evaluator ordering before record/reward/profile side effects;
  - `tests/growth-architecture-boundary.test.js` asserts evaluation Gateway
    wiring stays service-owned and route-free.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - `node --test tests/learning-card-evaluation-service.test.js`;
  - `node --test tests/growth-evaluation-service.test.js tests/growth-architecture-boundary.test.js tests/growth-card-authoring-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/learning-card-evaluation-service.test.js tests/growth-evaluation-service.test.js tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/learning-card-generation-context-service.test.js`;
  - `node --test tests/learning-card-authoring-service.test.js tests/learning-card-generation-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-routes.test.js`;
  - `npm run check`;
  - `npm test` with 173 passing tests;
  - `git diff --check`;
  - CodeGraph sync/status after edits: 107 files, 1107 nodes, 3705 edges.
- AI Ops:
  - intake classified the slice as H1 Gateway Runtime because the task touches
    Gateway;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and `git diff --check`;
  - evidence id: `evidence-9746b596-d726-4246-8ee3-1e2a47109a90`.
- Remaining architecture work:
  - expose Owner profile/trajectory projection in the plugin UI;
  - add experience-signal write route before making learner difficulty buttons
    active;
  - implement stage-assessment activation as a separate service/harness slice;
  - configure and smoke a real production Gateway evaluation endpoint before
    turning the model evaluator on in production.

## 2026-06-14 Growth AI Card Loop Service Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public` in `d18d425`
  (`Add Growth AI card loop evaluation boundary`); not deployed.
- Scope:
  - added `docs/GROWTH_AI_CARD_LOOP.md` as the plugin-owned contract for
    learner profile -> next-card strategy -> card generation -> evaluation
    evidence -> profile/trajectory update;
  - added `learning-mastery-profile-service`,
    `learning-card-trajectory-service`, and
    `learning-next-card-strategy-service`;
  - added `src/stores/growth-learning-sqlite/mastery-profile.js` as the
    SQLite repository for `learning_growth_mastery_states`,
    `learning_growth_experience_signals`, and
    `learning_growth_card_trajectories`;
  - wired `growth-evaluation-service` so completed evaluations attempt
    summary-only profile update, next-card strategy, and trajectory recording
    after evaluation/reward settlement;
  - wired card generation context and generation requests to include
    `nextCardStrategy` and recent trajectory summaries.
- Product boundary:
  - this is the first closed-loop service slice; it does not yet enable
    fully automatic large-scale card generation or stage-assessment activation;
  - deterministic strategy is service-owned; Gateway remains the model boundary
    for authoring, and future production evaluation should use a Growth-owned
    Gateway evaluation client.
- Harness added:
  - `tests/learning-mastery-profile-service.test.js`;
  - `tests/learning-card-trajectory-service.test.js`;
  - `tests/learning-next-card-strategy-service.test.js`;
  - `tests/growth-evaluation-service.test.js`;
  - extended generation context/generation service tests for strategy payloads.
- Validation passed:
  - `node --test tests/learning-mastery-profile-service.test.js tests/learning-card-trajectory-service.test.js tests/learning-next-card-strategy-service.test.js tests/growth-evaluation-service.test.js tests/learning-card-generation-context-service.test.js tests/learning-card-generation-service.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 162 passing tests;
  - `node --test tests/growth-learning-sqlite-store.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-routes.test.js`;
  - app AI Ops required-checks listed Gateway runtime tests because the task
    mentions Gateway; those app-side checks also passed:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`;
  - `git diff --check`;
  - CodeGraph status after edits: 104 files, 1046 nodes, 3480 edges.
- AI Ops evidence:
  - `evidence-3c8635f5-00c3-4cfc-ae6a-c7fc6066ce74`.
- Remaining architecture work:
  - expose Owner profile/trajectory projection in the plugin UI;
  - add experience-signal write route before making learner difficulty buttons
    active;
  - implement stage-assessment activation as a separate service/harness slice.

## 2026-06-14 Growth Owner Profile Projection Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public`; not deployed.
- Scope:
  - added `learning-profile-projection-service` so Owner card generation reads
    a selected learner's bounded mastery, weakness, strength, experience signal,
    trajectory, and next-card strategy projection through a Growth service;
  - wired `learning-card-generation-context-service` to include
    `learningProfile` in the generation context for the selected target
    workspace, not the Owner workspace;
  - updated the Owner card generation UI to render a read-only `学习画像`
    panel with weakness, trajectory, and next recommendation summaries;
  - kept the projection summary-only and excluded raw answers, raw transcripts,
    raw prompts, and source document bodies from the UI/context path.
- Product boundary:
  - this slice makes the AI learning loop observable to Owner before generation;
  - it does not yet add learner difficulty feedback write routes or automatic
    stage-assessment activation;
  - production visual publish still requires the central Home AI embedded
    visual harness before deployment.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-profile-projection-service.test.js`;
  - `tests/learning-card-generation-context-service.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-profile-projection-service.test.js tests/learning-card-generation-context-service.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 177 passing tests;
  - `git diff --check`;
  - CodeGraph status after edits: 109 files, 1128 nodes, 3842 edges.
- AI Ops:
  - intake classified the slice as H1 Gateway Runtime and did not require a
    visual lane;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/gateway-run-lifecycle-service.test.js`,
    `node tests/gateway-run-start-service.test.js`,
    `node tests/gateway-run-stream-service.test.js`,
    `node tests/runtime-config-provider.test.js`, and `git diff --check`;
  - evidence id: `evidence-e236c860-6c49-4462-8392-82e0919af890`.
- Remaining architecture work:
  - add an experience-signal write route before enabling learner difficulty
    feedback controls;
  - implement stage-assessment eligibility and activation as a separate
    service/harness slice;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Learner Experience Signal Write Slice

- Current workspace state: implemented, locally validated, committed, and
  pushed to `origin` and `public`; not deployed.
- Scope:
  - added `learning-experience-signal-service` as the Growth-owned learner
    feedback writer for `too_easy`, `right_level`, `too_hard`, and
    `not_learned`;
  - added `POST /api/v1/growth/cards/:taskCardId/experience-signals`, using
    the existing workspace bearer authorization path;
  - wired the embedded generated-card completion footer so active difficulty
    buttons call the Growth API helper, show progress/error/success state, and
    refresh the current card projection;
  - updated SQLite card projection so graph-bound cards expose `targetNodeIds`
    and `experienceSummary.latestSignalType` from the latest
    `learning_growth_experience_signals` row.
- Product boundary:
  - difficulty feedback is not grading and does not reopen evaluation or
    reflection;
  - learner feedback writes require graph target nodes. Legacy/unanchored cards
    show a disabled status instead of writing unanchored signals;
  - the service rejects raw answers, transcripts, prompts, answer keys, secrets,
    private paths, and provider configuration.
- Documentation updated:
  - `docs/GROWTH_AI_CARD_LOOP.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness added/updated:
  - `tests/learning-experience-signal-service.test.js`;
  - `tests/growth-routes.test.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `tests/growth-architecture-boundary.test.js`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- Validation passed:
  - `node --test tests/learning-experience-signal-service.test.js tests/growth-routes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 182 passing tests;
  - `git diff --check`;
  - CodeGraph status after edits: 111 files, 1150 nodes, 3894 edges.
- AI Ops:
  - intake classified the slice as H3 Architecture Documentation And Harness
    Map and did not require visual lane or deployment;
  - required app-side checks passed from `/Users/hermes-dev/HermesMobileDev/app`:
    `node tests/architecture-code-test-harness-map.test.js` and
    `git diff --check`;
  - evidence id: `evidence-7e5e39e7-7d09-4e6f-a572-9a3ed0a61c93`.
- Remaining architecture work:
  - implement stage-assessment eligibility and activation as a separate
    service/harness slice;
  - add a broader workflow recovery harness for listener restart/stale
    evaluation leases before scaling generated cards beyond the initial sample;
  - run central visual evidence and production smoke before any deployment.

## 2026-06-14 Growth Card Detail Back Navigation Hotfix

- Current workspace state: implemented, validated, committed, pushed to
  `origin` and `public`, and deployed to Mac production.
- Deployment:
  - runtime commit: `92f8144` (`Fix Growth card detail back navigation`);
  - static asset version query: `20260614-growth-navigation-v1`;
  - deployed with
    `npm run deploy:macos -- --plugin growth --execute` from
    `/Users/hermes-dev/HermesMobileDev/app`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T032732Z-plugin-growth-manual`.
- User-visible bug:
  - on a Growth practice/generated-card detail page, Home AI right-swipe/back
    could return to the host instead of first returning to the Growth parent
    list.
- Fix:
  - added `public/growth-navigation-controller.js`;
  - `public/app.js` now emits `growth.plugin.navigation`, handles
    `hermes.plugin.back`, and returns `growth.plugin.back_result`;
  - card detail open pushes an internal Growth history entry; card refresh
    replaces the current entry instead of stacking duplicate detail states;
  - back at a card detail clears `selectedLearningTaskCardId`, renders the
    Growth board/list, and reports `handled:true`;
  - back at the Growth root reports `handled:false` so the Home AI host can
    own the next outer back action.
- Static asset version:
  - `20260614-growth-navigation-v1`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness updated:
  - `tests/growth-frontend-adapter.test.js` covers host back consumption on
    card detail, unhandled root back, and the new script load order;
  - `package.json` includes `public/growth-navigation-controller.js` in
    `npm run check`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `npm run check`;
  - `npm test` with 155 passing tests;
  - `git diff --check`;
  - Home AI app `node tests/architecture-code-test-harness-map.test.js`;
  - CodeGraph status after edits: 96 files, 969 nodes, 3152 edges.
- Visual/behavior evidence:
  - local Playwright mobile dark harness loaded real Growth UI renderers and
    `growth-navigation-controller.js`, simulated `hermes.plugin.back`, and
    verified detail -> board transition plus `growth.plugin.back_result`
    `handled:true`;
  - screenshot:
    `/tmp/growth-navigation-back-mobile-dark.png`.
- AI Ops note:
  - `ai-ops-control-plane.js` classified the change as H3 and did not require
    a visual lane, but this was treated locally as H2 because it changes
    embedded plugin back/right-swipe behavior.
  - evidence ledger ids:
    `evidence-7e9cc5d7-a164-4237-9fbd-f952db55ceb1`,
    `evidence-46b0897b-c715-426a-8dcd-f4412e2a0e48`.

## 2026-06-14 Growth Audio Playback Hotfix

- Current workspace state: audio playback hotfix implemented, committed,
  pushed to `origin` and `public`, and deployed to Mac production.
- Deployment:
  - runtime hotfix commit: `beab6d6` (`Fix Growth audio playback recovery`);
  - asset cache-bust commit: `5a73060`
    (`Bump Growth audio playback asset version`);
  - static asset version query: `20260614-audio-playback-v1`;
  - deployed with
    `npm run deploy:macos -- --plugin growth --execute` from
    `/Users/hermes-dev/HermesMobileDev/app`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260614T030758Z-plugin-growth-manual`.
- User-visible bug:
  - after recording audio in a generated Growth daily card, playback could
    show a browser-native error without a recoverable Growth UI state;
  - submitted `.webm` audio could also be served with an Ogg content type in
    some plugin-owned playback paths.
- Fix:
  - `public/growth-card-interaction-controller.js` now chooses a recorder MIME
    that is both `MediaRecorder`-recordable and browser-playable when possible,
    and records visible preview playback failure state;
  - `public/growth-legacy-task-ui.js` renders recoverable local preview error
    state and saved-audio playback error text;
  - `public/app.js` wires local preview and saved evidence `<audio>` error
    events to visible UI feedback;
  - `src/stores/growth-learning-sqlite/audio-metadata.js` now preserves
    explicit non-generic MIME values and maps `.webm` to `audio/webm` instead
    of `audio/ogg`.
- Documentation updated:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Harness updated:
  - `tests/growth-frontend-adapter.test.js` covers record/play MIME selection,
    preview playback failure state, recoverable recorder UI, and saved audio
    error rendering;
  - `tests/growth-learning-sqlite-audio.test.js` covers WebM playback MIME and
    explicit metadata priority;
  - `tests/growth-learning-sqlite-evidence-writes.test.js` now expects
    no-MIME `.webm` uploads to decode as `audio/webm`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js`;
  - `node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `node scripts/check-growth-docs-locality.js`;
  - `git diff --check`;
  - `npm test` with 153 passing tests.
- Production smoke passed:
  - `GET /` references `20260614-audio-playback-v1`;
  - `growth-card-interaction-controller.js`, `growth-legacy-task-ui.js`, and
    `app.js` return the new audio playback recovery hooks;
  - `GET /api/v1/growth/status?workspaceId=weixin_stephen` returns
    `ok:true`, `stage:plugin_sqlite`, `quick_check:ok`, and 10 audio BLOBs;
  - missing audio route returns bounded `404 growth_audio_not_found`;
  - existing Ogg submission audio streams with `200 Content-Type: audio/ogg`.
- Visual evidence:
  - Codex in-app Browser was unavailable (`Browser is not available: iab`), so
    local visual validation used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`;
  - mobile dark recorder error screenshot:
    `/tmp/growth-audio-preview-error-recorder-dark.png`;
  - mobile dark saved-audio error screenshot:
    `/tmp/growth-saved-audio-error-evidence-dark.png`;
  - verified preview failure keeps `重新录音` and `清除`, hides the bad local
    preview audio element, and saved-audio error text renders visible in dark
    mode with color `rgb(255, 177, 166)`.

## 2026-06-12 Growth Generated Card Full Flow UI

- Current workspace state: uncommitted dev changes in the Growth plugin
  workspace; not deployed yet.
- Product/UI fix:
  - generated daily card detail now renders one old-style vertical workflow
    page instead of a stepper-only detail;
  - visible order is status rail, score policy, learning target,
    prerequisites, lesson/worked example, guided practice, submission,
    saved-submission/waiting-evaluation/evaluation result, optional one-time
    reflection, and completion feedback;
  - the page keeps `daily_score_once`: one answer submission, one evaluation,
    optional one reflection, score-proportional reward, no pass-line gate, no
    retry-until-pass loop;
  - before submission, the rail shows learning/submission as in progress
    instead of marking learning complete merely because the card opened;
  - after submission, the active `提交作答` button is removed and saved
    evidence plus `等待批改` / `刷新批改` or the final evaluation is shown;
  - completion feedback no longer exposes active difficulty-signal buttons
    because Growth does not yet own the matching write route. It renders
    read-only difficulty chips and a status note instead.
- Projection fix:
  - plugin-owned SQLite board/detail projection now maps terminal
    `daily_score_once` evaluations to `completed_recent` / review even when
    the score is low or a legacy evaluator status says `needs_revision`,
    `draft_feedback`, or `reflection_required`;
  - formal `stage_assessment` cards still keep the legacy gated
    revision/reflection lanes.
- Changed files:
  - `src/stores/growth-learning-sqlite/projection.js`;
  - `public/growth-legacy-task-ui.js`;
  - `public/growth-homeai-legacy.css`;
  - `public/index.html`;
  - `tests/growth-learning-sqlite-projection.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-embedded-layout.test.js`;
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed:
  - `node --test tests/growth-learning-sqlite-projection.test.js`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-routes.test.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 149 passing tests;
  - `git diff --check`;
  - CodeGraph status reports the Growth index available: 95 files, 943 nodes,
    3074 edges.
- Local visual evidence:
  - in-app Browser was unavailable (`iab` missing), so local visual validation
    used Home AI app Playwright from
    `/Users/hermes-dev/HermesMobileDev/app/node_modules/playwright`;
  - mobile dark mock render at 390x844 verified flow rail, submission status,
    evaluation panel, reflection form after scroll, no submitted-state
    `提交作答` button, scrollable bottom content, and completion feedback
    with `activeExperienceButtons=0`, `readonlyMode=readonly`,
    `readonlyDisplay=flex`, and chip radius `999px`;
  - screenshots:
    `/tmp/growth-card-flow-v3-mobile-dark-top.png` and
    `/tmp/growth-card-flow-v3b-mobile-dark-bottom.png`.
  - 2026-06-12 rerun after the projection fix rendered a 390x844 dark mock
    with Home AI Playwright. It verified `.growth-shell` scrolls to the bottom
    (`scrollHeight=2765`, bottom `scrollTop=1921`), `提交反思` is visible,
    active difficulty buttons are absent, read-only difficulty mode is present,
    and panel text contrast is about `15.25`;
  - latest screenshots:
    `/tmp/growth-card-flow-v4-mobile-dark-top.png` and
    `/tmp/growth-card-flow-v4-mobile-dark-bottom.png`.
- Central visual harness status:
  - Home AI AI Ops intake/required-checks were run from
    `/Users/hermes-dev/HermesMobileDev/app`; the classifier returned H3 and did
    not require a visual lane, but Growth's plugin-local contract still treats
    central embedded visual evidence as required before production publish;
  - started Appium through
    `$HOME/.homeai-qa/scripts/macos-ios-appium-start.sh`;
  - started and later stopped Home AI live-debug server
    `npm run ios:pwa:debug` on `http://127.0.0.1:19073/`;
  - after cleanup, `19073` and `4723` were not listening;
  - `npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/ --theme dark --timeout-ms 70000 --json`
    first failed because no `--app-url` was provided and the simulator stayed
    on a previous `127.0.0.1` page; screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T095308Z.png`;
  - reran with
    `--app-url 'https://wardrobe-xuxin.synology.me:8555/?source=pwa'`; Home AI
    loaded with `authenticated:false`, `app.className="app hidden"`, and no
    Growth shell/frame; screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T095455Z.png`;
  - both central visual runs are not pass evidence and should not be used for
    release acceptance until an authenticated Home AI host can render the Growth
    plugin shell/frame.
  - 2026-06-12 rerun with the same central command also failed because Home AI
    loaded unauthenticated (`authenticated:false`, `app.className="app hidden"`)
    and no Growth shell/frame existed. Screenshot artifact:
    `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260612T101822Z.png`.
  - after the rerun, the local live-debug server and Appium listener were
    stopped; `19073` and `4723` were not listening.
- AI Ops evidence ledger:
  - local test pass:
    `evidence-b195e9bb-721c-4649-aa57-2bd79fa980d2`;
  - central visual blocked:
    `evidence-a14ef3e2-147e-49c3-99c4-fa0d8db039e8`.
  - latest local test pass:
    `evidence-2a0e08b4-aae1-4af3-942d-04f76876805c`;
  - latest local visual pass:
    `evidence-6eac2333-2f40-411f-8eec-b8e892c51ba6`;
  - latest central visual blocked:
    `evidence-5b02b83e-501f-4379-920c-e516c2791ac1`.

## 2026-06-12 Growth Generated Card Interaction UI

- Deployment status:
  - committed code/docs as `07217804cb39` (`Add Growth card interaction flow`);
  - pushed `main` to `origin` (`pentiumxp/Growth.git`) and `public`
    (`pentiumxp/Growth-Public.git`);
  - deployed from
    `/Users/hermes-dev/HermesMobileDev/plugins/growth` to
    `/Users/hermes-host/HermesMobile/plugins/growth` using the central Home AI
    `deploy-macos-production.js` plugin path;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260612T035549Z-plugin-growth-growth-card-interaction`;
  - restarted launchd label `com.hermesmobile.plugin.growth`;
  - deploy health validation passed for
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`;
  - direct production smokes passed for `/`, the
    `growth-card-interaction-controller.js` static asset, manifest projection,
    Growth status for `weixin_stephen`, and board projection for
    `weixin_stephen`;
  - unauthenticated Home AI same-origin proxy smoke returned expected `403`;
  - authenticated proxy smoke was not completed because local `sudo -n` access
    to read the production Owner web-key secret was blocked by
    `sudo: a password is required`; no secret value was read or printed;
  - AI Ops evidence ledger record:
    `evidence-f9b82964-b126-4a38-9591-f5e77991b1e0`.
- Implemented plugin-local learner interaction for generated daily Growth
  cards:
  - one answer submission from the card detail quick-check step;
  - optional browser recording for answer evidence;
  - visible saved-submission, waiting-evaluation, evaluation-result, and
    error states;
  - manual `刷新批改` action backed by
    `POST /api/v1/growth/evaluations/process`;
  - one optional reflection with text/audio evidence;
  - submitted reflection playback/status without reopening the form.
- Added frontend API helpers in `public/growth-api-client.js`:
  `fetchGrowthCard`, `submitGrowthCardEvidence`,
  `processGrowthEvaluations`, `submitGrowthCardReflection`, and embedded
  proxy audio URL resolution.
- Added modular frontend controller:
  `public/growth-card-interaction-controller.js`. `public/app.js` now wires
  the controller instead of owning recording encoding or evidence submission
  workflow logic.
- Updated generated card renderer:
  `public/growth-legacy-task-ui.js` now renders the submission form, recorder
  controls, submission status, one-shot evaluation panel, optional reflection
  form, and reflection status/audio playback.
- Updated styling in `public/growth-homeai-legacy.css` for the new evidence,
  evaluation, reflection, recorder, and dark-mode surfaces.
- Updated static version in `public/index.html` to
  `20260612-card-interaction-v1`.
- Updated docs:
  - `docs/GROWTH_CARD_INTERACTION_FLOW.md`;
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/GROWTH_DOCS_INDEX.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Updated harness:
  - `tests/growth-frontend-adapter.test.js` covers API helper paths, embedded
    proxy audio URL resolution, pre-submission generated-card UI, one-shot
    evaluation UI, and submitted-reflection UI;
  - `tests/growth-architecture-boundary.test.js` now requires the interaction
    controller module and index load order;
  - `package.json` includes `public/growth-card-interaction-controller.js` in
    `npm run check`.
- Validation passed:
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-embedded-layout.test.js tests/growth-architecture-boundary.test.js`;
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-routes.test.js`;
  - `npm run check`;
  - `npm test` with 145 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `git diff --check`.
- Browser evidence:
  - started a local plugin instance on `http://127.0.0.1:4893`;
  - Playwright rendered a dark-mode generated-card mock at mobile width,
    verified score text `确定分数 72/100`, disabled submitted state, reflection
    recorder controls, and internal scroll reachability for `提交反思`.
- Central visual harness status:
  - attempted the Home AI central command
    `npm run ios:pwa:visual -- --scenario embedded-plugin-shell --plugin-id growth --debug-url http://127.0.0.1:19073/`;
  - result was `{"ok":false,"error":"fetch failed"}` because the
    `19073` live-debug server was not running;
  - do not count this as a passing central iOS visual result before any
    production publish.

## 2026-06-11 Growth Documentation Locality

- Product direction: all Growth-specific documentation belongs in the Growth
  plugin workspace. The Home AI app workspace remains canonical only for broad
  platform contracts and runbooks.
- Added plugin-local Growth documentation index:
  `docs/GROWTH_DOCS_INDEX.md`.
- Added consolidated card generation rule summary:
  `docs/GROWTH_CARD_GENERATION_RULES.md`.
- Migrated 17 Growth-specific Home AI docs into `docs/home-ai-growth/`:
  - FanFan learning system and evergreen card design/implementation notes;
  - Growth learning module doc;
  - Growth KG requirements, architecture, design, and implementation notes;
  - teaching-card flow and implementation notes;
  - pluginization plan;
  - workflow contract harness;
  - mastery profile;
  - async evaluation queue;
  - Growth stuck/waiting-AI and submit-disabled runbooks.
- Added locality harness:
  - `scripts/check-growth-docs-locality.js`;
  - `tests/growth-docs-locality.test.js`.
- Updated local pointers:
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `README.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md`;
  - `package.json` check script.
- Validation passed:
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 103 passing tests;
  - `git diff --check`.
- Current boundary:
  - Growth-specific docs should be updated under this plugin workspace first;
  - historical migrated docs may still mention Home AI `adapters/*` or
    `server-routes/*` paths as provenance, but those are not plugin runtime
    ownership boundaries;
  - broad Home AI platform contracts, deployment runbooks, AI Ops docs,
    Gateway runtime docs, Action Inbox, Web Push, and reference-memory docs
    remain centralized in the Home AI app workspace.

## 2026-06-11 Growth Card Authoring Gateway Boundary

- Product/architecture decision: Growth owns card authoring. New card
  generation should be implemented inside the Growth plugin, not by calling
  Home AI old Growth route/server internals.
- Gateway is the only model boundary for card authoring. Growth may depend on
  Home AI provided Gateway access/config, but must not direct-call OpenAI,
  Claude, DeepSeek, or other model vendors.
- Documented service split:
  - `learning-card-generation-service`;
  - `learning-card-authoring-service`;
  - `growth-gateway-authoring-client`;
  - `learning-card-authoring-validation-service`.
- Implemented the first service slice:
  - `src/services/learning-card-authoring-service.js` assembles summary-only
    authoring input, calls Gateway, applies validation/repair policy, and
    delegates accepted drafts to an injected publisher;
  - `src/services/growth-gateway-authoring-client.js` aggregates Gateway SSE
    and ordinary JSON responses into model text without direct vendor calls;
  - `src/services/learning-card-authoring-validation-service.js` validates
    JSON drafts, `teachingFlow`, role policy, graph plan consistency, stage
    assessment coverage, and privacy/bounded-content rules.
- Updated docs:
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Added boundary harness:
  - `scripts/check-growth-card-authoring-boundary.js`;
  - `tests/growth-card-authoring-boundary.test.js`.
- Added fake Gateway service harness:
  - `tests/learning-card-authoring-service.test.js`.
- Harness coverage:
  - required docs mention Gateway-only card authoring, structured summary-only
    inputs, authoring draft flow, `teachingFlow` validation, role policy,
    graph binding validation, privacy scan, SSE and JSON Gateway modes, and
    fake Gateway scenarios;
  - source scan rejects direct provider API keys, provider SDK imports, and
    direct provider endpoints in `src/` and `scripts/`.
- Fake Gateway scenarios cover valid stream, valid JSON, empty output, invalid
  JSON with repair success, repair failure, missing schema fields, privacy scan
  failure, timeout, graph policy mismatch, and publisher transaction failure.
- Current boundary: card generation is exposed through the workspace-bearer
  `POST /api/v1/growth/cards/generate` route and writes accepted drafts to
  Growth SQLite through the plugin-owned publisher. Production use still
  requires a configured Gateway authoring endpoint/access boundary.
- Validation passed:
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node --test tests/growth-card-authoring-boundary.test.js tests/learning-card-authoring-service.test.js`;
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `git diff --check`.

## 2026-06-11 Growth Graph And History Card Generation

- Implemented graph-plus-history generation orchestration:
  - `src/services/learning-card-generation-service.js` creates or accepts a
    validated graph plan, reads bounded historical summaries, adds graph node
    source summaries, calls authoring, and returns the published card result;
  - `src/stores/growth-learning-sqlite/history-summary.js` summarizes recent
    cards, evaluations, mastery states, experience signals, and aggregate
    counts without exposing raw learner submissions or transcripts;
  - `src/stores/growth-learning-sqlite/card-authoring-publisher.js` upserts
    `learning_task_cards` and writes `learning_card_graph_bindings` in one
    SQLite transaction, rolling back on graph-binding failure.
- Wired runtime composition:
  - `src/app/services.js` creates Gateway authoring client, validation,
    authoring, generation, history, and publisher dependencies;
  - `src/config/env.js` reads Gateway authoring endpoint/token path settings;
  - `src/routes/growth-routes.js` exposes
    `POST /api/v1/growth/cards/generate` behind workspace-bearer
    authorization.
- Updated docs and boundary harness:
  - `docs/GROWTH_CARD_GENERATION_RULES.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `README.md`;
  - `.agent-context/PROJECT_CONTEXT.md`;
  - `scripts/check-growth-card-authoring-boundary.js`.
- New focused harness:
  - `tests/learning-card-generation-service.test.js` covers graph plan
    creation, historical summary injection, raw submission exclusion from
    Gateway input, transactional card+binding publish, plan failure before
    Gateway, and rollback on binding failure;
  - `tests/growth-routes.test.js` covers the protected generation route.
- Validation passed:
  - `node --test tests/learning-card-generation-service.test.js`;
  - `node --test tests/growth-routes.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`;
  - `node scripts/check-growth-docs-locality.js`;
  - `node --test tests/growth-card-authoring-boundary.test.js tests/growth-docs-locality.test.js`;
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `git diff --check`.

## 2026-06-11 Daily Card One-Pass Scoring Policy

- Product rule: daily ordinary Growth cards should keep the existing card UI
  shape but must not behave like pass/fail exams. The policy is documented in
  `docs/GROWTH_CARD_GENERATION_RULES.md` as `daily_score_once`.
- Daily generated cards now publish this completion policy in card `raw_json`:
  - one submission evaluation;
  - one optional reflection;
  - completion after the first evaluation;
  - score-proportional learning-coin settlement;
  - no pass-line gate.
- Implemented runtime enforcement:
  - `src/stores/growth-learning-sqlite/card-authoring-publisher.js` writes
    `completionPolicy.mode=daily_score_once` for generated cards;
  - `src/stores/growth-learning-sqlite/evidence-writes.js` rejects a second
    submission or second reflection for daily-score cards;
  - `src/services/growth-evaluation-service.js` no longer emits
    `needs_revision` for the deterministic daily evaluator. It records one
    score, feedback, and next-practice suggestions;
  - `src/stores/growth-learning-sqlite/rewards.js` settles learning coins by
    `score / 100 * reward_cap_coins` and completes the card regardless of a
    pass/fail threshold;
  - `src/stores/growth-learning-sqlite/history-summary.js` treats
    `status=completed` as completion evidence even when no pass-line concept
    is used.
- UI boundary: public DTO fields remain compatible with the existing renderer
  (`latestSubmission`, `latestEvaluation`, `latestReflection`, `rewardPolicy`,
  `rewardState`, `laneId`, `nextAction`, `primaryAction`, and
  `teachingFlow`). The backend should avoid producing `needs_revision` or
  `reflection_required` for daily-score cards.
- Verified production history remains available for Stephen/Stefan under
  `weixin_stephen` by read-only SQLite aggregation:
  - cards: 48;
  - submissions: 18;
  - evaluations: 24;
  - reflections: 5;
  - audio BLOBs: 10;
  - reward settlements: 5;
  - mastery states: 22;
  - experience signals: 2;
  - native graph nodes: 294;
  - native graph edges: 329.
- Focused validation passed:
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/learning-card-generation-service.test.js`;
  - `node scripts/check-growth-card-authoring-boundary.js`.
- Full validation passed:
  - `npm run check`;
  - `npm test` with 121 passing tests;
  - `node scripts/check-growth-docs-locality.js`;
  - `git diff --check`.

## 2026-06-11 Growth Knowledge Graph Native Import Harness

- The recovered Fan Fan UK/HK IGCSE/A-Level graph source pack remains a Mac
  staging artifact and has not been copied into the Growth runtime or deployed:
  `/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json`.
- Added a native import harness:
  - `src/services/learning-graph-import-service.js`;
  - `src/stores/growth-learning-sqlite/graph-schema.js`;
  - `src/stores/growth-learning-sqlite/graph-repository.js`;
  - `scripts/import-learning-graph-pack.js`;
  - `tests/learning-graph-import-service.test.js`;
  - `tests/learning-graph-repository.test.js`.
- Dry-run mode remains the default and does not mutate Growth SQLite. Write
  mode requires `--write --target-db`, checkpoints/truncates the target WAL,
  creates a timestamped SQLite backup when the target exists, and imports only
  bounded native graph metadata into `learning_graph_*` tables.
- Validation checks include supported schema version, `summary_only` privacy,
  required domain pack/node/edge fields, duplicate node/edge ids, missing edge
  endpoints, prerequisite cycles, unsafe raw-content key names, and absolute or
  UNC source-document paths.
- Recovered graph dry-run and throwaway SQLite write validation passed:
  - sha256:
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - schemaVersion: `hermes.learningGraphSeed.v0.1`;
  - importId: `kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1`;
  - sourceDocuments: 15;
  - domainPacks: 1;
  - nodes: 294;
  - edges: 329;
  - prerequisite edges: 34;
  - graph plans: 0;
  - card graph bindings: 0;
  - duplicate node ids, duplicate edge ids, missing edge endpoints,
    prerequisite cycles, rejected records, unsafe raw-content keys, and
    absolute source-document paths were all 0.
- The dry-run reports 12 `cross_domain_prerequisites_require_review` warnings.
  These are mostly Lower Secondary English/Science to IGCSE ESL/Biology/
  Chemistry/Physics bridge edges. They are acceptable as warnings in this
  phase, but native repository import should model or approve the bridge policy
  before graph-required card generation is enabled.
- Focused validation passed:
  - `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js`;
  - `node scripts/import-learning-graph-pack.js --source /Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 --dry-run --json`.
- Full validation passed after adding native graph import write mode:
  - `npm run check`;
  - `npm test` with 93 passing tests.
- The import tools were deployed to Mac production with the central deploy
  script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T103900Z-plugin-growth-growth-knowledge-graph-import-tools`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- A readable temporary source copy was prepared for the production permission
  boundary:
  `/tmp/homeai-growth-kg-import/fanfan-uk-hk-igcse-a-level-graph-v1.json`.
  Its sha256 matches
  `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`.
- Production data import completed by running the production-path command as
  `hermes-host` through the same bounded sudo password-file mechanism used by
  the central Mac deploy script. The password was not printed.
- Production import backup:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-graph-import-20260611T104021Z.sqlite3`.
- Production import readback:
  - `learning_graph_imports`: 1;
  - `learning_graph_domain_packs`: 1;
  - `learning_graph_nodes`: 294;
  - `learning_graph_edges`: 329;
  - `learning_graph_plans`: 0;
  - `learning_card_graph_bindings`: 0;
  - import prerequisite edges: 34;
  - missing graph tables: none;
  - source sha256 matched
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - duplicate ids, missing edge endpoints, prerequisite cycles, rejected
    records, unsafe raw-content keys, and absolute source-document paths were
    all 0.
- SQLite `PRAGMA quick_check` returned `ok` after import.
- Growth production service smoke still passed after import:
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards.
- Exact production write command used:

```bash
/Users/hermes-host/HermesMobile/runtime/node-current/bin/node \
  /Users/hermes-host/HermesMobile/plugins/growth/scripts/import-learning-graph-pack.js \
  --source /tmp/homeai-growth-kg-import/fanfan-uk-hk-igcse-a-level-graph-v1.json \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --expected-sha256 b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36 \
  --write \
  --json
```

- Exact readback command:

```bash
/Users/hermes-host/HermesMobile/runtime/node-current/bin/node \
  /Users/hermes-host/HermesMobile/plugins/growth/scripts/import-learning-graph-pack.js \
  --target-db /Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3 \
  --readback \
  --import-id kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1 \
  --json
```

## 2026-06-11 Growth Knowledge Graph Plan And Binding Services

- Added native graph planning and card-binding services on top of the imported
  `learning_graph_*` tables:
  - `src/services/learning-graph-plan-service.js`;
  - `src/services/learning-card-graph-binding-service.js`;
  - repository lookup and persistence helpers in
    `src/stores/growth-learning-sqlite/graph-repository.js`;
  - `tests/learning-graph-plan-binding-service.test.js`.
- Current service behavior:
  - creates `learningGraphPlan` records from native graph nodes;
  - resolves direct prerequisite nodes from `learning_graph_edges` where
    `edge_type='prerequisite'`;
  - rejects missing target nodes and missing prerequisite nodes;
  - focused `teaching` and `practice` plans require one target node;
  - `stage_assessment` plans require explicit assessment coverage node ids;
  - card bindings require an existing plan and valid binding nodes;
  - formal-card validation can fail closed with
    `learning_graph_plan_required` when graph-required mode is requested.
- This section was superseded by the later graph-plus-history generation work:
  new plugin-owned generation now uses graph plans, bounded historical
  summaries, Gateway authoring, and transactional card+binding publishing.
  Existing compatibility cards can still render safely.
- Focused validation passed:
  - `node --test tests/learning-graph-import-service.test.js tests/learning-graph-repository.test.js tests/learning-graph-plan-binding-service.test.js`
    with 13 passing tests.
- Full validation passed:
  - `npm run check`;
  - `npm test` with 98 passing tests.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T104612Z-plugin-growth-growth-knowledge-graph-plan-binding-services`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production post-deploy smoke passed:
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, and 0 card graph bindings;
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - `learning-graph-plan-service.js`,
    `learning-card-graph-binding-service.js`, and
    `tests/learning-graph-plan-binding-service.test.js` exist in the
    production plugin path.

## 2026-06-11 Growth Knowledge Graph Runtime API Boundary

- Wired native graph planning services into the Growth service graph:
  - `growthLearningStore.learningGraphRepository` is now exposed by the
    plugin-owned SQLite store facade;
  - `src/app/services.js` constructs
    `learningGraphPlanService` and `learningCardGraphBindingService`;
  - `src/routes/growth-routes.js` exposes protected runtime routes.
- Added protected workspace-bearer routes:
  - `POST /api/v1/growth/graph/plans`;
  - `POST /api/v1/growth/cards/:taskCardId/graph-binding`.
- Route behavior:
  - requires the workspace-local `.hermes-growth/access-key.txt` bearer and a
    writable `workspace_id`;
  - normalizes snake_case and camelCase graph payload fields;
  - converts authorized `growth:<workspace>` ids into the service workspace id;
  - uses the URL `:taskCardId` for card graph binding, not any body override;
  - returns `201` on successful plan/binding writes and `400` for bounded graph
    service validation failures.
- Added route harness coverage in `tests/growth-routes.test.js` for graph plan
  writes, card graph-binding writes, authorization failures, field
  normalization, URL card-id precedence, and service rejection mapping.
- Focused validation passed:
  - `node --test tests/growth-routes.test.js`;
  - `node --test tests/learning-graph-plan-binding-service.test.js`.
- Full local validation passed:
  - `npm run check`;
  - `npm test` with 100 passing tests;
  - `git diff --check`.
- AI Ops intake classified the task as H3 and the required app-side checks
  passed:
  - `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T110648Z-plugin-growth-growth-knowledge-graph-runtime-api`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production post-deploy smoke passed:
  - direct manifest returned `id=growth`;
  - status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, 0 card graph bindings, 34 prerequisite edges,
    and matching source sha256
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - unauthenticated graph plan and graph-binding POST requests for
    `weixin_stephen` returned `403 permission_denied`.
- Boundary at that point, now superseded by the graph-plus-history generation
  section above:
  - production card generation was not graph-required yet at that stage;
  - existing compatibility cards, board projection, submissions, evaluations,
    reflection writes, and Growth learning-coin settlement remain unchanged;
  - do not production-smoke these routes with write payloads unless the caller
    intends to create durable `learning_graph_plans` or
    `learning_card_graph_bindings` rows.

## 2026-06-11 Growth Regenerable Card Retirement

- Product decision: old original-board compatibility cards, old Knowledge
  Graph pilot projection cards, and old evergreen cards are regenerable runtime
  rows. They should not drive the future Growth architecture. This supersedes
  the earlier historical notes above that said compatibility cards were left
  unchanged.
- Added the dry-run-first retirement harness:
  - `src/services/growth-card-retirement-service.js`;
  - `src/stores/growth-learning-sqlite/card-retirement.js`;
  - `scripts/retire-growth-cards.js`;
  - `tests/growth-card-retirement-service.test.js`.
- The harness is workspace-scoped and never hard-deletes rows. Write mode marks
  candidate `learning_task_cards` as `retired`, writes a bounded
  `raw_json.growthRetirement` audit marker, updates activation metadata when
  the columns exist, and cancels only open `pending`/`retry`/`processing`
  evaluation jobs for the retired cards.
- Learner history is intentionally preserved: submissions, evaluations,
  reflections, audio blobs, artifacts, rewards, and Growth learning-coin
  settlement rows remain addressable.
- Default candidate policy:
  - includes old board projection, old Knowledge Graph seed projection, and
    old evergreen/regenerable projection cards;
  - includes completed cards because they can also be regenerated;
  - excludes already hidden `cancelled`/`canceled`/`retired`/`superseded`
    cards;
  - excludes native graph-bound cards by default when
    `learning_card_graph_bindings` or `raw_json.learningGraphPlanId` exists.
- Documentation updated:
  - `docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md`;
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Validation passed before deployment:
  - `node --test tests/growth-card-retirement-service.test.js`;
  - `node --test tests/growth-card-retirement-service.test.js tests/growth-learning-sqlite-store.test.js`;
  - `npm run check`;
  - `npm test` with 102 passing tests;
  - `git diff --check`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app-side `git diff --check`.
- AI Ops evidence:
  - intake class: H3;
  - ledger record:
    `evidence-e3401b9e-4b8c-42b7-bdd3-3dc01e00d11a`.
- Production dry-run before writing, for workspace `weixin_stephen`:
  - candidateCount: 30;
  - visible board cards before retirement: 9;
  - total board cards before retirement: 30;
  - hidden future cards before retirement: 21;
  - byReason:
    `legacy_evergreen_regenerable_projection=7`,
    `legacy_kanban_projection=11`,
    `legacy_knowledge_graph_seed_projection=12`;
  - byStatus: `published=28`, `completed=2`;
  - graphBoundCount: 0;
  - related rows observed for candidates:
    `submissions=18`, `evaluations=16`, `reflections=5`,
    `artifacts=29`, `audioBlobs=10`, `evaluationJobs=6`, `rewards=2`.
- Deployed code to Mac production through the central Home AI deploy script:
  - target: `plugin:growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T120233Z-plugin-growth-growth-regenerable-card-retirement`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - manifest health passed.
- Production retirement write completed by running the production-path harness
  as `hermes-host`. The sudo password was not printed or recorded.
- Production data backup before retirement:
  `/Users/hermes-host/HermesMobile/plugins/growth/data/backups/growth-learning-before-card-retirement-20260611T120318Z.sqlite3`.
- Production write result:
  - `quick_check=ok`;
  - retired cards: 30;
  - remaining candidates after write: 0;
  - open evaluation jobs cancelled: 0;
  - board after retirement for `weixin_stephen`: `card_count=0`,
    `total_card_count=0`, `hidden_future_card_count=0`.
- Production post-write smoke passed:
  - direct manifest returned `id=growth`;
  - status for `weixin_stephen` returned `ok=true` and
    `source=growth-plugin-sqlite`;
  - board for `weixin_stephen` returned `ok=true`,
    `source=growth-plugin-sqlite`, and no visible/hidden board cards;
  - direct card detail for a retired card still returned HTTP 200 with
    `card.status=retired`, proving history/detail rows remain addressable;
  - dry-run after write returned `candidateCount=0`;
  - graph import readback still reports 1 import, 1 domain pack, 294 nodes,
    329 edges, 0 graph plans, 0 card graph bindings, 34 prerequisite edges,
    and matching source sha256
    `b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36`;
  - workspace SQL readback reported `cancelled=18`, `retired=30`,
    `retiredWithMarker=30`, `open_jobs=0`, and preserved related rows:
    `submissions=18`, `evaluations=24`, `reflections=5`,
    `audio_blobs=10`, `rewards=5`.
- Current boundary:
  - the old board is intentionally empty for `weixin_stephen`;
  - new production cards should be generated from the native Growth/KG service
    path, not from the retired compatibility projection rows;
  - this retirement step did not enable native graph-required card generation,
    but the later graph-plus-history generation service now provides that path;
  - no platform `通宝` exchange or monthly clearing behavior changed.

## 2026-06-11 Growth Core Module Refactor Started

- Goal: make the Growth plugin core clearer, more modular, and easier to
  extend while preserving current runtime behavior.
- Scope is plugin-internal only. Platform `通宝` exchange, Home AI host
  workflows, production deployment, and Gateway callable changes are out of
  scope for this step.
- Added Growth-local architecture documentation:
  `docs/GROWTH_PLUGIN_ARCHITECTURE.md`.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to point to the Growth-local
  architecture document and declare the new focused core helper harness.
- Split foundational SQLite store helpers out of the large store facade:
  - `src/stores/growth-learning-sqlite/core.js` owns shared SQLite/table,
    dynamic insert/upsert, bounded parsing, primitive normalization, and
    required table list helpers.
  - `src/stores/growth-learning-sqlite/identifiers.js` owns stable Growth ids
    and hashes for submissions, reflections, evaluation jobs, sessions,
    rewards, ledger entries, and audio blobs.
  - `src/stores/growth-learning-sqlite/audio-metadata.js` owns bounded audio
    evidence metadata and public audio DTO projection.
  - `src/stores/growth-learning-sqlite/audio.js` owns plugin-owned audio
    playback, SQLite BLOB priority reads, bounded legacy audio file lookup, and
    historical audio BLOB backfill.
  - `src/stores/growth-learning-sqlite/projection.js` owns board/card public
    DTO shaping, Growth lane grouping, sequence visibility, summaries, and
    bounded submission/evaluation/reflection/reward projections.
  - `src/stores/growth-learning-sqlite/evidence-writes.js` owns
    submission/reflection evidence write transactions, interaction session
    creation, evidence audio BLOB insertion, legacy kanban card id resolution,
    and pending evaluation job enqueueing.
  - `src/stores/growth-learning-sqlite/evaluation-jobs.js` owns evaluation job
    listing, claiming, completion, retry/failure state, evaluation context
    reads, bounded job projection, and evaluation record writes.
  - `src/stores/growth-learning-sqlite/rewards.js` owns evaluation reward
    settlement, task completion side effects, Growth learning-coin balance, and
    monthly clear ledger writes. Platform `通宝` exchange remains out of scope.
  - `src/stores/growth-learning-sqlite-store.js` remains the public store
    facade and is now mostly composition plus board/card read entrypoints.
  - `src/services/growth-service-models.js` owns pure bounded service
    projections for status, board, snapshot card fallback, and migration
    summaries.
  - `src/services/home-ai-growth-facade-client.js` owns Home AI Growth facade
    base URL normalization, workspace query building, and access-key header
    dispatch.
- Added focused harness:
  `tests/growth-learning-sqlite-core.test.js`.
  `tests/growth-learning-sqlite-audio.test.js`.
  `tests/growth-learning-sqlite-projection.test.js`.
  `tests/growth-learning-sqlite-evidence-writes.test.js`.
  `tests/growth-learning-sqlite-evaluation-jobs.test.js`.
  `tests/growth-learning-sqlite-rewards.test.js`.
  `tests/growth-service-models.test.js`.
- Validation passed:
  - Home AI AI Ops intake classified the work as H3 and required architecture
    docs/test-map checks;
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-core.test.js`;
  - `node --test tests/growth-learning-sqlite-core.test.js tests/growth-learning-sqlite-projection.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-learning-sqlite-audio.test.js tests/growth-learning-sqlite-store.test.js`;
  - `node --test tests/growth-learning-sqlite-evidence-writes.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-learning-sqlite-evaluation-jobs.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-learning-sqlite-rewards.test.js tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-service-models.test.js tests/growth-service.test.js`;
  - `npm test` with 68 passing tests;
  - Home AI app-side
    `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`.
- Generated local `.codegraph/` test byproduct was removed and is not part of
  the change.
- Next refactor targets:
  1. split `growth-service.js` fallback policy into explicit provider
     strategies if service branching grows again;
  2. split
     `public/app.js` route/view-model adapters.

## 2026-06-11 Growth Architecture Optimization Continued

- Continued the architecture optimization plan requested after the core SQLite
  split. Scope remains Growth-plugin internal; platform `通宝` exchange stays
  outside this refactor.
- Service providerization:
  - added `src/services/growth-read-orchestrator.js` for explicit status,
    board, card, and migration readback fallback order;
  - added `src/services/growth-providers/sqlite-provider.js`;
  - added `src/services/growth-providers/home-ai-facade-provider.js`;
  - added `src/services/growth-providers/snapshot-provider.js`;
  - reduced `src/services/growth-service.js` to service composition and write
    delegation.
- Frontend adapter split:
  - added `public/growth-appearance.js` for host appearance/viewport mapping;
  - added `public/growth-api-client.js` for workspace query, URL state, and
    bounded fetch errors;
  - added `public/growth-view-model.js` for board/card/overview projection;
  - added `public/growth-route-controller.js` for manifest route/action launch
    handling;
  - `public/app.js` is now a boot/wiring script.
- Architecture guard:
  - added `tests/growth-architecture-boundary.test.js` to prevent routes from
    importing stores directly, prevent `growth-service.js` from owning Home AI
    URL/header construction, keep the SQLite store facade out of file-system
    scanning, and keep frontend boot code from reabsorbing route/view-model
    logic.
- Added focused harness:
  - `tests/growth-service-providers.test.js`;
  - `tests/growth-frontend-adapter.test.js`;
  - `tests/growth-architecture-boundary.test.js`.
- Updated docs:
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `package.json` check script now covers the new service and frontend helper
    files.
- Validation passed:
  - `node --test tests/growth-service-providers.test.js tests/growth-service-models.test.js tests/growth-service.test.js tests/growth-routes.test.js`;
  - `node --test tests/growth-frontend-adapter.test.js tests/growth-service.test.js`;
  - `node --test tests/growth-architecture-boundary.test.js tests/growth-service-providers.test.js tests/growth-frontend-adapter.test.js`;
  - `npm run check`;
  - `npm test` with 79 passing tests;
  - Home AI app-side
    `node --check scripts/deploy-macos-production.js`;
  - Home AI app-side `node tests/macos-production-deploy-script.test.js`;
  - Home AI app-side `node tests/production-status-smoke-harness.test.js`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - `git diff --check`;
  - local dev service smoke on `127.0.0.1:4893` for Growth manifest, status,
    board, index helper script links, and helper asset reads.
- Production deploy completed through the central Home AI deploy script:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --json --reason growth-architecture-optimization --allow-dirty --execute`;
  - target: `plugin:growth`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T024933Z-plugin-growth-growth-architecture-optimization`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - deploy health URL passed:
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`.
- Production smoke passed:
  - direct plugin manifest returned `id=growth`;
  - direct plugin status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - production served `growth-appearance.js`, `growth-api-client.js`,
    `growth-view-model.js`, `growth-route-controller.js`, and `app.js`;
  - Home AI same-origin proxy
    `/api/hermes-plugins/growth/proxy/?embed=hermes&workspaceId=weixin_stephen`
    returned HTML containing `growth-root` and `growth-route-controller.js`.

## 2026-06-11 Growth Write Provider Boundary Continued

- Continued the plugin-internal architecture optimization after the read
  provider and frontend adapter split.
- Write providerization:
  - added `src/services/growth-write-orchestrator.js` for explicit
    plugin-owned command policy and bounded unavailable errors;
  - added `src/services/growth-providers/sqlite-write-provider.js` for SQLite
    submission, reflection, and Growth learning-coin command delegation;
  - kept `src/services/growth-providers/sqlite-provider.js` read-focused by
    removing direct write command exports;
  - reduced `src/services/growth-service.js` further so write methods are
    service-surface aliases to the write orchestrator.
- Architecture guard expanded:
  - `tests/growth-architecture-boundary.test.js` now checks read/write SQLite
    provider separation and keeps write error literals out of the composition
    service.
- Added focused harness:
  - `tests/growth-service-write-providers.test.js`.
- Updated docs:
  - `docs/GROWTH_PLUGIN_ARCHITECTURE.md`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`;
  - `package.json` check script now covers the new write orchestrator and
    SQLite write provider.
- Focused validation passed:
  - `node --test tests/growth-service-write-providers.test.js tests/growth-service-providers.test.js tests/growth-architecture-boundary.test.js tests/growth-service.test.js tests/growth-routes.test.js`
    with 33 passing tests.
- Full local validation passed:
  - `npm run check`;
  - `npm test` with 85 passing tests;
  - Home AI app-side
    `node scripts/plugin-workspace-platform-contract-check.js --json`;
  - Home AI app-side `node tests/plugin-workspace-platform-contract-check.test.js`;
  - Home AI app-side `node tests/architecture-code-test-harness-map.test.js`;
  - Home AI app-side `node --check scripts/deploy-macos-production.js`;
  - Home AI app-side `node tests/macos-production-deploy-script.test.js`;
  - Home AI app-side `node tests/production-status-smoke-harness.test.js`;
  - `git diff --check`;
  - local dev service smoke on `127.0.0.1:4894` for Growth manifest, status,
    board, index helper script links, and helper asset reads.
- Production deploy completed through the central Home AI deploy script:
  - command shape:
    `npm run --silent deploy:macos -- --plugin growth --json --reason growth-write-provider-boundary --allow-dirty --execute`;
  - target: `plugin:growth`;
  - production path: `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260611T030117Z-plugin-growth-growth-write-provider-boundary`;
  - restart label: `com.hermesmobile.plugin.growth`;
  - deploy health URL passed:
    `http://127.0.0.1:4881/api/v1/hermes/plugin/manifest`.
- Production smoke passed:
  - direct plugin manifest returned `id=growth`;
  - direct plugin status and board for `weixin_stephen` returned
    `source=growth-plugin-sqlite`;
  - board returned 9 visible cards;
  - production contains `src/services/growth-write-orchestrator.js`,
    `src/services/growth-providers/sqlite-write-provider.js`, and
    `tests/growth-service-write-providers.test.js`;
  - production served the embedded frontend helper assets;
  - unauthenticated Home AI same-origin proxy access returned 403 as expected.
    Authenticated proxy HTML smoke was not run because the current shell could
    not non-interactively read the production owner web key; no secret was
    printed or copied.

## 2026-06-10 Growth Legacy UI Parity Projection

- Status: committed, pushed, deployed to Mac production, and production-smoked.
- Changed files:
  - `public/app.js`;
  - `src/stores/growth-learning-sqlite-store.js`;
  - `tests/growth-learning-sqlite-store.test.js`;
  - `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- `public/app.js` now maps Home AI launch/query and viewport appearance
  metadata onto the iframe root before rendering legacy Growth UI. Accepted
  inputs include `pluginTheme`/`theme` and `pluginFontSize`/`fontSize`; Home AI
  `default` maps to the legacy CSS `standard` font-size token.
- The plugin-owned SQLite board projection now matches the mature Home AI
  Growth board semantics more closely:
  - cancelled, retired, and superseded cards are hidden;
  - sequence groups show completed cards plus the first current uncompleted
    card, and later cards are reported as hidden future cards;
  - lanes use `ready`, `waiting_ai`, `needs_revision`, `reflection_required`,
    `locked_until`, and `completed_recent` rather than generic
    `active/waiting/completed`;
  - cards include legacy action/reward/sequence metadata needed by the copied
    Home AI Growth UI.
- Real-data smoke used a temporary copy of production Growth SQLite at
  `/tmp/homeai-growth-ui-parity/growth-learning.sqlite3` and did not write
  production data. `weixin_stephen` projected as 9 visible cards, 21 hidden
  future sequence cards, lanes `ready:2`, `needs_revision:5`,
  `completed_recent:2`, and no cancelled/retired/superseded visible cards.
- Local page smoke on `127.0.0.1:4898`/`4899` verified dark/large appearance,
  old Growth lane text `当前 / 待修订 / 最近完成`, and no horizontal overflow.
- Home AI embedded iOS visual harness passed against the local Home AI dev
  listener and this plugin code, screenshot:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260610T095815Z.png`.
- Commit pushed:
  - `c914cf4c79ff` (`修复成长插件旧版看板投影`).
- Production deploy completed:
  - target: plugin `growth`;
  - deployed source ref: `c914cf4c79ff`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T101828Z-plugin-growth-growth-ui-parity`;
  - launchd label: `com.hermesmobile.plugin.growth`, running after deploy.
- Production board smoke passed for `weixin_stephen`:
  - `source=growth-plugin-sqlite`;
  - 9 visible cards;
  - 21 hidden future sequence cards;
  - lanes `ready:2`, `needs_revision:5`, `completed_recent:2`;
  - no cancelled/retired/superseded visible cards.
- Production Home AI embedded iOS visual harness passed with client version
  `20260610-growth-ui-parity-v683`; screenshot:
  `/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-20260610T102523Z.png`.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - `node --test tests/growth-learning-sqlite-store.test.js`;
  - Home AI app-side static/plugin/visual/platform checks recorded in the app
    workspace handoff;
  - `git diff --check`.

## 2026-06-10 Growth Plugin SQLite Migration Readback

- Added plugin-owned Growth learning SQLite migration/readback support.
- New files:
  - `src/stores/growth-learning-sqlite-store.js`;
  - `scripts/import-growth-learning-sqlite.js`;
  - `tests/growth-learning-sqlite-store.test.js`.
- New runtime/config fields:
  - `GROWTH_LEARNING_DB_PATH`, default `data/growth-learning.sqlite3`;
  - `GROWTH_DATA_OWNER=plugin` makes status, board, and card reads prefer the
    migrated plugin-owned SQLite store. Default remains Home AI facade first.
- New migration commands:
  - `npm run import:learning-sqlite -- --source-db <verified-backup.sqlite3>
    --target-db data/growth-learning.sqlite3 --workspace-id <workspace-id>
    --dry-run --json`;
  - use `--write` only after source integrity and readback are clean;
  - rollback uses `--rollback <script-created-backup.sqlite3> --write`.
- The migration script validates required learning-growth tables, source
  `PRAGMA quick_check`, foreign-key checks, creates a backup of any existing
  target, copies the source into plugin-owned storage, and returns bounded
  table counts/readback metadata only.
- Current boundary: SQLite read migration is implemented for status/board/card
  projections. Submission, async evaluation, reflection, reward settlement, and
  other write paths remain in Home AI until separate workflow migration tests
  and cutover evidence exist.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-learning-sqlite-store.test.js tests/growth-service.test.js`;
  - `npm test`.
- Development data verification:
  - Home AI created an online SQLite backup copy of Mac production
    `learning-growth.sqlite3` into ignored dev tmp storage;
  - `npm run import:learning-sqlite -- --dry-run --json` passed against that
    source backup;
  - `npm run import:learning-sqlite -- --write --json` imported it into ignored
    plugin dev data;
  - source and target `quick_check` passed, required Growth tables were present,
    and `weixin_stephen` readback returned 48 cards;
  - local plugin service smoke on port `4882` with `GROWTH_DATA_OWNER=plugin`
    returned `growth-plugin-sqlite` for status, board, and card detail.

## 2026-06-10 Growth Facade Card Detail Read Path

- Added a read-only plugin API route:
  `GET /api/v1/growth/cards/:taskCardId`.
- The route reads Home AI facade card detail when
  `GROWTH_HOME_AI_API_BASE_URL` and `GROWTH_HOME_AI_ACCESS_KEY(_PATH)` are
  configured.
- If the facade is unavailable, the route falls back to the local bounded board
  snapshot.
- The embedded UI now renders bounded task cards from
  `GET /api/v1/growth/board` and opens a compact detail panel through the card
  endpoint.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - local HTTP smoke for missing card detail returned bounded 404 JSON.
  - local Playwright mobile-page smoke on `http://127.0.0.1:4881` confirmed
    title/status/empty state rendering and no horizontal overflow.

## 2026-06-10 Clean Growth Plugin Workspace Created

- Archived the two incorrect Home AI full-repository Growth clones:
  - `/Users/hermes-dev/HermesMobileDev/plugins/growth`;
  - `/Users/xuxin/Desktop/growth`.
- Archive location:
  `/Users/hermes-dev/HermesMobileDev/_archived-growth-clones/20260610T002452Z`.
- Created a new clean Growth plugin scaffold at:
  `/Users/hermes-dev/HermesMobileDev/plugins/growth`.
- Initialized the clean workspace as a git repository and pushed it to:
  `git@github.com:pentiumxp/Education.git`.
- The previous remote `Education/main` was preserved before cleanup as:
  `archive/education-pre-growth-plugin-20260610`
  (`8c9e898b7ff21a4318975eba2baf5f75e9b33f57`).
- Current `Education/main` is:
  `55110c98acc670c01b5abb9091b15dcc5f7e9ca2`
  (`chore: scaffold growth plugin workspace`).
- The scaffold includes:
  - embedded plugin manifest endpoint;
  - workspace registration endpoint;
  - launch endpoint placeholder;
  - minimal Growth API and embedded UI;
  - platform contract pointer;
  - focused tests.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - local smoke on `http://127.0.0.1:4881` for manifest, status, board,
    workspace provisioning, and launch.
- The temporary smoke service was stopped and local smoke data was deleted.
- This scaffold is not yet registered in the Home AI host and does not yet own
  the built-in learning-growth data, MCP toolset, or production launchd
  service.

## Next Steps

1. Decide the first extraction boundary from Home AI built-in Growth:
   board projection, card detail, or teaching-card workflow.
2. Add host registration for plugin id `growth` only after the plugin manifest,
   workspace provisioning, and embedded UI harness pass.
3. Add the Growth MCP toolset only after plugin-side data/API ownership is
   explicit.

## 2026-06-10 Growth Workspace-Bound MCP Wrapper

- Changed `POST /api/v1/growth/mcp/execute` from registration-key auth to
  workspace-local `.hermes-growth/access-key.txt` bearer auth.
- Added `pluginService.authorizeWorkspace()` so MCP execute can authorize the
  exact provisioned `growth:<workspace>` binding.
- Added `scripts/growth-mcp-wrapper.js`:
  - reads `.hermes-growth/config.json` and `.hermes-growth/access-key.txt`;
  - requires `--no-workspace-override`;
  - exposes local Gateway tool names `get_status`, `get_board`, `list_cards`,
    and `get_card`;
  - strips `workspace_id` from Gateway-facing tool schemas;
  - rejects model-provided workspace overrides;
  - injects the bound workspace id into plugin HTTP execute calls.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record the wrapper command and
  workspace-key execute boundary.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - focused route/service/wrapper tests.
- Home AI Gateway profile/callable registration is still pending in the main
  app workspace before production can expose `mcp_growth_*`.

## 2026-06-10 Growth MCP Dev Gateway Closure

- Tightened plugin MCP execution:
  - `POST /api/v1/growth/mcp/execute` maps the authorized
    `growth:<workspace>` binding back to the Hermes workspace id before calling
    the Growth service, so plugin-owned SQLite reads use `weixin_stephen`
    rather than `growth:weixin_stephen`.
  - `growth.list_cards` now returns summary-only card records:
    `taskCardId`, `title`, `status`, `domain`, `cardRole`, `plannedDate`,
    `nextAction`, `submissionCount`, `evaluationCount`, and `artifactCount`.
    It must not expose `instructionPreview` or full task instructions.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record that Home AI
  materializes both `scripts/growth-mcp-wrapper.js` and
  `src/mcp/growth-mcp-schemas.js` into `gateway-worker/growth-mcp`; copying
  only the wrapper breaks runtime imports.
- Home AI dev Gateway materialization is now proven for `weixin_stephen`:
  - worker user: `hm-weixin-stephen`;
  - local MCP tool names: `get_status`, `get_board`, `list_cards`, `get_card`;
  - `list_cards` returned 48 plugin-owned SQLite cards with no
    `instructionPreview`;
  - Home AI dev manifest/toolset smoke passed for Growth on `lowgw1`/`lowgw2`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-mcp-schemas.test.js tests/growth-routes.test.js tests/growth-mcp-wrapper.test.js tests/growth-learning-sqlite-store.test.js`.
- Production Growth service/Gateway callables remain pending. Do not claim
  `mcp_growth_*` production availability until Home AI first-install deploy,
  launchd bootstrap, health/proxy smokes, and selected production Gateway
  callable-schema checks pass.

## 2026-06-10 Growth Submission Evidence Write Endpoint

- Added plugin-owned submission evidence writes:
  - `POST /api/v1/growth/cards/:taskCardId/submissions`;
  - workspace bearer authorization via `.hermes-growth/access-key.txt`;
  - bounded JSON body parsing;
  - native task id or legacy `kanban_card_id` lookup;
  - writes `learning_interaction_sessions`, `learning_task_submissions`,
    optional `learning_task_audio_blobs`, and pending
    `learning_growth_evaluation_jobs` rows.
- Updated `src/stores/growth-learning-sqlite-store.js`,
  `src/services/growth-service.js`, `src/routes/growth-routes.js`, and
  `src/routes/http-utils.js`.
- Updated `docs/HOME_AI_PLATFORM_CONTRACT.md` to record the new endpoint and
  current extraction boundary.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - focused
    `node --test tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - Home AI host proxy smoke through a temporary `.hermes-growth` binding
    against a temporary copy of the production Growth SQLite DB.
- Development smoke facts:
  - local plugin ran on `127.0.0.1:4892` with `GROWTH_DATA_OWNER=plugin`;
  - direct HTTP submission to legacy card id `t_6c24c957` returned 202 and
    resolved to native task id `ltask_623826dec47f15e5`;
  - temp DB readback showed submission/audio BLOB/pending job,
    `quick_check=ok`, and `foreign_key_check=0`.
- No commit, push, or production deploy has been performed for this step.
- Remaining migration work: async evaluation processing, reflection, reward,
  mastery, Action Inbox/Web Push handoff, Owner manual decisions, and removal
  of the Home AI legacy fallback after production parity evidence.

## 2026-06-10 Growth Evaluation, Reflection, And Coin Settlement

- Added plugin-owned async evaluation processing:
  - `POST /api/v1/growth/evaluations/process`;
  - optional dispatcher via `GROWTH_EVALUATION_WORKER_ENABLED=1` and
    `GROWTH_EVALUATION_WORKER_INTERVAL_MS`;
  - due pending/retry jobs are claimed, evaluated, written to
    `learning_evaluations`, and marked done/retry/failed.
- Added plugin-owned reflection writes:
  - `POST /api/v1/growth/cards/:taskCardId/reflections`;
  - workspace bearer authorization;
  - text/audio evidence writes to `learning_task_reflections` and optional
    `learning_task_audio_blobs`.
- Added per-card Growth learning coin settlement:
  - completed evaluations write idempotent `learning_reward_settlements`;
  - passed cards are marked `completed` and `rewardState=settled`;
  - failed/needs-revision evaluations create blocked settlement state when
    applicable.
- Currency boundary:
  - Growth learning coins are plugin-domain rewards;
  - plugin evaluation does not write platform `通宝` ledger entries and does
    not trigger real-time `通宝` exchange;
  - Growth-coin-to-`通宝` exchange remains an administrator-operated Home AI
    platform workflow, normally monthly, based on total eligible Growth coin
    balance.
- Bounded events:
  - passed evaluations emit `growth.card.completed` and
    `growth.mastery.updated` through the Growth event outbox;
  - needs-revision evaluations emit `growth.review.required`;
  - single-card evaluation workers must not emit real-time
    `growth.reward.requested` for `通宝` conversion.
- Validation passed:
  - `npm run check`;
  - `npm test` with 41 passing tests;
  - focused
    `node --test tests/growth-learning-sqlite-store.test.js tests/growth-routes.test.js`;
  - development smoke against a temporary online backup of production Growth
    SQLite on `127.0.0.1:4897`: submission id and reflection id preserved,
    evaluation completed with score 95, card status became `completed`, Growth
    coin settlement wrote 100 coins, `tongbaoExchange.status=not_requested`,
    `quick_check=ok`, and `foreign_key_check=0`.
- Production deploy is still pending from the Home AI app workspace after both
  app and plugin commits are created.

## 2026-06-10 Growth Evaluation Production Deployed

- Growth plugin commit pushed:
  - `690f8d1` `feat: process growth evaluations in plugin`.
- Home AI app commit pushed:
  - `f9ff704` `feat: proxy growth writes to plugin`.
- Production deployment completed from the Home AI app workspace:
  - Growth plugin source synced to
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - plugin deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T055814Z-plugin-growth-growth-plugin-evaluation`;
  - `com.hermesmobile.plugin.growth` LaunchDaemon was refreshed through
    `scripts/install-growth-launchd-service.js --execute --bootstrap`.
- Production LaunchDaemon environment now includes:
  - `GROWTH_DATA_OWNER=plugin`;
  - `GROWTH_EVALUATION_WORKER_ENABLED=1`;
  - `GROWTH_EVALUATION_WORKER_INTERVAL_MS=30000`;
  - `GROWTH_LEARNING_DB_PATH=/Users/hermes-host/HermesMobile/plugins/growth/data/growth-learning.sqlite3`.
- Production smoke passed without writing fake learner data:
  - Home AI status smoke ok, client version
    `20260610-growth-plugin-shell-v680`, activeGlobal `0`;
  - Growth status ok with `source=growth-plugin-sqlite`;
  - Growth board for `weixin_stephen` returned 48 cards;
  - host Growth manifest/proxy returned ok/HTTP 200;
  - production Growth SQLite `quick_check=ok`, `foreign_key_check=0`;
  - `weixin_stephen` counts observed: cards `48`, evaluations `24`,
    reward settlements `5`, pending/retry/processing jobs `0`.
- Remaining boundary:
  - monthly administrator Growth-coin-to-`通宝` exchange/clearing workflow is
    not implemented here;
  - production smoke did not create a real learner submission, by design.

## 2026-06-10 Growth Monthly Coin Clearing Deployed

- Product boundary:
  - completed cards have already produced Growth learning coin settlements;
  - monthly Growth-to-`通宝` exchange must use Growth coin balance/ledger, not
    completed-card state;
  - the Growth plugin owns the Growth-domain debit/clear record, while Home AI
    owns administrator authorization, exchange-rate policy, `通宝` ledger credit,
    and audit linkage.
- Growth plugin commit pushed:
  - `9f6985a` `feat: add growth monthly coin clearing`.
- Home AI docs commit pushed:
  - `a118d56` `docs: clarify growth monthly coin exchange`.
- Plugin implementation:
  - `learning_coin_ledger_entries` is created lazily in plugin-owned SQLite;
  - `learningCoinBalance` computes settled rewards plus ledger adjustments;
  - `clearLearningCoinBalanceForMonthlyExchange` writes an idempotent negative
    Growth learning-coin ledger entry when called with `write: true`;
  - dry-run mode returns clearable balance without writing a ledger row;
  - endpoints:
    `GET /api/v1/growth/learning-coins/balance` and
    `POST /api/v1/growth/learning-coins/monthly-exchange-clear`;
  - the clear path does not write platform `通宝` and does not mutate card
    status.
- Production deployment:
  - Growth plugin synced to
    `/Users/hermes-host/HermesMobile/plugins/growth`;
  - plugin deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T061120Z-plugin-growth-growth-monthly-coin-clear`;
  - `com.hermesmobile.plugin.growth` restarted and running.
- Validation passed:
  - `npm run check`;
  - `npm test` with 43 passing tests;
  - production Growth status ok with `source=growth-plugin-sqlite`,
    `quick_check=ok`, and `foreign_key_issues=0`;
  - production non-mutating balance smoke for `weixin_stephen` returned
    `availableCoins=314`, `settledRewardCoins=314`, `adjustmentCoins=0`;
  - production dry-run clear returned `mode=dry_run` and `clearableCoins=314`;
  - production `learning_coin_ledger_entries` exists with `0` rows after smoke,
    so no real clear/debit was executed.
- Remaining boundary:
  - Home AI platform currency exchange bridge still needs administrator UI,
    exchange rules, platform `通宝` ledger credit, and audit linkage before real
    monthly exchange can be operated.

## 2026-06-10T06:27Z - Growth plugin card route launch staged

- Growth embedded frontend now accepts Home AI route hints:
  - `pluginRoute=card`;
  - `pluginItemId=<taskCardId>`;
  - compatibility aliases `route`, `itemId`, and `taskCardId`.
- When launched with `pluginRoute=card&pluginItemId=<taskCardId>`, the plugin
  loads the board and then opens the requested card detail.
- Contract boundary clarified:
  - Home AI converts legacy host links such as
    `view=learning&taskCardId=<taskCardId>` before launching the plugin;
  - the plugin only needs to honor the normalized plugin route parameters.
- Monthly exchange boundary remains:
  - card completion has already settled Growth coins;
  - monthly exchange reads Growth coin balance/ledger, credits platform
    `通宝` through Home AI administrator workflow, and then clears or deducts
    the Growth coin balance through the plugin clear route.
- Validation passed:
  - `npm run check`;
  - `npm test` with 44 passing tests, including routed card launch and monthly
    clear not depending on card state.
- Production deployment for this card-route launch change is pending from the
  Home AI app workspace after commits are pushed.

## 2026-06-10T06:30Z - Growth plugin card route deployed

- Growth plugin commit pushed and deployed:
  - `d169e5b` `fix: open routed growth cards`;
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - production backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T062929Z-plugin-growth-growth-plugin-card-route`;
  - `com.hermesmobile.plugin.growth` restarted and running.
- Home AI companion commit pushed and deployed:
  - `53f79e3` `fix: route growth task links to plugin`;
  - production client version `20260610-growth-plugin-route-v681`.
- Production smoke passed:
  - Growth status for `weixin_stephen` returned
    `source=growth-plugin-sqlite`, `quick_check=ok`, and
    `foreign_key_issues=0`;
  - legacy Home AI URL
    `view=learning&workspaceId=weixin_stephen&taskCardId=ltask_623826dec47f15e5`
    launched the Growth plugin with `pluginRoute=card` and opened the card
    detail for `Short writing: a careful check changed my plan`.
- Remaining boundary:
  - routed card launch is production-active;
  - Home AI still owns legacy compatibility routing and remaining platform
    workflows such as Action Inbox/Web Push and future administrator
    Growth-coin-to-`通宝` exchange.

## 2026-06-10T07:25Z - Growth UI migrated as plugin-owned source

- The previous Home AI Growth UI has been copied into the Growth plugin as a
  plugin-owned migration baseline.
- Runtime frontend files are now plugin-local:
  - `public/growth-homeai-legacy.css`;
  - `public/growth-legacy-coins-ui.js`;
  - `public/growth-legacy-program-ui.js`;
  - `public/growth-legacy-task-ui.js`;
  - `public/growth-legacy-ui.js`;
  - `public/app.js` adapts plugin SQLite/facade data to the legacy UI shape.
- The Growth plugin must not import or mutate Home AI host frontend files at
  runtime. Future Growth UI changes should happen in this plugin workspace.
- The Home AI host remains responsible only for embedding/routing the Growth
  plugin and for still-unmigrated platform workflows documented elsewhere.
- Validation passed:
  - `npm run check`;
  - `npm test` with 44 passing tests;
  - direct plugin Playwright smoke on
    `http://127.0.0.1:4899/?workspaceId=weixin_stephen` loaded
    `growth-homeai-legacy.css`, `growth-legacy-*.js`, rendered the migrated
    board UI, and showed 48 Stephen cards with no frontend console errors;
  - `git diff --check`.
- Local Home AI dev iframe smoke on `127.0.0.1:18797` was blocked by current
  workspace grant config (`Workspace access is not allowed`) and should be
  repeated on production after deployment.

## 2026-06-10T07:23Z - Plugin-owned Growth UI deployed

- Commit pushed to `Education/main`:
  - `7a26cd7` `fix: make migrated growth UI plugin-owned`.
- Production deployment completed for plugin `growth` only:
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T072300Z-plugin-growth-manual`;
  - restarted `com.hermesmobile.plugin.growth`.
- Production health passed:
  - `GET http://127.0.0.1:4881/api/v1/growth/status?workspace_id=weixin_stephen`
    returned `stage=plugin_sqlite`, `source=growth-plugin-sqlite`,
    `quick_check=ok`, and `learning_task_cards=48`.
- Production direct plugin Playwright smoke passed:
  - `http://127.0.0.1:4881/?workspaceId=weixin_stephen`;
  - loaded plugin-local `growth-homeai-legacy.css` and
    `growth-legacy-*.js`;
  - rendered the migrated board UI with 48 Stephen cards and no frontend
    console errors.
- Unauthenticated Home AI host smoke reached the Access Key screen before any
  Growth iframe was rendered, which is expected without a browser login state.

## 2026-06-10T08:05Z - Owner-only Growth view switcher ready

- Added Owner-only learner/workspace switching inside the Growth plugin UI:
  - `GET /api/v1/growth/view-targets` returns all Growth-provisioned targets
    only when `x-hermes-plugin-actor-role=owner`;
  - workspace actor context receives only the current workspace target and
    cannot enumerate other Growth users;
  - board/card reads now fall back to the proxy
    `x-hermes-plugin-workspace-id` header when no query workspace is present;
  - the Growth board page renders a right-top menu for Owner context and
    switches by reloading plugin-owned status/board/card projections for the
    selected workspace.
- Home AI host companion change:
  - same-origin plugin proxy forwards only bounded actor headers:
    `x-hermes-plugin-actor-role=owner|workspace` and
    `x-hermes-plugin-actor-workspace-id`;
  - it does not pass broad workspace lists or secrets.
- Validation passed:
  - `npm run check`;
  - `npm test` with 47 passing tests;
  - `node --test tests/hermes-plugin-service.test.js tests/growth-routes.test.js tests/growth-service.test.js`;
  - direct Playwright smoke on a temporary local store/port `4898` proved Owner
    sees targets `weixin_stephen` and `owner`, can switch to owner, and
    workspace actor context shows no switcher;
  - `git diff --check`.
- Production deployment is pending until both Growth plugin and Home AI app
  companion commits are pushed.

## 2026-06-10T08:24Z - Owner-only Growth view switcher deployed

- Commit pushed to `Education/main`:
  - `c41499a` `feat: add owner growth view switching`.
- Production deployment completed for plugin `growth`:
  - synced to `/Users/hermes-host/HermesMobile/plugins/growth`;
  - backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T075025Z-plugin-growth-manual`;
  - restarted `com.hermesmobile.plugin.growth`.
- Production validation passed:
  - direct plugin `GET /api/v1/growth/view-targets` with
    `x-hermes-plugin-actor-role=owner` returned switchable targets
    `weixin_stephen` and `owner`;
  - the same endpoint with `x-hermes-plugin-actor-role=workspace` returned
    only the current workspace target;
  - Home AI same-origin proxy
    `/api/hermes-plugins/growth/proxy/api/v1/growth/view-targets` forwarded
    Owner actor context and returned the same Owner switch targets.
- Boundary:
  - only Owner can enumerate and switch Growth learner views;
  - no enterprise/multi-workspace role support is implemented;
  - no broad workspace list or secret is forwarded from Home AI to plugins.

## 2026-06-10T10:53Z - Embedded Growth shell scroll owner ready

- Issue:
  - in Home AI embedded mode, Growth uses `body { overflow: hidden; }`;
  - without an explicit app-root scroll container, dragging inside Growth cards
    or lists can be swallowed by the non-scrollable body/iframe surface.
- Change:
  - `public/growth-homeai-legacy.css` now makes `.growth-shell` fill the iframe
    and own vertical scrolling with `overflow-y:auto`,
    `overscroll-behavior:contain`, `-webkit-overflow-scrolling:touch`, and
    `touch-action:pan-y`;
  - added `tests/growth-embedded-layout.test.js` to enforce that embedded
    layout contract.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-embedded-layout.test.js`;
  - Home AI local desktop iframe smoke through
    `http://127.0.0.1:18798/api/hermes-plugins/growth/proxy/...` confirmed
    `.growth-shell` is the hit target and scroll owner;
  - `git diff --check`.
- Deployment status:
  - not committed, not pushed, and not deployed yet.

## 2026-06-10T11:15Z - Growth task lane touch scroll deployed

- Issue:
  - production Owner/FanFan embedded Growth still felt frozen when trying to
    scroll through multiple task cards;
  - the prior `.growth-shell` root-scroll fix was insufficient because iOS/PWA
    iframe root scrolling can still be unreliable around interactive cards.
- Diagnosis:
  - production direct and Home AI embedded Playwright checks used
    `workspaceId=weixin_stephen`;
  - before this fix, the root shell could scroll programmatically, but the task
    board did not provide its own local scroll surface;
  - after injecting the local fix before deployment, the active task lane had
    `clientHeight=471`, `scrollHeight=1026`, and touchmove scrolled the lane
    without opening a card detail.
- Change:
  - `public/growth-homeai-legacy.css` now makes the Growth board page fill the
    iframe and makes `.learning-growth-board-lane.active` an explicit
    `overflow-y:auto` scroll container with iOS momentum scrolling and
    `touch-action:pan-y`;
  - `tests/growth-embedded-layout.test.js` now enforces the lane-scroll
    contract in addition to the root-scroll contract.
- Commit and deployment:
  - pushed to `Education/main`:
    `333f304` `fix: 修复成长任务列表触摸滚动`;
  - production deploy backup:
    `/Users/hermes-host/HermesMobile/backups/deploy/20260610T111543Z-plugin-growth-growth-task-lane-scroll`;
  - restarted `com.hermesmobile.plugin.growth`, launchd state `running`.
- Validation passed:
  - `npm run check`;
  - `node --test tests/growth-embedded-layout.test.js`;
  - `npm test` with 50 passing tests;
  - Home AI deploy harness checks:
    `node --check scripts/deploy-macos-production.js`,
    `node tests/macos-production-deploy-script.test.js`, and
    `node tests/production-status-smoke-harness.test.js`;
  - production Growth CSS contains the board lane scroll rules;
  - production Home AI embedded iframe touch smoke for `weixin_stephen`
    reported active lane `overflow-y:auto`, `clientHeight=471`,
    `scrollHeight=1026`, touchmove `laneScrollTop=439`, and
    `detailOpen=false`.
