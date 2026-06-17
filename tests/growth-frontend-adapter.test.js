const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPublicScript(fileName) {
  const windowRef = {};
  const context = vm.createContext({
    window: windowRef,
    globalThis: windowRef,
    URL,
    URLSearchParams,
    console
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "public", fileName), "utf8");
  vm.runInContext(source, context, { filename: fileName });
  return windowRef;
}

function countMatches(value, pattern) {
  return (String(value || "").match(pattern) || []).length;
}

test("Growth appearance adapter normalizes host theme and font-size payloads", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const params = new URLSearchParams("pluginTheme=dark&pluginFontSize=default");
  const documentRef = { documentElement: { dataset: {} } };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({ params, documentRef });

  appearance.applyAppearance();
  assert.equal(documentRef.documentElement.dataset.theme, "dark");
  assert.equal(documentRef.documentElement.dataset.fontSize, "standard");

  appearance.applyAppearance({ pluginTheme: "light", pluginFontSize: "xxlarge" });
  assert.equal(documentRef.documentElement.dataset.theme, "light");
  assert.equal(documentRef.documentElement.dataset.fontSize, "xxlarge");
});

test("Growth appearance adapter applies Home AI plugin viewport metrics", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const styles = new Map();
  const classes = new Map();
  const documentRef = {
    documentElement: {
      dataset: {},
      style: { setProperty: (name, value) => styles.set(name, value) },
      classList: { toggle: (name, value) => classes.set(name, Boolean(value)) }
    }
  };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({
    params: new URLSearchParams(),
    documentRef
  });

  assert.equal(appearance.applyViewport({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    reason: "test",
    viewport: { width: 390, height: 612, offsetTop: 4, layoutHeight: 640 },
    iframe: { width: 390, height: 512 },
    keyboard: { visible: false, bottomInset: 0 },
    footer: { hostBottomSafeArea: 18 }
  }), true);

  assert.equal(styles.get("--app-height"), "512px");
  assert.equal(styles.get("--app-viewport-height"), "512px");
  assert.equal(styles.get("--host-bottom-safe-area"), "18px");
  assert.equal(styles.get("--growth-host-bottom-safe-area"), "18px");
  assert.equal(styles.get("--growth-keyboard-bottom"), "0px");
  assert.equal(classes.get("keyboard-open"), false);
  assert.equal(classes.get("growth-keyboard-open"), false);

  appearance.applyViewport({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    viewport: { width: 390, height: 318, layoutHeight: 640 },
    iframe: { width: 390, height: 512 },
    keyboard: { visible: true, bottomInset: 322 },
    footer: { safeAreaBottom: 0 }
  });

  assert.equal(styles.get("--app-height"), "318px");
  assert.equal(styles.get("--growth-keyboard-bottom"), "322px");
  assert.equal(classes.get("keyboard-open"), true);
});

test("Growth appearance adapter exposes the host viewport handler expected by visual harnesses", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const listeners = [];
  windowRef.addEventListener = (eventName, handler) => listeners.push({ eventName, handler });
  const styles = new Map();
  const documentRef = {
    documentElement: {
      dataset: {},
      style: { setProperty: (name, value) => styles.set(name, value) },
      classList: { toggle: () => null }
    }
  };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({
    params: new URLSearchParams(),
    documentRef
  });

  appearance.bindAppearanceMessages(windowRef);
  assert.equal(typeof windowRef.handleHermesPluginViewportMessage, "function");
  assert.equal(typeof windowRef.__hermesGrowthVisualHarness.hostViewport, "function");
  assert.equal(listeners[0].eventName, "message");

  assert.equal(windowRef.handleHermesPluginViewportMessage({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    iframe: { height: 444 },
    viewport: { height: 500 },
    keyboard: { visible: false }
  }), true);
  assert.equal(styles.get("--app-height"), "444px");
  assert.equal(windowRef.__hermesGrowthVisualHarness.hostViewport().iframe.height, 444);
});

test("Growth API client keeps workspace query and fetch errors bounded", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const historyCalls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "weixin_child",
    historyRef: { replaceState: (...args) => historyCalls.push(args) },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, error: "facade_down" })
    })
  });

  assert.equal(client.workspaceQuery(), "?workspaceId=weixin_child");
  client.updateWorkspaceUrl();
  assert.match(historyCalls[0][2], /workspaceId=weixin_child/);
  await assert.rejects(() => client.fetchJson("/api/v1/growth/status"), /facade_down/);
});

