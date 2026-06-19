const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createGrowthGatewayAuthoringClient } = require("../src/services/growth-gateway-authoring-client");
const { createLearningCardAuthoringService } = require("../src/services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../src/services/learning-card-authoring-validation-service");
const { createLearningCardGenerationRecipePolicyService } = require("../src/services/learning-card-generation-recipe-policy-service");
const { createLearningCardGenerationService } = require("../src/services/learning-card-generation-service");
const { createLearningCardNextTargetService } = require("../src/services/learning-card-next-target-service");
const { createLearningCardRecommendationService } = require("../src/services/learning-card-recommendation-service");
const { createLearningCardRubricPolicyService } = require("../src/services/learning-card-rubric-policy-service");
const { createLearningGraphPlanService } = require("../src/services/learning-graph-plan-service");
const { createLearningNextCardStrategyService } = require("../src/services/learning-next-card-strategy-service");
const { createLearningProfileProjectionService } = require("../src/services/learning-profile-projection-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "learning-card-generation-"));
}

function graphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_card_generation",
    version: "2026-06-11-test",
    privacyClass: "summary_only",
    sourceDocuments: [{ sourceRef: "public:test", title: "Public test source", localPath: "sources/test.pdf" }],
    domainPacks: [{
      domainPackId: "domain_pack_card_generation",
      domain: "math",
      title: "Card generation test pack",
      sourceKind: "owner_manual",
      version: "2026-06-11-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
      {
        nodeId: "kg_fraction_meaning",
        domain: "math",
        nodeType: "topic",
        title: "Fraction meaning",
        stage: "lower_secondary",
        subject: "mathematics",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Explain a fraction as part of a whole."],
        evidenceRequired: ["explains_part_whole"]
      },
      {
        nodeId: "kg_ratio_intro",
        domain: "math",
        nodeType: "topic",
        title: "Ratio intro",
        stage: "lower_secondary",
        subject: "mathematics",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Compare two quantities using a ratio."],
        evidenceRequired: ["explain_ratio_comparison"],
        masterySignals: ["uses colon notation correctly"],
        experienceSignals: ["confuses ratio order"]
      }
    ],
    edges: [{
      edgeId: "edge_fraction_ratio",
      fromNodeId: "kg_fraction_meaning",
      toNodeId: "kg_ratio_intro",
      edgeType: "prerequisite",
      confidence: "seed",
      sourceRef: "public:test"
    }]
  };
}

function createLearningTables(db) {
  db.exec(`
    CREATE TABLE learning_programs (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      focus_areas_json TEXT NOT NULL,
      goal_summary TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_per_week INTEGER NOT NULL,
      minutes_per_day INTEGER NOT NULL,
      intensity TEXT NOT NULL,
      status TEXT NOT NULL,
      source_basis_refs_json TEXT NOT NULL,
      curriculum_refs_json TEXT NOT NULL,
      constraints_json TEXT NOT NULL,
      review_policy_json TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE learning_plan_drafts (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      status TEXT NOT NULL,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      daily_plans_json TEXT NOT NULL,
      task_count INTEGER NOT NULL,
      reliability_json TEXT,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(program_id) REFERENCES learning_programs(id) ON DELETE CASCADE
    );
    CREATE TABLE learning_task_cards (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      draft_id TEXT NOT NULL,
      learner_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      kanban_card_id TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      domain TEXT NOT NULL,
      task_card_type TEXT NOT NULL,
      status TEXT NOT NULL,
      planned_date TEXT NOT NULL,
      planned_minutes INTEGER NOT NULL,
      skill_ids_json TEXT NOT NULL,
      template_id TEXT NOT NULL,
      interaction_state_machine_json TEXT NOT NULL,
      source_basis_refs_json TEXT NOT NULL,
      curriculum_refs_json TEXT NOT NULL,
      privacy_level TEXT NOT NULL,
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(program_id) REFERENCES learning_programs(id) ON DELETE CASCADE,
      FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
    );
    CREATE TABLE learning_task_submissions (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL,
      status TEXT NOT NULL,
      submission_kind TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      workspace_id TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_evaluations (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL,
      status TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      workspace_id TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_task_reflections (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL,
      status TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      audio_digest TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      workspace_id TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE learning_task_artifacts (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL DEFAULT ''
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
      learner_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
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
  `);
}

