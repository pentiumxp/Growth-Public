"use strict";

const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const DAILY_LOOP_SCRIPT = path.join(repoRoot, "scripts", "smoke-growth-daily-loop.js");
const LEARNER_CYCLE_SCRIPT = path.join(repoRoot, "scripts", "smoke-growth-learner-cycle.js");
const PROFILE_FEEDBACK_SCRIPT = path.join(repoRoot, "scripts", "smoke-growth-profile-feedback.js");
const LOOP_STATE_SCRIPT = path.join(repoRoot, "scripts", "smoke-growth-learning-loop-state.js");

function cleanString(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map((value) => cleanString(value, 180)).filter(Boolean)));
}

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function collectRepeatedValues(args, names) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      const value = cleanString(args[index + 1], 180);
      if (value) values.push(value);
    }
  }
  return values;
}

function collectCsvValues(args, names) {
  return firstArgValue(args, names, "")
    .split(",")
    .map((value) => cleanString(value, 180))
    .filter(Boolean);
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function boundedNumberArg(args, names, fallback, min = 1, max = 60) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function safeId(value = "") {
  const slug = cleanString(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (slug) return slug.slice(0, 80);
  return crypto.createHash("sha256").update(String(value || "daily"), "utf8").digest("hex").slice(0, 16);
}

function firstCandidateNode(context = {}) {
  return asArray(context.knowledgeGraph?.candidateNodes)[0] || {};
}

function evidenceRequirementsFromNode(node = {}, fallback = []) {
  return uniqueStrings(node.evidenceRequired || node.evidence_required || fallback).slice(0, 8);
}

function validPlanDraft(context = {}) {
  const node = firstCandidateNode(context);
  const nodeId = cleanString(node.nodeId || node.node_id || "kg_local_daily_target", 180);
  const subject = cleanString(node.subject || context.knowledgeGraph?.subject || "science", 120);
  const allowedRoles = uniqueStrings(context.constraints?.allowedCardRoles || []);
  const cardRole = allowedRoles.includes("practice")
    ? "practice"
    : allowedRoles.includes("teaching")
      ? "teaching"
      : "practice";
  const evidenceRequirements = evidenceRequirementsFromNode(node, ["short_answer", "science_reasoning"]);
  return {
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: cleanString(context.horizon || "daily_plan", 80),
    planSummary: `Use one low-pressure ${subject} daily card for ${cleanString(node.title || nodeId, 120)}.`,
    items: [{
      itemId: `plan_item_${safeId(nodeId)}`,
      cardRole,
      subject,
      targetNodeIds: [nodeId],
      estimatedMinutes: Math.min(15, Math.max(10, Number(context.constraints?.availableMinutes || 12) || 12)),
      difficultyBand: cleanString(node.stage || "foundation", 80) || "foundation",
      supportLevel: "guided",
      evidenceRequirements,
      reason: "Local fake Gateway harness selected the scoped graph candidate for a low-pressure daily card.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: [],
      profileSnapshotId: `profile_v2_${safeId(context.target?.learnerId || context.target?.workspaceId || "learner")}`
    }
  };
}

function validCardDraft(request = {}) {
  const plan = request.learningGraphPlan || {};
  const sequence = asArray(plan.cardSequence)[0] || {};
  const targetNodeIds = uniqueStrings(
    plan.targetNodeIds || plan.pathNodeIds || sequence.targetNodeIds || [plan.targetNodeId || sequence.targetNodeId]
  );
  const targetNodeId = targetNodeIds[0] || "kg_local_daily_target";
  const subject = cleanString(request.subject || plan.subject || "science", 120);
  const role = cleanString(request.cardRole || sequence.cardRole || "practice", 80) || "practice";
  const evidence = uniqueStrings(
    request.evidenceRequirements || sequence.evidenceRequired || sequence.evidenceRequirements || ["short_answer", "science_reasoning"]
  ).slice(0, 8);
  const titleSubject = subject ? `${subject[0].toUpperCase()}${subject.slice(1)}` : "Daily";
  return {
    schemaVersion: cleanString(request.cardSchemaVersion || "growth.card.authoring.v1", 80),
    cardRole: role,
    title: `${titleSubject} daily practice`,
    targetNodeIds: [targetNodeId],
    expectedTimeMinutes: 12,
    difficultyBasis: "Scoped graph node, learner profile summary, and low-pressure daily policy.",
    supportLevel: cleanString(request.supportLevel || sequence.supportLevel || "guided", 80) || "guided",
    teachingFlow: {
      learningTarget: `Explain the key idea for ${targetNodeId} in a short daily answer.`,
      prerequisites: uniqueStrings(plan.prerequisiteNodeIds || []).map((id) => ({
        id,
        label: "Prerequisite node",
        evidence: "summary_only"
      })).slice(0, 4),
      microLesson: {
        instruction: "Read the prompt, name the important idea, then explain it with one concrete observation or example."
      },
      workedExample: {
        instruction: "A strong answer states the idea first and then links it to what can be observed or measured.",
        steps: [
          { label: "Name", text: "Name the science idea." },
          { label: "Connect", text: "Connect it to one observation, measurement, or example." }
        ]
      },
      guidedPractice: {
        mode: "short_answer",
        instruction: "Write two or three sentences that explain the idea and give one example."
      },
      quickCheck: {
        mode: "short_answer",
        instruction: "What observation or evidence would show your explanation is reasonable?",
        expectedEvidence: evidence
      },
      tooHardFallback: {
        action: "show_sentence_frame",
        reason: "Use: The key idea is __. I know because __."
      }
    },
    evidenceToRecord: evidence
  };
}

function firstRubricDimension(policy = {}) {
  return cleanString(asArray(policy.rubricDimensions)[0]?.dimensionId || "", 160);
}

function validEvaluationDraft(request = {}) {
  const targetNodeId = uniqueStrings(request.card?.targetNodeIds || [])[0] || "kg_local_daily_target";
  const dimensionId = firstRubricDimension(request.card?.rubricPolicy || {});
  const skillResult = {
    nodeId: targetNodeId,
    rubricDimensionId: dimensionId,
    score: 82,
    confidence: 0.82,
    status: "developing",
    evidenceType: "learner_submission_summary",
    evidenceTags: ["short_answer", "reasoning"],
    evidenceSummary: "The learner gave a relevant short explanation with one concrete link."
  };
  const rubricResult = dimensionId ? {
    dimensionId,
    nodeId: targetNodeId,
    score: 82,
    confidence: 0.82,
    status: "developing",
    evidenceType: "learner_submission_summary",
    evidenceTags: ["short_answer", "reasoning"],
    evidenceSummary: "The learner gave a relevant short explanation with one concrete link."
  } : null;
  return {
    schemaVersion: "growth.card.evaluation.v1",
    status: "completed",
    score: 82,
    maxScore: 100,
    passed: true,
    confidence: 0.84,
    summary: "The answer shows the target idea and connects it to evidence. One next step is to make the evidence more specific.",
    strengths: ["Clear daily-card reasoning."],
    remainingWeaknesses: ["Make the evidence or measurement more specific next time."],
    feedbackSections: {
      strengths: ["Clear daily-card reasoning."],
      focusAreas: ["Make the evidence or measurement more specific next time."],
      reflectionPrompts: ["What detail would make the evidence clearer?"],
      nextPractice: "Use one named observation or measurement in the next answer."
    },
    skillResults: [skillResult],
    rubricResults: rubricResult ? [rubricResult] : [],
    evidenceRefs: ["local-fake-gateway:evaluation"]
  };
}

function outputForGatewayPayload(payload = {}) {
  if (payload.kind === "growth.learning_planner.draft") return validPlanDraft(payload.input || {});
  if (payload.kind === "growth.learning_planner.repair") return validPlanDraft(payload.input?.context || payload.input?.request || {});
  if (payload.kind === "growth.card_authoring.generate") return validCardDraft(payload.input || {});
  if (payload.kind === "growth.card_authoring.repair") return validCardDraft(payload.input?.request || {});
  if (payload.kind === "growth.card_evaluation.evaluate") return validEvaluationDraft(payload.input || {});
  if (payload.kind === "growth.card_evaluation.repair") return validEvaluationDraft(payload.input?.request || {});
  return null;
}

function startFakeGateway() {
  const calls = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      let payload = {};
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch (_error) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_json" }));
        return;
      }
      calls.push({
        kind: cleanString(payload.kind, 120),
        candidateNodeCount: asArray(payload.input?.knowledgeGraph?.candidateNodes).length,
        targetNodeCount: asArray(payload.input?.learningGraphPlan?.targetNodeIds || payload.input?.card?.targetNodeIds).length
      });
      const output = outputForGatewayPayload(payload);
      if (!output) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "unexpected_gateway_kind", kind: cleanString(payload.kind, 120) }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ output_text: JSON.stringify(output) }));
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        calls,
        endpoint: `http://127.0.0.1:${address.port}/gateway`,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}

