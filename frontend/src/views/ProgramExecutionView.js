import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";
import { renderNativeGrowthSubmission } from "./ProgramNativeGrowthDetailView.js";
import { renderParentAdminPanel } from "./ProgramParentAdminView.js";

export {
  learnerFacts,
  renderFoundationImportForm,
  renderFoundationPanel,
  renderSourceDirectoryPanel,
  renderSourceGoalForms
} from "./ProgramFoundationView.js";

export {
  checkedAttr,
  compactRiskFlags,
  firstItem,
  formatCoinAmount,
  launchStatusText,
  operationReasonText,
  parentReviewTypeText,
  renderLaunchOperationsPanel,
  renderLaunchQueue,
  renderParentAdminPanel,
  renderParentReportPanel,
  renderParentReviewRequests,
  renderProgramForm,
  renderReviewQueue,
  renderRewardSettlements,
  reviewStatusText,
  selectedAttr,
  sourceRefsForProgram
} from "./ProgramParentAdminView.js";

export {
  isNativeGrowthTaskDetail,
  latestRewardSettlementForTask,
  learningGrowthPlayableAudioUrl,
  nativeGrowthArtifactDirectoryPath,
  nativeGrowthDeterministicScoreText,
  nativeGrowthEvaluationCount,
  nativeGrowthEvaluationNeedsReflection,
  nativeGrowthReadingMaterial,
  nativeGrowthReflectionAudio,
  nativeGrowthRequiresAudio,
  nativeGrowthRequirementLabel,
  nativeGrowthSubmissionAudio,
  nativeGrowthSubmissionEvidence,
  nativeGrowthSubmissionGuard,
  nativeGrowthSubmissionPrompt,
  nativeGrowthSubmissionRecordingStatus,
  nativeGrowthTimeLabel,
  recordsForTask,
  renderLearningGrowthCardShareButton,
  renderLearningGrowthSectionHead,
  renderNativeGrowthAudioRecorder,
  renderNativeGrowthAudioEvidence,
  renderNativeGrowthEvaluationDetails,
  renderNativeGrowthFeedbackHead,
  renderNativeGrowthInstruction,
  renderNativeGrowthOwnerMenu,
  renderNativeGrowthPreviousSubmission,
  renderNativeGrowthReadingMaterial,
  renderNativeGrowthReflectionRecorder,
  renderNativeGrowthReflectionResult,
  renderNativeGrowthSequenceDecision,
  renderNativeGrowthSubmission,
  renderNativeGrowthTaskDetail,
  renderStructuredQuestionSubmission,
  renderTaskRewardPolicy,
  rewardSettlementDisplayText,
  structuredQuestionItems,
  structuredResponseMap,
  taskActionFromRecords,
  taskRewardPolicy
} from "./ProgramNativeGrowthDetailView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isOwner(options = {}) {
  return Boolean(options.state?.auth?.isOwner || options.isOwner);
}

function taskModel(task = {}) {
  const model = task.taskModel || task.learningTaskModel || {};
  return model && typeof model === "object" ? model : {};
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function latestRecordForTask(records = [], taskCardId = "", field = "updatedAt") {
  const id = clean(taskCardId);
  const matches = asArray(records).filter((record) => clean(record?.taskCardId) === id);
  if (!matches.length) return null;
  return matches.slice().sort((a, b) => String(b?.[field] || b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.[field] || a?.updatedAt || a?.createdAt || "")))[0];
}

export function latestDraftForProgram(program = {}, drafts = []) {
  const programId = clean(program.programId);
  return asArray(drafts).find((draft) => clean(draft?.programId) === programId) || null;
}

export function taskCardsForDraft(taskCards = [], draft = {}) {
  const draftId = clean(draft?.draftId);
  return asArray(taskCards).filter((task) => clean(task?.draftId) === draftId);
}

export function programStatusText(status = "", options = {}) {
  const value = clean(status);
  if (value === "active") return "进行中";
  if (value === "draft") return "草稿";
  if (value === "review_required") return isOwner(options) ? "待家长审核" : "待确认";
  if (value === "published") return isOwner(options) ? "已下发" : "待执行";
  if (value === "blocked") return isOwner(options) ? "已拦截" : "暂不可执行";
  return value || "未定";
}