function seedHistory(db) {
  db.prepare(`
    INSERT INTO learning_programs(
      id, learner_id, workspace_id, title, domain, focus_areas_json, goal_summary,
      start_date, end_date, days_per_week, minutes_per_day, intensity, status,
      source_basis_refs_json, curriculum_refs_json, constraints_json,
      review_policy_json, raw_json, created_at, updated_at
    ) VALUES (
      'program_1', 'weixin_child', 'weixin_child', 'Ratio program', 'math',
      '["kg_ratio_intro"]', 'Practice ratio comparison.', '2026-06-10',
      '2026-06-17', 5, 12, 'normal', 'active', '[]', '[]', '{}', '{}',
      '{}', '2026-06-10T00:00:00.000Z', '2026-06-10T00:00:00.000Z'
    )
  `).run();
  db.prepare(`
    INSERT INTO learning_plan_drafts(
      id, program_id, learner_id, workspace_id, status, week_start, week_end,
      daily_plans_json, task_count, reliability_json, raw_json, created_at,
      updated_at, published_at
    ) VALUES (
      'draft_1', 'program_1', 'weixin_child', 'weixin_child', 'published',
      '2026-06-10', '2026-06-17', '[]', 1, '{}', '{}',
      '2026-06-10T00:00:00.000Z', '2026-06-10T00:00:00.000Z',
      '2026-06-10T00:00:00.000Z'
    )
  `).run();
  db.prepare(`
    INSERT INTO learning_task_cards(
      id, program_id, draft_id, learner_id, workspace_id, kanban_card_id, title, domain,
      task_card_type, status, planned_date, planned_minutes, skill_ids_json,
      template_id, interaction_state_machine_json, source_basis_refs_json,
      curriculum_refs_json, privacy_level, card_role, capability_cluster_id,
      raw_json, created_at, updated_at
    ) VALUES ('card_history_1', 'program_1', 'draft_1', 'weixin_child', 'weixin_child', '',
      'Earlier ratio practice', 'math', 'practice', 'completed', '2026-06-10', 12,
      '["kg_ratio_intro"]', 'template_1', '[]', '[]', '[]', 'member_self',
      'practice', 'mathematics', ?, '2026-06-10T00:00:00.000Z', '2026-06-10T00:10:00.000Z')
  `).run(JSON.stringify({
    learningGraph: { learningGraphPlanId: "old_plan", targetNodeIds: ["kg_ratio_intro"] },
    instructionPreview: "Previous summary only"
  }));
  db.prepare(`
    INSERT INTO learning_task_submissions(id, task_card_id, status, submission_kind, submitted_at, created_at, workspace_id, raw_json)
    VALUES ('sub_history_1', 'card_history_1', 'submitted', 'text', '2026-06-10T00:05:00.000Z', '2026-06-10T00:05:00.000Z', 'weixin_child', ?)
  `).run(JSON.stringify({ text: "raw learner answer should never leave sqlite" }));
  db.prepare(`
    INSERT INTO learning_evaluations(id, task_card_id, status, score, passed, summary, created_at, workspace_id, raw_json)
    VALUES ('eval_history_1', 'card_history_1', 'completed', 92, 1, 'Handles ratio comparison well.', '2026-06-10T00:08:00.000Z', 'weixin_child', ?)
  `).run(JSON.stringify({ remainingWeaknesses: ["Needs one more check on ratio order."] }));
  db.prepare(`
    INSERT INTO learning_growth_mastery_states(
      id, workspace_id, learner_id, program_id, node_id, status, mastery_level,
      score, confidence, evidence_count, summary, updated_at, raw_json
    ) VALUES ('mastery_ratio', 'weixin_child', 'weixin_child', 'program_1',
      'kg_ratio_intro', 'developing', 'foundation', 0.62, 0.7, 3,
      'Ready for a guided ratio card.', '2026-06-10T00:12:00.000Z', '{}')
  `).run();
  db.prepare(`
    INSERT INTO learning_growth_experience_signals(
      id, workspace_id, learner_id, program_id, node_id, signal_type, strength,
      summary, source_type, created_at, raw_json
    ) VALUES ('signal_ratio', 'weixin_child', 'weixin_child', 'program_1',
      'kg_ratio_intro', 'right_level', 'medium', 'Recent ratio practice was productive.',
      'evaluation', '2026-06-10T00:11:00.000Z', '{}')
  `).run();
}

