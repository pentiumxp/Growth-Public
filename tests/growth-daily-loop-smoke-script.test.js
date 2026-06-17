const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-daily-loop.js");

const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectDailyLoopSmokeReadback,
  runOperation,
  targetNodeIds,
  validateOperation
} = require("../scripts/smoke-growth-daily-loop");

const WORKSPACE_ID = "weixin_fanfan";
const LEARNER_ID = "fanfan";
const PROGRAM_ID = "program_science";
const DOMAIN_PACK_ID = "uk_hk_curriculum_foundation";
const SCIENCE_NODE_ID = "kg_science_fair_test";
const SCIENCE_PREREQ_NODE_ID = "kg_science_observation_language";

function graphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_daily_loop_smoke",
    version: "2026-06-15-test",
    privacyClass: "summary_only",
    sourceDocuments: [{
      sourceRef: "public:science-fair-test",
      title: "Science fair-test summary",
      localPath: ""
    }],
    domainPacks: [{
      domainPackId: DOMAIN_PACK_ID,
      domain: "science",
      title: "UK/HK curriculum foundation science test pack",
      sourceKind: "owner_manual",
      version: "2026-06-15-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
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
        version: "2026-06-15-test",
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
        version: "2026-06-15-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Explain how one changed variable affects a measured result."],
        evidenceRequired: ["explain_controlled_variable", "explain_measured_result"]
      }
    ],
    edges: [{
      edgeId: "edge_observation_to_fair_test",
      fromNodeId: SCIENCE_PREREQ_NODE_ID,
      toNodeId: SCIENCE_NODE_ID,
      edgeType: "prerequisite",
      confidence: "medium",
      rationale: "Fair-test reasoning needs clear observation language.",
      sourceRef: "public:science-fair-test"
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

function validPlanDraft(context = {}) {
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
      reason: "Recent summary-only profile evidence calls for measured-result reasoning.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: [],
      profileSnapshotId: "profile_v2_daily_loop_smoke"
    }
  };
}

function validCardDraft(request = {}) {
  const targetNodeId = request.learningGraphPlan?.targetNodeId || SCIENCE_NODE_ID;
  const role = request.cardRole || request.learningGraphPlan?.cardSequence?.[0]?.cardRole || "teaching";
  return {
    schemaVersion: request.cardSchemaVersion || "growth.card.authoring.v1",
    cardRole: role,
    title: "Fair-test reasoning practice",
    targetNodeIds: [targetNodeId],
    expectedTimeMinutes: 12,
    difficultyBasis: "Use summary-only graph and profile context.",
    supportLevel: "guided",
    teachingFlow: {
      learningTarget: "Explain how one changed variable affects a measured result.",
      prerequisites: [{ id: SCIENCE_PREREQ_NODE_ID, label: "Observation language", evidence: "summary_only" }],
      microLesson: { instruction: "A fair test changes one thing and measures the result." },
      workedExample: {
        instruction: "If light changes and plant height is measured, light is the changed variable.",
        steps: [{ label: "Measure", text: "Name the measured result before explaining the effect." }]
      },
      guidedPractice: {
        mode: "short_answer",
        instruction: "Name the changed variable and the measured result."
      },
      quickCheck: {
        mode: "short_answer",
        instruction: "Which result would show the variable made a difference?"
      },
      tooHardFallback: {
        action: "show_sentence_frame",
        reason: "Use: I changed __ and measured __."
      }
    },
    evidenceToRecord: ["explain_controlled_variable", "explain_measured_result"]
  };
}

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-daily-loop-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const db = new DatabaseSync(dbPath, { open: true });
  db.close();
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
    } finally {
      db.close();
    }
    const store = createGrowthLearningSqliteStore({ dbPath });
    store.learningGraphRepository.importPack({
      pack: graphPack(),
      validation: { validation: {}, warnings: [] },
      sourceFile: "daily-loop-smoke-graph.json",
      sourceSha256: "daily-loop-smoke-sha256"
    });
    return callback({ dir, dbPath });
  });
}

async function withPreparedDbAsync(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-daily-loop-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const db = new DatabaseSync(dbPath, { open: true });
    try {
      createLearningTables(db);
    } finally {
      db.close();
    }
    const store = createGrowthLearningSqliteStore({ dbPath });
    store.learningGraphRepository.importPack({
      pack: graphPack(),
      validation: { validation: {}, warnings: [] },
      sourceFile: "daily-loop-smoke-graph.json",
      sourceSha256: "daily-loop-smoke-sha256"
    });
    return await callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function runScriptAsync(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, env),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (status, signal) => {
      resolve({
        status,
        signal,
        stdout,
        stderr
      });
    });
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