export function taskStatusText(status = "", options = {}) {
  const value = clean(status);
  if (value === "planned") return "待执行";
  if (value === "published") return isOwner(options) ? "已下发" : "待执行";
  if (value === "active") return "进行中";
  if (value === "completed") return "已完成";
  if (value === "needs_review") return "待复盘";
  if (value === "review_required") return isOwner(options) ? "待家长审核" : "待确认";
  if (value === "blocked") return isOwner(options) ? "已拦截" : "暂不可执行";
  return value || "待执行";
}

export function evaluationStatusText(status = "") {
  const value = clean(status);
  if (value === "passed") return "已通过";
  if (value === "needs_repair") return "需修复";
  if (value === "needs_review") return "待复盘";
  if (value === "recorded") return "已记录";
  return value || "未记录";
}

export function settlementStatusText(status = "") {
  const value = clean(status);
  if (value === "settled") return "已结算";
  if (value === "pending_review") return "待家长复核";
  if (value === "blocked") return "已拦截";
  if (value === "skipped") return "已跳过";
  return value || "未定";
}

export function focusLabel(id = "") {
  const labels = {
    english_reading_comprehension: "阅读",
    english_listening_input: "听力",
    english_speaking_retell: "口语复述",
    english_pronunciation_shadowing: "发音跟读",
    english_short_writing: "写作",
    english_vocabulary_active_use: "词汇活用",
    english_grammar_in_expression: "语法表达",
    english_presentation: "演讲项目"
  };
  return labels[id] || id;
}

export function compactFocus(focusAreas = []) {
  return asArray(focusAreas).map((id) => focusLabel(id)).join(" / ");
}

export function formatPercent(value) {
  const number = Number(value || 0);
  return `${Math.round(Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0)) * 100)}%`;
}

export function renderDraftSummary(draft = null, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!draft) return "";
  const days = asArray(draft.dailyPlans).slice(0, 3);
  return `<div class="learning-program-draft" data-learning-program-draft="${escapeHtml(draft.draftId)}">
      <div class="learning-program-draft-top">
        <strong>${escapeHtml(`${draft.weekStart || ""} - ${draft.weekEnd || ""}`)}</strong>
        <span>${escapeHtml(programStatusText(draft.status, options))}</span>
      </div>
      <div class="learning-program-task-days">
        ${days.map((day) => `<span>${escapeHtml(day.date || "")}: ${escapeHtml(String(asArray(day.tasks).length))} 项</span>`).join("")}
      </div>
    </div>`;
}

export function renderProgramCards(programs = [], latestDrafts = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const owner = isOwner(options);
  if (!programs.length) {
    return `<div class="learning-coin-empty">${owner ? "还没有学习范围配置。" : "暂无学习安排。"}</div>`;
  }
  const draftByProgram = new Map(latestDrafts.map((draft) => [draft.programId, draft]));
  return programs.map((program) => {
    const draft = draftByProgram.get(program.programId);
    const draftPublished = clean(draft?.status) === "published";
    return `<article class="learning-program-card" data-learning-program-id="${escapeHtml(program.programId)}">
        <div class="learning-program-card-top">
          <div>
            <h3>${escapeHtml(program.title || program.programId)}</h3>
            ${owner && program.goalSummary ? `<p>${escapeHtml(program.goalSummary)}</p>` : ""}
          </div>
          <span>${escapeHtml(programStatusText(program.status, options))}</span>
        </div>
        <div class="learning-program-meta-grid">
          <span><strong>${escapeHtml(program.domain || "")}</strong><small>领域</small></span>
          <span><strong>${escapeHtml(String(program.minutesPerDay || 0))}</strong><small>每天分钟</small></span>
          <span><strong>${escapeHtml(String(program.daysPerWeek || 0))}</strong><small>每周天数</small></span>
        </div>
        ${owner ? `<div class="learning-program-focus">${escapeHtml(compactFocus(program.focusAreas))}</div>` : ""}
        ${owner ? renderDraftSummary(draft, options) : ""}
        ${owner ? `<div class="learning-program-actions">
          <button type="button" data-learning-program-draft-action="${escapeHtml(program.programId)}">生成周计划</button>
          <button type="button" data-learning-program-publish="${escapeHtml(program.programId)}" ${draft && !draft.reliability?.publishBlocked && !draftPublished ? "" : "disabled"}>${draftPublished ? "已自动下发" : "下发任务"}</button>
        </div>` : ""}
      </article>`;
  }).join("");
}

