import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";
import { renderFoundationPanel } from "./ProgramFoundationView.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isOwner(options = {}) {
  return Boolean(options.state?.auth?.isOwner || options.isOwner);
}

const DEFAULT_OWNER_PROGRAM = Object.freeze({
  title: "English fast improvement sprint",
  goalSummary: "Build a low-pressure daily English plan with reading, listening, speaking, writing, vocabulary, and grammar practice.",
  domain: "english",
  durationDays: 60,
  daysPerWeek: 5,
  minutesPerDay: 35,
  timeOfDay: "19:30",
  focusAreas: [
    "english_reading_comprehension",
    "english_listening_input",
    "english_speaking_retell",
    "english_pronunciation_shadowing",
    "english_short_writing",
    "english_vocabulary_active_use",
    "english_grammar_in_expression"
  ]
});

const ENGLISH_FOCUS_IDS = Object.freeze([
  "english_reading_comprehension",
  "english_listening_input",
  "english_speaking_retell",
  "english_pronunciation_shadowing",
  "english_short_writing",
  "english_vocabulary_active_use",
  "english_grammar_in_expression",
  "english_presentation"
]);

export function firstItem(items = []) {
  return asArray(items).find(Boolean) || null;
}

export function selectedAttr(value = "", expected = "") {
  return clean(value) === expected ? " selected" : "";
}

export function checkedAttr(values = [], id = "", fallback = false) {
  const list = asArray(values).map((value) => String(value));
  return (list.length ? list.includes(id) : fallback) ? " checked" : "";
}

export function sourceRefsForProgram(data = {}, program = {}) {
  const refs = asArray(program.sourceBasisRefs);
  if (refs.length) return refs.join("\n");
  return asArray(data.sources)
    .map((source) => source?.sourceRef || source?.sourceId)
    .filter(Boolean)
    .slice(0, 20)
    .join("\n");
}

