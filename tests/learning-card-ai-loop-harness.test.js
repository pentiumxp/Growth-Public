const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createServer } = require("../src/app/http-server");
const { createGrowthEvaluationService } = require("../src/services/growth-evaluation-service");
const { createGrowthService } = require("../src/services/growth-service");
const { createGrowthGatewayAuthoringClient } = require("../src/services/growth-gateway-authoring-client");
const { createGrowthGatewayEvaluationClient } = require("../src/services/growth-gateway-evaluation-client");
const { createGrowthGatewayPlannerClient } = require("../src/services/growth-gateway-planner-client");
const { createLearningAuditCompletenessService } = require("../src/services/learning-audit-completeness-service");
const { createLearningAutomationDigestService } = require("../src/services/learning-automation-digest-service");
const { createLearningAutomationProposalService } = require("../src/services/learning-automation-proposal-service");
const { createLearningAutomationSchedulerService } = require("../src/services/learning-automation-scheduler-service");
const { createLearningCardAuthoringService } = require("../src/services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../src/services/learning-card-authoring-validation-service");
const { createLearningCardEvaluationService } = require("../src/services/learning-card-evaluation-service");
const { createLearningCardGenerationContextService } = require("../src/services/learning-card-generation-context-service");
const { createLearningCardGenerationRecipePolicyService } = require("../src/services/learning-card-generation-recipe-policy-service");
const { createLearningCardGenerationService } = require("../src/services/learning-card-generation-service");
const { createLearningCardNextTargetService } = require("../src/services/learning-card-next-target-service");
const { createLearningCardRecommendationService } = require("../src/services/learning-card-recommendation-service");
const { createLearningCardTrajectoryService } = require("../src/services/learning-card-trajectory-service");
const { createLearningCycleAuditService } = require("../src/services/learning-cycle-audit-service");
const { createLearningDailyLoopService } = require("../src/services/learning-daily-loop-service");
const { createLearningEvidenceAuditService } = require("../src/services/learning-evidence-audit-service");
const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningGraphPlanService } = require("../src/services/learning-graph-plan-service");
const { createLearningLearnerCycleService } = require("../src/services/learning-learner-cycle-service");
const { createLearningLoopStateService } = require("../src/services/learning-loop-state-service");
const { createLearningMasteryProfileService } = require("../src/services/learning-mastery-profile-service");
const { createLearningNextCardStrategyService } = require("../src/services/learning-next-card-strategy-service");
const { createLearningOwnerCorrectionService } = require("../src/services/learning-owner-correction-service");
const { createLearningPlanAuditService } = require("../src/services/learning-plan-audit-service");
const { createLearningProfileDeltaService } = require("../src/services/learning-profile-delta-service");
const { createLearningProfileDeltaAuditService } = require("../src/services/learning-profile-delta-audit-service");
const { createLearningProfileFeedbackEvidenceService } = require("../src/services/learning-profile-feedback-evidence-service");
const { createLearningProfileProjectionService } = require("../src/services/learning-profile-projection-service");
const { createLearningProfileV2Service } = require("../src/services/learning-profile-v2-service");
const { createLearningPlanOrchestratorService } = require("../src/services/learning-plan-orchestrator-service");
const { createLearningPlanPublisherService } = require("../src/services/learning-plan-publisher-service");
const { createLearningPlanValidationService } = require("../src/services/learning-plan-validation-service");
const { createLearningPlannerContextService } = require("../src/services/learning-planner-context-service");
const { createLearningRewardAuditService } = require("../src/services/learning-reward-audit-service");
const { createLearningStageAssessmentService } = require("../src/services/learning-stage-assessment-service");
const { createLearningTargetProvisioningService } = require("../src/services/learning-target-provisioning-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const WORKSPACE_ID = "weixin_fanfan";
const PROGRAM_ID = "program_english";
const TARGET_NODE_ID = "kg_english_evidence_answering";
const SCIENCE_PROGRAM_ID = "program_science";
const SCIENCE_NODE_ID = "kg_science_fair_test";
const SCIENCE_PREREQ_NODE_ID = "kg_science_observation_language";
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
    sourceDocuments: [
      {
        sourceRef: "public:english-evidence",
        title: "English evidence-answering summary",
        localPath: ""
      },
      {
        sourceRef: "public:science-fair-test",
        title: "Science fair-test summary",
        localPath: ""
      }
    ],
    domainPacks: [
      {
        domainPackId: "domain_pack_ai_loop_english",
        domain: "english",
        title: "AI loop English test pack",
        sourceKind: "owner_manual",
        version: "2026-06-14-test",
        ownerWorkspaceId: "owner",
        visibility: "private_seed",
        importStatus: "validated_seed"
      },
      {
        domainPackId: "domain_pack_ai_loop_science",
        domain: "science",
        title: "AI loop science test pack",
        sourceKind: "owner_manual",
        version: "2026-06-14-test",
        ownerWorkspaceId: "owner",
        visibility: "private_seed",
        importStatus: "validated_seed"
      }
    ],
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
      },
      {
        nodeId: SCIENCE_PREREQ_NODE_ID,
        domain: "science",
        nodeType: "skill",
        title: "Observation language",
        stage: "year_6_to_7",
        subject: "science",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:science-fair-test",
        version: "2026-06-14-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Describe what changed and what was measured in a fair test."],
        evidenceRequired: ["identify_changed_variable", "identify_measured_result"]
      },
      {
        nodeId: SCIENCE_NODE_ID,
        domain: "science",
        nodeType: "topic",
        title: "Fair test reasoning",
        stage: "year_6_to_7",
        subject: "science",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:science-fair-test",
        version: "2026-06-14-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Explain how one changed variable affects a measured result."],
        evidenceRequired: ["explain_controlled_variable", "explain_measured_result"]
      }
    ],
    edges: [
      {
        edgeId: "edge_claim_reason_to_evidence",
        fromNodeId: "kg_english_claim_reason",
        toNodeId: TARGET_NODE_ID,
        edgeType: "prerequisite",
        confidence: "medium",
        rationale: "A clear claim and reason supports exact evidence use.",
        sourceRef: "public:english-evidence"
      },
      {
        edgeId: "edge_observation_to_fair_test",
        fromNodeId: SCIENCE_PREREQ_NODE_ID,
        toNodeId: SCIENCE_NODE_ID,
        edgeType: "prerequisite",
        confidence: "medium",
        rationale: "Fair-test reasoning needs clear observation language.",
        sourceRef: "public:science-fair-test"
      }
    ]
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