function validDraft(overrides = {}) {
  return Object.assign({
    cardRole: "teaching",
    title: "Ratio intro: compare two quantities",
    targetNodeIds: ["kg_ratio_intro"],
    expectedTimeMinutes: 12,
    difficultyBasis: "History shows foundation mastery with one ratio-order weakness.",
    supportLevel: "guided",
    teachingFlow: {
      learningTarget: "Compare two quantities using a ratio.",
      prerequisites: [{ id: "kg_fraction_meaning", label: "Fraction meaning", evidence: "reviewed" }],
      microLesson: { instruction: "A ratio compares one quantity with another quantity." },
      workedExample: {
        instruction: "If there are 2 red counters and 3 blue counters, red to blue is 2:3.",
        steps: [{ label: "Compare", text: "red to blue = 2 to 3" }]
      },
      guidedPractice: { mode: "short_answer", instruction: "Write the ratio of 4 apples to 6 pears." },
      quickCheck: { mode: "short_answer", instruction: "What two quantities does 4:6 compare?" },
      tooHardFallback: { action: "prerequisite_repair", reason: "Review part-whole language first." }
    },
    evidenceToRecord: ["explain_ratio_comparison"]
  }, overrides);
}

function setup(options = {}) {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const db = new DatabaseSync(dbPath);
  try {
    createLearningTables(db);
    seedHistory(db);
  } finally {
    db.close();
  }
  const store = createGrowthLearningSqliteStore({ dbPath });
  store.learningGraphRepository.importPack({
    pack: graphPack(),
    validation: { validation: {}, warnings: [] },
    sourceFile: "graph-test.json",
    sourceSha256: "hash"
  });
  const gatewayCalls = [];
  const gatewayClient = createGrowthGatewayAuthoringClient({
    transport(payload) {
      gatewayCalls.push(payload);
      if (options.gatewayResponse) return options.gatewayResponse(payload);
      return { json: { output_text: JSON.stringify(validDraft()) } };
    }
  });
  const authoringService = createLearningCardAuthoringService({
    gatewayClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher: store.learningCardAuthoringPublisherRepository,
    now: () => new Date("2026-06-11T12:00:00.000Z")
  });
  const planService = createLearningGraphPlanService({
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
  const rubricPolicyService = createLearningCardRubricPolicyService();
  const recipePolicyService = createLearningCardGenerationRecipePolicyService({ rubricPolicyService });
  const nextTargetService = createLearningCardNextTargetService({
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    recommendationService,
    profileProjectionService,
    nextCardStrategyService
  });
  const generationService = createLearningCardGenerationService({
    graphPlanService: planService,
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    nextTargetService,
    nextCardStrategyService,
    recipePolicyService,
    rubricPolicyService,
    targetProvisioningService: options.targetProvisioningService,
    authoringService
  });
  return { dbPath, gatewayCalls, generationService, nextTargetService, planService, store };
}

test("card generation creates a graph plan, summarizes history, and publishes a bound SQLite card", async () => {
  const { dbPath, gatewayCalls, generationService, store } = setup();

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching",
    learnerSummary: {
      schoolYear: "Year 2",
      educationStage: "primary"
    },
    generationKey: "ratio-intro-teaching-v1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.learningGraphPlan.targetNodeId, "kg_ratio_intro");
  assert.equal(result.historySummary.learnerSummary.completedRecentCardCount, 1);
  assert.equal(result.historySummary.masterySummary.masteryStates[0].nodeId, "kg_ratio_intro");
  assert.equal(result.sourceSummaryCount, 2);
  assert.equal(result.published.transaction, "committed");

  const gatewayInput = gatewayCalls[0].input;
  assert.equal(gatewayInput.learningGraphPlan.targetNodeId, "kg_ratio_intro");
  assert.equal(gatewayInput.learnerSummary.evaluationCount, 1);
  assert.equal(gatewayInput.learnerSummary.schoolYear, "Year 2");
  assert.equal(gatewayInput.learnerSummary.educationStage, "primary");
  assert.equal(gatewayInput.masterySummary.masteryStates[0].summary, "Ready for a guided ratio card.");
  assert.ok(gatewayInput.recentExperienceSignals.some((signal) => signal.signalType === "right_level"));
  assert.equal(gatewayInput.nextCardStrategy.strategy, "stabilize");
  assert.equal(gatewayInput.sourceSummaries.some((source) => source.nodeId === "kg_ratio_intro"), true);
  assert.equal(JSON.stringify(gatewayInput).includes("raw learner answer should never leave sqlite"), false);

  const db = new DatabaseSync(dbPath);
  try {
    const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.equal(card.title, "Ratio intro: compare two quantities");
    assert.equal(card.card_role, "teaching");
    assert.equal(card.planned_minutes, 12);
    assert.equal(card.expected_duration_minutes_min, 10);
    assert.equal(card.expected_duration_minutes_max, 15);
    const raw = JSON.parse(card.raw_json);
    assert.equal(raw.expectedTimeMinutes, 12);
    assert.equal(raw.learningGraph.learningGraphPlanId, result.learningGraphPlan.learningGraphPlanId);
    assert.equal(raw.teachingFlow.learningTarget, "Compare two quantities using a ratio.");
    assert.equal(raw.experienceSummary.learnerSummary.completedRecentCardCount, 1);
    assert.equal(raw.experienceSummary.nextCardStrategy.strategy, "stabilize");
    assert.equal(raw.completionPolicy.mode, "daily_score_once");
    assert.equal(raw.completionPolicy.evaluationAttempts, 1);
    assert.equal(raw.completionPolicy.reflectionAttempts, 1);
    assert.equal(raw.completionPolicy.passScoreRequired, false);
    assert.equal(JSON.parse(card.completion_policy_json).mode, "daily_score_once");
    assert.equal(JSON.parse(card.teaching_flow_json).learningTarget, "Compare two quantities using a ratio.");
    assert.equal(JSON.parse(card.experience_summary_json).learnerSummary.completedRecentCardCount, 1);
    const draft = db.prepare("SELECT * FROM learning_plan_drafts WHERE id = ?").get(card.draft_id);
    assert.equal(draft.program_id, "program_1");
    assert.equal(draft.task_count, 1);
    const binding = db.prepare("SELECT * FROM learning_card_graph_bindings WHERE task_card_id = ?").get(result.published.taskCardId);
    assert.equal(binding.learning_graph_plan_id, result.learningGraphPlan.learningGraphPlanId);
    assert.deepEqual(JSON.parse(binding.node_ids_json), ["kg_ratio_intro"]);
  } finally {
    db.close();
  }

  const projected = store.card({ workspaceId: "weixin_child", taskCardId: result.published.taskCardId });
  assert.equal(projected.ok, true);
  assert.equal(projected.card.teachingFlow.learningTarget, "Compare two quantities using a ratio.");
});

test("card generation creates missing program and draft parent rows for FK-backed SQLite", async () => {
  const { dbPath, generationService } = setup();

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_generated_fk",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching",
    generationKey: "ratio-intro-practice-new-program"
  });

  assert.equal(result.ok, true);

  const db = new DatabaseSync(dbPath);
  try {
    const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.equal(card.program_id, "program_generated_fk");
    const program = db.prepare("SELECT * FROM learning_programs WHERE id = ?").get("program_generated_fk");
    assert.equal(program.workspace_id, "weixin_child");
    assert.equal(program.status, "active");
    const draft = db.prepare("SELECT * FROM learning_plan_drafts WHERE id = ?").get(card.draft_id);
    assert.equal(draft.program_id, "program_generated_fk");
    assert.equal(draft.status, "published");
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    db.close();
  }
});