function focusLabel(id = "") {
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

function settlementStatusText(status = "") {
  const value = clean(status);
  if (value === "settled") return "已结算";
  if (value === "pending_review") return "待家长复核";
  if (value === "blocked") return "已拦截";
  if (value === "skipped") return "已跳过";
  return value || "未定";
}

export function reviewStatusText(status = "") {
  const value = clean(status);
  if (value === "pending") return "待处理";
  if (value === "approved") return "已通过";
  if (value === "returned_for_revision") return "已退回";
  if (value === "rejected") return "已拒绝";
  return value || "待处理";
}

export function parentReviewTypeText(type = "") {
  const value = clean(type);
  if (value === "plan") return "计划复核";
  if (value === "task") return "任务复核";
  if (value === "reward") return "奖励复核";
  if (value === "stage_assessment") return "阶段测评";
  return value || "家长复核";
}

export function formatCoinAmount(value) {
  const number = Number(value || 0);
  return `${Number.isFinite(number) ? Math.round(number) : 0} 金币`;
}

export function compactRiskFlags(flags = []) {
  return asArray(flags).map((flag) => flag?.code || flag).filter(Boolean).join(" / ");
}

export function launchStatusText(status = "") {
  const value = clean(status);
  if (value === "ready") return "已就绪";
  if (value === "attention_required") return "需处理";
  if (value === "blocked") return "已阻塞";
  return value || "待确认";
}

export function operationReasonText(reasonCode = "") {
  const value = clean(reasonCode);
  const labels = {
    missing_learning_source_or_goal: "补充学习来源或目标",
    missing_learning_program: "创建学习计划",
    launch_blockers_present: "先处理阻断项",
    pending_parent_review: "处理家长审核",
    pending_reward_settlement: "处理奖励结算",
    no_published_learning_tasks: "下发首批学习任务",
    pending_coin_redemptions: "审核兑换申请",
    task_ready_for_executor: "已下发给执行者",
    session_in_progress: "学习中",
    passed_evaluation_needs_reward_settlement: "通过后待结算",
    reward_settlement_pending: "奖励待处理",
    draft_blocked_by_reliability: "计划被可靠性拦截",
    task_blocked: "任务阻断",
    evaluation_requires_repair: "评估需修复",
    reward_settlement_blocked: "奖励结算阻断"
  };
  return labels[value] || value || "待处理";
}

export function renderProgramForm(data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!isOwner(options)) return "";
  const program = firstItem(data.programs) || {};
  const goal = firstItem(data.goals) || {};
  const focusAreas = asArray(program.focusAreas).length ? asArray(program.focusAreas) : DEFAULT_OWNER_PROGRAM.focusAreas;
  const title = program.title || goal.title || DEFAULT_OWNER_PROGRAM.title;
  const goalSummary = program.goalSummary || goal.targetSummary || DEFAULT_OWNER_PROGRAM.goalSummary;
  const sourceRefs = sourceRefsForProgram(data, program);
  const domain = program.domain || goal.domain || DEFAULT_OWNER_PROGRAM.domain;
  return `<section class="learning-coin-panel learning-program-owner-panel learning-owner-step" data-learning-program-owner data-learning-owner-step="scope">
      <div class="learning-section-heading">
        <h3>2-3. 阶段目标与内容范围</h3>
        <span>已预填</span>
      </div>
      <form id="learningProgramForm" class="learning-program-form" data-learning-program-create>
        <label class="learning-program-wide-field"><span>阶段目标</span><input id="learningProgramTitle" class="input" type="text" autocomplete="off" value="${escapeHtml(title)}" placeholder="计划名称，例：英语快速提升"></label>
        <label class="learning-program-wide-field"><span>要达到的结果</span><textarea id="learningProgramGoal" class="input" rows="3" placeholder="阶段目标、验收标准和特殊要求">${escapeHtml(goalSummary)}</textarea></label>
        <div class="learning-program-field-grid">
          <label><span>领域</span><select id="learningProgramDomain" class="input"><option value="english"${selectedAttr(domain, "english")}>English</option><option value="math"${selectedAttr(domain, "math")}>Math</option><option value="programming"${selectedAttr(domain, "programming")}>Programming</option></select></label>
          <label><span>开始</span><input id="learningProgramStartDate" class="input" type="date" value="${escapeHtml(program.startDate || "")}"></label>
          <label><span>周期天数</span><input id="learningProgramDurationDays" class="input" type="number" min="7" max="366" value="${escapeHtml(String(program.durationDays || DEFAULT_OWNER_PROGRAM.durationDays))}"></label>
          <label><span>每周天数</span><input id="learningProgramDaysPerWeek" class="input" type="number" min="1" max="7" value="${escapeHtml(String(program.daysPerWeek || DEFAULT_OWNER_PROGRAM.daysPerWeek))}"></label>
          <label><span>每天分钟</span><input id="learningProgramMinutesPerDay" class="input" type="number" min="10" max="90" value="${escapeHtml(String(program.minutesPerDay || DEFAULT_OWNER_PROGRAM.minutesPerDay))}"></label>
          <label><span>提醒时间</span><input id="learningProgramTimeOfDay" class="input" type="time" value="${escapeHtml(program.timeOfDay || DEFAULT_OWNER_PROGRAM.timeOfDay)}"></label>
        </div>
        <fieldset class="learning-program-focus-grid" aria-label="英语能力范围">
          ${ENGLISH_FOCUS_IDS.map((id) => `<label><input type="checkbox" name="learningProgramFocus" value="${escapeHtml(id)}"${checkedAttr(focusAreas, id, DEFAULT_OWNER_PROGRAM.focusAreas.includes(id))}> ${escapeHtml(focusLabel(id))}</label>`).join("")}
        </fieldset>
        <details class="learning-owner-advanced compact">
          <summary>查看内容依据引用</summary>
          <textarea id="learningProgramSourceRefs" class="input" rows="2" placeholder="依据来源摘要，一行一个">${escapeHtml(sourceRefs)}</textarea>
        </details>
        <button class="learning-coin-primary" type="submit">保存阶段目标和内容范围</button>
      </form>
    </section>`;
}

export function renderReviewQueue(reviewItems = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const items = asArray(reviewItems);
  if (!isOwner(options) || !items.length) return "";
  return `<section class="learning-coin-panel learning-program-review-panel" data-learning-review-queue>
      <div class="learning-section-heading">
        <h3>家长审核队列</h3>
        <span>${escapeHtml(String(items.length))}</span>
      </div>
      <div class="learning-program-review-list">
        ${items.map((item) => `<article class="learning-program-review-item" data-learning-review-id="${escapeHtml(item.reviewId)}">
          <div>
            <strong>${escapeHtml(item.summary || item.reason || item.reviewId)}</strong>
            <p>${escapeHtml(compactRiskFlags(item.riskFlags))}</p>
          </div>
          <div class="learning-program-actions">
            <button type="button" data-learning-review-decision="${escapeHtml(item.reviewId)}" data-decision="approved">通过</button>
            <button type="button" data-learning-review-decision="${escapeHtml(item.reviewId)}" data-decision="returned_for_revision">返回修改</button>
            <button type="button" data-learning-review-decision="${escapeHtml(item.reviewId)}" data-decision="rejected">拒绝</button>
          </div>
        </article>`).join("")}
      </div>
    </section>`;
}