test("Growth API client exposes card generation context and write helpers", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const calls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "weixin_fanfan",
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    fetchImpl: async (path, options = {}) => {
      calls.push({ path, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, path })
      };
    }
  });

  await client.fetchCardGenerationContext("weixin_fanfan", { recipeId: "daily_science_v1" });
  await client.fetchLearningLoopState("weixin_fanfan", {
    target: { learnerId: "fanfan" },
    suggestedPlan: {
      domain: "english",
      subject: "english",
      capabilityClusterId: "english.evidence",
      targetNodeIds: ["kg_main_idea", "kg_evidence"]
    },
    generationDefaults: { availableMinutes: 15 }
  });
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_fanfan");
  await client.fetchGrowthCard("ltask_daily_1", "weixin_fanfan");
  await client.submitGrowthCardEvidence("ltask_daily_1", {
    text: "I found the main idea.",
    audio: { dataBase64: "YXVkaW8=", name: "answer.webm", mime: "audio/webm" }
  }, "weixin_fanfan");
  await client.submitGrowthCardReflection("ltask_daily_1", { text: "Next time I will add evidence." }, "weixin_fanfan");
  await client.submitGrowthExperienceSignal("ltask_daily_1", { signalType: "too_hard", targetNodeIds: ["kg_main_idea"] }, "weixin_fanfan");
  await client.evaluateGrowthStageAssessment({ target_node_id: "kg_main_idea", assessment_coverage_node_ids: ["kg_main_idea"] }, "weixin_fanfan");
  await client.activateGrowthStageAssessment({ target_node_id: "kg_main_idea", assessment_coverage_node_ids: ["kg_main_idea"], activation_source: "owner_manual" }, "weixin_fanfan");
  await client.processGrowthEvaluations("weixin_fanfan", 3);
  await client.retryGrowthEvaluation({ task_card_id: "ltask_daily_1", reason: "owner retry" }, "weixin_fanfan");
  await client.draftGrowthDailyLoop({ target_node_ids: ["kg_main_idea"] }, "weixin_fanfan");
  await client.publishGrowthDailyLoop({ plan_draft_id: "lgplan_1", selected_item_id: "plan_item_1" }, "weixin_fanfan");
  await client.submitGrowthProfileCorrection({
    target_node_ids: ["kg_main_idea"],
    review_action: "mark_needs_repair",
    reason: "Owner bounded note."
  }, "weixin_fanfan");
  await client.fetchGrowthCycleAudit({
    learner_id: "fanfan",
    program_id: "program_science",
    plan_draft_id: "lgplan_1",
    task_card_id: "ltask_daily_1",
    evaluation_id: "eval_daily_1",
    profile_delta_id: "lgpdelta_1",
    evidence_id: "lgevd_1",
    correction_id: "lgcorr_1",
    source_id: "eval_daily_1",
    target_node_ids: ["kg_main_idea", "kg_evidence"],
    limit: 5
  }, "weixin_fanfan");
  await client.fetchGrowthCycleCompleteness({
    task_card_id: "ltask_daily_1",
    target_node_ids: ["kg_main_idea"]
  }, "weixin_fanfan");
  await client.fetchGrowthCycleHistory({
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    task_card_id: "ltask_daily_1",
    target_node_ids: ["kg_main_idea"],
    include_completeness: false,
    limit: 5
  }, "weixin_fanfan");
  await client.fetchGrowthReleaseWorkbench("weixin_fanfan", {
    target: { learnerId: "fanfan" },
    suggestedPlan: {
      domain: "english",
      subject: "english"
    },
    releaseWorkbench: {
      releaseWorkbench: {
        inventory: { latestCollectionRunId: "release_run_1" }
      }
    }
  });
  await client.recordGrowthReleaseWorkbenchAction({
    endpoint_key: "release_evidence",
    action_key: "visual_smoke",
    evidence_key: "visual_smoke"
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationProposals({
    learner_id: "fanfan",
    program_id: "program_science",
    status: "proposed",
    limit: 4
  }, "weixin_fanfan");
  await client.createGrowthAutomationProposal({
    learner_id: "fanfan",
    source_task_card_id: "ltask_previous",
    target_node_ids: ["kg_science_fair_test"]
  }, "weixin_fanfan");
  await client.reviewGrowthAutomationProposal("lgauto_proposed_1", {
    status: "accepted",
    reason: "Owner reviewed."
  }, "weixin_fanfan");
  await client.publishGrowthAutomationProposal("lgauto_proposed_1", {
    generation_key: "automation_proposal:lgauto_proposed_1"
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationDigests({
    learner_id: "fanfan",
    program_id: "program_science",
    status: "pending",
    limit: 4
  }, "weixin_fanfan");
  await client.reviewGrowthAutomationDigest("lgadig_pending_1", {
    status: "reviewed",
    selected_candidate_ids: ["lgauto_ready_1:lgplan_next:plan_item_next"],
    reason: "Owner reviewed digest."
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationActionHandoffs({
    learner_id: "fanfan",
    program_id: "program_science",
    digest_id: "lgadig_pending_1",
    delivery_status: "not_delivered",
    limit: 4
  }, "weixin_fanfan");
  await client.createGrowthAutomationActionHandoff({
    digest_id: "lgadig_pending_1",
    summary: "Owner requested action handoff."
  }, "weixin_fanfan");
  await client.deliverGrowthAutomationActionHandoff("lgahand_pending_1", {
    requested_by: "owner"
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationSchedulerExecutions({
    learner_id: "fanfan",
    program_id: "program_science",
    handoff_id: "lgahand_pending_1",
    status: "blocked",
    limit: 4
  }, "weixin_fanfan");
  await client.executeGrowthAutomationSchedulerOnce({
    handoff_id: "lgahand_pending_1",
    proposal_id: "lgauto_ready_1",
    execution_mode: "owner_explicit_once"
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationSchedulerRuns({
    learner_id: "fanfan",
    program_id: "program_science",
    status: "blocked",
    limit: 4
  }, "weixin_fanfan");
  await client.runGrowthAutomationSchedulerOnce({
    run_mode: "background_supervised_tick",
    limit: 2
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationSchedulerWorkerTargets({
    learner_id: "fanfan",
    program_id: "program_science",
    status: "proposed",
    limit: 4
  }, "weixin_fanfan");
  await client.createGrowthAutomationSchedulerWorkerTarget({
    domain_pack_id: "uk_hk_curriculum_foundation",
    subject: "science",
    target_node_ids: ["kg_science_observation"]
  }, "weixin_fanfan");
  await client.reviewGrowthAutomationSchedulerWorkerTarget("lgawtarget_1", {
    status: "enabled",
    reason: "Owner reviewed target."
  }, "weixin_fanfan");
  await client.fetchGrowthStageCheckpointControls({
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    subject_id: "science",
    capability_cluster_id: "science.observation",
    target_node_ids: ["kg_science_observation"],
    assessment_coverage_node_ids: ["kg_science_observation", "kg_science_fair_test"]
  }, "weixin_fanfan");
  await client.reviewGrowthRecommendationLifecycle({
    trajectory_id: "lgtraj_pending_1",
    status: "skipped",
    reason_code: "owner_skipped_low_pressure"
  }, "weixin_fanfan");
  await client.createGrowthAutomationDigest({
    learner_id: "fanfan",
    program_id: "program_science",
    limit: 4
  }, "weixin_fanfan");
  await client.buildGrowthReleasePackage({
    learner_id: "fanfan",
    tasks: ["planner_readiness", "scheduler_dry_run"],
    required_task_ids: ["planner_readiness", "scheduler_dry_run"]
  }, "weixin_fanfan");
  await client.advanceGrowthDailyLoop({
    target_node_ids: ["kg_main_idea"],
    subject: "science"
  }, "weixin_fanfan");
  await client.fetchGrowthReferenceObjectTypes("weixin_fanfan");
  await client.fetchGrowthReferenceSummary("task_card", "ltask_daily_1", "weixin_fanfan", { purpose: "owner_loop" });
  await client.fetchLearningOperatingLoopRuns({
    learner_id: "fanfan",
    program_id: "program_science",
    action: "draft_daily_plan",
    status: "executed",
    task_card_id: "ltask_daily_1",
    limit: 3
  }, "weixin_fanfan");
  await client.advanceLearningOperatingLoop({
    learner_id: "fanfan",
    action: "run_next",
    target_node_ids: ["kg_main_idea"],
    requested_by: "owner"
  }, "weixin_fanfan");
  await client.fetchGrowthOwnerAuditReviews({
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    task_card_id: "ltask_daily_1",
    evaluation_id: "eval_daily_1",
    profile_delta_id: "lgpdelta_1",
    target_node_ids: ["kg_main_idea"],
    limit: 4
  }, "weixin_fanfan");
  await client.recordGrowthOwnerAuditReview({
    learner_id: "fanfan",
    program_id: "program_science",
    decision: "accepted",
    task_card_id: "ltask_daily_1",
    evaluation_id: "eval_daily_1",
    owner_note: "Owner accepted bounded summary."
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationFailurePolicies({
    learner_id: "fanfan",
    program_id: "program_science",
    status: "draft",
    limit: 4
  }, "weixin_fanfan");
  await client.fetchGrowthAutomationFailurePolicyReadiness({
    learner_id: "fanfan",
    program_id: "program_science"
  }, "weixin_fanfan");
  await client.createGrowthAutomationFailurePolicy({
    learner_id: "fanfan",
    program_id: "program_science",
    policy_version: "growth.learningAutomationFailurePolicy.v1",
    policy: { summaryOnly: true, writefulSchedulingAllowed: false },
    failure_policy: { summaryOnly: true, visibleFailureRequired: true, retryRequiresOwner: true }
  }, "weixin_fanfan");
  await client.reviewGrowthAutomationFailurePolicy("lgafpol_draft_1", {
    status: "active",
    reason: "Owner activated bounded failure policy."
  }, "weixin_fanfan");
  await client.fetchGrowthReleaseArtifactTemplate("weixin_fanfan", {
    target: { learnerId: "fanfan" },
    suggestedPlan: {
      domain: "english",
      subject: "english"
    },
    releaseWorkbench: {
      releaseWorkbench: {
        inventory: { latestCollectionRunId: "release_run_1" }
      }
    }
  });
  await client.fetchGrowthReleaseWorkbenchActionAudits({
    learner_id: "fanfan",
    program_id: "program_science",
    endpoint_key: "release_evidence_collection",
    status: "recorded",
    limit: 3
  }, "weixin_fanfan");

  assert.equal(calls[0].path, "/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan&recipeId=daily_science_v1");
  const advanceCall = calls.find((call) => call.path === "/api/v1/growth/daily-loop/advance");
  assert.ok(advanceCall);
  assert.deepEqual(JSON.parse(advanceCall.options.body), {
    workspace_id: "weixin_fanfan",
    target_node_ids: ["kg_main_idea"],
    subject: "science"
  });
  assert.equal(calls[1].path, "/api/v1/growth/learning-loop/state?workspaceId=weixin_fanfan&learnerId=fanfan&domain=english&subject=english&subjectId=english&capabilityClusterId=english.evidence&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_main_idea%2Ckg_evidence&assessmentCoverageNodeIds=kg_main_idea%2Ckg_evidence");
  assert.equal(calls[2].path, "/api/v1/growth/cards/generate");
  assert.equal(calls[2].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_english_main_idea"
  });
  assert.equal(calls[3].path, "/api/v1/growth/cards/ltask_daily_1?workspaceId=weixin_fanfan");
  assert.equal(calls[4].path, "/api/v1/growth/cards/ltask_daily_1/submissions");
  assert.deepEqual(JSON.parse(calls[4].options.body), {
    workspace_id: "weixin_fanfan",
    text: "I found the main idea.",
    audio: { dataBase64: "YXVkaW8=", name: "answer.webm", mime: "audio/webm" }
  });
  assert.equal(calls[5].path, "/api/v1/growth/cards/ltask_daily_1/reflections");
  assert.equal(calls[6].path, "/api/v1/growth/cards/ltask_daily_1/experience-signals");
  assert.deepEqual(JSON.parse(calls[6].options.body), {
    workspace_id: "weixin_fanfan",
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"]
  });
  assert.equal(calls[7].path, "/api/v1/growth/stage-assessments/eligibility");
  assert.deepEqual(JSON.parse(calls[7].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"]
  });
  assert.equal(calls[8].path, "/api/v1/growth/stage-assessments/activate");
  assert.deepEqual(JSON.parse(calls[8].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"],
    activation_source: "owner_manual"
  });
  assert.equal(calls[9].path, "/api/v1/growth/evaluations/process");
  assert.deepEqual(JSON.parse(calls[9].options.body), { workspace_id: "weixin_fanfan", limit: 3 });
  assert.equal(calls[10].path, "/api/v1/growth/evaluations/owner-review");
  assert.deepEqual(JSON.parse(calls[10].options.body), {
    workspace_id: "weixin_fanfan",
    action: "retry",
    task_card_id: "ltask_daily_1",
    reason: "owner retry"
  });
  assert.equal(calls[11].path, "/api/v1/growth/daily-loop/draft");
  assert.deepEqual(JSON.parse(calls[11].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_ids: ["kg_main_idea"]
  });
  assert.equal(calls[12].path, "/api/v1/growth/daily-loop/publish");
  assert.deepEqual(JSON.parse(calls[12].options.body), {
    workspace_id: "weixin_fanfan",
    plan_draft_id: "lgplan_1",
    selected_item_id: "plan_item_1"
  });
  assert.equal(calls[13].path, "/api/v1/growth/profile-corrections");
  assert.deepEqual(JSON.parse(calls[13].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_ids: ["kg_main_idea"],
    review_action: "mark_needs_repair",
    reason: "Owner bounded note."
  });
  assert.equal(calls[14].path, "/api/v1/growth/learning-cycles/audit?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&planDraftId=lgplan_1&taskCardId=ltask_daily_1&evaluationId=eval_daily_1&profileDeltaId=lgpdelta_1&evidenceId=lgevd_1&correctionId=lgcorr_1&sourceId=eval_daily_1&targetNodeIds=kg_main_idea%2Ckg_evidence&limit=5");
  assert.equal(calls[15].path, "/api/v1/growth/learning-cycles/completeness?workspaceId=weixin_fanfan&taskCardId=ltask_daily_1&targetNodeIds=kg_main_idea&limit=20");
  assert.equal(calls[16].path, "/api/v1/growth/learning-cycles/history?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&taskCardId=ltask_daily_1&targetNodeIds=kg_main_idea&includeCompleteness=false&limit=5");
  assert.equal(calls[17].path, "/api/v1/growth/automation/release-workbench?workspaceId=weixin_fanfan&learnerId=fanfan&domain=english&subject=english&horizon=daily_plan&collectionRunId=release_run_1");
  assert.equal(calls[18].path, "/api/v1/growth/automation/release-workbench/actions");
  assert.deepEqual(JSON.parse(calls[18].options.body), {
    workspace_id: "weixin_fanfan",
    endpoint_key: "release_evidence",
    action_key: "visual_smoke",
    evidence_key: "visual_smoke"
  });
  assert.equal(calls[19].path, "/api/v1/growth/automation/proposals?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&status=proposed&limit=4");
  assert.equal(calls[20].path, "/api/v1/growth/automation/proposals");
  assert.deepEqual(JSON.parse(calls[20].options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    source_task_card_id: "ltask_previous",
    target_node_ids: ["kg_science_fair_test"]
  });
  assert.equal(calls[21].path, "/api/v1/growth/automation/proposals/lgauto_proposed_1/decision");
  assert.deepEqual(JSON.parse(calls[21].options.body), {
    workspace_id: "weixin_fanfan",
    status: "accepted",
    reason: "Owner reviewed."
  });
  assert.equal(calls[22].path, "/api/v1/growth/automation/proposals/lgauto_proposed_1/publish");
  assert.deepEqual(JSON.parse(calls[22].options.body), {
    workspace_id: "weixin_fanfan",
    generation_key: "automation_proposal:lgauto_proposed_1"
  });
  assert.equal(calls[23].path, "/api/v1/growth/automation/digests?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&status=pending&limit=4");
  assert.equal(calls[24].path, "/api/v1/growth/automation/digests/lgadig_pending_1/review");
  assert.deepEqual(JSON.parse(calls[24].options.body), {
    workspace_id: "weixin_fanfan",
    status: "reviewed",
    selected_candidate_ids: ["lgauto_ready_1:lgplan_next:plan_item_next"],
    reason: "Owner reviewed digest."
  });
  assert.equal(calls[25].path, "/api/v1/growth/automation/action-handoffs?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&digestId=lgadig_pending_1&deliveryStatus=not_delivered&limit=4");
  assert.equal(calls[26].path, "/api/v1/growth/automation/action-handoffs");
  assert.deepEqual(JSON.parse(calls[26].options.body), {
    workspace_id: "weixin_fanfan",
    digest_id: "lgadig_pending_1",
    summary: "Owner requested action handoff."
  });
  assert.equal(calls[27].path, "/api/v1/growth/automation/action-handoffs/lgahand_pending_1/deliver");
  assert.deepEqual(JSON.parse(calls[27].options.body), {
    workspace_id: "weixin_fanfan",
    requested_by: "owner"
  });
  assert.equal(calls[28].path, "/api/v1/growth/automation/scheduler/executions?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&handoffId=lgahand_pending_1&status=blocked&limit=4");
  assert.equal(calls[29].path, "/api/v1/growth/automation/scheduler/execute-once");
  assert.deepEqual(JSON.parse(calls[29].options.body), {
    workspace_id: "weixin_fanfan",
    handoff_id: "lgahand_pending_1",
    proposal_id: "lgauto_ready_1",
    execution_mode: "owner_explicit_once"
  });
  assert.equal(calls[30].path, "/api/v1/growth/automation/scheduler/runs?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&status=blocked&limit=4");
  assert.equal(calls[31].path, "/api/v1/growth/automation/scheduler/run-once");
  assert.deepEqual(JSON.parse(calls[31].options.body), {
    workspace_id: "weixin_fanfan",
    run_mode: "background_supervised_tick",
    limit: 2
  });
  assert.equal(calls[32].path, "/api/v1/growth/automation/scheduler/worker-targets?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&status=proposed&limit=4");
  assert.equal(calls[33].path, "/api/v1/growth/automation/scheduler/worker-targets");
  assert.deepEqual(JSON.parse(calls[33].options.body), {
    workspace_id: "weixin_fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    subject: "science",
    target_node_ids: ["kg_science_observation"]
  });
  assert.equal(calls[34].path, "/api/v1/growth/automation/scheduler/worker-targets/lgawtarget_1/review");
  assert.deepEqual(JSON.parse(calls[34].options.body), {
    workspace_id: "weixin_fanfan",
    status: "enabled",
    reason: "Owner reviewed target."
  });
  assert.equal(calls[35].path, "/api/v1/growth/stage-assessments/controls?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&subjectId=science&capabilityClusterId=science.observation&targetNodeIds=kg_science_observation&assessmentCoverageNodeIds=kg_science_observation%2Ckg_science_fair_test");
  assert.equal(calls[36].path, "/api/v1/growth/recommendations/lifecycle/review");
  assert.deepEqual(JSON.parse(calls[36].options.body), {
    workspace_id: "weixin_fanfan",
    trajectory_id: "lgtraj_pending_1",
    status: "skipped",
    reason_code: "owner_skipped_low_pressure"
  });
  assert.equal(calls[37].path, "/api/v1/growth/automation/digests");
  assert.deepEqual(JSON.parse(calls[37].options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    limit: 4
  });
  assert.equal(calls[38].path, "/api/v1/growth/automation/release-packages/build");
  assert.deepEqual(JSON.parse(calls[38].options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    tasks: ["planner_readiness", "scheduler_dry_run"],
    required_task_ids: ["planner_readiness", "scheduler_dry_run"]
  });
  assert.equal(calls[40].path, "/api/v1/growth/references/object-types?workspaceId=weixin_fanfan");
  assert.equal(calls[41].path, "/api/v1/growth/references/task_card/ltask_daily_1/summary?workspaceId=weixin_fanfan&purpose=owner_loop");
  const operatingRunsCall = calls.find((call) => call.path.startsWith("/api/v1/growth/learning-loop/runs?"));
  assert.equal(operatingRunsCall.path, "/api/v1/growth/learning-loop/runs?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&horizon=daily_plan&action=draft_daily_plan&status=executed&taskCardId=ltask_daily_1&limit=3");
  const operatingAdvanceCall = calls.find((call) => call.path === "/api/v1/growth/learning-loop/advance");
  assert.ok(operatingAdvanceCall);
  assert.deepEqual(JSON.parse(operatingAdvanceCall.options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    action: "run_next",
    target_node_ids: ["kg_main_idea"],
    requested_by: "owner"
  });
  const ownerAuditReviewListCall = calls.find((call) => call.path.startsWith("/api/v1/growth/owner-audit/reviews?"));
  assert.equal(ownerAuditReviewListCall.path, "/api/v1/growth/owner-audit/reviews?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&taskCardId=ltask_daily_1&evaluationId=eval_daily_1&profileDeltaId=lgpdelta_1&targetNodeIds=kg_main_idea&limit=4");
  const ownerAuditReviewRecordCall = calls.find((call) => call.path === "/api/v1/growth/owner-audit/reviews");
  assert.ok(ownerAuditReviewRecordCall);
  assert.deepEqual(JSON.parse(ownerAuditReviewRecordCall.options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    decision: "accepted",
    task_card_id: "ltask_daily_1",
    evaluation_id: "eval_daily_1",
    owner_note: "Owner accepted bounded summary."
  });
  const failurePolicyListCall = calls.find((call) => call.path.startsWith("/api/v1/growth/automation/failure-policies?") && call.path.includes("status=draft"));
  assert.equal(failurePolicyListCall.path, "/api/v1/growth/automation/failure-policies?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&status=draft&limit=4");
  const failurePolicyReadinessCall = calls.find((call) => call.path.startsWith("/api/v1/growth/automation/failure-policies/readiness?"));
  assert.equal(failurePolicyReadinessCall.path, "/api/v1/growth/automation/failure-policies/readiness?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&limit=6");
  const failurePolicyCreateCall = calls.find((call) => call.path === "/api/v1/growth/automation/failure-policies");
  assert.ok(failurePolicyCreateCall);
  assert.deepEqual(JSON.parse(failurePolicyCreateCall.options.body), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    policy_version: "growth.learningAutomationFailurePolicy.v1",
    policy: { summaryOnly: true, writefulSchedulingAllowed: false },
    failure_policy: { summaryOnly: true, visibleFailureRequired: true, retryRequiresOwner: true }
  });
  const failurePolicyReviewCall = calls.find((call) => call.path === "/api/v1/growth/automation/failure-policies/lgafpol_draft_1/review");
  assert.ok(failurePolicyReviewCall);
  assert.deepEqual(JSON.parse(failurePolicyReviewCall.options.body), {
    workspace_id: "weixin_fanfan",
    status: "active",
    reason: "Owner activated bounded failure policy."
  });
  const releaseArtifactTemplateCall = calls.find((call) => call.path.startsWith("/api/v1/growth/automation/release-artifact-template?"));
  assert.equal(releaseArtifactTemplateCall.path, "/api/v1/growth/automation/release-artifact-template?workspaceId=weixin_fanfan&learnerId=fanfan&domain=english&subject=english&horizon=daily_plan&collectionRunId=release_run_1");
  const releaseWorkbenchActionAuditsCall = calls.find((call) => call.path.startsWith("/api/v1/growth/automation/release-workbench/action-audits?"));
  assert.equal(releaseWorkbenchActionAuditsCall.path, "/api/v1/growth/automation/release-workbench/action-audits?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&endpointKey=release_evidence_collection&status=recorded&limit=3");
});

test("Growth API client routes API calls through the Home AI plugin proxy when embedded", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const calls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "owner",
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://homeai.local/api/hermes-plugins/growth/proxy/?embed=hermes&workspaceId=owner" },
    fetchImpl: async (path, options = {}) => {
      calls.push({ path, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true })
      };
    }
  });

  await client.fetchCardGenerationContext("weixin_stephen", { recipeId: "daily_science_v1" });
  await client.fetchLearningLoopState("weixin_stephen", { target: { learnerId: "fanfan" } });
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_stephen");
  await client.draftGrowthDailyLoop({ target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.publishGrowthDailyLoop({ plan_draft_id: "lgplan_1", selected_item_id: "plan_item_1" }, "weixin_stephen");
  await client.submitGrowthProfileCorrection({ target_node_ids: ["kg_english_main_idea"], reason: "bounded" }, "weixin_stephen");
  await client.fetchGrowthCycleAudit({ task_card_id: "ltask_daily_1", target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.fetchGrowthCycleCompleteness({ task_card_id: "ltask_daily_1" }, "weixin_stephen");
  await client.fetchGrowthCycleHistory({ task_card_id: "ltask_daily_1", target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.fetchGrowthReleaseWorkbench("weixin_stephen", { target: { learnerId: "fanfan" } });
  await client.recordGrowthReleaseWorkbenchAction({ endpoint_key: "runtime_enablement", action_key: "runtime" }, "weixin_stephen");
  await client.fetchGrowthAutomationProposals({ learner_id: "fanfan", status: "accepted" }, "weixin_stephen");
  await client.createGrowthAutomationProposal({ source_task_card_id: "ltask_1" }, "weixin_stephen");
  await client.reviewGrowthAutomationProposal("lgauto_1", { status: "skipped" }, "weixin_stephen");
  await client.publishGrowthAutomationProposal("lgauto_1", { requested_by: "owner" }, "weixin_stephen");
  await client.fetchGrowthAutomationDigests({ learner_id: "fanfan", status: "reviewed" }, "weixin_stephen");
  await client.reviewGrowthAutomationDigest("lgadig_1", { status: "archived" }, "weixin_stephen");
  await client.fetchGrowthAutomationActionHandoffs({ learner_id: "fanfan", delivery_status: "not_delivered" }, "weixin_stephen");
  await client.createGrowthAutomationActionHandoff({ digest_id: "lgadig_1" }, "weixin_stephen");
  await client.deliverGrowthAutomationActionHandoff("lgahand_1", { requested_by: "owner" }, "weixin_stephen");
  await client.fetchGrowthAutomationSchedulerExecutions({ learner_id: "fanfan", handoff_id: "lgahand_1", status: "blocked" }, "weixin_stephen");
  await client.executeGrowthAutomationSchedulerOnce({ handoff_id: "lgahand_1", proposal_id: "lgauto_1" }, "weixin_stephen");
  await client.fetchGrowthAutomationSchedulerRuns({ learner_id: "fanfan", status: "blocked" }, "weixin_stephen");
  await client.runGrowthAutomationSchedulerOnce({ run_mode: "background_supervised_tick" }, "weixin_stephen");
  await client.fetchGrowthAutomationSchedulerWorkerTargets({ learner_id: "fanfan", status: "proposed" }, "weixin_stephen");
  await client.createGrowthAutomationSchedulerWorkerTarget({ subject: "science" }, "weixin_stephen");
  await client.reviewGrowthAutomationSchedulerWorkerTarget("lgawtarget_1", { status: "disabled" }, "weixin_stephen");
  await client.fetchGrowthStageCheckpointControls({ target_node_id: "kg_science_observation" }, "weixin_stephen");
  await client.reviewGrowthRecommendationLifecycle({ trajectory_id: "lgtraj_1", status: "expired" }, "weixin_stephen");
  await client.createGrowthAutomationDigest({ learner_id: "fanfan", limit: 3 }, "weixin_stephen");
  await client.advanceGrowthDailyLoop({ target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.fetchGrowthReferenceObjectTypes("weixin_stephen");
  await client.fetchGrowthReferenceSummary("plan_draft", "lgplan_proxy_1", "weixin_stephen", { purpose: "owner_loop" });
  await client.fetchLearningOperatingLoopRuns({ learner_id: "fanfan", action: "draft_daily_plan" }, "weixin_stephen");
  await client.advanceLearningOperatingLoop({ action: "run_next", target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.fetchGrowthOwnerAuditReviews({ learner_id: "fanfan", task_card_id: "ltask_proxy_1" }, "weixin_stephen");
  await client.recordGrowthOwnerAuditReview({ decision: "needs_follow_up", task_card_id: "ltask_proxy_1" }, "weixin_stephen");
  await client.fetchGrowthAutomationFailurePolicies({ learner_id: "fanfan", status: "active" }, "weixin_stephen");
  await client.fetchGrowthAutomationFailurePolicyReadiness({ learner_id: "fanfan" }, "weixin_stephen");
  await client.createGrowthAutomationFailurePolicy({ learner_id: "fanfan", policy: { summaryOnly: true } }, "weixin_stephen");
  await client.reviewGrowthAutomationFailurePolicy("lgafpol_proxy_1", { status: "archived" }, "weixin_stephen");
  await client.fetchGrowthReleaseArtifactTemplate("weixin_stephen", { target: { learnerId: "fanfan" } });
  await client.fetchGrowthReleaseWorkbenchActionAudits({ learner_id: "fanfan", status: "blocked" }, "weixin_stephen");
  const audioUrl = client.resolveGrowthApiPath("/api/v1/growth/audio/submissions/submission_1", "weixin_stephen");

  assert.equal(calls[0].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/card-generation/context?targetWorkspaceId=weixin_stephen&recipeId=daily_science_v1");
  assert.equal(calls[1].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-loop/state?targetWorkspaceId=weixin_stephen&learnerId=fanfan&horizon=daily_plan&availableMinutes=15");
  assert.equal(calls[2].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/cards/generate");
  assert.equal(calls[3].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/draft");
  assert.equal(calls[4].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/publish");
  assert.equal(calls[5].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/profile-corrections");
  assert.equal(calls[6].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-cycles/audit?targetWorkspaceId=weixin_stephen&taskCardId=ltask_daily_1&targetNodeIds=kg_english_main_idea&limit=20");
  assert.equal(calls[7].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-cycles/completeness?targetWorkspaceId=weixin_stephen&taskCardId=ltask_daily_1&limit=20");
  assert.equal(calls[8].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-cycles/history?targetWorkspaceId=weixin_stephen&taskCardId=ltask_daily_1&targetNodeIds=kg_english_main_idea&limit=8");
  assert.equal(calls[9].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-workbench?targetWorkspaceId=weixin_stephen&learnerId=fanfan&horizon=daily_plan");
  assert.equal(calls[10].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-workbench/actions");
  assert.equal(calls[11].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/proposals?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=accepted&limit=6");
  assert.equal(calls[12].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/proposals");
  assert.deepEqual(JSON.parse(calls[12].options.body), {
    workspace_id: "weixin_stephen",
    source_task_card_id: "ltask_1"
  });
  assert.equal(calls[13].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/proposals/lgauto_1/decision");
  assert.equal(calls[14].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/proposals/lgauto_1/publish");
  assert.equal(calls[15].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/digests?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=reviewed&limit=6");
  assert.equal(calls[16].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/digests/lgadig_1/review");
  assert.deepEqual(JSON.parse(calls[16].options.body), {
    workspace_id: "weixin_stephen",
    status: "archived"
  });
  assert.equal(calls[17].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/action-handoffs?targetWorkspaceId=weixin_stephen&learnerId=fanfan&deliveryStatus=not_delivered&limit=6");
  assert.equal(calls[18].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/action-handoffs");
  assert.deepEqual(JSON.parse(calls[18].options.body), {
    workspace_id: "weixin_stephen",
    digest_id: "lgadig_1"
  });
  assert.equal(calls[19].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/action-handoffs/lgahand_1/deliver");
  assert.deepEqual(JSON.parse(calls[19].options.body), {
    workspace_id: "weixin_stephen",
    requested_by: "owner"
  });
  assert.equal(calls[20].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/executions?targetWorkspaceId=weixin_stephen&learnerId=fanfan&handoffId=lgahand_1&status=blocked&limit=6");
  assert.equal(calls[21].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/execute-once");
  assert.deepEqual(JSON.parse(calls[21].options.body), {
    workspace_id: "weixin_stephen",
    handoff_id: "lgahand_1",
    proposal_id: "lgauto_1"
  });
  assert.equal(calls[22].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/runs?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=blocked&limit=6");
  assert.equal(calls[23].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/run-once");
  assert.deepEqual(JSON.parse(calls[23].options.body), {
    workspace_id: "weixin_stephen",
    run_mode: "background_supervised_tick"
  });
  assert.equal(calls[24].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/worker-targets?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=proposed&limit=6");
  assert.equal(calls[25].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/worker-targets");
  assert.deepEqual(JSON.parse(calls[25].options.body), {
    workspace_id: "weixin_stephen",
    subject: "science"
  });
  assert.equal(calls[26].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/scheduler/worker-targets/lgawtarget_1/review");
  assert.deepEqual(JSON.parse(calls[26].options.body), {
    workspace_id: "weixin_stephen",
    status: "disabled"
  });
  assert.equal(calls[27].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/stage-assessments/controls?targetWorkspaceId=weixin_stephen&targetNodeId=kg_science_observation");
  assert.equal(calls[28].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/recommendations/lifecycle/review");
  assert.deepEqual(JSON.parse(calls[28].options.body), {
    workspace_id: "weixin_stephen",
    trajectory_id: "lgtraj_1",
    status: "expired"
  });
  assert.equal(calls[29].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/digests");
  assert.deepEqual(JSON.parse(calls[29].options.body), {
    workspace_id: "weixin_stephen",
    learner_id: "fanfan",
    limit: 3
  });
  const proxyAdvanceCall = calls.find((call) => call.path === "/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/advance");
  assert.ok(proxyAdvanceCall);
  assert.deepEqual(JSON.parse(proxyAdvanceCall.options.body), {
    workspace_id: "weixin_stephen",
    target_node_ids: ["kg_english_main_idea"]
  });
  assert.equal(calls[31].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/references/object-types?targetWorkspaceId=weixin_stephen");
  assert.equal(calls[32].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/references/plan_draft/lgplan_proxy_1/summary?targetWorkspaceId=weixin_stephen&purpose=owner_loop");
  const proxyOperatingRunsCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/learning-loop/runs?"));
  assert.equal(proxyOperatingRunsCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-loop/runs?targetWorkspaceId=weixin_stephen&learnerId=fanfan&horizon=daily_plan&action=draft_daily_plan&limit=5");
  const proxyOperatingAdvanceCall = calls.find((call) => call.path === "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-loop/advance");
  assert.ok(proxyOperatingAdvanceCall);
  assert.deepEqual(JSON.parse(proxyOperatingAdvanceCall.options.body), {
    workspace_id: "weixin_stephen",
    action: "run_next",
    target_node_ids: ["kg_english_main_idea"]
  });
  const proxyOwnerAuditReviewListCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/owner-audit/reviews?"));
  assert.equal(proxyOwnerAuditReviewListCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/owner-audit/reviews?targetWorkspaceId=weixin_stephen&learnerId=fanfan&taskCardId=ltask_proxy_1&limit=5");
  const proxyOwnerAuditReviewRecordCall = calls.find((call) => call.path === "/api/hermes-plugins/growth/proxy/api/v1/growth/owner-audit/reviews");
  assert.ok(proxyOwnerAuditReviewRecordCall);
  assert.deepEqual(JSON.parse(proxyOwnerAuditReviewRecordCall.options.body), {
    workspace_id: "weixin_stephen",
    decision: "needs_follow_up",
    task_card_id: "ltask_proxy_1"
  });
  const proxyFailurePolicyListCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies?") && call.path.includes("status=active"));
  assert.equal(proxyFailurePolicyListCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=active&limit=6");
  const proxyFailurePolicyReadinessCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies/readiness?"));
  assert.equal(proxyFailurePolicyReadinessCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies/readiness?targetWorkspaceId=weixin_stephen&learnerId=fanfan&limit=6");
  const proxyFailurePolicyCreateCall = calls.find((call) => call.path === "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies");
  assert.ok(proxyFailurePolicyCreateCall);
  assert.deepEqual(JSON.parse(proxyFailurePolicyCreateCall.options.body), {
    workspace_id: "weixin_stephen",
    learner_id: "fanfan",
    policy: { summaryOnly: true }
  });
  const proxyFailurePolicyReviewCall = calls.find((call) => call.path === "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/failure-policies/lgafpol_proxy_1/review");
  assert.ok(proxyFailurePolicyReviewCall);
  assert.deepEqual(JSON.parse(proxyFailurePolicyReviewCall.options.body), {
    workspace_id: "weixin_stephen",
    status: "archived"
  });
  const proxyReleaseArtifactTemplateCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-artifact-template?"));
  assert.equal(proxyReleaseArtifactTemplateCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-artifact-template?targetWorkspaceId=weixin_stephen&learnerId=fanfan&horizon=daily_plan");
  const proxyReleaseWorkbenchActionAuditsCall = calls.find((call) => call.path.startsWith("/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-workbench/action-audits?"));
  assert.equal(proxyReleaseWorkbenchActionAuditsCall.path, "/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-workbench/action-audits?targetWorkspaceId=weixin_stephen&learnerId=fanfan&status=blocked&limit=5");
  assert.equal(audioUrl, "/api/hermes-plugins/growth/proxy/api/v1/growth/audio/submissions/submission_1?workspaceId=weixin_stephen");
});

test("Growth API client avoids proxy-rewritten API string literals", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "growth-api-client.js"), "utf8");
  assert.doesNotMatch(source, /["'`]\/api\/v1\/growth/);
  assert.doesNotMatch(source, /["'`]\/api\/hermes-plugins\/growth\/proxy/);
});

test("Growth card interaction controller chooses a recordable MIME that the browser can play", () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const helper = windowRef.HermesGrowthCardInteractionController.__test;
  const safariLikeRoot = {
    MediaRecorder: { isTypeSupported: (type) => ["audio/mp4", "audio/webm"].includes(type) },
    Audio: function Audio() {
      this.canPlayType = (type) => type === "audio/mp4" ? "probably" : "";
    }
  };
  const chromiumLikeRoot = {
    MediaRecorder: { isTypeSupported: (type) => type.startsWith("audio/webm") },
    Audio: function Audio() {
      this.canPlayType = (type) => type.startsWith("audio/webm") ? "maybe" : "";
    }
  };

  assert.equal(helper.preferredAudioMimeType(safariLikeRoot), "audio/mp4");
  assert.equal(helper.preferredAudioMimeType(chromiumLikeRoot), "audio/webm;codecs=opus");
});

test("Growth card interaction controller records visible preview playback failures", () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const pageState = {
    cardGeneration: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {
      "card_1:submission": { status: "ready", url: "blob:bad", message: "录音已准备" }
    }
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {},
    pageState,
    model: { overview: {}, board: {}, detailCache: new Map() },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => {
      renders += 1;
    },
    refreshCard: async () => null,
    getCurrentWorkspaceId: () => "weixin_fanfan"
  });

  controller.handleRecordingPlaybackError("card_1", "submission");
  assert.equal(pageState.learningGrowthRecordings["card_1:submission"].playbackError, true);
  assert.match(pageState.learningGrowthRecordings["card_1:submission"].message, /无法回放/);
  assert.equal(renders, 1);

  controller.handleRecordingPlaybackError("card_1", "submission");
  assert.equal(renders, 1);
});

test("Growth card interaction controller submits experience signal and refreshes card", async () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const calls = [];
  const refreshed = [];
  const pageState = {
    cardGeneration: {},
    learningGrowthExperienceSignalBusy: {},
    learningGrowthExperienceSignalSubmitted: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {}
  };
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {
      async submitGrowthExperienceSignal(taskCardId, payload, workspaceId) {
        calls.push({ taskCardId, payload, workspaceId });
        return { ok: true };
      }
    },
    pageState,
    model: {
      overview: {
        programs: { taskCards: [{ taskCardId: "card_1", workspaceId: "weixin_fanfan" }] },
        board: { cards: [] }
      },
      detailCache: new Map()
    },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => null,
    refreshCard: async (cardId, workspaceId) => refreshed.push({ cardId, workspaceId }),
    getCurrentWorkspaceId: () => "owner"
  });

  await controller.submitExperienceSignal({
    taskCardId: "card_1",
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"]
  });

  assert.equal(calls[0].taskCardId, "card_1");
  assert.equal(calls[0].workspaceId, "weixin_fanfan");
  assert.equal(JSON.stringify(calls[0].payload), JSON.stringify({
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"],
    source: "growth-plugin-card-ui"
  }));
  assert.equal(pageState.learningGrowthExperienceSignalSubmitted.card_1, "too_hard");
  assert.equal(pageState.learningGrowthExperienceSignalBusy.card_1, "");
  assert.equal(pageState.learningGrowthInteractionMessages["card_1:experience"], "难度感受已记录。");
  assert.deepEqual(refreshed[0], { cardId: "card_1", workspaceId: "weixin_fanfan" });
});

test("Growth card interaction controller lets Owner retry a failed evaluation and refresh", async () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const calls = [];
  const refreshed = [];
  let renders = 0;
  const pageState = {
    cardGeneration: {},
    learningGrowthEvaluationBusy: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {}
  };
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {
      async retryGrowthEvaluation(payload, workspaceId) {
        calls.push({ type: "retry", payload, workspaceId });
        return { ok: true };
      },
      async processGrowthEvaluations(workspaceId, limit) {
        calls.push({ type: "process", workspaceId, limit });
        return { ok: true, processed: 1 };
      }
    },
    pageState,
    model: {
      overview: {
        programs: { taskCards: [{ taskCardId: "card_1", workspaceId: "weixin_fanfan" }] },
        board: { cards: [] }
      },
      detailCache: new Map()
    },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => {
      renders += 1;
    },
    refreshCard: async (cardId, workspaceId) => refreshed.push({ cardId, workspaceId }),
    getCurrentWorkspaceId: () => "owner"
  });

  await controller.retryEvaluation("card_1");

  assert.equal(calls[0].type, "retry");
  assert.equal(calls[0].workspaceId, "weixin_fanfan");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), {
    task_card_id: "card_1",
    reason: "owner_retry_from_growth_ui"
  });
  assert.deepEqual(calls[1], { type: "process", workspaceId: "weixin_fanfan", limit: 3 });
  assert.equal(pageState.learningGrowthEvaluationBusy.card_1, false);
  assert.equal(pageState.learningGrowthInteractionMessages["card_1:evaluation"], "批改状态已刷新。");
  assert.deepEqual(refreshed[0], { cardId: "card_1", workspaceId: "weixin_fanfan" });
  assert.ok(renders >= 3);
});

test("Growth card generation UI renders Owner panel and structured payload", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const releasePackageCandidate = {
    schemaVersion: "growth.learningAutomationReleasePackage.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    ok: true,
    status: "ready_for_release_review",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    domain: "science",
    subject: "science",
    packageId: "lgapkg_ui_1",
    summary: {
      schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      collectionRunId: "release_run_1",
      stepCount: 2
    },
    steps: [{
      taskId: "planner_readiness",
      status: "pass",
      summaryOnly: true
    }, {
      taskId: "scheduler_dry_run",
      status: "pass",
      summaryOnly: true
    }]
  };
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡", durationMinutes: { min: 10, max: 15 } }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      plannerReady: true,
      aiLoopGatewayReady: true,
      operatingLoopGatewayReady: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    targetProvisioning: {
      ok: true,
      targetEnabled: true,
      mode: "sample_default",
      selectedDomainPackId: "uk_hk_curriculum_foundation",
      selectedDomain: "science",
      selectedSubject: "science",
      graphOptions: {
        ok: true,
        available: true,
        selectedDomainPackId: "uk_hk_curriculum_foundation",
        selectedDomain: "science",
        selectedSubject: "science",
        subjects: ["science", "english"],
        domainPacks: [{
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          title: "UK/HK Curriculum Foundation",
          subjects: ["science", "english"],
          nodeCount: 294,
          subjectCount: 2
        }]
      }
    },
    graphOptions: {
      selectedDomainPackId: "uk_hk_curriculum_foundation",
      selectedDomain: "science",
      selectedSubject: "science",
      subjects: ["science", "english"],
      domainPacks: [{
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        title: "UK/HK Curriculum Foundation",
        subjects: ["science", "english"],
        nodeCount: 294,
        subjectCount: 2
      }]
    },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea"],
      title: "Find the main idea",
      domain: "english",
      cardRole: "practice",
      difficultyBand: "foundation",
      evidenceRequirements: ["short_answer"]
    },
    nextCardRecommendation: {
      ok: true,
      selectionMode: "recommendation",
      recommendationMode: "trajectory",
      strategy: "repair",
      cardRole: "teaching",
      difficultyBand: "repair",
      supportLevel: "guided",
      targetNodeId: "kg_english_evidence_answering",
      targetNodeIds: ["kg_english_evidence_answering"],
      reason: "Latest trajectory asks for one evidence repair card."
    },
    recommendationLifecycle: [{
      trajectoryId: "traj_accepted",
      status: "accepted",
      strategy: "repair",
      targetNodeIds: ["kg_english_evidence_answering"],
      reason: "Generated an evidence repair card.",
      generatedTaskCardId: "ltask_generated_1"
    }, {
      trajectoryId: "traj_superseded",
      status: "superseded",
      strategy: "stretch",
      targetNodeIds: ["kg_english_main_idea"],
      reason: "Older stretch suggestion was replaced.",
      supersededByTrajectoryId: "traj_accepted"
    }, {
      trajectoryId: "traj_pending",
      status: "pending",
      strategy: "stabilize",
      sourceTaskCardId: "ltask_source_pending",
      sourceEvaluationId: "eval_source_pending",
      targetNodeIds: ["kg_english_vocab_context"],
      reason: "Pending daily practice suggestion."
    }],
    learningProfile: {
      ok: true,
      summary: {
        masteryStateCount: 2,
        weaknessCount: 1,
        strengthCount: 1,
        recentExperienceSignalCount: 1,
        recentTrajectoryCount: 1
      },
      weaknesses: [{
        nodeId: "kg_english_evidence_answering",
        status: "developing",
        score: 64,
        summary: "Needs exact text evidence."
      }],
      recentTrajectory: [{
        taskCardId: "ltask_1",
        strategy: "stabilize",
        performanceSummary: "Score 64; evidence was vague."
      }],
      nextCardStrategy: {
        strategy: "stabilize",
        reason: "Use one more short evidence-answering card."
      }
    },
    ownerAudit: {
      ok: true,
      available: true,
      summary: {
        planDraftCount: 2,
        publishedPlanCount: 1,
        profileDeltaCount: 1,
        correctionCount: 1,
        lastPlanAt: "2026-06-14T09:15:00.000Z",
        lastPublishedAt: "2026-06-14T09:15:00.000Z",
        lastProfileDeltaAt: "2026-06-14T09:05:00.000Z",
        lastCorrectionAt: "2026-06-14T09:10:00.000Z"
      },
      planAudit: {
        planDrafts: [{
          planDraftId: "lgplan_science_1",
          status: "published",
          generatedTaskCardId: "ltask_science_1",
          selectedItem: {
            itemId: "plan_item_science_1",
            reason: "Repair measured result explanation."
          }
        }]
      },
      profileDeltaAudit: {
        items: [{
          profileDeltaId: "lgpdelta_science_1",
          taskCardId: "ltask_science_1",
          evaluationId: "eval_science_1",
          targetNodeIds: ["kg_english_evidence_answering"],
          evidenceIds: ["lgevidence_science_1"],
          changedCapabilityCount: 1,
          summary: { reason: "Moved to repair after weak measured-result evidence." },
          changedCapabilities: [{
            nodeId: "kg_english_evidence_answering",
            afterStatus: "needs_repair"
          }]
        }]
      },
      profileCorrections: {
        items: [{
          correctionId: "lgcorr_science_1",
          status: "stable",
          targetNodeIds: ["kg_english_evidence_answering"],
          reason: "Owner confirmed the profile was too strict."
        }]
      }
    },
    releaseWorkbench: {
      ok: true,
      status: "blocked",
      releaseWorkbench: {
        status: "blocked",
        ownerActionCount: 6,
        missingEvidenceKeys: ["visual_smoke"],
        missingApprovalKeys: ["writefulExecutionApproval"],
        missingRecordKinds: ["release_collection_run", "release_package", "runtime_enablement"],
        ownerActions: [{
          key: "visual_smoke",
          action: "record_release_evidence",
          requiredActor: "owner",
          label: "Record release evidence for visual_smoke",
          source: "missing_evidence",
          endpointKey: "release_evidence",
          route: {
            body: {
              evidence_key: "visual_smoke",
              check_key: "visual_smoke"
            }
          }
        }, {
          key: "writefulExecutionApproval",
          action: "record_release_approval",
          requiredActor: "owner",
          label: "Record release approval for writeful execution",
          source: "missing_approval",
          endpointKey: "release_approval",
          externalActionRequired: true,
          route: {
            body: {
              approval_key: "writefulExecutionApproval",
              config_gate: "writefulExecutionApproval"
            }
          }
        }, {
          key: "release_collection_run",
          action: "run_release_evidence_collection",
          requiredActor: "owner",
          label: "Run release evidence collection",
          source: "missing_record",
          endpointKey: "release_evidence_collection",
          route: {
            body: {
              tasks: ["profile_feedback", "platform_action", "central_visual", "release_package_review_ui"],
              required_task_ids: ["profile_feedback", "platform_action", "central_visual", "release_package_review_ui"],
              auto_select_latest_completed_cycle: true,
              write_collection_run: true,
              write_release_evidence_records: true,
              central_visual_evidence_file: "",
              release_package_review_ui_evidence_file: ""
            }
          }
        }, {
          key: "release_decision",
          action: "record_release_decision",
          requiredActor: "owner",
          label: "Record release decision",
          source: "missing_record",
          endpointKey: "release_decision",
          route: {
            body: {
              collection_run_id: "lgacr_ready_1",
              auto_select_latest_ready_collection_run: true,
              status: "approved",
              decision_summary: { summaryOnly: true }
            }
          }
        }, {
          key: "release_package",
          action: "record_release_package",
          requiredActor: "owner",
          label: "Record release package",
          source: "missing_record",
          endpointKey: "release_package",
          preparationRoute: {
            body: {
              tasks: ["planner_readiness", "scheduler_dry_run"],
              required_task_ids: ["planner_readiness", "scheduler_dry_run"],
              activation_gates: ["writeful_execution"]
            }
          },
          route: {
            body: {
              release_package: { summaryOnly: true }
            }
          }
        }, {
          key: "runtime_enablement",
          action: "record_runtime_enablement",
          requiredActor: "owner",
          label: "Record runtime enablement",
          source: "missing_record",
          endpointKey: "runtime_enablement",
          externalActionRequired: true,
          route: {
            body: {
              activation_gates: ["writeful_execution"]
            }
          }
        }]
      }
    },
    releaseArtifactTemplate: {
      ok: true,
      status: "artifact_manifest_required",
      releaseArtifactTemplate: {
        schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactTemplate.summary.v1",
        summaryOnly: true,
        status: "artifact_manifest_required",
        manifestSchemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
        artifactSlotCount: 2,
        artifactTaskIds: ["central_visual", "release_package_review_ui"],
        artifactSlots: [{
          schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactSlot.v1",
          summaryOnly: true,
          taskId: "central_visual",
          evidenceKey: "centralVisualEvidence",
          checkKey: "central_visual_evidence",
          manifestField: "centralVisualEvidenceFile",
          required: true,
          source: "home_ai_central_visual_toolchain"
        }, {
          schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactSlot.v1",
          summaryOnly: true,
          taskId: "release_package_review_ui",
          evidenceKey: "releasePackageReviewUiEvidence",
          checkKey: "release_package_review_ui_evidence",
          uiGate: "release_package_review",
          manifestMap: "uiEvidenceFiles",
          manifestKey: "releasePackageReviewUiEvidence",
          required: true,
          source: "home_ai_central_ui_visual_toolchain"
        }],
        artifactManifestTemplate: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          centralVisualEvidenceFile: "",
          uiEvidenceFiles: {
            releasePackageReviewUiEvidence: ""
          }
        },
        readyForManifestInput: false,
        releaseEvidenceChecklist: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceChecklist.v1",
          summaryOnly: true,
          status: "release_evidence_actions_required",
          itemCount: 4,
          artifactItemCount: 2,
          collectionTaskItemCount: 1,
          statePrerequisiteItemCount: 1,
          items: [{
            key: "artifact:central_visual",
            label: "中心视觉证据",
            kind: "home_ai_visual_artifact",
            status: "missing"
          }, {
            key: "artifact:release_package_review_ui",
            label: "发布包复核 UI 证据",
            kind: "home_ai_visual_artifact",
            status: "missing"
          }, {
            key: "collection:profile_feedback",
            label: "Profile feedback collection",
            kind: "release_evidence_collection_task",
            commandName: "npm run smoke:profile-feedback",
            status: "missing"
          }, {
            key: "state:active_failure_policy",
            label: "Active failure policy",
            kind: "release_state_prerequisite",
            routePath: "/api/v1/growth/automation/failure-policies",
            status: "missing"
          }]
        },
        releaseEvidenceActionPlan: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceActionPlan.v1",
          summaryOnly: true,
          status: "release_evidence_actions_required",
          actionCount: 2,
          submittableActionCount: 0,
          phaseBlockedActionCount: 2,
          externalActionCount: 1,
          readyPhase: "release_evidence_prerequisites",
          nextAction: {
            key: "prepare:release_evidence_artifact_manifest",
            action: "collect_home_ai_central_visual_ui_summary_artifacts",
            readyToSubmit: false
          },
          nextSubmittableAction: null,
          actions: [{
            key: "prepare:release_evidence_artifact_manifest",
            action: "collect_home_ai_central_visual_ui_summary_artifacts",
            label: "Prepare release evidence artifact manifest",
            readyToSubmit: false,
            artifactSlotCount: 2,
            artifactTaskIds: ["central_visual", "release_package_review_ui"],
            followupRoute: {
              path: "/api/v1/growth/automation/release-workbench/actions"
            }
          }, {
            key: "execute:release_evidence_collection",
            action: "run_release_evidence_collection",
            label: "Run release evidence collection",
            readyToSubmit: false,
            route: {
              path: "/api/v1/growth/automation/release-workbench/actions"
            },
            directCollectionRoutePath: "/api/v1/growth/automation/release-evidence-collections/run"
          }]
        },
        nextAction: {
          key: "fill_release_evidence_artifact_manifest",
          action: "collect_home_ai_central_visual_ui_summary_artifacts",
          requiredActor: "owner"
        }
      },
      writefulSchedulingAllowed: false
    },
    releaseWorkbenchActionAudits: {
      ok: true,
      schemaVersion: "growth.learningAutomationReleaseWorkbenchActionAuditList.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "listed",
      actionAuditCount: 2,
      actionAudits: [{
        actionAuditId: "lgawba_release_collection_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collectionRunId: "lgacrn_1",
        endpointKey: "release_evidence_collection",
        actionKey: "release_collection_run",
        status: "recorded",
        recordId: "lgacrn_1",
        recordStatus: "ready_for_release_review",
        duplicate: false,
        workbenchStatus: "blocked",
        requestedBy: "owner",
        privacyClass: "summary_only",
        createdAt: "2026-06-18T03:40:00.000Z",
        updatedAt: "2026-06-18T03:40:00.000Z",
        actionRecord: {
          schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.record.v1",
          summaryOnly: true,
          recordId: "lgacrn_1",
          recordStatus: "ready_for_release_review"
        },
        actionSummary: {
          schemaVersion: "growth.learningAutomationReleaseWorkbenchActionAudit.summary.v1",
          summaryOnly: true
        }
      }, {
        actionAuditId: "lgawba_runtime_blocked_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        endpointKey: "runtime_enablement",
        actionKey: "runtime_enablement",
        status: "blocked",
        error: "runtime_enablement_external_evidence_required",
        duplicate: false,
        requestedBy: "owner",
        privacyClass: "summary_only",
        createdAt: "2026-06-18T03:45:00.000Z",
        updatedAt: "2026-06-18T03:45:00.000Z"
      }]
    },
    automationProposals: {
      ok: true,
      count: 2,
      proposals: [{
        proposalId: "lgauto_proposed_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        status: "proposed",
        planDraftId: "lgplan_auto_1",
        selectedItemId: "plan_item_auto_1",
        proposalSummary: "Next low-pressure science card.",
        targetNodeIds: ["kg_science_fair_test"],
        rationale: {
          plan: {
            reason: "Prior completed cycle needs fair-test repair."
          }
        },
        execution: {}
      }, {
        proposalId: "lgauto_accepted_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        status: "accepted",
        planDraftId: "lgplan_auto_2",
        selectedItemId: "plan_item_auto_2",
        proposalSummary: "Accepted evidence repair card.",
        targetNodeIds: ["kg_english_evidence_answering"],
        rationale: {
          plan: {
            reason: "Owner accepted this proposal."
          }
        },
        execution: { status: "failed", error: "learning_plan_publish_generation_failed" }
      }]
    },
    automationDigests: {
      ok: true,
      count: 1,
      digests: [{
        digestId: "lgadig_pending_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "reviewed",
        summary: {
          inspected: 2,
          wouldPublish: 1,
          blocked: 1,
          skipped: 0,
          requiredActions: 1
        },
        candidates: [{
          candidateId: "lgauto_ready_1:lgplan_next:plan_item_next",
          proposalId: "lgauto_ready_1",
          planDraftId: "lgplan_next",
          selectedItemId: "plan_item_next",
          decision: "would_publish",
          reason: "accepted_proposal_ready_for_explicit_publish",
          targetNodeIds: ["kg_science_fair_test"],
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          publishRequiresOwnerAction: true
        }, {
          candidateId: "lgauto_blocked_1:lgplan_blocked:plan_item_blocked",
          proposalId: "lgauto_blocked_1",
          planDraftId: "lgplan_blocked",
          selectedItemId: "plan_item_blocked",
          decision: "blocked_audit",
          reason: "source_cycle_not_ready",
          targetNodeIds: ["kg_science_old"],
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          publishRequiresOwnerAction: false
        }],
        blocked: [{
          candidateId: "lgauto_blocked_1:lgplan_blocked:plan_item_blocked",
          proposalId: "lgauto_blocked_1",
          decision: "blocked_audit",
          reason: "source_cycle_not_ready"
        }],
        requiredActions: [{
          candidateId: "lgauto_ready_1:lgplan_next:plan_item_next",
          proposalId: "lgauto_ready_1",
          endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
        }],
        createdAt: "2026-06-16T10:00:00.000Z",
        updatedAt: "2026-06-16T10:00:00.000Z"
      }]
    },
    automationFailurePolicies: {
      ok: true,
      count: 2,
      policies: [{
        policyId: "lgafpol_draft_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "draft",
        policy: {
          schemaVersion: "growth.learningAutomationPolicy.v1",
          summaryOnly: true,
          ownerReviewRequired: true,
          digestReviewRequired: true,
          actionHandoffRequiredBeforeScheduling: true,
          writefulSchedulingAllowed: false
        },
        rollbackPolicy: {
          schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
          summaryOnly: true,
          transactionalPublishRequired: true,
          partialPublishBehavior: "service_transaction_rollback",
          actionHandoffFailure: "no_learning_write_visible_owner_retry",
          retryRequiresOwner: true,
          maxAutomaticRetries: 0
        },
        failurePolicy: {
          schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
          summaryOnly: true,
          visibleFailureRequired: true,
          ownerReviewRequired: true,
          retryRequiresOwner: true,
          maxAutomaticRetries: 0,
          writefulSchedulingAllowed: false
        }
      }, {
        policyId: "lgafpol_active_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "active",
        policy: {
          schemaVersion: "growth.learningAutomationPolicy.v1",
          summaryOnly: true,
          ownerReviewRequired: true,
          digestReviewRequired: true,
          actionHandoffRequiredBeforeScheduling: true,
          writefulSchedulingAllowed: false
        },
        rollbackPolicy: {
          schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
          summaryOnly: true,
          transactionalPublishRequired: true,
          partialPublishBehavior: "service_transaction_rollback",
          actionHandoffFailure: "no_learning_write_visible_owner_retry",
          retryRequiresOwner: true,
          maxAutomaticRetries: 0
        },
        failurePolicy: {
          schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
          summaryOnly: true,
          visibleFailureRequired: true,
          ownerReviewRequired: true,
          retryRequiresOwner: true,
          maxAutomaticRetries: 0,
          writefulSchedulingAllowed: false
        }
      }],
      readiness: {
        ok: true,
        status: "failure_policy_ready",
        readyForWritefulAutomationPrerequisite: true,
        writefulSchedulingAllowed: false,
        summary: {
          policyId: "lgafpol_active_1",
          status: "active",
          visibleFailureRequired: true,
          retryRequiresOwner: true,
          maxAutomaticRetries: 0,
          transactionalPublishRequired: true,
          partialPublishBehavior: "service_transaction_rollback",
          actionHandoffFailure: "no_learning_write_visible_owner_retry"
        },
        missingRequired: [],
        requiredActions: []
      }
    },
    automationActionHandoffs: {
      ok: true,
      count: 1,
      handoffs: [{
        handoffId: "lgahand_pending_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        digestId: "lgadig_pending_1",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "delivered",
        deliveryStatus: "delivered",
        actionSummary: {
          schemaVersion: "growth.learningAutomationActionHandoff.summary.v1",
          summaryOnly: true,
          digestId: "lgadig_pending_1",
          digestStatus: "reviewed",
          requiredActions: 1,
          blocked: 1,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false
        },
        actions: [{
          candidateId: "lgauto_ready_1:lgplan_next:plan_item_next",
          proposalId: "lgauto_ready_1",
          planDraftId: "lgplan_next",
          selectedItemId: "plan_item_next",
          endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish",
          actionType: "owner_explicit_publish"
        }],
        blocked: [{
          candidateId: "lgauto_blocked_1:lgplan_blocked:plan_item_blocked",
          proposalId: "lgauto_blocked_1",
          decision: "blocked_audit",
          reason: "source_cycle_not_ready"
        }],
        notification: {
          schemaVersion: "growth.learningAutomationActionHandoff.notification.v1",
          summaryOnly: true,
          eventType: "growth.automation.action_required",
          summary: "Reviewed digest needs Owner action."
        }
      }]
    },
    automationSchedulerExecutions: {
      ok: true,
      count: 1,
      executions: [{
        executionId: "lgasexec_blocked_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        handoffId: "lgahand_pending_1",
        digestId: "lgadig_pending_1",
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next",
        selectedItemId: "plan_item_next",
        mode: "owner_explicit_once",
        status: "blocked",
        reason: "learning_automation_scheduler_execution_disabled",
        gate: {
          summaryOnly: true,
          executionMode: "owner_explicit_once",
          writefulExecutionEnabled: false
        },
        action: {
          summaryOnly: true,
          proposalId: "lgauto_ready_1",
          planDraftId: "lgplan_next",
          selectedItemId: "plan_item_next"
        },
        execution: {
          schemaVersion: "growth.learningAutomationSchedulerExecution.execution.v1",
          summaryOnly: true,
          status: "blocked",
          reason: "learning_automation_scheduler_execution_disabled",
          retryRequiresOwner: true
        },
        privacyClass: "summary_only",
        createdAt: "2026-06-16T10:15:00.000Z",
        updatedAt: "2026-06-16T10:15:00.000Z"
      }]
    },
    automationSchedulerRuns: {
      ok: true,
      count: 1,
      runs: [{
        runId: "lgasrun_blocked_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        mode: "background_supervised_tick",
        status: "blocked",
        reason: "learning_automation_background_scheduler_disabled",
        input: {
          schemaVersion: "growth.learningAutomationSchedulerRun.input.v1",
          summaryOnly: true,
          runMode: "background_supervised_tick",
          backgroundSchedulerEnabled: false
        },
        candidates: [],
        executions: [],
        summary: {
          schemaVersion: "growth.learningAutomationSchedulerRun.summary.v1",
          summaryOnly: true,
          backgroundSchedulerEnabled: false,
          executionDelegation: "learning-automation-scheduler-execution-service.executeOnce",
          inspectedHandoffs: 0,
          inspectedActions: 0,
          attemptedExecutions: 0,
          blocked: 0,
          failed: 0,
          skipped: 0,
          noDirectGateway: true
        },
        privacyClass: "summary_only",
        createdAt: "2026-06-16T10:20:00.000Z",
        updatedAt: "2026-06-16T10:20:00.000Z"
      }]
    },
    automationSchedulerWorkerTargets: {
      ok: true,
      count: 1,
      targets: [{
        targetId: "lgawtarget_proposed_1",
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "proposed",
        targetVersion: "growth.learningAutomationSchedulerWorkerTarget.v1",
        target: {
          schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.target.v1",
          summaryOnly: true,
          workspaceId: "weixin_fanfan",
          learnerId: "fanfan",
          programId: "program_science",
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          subject: "science",
          horizon: "daily_plan",
          targetNodeIds: ["kg_science_observation"]
        },
        policy: {
          schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
          summaryOnly: true,
          workerMode: "background_worker_tick",
          schedulerRunMode: "background_supervised_tick",
          productionSchedulingAllowed: false,
          maxActionsPerTick: 5
        },
        readiness: {
          schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.readiness.v1",
          summaryOnly: true,
          targetProvisioningReady: true,
          targetEnabled: true,
          productionSchedulingAllowed: false
        },
        privacyClass: "summary_only",
        createdAt: "2026-06-16T10:25:00.000Z",
        updatedAt: "2026-06-16T10:25:00.000Z"
      }]
    },
    completionPolicy: { mode: "daily_score_once" },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4, evaluationCount: 4, reflectionCount: 1 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        ownerCorrectionDraft: "孩子其实能解释证据，但需要更短材料。",
        ownerCorrectionAction: "mark_needs_repair",
        ownerCorrection: {
          status: "submitted",
          result: {
            correction: { correctionId: "lgcorr_new_1" }
          }
        },
        dailyLoopDraftResult: {
          ok: true,
          planDraft: {
            planDraftId: "lgplan_1",
            workspaceId: "weixin_fanfan",
            learnerId: "fanfan",
            status: "drafted",
            planSummary: "One short evidence repair card.",
            selectedItemId: "plan_item_1",
            itemCount: 1,
            targetNodeIds: ["kg_english_evidence_answering"],
            items: [{
              itemId: "plan_item_1",
              cardRole: "teaching",
              difficultyBand: "repair",
              supportLevel: "guided",
              targetNodeIds: ["kg_english_evidence_answering"],
              evidenceRequirements: ["short_answer"],
              reason: "Repair exact evidence."
            }]
          }
        },
        learningLoopState: {
          status: "ready",
          data: {
            schemaVersion: "growth.learningLoopState.v1",
            status: "ready_to_draft",
            summary: { weaknessCount: 1, missingRequired: [] },
            profile: { weaknessCount: 1 },
            audit: { missingRequired: [] },
            stageAssessment: { eligible: false, status: "dormant" },
            nextAction: {
              action: "draft_daily_plan",
              reason: "next_strategy:repair"
            }
          }
        },
        operatingLoop: {
          status: "ready",
          data: {
            ok: true,
            schemaVersion: "growth.learningOperatingLoopRuns.v1",
            status: "listed",
            count: 1,
            latestRun: {
              runId: "lgloop_run_1",
              status: "executed",
              action: "draft_daily_plan",
              executionMode: "daily_loop_advance",
              taskCardId: "ltask_generated_1"
            },
            runs: [{
              runId: "lgloop_run_1",
              status: "executed",
              action: "draft_daily_plan",
              executionMode: "daily_loop_advance",
              taskCardId: "ltask_generated_1",
              planDraftId: "lgplan_loop_1"
            }]
          },
          actionStatus: "executed",
          actionResult: {
            ok: true,
            status: "executed",
            summary: {
              operatingLoopRunId: "lgloop_run_1",
              taskCardId: "ltask_generated_1",
              planDraftId: "lgplan_loop_1"
            },
            actionResult: {
              taskCardId: "ltask_generated_1",
              planDraftId: "lgplan_loop_1"
            }
          }
        },
        referenceChain: {
          status: "partial",
          objectTypes: {
            ok: true,
            schemaVersion: "growth.referenceObjectTypes.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            referenceContractObjectTypeCount: 9,
            objectTypes: [{ objectType: "task_card" }, { objectType: "mastery_profile" }, { objectType: "profile_feedback" }]
          },
          requests: [{
            objectType: "mastery_profile",
            objectId: "fanfan",
            label: "学习画像",
            reason: "profile_basis"
          }, {
            objectType: "plan_draft",
            objectId: "lgplan_1",
            label: "计划草稿",
            reason: "plan_draft"
          }, {
            objectType: "task_card",
            objectId: "ltask_science_1",
            label: "学习卡片",
            reason: "published_card"
          }],
          summaries: [{
            ok: true,
            objectType: "mastery_profile",
            objectId: "fanfan",
            referenceId: "growth:weixin_fanfan:mastery_profile:fanfan",
            display: { title: "Fanfan mastery profile", subtitle: "Profile V2 summary" },
            summary: { status: "active" },
            privacyClass: "summary_only",
            summaryOnly: true
          }, {
            ok: true,
            objectType: "plan_draft",
            objectId: "lgplan_1",
            referenceId: "growth:weixin_fanfan:plan_draft:lgplan_1",
            display: { title: "One short evidence repair card.", subtitle: "drafted / daily_plan" },
            summary: { itemCount: 1 },
            privacyClass: "summary_only",
            summaryOnly: true
          }, {
            ok: true,
            objectType: "profile_feedback",
            objectId: "task_card:ltask_daily_1",
            referenceId: "growth:weixin_fanfan:profile_feedback:task_card:ltask_daily_1",
            display: { title: "Profile feedback task_card:ltask_daily_1", subtitle: "pass / draft_daily_plan / repair" },
            summary: { evidenceCount: 2, profileDeltaCount: 1, nextAction: "draft_daily_plan" },
            privacyClass: "summary_only",
            summaryOnly: true
          }, {
            ok: false,
            objectType: "task_card",
            objectId: "ltask_missing",
            label: "学习卡片",
            error: "growth_reference_object_not_found"
          }]
        },
        releaseWorkbench: {
          status: "ready",
          data: context.releaseWorkbench,
          actionStatus: "recorded",
          actionResult: {
            endpointKey: "release_evidence",
            actionRecord: {
              recordId: "lgrelevd_1",
              recordStatus: "pass"
            }
          },
          packageStatus: "ready",
          packageResult: {
            ok: true,
            package: releasePackageCandidate
          },
          packageCandidate: releasePackageCandidate
        },
        releaseArtifactTemplate: {
          status: "ready",
          data: context.releaseArtifactTemplate,
          error: ""
        },
        releaseWorkbenchActionAudits: {
          status: "ready",
          data: context.releaseWorkbenchActionAudits,
          error: ""
        },
        automationProposals: {
          status: "ready",
          data: context.automationProposals,
          actionStatus: "reviewed",
          actionResult: {
            proposal: {
              proposalId: "lgauto_proposed_1",
              status: "accepted"
            }
          }
        },
        automationDigests: {
          status: "ready",
          data: context.automationDigests,
          actionStatus: "reviewed",
          actionResult: {
            digest: {
              digestId: "lgadig_pending_1",
              status: "reviewed"
            }
          }
        },
        automationFailurePolicies: {
          status: "ready",
          data: context.automationFailurePolicies,
          actionStatus: "reviewed",
          actionResult: {
            policy: {
              policyId: "lgafpol_draft_1",
              status: "active"
            }
          }
        },
        automationActionHandoffs: {
          status: "ready",
          data: context.automationActionHandoffs,
          actionStatus: "delivered",
          actionResult: {
            deliveryStatus: "delivered",
            handoff: {
              handoffId: "lgahand_pending_1",
              deliveryStatus: "delivered"
            }
          }
        },
        automationSchedulerExecutions: {
          status: "ready",
          data: context.automationSchedulerExecutions,
          actionStatus: "failed",
          actionError: "learning_automation_scheduler_execution_disabled"
        },
        automationSchedulerRuns: {
          status: "ready",
          data: context.automationSchedulerRuns,
          actionStatus: "failed",
          actionError: "learning_automation_background_scheduler_disabled"
        },
        automationSchedulerWorkerTargets: {
          status: "ready",
          data: context.automationSchedulerWorkerTargets,
          actionStatus: "reviewed",
          actionResult: {
            target: {
              targetId: "lgawtarget_proposed_1",
              status: "enabled"
            }
          }
        },
        recommendationLifecycle: {
          actionStatus: "reviewed",
          actionResult: {
            recommendation: {
              trajectoryId: "traj_pending",
              status: "skipped"
            }
          },
          actionError: ""
        },
        cycleDrilldown: {
          status: "ready",
          audit: {
            ok: true,
            summary: {
              planDraftCount: 1,
              evidenceCount: 1,
              profileDeltaCount: 0,
              correctionCount: 1
            },
            timeline: [{
              type: "evidence",
              id: "lgevidence_science_1",
              status: "observed",
              taskCardId: "ltask_science_1",
              evaluationId: "eval_science_1",
              summary: "One-shot evaluation evidence."
            }, {
              type: "plan",
              id: "lgplan_science_1",
              status: "published",
              taskCardId: "ltask_science_1",
              summary: "Plan published a repair card."
            }]
          },
          completeness: {
            ok: true,
            complete: false,
            readyForAutomation: false,
            summary: {
              missingRequired: ["profile_delta_audit"]
            },
            findings: [{
              code: "evaluation_evidence",
              ok: true,
              severity: "required",
              remediation: "Evaluation evidence is present."
            }, {
              code: "profile_delta_audit",
              ok: false,
              severity: "required",
              remediation: "Persist profile-delta audit after evaluation."
            }]
          }
        },
        cycleHistory: {
          status: "ready",
          selectedCycleKey: "ltask_history_1:eval_history_1:lgpdelta_history_1:lgplan_history_1:0",
          selectedCycle: {
            selectors: {
              planDraftId: "lgplan_history_1",
              taskCardId: "ltask_history_1",
              evaluationId: "eval_history_1",
              profileDeltaId: "lgpdelta_history_1",
              evidenceId: "lgevidence_history_1",
              targetNodeIds: ["kg_history_node"]
            },
            counts: { planDrafts: 1, evidence: 1, profileDeltas: 1, corrections: 0 },
            summary: "Older evidence repair cycle."
          },
          data: {
            ok: true,
            cycles: [{
              selectors: {
                planDraftId: "lgplan_history_1",
                taskCardId: "ltask_history_1",
                evaluationId: "eval_history_1",
                profileDeltaId: "lgpdelta_history_1",
                evidenceId: "lgevidence_history_1",
                targetNodeIds: ["kg_history_node"]
              },
              counts: { planDrafts: 1, evidence: 1, profileDeltas: 1, corrections: 0 },
              summary: "Older evidence repair cycle."
            }, {
              selectors: {
                planDraftId: "lgplan_history_2",
                taskCardId: "ltask_history_2",
                evaluationId: "eval_history_2",
                targetNodeIds: ["kg_history_node_2"]
              },
              counts: { planDrafts: 1, evidence: 1, profileDeltas: 0, corrections: 1 },
              summary: "Earlier observation cycle."
            }]
          },
          error: ""
        },
        ownerAuditReviewDraft: "本次画像更新可以接受，下一张保持低压力。",
        ownerAuditReviews: {
          status: "ready",
          data: {
            ok: true,
            schemaVersion: "growth.learningOwnerAuditReviewList.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            count: 1,
            reviews: [{
              reviewId: "lgoar_history_1",
              decision: "accepted",
              status: "reviewed",
              taskCardId: "ltask_history_1",
              evaluationId: "eval_history_1",
              feedbackSummary: {
                readyForNextPlan: true,
                cycleComplete: true,
                evidenceCount: 1,
                profileDeltaCount: 1
              },
              auditSummary: {
                passCheckCount: 5,
                missingRequiredCount: 0
              },
              recommendation: {
                strategy: "repair"
              },
              nextAction: {
                action: "draft_daily_plan"
              },
              createdAt: "2026-06-17T12:00:00.000Z"
            }]
          },
          actionStatus: "reviewed",
          actionResult: {
            decision: "accepted",
            review: {
              reviewId: "lgoar_history_1"
            },
            nextAction: {
              action: "draft_daily_plan"
            }
          },
          actionError: ""
        }
      }
    },
    viewTargets: [
      { workspaceId: "weixin_fanfan", label: "凡凡" },
      { workspaceId: "weixin_stephen", label: "Stephen" }
    ],
    workspaceId: "weixin_fanfan"
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /日常英语卡/);
  assert.match(html, /data-card-generation-draft/);
  assert.match(html, /data-card-generation-publish/);
  assert.match(html, /data-card-generation-advance/);
  assert.match(html, /生成卡片/);
  assert.match(html, /规划下一张/);
  assert.match(html, /发布为卡片/);
  assert.match(html, /data-card-generation-plan-preview/);
  assert.match(html, /lgplan_1/);
  assert.match(html, /plan_item_1/);
  assert.match(html, /Gateway evaluation/);
  assert.match(html, /Planner Gateway/);
  assert.match(html, /data-learning-loop-state-panel/);
  assert.match(html, /data-learning-loop-state-status="ready_to_draft"/);
  assert.match(html, /学习闭环/);
  assert.match(html, /起草日常计划/);
  assert.match(html, /下一张策略：repair/);
  assert.match(html, /data-operating-loop-panel/);
  assert.match(html, /闭环执行/);
  assert.match(html, /data-operating-loop-refresh/);
  assert.match(html, /data-operating-loop-run-next/);
  assert.match(html, /data-operating-loop-action="draft_daily_plan"/);
  assert.match(html, /data-operating-loop-run-id="lgloop_run_1"/);
  assert.match(html, /闭环动作已执行，生成卡片 ltask_generated_1，记录 lgloop_run_1/);
  assert.match(html, /data-reference-chain-panel/);
  assert.match(html, /data-reference-chain-status="partial"/);
  assert.match(html, /闭环引用/);
  assert.match(html, /Fanfan mastery profile/);
  assert.match(html, /lgplan_1/);
  assert.match(html, /growth_reference_object_not_found/);
  assert.match(html, /summary-only/);
  assert.match(html, /data-automation-proposal-panel/);
  assert.match(html, /自动化建议/);
  assert.match(html, /data-automation-proposal-create/);
  assert.match(html, /生成建议/);
  assert.match(html, /Next low-pressure science card/);
  assert.match(html, /data-automation-proposal-review/);
  assert.match(html, /data-automation-proposal-status="accepted"/);
  assert.match(html, /data-automation-proposal-status="skipped"/);
  assert.match(html, /data-automation-proposal-status="expired"/);
  assert.match(html, /data-automation-proposal-status="superseded"/);
  assert.match(html, /data-automation-proposal-publish/);
  assert.match(html, /class="primary disabled" data-automation-proposal-publish/);
  assert.match(html, /data-automation-proposal-blocked-reason="只有待复核建议可以记录决策。"/);
  assert.match(html, /data-automation-proposal-blocked-reason="只有已接受且未发布的建议可以发布。"/);
  assert.match(html, /建议已记录为 已接受/);
  assert.match(html, /Accepted evidence repair card/);
  assert.match(html, /data-automation-digest-panel/);
  assert.match(html, /自动化 Digest/);
  assert.match(html, /data-automation-digest-create/);
  assert.match(html, /生成 Digest/);
  assert.match(html, /data-automation-digest-refresh/);
  assert.match(html, /data-automation-digest-review/);
  assert.match(html, /data-automation-digest-status="reviewed"/);
  assert.match(html, /data-automation-digest-status="archived"/);
  assert.match(html, /data-automation-digest-status="superseded"/);
  assert.match(html, /lgadig_pending_1/);
  assert.match(html, /lgauto_ready_1/);
  assert.match(html, /手动发布，不自动执行/);
  assert.match(html, /Digest 已记录为 已复核/);
  assert.match(html, /data-automation-failure-policy-panel/);
  assert.match(html, /失败策略/);
  assert.match(html, /data-automation-failure-policy-create/);
  assert.match(html, /data-automation-failure-policy-refresh/);
  assert.match(html, /data-automation-failure-policy-review/);
  assert.match(html, /data-automation-failure-policy-status="active"/);
  assert.match(html, /data-automation-failure-policy-status="archived"/);
  assert.match(html, /data-automation-failure-policy-status="superseded"/);
  assert.match(html, /data-automation-failure-policy-id="lgafpol_draft_1"/);
  assert.match(html, /lgafpol_active_1/);
  assert.match(html, /失败可见性和 Owner retry 策略已激活/);
  assert.match(html, /visible failure · Owner retry · transactional publish/);
  assert.match(html, /data-automation-failure-policy-action-status="reviewed"/);
  assert.match(html, /失败策略已记录为 已激活/);
  assert.match(html, /data-automation-action-handoff-panel/);
  assert.match(html, /行动 Handoff/);
  assert.match(html, /data-automation-action-handoff-refresh/);
  assert.match(html, /data-automation-action-handoff-create/);
  assert.match(html, /data-automation-action-handoff-deliver/);
  assert.match(html, /data-automation-action-handoff-id="lgahand_pending_1"/);
  assert.match(html, /lgahand_pending_1/);
  assert.match(html, /平台 action metadata/);
  assert.match(html, /Handoff 投递状态：已投递/);
  assert.match(html, /data-automation-scheduler-execution-panel/);
  assert.match(html, /Scheduler 执行/);
  assert.match(html, /data-automation-scheduler-execution-refresh/);
  assert.match(html, /data-automation-scheduler-execution-execute/);
  assert.match(html, /data-automation-scheduler-execution-id="lgasexec_blocked_1"/);
  assert.match(html, /lgasexec_blocked_1/);
  assert.match(html, /默认禁用/);
  assert.match(html, /learning_automation_scheduler_execution_disabled/);
  assert.match(html, /data-automation-scheduler-run-panel/);
  assert.match(html, /Scheduler Run/);
  assert.match(html, /data-automation-scheduler-run-refresh/);
  assert.match(html, /data-automation-scheduler-run-once/);
  assert.match(html, /data-automation-scheduler-run-id="lgasrun_blocked_1"/);
  assert.match(html, /lgasrun_blocked_1/);
  assert.match(html, /监督 tick/);
  assert.match(html, /learning_automation_background_scheduler_disabled/);
  assert.match(html, /data-automation-scheduler-worker-target-panel/);
  assert.match(html, /Worker Target/);
  assert.match(html, /data-automation-scheduler-worker-target-refresh/);
  assert.match(html, /data-automation-scheduler-worker-target-create/);
  assert.match(html, /data-automation-scheduler-worker-target-review/);
  assert.match(html, /data-automation-scheduler-worker-target-id="lgawtarget_proposed_1"/);
  assert.match(html, /lgawtarget_proposed_1/);
  assert.match(html, /productionSchedulingAllowed=false/);
  assert.match(html, /Worker target 已记录为 已复核/);
  assert.match(html, /data-release-workbench-panel/);
  assert.match(html, /data-release-workbench-status="blocked"/);
  assert.match(html, /发布工作台/);
  assert.match(html, /Record release evidence for visual_smoke/);
  assert.match(html, /Record release approval for writeful execution/);
  assert.match(html, /Run release evidence collection/);
  assert.match(html, /Record release decision/);
  assert.match(html, /Record release package/);
  assert.match(html, /data-release-workbench-action/);
  assert.match(html, /data-release-workbench-endpoint-key="release_evidence"/);
  assert.match(html, /data-release-workbench-endpoint-key="release_approval"/);
  assert.match(html, /data-release-workbench-endpoint-key="release_evidence_collection"/);
  assert.match(html, /data-release-workbench-endpoint-key="release_decision"/);
  assert.match(html, /data-release-workbench-endpoint-key="release_package"/);
  assert.match(html, /收集证据/);
  assert.match(html, /记录决策/);
  assert.match(html, /data-release-artifact-template-panel/);
  assert.match(html, /data-release-artifact-template-status="artifact_manifest_required"/);
  assert.match(html, /证据清单/);
  assert.match(html, /data-release-artifact-template-refresh/);
  assert.match(html, /data-release-artifact-slot/);
  assert.match(html, /data-release-artifact-task-id="central_visual"/);
  assert.match(html, /data-release-artifact-task-id="release_package_review_ui"/);
  assert.match(html, /data-release-artifact-checklist-key="artifact:central_visual"/);
  assert.match(html, /data-release-artifact-checklist-key="collection:profile_feedback"/);
  assert.match(html, /data-release-artifact-action-key="prepare:release_evidence_artifact_manifest"/);
  assert.match(html, /data-release-artifact-action-key="execute:release_evidence_collection"/);
  assert.match(html, /Manifest 待中心视觉\/UI artifact/);
  assert.match(html, /growth.learningAutomationReleaseEvidenceArtifactManifest.v1/);
  assert.match(html, /data-release-workbench-action-audits-panel/);
  assert.match(html, /data-release-workbench-action-audits-status="listed"/);
  assert.match(html, /操作审计/);
  assert.match(html, /data-release-workbench-action-audits-refresh/);
  assert.match(html, /data-release-workbench-action-audit-row/);
  assert.match(html, /data-release-workbench-action-audit-id="lgawba_release_collection_1"/);
  assert.match(html, /release_evidence_collection/);
  assert.match(html, /已记录/);
  assert.match(html, /data-release-package-build/);
  assert.match(html, /构建包候选/);
  assert.match(html, /记录包/);
  assert.match(html, /data-release-package-status="ready"/);
  assert.match(html, /包候选已构建：lgapkg_ui_1/);
  assert.match(html, /已写入 release_evidence 记录：lgrelevd_1/);
  assert.match(html, /data-card-generation-target-provisioning/);
  assert.match(html, /data-card-generation-domain-pack/);
  assert.match(html, /data-card-generation-subject/);
  assert.match(html, /data-card-generation-apply-target/);
  assert.match(html, /data-card-generation-provision-target/);
  assert.match(html, /UK\/HK Curriculum Foundation/);
  assert.match(html, /science/);
  assert.match(html, /data-card-generation-profile/);
  assert.match(html, /data-card-generation-recommendation/);
  assert.match(html, /data-card-generation-lifecycle/);
  assert.match(html, /data-card-generation-owner-audit/);
  assert.match(html, /审计与纠偏/);
  assert.match(html, /lgplan_science_1/);
  assert.match(html, /ltask_science_1/);
  assert.match(html, /lgpdelta_science_1/);
  assert.match(html, /needs_repair/);
  assert.match(html, /lgcorr_science_1/);
  assert.match(html, /data-card-generation-correction-form/);
  assert.match(html, /data-card-generation-correction-note/);
  assert.match(html, /data-card-generation-correction-action/);
  assert.match(html, /保存纠偏/);
  assert.match(html, /纠偏已写入证据账本：lgcorr_new_1/);
  assert.match(html, /data-card-generation-cycle-drilldown/);
  assert.match(html, /单卡闭环审计/);
  assert.match(html, /data-card-generation-cycle-audit-refresh/);
  assert.match(html, /data-card-generation-cycle-history/);
  assert.match(html, /data-card-generation-cycle-history-refresh/);
  assert.match(html, /data-card-generation-cycle-history-select/);
  assert.match(html, /data-cycle-history-selected="true"/);
  assert.match(html, /ltask_history_1/);
  assert.match(html, /Older evidence repair cycle/);
  assert.match(html, /评价证据 · lgevidence_science_1/);
  assert.match(html, /画像变化审计/);
  assert.match(html, /待补齐/);
  assert.match(html, /data-owner-audit-review-panel/);
  assert.match(html, /完成周期审核/);
  assert.match(html, /data-owner-audit-review-refresh/);
  assert.match(html, /data-owner-audit-review-decision="accepted"/);
  assert.match(html, /data-owner-audit-review-decision="needs_follow_up"/);
  assert.match(html, /data-owner-audit-review-decision="correction_recorded"/);
  assert.match(html, /data-owner-audit-review-decision="blocked"/);
  assert.match(html, /data-owner-audit-review-note/);
  assert.match(html, /lgoar_history_1/);
  assert.match(html, /完成周期审核已记录：lgoar_history_1/);
  assert.match(html, /本次画像更新可以接受/);
  assert.match(html, /推荐闭环/);
  assert.match(html, /已生成/);
  assert.match(html, /已替换/);
  assert.match(html, /待生成/);
  assert.match(html, /data-recommendation-lifecycle-review/);
  assert.match(html, /data-recommendation-lifecycle-status="skipped"/);
  assert.match(html, /data-recommendation-lifecycle-status="expired"/);
  assert.match(html, /data-recommendation-lifecycle-trajectory-id="traj_pending"/);
  assert.match(html, /data-recommendation-lifecycle-source-task-card-id="ltask_source_pending"/);
  assert.match(html, /推荐已记录为 已跳过/);
  assert.match(html, /ltask_generated_1/);
  assert.match(html, /traj_accepted/);
  assert.match(html, /data-recommendation-mode="trajectory"/);
  assert.match(html, /学习画像/);
  assert.match(html, /评价轨迹/);
  assert.match(html, /kg_english_evidence_answering/);
  assert.match(html, /Latest trajectory asks for one evidence repair card/);
  assert.match(html, /data-stage-assessment-panel/);
  assert.match(html, /阶段测评/);
  assert.match(html, /data-stage-assessment-check/);
  assert.match(html, /data-stage-assessment-activate/);
  assert.match(html, /Needs exact text evidence/);
  assert.match(html, /weixin_stephen · 需开通/);
  assert.match(html, /daily_score_once/);
  assert.match(html, /mastery_trajectory_projection/);
  assert.match(html, /targetProvisioning/);

  const referenceRequests = windowRef.HermesGrowthCardGenerationUi.createReferenceChainRequests({
    context,
    workspaceId: "weixin_fanfan",
    state: {
      dailyLoopDraftResult: {
        planDraft: { planDraftId: "lgplan_1" }
      },
      generatedResult: {
        published: { taskCardId: "ltask_science_1" },
        learningGraphPlan: { learningGraphPlanId: "lgp_science_1" }
      },
      cycleHistory: {
        selectedCycle: {
          selectors: {
            taskCardId: "ltask_history_1",
            evaluationId: "eval_history_1"
          }
        }
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(referenceRequests.map((item) => `${item.objectType}:${item.objectId}`).slice(0, 6))), [
    "mastery_profile:fanfan",
    "learning_graph_plan:lgp_science_1",
    "plan_draft:lgplan_1",
    "task_card:ltask_science_1",
    "evaluation:eval_history_1",
    "profile_feedback:task_card:ltask_history_1"
  ]);
  assert.equal(JSON.stringify(referenceRequests).includes("raw_prompt"), false);
  assert.equal(JSON.stringify(referenceRequests).includes("transcript"), false);

  const operatingRunQueryPayload = windowRef.HermesGrowthCardGenerationUi.createOperatingLoopRunQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(operatingRunQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    recipe_id: "daily_english_v1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: 15,
    target_node_ids: ["kg_english_evidence_answering"],
    card_schema_version: "growth.card.authoring.v1",
    limit: 5
  });

  const operatingAdvancePayload = windowRef.HermesGrowthCardGenerationUi.createOperatingLoopAdvancePayload({
    context,
    workspaceId: "weixin_fanfan",
    state: {
      targetProvisionDraft: { recipeId: "daily_english_v1" },
      learningLoopState: {
        data: {
          nextAction: {
            action: "draft_daily_plan"
          }
        }
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(operatingAdvancePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    recipe_id: "daily_english_v1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: 15,
    target_node_ids: ["kg_english_evidence_answering"],
    card_schema_version: "growth.card.authoring.v1",
    action: "run_next",
    requested_by: "owner",
    assessment_coverage_node_ids: ["kg_english_main_idea"]
  });
  assert.equal(Object.hasOwn(operatingAdvancePayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(operatingAdvancePayload, "transcript"), false);

  const ownerAuditReviewQueryPayload = windowRef.HermesGrowthCardGenerationUi.createOwnerAuditReviewQueryPayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: {
      selectors: {
        planDraftId: "lgplan_history_1",
        taskCardId: "ltask_history_1",
        evaluationId: "eval_history_1",
        profileDeltaId: "lgpdelta_history_1",
        evidenceId: "lgevidence_history_1",
        targetNodeIds: ["kg_history_node"]
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ownerAuditReviewQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    recipe_id: "daily_english_v1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: 15,
    target_node_ids: ["kg_history_node"],
    card_schema_version: "growth.card.authoring.v1",
    plan_draft_id: "lgplan_history_1",
    task_card_id: "ltask_history_1",
    evaluation_id: "eval_history_1",
    profile_delta_id: "lgpdelta_history_1",
    evidence_id: "lgevidence_history_1",
    source_id: "eval_history_1",
    limit: 5
  });

  const ownerAuditReviewPayload = windowRef.HermesGrowthCardGenerationUi.createOwnerAuditReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: {
      selectors: {
        taskCardId: "ltask_history_1",
        evaluationId: "eval_history_1",
        correctionId: "lgcorr_history_1",
        targetNodeIds: ["kg_history_node"]
      }
    },
    decision: "correction_recorded",
    note: "Owner accepted the bounded correction."
  });
  assert.deepEqual(JSON.parse(JSON.stringify(ownerAuditReviewPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    recipe_id: "daily_english_v1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: 15,
    target_node_ids: ["kg_history_node"],
    card_schema_version: "growth.card.authoring.v1",
    task_card_id: "ltask_history_1",
    evaluation_id: "eval_history_1",
    correction_id: "lgcorr_history_1",
    source_id: "eval_history_1",
    decision: "correction_recorded",
    owner_note: "Owner accepted the bounded correction.",
    requested_by: "owner",
    reviewed_by: "owner"
  });
  assert.equal(windowRef.HermesGrowthCardGenerationUi.ownerAuditReviewHasAnchor(ownerAuditReviewPayload), true);
  assert.equal(Object.hasOwn(ownerAuditReviewPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(ownerAuditReviewPayload, "transcript"), false);

  const releaseArtifactTemplateQueryPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseArtifactTemplateQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releaseArtifactTemplateQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan"
  });
  assert.equal(Object.hasOwn(releaseArtifactTemplateQueryPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releaseArtifactTemplateQueryPayload, "transcript"), false);

  const releaseWorkbenchActionAuditQueryPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionAuditQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releaseWorkbenchActionAuditQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    limit: 5
  });
  assert.equal(Object.hasOwn(releaseWorkbenchActionAuditQueryPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releaseWorkbenchActionAuditQueryPayload, "transcript"), false);

  const releasePayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: context.releaseWorkbench.releaseWorkbench.ownerActions[0]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releasePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    endpoint_key: "release_evidence",
    action_key: "visual_smoke",
    requested_by: "owner",
    action: {
      key: "visual_smoke",
      action: "record_release_evidence",
      endpointKey: "release_evidence",
      source: "missing_evidence",
      summaryOnly: true
    },
    evidence_key: "visual_smoke",
    check_key: "visual_smoke"
  });
  assert.equal(Object.hasOwn(releasePayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releasePayload, "transcript"), false);

  const releaseApprovalPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: context.releaseWorkbench.releaseWorkbench.ownerActions[1]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releaseApprovalPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    endpoint_key: "release_approval",
    action_key: "writefulExecutionApproval",
    requested_by: "owner",
    action: {
      key: "writefulExecutionApproval",
      action: "record_release_approval",
      endpointKey: "release_approval",
      source: "missing_approval",
      summaryOnly: true
    },
    approval_key: "writefulExecutionApproval",
    config_gate: "writefulExecutionApproval",
    status: "active"
  });
  assert.equal(Object.hasOwn(releaseApprovalPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releaseApprovalPayload, "transcript"), false);
  assert.equal(Object.hasOwn(releaseApprovalPayload, "writefulSchedulingAllowed"), false);

  const releaseCollectionPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: context.releaseWorkbench.releaseWorkbench.ownerActions[2]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releaseCollectionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    endpoint_key: "release_evidence_collection",
    action_key: "release_collection_run",
    requested_by: "owner",
    action: {
      key: "release_collection_run",
      action: "run_release_evidence_collection",
      endpointKey: "release_evidence_collection",
      source: "missing_record",
      summaryOnly: true
    },
    tasks: ["profile_feedback", "platform_action", "central_visual", "release_package_review_ui"],
    required_task_ids: ["profile_feedback", "platform_action", "central_visual", "release_package_review_ui"],
    auto_select_latest_completed_cycle: true,
    write_collection_run: true,
    write_release_evidence_records: true
  });
  assert.equal(Object.hasOwn(releaseCollectionPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releaseCollectionPayload, "transcript"), false);
  assert.equal(Object.hasOwn(releaseCollectionPayload, "writefulSchedulingAllowed"), false);

  const releaseDecisionPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: context.releaseWorkbench.releaseWorkbench.ownerActions[3]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releaseDecisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    collection_run_id: "lgacr_ready_1",
    endpoint_key: "release_decision",
    action_key: "release_decision",
    requested_by: "owner",
    action: {
      key: "release_decision",
      action: "record_release_decision",
      endpointKey: "release_decision",
      source: "missing_record",
      summaryOnly: true
    },
    status: "approved",
    decision_summary: { summaryOnly: true },
    auto_select_latest_ready_collection_run: true
  });
  assert.equal(Object.hasOwn(releaseDecisionPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releaseDecisionPayload, "transcript"), false);
  assert.equal(Object.hasOwn(releaseDecisionPayload, "writefulSchedulingAllowed"), false);

  const releasePackageAction = context.releaseWorkbench.releaseWorkbench.ownerActions[4];
  const releasePackageBuildPayload = windowRef.HermesGrowthCardGenerationUi.createReleasePackageBuildPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: releasePackageAction
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releasePackageBuildPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    requested_by: "owner",
    action_key: "release_package",
    action: {
      key: "release_package",
      action: "record_release_package",
      endpointKey: "release_package",
      source: "missing_record",
      summaryOnly: true
    },
    tasks: ["planner_readiness", "scheduler_dry_run"],
    required_task_ids: ["planner_readiness", "scheduler_dry_run"],
    activation_gates: ["writeful_execution"]
  });
  assert.equal(Object.hasOwn(releasePackageBuildPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releasePackageBuildPayload, "transcript"), false);
  assert.equal(Object.hasOwn(releasePackageBuildPayload, "release_package"), false);

  const releasePackageRecordPayload = windowRef.HermesGrowthCardGenerationUi.createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: releasePackageAction,
    releasePackage: releasePackageCandidate
  });
  assert.deepEqual(JSON.parse(JSON.stringify(releasePackageRecordPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    endpoint_key: "release_package",
    action_key: "release_package",
    requested_by: "owner",
    action: {
      key: "release_package",
      action: "record_release_package",
      endpointKey: "release_package",
      source: "missing_record",
      summaryOnly: true
    },
    release_package: releasePackageCandidate
  });
  assert.equal(Object.hasOwn(releasePackageRecordPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(releasePackageRecordPayload, "transcript"), false);
  assert.equal(Object.hasOwn(releasePackageRecordPayload, "writefulSchedulingAllowed"), false);

  const proposalQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(proposalQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const proposalDecisionPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: context.automationProposals.proposals[0],
    status: "accepted"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(proposalDecisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "accepted",
    reason: "Owner accepted supervised next-card proposal.",
    reviewed_by: "owner",
    proposal_id: "lgauto_proposed_1"
  });
  const expiredProposalDecisionPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: context.automationProposals.proposals[0],
    status: "expired"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(expiredProposalDecisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "expired",
    reason: "Owner expired stale supervised next-card proposal.",
    reviewed_by: "owner",
    proposal_id: "lgauto_proposed_1"
  });
  const supersededProposalDecisionPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: context.automationProposals.proposals[0],
    status: "superseded"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(supersededProposalDecisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "superseded",
    reason: "Owner superseded supervised next-card proposal.",
    reviewed_by: "owner",
    proposal_id: "lgauto_proposed_1"
  });
  assert.equal(Object.hasOwn(expiredProposalDecisionPayload, "raw_answer"), false);
  assert.equal(Object.hasOwn(supersededProposalDecisionPayload, "raw_prompt"), false);

  const proposalPublishPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalPublishPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: context.automationProposals.proposals[1]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(proposalPublishPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    proposal_id: "lgauto_accepted_1",
    generation_key: "automation_proposal:lgauto_accepted_1:lgplan_auto_2",
    card_schema_version: "growth.card.authoring.v1",
    requested_by: "owner"
  });

  const digestQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationDigestQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(digestQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const digestCreatePayload = windowRef.HermesGrowthCardGenerationUi.createAutomationDigestCreatePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(digestCreatePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6,
    requested_by: "owner"
  });
  assert.equal(Object.hasOwn(digestCreatePayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(digestCreatePayload, "transcript"), false);

  const digestReviewPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationDigestReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    digest: context.automationDigests.digests[0],
    status: "reviewed"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(digestReviewPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    digest_id: "lgadig_pending_1",
    status: "reviewed",
    selected_candidate_ids: ["lgauto_ready_1:lgplan_next:plan_item_next"],
    reason: "Owner reviewed automation digest without publishing.",
    reviewed_by: "owner"
  });
  assert.equal(Object.hasOwn(digestReviewPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(digestReviewPayload, "transcript"), false);

  const failurePolicyQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationFailurePolicyQueryPayload({
    context,
    workspaceId: "weixin_fanfan",
    status: "draft"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(failurePolicyQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "draft",
    limit: 6
  });

  const failurePolicyCreatePayload = windowRef.HermesGrowthCardGenerationUi.createAutomationFailurePolicyCreatePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(failurePolicyCreatePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    policy_version: "growth.learningAutomationFailurePolicy.v1",
    policy: {
      schemaVersion: "growth.learningAutomationPolicy.v1",
      summaryOnly: true,
      ownerReviewRequired: true,
      digestReviewRequired: true,
      actionHandoffRequiredBeforeScheduling: true,
      writefulSchedulingAllowed: false
    },
    rollback_policy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
      summaryOnly: true,
      transactionalPublishRequired: true,
      partialPublishBehavior: "service_transaction_rollback",
      proposalExecutionFailure: "record_bounded_execution_failure_owner_retry",
      actionHandoffFailure: "no_learning_write_visible_owner_retry",
      retryRequiresOwner: true,
      maxAutomaticRetries: 0
    },
    failure_policy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
      summaryOnly: true,
      visibleFailureRequired: true,
      ownerReviewRequired: true,
      retryRequiresOwner: true,
      maxAutomaticRetries: 0,
      writefulSchedulingAllowed: false
    },
    requested_by: "owner"
  });
  assert.equal(failurePolicyCreatePayload.policy.writefulSchedulingAllowed, false);
  assert.equal(failurePolicyCreatePayload.failure_policy.writefulSchedulingAllowed, false);
  assert.equal(failurePolicyCreatePayload.failure_policy.maxAutomaticRetries, 0);
  assert.equal(Object.hasOwn(failurePolicyCreatePayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(failurePolicyCreatePayload, "transcript"), false);

  const failurePolicyReviewPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationFailurePolicyReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    policy: context.automationFailurePolicies.policies[0],
    status: "active"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(failurePolicyReviewPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    policy_id: "lgafpol_draft_1",
    status: "active",
    reason: "Owner activated failure policy for supervised automation readiness; writeful scheduling remains disabled.",
    note: "Visible failure and Owner retry policy activated.",
    reviewed_by: "owner"
  });
  assert.equal(Object.hasOwn(failurePolicyReviewPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(failurePolicyReviewPayload, "transcript"), false);

  const handoffQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationActionHandoffQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(handoffQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const handoffCreatePayload = windowRef.HermesGrowthCardGenerationUi.createAutomationActionHandoffPayload({
    context,
    workspaceId: "weixin_fanfan",
    digest: context.automationDigests.digests[0]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(handoffCreatePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    digest_id: "lgadig_pending_1",
    summary: "Owner requested bounded action handoff for reviewed digest lgadig_pending_1.",
    requested_by: "owner"
  });

  const handoffDeliverPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationActionHandoffDeliverPayload({
    context,
    workspaceId: "weixin_fanfan",
    handoff: context.automationActionHandoffs.handoffs[0]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(handoffDeliverPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    handoff_id: "lgahand_pending_1",
    requested_by: "owner"
  });
  assert.equal(Object.hasOwn(handoffCreatePayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(handoffDeliverPayload, "transcript"), false);

  const schedulerExecutionQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerExecutionQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(schedulerExecutionQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const schedulerExecutionPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerExecutionPayload({
    context,
    workspaceId: "weixin_fanfan",
    handoff: context.automationActionHandoffs.handoffs[0]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(schedulerExecutionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    handoff_id: "lgahand_pending_1",
    digest_id: "lgadig_pending_1",
    proposal_id: "lgauto_ready_1",
    plan_draft_id: "lgplan_next",
    selected_item_id: "plan_item_next",
    execution_mode: "owner_explicit_once",
    generation_key: "scheduler_execution:lgahand_pending_1:lgauto_ready_1:lgplan_next:plan_item_next",
    card_schema_version: "growth.card.authoring.v1",
    requested_by: "owner"
  });
  assert.equal(Object.hasOwn(schedulerExecutionPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(schedulerExecutionPayload, "transcript"), false);

  const schedulerRunQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerRunQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(schedulerRunQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const schedulerRunPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerRunPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(schedulerRunPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    run_mode: "background_supervised_tick",
    limit: 5,
    generation_key: "scheduler_run:weixin_fanfan:science:science:daily_plan",
    card_schema_version: "growth.card.authoring.v1",
    requested_by: "owner"
  });
  assert.equal(Object.hasOwn(schedulerRunPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(schedulerRunPayload, "transcript"), false);

  const workerTargetQueryPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerWorkerTargetQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(workerTargetQueryPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6
  });

  const workerTargetPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerWorkerTargetPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(workerTargetPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    target_node_ids: ["kg_english_evidence_answering"],
    limit: 5,
    policy: {
      schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
      summaryOnly: true,
      workerMode: "background_worker_tick",
      schedulerRunMode: "background_supervised_tick",
      ownerReviewRequired: true,
      targetProvisioningRequired: true,
      actionHandoffRequiredBeforeScheduling: true,
      productionSchedulingAllowed: false,
      maxActionsPerTick: 5
    },
    requested_by: "owner"
  });
  assert.equal(Object.hasOwn(workerTargetPayload, "raw_prompt"), false);
  assert.equal(Object.hasOwn(workerTargetPayload, "transcript"), false);

  const workerTargetReviewPayload = windowRef.HermesGrowthCardGenerationUi.createAutomationSchedulerWorkerTargetReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    target: context.automationSchedulerWorkerTargets.targets[0],
    status: "enabled"
  });
  assert.equal(workerTargetReviewPayload.target_id, "lgawtarget_proposed_1");
  assert.equal(workerTargetReviewPayload.status, "enabled");
  assert.equal(workerTargetReviewPayload.reviewed_by, "owner");
  assert.equal(Object.hasOwn(workerTargetReviewPayload, "raw_prompt"), false);

  const proposalCreatePayload = windowRef.HermesGrowthCardGenerationUi.createAutomationProposalCreatePayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: {
      selectors: {
        planDraftId: "lgplan_history_1",
        taskCardId: "ltask_history_1",
        evaluationId: "eval_history_1",
        profileDeltaId: "lgpdelta_history_1",
        evidenceId: "lgevidence_history_1",
        targetNodeIds: ["kg_history_node"]
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(proposalCreatePayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: "15",
    low_pressure: true,
    requested_by: "owner",
    source_plan_draft_id: "lgplan_history_1",
    source_task_card_id: "ltask_history_1",
    source_evaluation_id: "eval_history_1",
    profile_delta_id: "lgpdelta_history_1",
    evidence_id: "lgevidence_history_1",
    source_id: "eval_history_1",
    source_target_node_ids: ["kg_history_node"],
    target_node_ids: ["kg_history_node"]
  });

  const recommendationDecisionPayload = windowRef.HermesGrowthCardGenerationUi.createRecommendationLifecycleDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    recommendation: context.recommendationLifecycle[2],
    status: "expired"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(recommendationDecisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    trajectory_id: "traj_pending",
    task_card_id: "ltask_source_pending",
    source_evaluation_id: "eval_source_pending",
    status: "expired",
    reason_code: "owner_expired_stale_recommendation",
    reviewed_by: "owner"
  });
  assert.equal(Object.hasOwn(recommendationDecisionPayload, "raw_answer"), false);
  assert.equal(Object.hasOwn(recommendationDecisionPayload, "transcript"), false);
  assert.equal(Object.hasOwn(recommendationDecisionPayload, "raw_prompt"), false);

  const payload = windowRef.HermesGrowthCardGenerationUi.createDailyEnglishGeneratePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(payload.workspace_id, "weixin_fanfan");
  assert.equal(payload.recipe_id, "daily_english_v1");
  const selectedDraftPayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopDraftPayload({
    context,
    workspaceId: "weixin_fanfan",
    selection: { domainPackId: "uk_hk_curriculum_foundation", domain: "science", subject: "science" }
  });
  assert.equal(selectedDraftPayload.domain_pack_id, "uk_hk_curriculum_foundation");
  assert.equal(selectedDraftPayload.recipe_id, "daily_english_v1");
  assert.equal(selectedDraftPayload.subject, "science");
  const scienceAdvancePayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopAdvancePayload({
    context: Object.assign({}, context, {
      selectedRecipeId: "daily_science_v1",
      generationDefaults: Object.assign({}, context.generationDefaults, {
        domain: "science",
        subject: "science"
      })
    }),
    workspaceId: "weixin_fanfan",
    selection: { recipeId: "daily_science_v1" }
  });
  assert.equal(scienceAdvancePayload.recipe_id, "daily_science_v1");
  assert.equal(scienceAdvancePayload.domain, "science");
  assert.equal(scienceAdvancePayload.subject, "science");
  const provisionPayload = windowRef.HermesGrowthCardGenerationUi.createTargetProvisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    draft: { domainPackId: "uk_hk_curriculum_foundation", domain: "science", subject: "science" }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(provisionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    status: "active",
    source: "owner"
  });
  assert.equal(payload.card_schema_version, "growth.card.authoring.v1");
  assert.equal(Object.hasOwn(payload, "target_node_id"), false);
  assert.equal(Object.hasOwn(payload, "card_role"), false);
  assert.equal(Object.hasOwn(payload, "difficulty_band"), false);
  assert.equal(Object.hasOwn(payload, "completion_policy"), false);
  assert.equal(Object.hasOwn(payload, "generation_key"), false);

  const draftPayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopDraftPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(draftPayload.workspace_id, "weixin_fanfan");
  assert.equal(draftPayload.learner_id, "fanfan");
  assert.equal(draftPayload.domain, "science");
  assert.equal(draftPayload.subject, "science");
  assert.equal(draftPayload.horizon, "daily_plan");
  assert.deepEqual(draftPayload.target_node_ids, ["kg_english_evidence_answering"]);

  const publishPayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopPublishPayload({
    context,
    workspaceId: "weixin_fanfan",
    draftResult: {
      planDraft: {
        planDraftId: "lgplan_1",
        selectedItemId: "plan_item_1",
        items: [{ itemId: "plan_item_1", targetNodeIds: ["kg_english_evidence_answering"] }]
      }
    }
  });
  assert.equal(publishPayload.workspace_id, "weixin_fanfan");
  assert.equal(publishPayload.plan_draft_id, "lgplan_1");
  assert.equal(publishPayload.selected_item_id, "plan_item_1");
  assert.deepEqual(publishPayload.target_node_ids, ["kg_english_evidence_answering"]);

  const correctionPayload = windowRef.HermesGrowthCardGenerationUi.createOwnerCorrectionPayload({
    context,
    workspaceId: "weixin_fanfan",
    draft: {
      note: "孩子其实能解释证据，但需要更短材料。",
      reviewAction: "mark_needs_repair"
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(correctionPayload)), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    target_node_ids: ["kg_english_evidence_answering"],
    review_action: "mark_needs_repair",
    reason: "孩子其实能解释证据，但需要更短材料。",
    profile_delta_id: "lgpdelta_science_1",
    task_card_id: "ltask_science_1",
    evaluation_id: "eval_science_1",
    source_evidence_ids: ["lgevidence_science_1"]
  });
  assert.equal(Object.hasOwn(correctionPayload, "raw_answer"), false);
  assert.equal(Object.hasOwn(correctionPayload, "transcript"), false);
  assert.equal(Object.hasOwn(correctionPayload, "raw_prompt"), false);

  const cyclePayload = windowRef.HermesGrowthCardGenerationUi.createCycleAuditQueryPayload({
    context,
    workspaceId: "weixin_fanfan",
    draftResult: {
      planDraft: {
        planDraftId: "lgplan_1",
        selectedItemId: "plan_item_1",
        items: [{ itemId: "plan_item_1", targetNodeIds: ["kg_english_evidence_answering"] }]
      }
    }
  });
  assert.equal(cyclePayload.workspace_id, "weixin_fanfan");
  assert.equal(cyclePayload.learner_id, "fanfan");
  assert.equal(cyclePayload.plan_draft_id, "lgplan_1");
  assert.equal(cyclePayload.task_card_id, "ltask_science_1");
  assert.equal(cyclePayload.evaluation_id, "eval_science_1");
  assert.equal(cyclePayload.profile_delta_id, "lgpdelta_science_1");
  assert.equal(cyclePayload.evidence_id, "lgevidence_science_1");
  assert.equal(cyclePayload.correction_id, "lgcorr_science_1");
  assert.deepEqual(JSON.parse(JSON.stringify(cyclePayload.target_node_ids)), ["kg_english_evidence_answering"]);
  assert.equal(windowRef.HermesGrowthCardGenerationUi.cycleAuditHasAnchor(cyclePayload), true);
  assert.equal(Object.hasOwn(cyclePayload, "raw_answer"), false);
  assert.equal(Object.hasOwn(cyclePayload, "transcript"), false);
  assert.equal(Object.hasOwn(cyclePayload, "raw_prompt"), false);

  const historyPayload = windowRef.HermesGrowthCardGenerationUi.createCycleHistoryQueryPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(historyPayload.workspace_id, "weixin_fanfan");
  assert.equal(historyPayload.learner_id, "fanfan");
  assert.equal(historyPayload.domain_pack_id, "uk_hk_curriculum_foundation");
  assert.equal(historyPayload.domain, "science");
  assert.equal(historyPayload.subject, "science");
  assert.deepEqual(JSON.parse(JSON.stringify(historyPayload.target_node_ids)), ["kg_english_evidence_answering"]);
  assert.equal(historyPayload.include_completeness, "false");

  const selectedHistoryPayload = windowRef.HermesGrowthCardGenerationUi.createCycleAuditQueryPayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: {
      selectors: {
        planDraftId: "lgplan_history_1",
        taskCardId: "ltask_history_1",
        evaluationId: "eval_history_1",
        profileDeltaId: "lgpdelta_history_1",
        evidenceId: "lgevidence_history_1",
        targetNodeIds: ["kg_history_node"]
      }
    }
  });
  assert.equal(selectedHistoryPayload.plan_draft_id, "lgplan_history_1");
  assert.equal(selectedHistoryPayload.task_card_id, "ltask_history_1");
  assert.equal(selectedHistoryPayload.evaluation_id, "eval_history_1");
  assert.equal(selectedHistoryPayload.profile_delta_id, "lgpdelta_history_1");
  assert.equal(selectedHistoryPayload.evidence_id, "lgevidence_history_1");
  assert.deepEqual(JSON.parse(JSON.stringify(selectedHistoryPayload.target_node_ids)), ["kg_history_node"]);

  const stagePayload = windowRef.HermesGrowthCardGenerationUi.createStageAssessmentPayload({
    context,
    workspaceId: "weixin_fanfan",
    activationSource: "owner_manual"
  });
  assert.equal(stagePayload.workspace_id, "weixin_fanfan");
  assert.equal(stagePayload.target_node_id, "kg_english_main_idea");
  assert.deepEqual(stagePayload.assessment_coverage_node_ids, ["kg_english_main_idea"]);
  assert.equal(stagePayload.activation_source, "owner_manual");
  assert.equal(stagePayload.activation_reason, "owner_manual");
  assert.equal(stagePayload.difficulty_band, "assessment");
});

test("Growth card generation UI renders stage assessment eligibility and activation result", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "weixin_fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea", "kg_english_inference"],
      title: "Reading checkpoint",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    },
    learningProfile: { ok: true, summary: { recentTrajectoryCount: 4 } },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        stageAssessment: {
          status: "active",
          eligibility: { ok: true, eligible: true, reason: "enough_recent_practice", cycle: { status: "eligible" } },
          result: { ok: true, activationState: "active", published: { taskCardId: "stage_card_1" } },
          error: ""
        }
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /data-stage-assessment-status="active"/);
  assert.match(html, /近期练习证据足够/);
  assert.match(html, /<strong>2<\/strong>/);
  assert.match(html, /打开阶段测评/);
  assert.match(html, /data-learning-open-growth-task="stage_card_1"/);
});

test("Growth card generation UI renders active checkpoint from learning-loop state", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_science_v1",
    recipes: [{ id: "daily_science_v1", label: "日常科学卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_science_fair_test",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      capabilityClusterId: "science.fair_test",
      title: "Science checkpoint",
      domain: "science",
      subject: "science",
      evidenceRequirements: ["short_answer"]
    }
  };
  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        learningLoopState: {
          status: "ready",
          data: {
            schemaVersion: "growth.learningLoopState.v1",
            status: "stage_checkpoint_active",
            summary: { weaknessCount: 0, missingRequired: [] },
            stageAssessment: {
              status: "active",
              eligible: true,
              generatedTaskCardId: "stage_card_1"
            },
            nextAction: {
              action: "complete_active_stage_assessment",
              reason: "stage_checkpoint_active",
              taskCardId: "stage_card_1"
            }
          }
        }
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /data-learning-loop-state-status="stage_checkpoint_active"/);
  assert.match(html, /阶段测评进行中/);
  assert.match(html, /完成阶段测评/);
  assert.match(html, /data-learning-open-growth-task="stage_card_1"/);
});

test("Growth card generation UI gates formal checkpoint activation through controls", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_science_observation",
      targetNodeIds: ["kg_science_observation", "kg_science_fair_test"],
      title: "Science checkpoint",
      domain: "science",
      subject: "science",
      evidenceRequirements: ["short_answer"]
    }
  };
  const controls = {
    ok: true,
    schemaVersion: "growth.stageCheckpointControls.v1",
    summary: {
      status: "ready_for_owner_activation",
      readyForOwnerActivation: true,
      recentTrajectoryCount: 4,
      highPressureSignalCount: 0
    },
    readiness: {
      activationState: "eligible",
      reason: "enough_recent_practice",
      evidence: { recentTrajectoryCount: 4, highPressureSignalCount: 0 }
    },
    rubricPolicy: {
      schemaVersion: "growth.card.rubricPolicy.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      policyId: "rubric:stage_assessment_v1:science",
      recipeId: "stage_assessment_v1",
      domain: "science",
      subject: "science",
      cardRole: "stage_assessment",
      rubricDimensions: [{
        dimensionId: "stage_independent_understanding",
        label: "Independent understanding"
      }, {
        dimensionId: "stage_transfer_application",
        label: "Transfer and application"
      }, {
        dimensionId: "stage_evidence_reasoning",
        label: "Evidence and reasoning"
      }, {
        dimensionId: "stage_reflection_calibration",
        label: "Reflection calibration"
      }],
      evidenceKeys: ["formal_answer", "coverage_reasoning", "formal_reflection_once"],
      assessmentPolicy: {
        completionPolicy: "formal_assessment",
        evidenceWeight: "high",
        expectedDurationMinutes: { min: 25, max: 30 },
        evaluationAttempts: 1,
        reflectionAttempts: 1
      }
    },
    actions: [{
      key: "activate_stage_assessment",
      enabled: true,
      route: { path: "/api/v1/growth/stage-assessments/activate" }
    }]
  };

  const readyHtml = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        stageAssessment: {
          status: "ready_for_owner_activation",
          controls,
          controlsStatus: "ready",
          controlsError: "",
          error: ""
        }
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });
  const readyButton = readyHtml.match(/<button[^>]+data-stage-assessment-activate[^>]*>/)?.[0] || "";
  assert.match(readyHtml, /data-stage-checkpoint-controls-status="ready"/);
  assert.match(readyHtml, /data-stage-checkpoint-activate-enabled="true"/);
  assert.match(readyHtml, /data-stage-assessment-rubric/);
  assert.match(readyHtml, /data-stage-assessment-rubric-policy-id="rubric:stage_assessment_v1:science"/);
  assert.match(readyHtml, /测评规则/);
  assert.match(readyHtml, /formal_assessment/);
  assert.match(readyHtml, /25-30 分钟/);
  assert.match(readyHtml, /Independent understanding/);
  assert.match(readyHtml, /stage_evidence_reasoning/);
  assert.match(readyHtml, /formal_answer · coverage_reasoning · formal_reflection_once/);
  assert.match(readyHtml, /Owner 可以显式生成一次正式阶段测评/);
  assert.doesNotMatch(readyButton, /\sdisabled(?:\s|>|=)/);

  const blockedHtml = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        stageAssessment: {
          status: "cooldown",
          controls: Object.assign({}, controls, {
            summary: { status: "cooldown", readyForOwnerActivation: false, recentTrajectoryCount: 4, highPressureSignalCount: 0 },
            readiness: { activationState: "cooldown", reason: "stage_assessment_recently_completed", cooldownUntil: "2026-06-20T00:00:00.000Z" },
            actions: [{
              key: "activate_stage_assessment",
              enabled: false,
              disabledReason: "stage_assessment_cooldown_active"
            }]
          }),
          controlsStatus: "ready",
          controlsError: "",
          error: ""
        }
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });
  const blockedButton = blockedHtml.match(/<button[^>]+data-stage-assessment-activate[^>]*>/)?.[0] || "";
  assert.match(blockedHtml, /data-stage-checkpoint-activate-enabled="false"/);
  assert.match(blockedHtml, /同一能力簇仍在冷却期/);
  assert.match(blockedButton, /\sdisabled(?:\s|>|=)/);
  assert.match(blockedButton, /data-stage-assessment-blocked-reason="同一能力簇仍在冷却期。"/);
});

test("Growth teaching card UI renders submit and recording controls for a generated daily card", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "published",
    cardRole: "practice",
    expectedDurationMinutes: { min: 10, max: 15 },
    rewardPolicy: { maxCoins: 100 },
    teachingFlow: {
      learningTarget: "Find the main idea in one paragraph.",
      prerequisites: ["paragraph", "topic"],
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Underline the sentence that explains the whole paragraph.", hints: ["Look at repeated ideas"] },
      quickCheck: { instruction: "Write the main idea in one sentence.", completionCriteria: ["Use your own words"] },
      difficultyBasis: "recent reading summary",
      supportLevel: "guided"
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" },
      learningGrowthTeachingDrafts: {
        ltask_daily_1: { submissionText: "The paragraph is about saving water." }
      },
      learningGrowthRecordings: {
        "ltask_daily_1:submission": { status: "ready", url: "blob:submission", durationMs: 4200 }
      }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /data-learning-growth-daily-flow/);
  assert.doesNotMatch(html, /data-learning-growth-flow-step="learn"/);
  assert.match(html, /data-learning-growth-flow-step="submit"><b>提交<\/b><small>待提交<\/small>/);
  assert.match(html, /data-learning-growth-flow-step="evaluate"><b>批改<\/b><small>待提交后<\/small>/);
  assert.match(html, /data-learning-growth-flow-step="reflect"><b>反思<\/b><small>待批改后<\/small>/);
  assert.match(html, /学习流程/);
  assert.match(html, /提交、批改、反思三步/);
  assert.match(html, /Find the main idea in one paragraph/);
  assert.match(html, /paragraph/);
  assert.match(html, /A main idea tells what the paragraph is mostly about/);
  assert.match(html, /Underline the sentence/);
  assert.match(html, /data-field="submissionText"/);
  assert.doesNotMatch(html, /data-field="guidedPracticeText"/);
  assert.doesNotMatch(html, /data-field="quickCheckText"/);
  assert.equal(countMatches(html, /<textarea\b/g), 1);
  assert.match(html, /data-learning-growth-submission-form="ltask_daily_1"/);
  assert.match(html, /data-learning-growth-record-toggle="ltask_daily_1"/);
  assert.match(html, /data-record-kind="submission"/);
  assert.match(html, /blob:submission/);
  assert.match(html, /data-learning-growth-record-playback="ltask_daily_1"/);
  assert.match(html, />提交作答<\/button>/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI keeps a failed recording preview visible as a recoverable state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "published",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthRecordings: {
        "ltask_daily_1:submission": {
          status: "ready",
          url: "blob:bad-format",
          playbackError: true,
          message: "录音已保存，但当前浏览器无法回放。"
        }
      }
    }
  });

  assert.match(html, /重新录音/);
  assert.match(html, /当前浏览器无法回放/);
  assert.match(html, /data-learning-growth-record-clear="ltask_daily_1"/);
  assert.doesNotMatch(html, /data-learning-growth-record-playback="ltask_daily_1"/);
});

test("Growth teaching card UI renders submitted waiting-evaluation state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /作答已提交/);
  assert.match(html, /等待批改/);
  assert.match(html, /刷新批改/);
  assert.match(html, /data-learning-growth-flow-step="evaluate"/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, />提交作答<\/button>/);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI renders visible failed evaluation state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    },
    latestEvaluationJob: {
      jobId: "job_1",
      status: "failed",
      attemptCount: 3,
      failedVisible: true,
      lastError: "gateway_timeout"
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /批改未完成/);
  assert.match(html, /需要处理/);
  assert.match(html, /Owner 检查/);
  assert.match(html, /刷新状态/);
  assert.match(html, /已尝试 3 次/);
  assert.match(html, /todo-learning-growth-evaluation is-failed/);
  assert.doesNotMatch(html, /data-learning-growth-evaluation-retry/);
  assert.doesNotMatch(html, /重新批改/);
  assert.doesNotMatch(html, /错误摘要/);
  assert.doesNotMatch(html, /gateway_timeout/);
  assert.doesNotMatch(html, /作答已保存，系统会处理一次批改/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI renders Owner retry action for failed evaluation", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    },
    latestEvaluationJob: {
      jobId: "job_1",
      status: "failed",
      attemptCount: 3,
      failedVisible: true,
      lastError: "gateway_timeout",
      lastOwnerReview: {
        action: "retry",
        reason: "owner retry",
        reviewedBy: "owner",
        reviewedAt: "2026-06-14T06:15:00.000Z"
      }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      auth: { isOwner: true },
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /data-learning-growth-evaluation-retry="ltask_daily_1"/);
  assert.match(html, /data-workspace-id="weixin_fanfan"/);
  assert.match(html, /重新批改/);
  assert.match(html, /刷新状态/);
  assert.match(html, /已尝试 3 次/);
  assert.match(html, /Owner 已在 2026-06-14T06:15:00.000Z 重新加入队列/);
  assert.match(html, /错误摘要：gateway_timeout/);
});

test("Growth teaching card UI renders one-shot evaluation and optional reflection after submission", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "completed",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42,
      wordCount: 8,
      audio: { url: "/api/v1/growth/audio/submissions/submission_1", name: "answer.webm", mime: "audio/webm" }
    },
    latestEvaluation: {
      evaluationId: "eval_1",
      status: "completed",
      score: 72,
      maxScore: 100,
      summary: "The main idea is clear enough for today.",
      feedbackSections: {
        strengths: ["Clear topic sentence"],
        remainingWeaknesses: ["Add one detail next time"],
        nextPractice: ["Use because to explain evidence"]
      }
    },
    targetNodeIds: ["kg_english_main_idea"]
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /作答已提交/);
  assert.match(html, /这张日常卡只批改一次/);
  assert.match(html, /反思只保存学习证据/);
  assert.match(html, /批改已完成/);
  assert.match(html, /确定分数 72\/100/);
  assert.match(html, /反思一次/);
  assert.match(html, /data-learning-growth-reflection-form="ltask_daily_1"/);
  assert.match(html, /data-learning-growth-reflection-text="ltask_daily_1"/);
  assert.equal(countMatches(html, /<textarea\b/g), 1);
  assert.match(html, /data-record-kind="reflection"/);
  assert.match(html, /proxy:weixin_fanfan:\/api\/v1\/growth\/audio\/submissions\/submission_1/);
  assert.match(html, /data-learning-growth-saved-audio/);
  assert.match(html, /data-learning-growth-audio-error hidden/);
  assert.match(html, /data-learning-growth-experience-mode="active"/);
  assert.match(html, /data-learning-growth-experience-signal="ltask_daily_1"/);
  assert.match(html, /data-target-node-ids="kg_english_main_idea"/);
  assert.match(html, /选择一项，下一张卡会参考这个信号/);
  assert.doesNotMatch(html, />提交作答<\/button>/);
});

test("Growth teaching card UI renders submitted reflection audio without reopening reflection", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "completed",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: { submissionId: "submission_1", submittedAt: "2026-06-12T10:00:00.000Z" },
    latestEvaluation: { evaluationId: "eval_1", status: "completed", score: 88, maxScore: 100, summary: "Good." },
    latestReflection: {
      reflectionId: "reflection_1",
      submittedAt: "2026-06-12T10:05:00.000Z",
      summary: "I should explain my evidence.",
      audio: { url: "/api/v1/growth/audio/reflections/reflection_1", name: "reflection.webm", mime: "audio/webm" }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /反思已提交/);
  assert.match(html, /proxy:weixin_fanfan:\/api\/v1\/growth\/audio\/reflections\/reflection_1/);
  assert.match(html, /录音暂时无法播放/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth card generation UI renders visible progress while generating", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      authoringGatewayConfigured: true
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea"],
      title: "Find the main idea",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "publishing",
        context,
        dailyLoopDraftResult: {
          planDraft: {
            planDraftId: "lgplan_1",
            selectedItemId: "plan_item_1",
            items: [{ itemId: "plan_item_1", targetNodeIds: ["kg_english_main_idea"] }]
          }
        },
        progressStep: "authoring",
        progressMessage: "正在根据已验证计划项生成卡片。"
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /data-card-generation-progress/);
  assert.match(html, /role="status"/);
  assert.match(html, /正在发布卡片/);
  assert.match(html, /data-progress-step="authoring" data-progress-state="active"/);
  assert.match(html, /正在根据已验证计划项生成卡片。/);
  assert.match(html, />正在发布<\/button>/);
});

test("Growth card generation UI renders the context target even when host targets omit it", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_stephen", learnerId: "weixin_stephen", displayName: "凡凡", enabled: true },
    readiness: {
      ready: false,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      title: "Find the main idea",
      domain: "english"
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context } },
    viewTargets: [{ workspaceId: "owner", label: "徐欣" }],
    workspaceId: "weixin_stephen"
  });

  assert.match(html, /凡凡/);
  assert.match(html, /weixin_stephen · sample/);
  assert.match(html, /learning-card-generation-target active/);
});