async function withFakeGateway(callback) {
  const calls = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      calls.push(payload);
      let output;
      if (payload.kind === "growth.learning_planner.draft") {
        output = validPlanDraft(payload.input || {});
      } else if (payload.kind === "growth.card_authoring.generate") {
        output = validCardDraft(payload.input || {});
      } else {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "unexpected_gateway_kind", kind: payload.kind || "" }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ output_text: JSON.stringify(output) }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    return await callback({
      calls,
      endpoint: `http://127.0.0.1:${address.port}/gateway`
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function gatewayEnv(endpoint) {
  return {
    GROWTH_GATEWAY_PLANNER_ENDPOINT: endpoint,
    GROWTH_GATEWAY_PLANNER_PROTOCOL: "generic",
    GROWTH_GATEWAY_AUTHORING_ENDPOINT: endpoint,
    GROWTH_GATEWAY_AUTHORING_PROTOCOL: "generic"
  };
}

function baseArgs() {
  return [
    "--workspace-id", WORKSPACE_ID,
    "--learner-id", LEARNER_ID,
    "--program-id", PROGRAM_ID,
    "--domain-pack-id", DOMAIN_PACK_ID,
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", SCIENCE_NODE_ID,
    "--json"
  ];
}

test("daily-loop smoke script parses operation, write guard, scope, item, and graph selectors", () => {
  const args = [
    "--operation", "publish",
    "--allow-write",
    "--workspace-id", WORKSPACE_ID,
    "--learner-id", LEARNER_ID,
    "--program-id", PROGRAM_ID,
    "--plan-draft-id", "lgplan_daily_1",
    "--selected-item-id", "plan_item_1",
    "--domain-pack-id", DOMAIN_PACK_ID,
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", SCIENCE_NODE_ID,
    "--target-node-ids", `${SCIENCE_NODE_ID},${SCIENCE_PREREQ_NODE_ID}`,
    "--generation-key", "daily-loop-smoke-card",
    "--requested-by", "owner"
  ];

  assert.equal(operationFromArgs(args), "publish");
  assert.equal(allowWrite(args), true);
  assert.deepEqual(targetNodeIds(args), [SCIENCE_NODE_ID, SCIENCE_PREREQ_NODE_ID]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: WORKSPACE_ID,
    learnerId: LEARNER_ID,
    programId: PROGRAM_ID,
    planDraftId: "lgplan_daily_1",
    taskCardId: "",
    evaluationId: "",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    domainPackId: DOMAIN_PACK_ID,
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 12,
    itemId: "plan_item_1",
    selectedItemId: "plan_item_1",
    targetNodeIds: [SCIENCE_NODE_ID, SCIENCE_PREREQ_NODE_ID],
    generationKey: "daily-loop-smoke-card",
    requestedBy: "owner"
  });
  assert.equal(validateOperation("publish", inputFromArgs(args), args).ok, true);
  assert.deepEqual(validateOperation("advance", inputFromArgs(args), args.filter((item) => item !== "--allow-write")), {
    ok: false,
    error: "daily_loop_smoke_write_not_allowed",
    operation: "advance",
    requiredFlag: "--allow-write"
  });
  assert.equal(validateOperation("advance", inputFromArgs(args), args).ok, true);
});

test("daily-loop smoke script projects top-level operator readback", () => {
  const output = projectDailyLoopSmokeReadback({
    ok: true,
    source: "growth-learning-daily-loop-service",
    operation: "publish",
    target: {
      workspaceId: WORKSPACE_ID,
      learnerId: LEARNER_ID
    },
    scope: {
      programId: PROGRAM_ID,
      domainPackId: DOMAIN_PACK_ID,
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 12,
      targetNodeIds: [SCIENCE_NODE_ID, SCIENCE_PREREQ_NODE_ID]
    },
    readiness: {
      ready: true,
      targetEnabled: true,
      targetProvisioned: true,
      learningGraphReady: true,
      plannerReady: true,
      plannerContextReady: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      operatingLoopGatewayReady: true,
      blockingOpenGeneration: false,
      targetProvisioning: {
        ok: true,
        targetEnabled: true,
        mode: "existing"
      }
    },
    actions: {
      canDraft: true,
      canAdvance: true,
      canPublish: true,
      draftAction: { enabled: true },
      advanceAction: { enabled: true },
      publishAction: {
        enabled: true,
        planDraftId: "lgplan_daily_1",
        itemId: "plan_item_science_fair_test"
      },
      auditRefreshAction: { enabled: true }
    },
    planDraft: {
      planDraftId: "lgplan_daily_1",
      programId: PROGRAM_ID,
      horizon: "daily_plan",
      status: "published",
      selectedItemId: "plan_item_science_fair_test",
      generatedTaskCardId: "ltask_daily_1",
      generatedLearningGraphPlanId: "lgplan_graph_1",
      targetNodeIds: [SCIENCE_NODE_ID],
      itemCount: 1,
      selectedItem: {
        itemId: "plan_item_science_fair_test",
        cardRole: "repair",
        estimatedMinutes: 12,
        evidenceRequirements: ["explain_controlled_variable"]
      },
      publishAttempt: {
        status: "published",
        stage: "complete",
        attemptCount: 1
      }
    },
    selectedItem: {
      itemId: "plan_item_science_fair_test",
      cardRole: "repair",
      estimatedMinutes: 12,
      evidenceRequirements: ["explain_controlled_variable"]
    },
    generation: {
      ok: true,
      recipeId: "daily_science_v1",
      gatewayMode: "fake_gateway",
      sourceSummaryCount: 2,
      learningGraphPlan: {
        learningGraphPlanId: "lgplan_graph_1",
        targetNodeId: SCIENCE_NODE_ID,
        targetNodeIds: [SCIENCE_NODE_ID],
        domainPackId: DOMAIN_PACK_ID,
        domain: "science",
        subject: "science",
        cardRole: "repair"
      },
      published: {
        taskCardId: "ltask_daily_1",
        transaction: "committed",
        status: "published"
      },
      recommendationAcceptance: {
        ok: true,
        recommendationId: "lgrec_1",
        status: "accepted"
      }
    },
    cycleAudit: {
      ok: true,
      summary: {
        evidenceCount: 2,
        profileDeltaCount: 1
      }
    },
    completeness: {
      complete: true,
      readyForAutomation: true,
      summary: {
        missingRequired: []
      }
    },
    duplicate: false,
    publishAttempt: {
      status: "published",
      stage: "complete",
      attemptCount: 1
    }
  });

  assert.equal(output.dailyLoopOperation, "publish");
  assert.equal(output.dailyLoopOutcome, "published");
  assert.equal(output.dailyLoopWriteOperation, true);
  assert.equal(output.dailyLoopTargetWorkspaceId, WORKSPACE_ID);
  assert.equal(output.dailyLoopTargetLearnerId, LEARNER_ID);
  assert.equal(output.dailyLoopProgramId, PROGRAM_ID);
  assert.equal(output.dailyLoopDomainPackId, DOMAIN_PACK_ID);
  assert.equal(output.dailyLoopDomain, "science");
  assert.equal(output.dailyLoopSubject, "science");
  assert.equal(output.dailyLoopHorizon, "daily_plan");
  assert.equal(output.dailyLoopAvailableMinutes, 12);
  assert.deepEqual(output.dailyLoopTargetNodeIds, [SCIENCE_NODE_ID, SCIENCE_PREREQ_NODE_ID]);
  assert.equal(output.dailyLoopReadinessReady, true);
  assert.equal(output.dailyLoopTargetProvisioned, true);
  assert.equal(output.dailyLoopPlannerReady, true);
  assert.equal(output.dailyLoopOperatingLoopGatewayReady, true);
  assert.equal(output.dailyLoopCanDraft, true);
  assert.equal(output.dailyLoopCanAdvance, true);
  assert.equal(output.dailyLoopCanPublish, true);
  assert.equal(output.dailyLoopPlanDraftId, "lgplan_daily_1");
  assert.equal(output.dailyLoopPlanDraftStatus, "published");
  assert.equal(output.dailyLoopPlanItemCount, 1);
  assert.equal(output.dailyLoopSelectedItemId, "plan_item_science_fair_test");
  assert.equal(output.dailyLoopSelectedCardRole, "repair");
  assert.equal(output.dailyLoopSelectedEstimatedMinutes, 12);
  assert.equal(output.dailyLoopGeneratedTaskCardId, "ltask_daily_1");
  assert.equal(output.dailyLoopGeneratedLearningGraphPlanId, "lgplan_graph_1");
  assert.equal(output.dailyLoopPublishedTaskCardId, "ltask_daily_1");
  assert.equal(output.dailyLoopPublishTransaction, "committed");
  assert.equal(output.dailyLoopGenerationRecipeId, "daily_science_v1");
  assert.equal(output.dailyLoopGenerationSourceSummaryCount, 2);
  assert.equal(output.dailyLoopRecommendationAccepted, true);
  assert.equal(output.dailyLoopRecommendationId, "lgrec_1");
  assert.equal(output.dailyLoopPublishAttemptStatus, "published");
  assert.equal(output.dailyLoopPublishAttemptCount, 1);
  assert.equal(output.dailyLoopCycleAuditAvailable, true);
  assert.equal(output.dailyLoopCycleEvidenceCount, 2);
  assert.equal(output.dailyLoopCompletenessAvailable, true);
  assert.equal(output.dailyLoopCycleComplete, true);
  assert.equal(output.dailyLoopReadyForAutomation, true);
  assert.equal(output.dailyLoopMissingRequiredCount, 0);
});

test("daily-loop smoke script delegates advance to the daily-loop service", async () => {
  const calls = [];
  const result = await runOperation({
    learningDailyLoopService: {
      advance(input) {
        calls.push(input);
        return {
          ok: true,
          operation: "advance",
          stage: "published",
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          scope: { targetNodeIds: input.targetNodeIds || [] },
          readiness: {},
          actions: {},
          planDraft: { planDraftId: "lgplan_advance_1" },
          generation: { published: { taskCardId: "ltask_advance_1" } }
        };
      }
    }
  }, "advance", {
    workspaceId: WORKSPACE_ID,
    learnerId: LEARNER_ID,
    targetNodeIds: [SCIENCE_NODE_ID]
  });

  assert.equal(result.operation, "advance");
  assert.equal(result.stage, "published");
  assert.deepEqual(calls, [{
    workspaceId: WORKSPACE_ID,
    learnerId: LEARNER_ID,
    targetNodeIds: [SCIENCE_NODE_ID]
  }]);
});

test("daily-loop smoke script defaults to no-write preview", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript(baseArgs(), {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.operation, "preview");
    assert.equal(output.dailyLoopOperation, "preview");
    assert.equal(output.dailyLoopWriteOperation, false);
    assert.equal(output.dailyLoopTargetWorkspaceId, WORKSPACE_ID);
    assert.equal(output.dailyLoopTargetLearnerId, LEARNER_ID);
    assert.equal(output.dailyLoopDomain, "science");
    assert.equal(output.dailyLoopSubject, "science");
    assert.equal(output.dailyLoopTargetNodeCount, 1);
    assert.equal(output.dailyLoopCanDraft, output.actions.canDraft || output.actions.draftAction.enabled);
    assert.equal(output.dailyLoopCanPublish, output.actions.canPublish || output.actions.publishAction.enabled);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("daily-loop smoke script rejects draft, publish, and advance without explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const draft = runScript(["--operation", "draft", ...baseArgs()], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(draft.status, 2);
    assert.deepEqual(parseStdout(draft), {
      ok: false,
      error: "daily_loop_smoke_write_not_allowed",
      operation: "draft",
      requiredFlag: "--allow-write"
    });

    const publish = runScript(["--operation", "publish", "--plan-draft-id", "lgplan_missing", ...baseArgs()], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(publish.status, 2);
    assert.deepEqual(parseStdout(publish), {
      ok: false,
      error: "daily_loop_smoke_write_not_allowed",
      operation: "publish",
      requiredFlag: "--allow-write"
    });

    const advance = runScript(["--operation", "advance", ...baseArgs()], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(advance.status, 2);
    assert.deepEqual(parseStdout(advance), {
      ok: false,
      error: "daily_loop_smoke_write_not_allowed",
      operation: "advance",
      requiredFlag: "--allow-write"
    });

    const db = new DatabaseSync(dbPath, { open: true });
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get("learning_growth_plan_drafts");
    db.close();
    assert.equal(table, undefined);
  });
});

test("daily-loop smoke script drafts a summary-only plan only with explicit write flag", async () => {
  await withFakeGateway(async ({ calls, endpoint }) => {
    await withPreparedDbAsync(async ({ dir, dbPath }) => {
      const result = await runScriptAsync([
        "--operation", "draft",
        "--allow-write",
        ...baseArgs()
      ], Object.assign({
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      }, gatewayEnv(endpoint)));

      assert.equal(result.status, 0, result.stdout || result.stderr);
      const output = parseStdout(result);
      assert.equal(output.ok, true);
      assert.equal(output.operation, "draft");
      assert.equal(output.dailyLoopOperation, "draft");
      assert.equal(output.dailyLoopOutcome, "drafted");
      assert.equal(output.dailyLoopWriteOperation, true);
      assert.equal(output.planDraft.status, "draft");
      assert.equal(output.dailyLoopPlanDraftId, output.planDraft.planDraftId);
      assert.equal(output.dailyLoopPlanDraftStatus, "draft");
      assert.equal(output.dailyLoopPlanItemCount, output.planDraft.itemCount);
      assert.equal(output.dailyLoopGenerationOk, false);
      assert.equal(output.planDraft.privacyClass, "summary_only");
      assert.equal(output.planDraft.items[0].itemId, "plan_item_science_fair_test");
      assert.equal(calls.some((call) => call.kind === "growth.learning_planner.draft"), true);

      const db = new DatabaseSync(dbPath, { open: true });
      const row = db.prepare("SELECT status, privacy_class FROM learning_growth_plan_drafts").get();
      db.close();
      assert.equal(row.status, "draft");
      assert.equal(row.privacy_class, "summary_only");
    });
  });
});

test("daily-loop smoke script publishes a selected daily plan item only with explicit write flag", async () => {
  await withFakeGateway(async ({ calls, endpoint }) => {
    await withPreparedDbAsync(async ({ dir, dbPath }) => {
      const env = Object.assign({
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      }, gatewayEnv(endpoint));
      const draft = await runScriptAsync([
        "--operation", "draft",
        "--allow-write",
        ...baseArgs()
      ], env);
      assert.equal(draft.status, 0, draft.stdout || draft.stderr);
      const draftOutput = parseStdout(draft);
      const planDraftId = draftOutput.planDraft.planDraftId;
      const itemId = draftOutput.planDraft.items[0].itemId;

      const publish = await runScriptAsync([
        "--operation", "publish",
        "--allow-write",
        "--plan-draft-id", planDraftId,
        "--item-id", itemId,
        "--generation-key", "daily-loop-smoke-publish",
        ...baseArgs()
      ], env);

      assert.equal(publish.status, 0, publish.stdout || publish.stderr);
      const output = parseStdout(publish);
      assert.equal(output.ok, true);
      assert.equal(output.operation, "publish");
      assert.equal(output.dailyLoopOperation, "publish");
      assert.equal(output.dailyLoopOutcome, "published");
      assert.equal(output.dailyLoopWriteOperation, true);
      assert.equal(output.planDraft.status, "published");
      assert.equal(output.dailyLoopPlanDraftId, planDraftId);
      assert.equal(output.dailyLoopPlanDraftStatus, "published");
      assert.equal(output.dailyLoopSelectedItemId, itemId);
      assert.equal(output.selectedItem.itemId, itemId);
      assert.equal(output.generation.learningGraphPlan.targetNodeId, SCIENCE_NODE_ID);
      assert.equal(output.generation.published.transaction, "committed");
      assert.ok(output.generation.published.taskCardId);
      assert.equal(output.dailyLoopPublishedTaskCardId, output.generation.published.taskCardId);
      assert.equal(output.dailyLoopGeneratedTaskCardId, output.generation.published.taskCardId);
      assert.equal(output.dailyLoopGeneratedLearningGraphPlanId, output.generation.learningGraphPlan.learningGraphPlanId);
      assert.equal(output.dailyLoopPublishTransaction, "committed");
      assert.equal(output.dailyLoopGenerationOk, true);
      assert.equal(JSON.stringify(output).includes("teachingFlow"), false);
      assert.equal(calls.some((call) => call.kind === "growth.card_authoring.generate"), true);

      const db = new DatabaseSync(dbPath, { open: true });
      const plan = db.prepare("SELECT status, selected_item_id, generated_task_card_id FROM learning_growth_plan_drafts WHERE plan_draft_id = ?")
        .get(planDraftId);
      const card = db.prepare("SELECT id, status, card_role, planned_minutes, expected_duration_minutes_min, expected_duration_minutes_max FROM learning_task_cards WHERE id = ?")
        .get(output.generation.published.taskCardId);
      db.close();
      assert.equal(plan.status, "published");
      assert.equal(plan.selected_item_id, itemId);
      assert.equal(plan.generated_task_card_id, output.generation.published.taskCardId);
      assert.equal(card.status, "published");
      assert.equal(card.card_role, "teaching");
      assert.equal(card.planned_minutes, 12);
      assert.equal(card.expected_duration_minutes_min, 10);
      assert.equal(card.expected_duration_minutes_max, 15);
    });
  });
});

test("daily-loop smoke script fails closed for invalid JSON and missing publish draft id", () => {
  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "daily_loop_smoke_invalid_json",
    option: "--input-json"
  });

  const missingDraft = runScript(["--operation", "publish", "--allow-write", ...baseArgs()]);
  assert.equal(missingDraft.status, 2);
  assert.deepEqual(parseStdout(missingDraft), {
    ok: false,
    error: "daily_loop_smoke_plan_draft_id_required",
    operation: "publish"
  });
});
