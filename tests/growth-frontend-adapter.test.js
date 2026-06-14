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

  await client.fetchCardGenerationContext("weixin_fanfan");
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

  assert.equal(calls[0].path, "/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan");
  assert.equal(calls[1].path, "/api/v1/growth/cards/generate");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_english_main_idea"
  });
  assert.equal(calls[2].path, "/api/v1/growth/cards/ltask_daily_1?workspaceId=weixin_fanfan");
  assert.equal(calls[3].path, "/api/v1/growth/cards/ltask_daily_1/submissions");
  assert.deepEqual(JSON.parse(calls[3].options.body), {
    workspace_id: "weixin_fanfan",
    text: "I found the main idea.",
    audio: { dataBase64: "YXVkaW8=", name: "answer.webm", mime: "audio/webm" }
  });
  assert.equal(calls[4].path, "/api/v1/growth/cards/ltask_daily_1/reflections");
  assert.equal(calls[5].path, "/api/v1/growth/cards/ltask_daily_1/experience-signals");
  assert.deepEqual(JSON.parse(calls[5].options.body), {
    workspace_id: "weixin_fanfan",
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"]
  });
  assert.equal(calls[6].path, "/api/v1/growth/stage-assessments/eligibility");
  assert.deepEqual(JSON.parse(calls[6].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"]
  });
  assert.equal(calls[7].path, "/api/v1/growth/stage-assessments/activate");
  assert.deepEqual(JSON.parse(calls[7].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"],
    activation_source: "owner_manual"
  });
  assert.equal(calls[8].path, "/api/v1/growth/evaluations/process");
  assert.deepEqual(JSON.parse(calls[8].options.body), { workspace_id: "weixin_fanfan", limit: 3 });
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

  await client.fetchCardGenerationContext("weixin_stephen");
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_stephen");
  const audioUrl = client.resolveGrowthApiPath("/api/v1/growth/audio/submissions/submission_1", "weixin_stephen");

  assert.equal(calls[0].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/card-generation/context?targetWorkspaceId=weixin_stephen");
  assert.equal(calls[1].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/cards/generate");
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

test("Growth card generation UI renders Owner panel and structured payload", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
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
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea"],
      title: "Find the main idea",
      domain: "english",
      cardRole: "practice",
      difficultyBand: "foundation",
      evidenceRequirements: ["short_answer"]
    },
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
    completionPolicy: { mode: "daily_score_once" },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4, evaluationCount: 4, reflectionCount: 1 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context } },
    viewTargets: [
      { workspaceId: "weixin_fanfan", label: "凡凡" },
      { workspaceId: "weixin_stephen", label: "Stephen" }
    ],
    workspaceId: "weixin_fanfan"
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /日常英语卡/);
  assert.match(html, /data-card-generation-submit/);
  assert.match(html, /data-card-generation-profile/);
  assert.match(html, /学习画像/);
  assert.match(html, /data-stage-assessment-panel/);
  assert.match(html, /阶段测评/);
  assert.match(html, /data-stage-assessment-check/);
  assert.match(html, /data-stage-assessment-activate/);
  assert.match(html, /Needs exact text evidence/);
  assert.match(html, /Use one more short evidence-answering card/);
  assert.match(html, /weixin_stephen · 稍后开放/);
  assert.match(html, /daily_score_once/);
  assert.match(html, /mastery_trajectory_projection/);

  const payload = windowRef.HermesGrowthCardGenerationUi.createDailyEnglishGeneratePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(payload.workspace_id, "weixin_fanfan");
  assert.equal(payload.target_node_id, "kg_english_main_idea");
  assert.equal(payload.card_role, "practice");
  assert.equal(payload.completion_policy.mode, "daily_score_once");

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
        ltask_daily_1: { guidedPracticeText: "The repeated idea is water saving.", quickCheckText: "The paragraph is about saving water." }
      },
      learningGrowthRecordings: {
        "ltask_daily_1:submission": { status: "ready", url: "blob:submission", durationMs: 4200 }
      }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /data-learning-growth-daily-flow/);
  assert.match(html, /data-learning-growth-flow-step="learn"/);
  assert.match(html, /data-learning-growth-flow-step="learn"><b>学习<\/b><small>学习中<\/small>/);
  assert.match(html, /data-learning-growth-flow-step="submit"><b>作答<\/b><small>待提交<\/small>/);
  assert.match(html, /学习流程/);
  assert.match(html, /提交一次/);
  assert.match(html, /Find the main idea in one paragraph/);
  assert.match(html, /paragraph/);
  assert.match(html, /A main idea tells what the paragraph is mostly about/);
  assert.match(html, /Underline the sentence/);
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
  assert.doesNotMatch(html, />提交作答<\/button>/);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
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
  assert.match(html, /可选反思一次/);
  assert.match(html, /data-learning-growth-reflection-form="ltask_daily_1"/);
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
      gatewayConfigured: true
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
        status: "generating",
        context,
        progressStep: "validation",
        progressMessage: "正在校验 teachingFlow、图谱绑定和隐私边界。"
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /data-card-generation-progress/);
  assert.match(html, /role="status"/);
  assert.match(html, /正在生成卡片/);
  assert.match(html, /data-progress-step="validation" data-progress-state="active"/);
  assert.match(html, /正在校验 teachingFlow、图谱绑定和隐私边界。/);
  assert.match(html, />正在生成<\/button>/);
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

  const submitTag = html.match(/<button[^>]+data-card-generation-submit[^>]*>/)?.[0] || "";
  assert.doesNotMatch(submitTag, /data-card-generation-blocked-reason=/);
  assert.doesNotMatch(submitTag, /aria-disabled="true"/);
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

  const submitTag = html.match(/<button[^>]+data-card-generation-submit[^>]*>/)?.[0] || "";
  assert.match(submitTag, /data-card-generation-blocked-reason="请先在左侧选择凡凡，再生成卡片。"/);
  assert.match(submitTag, /aria-disabled="true"/);
  assert.doesNotMatch(submitTag, /\sdisabled(=|\s|>)/);
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
  const staticVersion = "20260614-stage-assessment-ui-v1";
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
  assert.doesNotMatch(html, /20260614-growth-navigation-v1/);
});
