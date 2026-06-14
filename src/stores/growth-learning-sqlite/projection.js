"use strict";

const {
  asArray,
  cleanString,
  dateKey,
  latestByTask,
  numberValue,
  parseJson,
  parseTimeMs,
  positiveInteger,
  tableExists,
  todayKey
} = require("./core");
const { publicAudio } = require("./audio-metadata");

function publicSubmission(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    submissionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    submissionKind: row.submission_kind,
    submittedAt: row.submitted_at || row.created_at,
    createdAt: row.created_at,
    audio: publicAudio("submission", row.id, raw),
    submissionCount: 1,
    totalSubmissionCount: 1
  };
}

function publicEvaluation(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    evaluationId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    score: numberValue(row.score),
    maxScore: 100,
    passed: Boolean(Number(row.passed || 0)),
    summary: cleanString(row.summary).slice(0, 700),
    confidence: numberValue(row.confidence),
    revisionRequirements: asArray(raw.revisionRequirements).slice(0, 6),
    remainingWeaknesses: asArray(raw.remainingWeaknesses).slice(0, 6),
    feedbackSections: raw.feedbackSections && typeof raw.feedbackSections === "object" ? raw.feedbackSections : {},
    evaluatedAt: row.created_at,
    createdAt: row.created_at,
    evaluationCount: 1,
    totalEvaluationCount: 1
  };
}

function publicReflection(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    reflectionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    mode: row.mode,
    score: numberValue(row.score),
    summary: cleanString(row.summary).slice(0, 700),
    submittedAt: row.submitted_at || row.created_at,
    createdAt: row.created_at,
    audio: publicAudio("reflection", row.id, raw, row.audio_digest)
  };
}

function publicRewardSettlement(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    rewardSettlementId: row.id,
    learnerId: row.learner_id || raw.learnerId || "",
    workspaceId: row.workspace_id || raw.workspaceId || "",
    programId: row.program_id || raw.programId || "",
    taskCardId: row.task_card_id || raw.taskCardId || "",
    sessionId: row.session_id || raw.sessionId || "",
    evaluationId: row.evaluation_id || raw.evaluationId || "",
    status: row.status || raw.status || "",
    coinAmount: numberValue(row.coin_amount || raw.coinAmount),
    currency: "learning_coin",
    reason: row.reason || raw.reason || "",
    sourceType: row.source_type || raw.sourceType || "",
    sourceId: row.source_id || raw.sourceId || "",
    idempotencyKey: row.idempotency_key || raw.idempotencyKey || "",
    createdAt: row.created_at || raw.createdAt || "",
    updatedAt: row.updated_at || raw.updatedAt || "",
    settledAt: row.settled_at || raw.settledAt || ""
  };
}

function latestRewardSettlementByTask(db, taskCardId, evaluationId = "") {
  if (!tableExists(db, "learning_reward_settlements")) return null;
  const id = cleanString(taskCardId);
  const evalId = cleanString(evaluationId);
  if (!id && !evalId) return null;
  return db.prepare(`
    SELECT * FROM learning_reward_settlements
    WHERE (? <> '' AND task_card_id = ?) OR (? <> '' AND evaluation_id = ?)
    ORDER BY COALESCE(NULLIF(settled_at, ''), NULLIF(updated_at, ''), created_at) DESC
    LIMIT 1
  `).get(id, id, evalId, evalId) || null;
}