export function renderParentReviewRequests(reviewRequests = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const items = asArray(reviewRequests);
  if (!isOwner(options) || !items.length) return "";
  return `<section class="learning-coin-panel learning-program-review-panel" data-learning-parent-review-requests>
      <div class="learning-section-heading">
        <h3>家长复核</h3>
        <span>${escapeHtml(String(items.length))}</span>
      </div>
      <div class="learning-program-review-list">
        ${items.map((item) => {
          const canDecide = clean(item.status) === "pending";
          const detail = [parentReviewTypeText(item.requestType), reviewStatusText(item.status), compactRiskFlags(item.riskFlags)].filter(Boolean).join(" / ");
          return `<article class="learning-program-review-item" data-learning-parent-review-request-id="${escapeHtml(item.reviewRequestId)}">
            <div>
              <strong>${escapeHtml(item.summary || item.reason || item.reviewRequestId)}</strong>
              <p>${escapeHtml(detail)}</p>
            </div>
            ${canDecide ? `<div class="learning-program-actions">
              <button type="button" data-learning-parent-review-decision="${escapeHtml(item.reviewRequestId)}" data-decision="approved">通过</button>
              <button type="button" data-learning-parent-review-decision="${escapeHtml(item.reviewRequestId)}" data-decision="returned_for_revision">返回修改</button>
              <button type="button" data-learning-parent-review-decision="${escapeHtml(item.reviewRequestId)}" data-decision="rejected">拒绝</button>
            </div>` : `<span class="learning-program-status-chip">${escapeHtml(reviewStatusText(item.status))}</span>`}
          </article>`;
        }).join("")}
      </div>
    </section>`;
}

export function renderRewardSettlements(rewardSettlements = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const items = asArray(rewardSettlements);
  if (!isOwner(options) || !items.length) return "";
  return `<section class="learning-coin-panel learning-program-review-panel" data-learning-reward-settlements>
      <div class="learning-section-heading">
        <h3>奖励结算</h3>
        <span>${escapeHtml(String(items.length))}</span>
      </div>
      <div class="learning-program-review-list">
        ${items.map((item) => `<article class="learning-program-review-item" data-learning-reward-settlement-id="${escapeHtml(item.rewardSettlementId)}">
          <div>
            <strong>${escapeHtml([settlementStatusText(item.status), formatCoinAmount(item.coinAmount)].join(" / "))}</strong>
            <p>${escapeHtml([item.reason, item.sourceType, item.evaluationId].filter(Boolean).join(" / "))}</p>
          </div>
          <span class="learning-program-status-chip">${escapeHtml(settlementStatusText(item.status))}</span>
        </article>`).join("")}
      </div>
    </section>`;
}

export function renderLaunchQueue(title = "", items = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const sourceItems = asArray(items);
  const compact = Boolean(options.compactOwnerSettings);
  const list = sourceItems.slice(0, compact ? 3 : 4);
  if (!list.length) return "";
  const body = `<div class="learning-program-review-list">
      ${list.map((item) => `<article class="learning-program-review-item" data-learning-launch-operation-item="${escapeHtml(item.resourceType || item.type || "")}:${escapeHtml(item.resourceId || "")}">
        <div>
          <strong>${escapeHtml(item.title || item.resourceId || item.resourceType || "")}</strong>
          <p>${escapeHtml(operationReasonText(item.reasonCode))}</p>
        </div>
        <span class="learning-program-status-chip">${escapeHtml(item.priority || item.status || "normal")}</span>
      </article>`).join("")}
    </div>`;
  if (compact) {
    return `<details class="learning-launch-queue learning-launch-queue-compact">
        <summary><strong>${escapeHtml(title)}</strong><span>${escapeHtml(String(sourceItems.length))}</span></summary>
        ${body}
      </details>`;
  }
  return `<div class="learning-launch-queue">
      <strong>${escapeHtml(title)}</strong>
      ${body}
    </div>`;
}

