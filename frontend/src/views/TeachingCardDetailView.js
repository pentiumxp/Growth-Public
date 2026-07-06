import { renderCardInteractionPanel } from "../features/card-interaction/CardInteractionController.js";
import { dailyRewardCap, dailyRewardEarned } from "../features/card-interaction/ExperienceSignalPanel.js";
import { deterministicScoreText } from "../features/card-interaction/SubmissionPanel.js";
import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";

function asArray(value, limit = 6) {
  return Array.isArray(value) ? value.filter((item) => clean(item)).slice(0, limit) : [];
}

function objectValue(value) {
  return value && typeof value === "object" ? value : {};
}

function taskId(task = {}) {
  return clean(task.taskCardId || task.id || task.cardId);
}

export function growthCardRole(task = {}) {
  const role = clean(task.cardRole || task.card_role || task.learningGrowthCardRole)
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (["teaching", "practice", "integration_practice", "stage_assessment"].includes(role)) return role;
  const type = clean(task.taskCardType || task.task_card_type || task.taskModel?.taskCardType).toLowerCase();
  const activity = clean(task.activityType || task.taskModel?.activityType).toLowerCase();
  if (type === "challenge_card" || activity === "weekly_challenge") return "stage_assessment";
  return "stage_assessment";
}

export function growthCardRoleLabel(role = "") {
  if (role === "teaching") return "教学卡";
  if (role === "practice") return "练习卡";
  if (role === "integration_practice") return "综合练习";
  if (role === "stage_assessment") return "能力测验";
  return "成长卡";
}

export function isTeachingCardDetail(task = {}) {
  return Boolean(
    task.teachingFlow
    || task.flow
    || task.quickCheck
    || task.lesson
    || task.guidedPractice
    || task.cardRole
    || task.learningGrowthCardRole
  );
}

export function teachingFlow(task = {}) {
  const model = objectValue(task.taskModel || task.learningTaskModel);
  const flow = objectValue(task.teachingFlow || task.flow);
  const lesson = objectValue(flow.lesson || task.lesson);
  const microLesson = objectValue(flow.microLesson);
  const workedExample = objectValue(flow.workedExample || task.workedExample);
  const guided = objectValue(flow.guidedPractice || task.guidedPractice);
  const quick = objectValue(flow.quickCheck || task.quickCheck);
  const workedSteps = asArray(workedExample.steps, 5);
  const microLessonText = typeof flow.microLesson === "string"
    ? flow.microLesson
    : clean(microLesson.explanation || microLesson.summary || microLesson.text);
  const examples = asArray(lesson.examples, 4).length
    ? asArray(lesson.examples, 4)
    : workedSteps.length
      ? workedSteps.map((step) => [step?.label, step?.text].filter(Boolean).join(": "))
      : asArray(task.deliverables || model.deliverables, 4);
  const criteria = asArray(quick.completionCriteria, 5).length
    ? asArray(quick.completionCriteria, 5)
    : asArray(task.acceptance || model.acceptance, 5);

  return {
    learningTarget: clean(flow.learningTarget || lesson.learningTarget || task.learningTarget || model.learningTarget),
    prerequisites: asArray(flow.prerequisites || task.prerequisites || model.prerequisites, 5),
    lesson: {
      title: clean(lesson.title || task.title || "学习重点"),
      explanation: clean(
        lesson.explanation
        || microLessonText
        || task.learnerInstruction
        || task.instruction
        || model.learnerInstruction
        || task.summary
        || "先看讲解，再做一个很小的检查。"
      ),
      whyItMatters: clean(flow.whyItMatters || flow.why),
      keyPoints: asArray(microLesson.keyPoints, 5),
      examples,
      workedExample: {
        instruction: clean(workedExample.instruction),
        steps: workedSteps
      }
    },
    guidedPractice: {
      instruction: clean(guided.instruction || guided.prompt || task.guidedPracticePrompt || "照着讲解做一小步，不需要一次写得很完整。"),
      hints: asArray(guided.hints, 4)
    },
    quickCheck: {
      instruction: clean(quick.instruction || quick.prompt || "用 1-3 句话说明你刚才学会了什么，或者写一个最小答案。"),
      completionCriteria: criteria
    },
    tooHardFallback: clean(flow.tooHardFallback || task.tooHardFallback),
    evidenceToRecord: asArray(flow.evidenceToRecord || task.evidenceToRecord, 4),
    difficultyBasis: clean(flow.difficultyBasis || task.difficultyBasis),
    supportLevel: clean(flow.supportLevel || task.supportLevel)
  };
}