function parseStdout(result = {}) {
  try {
    return JSON.parse(result.stdout || "{}");
  } catch (error) {
    return {
      ok: false,
      error: "local_daily_cycle_invalid_child_json",
      detail: cleanString(error.message, 160),
      stdout: cleanString(result.stdout, 600)
    };
  }
}

function runNodeScript(scriptPath, args, env, label) {
  const timeoutMs = Math.max(5000, Number(env.GROWTH_LOCAL_DAILY_CYCLE_CHILD_TIMEOUT_MS || 120000) || 120000);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 8 * 1024 * 1024) stdout = stdout.slice(-8 * 1024 * 1024);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 1024 * 1024) stderr = stderr.slice(-1024 * 1024);
    });
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({
          ok: false,
          step: label,
          error: "local_daily_cycle_child_timeout",
          exitStatus: status,
          signal,
          stderr: cleanString(stderr, 800)
        });
        return;
      }
      const output = parseStdout({ stdout });
      if (status !== 0 || output.ok === false) {
        resolve(Object.assign({}, output, {
          ok: false,
          step: label,
          exitStatus: status,
          signal,
          stderr: cleanString(stderr, 800)
        }));
        return;
      }
      resolve(Object.assign({}, output, { step: label }));
    });
  });
}

function pushArg(args, name, value) {
  const text = cleanString(value, 1000);
  if (text) args.push(name, text);
}