export function renderTaskAction(task = {}, session = null, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  const todoId = clean(task.todoId || task.kanbanCardId);
  const workspaceId = clean(task.workspaceId);
  const status = clean(task.status);
  if (["completed", "archived", "blocked"].includes(status)) return "";
  if (todoId || task.source === "kanban") {
    if (!todoId) return "";
    return `<div class="learning-program-task-actions">
        <button type="button" data-learning-open-kanban-card="${escapeHtml(todoId)}" data-workspace-id="${escapeHtml(workspaceId)}">打开任务</button>
      </div>`;
  }
  if (!taskCardId) return "";
  if (task.source === "learning-growth") {
    return renderNativeGrowthSubmission(task, options);
  }
  if (!session) {
    if (status !== "published" && status !== "active") return "";
    return `<div class="learning-program-task-actions">
        <button type="button" data-learning-task-start="${escapeHtml(taskCardId)}">开始</button>
      </div>`;
  }
  const sessionStatus = clean(session.status || "active");
  const complete = sessionStatus === "completed";
  return `<div class="learning-program-task-actions" data-learning-session-id="${escapeHtml(session.sessionId || "")}">
      <span class="learning-program-status-chip">${escapeHtml([sessionStatus, session.currentStep].filter(Boolean).join(" / "))}</span>
      ${complete ? "" : `<button type="button" data-learning-session-advance="${escapeHtml(session.sessionId || "")}">下一步</button>`}
      ${complete || !isOwner(options) ? "" : `<form class="learning-evaluation-inline-form" data-learning-evaluation-form="${escapeHtml(session.sessionId || "")}">
        <input class="input" name="score" type="number" min="0" max="100" placeholder="得分">
        <input class="input" name="summary" type="text" autocomplete="off" maxlength="280" placeholder="只写评价摘要">
        <button type="submit">记录评价</button>
      </form>`}
    </div>`;
}

export function renderTaskRows(taskCards = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const tasks = asArray(taskCards).slice(0, 8);
  const sessions = asArray(options.sessions);
  if (!tasks.length) return `<div class="learning-coin-empty">暂无待执行任务。</div>`;
  return `<div class="learning-program-task-list">
      ${tasks.map((task) => {
        const session = sessions.find((item) => clean(item.taskCardId) === clean(task.taskCardId)) || null;
        const skills = compactFocus(task.skillIds || []).slice(0, 80);
        const meta = [
          task.plannedDate,
          task.plannedMinutes ? `${task.plannedMinutes} min` : "",
          skills
        ].filter(Boolean).join(" / ");
        return `<article class="learning-program-task-item" data-learning-task-card-id="${escapeHtml(task.taskCardId)}">
          <div>
            <strong>${escapeHtml(task.title || task.taskCardId || "学习任务")}</strong>
            <p>${escapeHtml(meta || task.taskCardType || "")}</p>
          </div>
          <span>${escapeHtml(taskStatusText(task.status, options))}</span>
          ${renderTaskAction(task, session, Object.assign({}, options, { programsData: options.programsData }))}
        </article>`;
      }).join("")}
    </div>`;
}

export function renderSkillChips(skillStates = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const items = asArray(skillStates).slice(0, 8);
  if (!items.length) return `<div class="learning-coin-empty">完成任务后会显示能力跟踪。</div>`;
  return `<div class="learning-program-skill-list">
      ${items.map((item) => `<span class="learning-program-skill-chip">
        <strong>${escapeHtml(focusLabel(item.skillId || ""))}</strong>
        <small>${escapeHtml([item.level, formatPercent(item.confidence)].filter(Boolean).join(" / "))}</small>
      </span>`).join("")}
    </div>`;
}