export function generatedCardStatusLabel(task = {}) {
  if (task.latestReflection) return "反思已记录";
  if (task.latestEvaluation) return "批改已完成";
  if (clean(task.latestEvaluationJob?.status).toLowerCase() === "failed") return "批改未完成";
  if (task.latestSubmission) return "等待批改";
  return "待作答";
}

export function renderGrowthCardRoleBadge(role = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  return `<span class="learning-growth-role-badge is-${escapeHtml(role)}">${escapeHtml(growthCardRoleLabel(role))}</span>`;
}

export function renderLearningGrowthCardShareButton(cardId = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const id = clean(cardId);
  if (!id) return "";
  const label = "分享学习卡图片";
  return `<button type="button" class="learning-growth-card-share-button" data-learning-growth-card-share="${escapeHtml(id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">分享</button>`;
}

export function renderDailyFlowRail(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const hasSubmission = Boolean(task.latestSubmission);
  const hasEvaluation = Boolean(task.latestEvaluation);
  const evaluationFailed = clean(task.latestEvaluationJob?.status).toLowerCase() === "failed";
  const hasReflection = Boolean(task.latestReflection);
  const steps = [
    ["submit", "提交", hasSubmission ? "done" : "current", hasSubmission ? "已提交" : "待提交"],
    ["evaluate", "批改", hasEvaluation ? "done" : evaluationFailed ? "current" : hasSubmission ? "current" : "pending", hasEvaluation ? "已完成" : evaluationFailed ? "需要处理" : hasSubmission ? "处理中" : "待提交后"],
    ["reflect", "反思", hasReflection ? "done" : hasEvaluation ? "current" : "pending", hasReflection ? "已记录" : hasEvaluation ? "待反思" : "待批改后"]
  ];
  return `<div class="learning-growth-daily-flow" data-learning-growth-daily-flow>
      ${steps.map(([key, label, state, status]) => `<span class="is-${escapeHtml(state)}" data-learning-growth-flow-step="${escapeHtml(key)}"><b>${escapeHtml(label)}</b><small>${escapeHtml(status)}</small></span>`).join("")}
    </div>`;
}

export function renderDailyScorePolicyPanel(task = {}, flow = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cap = dailyRewardCap(task);
  const earned = dailyRewardEarned(task);
  const score = task.latestEvaluation ? deterministicScoreText(task.latestEvaluation) : "";
  const support = [flow.supportLevel, flow.difficultyBasis].filter(Boolean).join(" · ");
  return `<section class="learning-growth-answer-reward learning-growth-daily-score-policy" data-learning-growth-daily-score-policy>
      <div class="learning-growth-answer-reward-head">
        <h4>学习流程</h4>
        <strong>${escapeHtml(generatedCardStatusLabel(task))}</strong>
      </div>
      <div class="learning-growth-answer-reward-grid">
        <span><b>1 次</b><small>提交作答</small></span>
        <span><b>1 次</b><small>系统批改</small></span>
        <span><b>1 次</b><small>学习反思</small></span>
        <span><b>${escapeHtml(score || "待评分")}</b><small>${escapeHtml(earned ? `已结算 ${earned} 金币` : `${cap} 金币上限`)}</small></span>
      </div>
      <p>这张日常卡按提交、批改、反思三步完成。每一步只保留一个输入位置；批改只运行一次，并按一次批改结果打分，不要求达到固定通过线。</p>
      ${support ? `<p class="learning-growth-daily-support">${escapeHtml(support)}</p>` : ""}
    </section>`;
}