function scopeArgs(input = {}) {
  const args = [];
  pushArg(args, "--workspace-id", input.workspaceId);
  pushArg(args, "--learner-id", input.learnerId);
  pushArg(args, "--program-id", input.programId);
  pushArg(args, "--domain-pack-id", input.domainPackId);
  pushArg(args, "--domain", input.domain);
  pushArg(args, "--subject", input.subject);
  pushArg(args, "--horizon", input.horizon || "daily_plan");
  for (const nodeId of input.targetNodeIds || []) {
    pushArg(args, "--target-node-id", nodeId);
  }
  return args;
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], "science"),
    subject: firstArgValue(args, ["--subject"], "science"),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], 15, 1, 60),
    recipeId: firstArgValue(args, ["--recipe-id", "--recipeId"], ""),
    targetNodeIds: targetNodeIds(args),
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], `local-daily-cycle-${Date.now()}`),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], "owner"),
    submittedAt: firstArgValue(args, ["--submitted-at", "--submittedAt"], ""),
    reflectedAt: firstArgValue(args, ["--reflected-at", "--reflectedAt"], ""),
    text: firstArgValue(args, ["--text", "--submission", "--answer"], "I think the key idea is that a fair investigation changes one thing and observes the result. I would name what changed, measure what happened, and compare the result with the same conditions."),
    reflection: firstArgValue(args, ["--reflection", "--reflection-text", "--reflectionText"], "I should make the measured evidence more specific next time."),
    json: hasFlag(args, "--json")
  };
}