test("card generation can choose the next daily English target when Owner submits only a recipe", async () => {
  const { dbPath, gatewayCalls, generationService } = setup({
    gatewayResponse() {
      return {
        json: {
          output_text: JSON.stringify(validDraft({
            cardRole: "practice",
            title: "Ratio intro practice",
            targetNodeIds: ["kg_ratio_intro"]
          }))
        }
      };
    }
  });

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    recipeId: "daily_english_v1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.recipeId, "daily_english_v1");
  assert.equal(result.learningGraphPlan.targetNodeId, "kg_ratio_intro");
  assert.deepEqual(result.learningGraphPlan.cardSequence[0].targetNodeIds, ["kg_ratio_intro"]);
  assert.equal(result.nextCardStrategy.targetNodeIds[0], "kg_ratio_intro");
  assert.equal(gatewayCalls[0].input.learningGraphPlan.targetNodeId, "kg_ratio_intro");
  assert.equal(gatewayCalls[0].input.cardRole, "practice");
  assert.equal(gatewayCalls[0].input.cardSchemaVersion, "growth.card.authoring.v1");
  assert.equal(gatewayCalls[0].input.nextCardStrategy.strategy, "stabilize");
  assert.equal(gatewayCalls[0].input.rubricPolicy.policyId, "rubric:daily_english_v1");

  const db = new DatabaseSync(dbPath);
  try {
    const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.deepEqual(JSON.parse(card.skill_ids_json), ["kg_ratio_intro"]);
  } finally {
    db.close();
  }
});