export function renderTeachingLessonSection(flow = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  return `<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="lesson">
      <h4>学习目标</h4>
      <p>${escapeHtml(flow.learningTarget || flow.lesson?.title || "学习重点")}</p>
      ${flow.prerequisites?.length ? `<div class="learning-growth-teaching-hints" data-learning-growth-prerequisites>${flow.prerequisites.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      <h4>讲解</h4>
      ${flow.lesson?.whyItMatters ? `<p class="learning-growth-teaching-why">${escapeHtml(flow.lesson.whyItMatters)}</p>` : ""}
      <p>${escapeHtml(flow.lesson?.explanation || "")}</p>
      ${flow.lesson?.keyPoints?.length ? `<ul>${flow.lesson.keyPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${flow.lesson?.workedExample?.steps?.length ? `<div class="learning-growth-teaching-worked-example">
        ${flow.lesson.workedExample.instruction ? `<strong>${escapeHtml(flow.lesson.workedExample.instruction)}</strong>` : ""}
        ${flow.lesson.workedExample.steps.map((step) => `<article><b>${escapeHtml(step.label || "")}</b><p>${escapeHtml(step.text || "")}</p></article>`).join("")}
      </div>` : ""}
      ${flow.lesson?.examples?.length ? `<ul>${flow.lesson.examples.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </section>`;
}

export function renderTeachingGuidedPracticeSection(task = {}, flow = {}, draft = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  return `<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="guided_practice">
      <h4>跟着做一小步</h4>
      <p>${escapeHtml(flow.guidedPractice?.instruction || "照着讲解做一小步，不需要一次写得很完整。")}</p>
      ${flow.guidedPractice?.hints?.length ? `<div class="learning-growth-teaching-hints">${flow.guidedPractice.hints.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      <p class="learning-native-growth-submission-state">这里先看提示和例子；需要写下来的内容统一放到下面的提交框。</p>
    </section>`;
}

export function renderTeachingCardDetailView(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = taskId(task);
  const role = growthCardRole(task);
  const flow = teachingFlow(task);
  const state = options.state || {};
  const draft = Object.assign({}, state.learningGrowthTeachingDrafts?.[cardId] || {});
  const duration = task.expectedDurationMinutes || {};
  const min = Number(duration.min || task.plannedMinutes || 10);
  const max = Number(duration.max || Math.max(min, 15));
  const workspaceId = clean(options.workspaceId || task.workspaceId);
  return `<section class="learning-growth-answer-card learning-growth-card-detail-shell learning-growth-teaching-card" data-learning-growth-answer-card data-learning-growth-teaching-card="${escapeHtml(cardId)}" data-learning-growth-card-role="${escapeHtml(role)}" data-learning-executable-task-id="${escapeHtml(cardId)}">
      <div class="learning-growth-card-detail-hero learning-growth-teaching-hero">
        <div class="learning-growth-teaching-head learning-growth-card-detail-head">
          <div>${renderGrowthCardRoleBadge(role, options)}<span>${escapeHtml(`约 ${min || 10}-${max || 15} 分钟`)}</span><span>${escapeHtml(`${dailyRewardCap(task)} 金币`)}</span></div>
          <div class="learning-growth-card-detail-actions">${renderLearningGrowthCardShareButton(cardId, options)}<button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button></div>
        </div>
        <h3>${escapeHtml(task.title || "学习卡")}</h3>
      </div>
      ${renderDailyFlowRail(task, options)}
      ${renderDailyScorePolicyPanel(task, flow, options)}
      ${renderTeachingLessonSection(flow, options)}
      ${renderTeachingGuidedPracticeSection(task, flow, draft, options)}
      ${renderCardInteractionPanel(task, Object.assign({}, options, { flow, state, workspaceId }))}
    </section>`;
}
