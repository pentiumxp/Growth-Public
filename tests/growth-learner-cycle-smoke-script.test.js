const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-learner-cycle.js");
const loopStateScriptPath = path.join(repoRoot, "scripts", "smoke-growth-learning-loop-state.js");

const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectLearnerCycleSmokeReadback,
  targetNodeIds,
  validateOperation
} = require("../scripts/smoke-growth-learner-cycle");

const WORKSPACE_ID = "weixin_fanfan";
const LEARNER_ID = "fanfan";
const PROGRAM_ID = "program_science";
const TASK_CARD_ID = "ltask_learner_cycle_science";
const TARGET_NODE_ID = "kg_science_fair_test";
const RAW_SUBMISSION_MARKER = "RAW_LEARNER_SUBMISSION_MUST_NOT_LEAVE_OUTPUT";
const RAW_REFLECTION_MARKER = "RAW_LEARNER_REFLECTION_MUST_NOT_LEAVE_OUTPUT";

function scienceGraphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_learner_cycle_smoke",
    version: "2026-06-15-test",
    privacyClass: "summary_only",
    sourceDocuments: [{
      sourceRef: "public:science-fair-test",
      title: "Science fair-test summary",
      localPath: ""
    }],
    domainPacks: [{
      domainPackId: "domain_pack_learner_cycle_science",
      domain: "science",
      title: "Learner-cycle science smoke pack",
      sourceKind: "owner_manual",
      version: "2026-06-15-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [{
      nodeId: TARGET_NODE_ID,
      domain: "science",
      nodeType: "topic",
      title: "Fair test reasoning",
      stage: "year_6_to_7",
      subject: "science",
      curriculum: "test",
      sourceKind: "owner_manual",
      sourceRef: "public:science-fair-test",
      version: "2026-06-15-test",
      privacyClass: "summary_only",
      learningOutcomes: ["Explain how one changed variable affects a measured result."],
      evidenceRequired: ["explain_changed_variable", "explain_measured_result"]
    }],
    edges: []
  };
}