test("card generation can use a generic daily practice recipe for a selected subject", async () => {
  const { dbPath, gatewayCalls, generationService } = setup({
    gatewayResponse() {
      return {
        json: {
          output_text: JSON.stringify(validDraft({
            cardRole: "practice",
            title: "Ratio intro daily practice",
            targetNodeIds: ["kg_ratio_intro"]
          }))
        }
      };
    }
  });

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    recipeId: "daily_subject_practice_v1",
    domain: "math",
    subject: "mathematics"
  });

  assert.equal(result.ok, true);
  assert.equal(result.recipeId, "daily_subject_practice_v1");
  assert.equal(result.learningGraphPlan.domain, "math");
  assert.equal(result.learningGraphPlan.subject, "mathematics");
  assert.equal(result.learningGraphPlan.cardSequence[0].cardRole, "practice");
  assert.equal(gatewayCalls[0].input.learningGraphPlan.subject, "mathematics");
  assert.equal(gatewayCalls[0].input.cardRole, "practice");
  assert.deepEqual(gatewayCalls[0].input.evidenceRequirements, ["explain_ratio_comparison"]);
  assert.equal(gatewayCalls[0].input.rubricPolicy.policyId, "rubric:daily_mathematics_v1");
  assert.deepEqual(gatewayCalls[0].input.rubricPolicy.rubricDimensions.map((item) => item.dimensionId), [
    "math_concept_model",
    "math_procedure_accuracy",
    "math_reasoning_explanation",
    "math_precision_check"
  ]);

  const db = new DatabaseSync(dbPath);
  try {
    const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.equal(card.domain, "math");
    const raw = JSON.parse(card.raw_json);
    assert.equal(raw.rubricPolicy.policyId, "rubric:daily_mathematics_v1");
    assert.equal(raw.sequenceGroupId, "program:program_1:subject:mathematics");
    assert.equal(raw.sequenceMode, "subject_parallel_daily");
    assert.deepEqual(JSON.parse(card.skill_ids_json), ["kg_ratio_intro"]);
  } finally {
    db.close();
  }
});