function validateInput(input = {}, args = []) {
  if (!hasFlag(args, "--allow-write") && !hasFlag(args, "--allowWrite")) {
    return { ok: false, error: "local_daily_cycle_write_not_allowed", requiredFlag: "--allow-write" };
  }
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required" };
  if (!input.text) return { ok: false, error: "submission_text_required" };
  if (!input.reflection) return { ok: false, error: "reflection_text_required" };
  return { ok: true };
}

function defaultRecipeId(input = {}) {
  const domain = cleanString(input.domain || input.subject, 120).toLowerCase();
  const subject = cleanString(input.subject || input.domain, 120).toLowerCase();
  if (domain === "science" || subject === "science") return "daily_science_v1";
  if (domain === "english" || subject === "english") return "daily_english_v1";
  return "daily_subject_practice_v1";
}

function compactDailyLoop(result = {}) {
  return {
    ok: result.ok !== false,
    operation: cleanString(result.dailyLoopOperation || result.operation, 80),
    outcome: cleanString(result.dailyLoopOutcome, 120),
    planDraftId: cleanString(result.dailyLoopPlanDraftId || result.planDraft?.planDraftId, 180),
    taskCardId: cleanString(result.dailyLoopGeneratedTaskCardId || result.dailyLoopPublishedTaskCardId || result.generation?.published?.taskCardId, 180),
    graphPlanId: cleanString(result.dailyLoopGeneratedLearningGraphPlanId || result.generation?.learningGraphPlan?.learningGraphPlanId, 180),
    domainPackId: cleanString(result.dailyLoopDomainPackId, 160),
    targetNodeIds: uniqueStrings(result.dailyLoopTargetNodeIds || []).slice(0, 8),
    gatewayMode: cleanString(result.dailyLoopGenerationGatewayMode || result.gatewayMode, 80),
    publishedStatus: cleanString(result.dailyLoopPublishedStatus, 120)
  };
}

function compactLearnerCycle(result = {}) {
  return {
    ok: result.ok !== false,
    operation: cleanString(result.learnerCycleOperation || result.operation, 80),
    taskCardId: cleanString(result.learnerCycleTaskCardId || result.target?.taskCardId, 180),
    submissionId: cleanString(result.learnerCycleSubmissionId || result.submission?.submissionId, 180),
    reflectionId: cleanString(result.learnerCycleReflectionId || result.reflection?.reflectionId, 180),
    evaluationProcessedCount: Number(result.learnerCycleEvaluationProcessedCount || result.evaluationQueue?.processed || 0) || 0,
    evaluationDoneCount: Number(result.learnerCycleEvaluationDoneCount || 0) || 0,
    complete: result.learnerCycleComplete === true || result.completeness?.complete === true,
    readyForAutomation: result.learnerCycleReadyForAutomation === true || result.completeness?.readyForAutomation === true,
    missingRequiredCount: Number(result.learnerCycleMissingRequiredCount || 0) || 0
  };
}