test("Growth card generation UI keeps Owner workspace separate from selected generation target", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_stephen", learnerId: "weixin_stephen", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      title: "Find the main idea",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context, selectedWorkspaceId: "weixin_stephen" } },
    viewTargets: [
      { workspaceId: "owner", label: "徐欣", current: true },
      { workspaceId: "weixin_stephen", label: "凡凡" }
    ],
    workspaceId: "weixin_stephen"
  });

  const activeTargets = Array.from(html.matchAll(/<button[^>]+class="learning-card-generation-target active[^"]*"[^>]*>[\s\S]*?<\/button>/g))
    .map((match) => match[0]);
  assert.equal(activeTargets.length, 1);
  assert.match(activeTargets[0], /weixin_stephen · sample/);
  assert.doesNotMatch(activeTargets[0], /owner · 稍后开放/);

  const draftTag = html.match(/<button[^>]+data-card-generation-draft[^>]*>/)?.[0] || "";
  assert.doesNotMatch(draftTag, /data-card-generation-blocked-reason=/);
  assert.doesNotMatch(draftTag, /aria-disabled="true"/);
});

test("Growth card generation UI gives feedback for blocked readiness instead of silent disabled", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context: {
          target: { workspaceId: "owner", learnerId: "owner", displayName: "徐欣", enabled: false },
          selectedRecipeId: "daily_english_v1",
          recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
          readiness: {
            ready: false,
            targetEnabled: false,
            workspaceProvisioned: true,
            learningGraphReady: true,
            historySummaryReady: true,
            gatewayConfigured: true
          },
          graph: { nodeCount: 294, edgeCount: 329 },
          suggestedPlan: {
            targetNodeId: "kg_english_main_idea",
            title: "Find the main idea",
            domain: "english",
            evidenceRequirements: ["short_answer"]
          }
        }
      }
    },
    viewTargets: [
      { workspaceId: "owner", label: "徐欣" },
      { workspaceId: "weixin_stephen", label: "凡凡" }
    ],
    workspaceId: "owner"
  });

  const draftTag = html.match(/<button[^>]+data-card-generation-draft[^>]*>/)?.[0] || "";
  assert.match(draftTag, /data-card-generation-blocked-reason="请先在左侧选择凡凡，再生成卡片。"/);
  assert.match(draftTag, /aria-disabled="true"/);
  assert.doesNotMatch(draftTag, /\sdisabled(=|\s|>)/);
});