test("card generation can choose the next target from the latest trajectory recommendation", async () => {
  const { dbPath, gatewayCalls, generationService } = setup({
    gatewayResponse() {
      return {
        json: {
          output_text: JSON.stringify(validDraft({
            cardRole: "teaching",
            title: "Fraction repair card",
            targetNodeIds: ["kg_fraction_meaning"]
          }))
        }
      };
    }
  });
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(`
      INSERT INTO learning_growth_card_trajectories(
        id, workspace_id, learner_id, program_id, task_card_id,
        source_evaluation_id, strategy, difficulty_band, target_node_ids_json,
        performance_summary, next_recommendation_json, raw_json, created_at,
        updated_at
      ) VALUES (
        'traj_fraction_repair', 'weixin_child', 'weixin_child', 'program_1',
        'card_history_1', 'eval_history_1', 'repair', 'repair',
        '["kg_fraction_meaning"]', ?, ?, '{}',
        '2026-06-11T08:00:00.000Z', '2026-06-11T08:00:00.000Z'
      )
    `).run(
      "Ratio order is weak because prerequisite part-whole language is unstable.",
      JSON.stringify({
        status: "pending",
        strategy: "repair",
        cardRole: "teaching",
        difficultyBand: "repair",
        supportLevel: "guided",
        targetNodeIds: ["kg_fraction_meaning"],
        reason: "Repair fraction meaning before another ratio card."
      })
    );
  } finally {
    db.close();
  }

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    generationKey: "fraction-repair-from-trajectory"
  });

  assert.equal(result.ok, true);
  assert.equal(result.learningGraphPlan.targetNodeId, "kg_fraction_meaning");
  assert.equal(result.nextCardStrategy.strategy, "repair");
  assert.equal(result.recommendationAcceptance.ok, true);
  assert.equal(gatewayCalls[0].input.learningGraphPlan.targetNodeId, "kg_fraction_meaning");
  assert.equal(gatewayCalls[0].input.nextCardStrategy.strategy, "repair");
  const readDb = new DatabaseSync(dbPath);
  try {
    const card = readDb.prepare("SELECT skill_ids_json FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.deepEqual(JSON.parse(card.skill_ids_json), ["kg_fraction_meaning"]);
    const trajectory = readDb.prepare("SELECT next_recommendation_json FROM learning_growth_card_trajectories WHERE id = 'traj_fraction_repair'").get();
    const nextRecommendation = JSON.parse(trajectory.next_recommendation_json);
    assert.equal(nextRecommendation.status, "accepted");
    assert.equal(nextRecommendation.generatedTaskCardId, result.published.taskCardId);
    assert.equal(nextRecommendation.generatedLearningGraphPlanId, result.learningGraphPlan.learningGraphPlanId);
    assert.equal(nextRecommendation.acceptedBy, "growth-learning-card-generation-service");
  } finally {
    readDb.close();
  }
});

test("stage assessment generation persists activation metadata and formal assessment policy", async () => {
  const { dbPath, gatewayCalls, generationService } = setup({
    gatewayResponse() {
      return {
        json: {
          output_text: JSON.stringify(validDraft({
            cardRole: "stage_assessment",
            title: "Ratio checkpoint",
            targetNodeIds: ["kg_ratio_intro"],
            assessmentCoverageNodeIds: ["kg_ratio_intro"],
            expectedTimeMinutes: 28,
            teachingFlow: null,
            evidenceToRecord: ["explain_ratio_comparison"]
          }))
        }
      };
    }
  });

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    targetNodeId: "kg_ratio_intro",
    assessmentCoverageNodeIds: ["kg_ratio_intro"],
    cardRole: "stage_assessment",
    difficultyBand: "assessment",
    generationKey: "ratio-stage-assessment",
    stageAssessmentCycleId: "cycle_ratio_1",
    activationState: "active",
    activationReason: "owner_manual",
    activationSource: "owner_manual",
    cooldownUntil: "2026-06-20T00:00:00.000Z"
  });

  assert.equal(result.ok, true);
  assert.equal(gatewayCalls[0].input.cardRole, "stage_assessment");
  assert.equal(gatewayCalls[0].input.stageAssessmentCycleId, "cycle_ratio_1");
  assert.equal(gatewayCalls[0].input.activationSource, "owner_manual");
  assert.equal(gatewayCalls[0].input.rubricPolicy.policyId, "rubric:stage_assessment_v1:mathematics");
  assert.deepEqual(gatewayCalls[0].input.rubricPolicy.rubricDimensions.map((item) => item.dimensionId), [
    "stage_independent_understanding",
    "stage_transfer_application",
    "stage_evidence_reasoning",
    "stage_reflection_calibration"
  ]);

  const db = new DatabaseSync(dbPath);
  try {
    const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(result.published.taskCardId);
    assert.equal(card.card_role, "stage_assessment");
    assert.equal(card.task_card_type, "assessment");
    assert.equal(card.stage_assessment_cycle_id, "cycle_ratio_1");
    assert.equal(card.activation_state, "active");
    assert.equal(card.activation_reason, "owner_manual");
    assert.equal(card.activation_source, "owner_manual");
    assert.equal(card.cooldown_until, "2026-06-20T00:00:00.000Z");
    assert.equal(card.default_reward_coins, 300);
    assert.equal(card.mastery_evidence_weight, 1);
    assert.equal(card.planned_minutes, 28);
    assert.equal(card.expected_duration_minutes_min, 25);
    assert.equal(card.expected_duration_minutes_max, 30);
    assert.equal(JSON.parse(card.completion_policy_json).mode, "formal_assessment");
    const raw = JSON.parse(card.raw_json);
    assert.equal(raw.expectedTimeMinutes, 28);
    assert.equal(raw.stageAssessment.cycleId, "cycle_ratio_1");
    assert.equal(raw.stageAssessment.activationSource, "owner_manual");
    assert.equal(raw.completionPolicy.mode, "formal_assessment");
    assert.equal(raw.rubricPolicy.policyId, "rubric:stage_assessment_v1:mathematics");
  } finally {
    db.close();
  }
});

