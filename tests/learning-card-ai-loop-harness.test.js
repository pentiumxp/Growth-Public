const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createServer } = require("../src/app/http-server");
const { createGrowthEvaluationService } = require("../src/services/growth-evaluation-service");
const { createGrowthGatewayAuthoringClient } = require("../src/services/growth-gateway-authoring-client");
const { createGrowthGatewayEvaluationClient } = require("../src/services/growth-gateway-evaluation-client");
const { createLearningCardAuthoringService } = require("../src/services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../src/services/learning-card-authoring-validation-service");
const { createLearningCardEvaluationService } = require("../src/services/learning-card-evaluation-service");
const { createLearningCardGenerationRecipePolicyService } = require("../src/services/learning-card-generation-recipe-policy-service");
const { createLearningCardGenerationService } = require("../src/services/learning-card-generation-service");
const { createLearningCardNextTargetService } = require("../src/services/learning-card-next-target-service");
const { createLearningCardRecommendationService } = require("../src/services/learning-card-recommendation-service");
const { createLearningCardTrajectoryService } = require("../src/services/learning-card-trajectory-service");
const { createLearningGraphPlanService } = require("../src/services/learning-graph-plan-service");
const { createLearningMasteryProfileService } = require("../src/services/learning-mastery-profile-service");
const { createLearningNextCardStrategyService } = require("../src/services/learning-next-card-strategy-service");
const { createLearningProfileProjectionService } = require("../src/services/learning-profile-projection-service");
const { createLearningStageAssessmentService } = require("../src/services/learning-stage-assessment-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const WORKSPACE_ID = "weixin_fanfan";
const PROGRAM_ID = "program_english";
const TARGET_NODE_ID = "kg_english_evidence_answering";
const RAW_MARKER = "RAW_FANFAN_ANSWER_MUST_NOT_LEAVE_SQLITE";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "growth-ai-card-loop-"));
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function graphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_ai_loop_harness",
    version: "2026-06-14-test",
    privacyClass: "summary_only",
    sourceDocuments: [{
      sourceRef: "public:english-evidence",
      title: "English evidence-answering summary",
      localPath: ""
    }],
    domainPacks: [{
      domainPackId: "domain_pack_ai_loop_english",
      domain: "english",
      title: "AI loop English test pack",
      sourceKind: "owner_manual",
      version: "2026-06-14-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
      {
        nodeId: TARGET_NODE_ID,
        domain: "english",
        nodeType: "skill",
        title: "Use exact text evidence",
        stage: "year_6_to_7",
        subject: "english",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:english-evidence",
        version: "2026-06-14-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Answer with a claim and one exact piece of text evidence."],
        evidenceRequired: ["claim", "exact_quote", "because_reasoning"]
      },
      {
        nodeId: "kg_english_claim_reason",
        domain: "english",
        nodeType: "skill",
        title: "Connect claim and reason",
        stage: "year_6_to_7",
        subject: "english",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:english-evidence",
        version: "2026-06-14-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Use because to connect a claim and reason."],
        evidenceRequired: ["claim", "because_reasoning"]
      }
    ],
    edges: [{
      edgeId: "edge_claim_reason_to_evidence",
      fromNodeId: "kg_english_claim_reason",
      toNodeId: TARGET_NODE_ID,
      edgeType: "prerequisite",
      confidence: "medium",
      rationale: "A clear claim and reason supports exact evidence use.",
      sourceRef: "public:english-evidence"
    }]
  };
}