async function completeLearnerCycle(env, baseScope, dailySummary, input = {}) {
  const learnerArgs = [
    "--operation", "full",
    "--allow-write",
    ...baseScope,
    "--task-card-id", dailySummary.taskCardId,
    "--plan-draft-id", dailySummary.planDraftId,
    "--text", input.text,
    "--reflection", input.reflection,
    "--author", input.learnerId || input.workspaceId,
    "--json"
  ];
  pushArg(learnerArgs, "--submitted-at", input.submittedAt);
  pushArg(learnerArgs, "--reflected-at", input.reflectedAt);
  const full = await runNodeScript(LEARNER_CYCLE_SCRIPT, learnerArgs, env, "learner_cycle_full");
  if (full.ok) return full;
  const pendingEvaluation = ["pending", "retry", "processing"].includes(cleanString(full.learnerCycleLatestEvaluationJobStatus, 80))
    || ["pending", "retry", "processing"].includes(cleanString(full.learnerCycleSubmissionEvaluationJobStatus, 80));
  if (!pendingEvaluation) return full;
  const evaluate = await runNodeScript(LEARNER_CYCLE_SCRIPT, [
    "--operation", "evaluate",
    "--allow-write",
    ...baseScope,
    "--task-card-id", dailySummary.taskCardId,
    "--plan-draft-id", dailySummary.planDraftId,
    "--json"
  ], env, "learner_cycle_evaluate_pending");
  if (!evaluate.ok || Number(evaluate.learnerCycleEvaluationProcessedCount || evaluate.evaluationQueue?.processed || 0) <= 0) {
    return Object.assign({}, evaluate, {
      ok: false,
      operation: "full",
      stoppedAt: "evaluate",
      submission: full.submission || null
    });
  }
  const reflectArgs = [
    "--operation", "reflect",
    "--allow-write",
    ...baseScope,
    "--task-card-id", dailySummary.taskCardId,
    "--plan-draft-id", dailySummary.planDraftId,
    "--reflection", input.reflection,
    "--author", input.learnerId || input.workspaceId,
    "--json"
  ];
  pushArg(reflectArgs, "--reflected-at", input.reflectedAt);
  const reflect = await runNodeScript(LEARNER_CYCLE_SCRIPT, reflectArgs, env, "learner_cycle_reflect_after_pending");
  if (!reflect.ok) {
    return Object.assign({}, reflect, {
      ok: false,
      operation: "full",
      stoppedAt: "reflect",
      submission: full.submission || null,
      evaluationQueue: evaluate.evaluationQueue || null
    });
  }
  const audit = await runNodeScript(LEARNER_CYCLE_SCRIPT, [
    "--operation", "audit",
    ...baseScope,
    "--task-card-id", dailySummary.taskCardId,
    "--plan-draft-id", dailySummary.planDraftId,
    "--json"
  ], env, "learner_cycle_audit_after_pending");
  return Object.assign({}, audit, {
    ok: audit.ok !== false,
    operation: "full",
    submission: full.submission || null,
    evaluationQueue: evaluate.evaluationQueue || null,
    reflection: reflect.reflection || null,
    resumedPendingSubmission: true
  });
}

function compactProfileFeedback(result = {}) {
  return {
    ok: result.ok !== false,
    status: cleanString(result.profileFeedbackStatus || result.status, 120),
    readyForNextPlan: result.profileFeedbackReadyForNextPlan === true || result.readyForNextPlan === true,
    taskCardId: cleanString(result.profileFeedbackTaskCardId || result.selector?.taskCardId, 180),
    evaluationId: cleanString(result.profileFeedbackEvaluationId || result.selector?.evaluationId, 180),
    profileDeltaId: cleanString(result.profileFeedbackProfileDeltaId || result.selector?.profileDeltaId, 180),
    evidenceCount: Number(result.profileFeedbackEvidenceCount || result.evidenceCount || 0) || 0,
    profileDeltaCount: Number(result.profileFeedbackProfileDeltaCount || result.profileDeltaCount || 0) || 0
  };
}

function compactLoopState(result = {}) {
  return {
    ok: result.ok !== false,
    status: cleanString(result.loopStateStatus || result.status, 120),
    nextAction: cleanString(result.loopStateNextAction || result.nextAction?.action, 160),
    readyForAutomation: result.loopStateReadyForAutomation === true || result.audit?.readyForAutomation === true,
    recommendationAvailable: result.loopStateRecommendationAvailable === true || result.recommendation?.available === true
  };
}