function createLearningTables(db) {
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
    CREATE TABLE learning_task_reflections (
      id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      audio_digest TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}',
      submitted_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
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

function seedCard(db) {
  db.prepare(`
    INSERT INTO learning_programs(
      id, learner_id, workspace_id, title, domain, focus_areas_json,
      goal_summary, start_date, end_date, days_per_week, minutes_per_day,
      intensity, status, source_basis_refs_json, curriculum_refs_json,
      constraints_json, review_policy_json, raw_json, created_at, updated_at
    ) VALUES (
      ?, ?, ?, 'Fanfan science learner-cycle smoke', 'science', ?,
      'Build low-pressure fair-test reasoning.', '2026-06-15',
      '2026-06-22', 5, 12, 'normal', 'active', '[]', '[]', '{}', '{}',
      '{}', '2026-06-15T00:00:00.000Z', '2026-06-15T00:00:00.000Z'
    )
  `).run(PROGRAM_ID, LEARNER_ID, WORKSPACE_ID, JSON.stringify([TARGET_NODE_ID]));
  db.prepare(`
    INSERT INTO learning_task_cards(
      id, program_id, draft_id, learner_id, workspace_id, title, domain,
      task_card_type, status, planned_date, planned_minutes, skill_ids_json,
      template_id, interaction_state_machine_json, source_basis_refs_json,
      curriculum_refs_json, privacy_level, card_role, completion_policy_json,
      mastery_evidence_weight, capability_cluster_id, reward_cap_coins,
      configured_reward_coins, default_reward_coins, raw_json, created_at, updated_at
    ) VALUES (
      ?, ?, 'draft_science_cycle', ?, ?,
      'Fair-test reasoning practice', 'science', 'practice', 'published',
      '2026-06-15', 12, ?, 'growth_generated_daily', '[]', '[]', '[]',
      'member_self', 'practice', ?, 0.2, ?, 100, 100, 100, ?,
      '2026-06-15T00:00:00.000Z', '2026-06-15T00:00:00.000Z'
    )
  `).run(
    TASK_CARD_ID,
    PROGRAM_ID,
    LEARNER_ID,
    WORKSPACE_ID,
    JSON.stringify([TARGET_NODE_ID]),
    JSON.stringify({ mode: "daily_score_once", evaluationAttempts: 1, reflectionAttempts: 1 }),
    TARGET_NODE_ID,
    JSON.stringify({
      source: "growth-card-authoring",
      cardRole: "practice",
      completionPolicy: { mode: "daily_score_once", evaluationAttempts: 1, reflectionAttempts: 1 },
      learningGraph: { targetNodeIds: [TARGET_NODE_ID] },
      instructionPreview: "Explain the changed variable and measured result."
    })
  );
}

function seedPublishedPlanDraft(dbPath) {
  const store = createGrowthLearningSqliteStore({ dbPath });
  const draft = {
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "daily_plan",
    planSummary: "Use one low-pressure science card to check fair-test reasoning.",
    items: [{
      itemId: "plan_item_science_cycle",
      cardRole: "practice",
      subject: "science",
      targetNodeIds: [TARGET_NODE_ID],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["changed_variable", "measured_result"]
    }],
    audit: {
      basisEvidenceIds: [],
      profileSnapshotId: "profile_v2_cycle_smoke"
    }
  };
  const saved = store.learningPlanDraftRepository.saveDraft({
    workspaceId: WORKSPACE_ID,
    learnerId: LEARNER_ID,
    programId: PROGRAM_ID,
    horizon: "daily_plan",
    draft,
    planSummary: draft.planSummary,
    createdAt: "2026-06-15T00:00:00.000Z"
  });
  assert.equal(saved.ok, true);
  const planDraftId = saved.planDraft.planDraftId;
  const published = store.learningPlanDraftRepository.markPublished({
    workspaceId: WORKSPACE_ID,
    planDraftId,
    selectedItemId: "plan_item_science_cycle",
    generatedTaskCardId: TASK_CARD_ID,
    generatedLearningGraphPlanId: "lgp_learner_cycle_science",
    publishedAt: "2026-06-15T00:01:00.000Z"
  });
  assert.equal(published.ok, true);
  return planDraftId;
}

function seedScienceGraph(dbPath) {
  const store = createGrowthLearningSqliteStore({ dbPath });
  const result = store.learningGraphRepository.importPack({
    pack: scienceGraphPack(),
    validation: { validation: {}, warnings: [] },
    sourceFile: "learner-cycle-science-graph.json",
    sourceSha256: "learner-cycle-science-test-sha256"
  });
  assert.equal(result.ok, true);
}

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-learner-cycle-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function withPreparedDb(callback) {
  return withTempDb(({ dir, dbPath }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    try {
      createLearningTables(db);
      seedCard(db);
    } finally {
      db.close();
    }
    seedScienceGraph(dbPath);
    const planDraftId = seedPublishedPlanDraft(dbPath);
    return callback({ dir, dbPath, planDraftId });
  });
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function runLoopStateScript(args, env = {}) {
  return spawnSync(process.execPath, [loopStateScriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

function baseArgs(planDraftId = "") {
  return [
    "--workspace-id", WORKSPACE_ID,
    "--learner-id", LEARNER_ID,
    "--program-id", PROGRAM_ID,
    "--task-card-id", TASK_CARD_ID,
    "--plan-draft-id", planDraftId,
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", TARGET_NODE_ID,
    "--json"
  ];
}

test("learner-cycle smoke script parses operation, write guard, and bounded learner evidence inputs", () => {
  const args = [
    "--operation", "full",
    "--allow-write",
    "--workspace-id", WORKSPACE_ID,
    "--learner-id", LEARNER_ID,
    "--program-id", PROGRAM_ID,
    "--task-card-id", TASK_CARD_ID,
    "--plan-draft-id", "lgplan_cycle_1",
    "--target-node-id", TARGET_NODE_ID,
    "--target-node-ids", `${TARGET_NODE_ID},kg_science_observation_language`,
    "--text", "The changed variable is light and the measured result is plant height.",
    "--reflection", "I checked which result was measured.",
    "--author", "learner",
    "--submitted-at", "2026-06-15T01:00:00.000Z",
    "--reflected-at", "2026-06-15T01:10:00.000Z"
  ];

  assert.equal(operationFromArgs(args), "full");
  assert.equal(allowWrite(args), true);
  assert.deepEqual(targetNodeIds(args), [TARGET_NODE_ID, "kg_science_observation_language"]);
  assert.equal(validateOperation("full", inputFromArgs(args), args).ok, true);
  assert.equal(inputFromArgs(args).text.includes("changed variable"), true);
  assert.equal(inputFromArgs(args).reflection.includes("checked"), true);
});

test("learner-cycle smoke script projects top-level operator readback", () => {
  const output = projectLearnerCycleSmokeReadback({
    ok: true,
    operation: "full",
    source: "growth-learning-learner-cycle-service",
    schemaVersion: "growth.learningLearnerCycleSmoke.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    target: {
      workspaceId: WORKSPACE_ID,
      learnerId: LEARNER_ID,
      programId: PROGRAM_ID,
      taskCardId: TASK_CARD_ID,
      planDraftId: "lgplan_cycle_1",
      domainPackId: "domain_pack_learner_cycle_science",
      domain: "science",
      subject: "science",
      targetNodeIds: [TARGET_NODE_ID]
    },
    card: {
      taskCardId: TASK_CARD_ID,
      status: "completed",
      laneId: "completed",
      primaryAction: "review",
      latestEvaluationJob: {
        status: "done",
        attemptCount: 1,
        retryable: false,
        failedVisible: false
      }
    },
    submission: {
      submissionId: "lsub_cycle_1",
      status: "submitted",
      submissionKind: "text",
      hasAudio: true,
      evaluationJob: { status: "pending", submissionId: "lsub_cycle_1" }
    },
    evaluationQueue: {
      available: true,
      processed: 1,
      results: [{
        jobId: "lejob_cycle_1",
        ok: true,
        status: "done",
        stageAssessmentCycle: {
          ok: true,
          skipped: false,
          activationState: "cooldown",
          cycleId: "stage_cycle_1",
          cycleStatus: "completed",
          generatedTaskCardId: TASK_CARD_ID,
          completedAt: "2026-06-15T01:05:00.000Z",
          cooldownUntil: "2026-06-20T01:05:00.000Z"
        }
      }]
    },
    reflection: {
      reflectionId: "lref_cycle_1",
      status: "submitted",
      mode: "text",
      hasAudio: true
    },
    cycleAudit: {
      available: true,
      summary: {
        planDraftCount: 1,
        evidenceCount: 2,
        profileDeltaCount: 1,
        correctionCount: 0,
        hasPublishedPlan: true,
        hasEvaluationEvidence: true,
        hasProfileDelta: true,
        latestActivityAt: "2026-06-15T01:10:00.000Z"
      },
      partialFailures: [],
      timeline: [{ type: "evaluation", id: "leval_cycle_1", at: "2026-06-15T01:05:00.000Z" }]
    },
    completeness: {
      available: true,
      complete: true,
      readyForAutomation: true,
      summary: {
        requiredCount: 3,
        satisfiedRequiredCount: 3,
        missingRequired: [],
        planPublished: true,
        evaluationEvidence: true,
        profileDelta: true,
        ownerCorrectionAvailable: false
      },
      findings: [
        { code: "plan_published", ok: true, severity: "required" },
        { code: "evaluation_evidence", ok: true, severity: "required" }
      ]
    }
  });

  assert.equal(output.learnerCycleStatus, "pass");
  assert.equal(output.learnerCycleOk, true);
  assert.equal(output.learnerCycleOperation, "full");
  assert.equal(output.learnerCycleWriteOperation, true);
  assert.equal(output.learnerCycleTargetWorkspaceId, WORKSPACE_ID);
  assert.equal(output.learnerCycleTargetLearnerId, LEARNER_ID);
  assert.equal(output.learnerCycleProgramId, PROGRAM_ID);
  assert.equal(output.learnerCycleTaskCardId, TASK_CARD_ID);
  assert.equal(output.learnerCyclePlanDraftId, "lgplan_cycle_1");
  assert.equal(output.learnerCycleSubject, "science");
  assert.deepEqual(output.learnerCycleTargetNodeIds, [TARGET_NODE_ID]);
  assert.equal(output.learnerCycleTargetNodeCount, 1);
  assert.equal(output.learnerCycleCardAvailable, true);
  assert.equal(output.learnerCycleCardStatus, "completed");
  assert.equal(output.learnerCycleLatestEvaluationJobStatus, "done");
  assert.equal(output.learnerCycleSubmissionAvailable, true);
  assert.equal(output.learnerCycleSubmissionStatus, "submitted");
  assert.equal(output.learnerCycleSubmissionHasAudio, true);
  assert.equal(output.learnerCycleSubmissionEvaluationJobStatus, "pending");
  assert.equal(output.learnerCycleEvaluationQueueAvailable, true);
  assert.equal(output.learnerCycleEvaluationProcessedCount, 1);
  assert.equal(output.learnerCycleEvaluationDoneCount, 1);
  assert.equal(output.learnerCycleStageAssessmentCycleCount, 1);
  assert.equal(output.learnerCycleStageAssessmentCompletionCount, 1);
  assert.equal(output.learnerCycleStageAssessmentLatestCycleId, "stage_cycle_1");
  assert.equal(output.learnerCycleStageAssessmentLatestStatus, "cooldown");
  assert.equal(output.learnerCycleStageAssessmentLatestGeneratedTaskCardId, TASK_CARD_ID);
  assert.equal(output.learnerCycleStageAssessmentLatestCooldownUntil, "2026-06-20T01:05:00.000Z");
  assert.equal(output.learnerCycleReflectionAvailable, true);
  assert.equal(output.learnerCycleReflectionHasAudio, true);
  assert.equal(output.learnerCycleAuditAvailable, true);
  assert.equal(output.learnerCycleAuditEvidenceCount, 2);
  assert.equal(output.learnerCycleAuditProfileDeltaCount, 1);
  assert.equal(output.learnerCycleAuditHasPublishedPlan, true);
  assert.equal(output.learnerCycleAuditTimelineCount, 1);
  assert.equal(output.learnerCycleCompletenessAvailable, true);
  assert.equal(output.learnerCycleComplete, true);
  assert.equal(output.learnerCycleReadyForAutomation, true);
  assert.equal(output.learnerCycleRequiredCount, 3);
  assert.equal(output.learnerCycleSatisfiedRequiredCount, 3);
  assert.equal(output.learnerCycleMissingRequiredCount, 0);
  assert.equal(output.learnerCycleFindingCount, 2);
  assert.equal(output.learnerCycleFailedFindingCount, 0);
});

test("learner-cycle smoke script defaults to no-write audit", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", WORKSPACE_ID,
      "--learner-id", LEARNER_ID,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stdout || result.stderr);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.operation, "audit");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.learnerCycleStatus, "pass");
    assert.equal(output.learnerCycleOperation, "audit");
    assert.equal(output.learnerCycleWriteOperation, false);
    assert.equal(output.learnerCycleTargetWorkspaceId, WORKSPACE_ID);
    assert.equal(output.learnerCycleTargetLearnerId, LEARNER_ID);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("learner-cycle smoke script rejects write operations without explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--operation", "full",
      ...baseArgs("lgplan_cycle_1"),
      "--text", "This should not be written.",
      "--reflection", "This reflection should not be written."
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 2);
    assert.deepEqual(parseStdout(result), {
      ok: false,
      error: "learner_cycle_smoke_write_not_allowed",
      operation: "full",
      requiredFlag: "--allow-write"
    });

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("learner-cycle smoke script runs submit, single evaluation, reflection, profile, and audit through services", () => {
  withPreparedDb(({ dir, dbPath, planDraftId }) => {
    const submissionText = `${RAW_SUBMISSION_MARKER} The changed variable is light. I measured plant height because the result shows whether light made a difference. I would compare it with the same plant type and water.`;
    const reflectionText = `${RAW_REFLECTION_MARKER} I checked the measured result after writing the changed variable.`;
    const result = runScript([
      "--operation", "full",
      "--allow-write",
      ...baseArgs(planDraftId),
      "--text", submissionText,
      "--reflection", reflectionText,
      "--submitted-at", "2026-06-15T01:00:00.000Z",
      "--reflected-at", "2026-06-15T01:10:00.000Z"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stdout || result.stderr);
    const output = parseStdout(result);
    const serialized = JSON.stringify(output);
    assert.equal(output.ok, true);
    assert.equal(output.operation, "full");
    assert.equal(output.schemaVersion, "growth.learningLearnerCycleSmoke.v1");
    assert.ok(output.submission.submissionId);
    assert.equal(output.evaluationQueue.processed, 1);
    assert.ok(output.reflection.reflectionId);
    assert.equal(output.completeness.complete, true);
    assert.deepEqual(output.completeness.summary.missingRequired, []);
    assert.equal(serialized.includes(RAW_SUBMISSION_MARKER), false);
    assert.equal(serialized.includes(RAW_REFLECTION_MARKER), false);
    assert.equal(serialized.includes("rawPrompt"), false);
    assert.equal(serialized.includes("answerKey"), false);

    const db = new DatabaseSync(dbPath, { open: true });
    try {
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_task_submissions").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_evaluations").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_task_reflections").get().count, 1);
      assert.equal(db.prepare("SELECT status, attempt_count FROM learning_growth_evaluation_jobs").get().status, "done");
      assert.ok(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_evidence_ledger").get().count >= 1);
      assert.ok(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_profile_delta_audits").get().count >= 1);
      assert.ok(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_mastery_states").get().count >= 1);
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = ?").get(TASK_CARD_ID).status, "completed");
    } finally {
      db.close();
    }

    const stateResult = runLoopStateScript([
      ...baseArgs(""),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_GATEWAY_AUTHORING_ENDPOINT: "http://127.0.0.1:9/fake-authoring",
      GROWTH_GATEWAY_EVALUATION_ENDPOINT: "http://127.0.0.1:9/fake-evaluation",
      GROWTH_GATEWAY_PLANNER_ENDPOINT: "http://127.0.0.1:9/fake-planner"
    });

    assert.equal(stateResult.status, 0, stateResult.stdout || stateResult.stderr);
    const stateOutput = parseStdout(stateResult);
    const stateSerialized = JSON.stringify(stateOutput);
    assert.equal(stateOutput.ok, true);
    assert.equal(stateOutput.schemaVersion, "growth.learningLoopState.v1");
    assert.equal(stateOutput.privacyClass, "summary_only");
    assert.equal(stateOutput.status, "ready_to_draft");
    assert.equal(stateOutput.audit.complete, true);
    assert.equal(stateOutput.audit.readyForAutomation, true);
    assert.deepEqual(stateOutput.audit.missingRequired, []);
    assert.equal(stateOutput.recommendation.available, true);
    assert.equal(stateOutput.recommendation.targetNodeId, TARGET_NODE_ID);
    assert.equal(stateOutput.nextAction.action, "draft_daily_plan");
    assert.equal(String(stateOutput.nextAction.reason || "").startsWith("next_strategy:"), true);
    assert.equal(stateSerialized.includes(RAW_SUBMISSION_MARKER), false);
    assert.equal(stateSerialized.includes(RAW_REFLECTION_MARKER), false);
    assert.equal(stateSerialized.includes("rawPrompt"), false);
    assert.equal(stateSerialized.includes("answerKey"), false);
  });
});

test("learner-cycle smoke script fails closed for privacy-risk input, missing input, and invalid JSON", () => {
  withTempDb(({ dir, dbPath }) => {
    const privacy = runScript([
      "--workspace-id", WORKSPACE_ID,
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(privacy.status, 1);
    const privacyOutput = parseStdout(privacy);
    assert.equal(privacyOutput.ok, false);
    assert.equal(privacyOutput.error, "learning_learner_cycle_privacy_failed");
    assert.equal(privacyOutput.privacyFindings.includes("$.rawPrompt"), true);
  });

  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.deepEqual(parseStdout(missingWorkspace), {
    ok: false,
    error: "workspace_id_required"
  });

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "learner_cycle_smoke_invalid_json",
    option: "--input-json"
  });
});