test("Growth view-model adapter normalizes cards, lanes, and overview metrics", () => {
  const windowRef = loadPublicScript("growth-view-model.js");
  const viewModel = windowRef.HermesGrowthViewModel.createGrowthViewModel({
    getWorkspaceId: () => "weixin_child",
    learnerLabel: () => "Stephen"
  });

  const overview = viewModel.makeOverview(
    { source: "growth-plugin-sqlite", stage: "plugin_sqlite" },
    {
      source: "growth-plugin-sqlite",
      cards: [
        { taskCardId: "card_1", title: "Read", status: "active", latestRewardSettlement: { coinAmount: 12 } },
        { id: "card_2", status: "completed" }
      ],
      lanes: [{ id: "ready", cards: ["card_1", "missing"] }]
    }
  );

  assert.equal(overview.learner.displayName, "Stephen");
  assert.equal(overview.metrics.totalCards, 2);
  assert.equal(overview.metrics.completedTasks, 1);
  assert.equal(overview.coins.growth.totalEarnedCoins, 12);
  assert.deepEqual(overview.board.lanes[0].cards, ["card_1"]);
  assert.equal(overview.programs.taskCards[1].title, "card_2");
});

test("Growth route controller opens card and action routes without DOM coupling", async () => {
  const windowRef = loadPublicScript("growth-route-controller.js");
  const opened = [];
  const pageState = {
    auth: { isOwner: false },
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview"
  };
  const model = {
    overview: {
      board: { cards: [{ taskCardId: "card_1", nextAction: "submit" }] },
      programs: { taskCards: [], executableTasks: [] }
    }
  };
  const controller = windowRef.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute: "submit_work",
    pluginItemId: "",
    pageState,
    model,
    openCard: async (id) => opened.push(id)
  });

  assert.equal(controller.firstTaskCardForRoute("submit_work").taskCardId, "card_1");
  assert.equal(await controller.applyInitialPluginRoute(), true);
  assert.deepEqual(opened, ["card_1"]);

  const ownerState = {
    auth: { isOwner: true },
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview"
  };
  const ownerController = windowRef.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute: "generate_cards",
    pluginItemId: "",
    pageState: ownerState,
    model,
    openCard: async () => null
  });
  assert.equal(await ownerController.applyInitialPluginRoute(), false);
  assert.equal(ownerState.learningGrowthSettingsOpen, true);
  assert.equal(ownerState.learningGrowthActiveTab, "generation");
});