async function runLocalCycle(input = {}) {
  const fakeGateway = await startFakeGateway();
  try {
    const env = Object.assign({}, process.env, {
      NODE_NO_WARNINGS: "1",
      GROWTH_DATA_OWNER: "plugin",
      GROWTH_GATEWAY_PLANNER_ENDPOINT: fakeGateway.endpoint,
      GROWTH_GATEWAY_PLANNER_PROTOCOL: "generic",
      GROWTH_GATEWAY_AUTHORING_ENDPOINT: fakeGateway.endpoint,
      GROWTH_GATEWAY_AUTHORING_PROTOCOL: "generic",
      GROWTH_GATEWAY_EVALUATION_ENDPOINT: fakeGateway.endpoint,
      GROWTH_GATEWAY_EVALUATION_PROTOCOL: "generic"
    });
    const baseScope = scopeArgs(input);
    const dailyArgs = [
      "--operation", "advance",
      "--allow-write",
      ...baseScope,
      "--recipe-id", input.recipeId || defaultRecipeId(input),
      "--available-minutes", String(input.availableMinutes || 15),
      "--generation-key", input.generationKey,
      "--requested-by", input.requestedBy,
      "--json"
    ];
    const dailyLoop = await runNodeScript(DAILY_LOOP_SCRIPT, dailyArgs, env, "daily_loop_advance");
    if (!dailyLoop.ok) return { ok: false, step: "daily_loop_advance", dailyLoop, fakeGatewayCalls: fakeGateway.calls };
    const dailySummary = compactDailyLoop(dailyLoop);
    if (!dailySummary.taskCardId) {
      return {
        ok: false,
        step: "daily_loop_advance",
        error: "local_daily_cycle_task_card_id_missing",
        dailyLoop: dailySummary,
        fakeGatewayCalls: fakeGateway.calls
      };
    }
    const learnerCycle = await completeLearnerCycle(env, baseScope, dailySummary, input);
    if (!learnerCycle.ok) {
      return { ok: false, step: "learner_cycle_full", dailyLoop: dailySummary, learnerCycle, fakeGatewayCalls: fakeGateway.calls };
    }
    const profileFeedback = await runNodeScript(PROFILE_FEEDBACK_SCRIPT, [
      ...baseScope,
      "--auto-select-latest-completed-cycle",
      "--json"
    ], env, "profile_feedback");
    const loopState = await runNodeScript(LOOP_STATE_SCRIPT, [
      ...baseScope,
      "--json"
    ], env, "learning_loop_state");
    return {
      ok: profileFeedback.ok !== false && loopState.ok !== false,
      source: "growth-local-daily-cycle-smoke",
      schemaVersion: "growth.localDailyCycleSmoke.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      scope: {
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        domainPackId: input.domainPackId,
        domain: input.domain,
        subject: input.subject,
        horizon: input.horizon,
        targetNodeIds: input.targetNodeIds
      },
      gateway: {
        mode: "local_fake_gateway_generic",
        endpointHost: "127.0.0.1",
        callCount: fakeGateway.calls.length,
        callKinds: fakeGateway.calls.map((call) => call.kind)
      },
      dailyLoop: dailySummary,
      learnerCycle: compactLearnerCycle(learnerCycle),
      profileFeedback: compactProfileFeedback(profileFeedback),
      loopState: compactLoopState(loopState),
      failures: [
        profileFeedback.ok === false ? { step: "profile_feedback", error: profileFeedback.error || "profile_feedback_failed" } : null,
        loopState.ok === false ? { step: "learning_loop_state", error: loopState.error || "learning_loop_state_failed" } : null
      ].filter(Boolean)
    };
  } finally {
    await fakeGateway.close();
  }
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const input = inputFromArgs(args);
  const validation = validateInput(input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, input.json));
    process.exitCode = 2;
    return;
  }
  const result = await runLocalCycle(input);
  process.stdout.write(formatResult(result, input.json));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "local_daily_cycle_smoke_failed",
      detail: cleanString(error && error.message ? error.message : error, 300)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  outputForGatewayPayload,
  runLocalCycle,
  targetNodeIds,
  validCardDraft,
  validEvaluationDraft,
  validPlanDraft
};