function createAiLoopTables(db) {
  db.exec(`
    CREATE TABLE learning_programs (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      focus_areas_json TEXT NOT NULL DEFAULT '[]',
      goal_summary TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      days_per_week INTEGER NOT NULL DEFAULT 0,
      minutes_per_day INTEGER NOT NULL DEFAULT 0,
      intensity TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      source_basis_refs_json TEXT NOT NULL DEFAULT '[]',
      curriculum_refs_json TEXT NOT NULL DEFAULT '[]',
      constraints_json TEXT NOT NULL DEFAULT '{}',
      review_policy_json TEXT NOT NULL DEFAULT '{}',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      archived_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_plan_drafts (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      week_start TEXT NOT NULL DEFAULT '',
      week_end TEXT NOT NULL DEFAULT '',
      daily_plans_json TEXT NOT NULL DEFAULT '[]',
      task_count INTEGER NOT NULL DEFAULT 0,
      reliability_json TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      published_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_task_cards (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL DEFAULT '',
      draft_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      kanban_card_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      task_card_type TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      planned_date TEXT NOT NULL DEFAULT '',
      planned_minutes INTEGER NOT NULL DEFAULT 0,
      skill_ids_json TEXT NOT NULL DEFAULT '[]',
      template_id TEXT NOT NULL DEFAULT '',
      interaction_state_machine_json TEXT NOT NULL DEFAULT '[]',
      source_basis_refs_json TEXT NOT NULL DEFAULT '[]',
      curriculum_refs_json TEXT NOT NULL DEFAULT '[]',
      privacy_level TEXT NOT NULL DEFAULT '',
      reliability_json TEXT,
      card_role TEXT NOT NULL DEFAULT '',
      completion_policy_json TEXT NOT NULL DEFAULT '{}',
      mastery_evidence_weight REAL NOT NULL DEFAULT 1,
      capability_cluster_id TEXT NOT NULL DEFAULT '',
      expected_duration_minutes_min INTEGER NOT NULL DEFAULT 10,
      expected_duration_minutes_max INTEGER NOT NULL DEFAULT 15,
      stage_assessment_cycle_id TEXT NOT NULL DEFAULT '',
      activation_state TEXT NOT NULL DEFAULT '',
      activation_reason TEXT NOT NULL DEFAULT '',
      activation_source TEXT NOT NULL DEFAULT '',
      cooldown_until TEXT NOT NULL DEFAULT '',
      reward_cap_coins INTEGER NOT NULL DEFAULT 100,
      configured_reward_coins INTEGER NOT NULL DEFAULT 100,
      default_reward_coins INTEGER NOT NULL DEFAULT 100,
      teaching_flow_json TEXT,
      experience_summary_json TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_interaction_sessions (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      current_step TEXT NOT NULL DEFAULT '',
      step_history_json TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_task_submissions (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT '',
      submission_kind TEXT NOT NULL DEFAULT '',
      attempt_no INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      text_digest TEXT NOT NULL DEFAULT '',
      text_chars INTEGER NOT NULL DEFAULT 0,
      text_words INTEGER NOT NULL DEFAULT 0,
      kanban_card_id TEXT NOT NULL DEFAULT '',
      kanban_comment_ref TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}',
      submitted_at TEXT NOT NULL DEFAULT '',
      withdrawn_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_evaluations (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      skill_results_json TEXT NOT NULL DEFAULT '[]',
      reward_policy_json TEXT NOT NULL DEFAULT '{}',
      source_basis_refs_json TEXT NOT NULL DEFAULT '[]',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_growth_evaluation_jobs (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL DEFAULT '',
      task_card_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      lease_owner TEXT NOT NULL DEFAULT '',
      lease_until TEXT NOT NULL DEFAULT '',
      last_error TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}',
      available_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_reward_settlements (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      task_card_id TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      evaluation_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      coin_amount INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      idempotency_key TEXT NOT NULL DEFAULT '',
      review_request_id TEXT NOT NULL DEFAULT '',
      ledger_entry_json TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      settled_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_task_reflections (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      audio_digest TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_task_artifacts (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_task_audio_blobs (
      id TEXT PRIMARY KEY,
      record_type TEXT NOT NULL DEFAULT '',
      record_id TEXT NOT NULL DEFAULT '',
      task_card_id TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      mime TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      digest TEXT NOT NULL DEFAULT '',
      content_blob BLOB,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_growth_mastery_states (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      status TEXT NOT NULL,
      mastery_level TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_growth_experience_signals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      node_id TEXT NOT NULL DEFAULT '',
      signal_type TEXT NOT NULL,
      strength TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_growth_card_trajectories (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      task_card_id TEXT NOT NULL,
      source_evaluation_id TEXT NOT NULL DEFAULT '',
      strategy TEXT NOT NULL DEFAULT '',
      difficulty_band TEXT NOT NULL DEFAULT '',
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      performance_summary TEXT NOT NULL DEFAULT '',
      confirmed_strengths_json TEXT NOT NULL DEFAULT '[]',
      remaining_weaknesses_json TEXT NOT NULL DEFAULT '[]',
      mastery_changes_json TEXT NOT NULL DEFAULT '[]',
      next_recommendation_json TEXT NOT NULL DEFAULT '{}',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE learning_growth_stage_assessment_cycles (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT '',
      learner_workspace_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      subject_id TEXT NOT NULL DEFAULT '',
      capability_cluster_id TEXT NOT NULL DEFAULT '',
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      activation_reason TEXT NOT NULL DEFAULT '',
      activation_source TEXT NOT NULL DEFAULT '',
      eligible_at TEXT NOT NULL DEFAULT '',
      activated_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      cooldown_until TEXT NOT NULL DEFAULT '',
      source_card_ids_json TEXT NOT NULL DEFAULT '[]',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function seedSummaryHistory(db) {
  db.prepare(`
    INSERT INTO learning_programs(
      id, learner_id, workspace_id, title, domain, focus_areas_json,
      goal_summary, start_date, end_date, days_per_week, minutes_per_day,
      intensity, status, source_basis_refs_json, curriculum_refs_json,
      constraints_json, review_policy_json, raw_json, created_at, updated_at
    ) VALUES (
      ?, ?, ?, 'Fanfan English evidence loop', 'english', ?,
      'Build low-pressure evidence-answering habits.', '2026-06-14',
      '2026-06-21', 5, 12, 'normal', 'active', '[]', '[]', '{}', '{}',
      '{}', '2026-06-14T00:00:00.000Z', '2026-06-14T00:00:00.000Z'
    )
  `).run(PROGRAM_ID, WORKSPACE_ID, WORKSPACE_ID, JSON.stringify([TARGET_NODE_ID]));
  db.prepare(`
    INSERT INTO learning_plan_drafts(
      id, program_id, learner_id, workspace_id, status, week_start, week_end,
      daily_plans_json, task_count, reliability_json, raw_json, created_at,
      updated_at, published_at
    ) VALUES (
      'draft_history', ?, ?, ?, 'published', '2026-06-14', '2026-06-21',
      '[]', 1, '{}', '{}', '2026-06-14T00:00:00.000Z',
      '2026-06-14T00:00:00.000Z', '2026-06-14T00:00:00.000Z'
    )
  `).run(PROGRAM_ID, WORKSPACE_ID, WORKSPACE_ID);
  db.prepare(`
    INSERT INTO learning_task_cards(
      id, program_id, draft_id, learner_id, workspace_id, title, domain,
      task_card_type, status, planned_date, planned_minutes, skill_ids_json,
      template_id, interaction_state_machine_json, source_basis_refs_json,
      curriculum_refs_json, privacy_level, card_role, capability_cluster_id,
      raw_json, created_at, updated_at
    ) VALUES (
      'card_history_raw_marker', ?, 'draft_history', ?, ?,
      'Earlier evidence practice', 'english', 'practice', 'completed',
      '2026-06-14', 12, ?, 'template_history', '[]', '[]', '[]',
      'member_self', 'practice', 'english.evidence', ?,
      '2026-06-14T00:00:00.000Z', '2026-06-14T00:10:00.000Z'
    )
  `).run(
    PROGRAM_ID,
    WORKSPACE_ID,
    WORKSPACE_ID,
    JSON.stringify([TARGET_NODE_ID]),
    JSON.stringify({
      learningGraph: { targetNodeIds: [TARGET_NODE_ID] },
      instructionPreview: "Previous summary only"
    })
  );
  db.prepare(`
    INSERT INTO learning_task_submissions(
      id, task_card_id, program_id, learner_id, workspace_id, submission_kind,
      status, summary, raw_json, submitted_at, created_at, updated_at
    ) VALUES (
      'submission_history_raw_marker', 'card_history_raw_marker', ?, ?, ?,
      'text', 'submitted', 'Historical learner answer exists only in SQLite.',
      ?, '2026-06-14T00:05:00.000Z', '2026-06-14T00:05:00.000Z',
      '2026-06-14T00:05:00.000Z'
    )
  `).run(PROGRAM_ID, WORKSPACE_ID, WORKSPACE_ID, JSON.stringify({ text: RAW_MARKER }));
  db.prepare(`
    INSERT INTO learning_evaluations(
      id, task_card_id, program_id, learner_id, workspace_id, status, score,
      passed, confidence, summary, raw_json, created_at
    ) VALUES (
      'eval_history_summary', 'card_history_raw_marker', ?, ?, ?,
      'completed', 74, 1, 0.7, 'Understands basic claim and reason.',
      ?, '2026-06-14T00:08:00.000Z'
    )
  `).run(
    PROGRAM_ID,
    WORKSPACE_ID,
    WORKSPACE_ID,
    JSON.stringify({
      remainingWeaknesses: ["Needs more exact quotation."]
    })
  );
  db.prepare(`
    INSERT INTO learning_growth_mastery_states(
      id, workspace_id, learner_id, program_id, node_id, status,
      mastery_level, score, confidence, evidence_count, summary, updated_at,
      raw_json
    ) VALUES (
      'mastery_fanfan_evidence', ?, ?, ?, ?, 'developing', 'foundation',
      72, 0.7, 2, 'Can explain a reason; exact evidence is still developing.',
      '2026-06-14T00:09:00.000Z', '{}'
    )
  `).run(WORKSPACE_ID, WORKSPACE_ID, PROGRAM_ID, TARGET_NODE_ID);
}

function validDraftForRequest(request = {}, titleSuffix = "") {
  const targetNodeId = request.learningGraphPlan?.targetNodeId || TARGET_NODE_ID;
  const role = request.cardRole || request.learningGraphPlan?.cardSequence?.[0]?.cardRole || "practice";
  return {
    schemaVersion: request.cardSchemaVersion || "growth.card.authoring.v1",
    cardRole: role,
    title: role === "stage_assessment" ? `Evidence checkpoint${titleSuffix}` : `Evidence practice${titleSuffix}`,
    targetNodeIds: [targetNodeId],
    assessmentCoverageNodeIds: request.learningGraphPlan?.assessmentCoverage || [targetNodeId],
    expectedTimeMinutes: role === "stage_assessment" ? 25 : 12,
    difficultyBasis: "Use summary-only profile and graph context.",
    supportLevel: role === "stage_assessment" ? "independent" : request.nextCardStrategy?.supportLevel || "guided",
    teachingFlow: {
      learningTarget: "Answer with a claim and one exact piece of evidence.",
      prerequisites: [{ id: "kg_english_claim_reason", label: "Claim and reason", evidence: "summary_only" }],
      microLesson: { instruction: "A strong answer names the idea and points to the words that prove it." },
      workedExample: {
        instruction: "Claim: the character is worried. Evidence: 'his hands shook'.",
        steps: [{ label: "Connect", text: "Use because to connect the claim and evidence." }]
      },
      guidedPractice: {
        mode: "short_answer",
        instruction: "Write one claim and copy a short phrase that proves it."
      },
      quickCheck: {
        mode: "short_answer",
        instruction: "Which words in the text prove your claim?"
      },
      tooHardFallback: {
        action: "show_sentence_frame",
        reason: "Use: I think __ because the text says '__'."
      }
    },
    evidenceToRecord: ["claim", "exact_quote", "because_reasoning"]
  };
}

function validEvaluationDraftForRequest(request = {}) {
  const targetNodeId = request.card?.targetNodeIds?.[0] || TARGET_NODE_ID;
  const formal = request.policy?.completionPolicy === "formal_assessment" || request.card?.cardRole === "stage_assessment";
  return {
    schemaVersion: "growth.card.evaluation.v1",
    evaluationId: "eval_ai_loop_1",
    status: "completed",
    score: formal ? 90 : 48,
    maxScore: 100,
    passed: formal,
    confidence: formal ? 0.9 : 0.82,
    summary: formal
      ? "The formal checkpoint confirms independent evidence use."
      : "The answer has a reason, but it does not quote exact evidence.",
    feedbackSections: {
      strengths: formal ? ["The exact evidence was selected independently."] : ["A claim and reason were present."],
      focusAreas: formal ? [] : ["Copy the exact words from the text."],
      reflectionPrompts: ["Optional: which words would you quote next time?"],
      nextPractice: "Use the score to shape the next low-pressure daily card."
    },
    remainingWeaknesses: formal ? [] : ["Quote the exact words that prove the claim."],
    skillResults: [{
      nodeId: targetNodeId,
      score: formal ? 90 : 48,
      confidence: formal ? 0.9 : 0.82,
      status: formal ? "mastered" : "developing",
      evidenceSummary: formal ? "Independent checkpoint evidence is strong." : "Reason is present; exact quote is missing."
    }],
    evidenceRefs: ["growth-ai-loop-harness:evaluation-gateway:v1"],
    reward: {
      eligible: true,
      currency: "growth_coin",
      reason: "daily_score_once_reward_eligible"
    }
  };
}

function createLoopHarness() {
  const root = tempDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  const db = new DatabaseSync(dbPath);
  try {
    createAiLoopTables(db);
    seedSummaryHistory(db);
  } finally {
    db.close();
  }

  const store = createGrowthLearningSqliteStore({ dbPath });
  store.learningGraphRepository.importPack({
    pack: graphPack(),
    validation: { validation: {}, warnings: [] },
    sourceFile: "ai-loop-graph-test.json",
    sourceSha256: "test-sha256"
  });

  const gatewayCalls = [];
  const gatewayClient = createGrowthGatewayAuthoringClient({
    transport(payload) {
      gatewayCalls.push(payload);
      return {
        json: {
          output_text: JSON.stringify(validDraftForRequest(payload.input, ` ${gatewayCalls.length}`))
        }
      };
    }
  });
  const evaluationGatewayCalls = [];
  const evaluationGatewayClient = createGrowthGatewayEvaluationClient({
    transport(payload) {
      evaluationGatewayCalls.push(payload);
      return {
        json: {
          output_text: JSON.stringify(validEvaluationDraftForRequest(payload.input))
        }
      };
    }
  });
  const learningCardEvaluationService = createLearningCardEvaluationService({
    gatewayClient: evaluationGatewayClient
  });
  const authoringService = createLearningCardAuthoringService({
    gatewayClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher: store.learningCardAuthoringPublisherRepository,
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });
  const graphPlanService = createLearningGraphPlanService({
    graphRepository: store.learningGraphRepository
  });
  const nextCardStrategyService = createLearningNextCardStrategyService();
  const profileProjectionService = createLearningProfileProjectionService({
    repository: store.masteryProfileRepository,
    nextCardStrategyService
  });
  const recommendationService = createLearningCardRecommendationService({
    repository: store.masteryProfileRepository,
    profileProjectionService
  });
  const nextTargetService = createLearningCardNextTargetService({
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    recommendationService,
    profileProjectionService,
    nextCardStrategyService
  });
  const generationService = createLearningCardGenerationService({
    graphPlanService,
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    nextTargetService,
    nextCardStrategyService,
    recipePolicyService: createLearningCardGenerationRecipePolicyService(),
    authoringService
  });
  const profileService = createLearningMasteryProfileService({
    repository: store.masteryProfileRepository,
    now: () => new Date("2026-06-14T08:10:00.000Z")
  });
  const trajectoryService = createLearningCardTrajectoryService({
    repository: store.masteryProfileRepository,
    now: () => new Date("2026-06-14T08:11:00.000Z")
  });
  const stageAssessmentService = createLearningStageAssessmentService({
    repository: store.stageAssessmentCycleRepository,
    profileProjectionService,
    cardGenerationService: generationService,
    now: () => new Date("2026-06-14T08:12:00.000Z")
  });
  const evaluationService = createGrowthEvaluationService({
    learningStore: store,
    profileService,
    nextCardStrategyService,
    trajectoryService,
    stageAssessmentService,
    eventService: { emit: async () => ({ ok: true }) },
    evaluator: learningCardEvaluationService.evaluateSubmission,
    now: () => new Date("2026-06-14T08:12:00.000Z")
  });

  return {
    dbPath,
    evaluationGatewayCalls,
    evaluationService,
    gatewayCalls,
    generationService,
    profileProjectionService,
    recommendationService,
    root,
    stageAssessmentService,
    store
  };
}

test("AI card loop generates, evaluates, profiles, recommends, and consumes the next-card recommendation", async () => {
  const harness = createLoopHarness();
  try {
    const firstCard = await harness.generationService.generateCard({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID,
      recipeId: "daily_english_v1",
      generationKey: "ai-loop-initial-card"
    });
    assert.equal(firstCard.ok, true);
    assert.equal(firstCard.learningGraphPlan.targetNodeId, TARGET_NODE_ID);
    assert.equal(firstCard.nextCardStrategy.strategy, "stabilize");
    assert.equal(firstCard.nextCardStrategy.recommendationMode, "profile_strategy");
    assert.equal(firstCard.recommendationAcceptance.skipped, true);
    assert.equal(firstCard.recommendationAcceptance.reason, "selection_is_not_trajectory_recommendation");
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.targetNodeId, TARGET_NODE_ID);
    assert.equal(harness.gatewayCalls[0].input.nextCardStrategy.strategy, "stabilize");
    assert.equal(JSON.stringify(harness.gatewayCalls[0]).includes(RAW_MARKER), false);

    const submitted = harness.store.submitEvidence({
      workspaceId: WORKSPACE_ID,
      taskCardId: firstCard.published.taskCardId,
      text: "I think the character is nervous because the text says his hands shook. I need to quote the exact words more carefully next time.",
      submittedAt: "2026-06-14T08:05:00.000Z"
    });
    assert.equal(submitted.ok, true);
    assert.equal(submitted.evaluation_job.status, "pending");

    const processed = await harness.evaluationService.processEvaluationQueue({
      workspaceId: WORKSPACE_ID,
      limit: 1
    });
    assert.equal(processed.ok, true);
    assert.equal(processed.processed, 1);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].kind, "growth.card_evaluation.evaluate");
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.completionPolicy, "daily_score_once");
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.evaluationAttempts, 1);
    assert.ok(harness.evaluationGatewayCalls[0].input.card.targetNodeIds.includes(TARGET_NODE_ID));
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls[0]).includes(RAW_MARKER), false);

    const pendingRecommendation = harness.recommendationService.recommendNextCard({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID
    });
    assert.equal(pendingRecommendation.ok, true);
    assert.equal(pendingRecommendation.recommendationMode, "trajectory");
    assert.equal(pendingRecommendation.recommendationStatus, "pending");
    assert.equal(pendingRecommendation.strategy, "repair");
    assert.deepEqual(pendingRecommendation.targetNodeIds, [TARGET_NODE_ID]);

    const projectedAfterEvaluation = harness.profileProjectionService.profileContext({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID
    });
    assert.equal(projectedAfterEvaluation.ok, true);
    assert.equal(projectedAfterEvaluation.weaknesses[0].nodeId, TARGET_NODE_ID);
    assert.equal(projectedAfterEvaluation.recentTrajectory[0].nextRecommendation.status, "pending");
    assert.equal(JSON.stringify(projectedAfterEvaluation).includes(RAW_MARKER), false);

    const secondCard = await harness.generationService.generateCard({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID,
      recipeId: "daily_english_v1",
      generationKey: "ai-loop-followup-card"
    });
    assert.equal(secondCard.ok, true);
    assert.equal(secondCard.learningGraphPlan.targetNodeId, TARGET_NODE_ID);
    assert.equal(secondCard.nextCardStrategy.recommendationMode, "trajectory");
    assert.equal(secondCard.recommendationAcceptance.ok, true);
    assert.equal(secondCard.recommendationAcceptance.previousStatus, "pending");
    assert.equal(harness.gatewayCalls[1].input.nextCardStrategy.recommendationMode, "trajectory");
    assert.equal(harness.gatewayCalls[1].input.nextCardStrategy.recommendationStatus, "pending");
    assert.equal(JSON.stringify(harness.gatewayCalls[1]).includes(RAW_MARKER), false);

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const trajectory = db.prepare("SELECT * FROM learning_growth_card_trajectories WHERE source_evaluation_id = ?").get("eval_ai_loop_1");
      assert.ok(trajectory);
      const nextRecommendation = JSON.parse(trajectory.next_recommendation_json);
      assert.equal(nextRecommendation.status, "accepted");
      assert.equal(nextRecommendation.generatedTaskCardId, secondCard.published.taskCardId);
      assert.equal(nextRecommendation.generatedLearningGraphPlanId, secondCard.learningGraphPlan.learningGraphPlanId);
      assert.equal(nextRecommendation.acceptedBy, "growth-learning-card-generation-service");
      assert.equal(JSON.stringify(nextRecommendation).includes(RAW_MARKER), false);
      const evaluation = db.prepare("SELECT * FROM learning_evaluations WHERE id = ?").get("eval_ai_loop_1");
      assert.equal(evaluation.score, 48);
      const settlement = db.prepare("SELECT * FROM learning_reward_settlements WHERE evaluation_id = ?").get("eval_ai_loop_1");
      assert.equal(settlement.coin_amount, 48);
      const completedCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(firstCard.published.taskCardId);
      assert.equal(completedCard.status, "completed");
      assert.equal(JSON.parse(completedCard.raw_json).completionPolicy.mode, "daily_score_once");
    } finally {
      db.close();
    }

    const recommendationAfterConsumption = harness.recommendationService.recommendNextCard({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID
    });
    assert.equal(recommendationAfterConsumption.ok, true);
    assert.equal(recommendationAfterConsumption.recommendationMode, "profile_strategy");
    assert.equal(recommendationAfterConsumption.recommendationId || "", "");

    const projectedAfterConsumption = harness.profileProjectionService.profileContext({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID
    });
    assert.equal(projectedAfterConsumption.recentTrajectory[0].nextRecommendation.status, "accepted");
    assert.equal(JSON.stringify(projectedAfterConsumption).includes(RAW_MARKER), false);
  } finally {
    fs.rmSync(harness.root, { recursive: true, force: true });
  }
});

test("stage assessment loop activates, evaluates with formal weight, and cools the cycle", async () => {
  const harness = createLoopHarness();
  try {
    const activation = await harness.stageAssessmentService.activateStageAssessment({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID,
      subjectId: "english",
      capabilityClusterId: "english.evidence",
      targetNodeId: TARGET_NODE_ID,
      assessmentCoverageNodeIds: [TARGET_NODE_ID, "kg_english_claim_reason"],
      activationSource: "owner_manual",
      generationKey: "ai-loop-stage-assessment"
    });
    assert.equal(activation.ok, true);
    assert.equal(activation.activationState, "active");
    assert.equal(activation.generation.published.card.cardRole, "stage_assessment");

    const submitted = harness.store.submitEvidence({
      workspaceId: WORKSPACE_ID,
      taskCardId: activation.published.taskCardId,
      text: "The strongest evidence is the exact phrase in the text. I explain the claim and quote the words that prove it.",
      submittedAt: "2026-06-14T08:10:00.000Z"
    });
    assert.equal(submitted.ok, true);
    assert.equal(submitted.evaluation_job.status, "pending");

    const processed = await harness.evaluationService.processEvaluationQueue({
      workspaceId: WORKSPACE_ID,
      limit: 1
    });
    assert.equal(processed.ok, true);
    assert.equal(processed.processed, 1);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.completionPolicy, "formal_assessment");
    assert.equal(harness.evaluationGatewayCalls[0].input.card.cardRole, "stage_assessment");

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const stageCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?")
        .get(activation.published.taskCardId);
      assert.equal(stageCard.card_role, "stage_assessment");
      assert.equal(stageCard.mastery_evidence_weight, 1);
      assert.equal(JSON.parse(stageCard.completion_policy_json).mode, "formal_assessment");

      const cycle = db.prepare("SELECT * FROM learning_growth_stage_assessment_cycles WHERE id = ?")
        .get(activation.cycle.cycleId);
      assert.equal(cycle.status, "completed");
      assert.equal(cycle.completed_at, "2026-06-14T08:12:00.000Z");
      assert.equal(cycle.cooldown_until, "2026-06-19T08:12:00.000Z");
      assert.equal(JSON.parse(cycle.raw_json).generatedTaskCardId, activation.published.taskCardId);

      const mastery = db.prepare("SELECT * FROM learning_growth_mastery_states WHERE node_id = ?")
        .get(TARGET_NODE_ID);
      assert.equal(mastery.status, "mastered");
      assert.equal(mastery.evidence_count, 3);
      const raw = JSON.parse(mastery.raw_json);
      assert.equal(raw.lastEvidenceWeight, 1);
      assert.equal(raw.lastEvidenceRole, "formal_assessment");
      assert.equal(raw.formalEvidenceCount, 1);
      assert.equal(raw.summaryOnly, true);
      assert.equal(JSON.stringify(raw).includes(RAW_MARKER), false);
    } finally {
      db.close();
    }

    const eligibilityAfterCompletion = harness.stageAssessmentService.evaluateEligibility({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: PROGRAM_ID,
      subjectId: "english",
      capabilityClusterId: "english.evidence",
      targetNodeId: TARGET_NODE_ID,
      assessmentCoverageNodeIds: [TARGET_NODE_ID, "kg_english_claim_reason"]
    });
    assert.equal(eligibilityAfterCompletion.ok, true);
    assert.equal(eligibilityAfterCompletion.eligible, false);
    assert.equal(eligibilityAfterCompletion.activationState, "cooldown");
  } finally {
    fs.rmSync(harness.root, { recursive: true, force: true });
  }
});

test("AI card loop routes generate, submit, evaluate, and generate from the accepted recommendation", async () => {
  const harness = createLoopHarness();
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== WORKSPACE_ID) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: WORKSPACE_ID };
      },
      viewTargets({ actorRole, currentWorkspaceId }) {
        return {
          ok: true,
          viewer: { role: actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: currentWorkspaceId,
          targets: [{ workspaceId: WORKSPACE_ID, label: "Fanfan", current: true }]
        };
      }
    },
    growthService: {
      async submitEvidence({ workspaceId, taskCardId, body }) {
        return harness.store.submitEvidence(Object.assign({}, body, {
          workspaceId,
          taskCardId
        }));
      }
    },
    growthEvaluationService: harness.evaluationService,
    learningCardGenerationService: harness.generationService
  });
  const baseUrl = await listen(server);
  try {
    const first = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        learner_id: WORKSPACE_ID,
        program_id: PROGRAM_ID,
        recipe_id: "daily_english_v1",
        generation_key: "route-ai-loop-initial-card"
      })
    });
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.ok, true);
    assert.equal(firstBody.learningGraphPlan.targetNodeId, TARGET_NODE_ID);
    assert.equal(firstBody.nextCardStrategy.recommendationMode, "profile_strategy");

    const submitted = await fetch(`${baseUrl}/api/v1/growth/cards/${encodeURIComponent(firstBody.published.taskCardId)}/submissions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        text: "The character seems nervous because the text says his hands shook. I can improve by copying the exact words.",
        submitted_at: "2026-06-14T08:05:00.000Z"
      })
    });
    assert.equal(submitted.status, 202);
    const submittedBody = await submitted.json();
    assert.equal(submittedBody.ok, true);
    assert.equal(submittedBody.evaluation_job.status, "pending");

    const processed = await fetch(`${baseUrl}/api/v1/growth/evaluations/process`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        limit: 1
      })
    });
    assert.equal(processed.status, 200);
    assert.equal((await processed.json()).processed, 1);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].kind, "growth.card_evaluation.evaluate");
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.passScoreRequired, false);
    assert.ok(harness.evaluationGatewayCalls[0].input.card.targetNodeIds.includes(TARGET_NODE_ID));
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls[0]).includes(RAW_MARKER), false);

    const second = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        learner_id: WORKSPACE_ID,
        program_id: PROGRAM_ID,
        recipe_id: "daily_english_v1",
        generation_key: "route-ai-loop-followup-card"
      })
    });
    assert.equal(second.status, 201);
    const secondBody = await second.json();
    assert.equal(secondBody.ok, true);
    assert.equal(secondBody.nextCardStrategy.recommendationMode, "trajectory");
    assert.equal(secondBody.recommendationAcceptance.ok, true);
    assert.equal(secondBody.recommendationAcceptance.previousStatus, "pending");
    assert.equal(JSON.stringify(harness.gatewayCalls).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls).includes(RAW_MARKER), false);

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const trajectory = db.prepare("SELECT next_recommendation_json FROM learning_growth_card_trajectories WHERE source_evaluation_id = ?").get("eval_ai_loop_1");
      const nextRecommendation = JSON.parse(trajectory.next_recommendation_json);
      assert.equal(nextRecommendation.status, "accepted");
      assert.equal(nextRecommendation.generatedTaskCardId, secondBody.published.taskCardId);
    } finally {
      db.close();
    }
  } finally {
    await close(server);
    fs.rmSync(harness.root, { recursive: true, force: true });
  }
});