function rewardPolicyForCard(raw = {}, row = {}) {
  const maxCoins = positiveInteger(
    raw.rewardPolicy?.maxCoins
      || raw.rewardPolicy?.rewardCapCoins
      || raw.rewardCapCoins
      || row.reward_cap_coins
      || row.configured_reward_coins
      || row.default_reward_coins,
    100
  );
  return {
    minCoins: positiveInteger(raw.rewardPolicy?.minCoins, maxCoins),
    maxCoins,
    rewardCapCoins: maxCoins
  };
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function targetNodeIdsForCard(raw = {}, row = {}) {
  return uniqueStrings(
    asArray(raw.learningGraph?.targetNodeIds)
      .concat(raw.learning_graph?.target_node_ids || [])
      .concat(raw.targetNodeIds || [])
      .concat(raw.target_node_ids || [])
      .concat(parseJson(row.skill_ids_json, []))
  ).slice(0, 12);
}

function publicLatestExperienceSignal(row = {}) {
  if (!row) return null;
  return {
    latestSignalType: cleanString(row.signal_type),
    latestSignalStrength: cleanString(row.strength),
    latestSignalSummary: cleanString(row.summary).slice(0, 260),
    latestSignalSourceType: cleanString(row.source_type),
    latestAt: cleanString(row.created_at),
    targetNodeId: cleanString(row.node_id)
  };
}

function latestExperienceSignalForCard(db, row = {}, raw = {}) {
  if (!tableExists(db, "learning_growth_experience_signals")) return null;
  const targetNodeIds = targetNodeIdsForCard(raw, row);
  if (!targetNodeIds.length) return null;
  const placeholders = targetNodeIds.map(() => "?").join(", ");
  try {
    return db.prepare(`
      SELECT * FROM learning_growth_experience_signals
      WHERE workspace_id = ?
        AND learner_id = ?
        AND node_id IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT 1
    `).get(cleanString(row.workspace_id), cleanString(row.learner_id) || cleanString(row.workspace_id), ...targetNodeIds) || null;
  } catch (_error) {
    return null;
  }
}

function experienceSummaryForCard(db, row = {}, raw = {}) {
  const base = raw.experienceSummary && typeof raw.experienceSummary === "object"
    ? raw.experienceSummary
    : {};
  const targetNodeIds = targetNodeIdsForCard(raw, row);
  const latestSignal = publicLatestExperienceSignal(latestExperienceSignalForCard(db, row, raw));
  if (!Object.keys(base).length && !latestSignal) return null;
  return Object.assign({}, base, latestSignal || {}, { targetNodeIds });
}

function sequenceIndexForTask(task = {}, fallbackIndex = 0) {
  const values = [
    task.sequenceIndex,
    task.learningGrowthJitGeneration?.sequenceIndex,
    task.taskModel?.jitGeneration?.sequenceIndex,
    task.kanbanCaseCardIndex,
    task.caseCardIndex
  ];
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return Math.max(1, Number(fallbackIndex || 0) + 1);
}

function sequenceModeForTask(task = {}) {
  return cleanString(
    task.sequenceMode
      || task.learningGrowthSequenceMode
      || task.learningGrowthJitGeneration?.sequenceMode
      || task.taskModel?.sequenceMode
      || task.taskModel?.jitGeneration?.sequenceMode
  ).toLowerCase();
}

function isEvergreenSequenceTask(task = {}) {
  return sequenceModeForTask(task).includes("evergreen")
    || cleanString(task.sequenceGroupId || task.sequence_group_id).toLowerCase().startsWith("evergreen:");
}

function sequenceGroupForTask(task = {}) {
  const explicit = cleanString(task.sequenceGroupId || task.sequence_group_id);
  if (explicit) return explicit;
  const programId = cleanString(task.programId || task.learningProgramId || task.learning_program_id);
  if (programId) return `program:${programId}`;
  const draftId = cleanString(task.draftId || task.learningDraftId || task.learning_draft_id);
  if (draftId) return `draft:${draftId}`;
  const taskCardId = cleanString(task.taskCardId || task.id);
  return taskCardId ? `task:${taskCardId}` : "task:unknown";
}

function stripDecoratedCardOrdinalSuffix(title = "") {
  let text = cleanString(title).slice(0, 180);
  const ordinal = "(\\d+|[一二两三四五六七八九十]{1,4})";
  const patterns = [
    new RegExp(`\\s*[（(]\\s*第\\s*${ordinal}\\s*张(?:卡|任务)?\\s*[）)]\\s*$`, "u"),
    new RegExp(`\\s*[·\\-_:|/]\\s*第\\s*${ordinal}\\s*张(?:卡|任务)?\\s*$`, "u"),
    new RegExp(`\\s+第\\s*${ordinal}\\s*张(?:卡|任务)?\\s*$`, "u")
  ];
  for (const pattern of patterns) {
    const next = text.replace(pattern, "").trim();
    if (next !== text) text = next;
  }
  return text;
}

const CHINESE_DIGITS = Object.freeze({
  "一": 1,
  "二": 2,
  "两": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9
});

function parseChineseInteger(value = "") {
  const text = cleanString(value).slice(0, 12);
  if (!text) return 0;
  if (Object.prototype.hasOwnProperty.call(CHINESE_DIGITS, text)) return CHINESE_DIGITS[text];
  if (text === "十") return 10;
  const match = text.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/u);
  if (!match) return 0;
  const tens = match[1] ? CHINESE_DIGITS[match[1]] : 1;
  const ones = match[2] ? CHINESE_DIGITS[match[2]] : 0;
  return tens * 10 + ones;
}