test("Growth navigation controller consumes host back on card detail before host exit", () => {
  const windowRef = loadPublicScript("growth-navigation-controller.js");
  const listeners = {};
  const posted = [];
  const historyCalls = [];
  const pageState = {
    selectedLearningTaskCardId: "card_1",
    learningGrowthHistoryTaskCardId: "",
    learningGrowthSettingsTaskId: "",
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready"
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthNavigation.createGrowthNavigationController({
    pageState,
    renderShell: () => {
      renders += 1;
    },
    historyRef: {
      replaceState: (...args) => historyCalls.push(["replace", ...args]),
      pushState: (...args) => historyCalls.push(["push", ...args])
    },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    parentRef: { postMessage: (payload) => posted.push(payload) },
    windowRef: { addEventListener: (eventName, handler) => { listeners[eventName] = handler; } }
  });

  controller.bind();
  assert.equal(posted.at(-1).type, "growth.plugin.navigation");
  assert.equal(posted.at(-1).canGoBack, true);

  listeners.message({ data: { type: "hermes.plugin.back", version: 1 } });

  assert.equal(pageState.selectedLearningTaskCardId, "");
  assert.equal(renders, 1);
  assert.equal(historyCalls.at(-1)[0], "replace");
  assert.equal(posted.at(-1).type, "growth.plugin.back_result");
  assert.equal(posted.at(-1).handled, true);
  assert.equal(posted.at(-1).canGoBack, false);
  assert.equal(posted.at(-1).route.name, "root");
});

test("Growth navigation controller reports unhandled back at plugin root", () => {
  const windowRef = loadPublicScript("growth-navigation-controller.js");
  const posted = [];
  const pageState = {
    selectedLearningTaskCardId: "",
    learningGrowthHistoryTaskCardId: "",
    learningGrowthSettingsTaskId: "",
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready"
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthNavigation.createGrowthNavigationController({
    pageState,
    renderShell: () => {
      renders += 1;
    },
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    parentRef: { postMessage: (payload) => posted.push(payload) },
    windowRef: { addEventListener: () => null }
  });

  assert.equal(controller.handleBack("test_root_back"), false);
  assert.equal(renders, 0);
  assert.equal(posted[0].type, "growth.plugin.back_result");
  assert.equal(posted[0].handled, false);
  assert.equal(posted[0].canGoBack, false);
  assert.equal(posted[0].route.name, "root");
});

test("Growth index loads frontend adapters before app boot", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const staticVersion = "20260618-release-action-audit-ui-v1";
  const order = [
    "/growth-appearance.js",
    "/growth-api-client.js",
    "/growth-view-model.js",
    "/growth-route-controller.js",
    "/growth-card-generation-ui.js",
    "/growth-card-interaction-controller.js",
    "/growth-navigation-controller.js",
    "/app.js"
  ].map((asset) => html.indexOf(asset));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal((html.match(new RegExp(staticVersion, "g")) || []).length, 13);
  assert.doesNotMatch(html, /20260616-digest-create-ui-v1/);
  assert.doesNotMatch(html, /20260614-post-publish-context-v1/);
  assert.doesNotMatch(html, /20260614-growth-navigation-v1/);
  assert.doesNotMatch(html, /20260614-stage-assessment-ui-v1/);
  assert.doesNotMatch(html, /20260614-evaluation-failure-ui-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-retry-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-retry-ui-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-status-ui-v1/);
  assert.doesNotMatch(html, /20260614-recommendation-rationale-ui-v1/);
  assert.doesNotMatch(html, /20260614-recipe-policy-v1/);
  assert.doesNotMatch(html, /20260614-recommendation-lifecycle-v1/);
  assert.doesNotMatch(html, /20260615-daily-loop-draft-publish-ui-v1/);
  assert.doesNotMatch(html, /20260615-owner-audit-correction-ui-v1/);
  assert.doesNotMatch(html, /20260615-cycle-audit-drilldown-ui-v1/);
  assert.doesNotMatch(html, /20260616-action-handoff-ui-v1/);
  assert.doesNotMatch(html, /20260616-scheduler-execution-ui-v1/);
  assert.doesNotMatch(html, /20260616-scheduler-run-ui-v1/);
  assert.doesNotMatch(html, /20260616-worker-target-ui-v1/);
});

test("Growth app refreshes card generation context after publish without clearing preview", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

  assert.match(source, /function refreshLearningLoopState/);
  assert.match(source, /function refreshCardGenerationContextAfterPublish/);
  assert.match(source, /api\.fetchCardGenerationContext\(requestedTargetWorkspaceId, requestedSelection\)/);
  assert.match(source, /api\.fetchCardGenerationContext\(requestedTargetWorkspaceId, selection\)/);
  assert.match(source, /data-card-generation-recipe/);
  assert.match(source, /resetGraphSelection: true/);
  assert.match(source, /selection: \{ recipeId \}/);
  assert.match(source, /api\.fetchLearningLoopState\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /function refreshReleaseWorkbench/);
  assert.match(source, /api\.fetchGrowthReleaseWorkbench\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /function refreshReleaseArtifactTemplate/);
  assert.match(source, /api\.fetchGrowthReleaseArtifactTemplate\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /data-release-artifact-template-refresh/);
  assert.match(source, /releaseArtifactTemplate/);
  assert.match(source, /await refreshReleaseArtifactTemplate\(requestedTargetWorkspaceId, pageState\.cardGeneration\.context \|\| context, \{ silent: true \}\)/);
  assert.match(source, /function refreshReleaseWorkbenchActionAudits/);
  assert.match(source, /api\.fetchGrowthReleaseWorkbenchActionAudits\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /data-release-workbench-action-audits-refresh/);
  assert.match(source, /releaseWorkbenchActionAudits/);
  assert.match(source, /await refreshReleaseWorkbenchActionAudits\(requestedTargetWorkspaceId, pageState\.cardGeneration\.context \|\| context, \{ silent: true \}\)/);
  assert.match(source, /function refreshAutomationProposals/);
  assert.match(source, /api\.fetchGrowthAutomationProposals\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.createGrowthAutomationProposal\(payload, targetWorkspaceId\)/);
  assert.match(source, /pageState\.cardGeneration\.context = context/);
  assert.match(source, /await refreshLearningLoopState\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /await refreshAutomationProposals\(requestedTargetWorkspaceId, context/);
  assert.match(source, /await refreshReleaseWorkbench\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /function draftDailyLoopFromUi/);
  assert.match(source, /api\.draftGrowthDailyLoop\(payload, targetWorkspaceId\)/);
  assert.match(source, /function advanceDailyLoopFromUi/);
  assert.match(source, /api\.advanceGrowthDailyLoop\(payload, targetWorkspaceId\)/);
  assert.match(source, /pageState\.cardGeneration\.status = "drafted";[\s\S]*pageState\.cardGeneration\.dailyLoopDraftResult = result;[\s\S]*await refreshLearningLoopState\(targetWorkspaceId, pageState\.cardGeneration\.context\)/);
  assert.match(source, /function publishDailyLoopFromUi/);
  assert.match(source, /api\.publishGrowthDailyLoop\(payload, targetWorkspaceId\)/);
  assert.match(source, /pageState\.cardGeneration\.status = "published";[\s\S]*pageState\.cardGeneration\.dailyLoopPublishResult = result;[\s\S]*pageState\.cardGeneration\.generatedResult = result\.generation \|\| result;[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId\);[\s\S]*renderShell\(\);/);
  assert.match(source, /pageState\.cardGeneration\.generatedResult = result\.generation \|\| result;[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId\);[\s\S]*renderShell\(\);/);
  assert.match(source, /data-card-generation-correction-note/);
  assert.match(source, /data-card-generation-correction-action/);
  assert.match(source, /data-card-generation-correction-form/);
  assert.match(source, /data-card-generation-cycle-audit-refresh/);
  assert.match(source, /data-card-generation-domain-pack/);
  assert.match(source, /data-card-generation-subject/);
  assert.match(source, /data-card-generation-apply-target/);
  assert.match(source, /data-card-generation-provision-target/);
  assert.match(source, /data-release-workbench-action/);
  assert.match(source, /data-release-package-build/);
  assert.match(source, /data-automation-proposal-refresh/);
  assert.match(source, /data-automation-proposal-create/);
  assert.match(source, /data-automation-proposal-review/);
  assert.match(source, /data-automation-proposal-publish/);
  assert.match(source, /automationProposalBlockedReason/);
  assert.match(source, /data-automation-digest-create/);
  assert.match(source, /data-automation-digest-refresh/);
  assert.match(source, /data-automation-digest-review/);
  assert.match(source, /data-automation-failure-policy-refresh/);
  assert.match(source, /data-automation-failure-policy-create/);
  assert.match(source, /data-automation-failure-policy-review/);
  assert.match(source, /data-automation-action-handoff-refresh/);
  assert.match(source, /data-automation-action-handoff-create/);
  assert.match(source, /data-automation-action-handoff-deliver/);
  assert.match(source, /data-recommendation-lifecycle-review/);
  assert.match(source, /function createOwnerCorrectionPayload/);
  assert.match(source, /function createOwnerAuditReviewQueryPayload/);
  assert.match(source, /function createOwnerAuditReviewPayload/);
  assert.match(source, /function refreshOwnerAuditReviews/);
  assert.match(source, /function recordOwnerAuditReviewFromUi/);
  assert.match(source, /function submitOwnerCorrectionFromUi/);
  assert.match(source, /function createReleaseWorkbenchActionPayloadFromButton/);
  assert.match(source, /function createReleasePackageBuildPayloadFromButton/);
  assert.match(source, /function buildReleasePackageFromUi/);
  assert.match(source, /function recordReleaseWorkbenchActionFromUi/);
  assert.match(source, /function createAutomationProposalCreatePayload/);
  assert.match(source, /function createAutomationProposalFromUi/);
  assert.match(source, /function createAutomationProposalDecisionPayload/);
  assert.match(source, /function reviewAutomationProposalFromUi/);
  assert.match(source, /function createAutomationProposalPublishPayload/);
  assert.match(source, /function publishAutomationProposalFromUi/);
  assert.match(source, /function refreshAutomationProposalReviewStack/);
  assert.match(source, /function refreshAutomationDigests/);
  assert.match(source, /function createAutomationDigestCreatePayload/);
  assert.match(source, /function createAutomationDigestFromUi/);
  assert.match(source, /api\.createGrowthAutomationDigest\(payload, targetWorkspaceId\)/);
  assert.match(source, /function createAutomationDigestReviewPayload/);
  assert.match(source, /function reviewAutomationDigestFromUi/);
  assert.match(source, /function refreshAutomationFailurePolicies/);
  assert.match(source, /function createAutomationFailurePolicyCreatePayload/);
  assert.match(source, /function createAutomationFailurePolicyReviewPayload/);
  assert.match(source, /function createAutomationFailurePolicyFromUi/);
  assert.match(source, /function reviewAutomationFailurePolicyFromUi/);
  assert.match(source, /function refreshAutomationActionHandoffs/);
  assert.match(source, /function createAutomationActionHandoffPayload/);
  assert.match(source, /function createAutomationActionHandoffDeliverPayload/);
  assert.match(source, /function createAutomationActionHandoffFromUi/);
  assert.match(source, /function deliverAutomationActionHandoffFromUi/);
  assert.match(source, /function refreshAutomationSchedulerExecutions/);
  assert.match(source, /function createAutomationSchedulerExecutionPayload/);
  assert.match(source, /function executeAutomationSchedulerOnceFromUi/);
  assert.match(source, /function refreshAutomationSchedulerRuns/);
  assert.match(source, /function createAutomationSchedulerRunPayload/);
  assert.match(source, /function runAutomationSchedulerOnceFromUi/);
  assert.match(source, /function refreshAutomationSchedulerWorkerTargets/);
  assert.match(source, /function createAutomationSchedulerWorkerTargetPayload/);
  assert.match(source, /function createAutomationSchedulerWorkerTargetReviewPayload/);
  assert.match(source, /function createAutomationSchedulerWorkerTargetFromUi/);
  assert.match(source, /function reviewAutomationSchedulerWorkerTargetFromUi/);
  assert.match(source, /function createRecommendationLifecycleDecisionPayload/);
  assert.match(source, /function reviewRecommendationLifecycleFromUi/);
  assert.match(source, /function createCycleAuditQueryPayload/);
  assert.match(source, /function refreshOwnerCycleDrilldownFromUi/);
  assert.match(source, /function createTargetProvisionPayload/);
  assert.match(source, /function provisionTargetDomainPackFromUi/);
  assert.match(source, /api\.submitGrowthProfileCorrection\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthOwnerAuditReviews\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.recordGrowthOwnerAuditReview\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.recordGrowthReleaseWorkbenchAction\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.buildGrowthReleasePackage\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthReleaseArtifactTemplate\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /api\.reviewGrowthAutomationProposal\(proposalId, payload, targetWorkspaceId\)/);
  assert.match(source, /api\.createGrowthAutomationProposal\(payload, targetWorkspaceId\)[\s\S]*await refreshAutomationProposalReviewStack\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /api\.reviewGrowthAutomationProposal\(proposalId, payload, targetWorkspaceId\)[\s\S]*await refreshAutomationProposalReviewStack\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /await refreshAutomationProposalReviewStack\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /api\.publishGrowthAutomationProposal\(proposalId, payload, targetWorkspaceId\)/);
  assert.match(source, /api\.publishGrowthAutomationProposal\(proposalId, payload, targetWorkspaceId\)[\s\S]*await refreshAutomationProposalReviewStack\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /api\.fetchGrowthAutomationDigests\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.reviewGrowthAutomationDigest\(digestId, payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationFailurePolicies\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationFailurePolicyReadiness\(readinessPayload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.createGrowthAutomationFailurePolicy\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.reviewGrowthAutomationFailurePolicy\(policyId, payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationActionHandoffs\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.createGrowthAutomationActionHandoff\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.deliverGrowthAutomationActionHandoff\(handoffId, payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationSchedulerExecutions\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.executeGrowthAutomationSchedulerOnce\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationSchedulerRuns\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.runGrowthAutomationSchedulerOnce\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthAutomationSchedulerWorkerTargets\(payload, requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.createGrowthAutomationSchedulerWorkerTarget\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.reviewGrowthAutomationSchedulerWorkerTarget\(targetId, payload, targetWorkspaceId\)/);
  assert.match(source, /await refreshAutomationDigests\(requestedTargetWorkspaceId, context, \{ silent: true \}\);[\s\S]*await refreshAutomationFailurePolicies\(requestedTargetWorkspaceId, context, \{ silent: true \}\);[\s\S]*await refreshAutomationActionHandoffs\(requestedTargetWorkspaceId, context, \{ silent: true \}\);/);
  assert.match(source, /await refreshAutomationDigests\(targetWorkspaceId, context, \{ silent: true \}\);[\s\S]*await refreshAutomationFailurePolicies\(targetWorkspaceId, context, \{ silent: true \}\);[\s\S]*await refreshAutomationActionHandoffs\(targetWorkspaceId, context, \{ silent: true \}\);/);
  assert.match(source, /api\.createGrowthAutomationFailurePolicy\(payload, targetWorkspaceId\)[\s\S]*await refreshAutomationFailurePolicies\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)[\s\S]*await refreshAutomationActionHandoffs\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /api\.reviewGrowthAutomationFailurePolicy\(policyId, payload, targetWorkspaceId\)[\s\S]*await refreshAutomationFailurePolicies\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)[\s\S]*await refreshAutomationActionHandoffs\(targetWorkspaceId, pageState\.cardGeneration\.context, \{ silent: true \}\)/);
  assert.match(source, /api\.reviewGrowthRecommendationLifecycle\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.provisionGrowthDomainPack\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthCycleAudit\(payload, targetWorkspaceId\)/);
  assert.match(source, /api\.fetchGrowthCycleCompleteness\(payload, targetWorkspaceId\)/);
  assert.match(source, /await refreshCardGenerationContextAfterPublish\(targetWorkspaceId\);[\s\S]*await refreshOwnerCycleDrilldownFromUi\(\{ silent: true \}\);[\s\S]*renderShell\(\);/);
  assert.match(source, /pageState\.cardGeneration\.ownerCorrectionDraft = "";\s*[\s\S]*pageState\.cardGeneration\.ownerCorrection = \{\s*status: "submitted"/);
  assert.match(source, /api\.submitGrowthProfileCorrection\(payload, targetWorkspaceId\);[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId, \{ errorPrefix: "纠偏已保存，但" \}\);[\s\S]*renderShell\(\);/);
  assert.match(source, /api\.reviewGrowthRecommendationLifecycle\(payload, targetWorkspaceId\);[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId, \{ errorPrefix: "推荐状态已记录，但" \}\);[\s\S]*renderShell\(\);/);
  assert.doesNotMatch(source, /api\.generateGrowthCard/);
  assert.doesNotMatch(source, /await loadCardGenerationContext\(targetWorkspaceId\)/);
});