function validSciencePlanDraftForContext(context = {}) {
  const targetNodeId = context.knowledgeGraph?.candidateNodes?.[0]?.nodeId || SCIENCE_NODE_ID;
  return {
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "daily_plan",
    planSummary: "Use one low-pressure science card to repair fair-test reasoning.",
    items: [{
      itemId: "plan_item_science_fair_test",
      cardRole: "repair",
      subject: "science",
      targetNodeIds: [targetNodeId],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["explain_controlled_variable", "explain_measured_result"],
      reason: "Recent summary-only evidence shows the learner needs clearer measured-result reasoning.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: (context.recentEvidence || []).map((item) => item.evidenceId).filter(Boolean).slice(0, 4),
      profileSnapshotId: "profile_v2_science_harness"
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
  const plannerGatewayCalls = [];
  const plannerGatewayClient = createGrowthGatewayPlannerClient({
    transport(payload) {
      plannerGatewayCalls.push(payload);
      return {
        json: {
          output_text: JSON.stringify(validSciencePlanDraftForContext(payload.input))
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
  const evidenceLedgerService = createLearningEvidenceLedgerService({
    repository: store.learningEvidenceLedgerRepository,
    now: () => new Date("2026-06-14T08:10:30.000Z")
  });
  const profileProjectionService = createLearningProfileProjectionService({
    repository: store.masteryProfileRepository,
    nextCardStrategyService
  });
  const profileV2Service = createLearningProfileV2Service({
    evidenceLedgerService,
    legacyProfileProjectionService: profileProjectionService,
    now: () => new Date("2026-06-14T08:10:00.000Z")
  });
  const profileDeltaService = createLearningProfileDeltaService({
    profileV2Service,
    repository: store.profileDeltaAuditRepository,
    now: () => new Date("2026-06-14T08:12:30.000Z")
  });
  const plannerContextService = createLearningPlannerContextService({
    evidenceLedgerService,
    graphRepository: store.learningGraphRepository,
    profileV2Service
  });
  const planOrchestratorService = createLearningPlanOrchestratorService({
    gatewayClient: plannerGatewayClient,
    plannerContextService,
    validationService: createLearningPlanValidationService()
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
  const targetProvisioningService = createLearningTargetProvisioningService({
    repository: store.domainPackProvisionRepository,
    graphRepository: store.learningGraphRepository
  });
  const generationService = createLearningCardGenerationService({
    graphPlanService,
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    nextTargetService,
    nextCardStrategyService,
    recipePolicyService: createLearningCardGenerationRecipePolicyService(),
    targetProvisioningService,
    authoringService
  });
  const planPublisherService = createLearningPlanPublisherService({
    repository: store.learningPlanDraftRepository,
    orchestratorService: planOrchestratorService,
    cardGenerationService: generationService,
    targetProvisioningService
  });
  const evidenceAuditService = createLearningEvidenceAuditService({
    evidenceLedgerService
  });
  const planAuditService = createLearningPlanAuditService({
    repository: store.learningPlanDraftRepository
  });
  const profileDeltaAuditService = createLearningProfileDeltaAuditService({
    repository: store.profileDeltaAuditRepository
  });
  const ownerCorrectionService = createLearningOwnerCorrectionService({
    evidenceLedgerService,
    targetProvisioningService,
    now: () => new Date("2026-06-14T08:13:00.000Z")
  });
  const cycleAuditService = createLearningCycleAuditService({
    planAuditService,
    evidenceAuditService,
    profileDeltaAuditService,
    ownerCorrectionService
  });
  const auditCompletenessService = createLearningAuditCompletenessService({
    cycleAuditService
  });
  const automationProposalService = createLearningAutomationProposalService({
    repository: store.learningAutomationProposalRepository,
    auditCompletenessService,
    planPublisherService,
    targetProvisioningService
  });
  const automationSchedulerService = createLearningAutomationSchedulerService({
    automationProposalService,
    auditCompletenessService,
    targetProvisioningService
  });
  const automationDigestService = createLearningAutomationDigestService({
    repository: store.learningAutomationDigestRepository,
    schedulerService: automationSchedulerService
  });
  const contextService = createLearningCardGenerationContextService({
    graphRepository: store.learningGraphRepository,
    historySummaryRepository: store.learningHistorySummaryRepository,
    nextTargetService,
    profileProjectionService,
    profileV2Service,
    evidenceLedgerService,
    planAuditService,
    profileDeltaAuditService,
    ownerCorrectionService,
    plannerContextService,
    targetProvisioningService,
    nextCardStrategyService,
    recipePolicyService: createLearningCardGenerationRecipePolicyService(),
    gatewayConfigured: () => true,
    authoringGatewayConfigured: () => true,
    evaluationGatewayConfigured: () => true,
    plannerGatewayConfigured: () => true
  });
  const dailyLoopService = createLearningDailyLoopService({
    contextService,
    planPublisherService,
    cycleAuditService,
    auditCompletenessService
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
  const rewardAuditService = createLearningRewardAuditService({
    repository: store
  });
  const loopStateService = createLearningLoopStateService({
    dailyLoopService,
    rewardAuditService,
    stageAssessmentService
  });
  const profileFeedbackEvidenceService = createLearningProfileFeedbackEvidenceService({
    auditCompletenessService,
    evidenceAuditService,
    profileDeltaAuditService,
    profileV2Service,
    recommendationService,
    loopStateService
  });
  const evaluationService = createGrowthEvaluationService({
    learningStore: store,
    evidenceLedgerService,
    profileService,
    profileDeltaService,
    nextCardStrategyService,
    trajectoryService,
    stageAssessmentService,
    eventService: { emit: async () => ({ ok: true }) },
    evaluator: learningCardEvaluationService.evaluateSubmission,
    now: () => new Date("2026-06-14T08:12:00.000Z")
  });
  const growthService = createGrowthService({
    config: { dataOwner: "plugin" },
    learningStore: store
  });
  const learnerCycleService = createLearningLearnerCycleService({
    growthService,
    evaluationService,
    cycleAuditService,
    auditCompletenessService
  });

  return {
    automationDigestService,
    automationProposalService,
    automationSchedulerService,
    dbPath,
    auditCompletenessService,
    contextService,
    cycleAuditService,
    dailyLoopService,
    evidenceLedgerService,
    evaluationGatewayCalls,
    evaluationService,
    gatewayCalls,
    generationService,
    growthService,
    learnerCycleService,
    planPublisherService,
    plannerGatewayCalls,
    loopStateService,
    profileFeedbackEvidenceService,
    profileDeltaService,
    profileV2Service,
    profileProjectionService,
    recommendationService,
    root,
    stageAssessmentService,
    store,
    targetProvisioningService
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

    const pendingJob = harness.store.listEvaluationJobs({ status: "pending", workspaceId: WORKSPACE_ID })[0];
    const processed = await harness.evaluationService.processEvaluationJob(pendingJob);
    assert.equal(processed.ok, true);
    assert.equal(processed.profile_delta.ok, true);
    assert.equal(processed.profile_delta.persistence.ok, true);
    assert.equal(processed.profile_delta.persistence.available, true);
    assert.equal(processed.profile_delta.summary.changedCapabilityCount >= 1, true);
    assert.equal(processed.profile_delta.changedCapabilities[0].nodeId, TARGET_NODE_ID);
    assert.equal(processed.profile_delta.basis.evidenceIds.length >= 1, true);
    assert.equal(JSON.stringify(processed.profile_delta).includes(RAW_MARKER), false);
    const deltaAudits = harness.store.profileDeltaAuditRepository.listProfileDeltas({
      workspaceId: WORKSPACE_ID,
      evaluationId: processed.profile_delta.basis.evaluationId
    });
    assert.equal(deltaAudits.length, 1);
    assert.equal(deltaAudits[0].profileDeltaId, processed.profile_delta.profileDeltaId);
    assert.equal(deltaAudits[0].changedCapabilities[0].nodeId, TARGET_NODE_ID);
    assert.equal(JSON.stringify(deltaAudits[0]).includes(RAW_MARKER), false);
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
      const evidenceLedgerRows = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE source_id = ?").all("eval_ai_loop_1");
      assert.equal(evidenceLedgerRows.length >= 1, true);
      assert.equal(evidenceLedgerRows.every((row) => row.source_type === "daily_evaluation"), true);
      assert.equal(evidenceLedgerRows.some((row) => row.graph_node_id === TARGET_NODE_ID), true);
      assert.equal(evidenceLedgerRows.every((row) => row.evidence_weight === 0.2), true);
      assert.equal(JSON.stringify(evidenceLedgerRows).includes(RAW_MARKER), false);
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

test("Fanfan science daily-loop advance publishes a visible card and learner cycle completes once", async () => {
  const harness = createLoopHarness();
  try {
    const seededEvidence = harness.evidenceLedgerService.writeEvidence({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      graphNodeId: SCIENCE_NODE_ID,
      graphNodeIds: [SCIENCE_NODE_ID],
      sourceType: "backfill_summary",
      sourceId: "science_seed_daily_loop_advance_1",
      evidenceWeight: 0.2,
      confidence: 0.72,
      scoreBand: "low",
      status: "needs_repair",
      summary: {
        summaryOnly: true,
        feedbackSummary: "Fanfan needs clearer measured-result reasoning in fair-test explanations.",
        remainingWeaknesses: ["Explain what was measured and why it changed."]
      },
      recordedAt: "2026-06-14T07:45:00.000Z"
    });
    assert.equal(seededEvidence.ok, true);

    const recipeContext = harness.contextService.context({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      displayName: "凡凡",
      recipeId: "daily_science_v1"
    });
    assert.equal(recipeContext.ok, true);
    assert.equal(recipeContext.selectedRecipeId, "daily_science_v1");
    assert.equal(recipeContext.generationDefaults.domain, "science");
    assert.equal(recipeContext.targetProvisioning.selectedDomain, "science");
    assert.equal(recipeContext.targetProvisioning.selectedSubject, "science");
    assert.equal(recipeContext.suggestedPlan.targetNodeId, SCIENCE_NODE_ID);

    const advanced = await harness.dailyLoopService.advance({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      displayName: "凡凡",
      recipeId: "daily_science_v1",
      requestedBy: "weixin_owner"
    });
    assert.equal(advanced.ok, true);
    assert.equal(advanced.operation, "advance");
    assert.equal(advanced.stage, "published");
    assert.equal(advanced.scope.domain, "science");
    assert.equal(advanced.scope.subject, "science");
    assert.equal(advanced.draftStep.planDraftId.length > 0, true);
    assert.equal(advanced.publishStep.taskCardId.length > 0, true);
    assert.equal(advanced.generation.recipeId, "daily_science_v1");
    assert.equal(advanced.generation.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(advanced.generation.learningGraphPlan.domain, "science");
    assert.equal(advanced.generation.learningGraphPlan.subject, "science");
    assert.equal(harness.plannerGatewayCalls.length, 1);
    assert.equal(harness.gatewayCalls.length, 1);
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.domain, "science");
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.subject, "science");
    assert.equal(harness.gatewayCalls[0].input.cardRole, "teaching");
    assert.equal(JSON.stringify(advanced).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(harness.gatewayCalls[0]).includes(RAW_MARKER), false);

    const taskCardId = advanced.generation.published.taskCardId;
    const board = await harness.growthService.board({ workspaceId: WORKSPACE_ID, limit: 20 });
    assert.equal(board.ok, true);
    const boardCard = board.cards.find((card) => card.taskCardId === taskCardId);
    assert.ok(boardCard);
    assert.equal(boardCard.domain, "science");
    assert.equal(boardCard.cardRole, "teaching");
    assert.deepEqual(boardCard.targetNodeIds, [SCIENCE_NODE_ID]);
    assert.equal(boardCard.expectedDurationMinutes.min, 10);
    assert.equal(boardCard.expectedDurationMinutes.max, 15);
    assert.equal(boardCard.primaryAction, "submit");

    const detail = await harness.growthService.card({ workspaceId: WORKSPACE_ID, taskCardId });
    assert.equal(detail.ok, true);
    assert.equal(detail.card.taskCardId, taskCardId);
    assert.equal(detail.card.domain, "science");

    const completed = await harness.learnerCycleService.full({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      planDraftId: advanced.planDraft.planDraftId,
      taskCardId,
      targetNodeIds: [SCIENCE_NODE_ID],
      domain: "science",
      subject: "science",
      text: "I changed the amount of water and measured how tall the plant grew. I should compare the measured result, not only say the plant looked better.",
      reflection: "I noticed that a fair test needs one changed variable and one measured result.",
      author: "fanfan",
      submittedAt: "2026-06-14T08:05:00.000Z",
      reflectedAt: "2026-06-14T08:15:00.000Z"
    });
    assert.equal(completed.ok, true);
    assert.equal(completed.operation, "full");
    assert.equal(completed.submission.status, "submitted");
    assert.equal(completed.evaluationQueue.processed, 1);
    assert.equal(completed.reflection.status, "submitted");
    assert.equal(completed.cycleAudit.summary.hasPublishedPlan, true);
    assert.equal(completed.cycleAudit.summary.hasEvaluationEvidence, true);
    assert.equal(completed.cycleAudit.summary.hasProfileDelta, true);
    assert.equal(completed.completeness.readyForAutomation, true);
    assert.deepEqual(completed.completeness.summary.missingRequired, []);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].input.card.targetNodeIds[0], SCIENCE_NODE_ID);
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.completionPolicy, "daily_score_once");
    assert.equal(JSON.stringify(completed).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls[0]).includes(RAW_MARKER), false);

    const duplicateSubmit = await harness.learnerCycleService.submit({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      taskCardId,
      text: "Second submission should not be accepted for a daily_score_once card."
    });
    assert.equal(duplicateSubmit.ok, false);
    assert.equal(duplicateSubmit.error, "daily_card_submission_already_recorded");

    const secondEvaluate = await harness.learnerCycleService.evaluate({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      taskCardId,
      targetNodeIds: [SCIENCE_NODE_ID]
    });
    assert.equal(secondEvaluate.ok, true);
    assert.equal(secondEvaluate.evaluationQueue.processed, 0);

    const duplicateReflect = await harness.learnerCycleService.reflect({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      taskCardId,
      reflection: "Second reflection should not be accepted for a daily_score_once card."
    });
    assert.equal(duplicateReflect.ok, false);
    assert.equal(duplicateReflect.error, "daily_card_reflection_already_recorded");

    const completedDetail = await harness.growthService.card({ workspaceId: WORKSPACE_ID, taskCardId });
    assert.equal(completedDetail.ok, true);
    assert.equal(completedDetail.card.status, "completed");
    assert.equal(completedDetail.card.latestSubmission.status, "submitted");
    assert.equal(completedDetail.card.latestEvaluation.status, "completed");
    assert.equal(completedDetail.card.latestReflection.status, "submitted");
    assert.equal(completedDetail.card.latestRewardSettlement.coinAmount, 48);
    assert.equal(JSON.stringify(completedDetail).includes(RAW_MARKER), false);

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const scienceCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(taskCardId);
      assert.equal(scienceCard.domain, "science");
      assert.equal(scienceCard.card_role, "teaching");
      assert.equal(JSON.parse(scienceCard.raw_json).completionPolicy.mode, "daily_score_once");
      assert.equal(JSON.parse(scienceCard.raw_json).completionPolicy.passScoreRequired, false);
      assert.equal(scienceCard.expected_duration_minutes_min, 10);
      assert.equal(scienceCard.expected_duration_minutes_max, 15);

      const submissions = db.prepare("SELECT COUNT(*) AS count FROM learning_task_submissions WHERE task_card_id = ?").get(taskCardId);
      const evaluations = db.prepare("SELECT COUNT(*) AS count FROM learning_evaluations WHERE task_card_id = ?").get(taskCardId);
      const reflections = db.prepare("SELECT COUNT(*) AS count FROM learning_task_reflections WHERE task_card_id = ?").get(taskCardId);
      assert.equal(submissions.count, 1);
      assert.equal(evaluations.count, 1);
      assert.equal(reflections.count, 1);

      const planRow = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(advanced.planDraft.planDraftId);
      assert.equal(planRow.status, "published");
      assert.equal(planRow.generated_task_card_id, taskCardId);
      assert.equal(JSON.parse(planRow.context_summary_json).knowledgeGraph.candidateNodes[0].nodeId, SCIENCE_NODE_ID);

      const evidenceLedgerRows = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE workspace_id = ? AND graph_node_id = ? ORDER BY created_at")
        .all(WORKSPACE_ID, SCIENCE_NODE_ID);
      assert.equal(evidenceLedgerRows.some((row) => row.source_type === "backfill_summary"), true);
      assert.equal(evidenceLedgerRows.some((row) => row.source_type === "daily_evaluation"), true);
      assert.equal(evidenceLedgerRows.filter((row) => row.source_type === "daily_evaluation").every((row) => row.evidence_weight === 0.2), true);
      assert.equal(JSON.stringify({ scienceCard, planRow, evidenceLedgerRows }).includes(RAW_MARKER), false);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(harness.root, { recursive: true, force: true });
  }
});

test("Fanfan science operating loop drafts, publishes, evaluates, and updates Profile V2", async () => {
  const harness = createLoopHarness();
  try {
    const seededEvidence = harness.evidenceLedgerService.writeEvidence({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      graphNodeId: SCIENCE_NODE_ID,
      graphNodeIds: [SCIENCE_NODE_ID],
      sourceType: "backfill_summary",
      sourceId: "science_seed_needs_repair_1",
      evidenceWeight: 0.2,
      confidence: 0.72,
      scoreBand: "low",
      status: "needs_repair",
      summary: {
        summaryOnly: true,
        feedbackSummary: "Fanfan needs clearer measured-result reasoning in fair-test explanations.",
        remainingWeaknesses: ["Explain what was measured and why it changed."]
      },
      recordedAt: "2026-06-14T07:45:00.000Z"
    });
    assert.equal(seededEvidence.ok, true);

    const draft = await harness.planPublisherService.draftPlan({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      horizon: "daily_plan",
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID],
      availableMinutes: 15
    });
    assert.equal(draft.ok, true);
    assert.equal(draft.planDraft.status, "draft");
    assert.equal(draft.planDraft.contextSummary.knowledgeGraph.candidateNodes[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(draft.planDraft.contextSummary.profileSummary.weaknesses[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(harness.plannerGatewayCalls.length, 1);
    assert.equal(harness.plannerGatewayCalls[0].kind, "growth.learning_planner.draft");
    assert.equal(harness.plannerGatewayCalls[0].input.schemaVersion, "growth.learningPlanner.input.v1");
    assert.equal(JSON.stringify(harness.plannerGatewayCalls[0]).includes(RAW_MARKER), false);

    const published = await harness.planPublisherService.publishPlanItem({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      planDraftId: draft.planDraft.planDraftId,
      itemId: "plan_item_science_fair_test"
    });
    assert.equal(published.ok, true);
    assert.equal(published.planDraft.status, "published");
    assert.equal(published.planDraft.generatedTaskCardId, published.generation.published.taskCardId);
    assert.equal(published.generation.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(published.generation.learningGraphPlan.cardSequence[0].cardRole, "teaching");
    assert.equal(harness.gatewayCalls.length, 1);
    assert.equal(harness.gatewayCalls[0].kind, "growth.card_authoring.generate");
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(harness.gatewayCalls[0].input.sourceSummaries[0].domain, "science");
    assert.equal(JSON.stringify(harness.gatewayCalls[0]).includes(RAW_MARKER), false);

    const submitted = harness.store.submitEvidence({
      workspaceId: WORKSPACE_ID,
      taskCardId: published.generation.published.taskCardId,
      text: "I changed the amount of water and measured how tall the plant grew. More water helped at first, but too much water might not help.",
      submittedAt: "2026-06-14T08:05:00.000Z"
    });
    assert.equal(submitted.ok, true);
    assert.equal(submitted.evaluation_job.status, "pending");

    const pendingJob = harness.store.listEvaluationJobs({ status: "pending", workspaceId: WORKSPACE_ID })[0];
    const processed = await harness.evaluationService.processEvaluationJob(pendingJob);
    assert.equal(processed.ok, true);
    assert.equal(processed.profile_delta.ok, true);
    assert.equal(processed.profile_delta.persistence.ok, true);
    assert.equal(processed.profile_delta.persistence.available, true);
    assert.equal(processed.profile_delta.summary.changedCapabilityCount >= 1, true);
    assert.equal(processed.profile_delta.changedCapabilities[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(processed.profile_delta.basis.evidenceIds.length >= 1, true);
    assert.equal(JSON.stringify(processed.profile_delta).includes(RAW_MARKER), false);
    const deltaAudits = harness.store.profileDeltaAuditRepository.listProfileDeltas({
      workspaceId: WORKSPACE_ID,
      evaluationId: processed.profile_delta.basis.evaluationId
    });
    assert.equal(deltaAudits.length, 1);
    assert.equal(deltaAudits[0].profileDeltaId, processed.profile_delta.profileDeltaId);
    assert.equal(deltaAudits[0].changedCapabilities[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(JSON.stringify(deltaAudits[0]).includes(RAW_MARKER), false);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].kind, "growth.card_evaluation.evaluate");
    assert.equal(harness.evaluationGatewayCalls[0].input.card.targetNodeIds[0], SCIENCE_NODE_ID);
    assert.equal(harness.evaluationGatewayCalls[0].input.policy.completionPolicy, "daily_score_once");
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls[0]).includes(RAW_MARKER), false);

    const profileV2 = harness.profileV2Service.profileV2({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      targetNodeIds: [SCIENCE_NODE_ID]
    });
    assert.equal(profileV2.ok, true);
    const scienceState = profileV2.capabilityStates.find((state) => state.nodeId === SCIENCE_NODE_ID);
    assert.ok(scienceState);
    assert.equal(scienceState.evidenceCount >= 2, true);
    assert.equal(scienceState.evidenceWeightTotal >= 0.4, true);
    assert.equal(profileV2.weaknesses.some((item) => item.nodeId === SCIENCE_NODE_ID), true);
    assert.equal(profileV2.recommendedPlannerHints.strategy, "repair");
    assert.equal(JSON.stringify(profileV2).includes(RAW_MARKER), false);

    const nextLoopState = harness.loopStateService.state({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      taskCardId: published.generation.published.taskCardId,
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID]
    });
    assert.equal(nextLoopState.ok, true);
    assert.equal(nextLoopState.schemaVersion, "growth.learningLoopState.v1");
    assert.equal(nextLoopState.privacyClass, "summary_only");
    assert.equal(nextLoopState.status, "ready_to_draft");
    assert.equal(nextLoopState.audit.complete, true);
    assert.equal(nextLoopState.audit.readyForAutomation, true);
    assert.equal(nextLoopState.audit.evidenceCount >= 1, true);
    assert.equal(nextLoopState.audit.profileDeltaCount >= 1, true);
    assert.deepEqual(nextLoopState.audit.missingRequired, []);
    assert.equal(nextLoopState.recommendation.available, true);
    assert.equal(nextLoopState.recommendation.strategy, "repair");
    assert.equal(nextLoopState.recommendation.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(nextLoopState.nextAction.action, "draft_daily_plan");
    assert.equal(nextLoopState.nextAction.reason, "next_strategy:repair");
    assert.equal(nextLoopState.nextAction.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(JSON.stringify(nextLoopState).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(nextLoopState).includes("rawPrompt"), false);
    assert.equal(JSON.stringify(nextLoopState).includes("answerKey"), false);

    const profileFeedbackEvidence = harness.profileFeedbackEvidenceService.evaluate({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      taskCardId: published.generation.published.taskCardId,
      evaluationId: processed.profile_delta.basis.evaluationId,
      profileDeltaId: processed.profile_delta.profileDeltaId,
      evidenceId: processed.profile_delta.basis.evidenceIds[0],
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID]
    });
    assert.equal(profileFeedbackEvidence.ok, true);
    assert.equal(profileFeedbackEvidence.schemaVersion, "growth.learningProfileFeedbackEvidence.v1");
    assert.equal(profileFeedbackEvidence.status, "pass");
    assert.equal(profileFeedbackEvidence.summary.readyForNextPlan, true);
    assert.equal(profileFeedbackEvidence.summary.cycleComplete, true);
    assert.equal(profileFeedbackEvidence.summary.profileDeltaCount >= 1, true);
    assert.equal(profileFeedbackEvidence.summary.evidenceCount >= 1, true);
    assert.equal(profileFeedbackEvidence.summary.rewardSettlementCount >= 1, true);
    assert.equal(profileFeedbackEvidence.summary.totalRewardCoins > 0, true);
    assert.equal(profileFeedbackEvidence.summary.nextAction, "draft_daily_plan");
    assert.equal(profileFeedbackEvidence.loopState.reward.available, true);
    assert.equal(profileFeedbackEvidence.recommendation.strategy, "repair");
    assert.equal(profileFeedbackEvidence.recommendation.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(JSON.stringify(profileFeedbackEvidence).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(profileFeedbackEvidence).includes("rawPrompt"), false);
    assert.equal(JSON.stringify(profileFeedbackEvidence).includes("answerKey"), false);

    const proposal = await harness.automationProposalService.createProposal({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      horizon: "daily_plan",
      domain: "science",
      subject: "science",
      sourcePlanDraftId: draft.planDraft.planDraftId,
      sourceTaskCardId: published.generation.published.taskCardId,
      sourceEvaluationId: processed.profile_delta.basis.evaluationId,
      profileDeltaId: processed.profile_delta.profileDeltaId,
      evidenceId: processed.profile_delta.basis.evidenceIds[0],
      targetNodeIds: [SCIENCE_NODE_ID],
      availableMinutes: 15,
      requestedBy: "weixin_owner"
    });
    assert.equal(proposal.ok, true);
    assert.equal(proposal.source, "growth-learning-automation-proposal-service");
    assert.equal(proposal.proposal.status, "proposed");
    assert.equal(proposal.proposal.privacyClass, "summary_only");
    assert.equal(proposal.proposal.sourceCycle.readyForAutomation, true);
    assert.equal(proposal.proposal.sourceTaskCardId, published.generation.published.taskCardId);
    assert.equal(proposal.proposal.sourceEvaluationId, processed.profile_delta.basis.evaluationId);
    assert.equal(proposal.proposal.policy.ownerReviewRequired, true);
    assert.equal(proposal.proposal.policy.autoPublish, false);
    assert.equal(proposal.proposal.policy.dryRunOnly, true);
    assert.equal(proposal.proposal.targetNodeIds[0], SCIENCE_NODE_ID);
    assert.equal(proposal.publishAction.requiredActor, "owner");
    assert.match(proposal.publishAction.endpoint, /^\/api\/v1\/growth\/learning-plans\/.+\/publish$/);
    assert.equal(harness.plannerGatewayCalls.length, 2);
    assert.equal(harness.gatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(JSON.stringify(proposal).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(harness.plannerGatewayCalls[1]).includes(RAW_MARKER), false);

    const accepted = harness.automationProposalService.reviewProposal({
      workspaceId: WORKSPACE_ID,
      proposalId: proposal.proposal.proposalId,
      status: "accepted",
      requestedBy: "weixin_owner",
      reason: "Owner accepts the next low-pressure science repair card."
    });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.proposal.status, "accepted");
    assert.equal(accepted.proposal.decision.summaryOnly, true);
    assert.equal(accepted.publishAction.requiredActor, "owner");
    assert.equal(JSON.stringify(accepted).includes(RAW_MARKER), false);

    const schedulerDryRun = harness.automationSchedulerService.dryRun({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID],
      limit: 5,
      requestedBy: "weixin_owner"
    });
    assert.equal(schedulerDryRun.ok, true);
    assert.equal(schedulerDryRun.source, "growth-learning-automation-scheduler-service");
    assert.equal(schedulerDryRun.dryRun, true);
    assert.equal(schedulerDryRun.writePlanned, false);
    assert.equal(schedulerDryRun.writesPerformed, false);
    assert.equal(schedulerDryRun.publishPlanned, false);
    assert.equal(schedulerDryRun.summary.wouldPublish, 1);
    assert.equal(schedulerDryRun.candidates[0].proposalId, proposal.proposal.proposalId);
    assert.equal(schedulerDryRun.candidates[0].decision, "would_publish");
    assert.equal(schedulerDryRun.candidates[0].safeToPublish, true);
    assert.equal(schedulerDryRun.candidates[0].publishAction.requiredActor, "owner");
    assert.equal(
      schedulerDryRun.candidates[0].publishAction.endpoint,
      `/api/v1/growth/automation/proposals/${encodeURIComponent(proposal.proposal.proposalId)}/publish`
    );
    assert.equal(JSON.stringify(schedulerDryRun).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(schedulerDryRun).includes("rawPrompt"), false);
    assert.equal(JSON.stringify(schedulerDryRun).includes("answerKey"), false);

    const digest = harness.automationDigestService.createDigest({
      workspaceId: WORKSPACE_ID,
      learnerId: WORKSPACE_ID,
      programId: SCIENCE_PROGRAM_ID,
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID],
      requestedBy: "weixin_owner",
      limit: 5
    });
    assert.equal(digest.ok, true);
    assert.equal(digest.source, "growth-learning-automation-digest-service");
    assert.equal(digest.dryRun, true);
    assert.equal(digest.writePlanned, false);
    assert.equal(digest.writesPerformed, false);
    assert.equal(digest.publishPlanned, false);
    assert.equal(digest.publishRequiresOwnerAction, true);
    assert.equal(digest.digest.status, "pending");
    assert.equal(digest.digest.privacyClass, "summary_only");
    assert.equal(digest.digest.summary.wouldPublish, 1);
    assert.equal(digest.digest.summary.requiredActions, 1);
    assert.equal(digest.digest.candidates[0].proposalId, proposal.proposal.proposalId);
    assert.equal(digest.digest.candidates[0].decision, "would_publish");
    assert.equal(digest.digest.requiredActions[0].requiredActor, "owner");
    assert.equal(digest.digest.requiredActions[0].proposalId, proposal.proposal.proposalId);
    assert.equal(JSON.stringify(digest).includes(RAW_MARKER), false);
    assert.equal(JSON.stringify(digest).includes("rawPrompt"), false);
    assert.equal(JSON.stringify(digest).includes("answerKey"), false);
    assert.equal(harness.gatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls.length, 1);

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const planRow = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?")
        .get(draft.planDraft.planDraftId);
      assert.equal(planRow.status, "published");
      assert.equal(planRow.generated_task_card_id, published.generation.published.taskCardId);
      assert.equal(JSON.parse(planRow.context_summary_json).knowledgeGraph.candidateNodes[0].nodeId, SCIENCE_NODE_ID);
      assert.equal(JSON.stringify(planRow).includes(RAW_MARKER), false);

      const scienceCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?")
        .get(published.generation.published.taskCardId);
      assert.equal(scienceCard.domain, "science");
      assert.equal(scienceCard.card_role, "teaching");
      assert.equal(JSON.parse(scienceCard.raw_json).completionPolicy.mode, "daily_score_once");

      const evidenceLedgerRows = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE workspace_id = ? AND graph_node_id = ? ORDER BY created_at")
        .all(WORKSPACE_ID, SCIENCE_NODE_ID);
      assert.equal(evidenceLedgerRows.length >= 2, true);
      assert.equal(evidenceLedgerRows.some((row) => row.source_type === "backfill_summary"), true);
      assert.equal(evidenceLedgerRows.some((row) => row.source_type === "daily_evaluation"), true);
      assert.equal(evidenceLedgerRows.filter((row) => row.source_type === "daily_evaluation").every((row) => row.evidence_weight === 0.2), true);
      assert.equal(JSON.stringify(evidenceLedgerRows).includes(RAW_MARKER), false);

      const proposalRow = db.prepare("SELECT * FROM learning_growth_automation_proposals WHERE proposal_id = ?")
        .get(proposal.proposal.proposalId);
      assert.equal(proposalRow.status, "accepted");
      assert.equal(proposalRow.source_task_card_id, published.generation.published.taskCardId);
      assert.equal(proposalRow.source_evaluation_id, processed.profile_delta.basis.evaluationId);
      assert.equal(JSON.parse(proposalRow.policy_json).autoPublish, false);
      assert.equal(JSON.parse(proposalRow.policy_json).ownerReviewRequired, true);
      assert.equal(JSON.stringify(proposalRow).includes(RAW_MARKER), false);

      const digestRow = db.prepare("SELECT * FROM learning_growth_automation_digests WHERE digest_id = ?")
        .get(digest.digest.digestId);
      assert.equal(digestRow.status, "pending");
      assert.equal(JSON.parse(digestRow.summary_json).wouldPublish, 1);
      assert.equal(JSON.parse(digestRow.required_actions_json)[0].proposalId, proposal.proposal.proposalId);
      assert.equal(JSON.stringify(digestRow).includes(RAW_MARKER), false);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(harness.root, { recursive: true, force: true });
  }
});

test("provisioned non-sample science operating loop is blocked until target provision and then stays target-scoped", async () => {
  const harness = createLoopHarness();
  const learnerWorkspaceId = "weixin_alice";
  const learnerId = "alice";
  const programId = "program_science_alice";
  try {
    const deniedDraft = await harness.planPublisherService.draftPlan({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      horizon: "daily_plan",
      domainPackId: "domain_pack_ai_loop_science",
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID],
      availableMinutes: 15
    });
    assert.equal(deniedDraft.ok, false);
    assert.equal(deniedDraft.stage, "provisioning");
    assert.equal(deniedDraft.error, "learning_target_not_provisioned");
    assert.equal(harness.plannerGatewayCalls.length, 0);

    const deniedDirectGeneration = await harness.generationService.generateCard({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      domainPackId: "domain_pack_ai_loop_science",
      domain: "science",
      subject: "science",
      targetNodeId: SCIENCE_NODE_ID,
      cardRole: "teaching",
      generationKey: "non-sample-denied-direct-generation"
    });
    assert.equal(deniedDirectGeneration.ok, false);
    assert.equal(deniedDirectGeneration.stage, "provisioning");
    assert.equal(deniedDirectGeneration.error, "learning_target_not_provisioned");
    assert.equal(harness.gatewayCalls.length, 0);

    const provision = harness.targetProvisioningService.provisionDomainPack({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      domainPackId: "domain_pack_ai_loop_science",
      domain: "science",
      subject: "science",
      requestedBy: "owner"
    });
    assert.equal(provision.ok, true);
    assert.equal(provision.provision.workspaceId, learnerWorkspaceId);
    assert.equal(provision.provision.learnerId, learnerId);
    assert.equal(provision.provision.domainPackId, "domain_pack_ai_loop_science");
    assert.equal(provision.provision.subject, "science");
    assert.equal(JSON.stringify(provision).includes(RAW_MARKER), false);

    const wrongSubject = await harness.planPublisherService.draftPlan({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      horizon: "daily_plan",
      domainPackId: "domain_pack_ai_loop_science",
      domain: "science",
      subject: "physics",
      targetNodeIds: [SCIENCE_NODE_ID],
      availableMinutes: 15
    });
    assert.equal(wrongSubject.ok, false);
    assert.equal(wrongSubject.stage, "provisioning");
    assert.equal(wrongSubject.error, "learning_domain_pack_not_provisioned");
    assert.equal(harness.plannerGatewayCalls.length, 0);

    const draft = await harness.planPublisherService.draftPlan({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      horizon: "daily_plan",
      domainPackId: "domain_pack_ai_loop_science",
      domain: "science",
      subject: "science",
      targetNodeIds: [SCIENCE_NODE_ID],
      availableMinutes: 15
    });
    assert.equal(draft.ok, true);
    assert.equal(draft.planDraft.workspaceId, learnerWorkspaceId);
    assert.equal(draft.planDraft.learnerId, learnerId);
    assert.equal(draft.planDraft.validation.targetProvisioning.mode, "explicit_provision");
    assert.equal(draft.planDraft.validation.targetProvisioning.selectedDomainPackId, "domain_pack_ai_loop_science");
    assert.equal(draft.planDraft.contextSummary.knowledgeGraph.domainPackId, "domain_pack_ai_loop_science");
    assert.equal(draft.planDraft.contextSummary.knowledgeGraph.candidateNodes[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(harness.plannerGatewayCalls.length, 1);
    assert.equal(harness.plannerGatewayCalls[0].input.target.workspaceId, learnerWorkspaceId);
    assert.equal(harness.plannerGatewayCalls[0].input.target.learnerId, learnerId);
    assert.equal(harness.plannerGatewayCalls[0].input.knowledgeGraph.domainPackId, "domain_pack_ai_loop_science");
    assert.equal(JSON.stringify(harness.plannerGatewayCalls[0]).includes(RAW_MARKER), false);

    const published = await harness.planPublisherService.publishPlanItem({
      workspaceId: learnerWorkspaceId,
      learnerId,
      planDraftId: draft.planDraft.planDraftId,
      itemId: "plan_item_science_fair_test"
    });
    assert.equal(published.ok, true);
    assert.equal(published.generation.targetProvisioning.mode, "explicit_provision");
    assert.equal(published.generation.learningGraphPlan.workspaceId, learnerWorkspaceId);
    assert.equal(published.generation.learningGraphPlan.learnerId, learnerId);
    assert.equal(published.generation.learningGraphPlan.domainPackId, "domain_pack_ai_loop_science");
    assert.equal(published.generation.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
    assert.equal(harness.gatewayCalls.length, 1);
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.workspaceId, learnerWorkspaceId);
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.learnerId, learnerId);
    assert.equal(harness.gatewayCalls[0].input.learningGraphPlan.domainPackId, "domain_pack_ai_loop_science");
    assert.equal(JSON.stringify(harness.gatewayCalls[0]).includes(RAW_MARKER), false);

    const submitted = harness.store.submitEvidence({
      workspaceId: learnerWorkspaceId,
      taskCardId: published.generation.published.taskCardId,
      text: "I changed the light and measured the plant height. The result changed because the plant had more light.",
      submittedAt: "2026-06-14T08:05:00.000Z"
    });
    assert.equal(submitted.ok, true);
    assert.equal(submitted.workspace_id, learnerWorkspaceId);
    assert.equal(submitted.submission.taskCardId, published.generation.published.taskCardId);
    assert.equal(submitted.evaluation_job.status, "pending");

    const pendingJob = harness.store.listEvaluationJobs({ status: "pending", workspaceId: learnerWorkspaceId })[0];
    const processed = await harness.evaluationService.processEvaluationJob(pendingJob);
    assert.equal(processed.ok, true);
    assert.equal(processed.evaluation.taskCardId, published.generation.published.taskCardId);
    assert.equal(processed.evaluation.status, "completed");
    assert.equal(processed.profile_delta.ok, true);
    assert.equal(processed.profile_delta.workspaceId, learnerWorkspaceId);
    assert.equal(processed.profile_delta.learnerId, learnerId);
    assert.equal(processed.profile_delta.changedCapabilities[0].nodeId, SCIENCE_NODE_ID);
    assert.equal(harness.evaluationGatewayCalls.length, 1);
    assert.equal(harness.evaluationGatewayCalls[0].input.workspaceId, learnerWorkspaceId);
    assert.equal(harness.evaluationGatewayCalls[0].input.learnerId, learnerId);
    assert.equal(harness.evaluationGatewayCalls[0].input.card.targetNodeIds[0], SCIENCE_NODE_ID);
    assert.equal(JSON.stringify(harness.evaluationGatewayCalls[0]).includes(RAW_MARKER), false);

    const profileV2 = harness.profileV2Service.profileV2({
      workspaceId: learnerWorkspaceId,
      learnerId,
      programId,
      targetNodeIds: [SCIENCE_NODE_ID]
    });
    assert.equal(profileV2.ok, true);
    assert.equal(profileV2.workspaceId, learnerWorkspaceId);
    assert.equal(profileV2.learnerId, learnerId);
    assert.equal(profileV2.capabilityStates.some((state) => state.nodeId === SCIENCE_NODE_ID), true);
    assert.equal(JSON.stringify(profileV2).includes(WORKSPACE_ID), false);
    assert.equal(JSON.stringify(profileV2).includes(RAW_MARKER), false);

    const db = new DatabaseSync(harness.dbPath, { readOnly: true });
    try {
      const provisionRows = db.prepare("SELECT * FROM learning_growth_domain_pack_provisions WHERE workspace_id = ?").all(learnerWorkspaceId);
      assert.equal(provisionRows.length, 1);
      assert.equal(provisionRows[0].domain_pack_id, "domain_pack_ai_loop_science");
      assert.equal(provisionRows[0].subject, "science");

      const planRow = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?")
        .get(draft.planDraft.planDraftId);
      assert.equal(planRow.workspace_id, learnerWorkspaceId);
      assert.equal(planRow.learner_id, learnerId);
      assert.equal(JSON.parse(planRow.validation_json).targetProvisioning.mode, "explicit_provision");
      assert.equal(JSON.parse(planRow.context_summary_json).target.workspaceId, learnerWorkspaceId);

      const card = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(published.generation.published.taskCardId);
      assert.equal(card.workspace_id, learnerWorkspaceId);
      assert.equal(card.learner_id, learnerId);
      assert.equal(card.domain, "science");
      assert.equal(JSON.parse(card.raw_json).learningGraph.domainPackId, "domain_pack_ai_loop_science");

      const ledgerRows = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE workspace_id = ? AND graph_node_id = ?").all(learnerWorkspaceId, SCIENCE_NODE_ID);
      assert.equal(ledgerRows.length >= 1, true);
      assert.equal(ledgerRows.every((row) => row.learner_id === learnerId), true);
      assert.equal(ledgerRows.some((row) => row.source_type === "daily_evaluation"), true);

      const fanfanRowsForScience = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE workspace_id = ? AND graph_node_id = ?").all(WORKSPACE_ID, SCIENCE_NODE_ID);
      assert.equal(fanfanRowsForScience.length, 0);
      assert.equal(JSON.stringify({ provisionRows, planRow, card, ledgerRows }).includes(RAW_MARKER), false);
    } finally {
      db.close();
    }
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