test("card generation fails closed before Gateway when graph planning fails", async () => {
  const { gatewayCalls, generationService } = setup();

  const result = await generationService.generateCard({
    workspaceId: "weixin_child",
    targetNodeId: "kg_missing",
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "plan");
  assert.equal(result.error, "missing_target_node");
  assert.equal(gatewayCalls.length, 0);
});

test("card generation enforces target provisioning before authoring", async () => {
  const provisioningCalls = [];
  const { gatewayCalls, generationService } = setup({
    targetProvisioningService: {
      resolveSelection(input) {
        provisioningCalls.push(input);
        if (input.workspaceId === "weixin_unprovisioned") {
          return { ok: false, targetEnabled: false, error: "learning_target_not_provisioned" };
        }
        return {
          ok: true,
          targetEnabled: true,
          mode: "explicit_provision",
          selectedDomainPackId: "domain_pack_card_generation",
          selectedDomain: "math",
          selectedSubject: "mathematics"
        };
      }
    }
  });

  const denied = await generationService.generateCard({
    workspaceId: "weixin_unprovisioned",
    learnerId: "learner",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching"
  });

  assert.equal(denied.ok, false);
  assert.equal(denied.stage, "provisioning");
  assert.equal(denied.error, "learning_target_not_provisioned");
  assert.equal(gatewayCalls.length, 0);

  const allowed = await generationService.generateCard({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching",
    generationKey: "provisioned-generation"
  });

  assert.equal(allowed.ok, true);
  assert.equal(allowed.targetProvisioning.mode, "explicit_provision");
  assert.equal(allowed.targetProvisioning.selectedDomainPackId, "domain_pack_card_generation");
  assert.equal(provisioningCalls.length >= 3, true);
  assert.deepEqual(provisioningCalls.at(-1).targetNodeIds, ["kg_ratio_intro"]);
});

test("SQLite authoring publisher rolls back the task card when graph binding fails", async () => {
  const { dbPath, planService, store } = setup();
  const plan = await planService.createPlan({
    workspaceId: "weixin_child",
    learnerId: "weixin_child",
    programId: "program_1",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching"
  });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TRIGGER fail_generated_binding
      BEFORE INSERT ON learning_card_graph_bindings
      BEGIN
        SELECT RAISE(FAIL, 'forced binding failure');
      END;
    `);
  } finally {
    db.close();
  }
  const gatewayClient = createGrowthGatewayAuthoringClient({
    transport() {
      return { json: { output_text: JSON.stringify(validDraft()) } };
    }
  });
  const authoringService = createLearningCardAuthoringService({
    gatewayClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher: store.learningCardAuthoringPublisherRepository
  });

  const result = await authoringService.authorCard({
    learningGraphPlan: plan,
    cardRole: "teaching",
    generationKey: "rollback-generation"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "publish");
  assert.equal(result.error, "card_authoring_publish_failed");
  const verify = new DatabaseSync(dbPath);
  try {
    const cardCount = verify.prepare("SELECT COUNT(*) AS count FROM learning_task_cards WHERE title = 'Ratio intro: compare two quantities'").get().count;
    assert.equal(cardCount, 0);
  } finally {
    verify.close();
  }
});