export function renderEvaluationRows(evaluations = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const items = asArray(evaluations).slice(0, 5);
  if (!items.length) return `<div class="learning-coin-empty">暂无评估摘要。</div>`;
  const settlements = asArray(options.rewardSettlements);
  const settlementByEvaluation = new Map(settlements.map((item) => [clean(item?.evaluationId), item]).filter(([id]) => id));
  return `<div class="learning-program-evaluation-list">
      ${items.map((item) => {
        const settlement = settlementByEvaluation.get(clean(item.evaluationId));
        const canSettle = isOwner(options) && item.passed && (!settlement || clean(settlement.status) !== "settled");
        const publicStatus = settlement && !isOwner(options)
          ? "待确认"
          : settlement ? settlementStatusText(settlement.status) : item.passed ? "通过" : "待修复";
        return `<article class="learning-program-review-item" data-learning-evaluation-summary="${escapeHtml(item.evaluationId)}">
        <div>
          <strong>${escapeHtml([evaluationStatusText(item.status), item.score || item.score === 0 ? `${item.score}` : ""].filter(Boolean).join(" / "))}</strong>
          <p>${escapeHtml(item.summary || "未填写评估摘要")}</p>
        </div>
        ${canSettle ? `<button type="button" data-learning-evaluation-settle="${escapeHtml(item.evaluationId)}">结算金币</button>` : `<span class="learning-program-status-chip">${escapeHtml(publicStatus)}</span>`}
      </article>`;
      }).join("")}
    </div>`;
}

export function renderDailyPlanPanel(dailyPlan = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!dailyPlan || typeof dailyPlan !== "object") return "";
  const summary = dailyPlan.summary || {};
  const activeDays = asArray(dailyPlan.days).filter((day) => asArray(day.tasks).length).slice(0, 5);
  const nextTask = dailyPlan.nextTask || null;
  return `<section class="learning-coin-panel learning-daily-plan-panel" data-learning-daily-plan>
      <div class="learning-section-heading">
        <h3>今日与近期计划</h3>
        <span>${escapeHtml(String(summary.pendingTasks || 0))} 待执行</span>
      </div>
      <div class="learning-daily-plan-summary">
        <span><strong>${escapeHtml(String(summary.totalTasks || 0))}</strong><small>任务</small></span>
        <span><strong>${escapeHtml(String(summary.totalMinutes || 0))}</strong><small>分钟</small></span>
        <span><strong>${escapeHtml(String(summary.activeDays || 0))}</strong><small>有安排天</small></span>
      </div>
      ${nextTask ? `<p class="learning-program-guidance-copy">下一个：${escapeHtml(nextTask.title || nextTask.taskCardId || "")}</p>` : ""}
      ${activeDays.length ? `<div class="learning-daily-plan-list">
        ${activeDays.map((day) => `<article>
          <strong>${escapeHtml(day.date || "")}</strong>
          <span>${escapeHtml(String(day.pendingCount || asArray(day.tasks).length))} 项 / ${escapeHtml(String(day.totalMinutes || 0))} min</span>
        </article>`).join("")}
      </div>` : `<div class="learning-coin-empty">近期暂无可执行学习任务。</div>`}
    </section>`;
}

export function renderExecutionOverview(data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const tasks = asArray(data.taskCards);
  const programs = asArray(data.programs);
  const pendingCount = tasks.filter((task) => !["completed", "archived"].includes(clean(task.status))).length || programs.length;
  const taskOptions = Object.assign({}, options, {
    programsData: data,
    sessions: data.interactionSessions || []
  });
  return `<section class="learning-growth-category learning-program-execution-panel" data-learning-growth-category="execution">
      <div class="learning-growth-category-heading">
        <h3>执行概览 / 待执行</h3>
        <span>${escapeHtml(String(pendingCount))} 项</span>
      </div>
      ${renderDailyPlanPanel(data.dailyPlan || {}, options)}
      <div class="learning-program-execution-grid">
        <section class="learning-coin-panel">
          <div class="learning-section-heading"><h3>任务状态</h3><span>Task</span></div>
          ${renderTaskRows(tasks, taskOptions)}
        </section>
        <section class="learning-coin-panel">
          <div class="learning-section-heading"><h3>${isOwner(options) ? "学习计划" : "学习安排"}</h3><span>${escapeHtml(String(programs.length))}</span></div>
          <div class="learning-program-list">${renderProgramCards(programs, data.latestDrafts || [], Object.assign({}, options, { programsData: data }))}</div>
        </section>
      </div>
    </section>`;
}

export function renderProgramSubsystem(options = {}) {
  const programs = options.programs || {};
  const data = programs.programs ? programs : {};
  const owner = isOwner(options);
  const parentAdmin = renderParentAdminPanel(data, options);
  const execution = renderExecutionOverview(data, options);
  return `<section class="learning-program-section" data-learning-growth-module="programs">
      ${owner ? parentAdmin : ""}
      ${execution}
      ${owner ? "" : parentAdmin}
    </section>`;
}