function ordinalTokenValue(value = "") {
  const text = cleanString(value).slice(0, 20);
  if (!text) return 0;
  if (/^\d+$/.test(text)) return Number(text);
  return parseChineseInteger(text);
}

function stripPlainOrdinalSuffix(title = "", sequenceIndex = 1) {
  const text = cleanString(title).slice(0, 180);
  const numeric = text.match(/^(.*?)(?:[\s_#-]+)(0*\d{1,3})$/);
  if (numeric) {
    const value = Number(numeric[2]);
    if (value === sequenceIndex || value === 1 || /^0+\d+$/.test(numeric[2])) {
      return cleanString(numeric[1]).slice(0, 180) || text;
    }
  }
  const chinese = text.match(/^(.*?)(?:[\s_#-]+)([一二两三四五六七八九十]{1,4})$/u);
  if (chinese) {
    const value = ordinalTokenValue(chinese[2]);
    if (value === sequenceIndex || value === 1) return cleanString(chinese[1]).slice(0, 180) || text;
  }
  return text;
}

function displayTitleForLearningGrowthTask(task = {}, fallbackIndex = 0) {
  const title = cleanString(task.title).slice(0, 180) || cleanString(task.taskCardId || task.id).slice(0, 180);
  if (!isEvergreenSequenceTask(task)) return title;
  const sequenceIndex = sequenceIndexForTask(task, fallbackIndex);
  const baseTitle = stripPlainOrdinalSuffix(stripDecoratedCardOrdinalSuffix(title), sequenceIndex) || title;
  return `${baseTitle} · 第${sequenceIndex}张卡`;
}

function taskLockedUntil(task = {}, nowIso = "") {
  const unlockAt = cleanString(task.nextCompletionAllowedAt || task.learningGrowthUnlockAt || task.unlockAt || task.availableAt || task.notBefore);
  if (!unlockAt) return "";
  const unlockMs = parseTimeMs(unlockAt);
  const nowMs = parseTimeMs(nowIso) || Date.now();
  return unlockMs && unlockMs > nowMs ? unlockAt : "";
}

function completionPolicyForTask(task = {}) {
  const policy = task.completionPolicy || task.completion_policy || task.taskModel?.completionPolicy || {};
  return policy && typeof policy === "object" ? policy : {};
}

function isDailyScoreOnceTask(task = {}) {
  const policy = completionPolicyForTask(task);
  if (cleanString(policy.mode).toLowerCase() === "daily_score_once") return true;
  const source = cleanString(task.source || task.authoringAudit?.source || task.authoring_audit?.source).toLowerCase();
  const role = cleanString(task.cardRole || task.card_role || task.learningGrowthCardRole).toLowerCase();
  return source === "growth-card-authoring" && role !== "stage_assessment";
}

function dailyScoreOnceEvaluationCompletes(latest = {}) {
  if (!latest.evaluation) return false;
  const status = cleanString(latest.evaluation.status).toLowerCase();
  return !["", "pending", "queued", "processing", "retry", "failed", "error"].includes(status);
}

function taskStatus(task = {}, latest = {}, context = {}) {
  const status = cleanString(task.status || task.executionStatus).toLowerCase();
  if (["completed", "done", "closed", "archived"].includes(status)) return "complete";
  if (taskLockedUntil(task, context.nowIso)) return "locked_until";
  if (isDailyScoreOnceTask(task) && dailyScoreOnceEvaluationCompletes(latest)) return "complete";
  const reflectionStatus = cleanString(latest.reflection?.status);
  if (reflectionStatus === "accepted") return "complete";
  const evaluationStatus = cleanString(latest.evaluation?.status);
  if (evaluationStatus === "reflection_required") return "spoken_reflection";
  if (evaluationStatus === "needs_repair" || evaluationStatus === "needs_revision" || evaluationStatus === "draft_feedback") return "revise";
  if (latest.evaluation?.passed) return "complete";
  if (cleanString(latest.submission?.status)) return "waiting_feedback";
  return "submit";
}

function laneForTask(task = {}, latest = {}, today = todayKey(), context = {}) {
  const action = taskStatus(task, latest, context);
  if (action === "locked_until") return "locked_until";
  if (action === "spoken_reflection") return "reflection_required";
  if (action === "revise") return "needs_revision";
  if (action === "waiting_feedback") return "waiting_ai";
  if (action === "complete") return "completed_recent";
  if (dateKey(task.plannedDate || task.dueLocal || task.dueAt) === today) return "today";
  return "ready";
}

function primaryActionForLane(laneId, action) {
  if (laneId === "locked_until") return "locked";
  if (laneId === "waiting_ai") return "wait";
  if (laneId === "needs_revision") return "revise";
  if (laneId === "reflection_required") return "reflect";
  if (laneId === "completed_recent") return "review";
  return action === "submit" ? "submit" : action || "open";
}

function actionModel(laneId, action) {
  return {
    canSubmit: laneId !== "locked_until" && (action === "submit" || action === "revise"),
    canWithdraw: action === "waiting_feedback",
    canReflect: action === "spoken_reflection",
    canOpenArtifacts: laneId === "completed_recent" || laneId === "reflection_required" || laneId === "needs_revision",
    primaryAction: primaryActionForLane(laneId, action)
  };
}

function isCompletedCard(card = {}) {
  const status = cleanString(card.status || card.executionStatus || card.nextAction || card.laneId).toLowerCase();
  return ["completed", "complete", "done", "closed", "archived", "completed_recent"].includes(status);
}

function openedAtForRewardDecay(card = {}) {
  return cleanString(
    card.openedAt
      || card.generatedAt
      || card.availableAt
      || card.unlockAt
      || card.learningGrowthUnlockAt
      || card.learningGrowthJitGeneration?.generatedAt
      || card.taskModel?.jitGeneration?.generatedAt
      || card.createdAt
      || card.plannedDate
  );
}

function formatAgeLabel(ageHours) {
  if (!Number.isFinite(ageHours) || ageHours < 0) return "";
  if (ageHours < 48) return `${Math.floor(ageHours)}h`;
  const days = Math.floor(ageHours / 24);
  const hours = Math.floor(ageHours % 24);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

function rewardDecayState(card = {}, options = {}) {
  const cap = positiveInteger(card.rewardPolicy?.maxCoins || card.rewardCapCoins, 100);
  if (!isEvergreenSequenceTask(card) || isCompletedCard(card)) {
    return {
      applies: false,
      severity: "none",
      rewardCapCoins: cap,
      effectiveRewardCapCoins: cap,
      penaltyCoins: 0,
      penaltyDays: 0,
      ageHours: 0,
      ageLabel: ""
    };
  }
  const openedAt = openedAtForRewardDecay(card);
  const openedMs = parseTimeMs(openedAt);
  const currentMs = parseTimeMs(options.now) || Date.now();
  if (!openedMs || currentMs <= openedMs) {
    return {
      applies: true,
      severity: "normal",
      openedAt,
      rewardCapCoins: cap,
      effectiveRewardCapCoins: cap,
      penaltyCoins: 0,
      penaltyDays: 0,
      ageHours: 0,
      ageLabel: "0h",
      ruleLabel: "48h yellow -5%/day; 72h red -10%/day"
    };
  }
  const ageHours = Math.floor((currentMs - openedMs) / (60 * 60 * 1000));
  let severity = "normal";
  let dailyPenaltyPercent = 0;
  let thresholdHours = 0;
  if (ageHours >= 72) {
    severity = "danger";
    dailyPenaltyPercent = 10;
    thresholdHours = 72;
  } else if (ageHours >= 48) {
    severity = "warning";
    dailyPenaltyPercent = 5;
    thresholdHours = 48;
  }
  const penaltyDays = dailyPenaltyPercent ? Math.max(1, Math.floor((ageHours - thresholdHours) / 24) + 1) : 0;
  const penaltyCoins = Math.min(Math.max(0, cap - 1), Math.round(cap * (dailyPenaltyPercent / 100) * penaltyDays));
  return {
    applies: true,
    severity,
    openedAt,
    rewardCapCoins: cap,
    effectiveRewardCapCoins: Math.max(1, cap - penaltyCoins),
    penaltyCoins,
    penaltyDays,
    dailyPenaltyPercent,
    thresholdHours,
    ageHours,
    ageLabel: formatAgeLabel(ageHours),
    ruleLabel: "48h yellow -5%/day; 72h red -10%/day"
  };
}

function taskComplete(card = {}) {
  return card.laneId === "completed_recent" || card.nextAction === "complete";
}

function completionTimeForCard(card = {}) {
  return cleanString(
    card.latestReflection?.submittedAt
      || card.latestReflection?.createdAt
      || card.completedAt
      || card.latestEvaluation?.createdAt
      || card.latestEvaluation?.evaluatedAt
      || card.latestSubmission?.submittedAt
      || card.generatedAt
      || card.openedAt
  );
}

function visibleSequenceCards(cards = []) {
  const visible = [];
  const hidden = [];
  const groups = new Map();
  for (const [index, card] of asArray(cards).entries()) {
    const groupId = cleanString(card.sequenceGroupId) || `task:${cleanString(card.taskCardId)}`;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(Object.assign({ _boardIndex: index }, card));
  }
  for (const groupCards of groups.values()) {
    const sorted = groupCards.slice().sort((a, b) => {
      const ai = Number(a.sequenceIndex || 0) || 0;
      const bi = Number(b.sequenceIndex || 0) || 0;
      if (ai !== bi) return ai - bi;
      const ad = cleanString(a.plannedDate);
      const bd = cleanString(b.plannedDate);
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a._boardIndex - b._boardIndex;
    });
    let currentOpen = false;
    for (const card of sorted) {
      if (taskComplete(card)) {
        visible.push(Object.assign({}, card, { sequenceVisibility: "completed" }));
        continue;
      }
      if (!currentOpen) {
        currentOpen = true;
        visible.push(Object.assign({}, card, { sequenceVisibility: "current" }));
      } else {
        hidden.push(Object.assign({}, card, { sequenceVisibility: "locked_future" }));
      }
    }
  }
  visible.sort((a, b) => a._boardIndex - b._boardIndex);
  return {
    cards: visible.map(({ _boardIndex, ...card }) => card),
    hiddenCards: hidden.map(({ _boardIndex, ...card }) => card)
  };
}

function defaultLanes() {
  return [
    { id: "today", title: "Today", cards: [] },
    { id: "ready", title: "Ready", cards: [] },
    { id: "locked_until", title: "Locked until next window", cards: [] },
    { id: "waiting_ai", title: "Waiting for AI", cards: [] },
    { id: "needs_revision", title: "Needs revision", cards: [] },
    { id: "reflection_required", title: "Reflection required", cards: [] },
    { id: "completed_recent", title: "Completed recent", cards: [] }
  ];
}

function publicCardFromRow(db, row, context = {}, index = 0) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  const latestSubmission = publicSubmission(latestByTask(db, "learning_task_submissions", row.id, "submitted_at"));
  const latestEvaluation = publicEvaluation(latestByTask(db, "learning_evaluations", row.id, "created_at"));
  const latestReflection = publicReflection(latestByTask(db, "learning_task_reflections", row.id, "submitted_at"));
  const latest = { submission: latestSubmission, evaluation: latestEvaluation, reflection: latestReflection };
  const rewardPolicy = rewardPolicyForCard(raw, row);
  const baseTask = Object.assign({}, raw, {
    id: row.id,
    taskCardId: row.id,
    workspaceId: row.workspace_id,
    programId: row.program_id,
    draftId: row.draft_id,
    title: row.title,
    domain: row.domain,
    taskCardType: row.task_card_type,
    status: row.status,
    plannedDate: row.planned_date,
    plannedMinutes: row.planned_minutes,
    cardRole: row.card_role || raw.cardRole || "",
    completionPolicy: raw.completionPolicy || parseJson(row.completion_policy_json, {}) || {},
    capabilityClusterId: row.capability_cluster_id || raw.capabilityClusterId || "",
    rewardCapCoins: rewardPolicy.maxCoins,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
  const action = taskStatus(baseTask, latest, context);
  const laneId = laneForTask(baseTask, latest, context.today, context);
  const actions = actionModel(laneId, action);
  const sequenceIndex = sequenceIndexForTask(baseTask, index);
  const sequenceMode = cleanString(
    baseTask.sequenceMode
      || baseTask.learningGrowthSequenceMode
      || baseTask.learningGrowthJitGeneration?.sequenceMode
      || baseTask.taskModel?.sequenceMode
      || baseTask.taskModel?.jitGeneration?.sequenceMode
  );
  const sequenceGroupId = sequenceGroupForTask(baseTask);
  const openedAt = cleanString(
    baseTask.availableAt
      || baseTask.unlockAt
      || baseTask.learningGrowthUnlockAt
      || baseTask.learningGrowthJitGeneration?.generatedAt
      || baseTask.taskModel?.jitGeneration?.generatedAt
      || row.created_at
      || row.planned_date
  );
  const artifactCount = tableExists(db, "learning_task_artifacts")
    ? Number(db.prepare("SELECT COUNT(*) AS count FROM learning_task_artifacts WHERE task_card_id = ?").get(row.id)?.count || 0)
    : 0;
  const latestSettlement = publicRewardSettlement(latestRewardSettlementByTask(db, row.id, latestEvaluation?.evaluationId));
  const card = {
    taskCardId: row.id,
    todoId: row.kanban_card_id || "",
    source: "growth-plugin-sqlite",
    workspaceId: row.workspace_id,
    programId: row.program_id,
    draftId: row.draft_id,
    sequenceGroupId,
    sequenceMode,
    sequenceIndex,
    title: displayTitleForLearningGrowthTask(baseTask, index),
    instructionPreview: cleanString(
      raw.learnerInstruction
        || raw.instruction
        || raw.instructionPreview
        || raw.taskModel?.learnerInstruction
        || raw.summary
        || raw.description
    ).slice(0, 260),
    domain: row.domain,
    activityType: cleanString(raw.activityType || raw.taskModel?.activityType || raw.taskModel?.skillId || row.task_card_type),
    cardRole: row.card_role || raw.cardRole || "",
    taskModel: raw.taskModel && typeof raw.taskModel === "object" ? raw.taskModel : null,
    teachingFlow: raw.teachingFlow || raw.taskModel?.teachingFlow || null,
    targetNodeIds: targetNodeIdsForCard(raw, row),
    experienceSummary: experienceSummaryForCard(db, row, raw),
    capabilityClusterId: row.capability_cluster_id || raw.capabilityClusterId || "",
    expectedDurationMinutes: {
      min: numberValue(row.expected_duration_minutes_min),
      max: numberValue(row.expected_duration_minutes_max)
    },
    stageAssessment: raw.stageAssessment || null,
    stageAssessmentCycleId: row.stage_assessment_cycle_id || "",
    activationState: row.activation_state || "",
    plannedDate: row.planned_date,
    openedAt,
    generatedAt: row.created_at,
    plannedMinutes: numberValue(row.planned_minutes),
    status: row.status,
    completedAt: cleanString(raw.completedAt || raw.completed_at || raw.finishedAt || raw.closedAt),
    nextCompletionAllowedAt: cleanString(raw.nextCompletionAllowedAt || raw.learningGrowthUnlockAt || raw.unlockAt || raw.availableAt || raw.notBefore),
    laneId,
    latestSubmission,
    latestEvaluation,
    latestReflection,
    artifactCount,
    rewardState: cleanString(raw.rewardState || raw.reward_state),
    latestRewardSettlement: latestSettlement,
    rewardPolicy,
    rewardCapCoins: rewardPolicy.maxCoins,
    rewardDecay: null,
    primaryAction: actions.primaryAction,
    nextAction: action,
    actions
  };
  card.submissionCount = latestSubmission ? 1 : 0;
  card.evaluationCount = latestEvaluation ? 1 : 0;
  card.totalSubmissionCount = card.submissionCount;
  card.totalEvaluationCount = card.evaluationCount;
  card.rewardDecay = rewardDecayState(Object.assign({}, baseTask, card), { now: context.nowIso });
  return card;
}

function summaryForCards(cards, allCards = cards, hiddenCards = []) {
  return {
    cardCount: cards.length,
    visibleCardCount: cards.length,
    totalCardCount: allCards.length,
    hiddenFutureCardCount: hiddenCards.length,
    sequencePolicy: "current_card_only_then_unlock_next",
    total: cards.length,
    active: cards.filter((card) => !["done", "completed"].includes(cleanString(card.status).toLowerCase())).length,
    waiting_review: cards.filter((card) => cleanString(card.nextAction).includes("review")).length,
    completed: cards.filter((card) => ["done", "completed"].includes(cleanString(card.status).toLowerCase())).length
  };
}

function lanesForCards(cards) {
  const lanes = defaultLanes();
  const laneMap = new Map(lanes.map((lane) => [lane.id, lane]));
  for (const card of cards) {
    const lane = laneMap.get(card.laneId) || laneMap.get("ready");
    lane.cards.push(card.taskCardId);
  }
  const cardById = new Map(cards.map((card) => [card.taskCardId, card]));
  const completedLane = laneMap.get("completed_recent");
  if (completedLane) {
    completedLane.cards.sort((a, b) => {
      const at = completionTimeForCard(cardById.get(a));
      const bt = completionTimeForCard(cardById.get(b));
      if (at !== bt) return at > bt ? -1 : 1;
      return String(a).localeCompare(String(b));
    });
  }
  return lanes.map((lane) => Object.assign({}, lane, { count: lane.cards.length }));
}

module.exports = {
  lanesForCards,
  publicCardFromRow,
  publicEvaluation,
  publicReflection,
  publicRewardSettlement,
  publicSubmission,
  summaryForCards,
  visibleSequenceCards
};