export function renderLaunchOperationsPanel(launchOperations = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!isOwner(options) || !launchOperations || typeof launchOperations !== "object") return "";
  const counts = launchOperations.counts || {};
  const queues = launchOperations.queues || {};
  const nextActions = asArray(launchOperations.nextActions).slice(0, options.compactOwnerSettings ? 3 : 5);
  const compact = Boolean(options.compactOwnerSettings);
  return `<section class="learning-coin-panel learning-launch-operations-panel${compact ? " is-owner-settings-summary" : ""}" data-learning-launch-operations data-launch-status="${escapeHtml(launchOperations.status || "")}">
      <div class="learning-section-heading">
        <h3>${compact ? "待处理" : "4. 生成计划并审核"}</h3>
        <span>${escapeHtml(launchStatusText(launchOperations.status))}</span>
      </div>
      <div class="learning-program-report-grid">
        <span><strong>${escapeHtml(String(counts.publishedTasks || 0))}</strong><small>已下发任务</small></span>
        <span><strong>${escapeHtml(String(counts.activeSessions || 0))}</strong><small>进行中</small></span>
        <span><strong>${escapeHtml(String((counts.pendingPlanReviews || 0) + (counts.pendingParentReviews || 0)))}</strong><small>待审核</small></span>
        <span><strong>${escapeHtml(String((counts.pendingRewardSettlements || 0) + (counts.rewardCandidates || 0)))}</strong><small>待结算</small></span>
      </div>
      <div class="learning-launch-next-actions">
        ${nextActions.length ? nextActions.map((item) => `<span data-learning-launch-next-action="${escapeHtml(item.id || "")}">${escapeHtml(operationReasonText(item.reasonCode))}</span>`).join("") : `<span>当前无必处理项</span>`}
      </div>
      ${renderLaunchQueue("阻断项", queues.blockers || [], options)}
      ${renderLaunchQueue("审核队列", queues.approvals || [], options)}
      ${renderLaunchQueue("执行队列", queues.execution || [], options)}
      ${renderLaunchQueue("奖励队列", queues.rewards || [], options)}
    </section>`;
}

export function renderParentReportPanel(data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!isOwner(options)) return "";
  const report = options.parentReport || data.parentReport || null;
  const loading = Boolean(options.parentReportLoading);
  const error = clean(options.parentReportError);
  const counts = report?.counts || {};
  return `<section class="learning-coin-panel learning-parent-report-panel" data-learning-parent-report>
      <div class="learning-section-heading">
        <h3>家长周报</h3>
        <button type="button" data-learning-parent-report-refresh>${loading ? "生成中" : "刷新周报"}</button>
      </div>
      ${error ? `<div class="learning-coin-empty">${escapeHtml(error)}</div>` : ""}
      ${report ? `<div class="learning-program-report-grid">
        <span><strong>${escapeHtml(String(counts.plannedTasks || 0))}</strong><small>本周任务</small></span>
        <span><strong>${escapeHtml(String(counts.passedEvaluations || 0))}</strong><small>通过评估</small></span>
        <span><strong>${escapeHtml(String(counts.coinsSettled || 0))}</strong><small>结算金币</small></span>
        <span><strong>${escapeHtml(String(counts.pendingReviews || 0))}</strong><small>待审核</small></span>
      </div>
      <div class="learning-program-report-actions">
        ${asArray(report.nextActions).slice(0, 4).map((item) => `<p>${escapeHtml([item.reason, item.resourceType, item.resourceId].filter(Boolean).join(" / "))}</p>`).join("") || `<p>暂无待处理项</p>`}
      </div>` : `<div class="learning-coin-empty">点击刷新后生成本周摘要报告。</div>`}
    </section>`;
}

export function renderParentAdminPanel(data = {}, options = {}) {
  if (!isOwner(options)) return "";
  const foundationPanel = typeof options.renderFoundationPanel === "function"
    ? options.renderFoundationPanel(data, options)
    : renderFoundationPanel(data, options);
  const programForm = typeof options.renderProgramForm === "function"
    ? options.renderProgramForm(data, options)
    : renderProgramForm(data, options);
  return `<section class="learning-growth-category learning-program-parent-admin" data-learning-growth-category="parent-admin">
      <div class="learning-growth-category-heading">
        <h3>家长配置向导</h3>
        <span>4 steps</span>
      </div>
      ${renderLaunchOperationsPanel(data.launchOperations || options.launchOperations || {}, options)}
      ${foundationPanel}
      ${programForm}
      ${renderParentReportPanel(data, options)}
      ${renderReviewQueue(data.reviewItems || [], options)}
      ${renderParentReviewRequests(data.parentReviewRequests || [], options)}
      ${renderRewardSettlements(data.rewardSettlements || [], options)}
    </section>`;
}
