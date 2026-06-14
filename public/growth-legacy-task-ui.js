"use strict";

// Plugin-owned migration baseline copied from the previous Home AI Growth UI.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.HermesLearningGrowthTaskUi = factory();
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function taskModel(todo = {}) {
    const model = todo?.learningTaskModel || null;
    if (model && typeof model === "object") return model;
    const summary = todo?.learningGrowthTaskModel || null;
    return summary && typeof summary === "object" ? summary : null;
  }

  function activityLabel(value) {
    const activity = String(value || "").trim();
    if (activity === "writing") return "\u5199\u4f5c";
    if (activity === "reading") return "\u9605\u8bfb";
    if (activity === "listening") return "\u542c\u529b";
    if (activity === "speaking") return "\u53e3\u8bed";
    if (activity === "pronunciation") return "\u53d1\u97f3";
    if (activity === "vocabulary") return "\u8bcd\u6c47";
    if (activity === "grammar") return "\u8bed\u6cd5";
    if (activity === "rewriting") return "\u6539\u5199";
    if (activity === "presentation") return "\u6f14\u8bb2";
    if (activity === "weekly_challenge") return "\u5468\u6311\u6218";
    return activity || "\u7ec3\u4e60";
  }

  function nextActionLabel(action) {
    const value = String(action || "").trim();
    if (value === "submit_first_attempt") return "\u63d0\u4ea4\u7b2c\u4e00\u6b21\u4f5c\u7b54";
    if (value === "wait_for_feedback") return "\u7b49\u5f85 AI \u6279\u6539";
    if (value === "submit_revision") return "\u63d0\u4ea4\u4fee\u6539\u7248";
    if (value === "submit_revision_and_reflection") return "\u63d0\u4ea4\u4fee\u6539\u7248";
    if (value === "submit_spoken_reflection") return "\u5f55\u97f3\u590d\u76d8";
    if (value === "review_feedback") return "\u67e5\u770b\u53cd\u9988";
    return value || "\u5f00\u59cb\u4efb\u52a1";
  }

  function submissionPrompt(evaluation = {}, todo = {}) {
    const nextStep = String(evaluation.nextStep || "");
    if (nextStep === "rewrite_and_reflect") return "\u6309 AI \u6279\u6539\u5199\u4e0b\u4fee\u6539\u540e\u7684\u7248\u672c\uff0c\u4fdd\u7559\u660e\u663e\u4fee\u6539\uff0c\u7136\u540e\u63d0\u4ea4\u3002";
    if (nextStep === "revise_and_resubmit") return "\u6309\u6279\u6539\u62a5\u544a\u518d\u6539\u4e00\u7248\uff0c\u7136\u540e\u63d0\u4ea4\u3002";
    const activity = String(taskModel(todo)?.activityType || "").trim();
    if (activity === "vocabulary") return "\u5199\u4e0b\u672c\u6b21\u8bcd\u6c47\u9020\u53e5\uff0c\u5c3d\u91cf\u7528\u5b66\u6821\u6216\u751f\u6d3b\u573a\u666f\u3002";
    if (activity === "grammar") return "\u5199\u4e0b\u4fee\u6539\u540e\u7684\u53e5\u5b50\u548c\u4e00\u53e5\u89c4\u5219\u603b\u7ed3\u3002";
    if (activity === "reading") return "\u5199\u4e0b\u9605\u8bfb\u7b54\u6848\u3001\u7406\u7531\u548c\u4e0d\u786e\u5b9a\u7684\u5730\u65b9\u3002";
    if (activity === "listening") return "\u5199\u4e0b\u542c\u5230\u7684 3-5 \u4e2a\u8981\u70b9\uff0c\u518d\u6807\u51fa\u6700\u4e0d\u786e\u5b9a\u7684\u4e00\u5904\u3002";
    if (activity === "speaking") return "\u5199\u4e0b\u590d\u8ff0\u7a3f\u6216\u53e3\u8bed\u590d\u8ff0\u8981\u70b9\uff1a\u4e3b\u65e8\u3001\u4e24\u4e2a\u7ec6\u8282\u548c\u4e00\u53e5\u590d\u76d8\u3002";
    if (activity === "pronunciation") return "\u5199\u4e0b\u8ddf\u8bfb\u53e5\u5b50\u3001\u89c9\u5f97\u6700\u96be\u7684\u53d1\u97f3\u70b9\uff0c\u4ee5\u53ca\u4fee\u590d\u540e\u7684\u91cd\u8bfb\u53e5\u3002";
    if (activity === "rewriting") return "\u5199\u4e0b\u6539\u5199\u7248\u3001\u4fee\u6539\u7406\u7531\u548c\u4e00\u4e2a\u53d8\u5f0f\u4fee\u590d\u53e5\u3002";
    if (activity === "presentation") return "\u5199\u4e0b\u6f14\u8bb2\u63d0\u7eb2\uff1a\u5f00\u573a\u3001\u4e24\u4e2a\u8981\u70b9\u3001\u7ed3\u5c3e\uff0c\u5e76\u8865\u4e00\u53e5\u6392\u7ec3\u53cd\u601d\u3002";
    if (activity === "weekly_challenge") return "\u5199\u4e0b\u672c\u5468\u7efc\u5408\u4f5c\u7b54\uff1a\u4e00\u4e2a\u5b8c\u6574\u56de\u7b54\u3001\u4e00\u4e2a\u6539\u8fdb\u53e5\u548c\u4e00\u53e5\u590d\u76d8\u3002";
    return "\u5199\u4e0b\u672c\u6b21\u5b66\u4e60\u4efb\u52a1\u4f5c\u7b54\u3002";
  }

  const DEFAULT_SUBMISSION_GUARDS = Object.freeze({
    default: Object.freeze({ minWords: 40, minChars: 200 }),
    writing: Object.freeze({ minWords: 80, minChars: 300 }),
    rewriting: Object.freeze({ minWords: 70, minChars: 380 }),
    vocabulary: Object.freeze({ minWords: 40, minChars: 220 }),
    grammar: Object.freeze({ minWords: 35, minChars: 180 }),
    reading: Object.freeze({ minWords: 50, minChars: 250 }),
    listening: Object.freeze({ minWords: 35, minChars: 180 }),
    speaking: Object.freeze({ minWords: 45, minChars: 220 }),
    pronunciation: Object.freeze({ minWords: 20, minChars: 100 }),
    presentation: Object.freeze({ minWords: 60, minChars: 320 }),
    weekly_challenge: Object.freeze({ minWords: 80, minChars: 450 }),
  });

  function positiveInt(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  function submissionStage(evaluation = {}, todo = {}) {
    const explicit = String(evaluation.stage || evaluation.submissionStage || todo?.learningGrowthSubmissionStage || "").trim().toLowerCase();
    if (["final", "rewrite", "revision", "resubmission"].includes(explicit)) return "final";
    if (["draft", "first_draft", "initial"].includes(explicit)) return "draft";
    const status = String(evaluation.status || todo?.learningGrowthEvaluationStatus || "").trim().toLowerCase();
    if (["draft_feedback", "needs_revision", "review_required", "pending_review"].includes(status)) return "final";
    return "draft";
  }

  function submissionGuard(modelOrTodo = {}, evaluation = {}) {
    const model = taskModel(modelOrTodo) || (modelOrTodo && typeof modelOrTodo === "object" ? modelOrTodo : {});
    const activity = String(model.activityType || "").trim().toLowerCase();
    const base = DEFAULT_SUBMISSION_GUARDS[activity] || DEFAULT_SUBMISSION_GUARDS.default;
    const contract = model && typeof model === "object" ? (model.submissionContract || {}) : {};
    const firstPass = submissionStage(evaluation, modelOrTodo) === "draft";
    const multiplier = firstPass ? 1 : 0.6;
    return {
      activityType: activity || "default",
      stage: firstPass ? "draft" : "final",
      minWords: positiveInt(contract.minSubmissionWords ?? contract.minimumWords ?? contract.minWords, Math.max(25, Math.round(base.minWords * multiplier))),
      minChars: positiveInt(contract.minSubmissionChars ?? contract.minimumChars ?? contract.minChars, Math.max(120, Math.round(base.minChars * multiplier))),
    };
  }

  function submissionTextStats(text) {
    const value = String(text || "").trim();
    const words = value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || [];
    return {
      words: words.length,
      chars: value.replace(/\s+/g, "").length,
    };
  }

  function validateSubmissionText(text, guard = {}) {
    const stats = submissionTextStats(text);
    const minWords = positiveInt(guard.minWords, 0);
    const minChars = positiveInt(guard.minChars, 0);
    if ((!minWords || stats.words >= minWords) && (!minChars || stats.chars >= minChars)) return { ok: true, stats, guard };
    return {
      ok: false,
      stats,
      guard,
      message: `\u4f5c\u7b54\u8fc7\u77ed\uff1a\u81f3\u5c11 ${minWords} \u4e2a\u82f1\u6587\u8bcd\u3001${minChars} \u4e2a\u6709\u6548\u5b57\u7b26\u540e\u518d\u63d0\u4ea4\u3002`,
    };
  }

  function submissionRequirementLabel(guard = {}, stats = null) {
    const minWords = positiveInt(guard.minWords, 0);
    const minChars = positiveInt(guard.minChars, 0);
    const prefix = `\u81f3\u5c11 ${minWords} \u4e2a\u82f1\u6587\u8bcd / ${minChars} \u4e2a\u6709\u6548\u5b57\u7b26`;
    if (!stats) return prefix;
    const missingWords = Math.max(0, minWords - Number(stats.words || 0));
    const missingChars = Math.max(0, minChars - Number(stats.chars || 0));
    if (!missingWords && !missingChars) return `\u5df2\u8fbe\u6807\uff1a${prefix}\uff1b\u5f53\u524d ${stats.words} \u8bcd / ${stats.chars} \u5b57\u7b26\u3002`;
    const gaps = [];
    if (missingWords) gaps.push(`\u8fd8\u5dee ${missingWords} \u4e2a\u82f1\u6587\u8bcd`);
    if (missingChars) gaps.push(`\u8fd8\u5dee ${missingChars} \u4e2a\u6709\u6548\u5b57\u7b26`);
    return `\u672a\u8fbe\u6807\uff1a${gaps.join("\uff0c")}\uff1b\u8981\u6c42 ${prefix}\uff1b\u5f53\u524d ${stats.words} \u8bcd / ${stats.chars} \u5b57\u7b26\u3002`;
  }

  function canWithdrawSubmission(submitted = {}, todo = {}, evaluation = {}) {
    const submittedAt = Date.parse(submitted.submittedAt || todo?.learningGrowthSubmissionAt || "");
    if (!Number.isFinite(submittedAt)) return false;
    const reward = evaluation.reward || {};
    const rewardStatus = String(reward.status || todo?.learningGrowthRewardStatus || "").trim().toLowerCase();
    const kanbanStatus = String(todo?.kanbanStatus || todo?.kanban_status || todo?.status || "").trim().toLowerCase();
    const completed = ["done", "archived", "cancelled", "canceled", "completed"].includes(kanbanStatus) || String(evaluation.nextStep || "").trim() === "completed";
    return Date.now() - submittedAt >= 0 && Date.now() - submittedAt <= 5 * 60 * 1000 && !completed && rewardStatus !== "settled" && !reward.entryId;
  }

  function escapeHtmlLocal(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function reportHistory(todo = {}, evaluation = {}) {
    const raw = Array.isArray(evaluation.reportHistory) && evaluation.reportHistory.length
      ? evaluation.reportHistory
      : (Array.isArray(todo.learningGrowthReportHistory) && todo.learningGrowthReportHistory.length ? todo.learningGrowthReportHistory : []);
    const fromOutputs = Array.isArray(todo.kanbanOutputs)
      ? todo.kanbanOutputs.filter((item) => String(item?.role || "").includes("learning-growth") && /report|feedback|\u6279\u6539|\u8bc4\u4ef7/i.test(String(item?.role || item?.name || "")))
      : [];
    const seen = new Set();
    return raw.concat(fromOutputs).filter((item) => item && typeof item === "object").map((item, index) => Object.assign({ attemptIndex: index + 1 }, item)).filter((item) => {
      const key = String(item.path || item.url || item.name || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(-12);
  }

  function outcomeText(evaluation = {}, interactionState = {}) {
    const status = String(evaluation.status || "").trim();
    const nextStep = String(evaluation.nextStep || interactionState.nextStep || "").trim();
    const passLine = Number(evaluation.finalPassingScore || evaluation.passingScore || interactionState.finalPassingScore || 80) || 80;
    const score = Number(evaluation.score);
    const scoreReachedPassLine = Number.isFinite(score) && score >= passLine;
    const completionPolicy = Object.assign({}, interactionState.completionPolicy || {}, evaluation.completionPolicy || {});
    const completionDecision = String(evaluation.completionDecision || interactionState.completionDecision || "").trim();
    const completedBySeriousAttempts = completionPolicy.threeSeriousSubmissionsComplete === true
      || (completionDecision === "complete_current_card" && Number(completionPolicy.attemptNo || 0) >= 3);
    if (nextStep === "spoken_reflection_required" || status === "reflection_required" || interactionState.requiresReflection || interactionState.canSubmitReflection) {
      if (completedBySeriousAttempts || !scoreReachedPassLine) {
        return {
          kind: "reflection",
          title: "\u4e09\u6b21\u8ba4\u771f\u63d0\u4ea4\u5df2\u5b8c\u6210\uff0c\u5f85\u5f55\u97f3\u590d\u76d8",
          body: "\u672c\u5361\u6309\u4e09\u6b21\u8ba4\u771f\u63d0\u4ea4\u673a\u5236\u8fdb\u5165\u590d\u76d8\uff1b\u786e\u5b9a\u5206\u6570\u4ecd\u4fdd\u7559\u4e3a\u672c\u9875\u663e\u793a\u7684\u771f\u5b9e\u5206\u3002\u5f55\u97f3\u590d\u76d8\u63d0\u4ea4\u540e\u5b8c\u6210\u7ed3\u7b97\uff0c\u8584\u5f31\u70b9\u4f1a\u8fdb\u5165\u540e\u7eed\u7ec3\u4e60\u3002",
        };
      }
      return { kind: "reflection", title: "\u6700\u7ec8\u8bc4\u5206\u5df2\u8fbe\u6807\uff0c\u5f85\u5f55\u97f3\u590d\u76d8", body: `\u6700\u7ec8\u5206\u6570\u5df2\u8fbe\u5230 ${passLine} \u5206\u7ebf\uff0c\u5148\u770b\u672c\u9875\u6700\u8fd1\u6279\u6539\u548c\u590d\u76d8\u63d0\u793a\uff0c\u518d\u7528\u5f55\u97f3\u8bf4\u660e\u9519\u8bef\u3001\u539f\u56e0\u548c\u4e0b\u6b21\u6539\u8fdb\u3002\u590d\u76d8\u901a\u8fc7\u540e\u518d\u7ed3\u7b97\u5206\u6570\u548c\u91d1\u5e01\u3002` };
    }
    if (evaluation.passed || nextStep === "completed" || status === "completed") return { kind: "passed", title: "\u672c\u6b21\u5df2\u901a\u8fc7", body: "\u6309\u672c\u9875\u6700\u8fd1\u6279\u6539\u7684\u8981\u70b9\u5b8c\u6210\u540e\u7eed\u590d\u76d8\u6216\u7ed3\u7b97\u3002" };
    if ((nextStep === "rewrite_and_reflect" || status === "draft_feedback") && scoreReachedPassLine) {
      return {
        kind: "reflection",
        title: "\u521d\u7a3f\u6279\u6539\u5df2\u8fbe\u6807\uff0c\u5f85\u53cd\u601d\u548c\u4fee\u6539\u590d\u76d8",
        body: `\u8fd9\u4e2a ${scoreReachedPassLine ? `${passLine} \u5206\u7ebf` : "\u9636\u6bb5"} \u5df2\u8fbe\u5230\uff0c\u4f46\u672c\u5361\u8fd8\u6ca1\u6709\u6700\u7ec8\u5b8c\u6210\u3002\u4e0b\u4e00\u6b65\u9700\u8981\u5148\u770b AI \u6279\u6539\uff0c\u518d\u6309\u63d0\u793a\u505a\u4fee\u6539\u548c\u53cd\u601d\uff1b\u590d\u76d8\u5b8c\u6210\u540e\uff0c\u7cfb\u7edf\u624d\u4f1a\u8fdb\u5165\u6700\u7ec8\u5b8c\u6210\u548c\u7ed3\u7b97\u3002`,
      };
    }
    if (nextStep === "rewrite_and_reflect" || nextStep === "revise_and_resubmit" || status === "needs_revision" || status === "draft_feedback") return { kind: "revision", title: "\u672c\u6b21\u8fd8\u9700\u8981\u4fee\u6539", body: "\u5148\u770b\u672c\u9875\u4e0b\u65b9\u7684\u8be6\u7ec6\u6279\u6539\u4fe1\u606f\uff0c\u6309\u91cd\u70b9\u4fee\u6539\u540e\u518d\u63d0\u4ea4\u3002\u6279\u6539\u5386\u53f2\u4f1a\u7ee7\u7eed\u4fdd\u7559\u5728\u4ea4\u4ed8\u76ee\u5f55\u4e2d\u3002" };
    if (status === "pending") return { kind: "pending", title: "\u6b63\u5728\u7b49\u5f85 AI \u6279\u6539", body: "\u4f5c\u7b54\u5df2\u4fdd\u5b58\uff0c\u8bf7\u7b49\u5f85\u672c\u6b21\u6279\u6539\u5b8c\u6210\u3002" };
    return { kind: "review", title: "\u6279\u6539\u7ed3\u679c", body: "\u67e5\u770b\u672c\u6b21\u6279\u6539\u548c\u5386\u53f2\u8bb0\u5f55\uff0c\u518d\u6309\u4e0b\u4e00\u6b65\u63d0\u4ea4\u3002" };
  }

  function deterministicScoreText(evaluation = {}) {
    const score = Number(evaluation.score);
    if (!Number.isFinite(score)) return "\u672a\u8fd4\u56de\u786e\u5b9a\u5206\u6570";
    const maxScore = Number(evaluation.maxScore || evaluation.totalScore || 100);
    const boundedMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    const cleanScore = Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/, "");
    const cleanMax = Number.isInteger(boundedMax) ? String(boundedMax) : boundedMax.toFixed(1).replace(/\.0$/, "");
    return `\u786e\u5b9a\u5206\u6570 ${cleanScore}/${cleanMax}`;
  }

  function renderFeedbackHistory(todo = {}, evaluation = {}) {
    const outcome = outcomeText(evaluation, todo.learningGrowthInteractionState || {});
    const history = reportHistory(todo, evaluation);
    const renderer = typeof globalThis !== "undefined" && typeof globalThis.renderKanbanOutputLinks === "function" ? globalThis.renderKanbanOutputLinks : null;
    const links = history.length ? (renderer ? renderer(history, "todo-detail-outputs compact todo-learning-growth-report-history-links") : `<div class="todo-detail-outputs compact todo-learning-growth-report-history-links">${history.map((item) => `<span>${escapeHtmlLocal(item.name || "\u6279\u6539\u6587\u4ef6")}</span>`).join("")}</div>`) : "";
    const count = history.length ? `<span>${escapeHtmlLocal(`${history.length} \u6b21\u6279\u6539`)}</span>` : "";
    const score = deterministicScoreText(evaluation);
    return `<div class="todo-learning-growth-outcome is-${escapeHtmlLocal(outcome.kind)}"><div class="todo-learning-growth-outcome-head"><strong>${escapeHtmlLocal(outcome.title)}</strong><span class="todo-learning-growth-score-pill" data-learning-growth-feedback-score>${escapeHtmlLocal(score)}</span></div><p>${escapeHtmlLocal(outcome.body)}</p></div>${history.length ? `<div class="todo-learning-growth-report-history"><div class="todo-learning-growth-report-history-head"><strong>${escapeHtmlLocal("\u6279\u6539\u5386\u53f2")}</strong>${count}</div>${links}</div>` : ""}`;
  }

  function growthCardRole(task = {}) {
    const role = String(task.cardRole || task.card_role || task.learningGrowthCardRole || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
    if (role === "teaching" || role === "practice" || role === "integration_practice" || role === "stage_assessment") return role;
    const type = String(task.taskCardType || task.task_card_type || task.taskModel?.taskCardType || "").trim().toLowerCase();
    const activity = String(task.activityType || task.taskModel?.activityType || "").trim().toLowerCase();
    if (type === "challenge_card" || activity === "weekly_challenge") return "stage_assessment";
    return "stage_assessment";
  }

  function isTeachingCardRole(role) {
    return role === "teaching" || role === "practice" || role === "integration_practice";
  }

  function growthCardRoleLabel(role) {
    if (role === "teaching") return "教学卡";
    if (role === "practice") return "练习卡";
    if (role === "integration_practice") return "综合练习";
    if (role === "stage_assessment") return "能力测验";
    return "成长卡";
  }

  function teachingFlow(task = {}) {
    const flow = task.teachingFlow && typeof task.teachingFlow === "object" ? task.teachingFlow : {};
    const model = task.taskModel && typeof task.taskModel === "object" ? task.taskModel : {};
    const lesson = flow.lesson && typeof flow.lesson === "object" ? flow.lesson : {};
    const microLesson = flow.microLesson && typeof flow.microLesson === "object" ? flow.microLesson : {};
    const workedExample = flow.workedExample && typeof flow.workedExample === "object" ? flow.workedExample : {};
    const guided = flow.guidedPractice && typeof flow.guidedPractice === "object" ? flow.guidedPractice : {};
    const quick = flow.quickCheck && typeof flow.quickCheck === "object" ? flow.quickCheck : {};
    const workedSteps = Array.isArray(workedExample.steps) ? workedExample.steps : [];
    const learningTarget = String(flow.learningTarget || lesson.learningTarget || task.learningTarget || model.learningTarget || "").trim();
    const prerequisites = asArray(flow.prerequisites || task.prerequisites || model.prerequisites).slice(0, 5);
    const microLessonText = typeof flow.microLesson === "string"
      ? flow.microLesson
      : String(microLesson.explanation || microLesson.summary || microLesson.text || "").trim();
    const examples = Array.isArray(lesson.examples) && lesson.examples.length
      ? lesson.examples
      : workedSteps.length
        ? workedSteps.map((step) => [step?.label, step?.text].filter(Boolean).join(": "))
        : (Array.isArray(task.deliverables) ? task.deliverables : (Array.isArray(model.deliverables) ? model.deliverables : []));
    const criteria = Array.isArray(quick.completionCriteria) && quick.completionCriteria.length
      ? quick.completionCriteria
      : (Array.isArray(task.acceptance) ? task.acceptance : (Array.isArray(model.acceptance) ? model.acceptance : []));
    return {
      learningTarget,
      prerequisites,
      lesson: {
        title: lesson.title || task.title || "学习重点",
        explanation: lesson.explanation || microLessonText || task.learnerInstruction || task.instruction || model.learnerInstruction || task.summary || "先看讲解，再做一个很小的检查。",
        whyItMatters: flow.whyItMatters || flow.why || "",
        keyPoints: Array.isArray(microLesson.keyPoints) ? microLesson.keyPoints.slice(0, 5) : [],
        examples: examples.slice(0, 4),
        workedExample: {
          instruction: workedExample.instruction || "",
          steps: workedSteps.slice(0, 5),
        },
      },
      guidedPractice: {
        instruction: guided.instruction || guided.prompt || task.guidedPracticePrompt || "照着讲解做一小步，不需要一次写得很完整。",
        hints: Array.isArray(guided.hints) ? guided.hints.slice(0, 4) : [],
      },
      quickCheck: {
        instruction: quick.instruction || quick.prompt || "用 1-3 句话说明你刚才学会了什么，或者写一个最小答案。",
        completionCriteria: criteria.slice(0, 5),
      },
      tooHardFallback: String(flow.tooHardFallback || task.tooHardFallback || "").trim(),
      evidenceToRecord: asArray(flow.evidenceToRecord || task.evidenceToRecord).slice(0, 4),
      difficultyBasis: String(flow.difficultyBasis || task.difficultyBasis || "").trim(),
      supportLevel: String(flow.supportLevel || task.supportLevel || "").trim(),
    };
  }

  function renderGrowthCardRoleBadge(role) {
    return `<span class="learning-growth-role-badge is-${escapeHtmlLocal(role)}">${escapeHtmlLocal(growthCardRoleLabel(role))}</span>`;
  }

  function renderLearningGrowthCardShareButton(cardId) {
    if (!cardId) return "";
    return `<button type="button" class="learning-growth-card-share-button" data-learning-growth-card-share="${escapeHtmlLocal(cardId)}" aria-label="${escapeHtmlLocal("\u5206\u4eab\u5b66\u4e60\u5361\u56fe\u7247")}" title="${escapeHtmlLocal("\u5206\u4eab\u5b66\u4e60\u5361\u56fe\u7247")}">${escapeHtmlLocal("\u5206\u4eab")}</button>`;
  }

  function renderTeachingStepper(cardId, currentStep) {
    const steps = [
      ["lesson", "讲解"],
      ["guided_practice", "跟做"],
      ["quick_check", "检查"],
    ];
    return `<div class="learning-growth-teaching-stepper" role="tablist">
      ${steps.map(([step, label]) => `<button type="button" class="${step === currentStep ? "active" : ""}" data-learning-growth-teaching-step="${escapeHtmlLocal(cardId)}" data-step="${escapeHtmlLocal(step)}" aria-selected="${step === currentStep ? "true" : "false"}">${escapeHtmlLocal(label)}</button>`).join("")}
    </div>`;
  }

  function renderTeachingLessonSection(flow) {
    return `<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="lesson">
      <h4>学习目标</h4>
      <p>${escapeHtmlLocal(flow.learningTarget || flow.lesson.title)}</p>
      ${flow.prerequisites.length ? `<div class="learning-growth-teaching-hints" data-learning-growth-prerequisites>${flow.prerequisites.map((item) => `<span>${escapeHtmlLocal(item)}</span>`).join("")}</div>` : ""}
      <h4>讲解</h4>
      ${flow.lesson.whyItMatters ? `<p class="learning-growth-teaching-why">${escapeHtmlLocal(flow.lesson.whyItMatters)}</p>` : ""}
      <p>${escapeHtmlLocal(flow.lesson.explanation)}</p>
      ${flow.lesson.keyPoints.length ? `<ul>${flow.lesson.keyPoints.map((item) => `<li>${escapeHtmlLocal(item)}</li>`).join("")}</ul>` : ""}
      ${flow.lesson.workedExample.steps.length ? `<div class="learning-growth-teaching-worked-example">
        ${flow.lesson.workedExample.instruction ? `<strong>${escapeHtmlLocal(flow.lesson.workedExample.instruction)}</strong>` : ""}
        ${flow.lesson.workedExample.steps.map((step) => `<article><b>${escapeHtmlLocal(step.label || "")}</b><p>${escapeHtmlLocal(step.text || "")}</p></article>`).join("")}
      </div>` : ""}
      ${flow.lesson.examples.length ? `<ul>${flow.lesson.examples.map((item) => `<li>${escapeHtmlLocal(item)}</li>`).join("")}</ul>` : ""}
    </section>`;
  }

  function renderTeachingGuidedPracticeSection(task, flow, draft = {}, options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const hasSubmission = Boolean(task.latestSubmission);
    const readonly = hasSubmission ? " readonly" : "";
    return `<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="guided_practice">
      <h4>跟着做一小步</h4>
      <p>${escapeHtmlLocal(flow.guidedPractice.instruction)}</p>
      ${flow.guidedPractice.hints.length ? `<div class="learning-growth-teaching-hints">${flow.guidedPractice.hints.map((item) => `<span>${escapeHtmlLocal(item)}</span>`).join("")}</div>` : ""}
      <textarea class="input learning-growth-teaching-input" rows="4" maxlength="3000" data-learning-growth-teaching-draft="${escapeHtmlLocal(cardId)}" data-field="guidedPracticeText" placeholder="写下跟做过程，简短也可以。"${readonly}>${escapeHtmlLocal(draft.guidedPracticeText || "")}</textarea>
      ${hasSubmission ? `<p class="learning-native-growth-submission-state">跟做记录已随作答保存，提交后本卡不再要求重做。</p>` : ""}
    </section>`;
  }

  function dailyRewardCap(task = {}) {
    return Number(task.rewardPolicy?.maxCoins || task.configuredRewardCoins || task.defaultRewardCoins || task.rewardCapCoins || 100) || 100;
  }

  function dailyRewardEarned(task = {}) {
    const settlement = task.latestRewardSettlement || task.rewardSettlement || null;
    const settled = Number(settlement?.coinAmount || settlement?.coins || task.learningGrowthRewardCoins || 0);
    return Number.isFinite(settled) && settled > 0 ? settled : 0;
  }

  function generatedCardStatusLabel(task = {}) {
    if (task.latestReflection) return "反思已记录";
    if (task.latestEvaluation) return "批改已完成";
    if (String(task.latestEvaluationJob?.status || "").toLowerCase() === "failed") return "批改未完成";
    if (task.latestSubmission) return "等待批改";
    return "待作答";
  }

  function renderDailyFlowRail(task = {}) {
    const hasSubmission = Boolean(task.latestSubmission);
    const hasEvaluation = Boolean(task.latestEvaluation);
    const evaluationFailed = String(task.latestEvaluationJob?.status || "").toLowerCase() === "failed";
    const hasReflection = Boolean(task.latestReflection);
    const steps = [
      {
        key: "learn",
        label: "学习",
        state: hasSubmission ? "done" : "current",
        status: hasSubmission ? "已完成" : "学习中",
      },
      {
        key: "submit",
        label: "作答",
        state: hasSubmission ? "done" : "current",
        status: hasSubmission ? "已提交" : "待提交",
      },
      {
        key: "evaluate",
        label: "批改",
        state: hasEvaluation ? "done" : evaluationFailed ? "current" : hasSubmission ? "current" : "pending",
        status: hasEvaluation ? "已完成" : evaluationFailed ? "需要处理" : hasSubmission ? "处理中" : "待提交后",
      },
      {
        key: "reflect",
        label: "反思（可选）",
        state: hasReflection ? "done" : hasEvaluation ? "current" : "pending",
        status: hasReflection ? "已记录" : hasEvaluation ? "可选" : "待批改后",
      },
    ];
    return `<div class="learning-growth-daily-flow" data-learning-growth-daily-flow>
      ${steps.map((step) => `<span class="is-${escapeHtmlLocal(step.state)}" data-learning-growth-flow-step="${escapeHtmlLocal(step.key)}"><b>${escapeHtmlLocal(step.label)}</b><small>${escapeHtmlLocal(step.status)}</small></span>`).join("")}
    </div>`;
  }

  function renderDailyScorePolicyPanel(task = {}, flow = {}) {
    const cap = dailyRewardCap(task);
    const earned = dailyRewardEarned(task);
    const score = task.latestEvaluation ? deterministicScoreText(task.latestEvaluation) : "";
    const support = [flow.supportLevel, flow.difficultyBasis].filter(Boolean).join(" · ");
    return `<section class="learning-growth-answer-reward learning-growth-daily-score-policy" data-learning-growth-daily-score-policy>
      <div class="learning-growth-answer-reward-head">
        <h4>学习流程</h4>
        <strong>${escapeHtmlLocal(generatedCardStatusLabel(task))}</strong>
      </div>
      <div class="learning-growth-answer-reward-grid">
        <span><b>1 次</b><small>提交作答</small></span>
        <span><b>1 次</b><small>系统批改</small></span>
        <span><b>${escapeHtmlLocal(score || "待评分")}</b><small>按实际成绩记录</small></span>
        <span><b>${escapeHtmlLocal(earned ? String(earned) : String(cap))}</b><small>${escapeHtmlLocal(earned ? "已结算金币" : "金币上限")}</small></span>
      </div>
      <p>这张日常卡提交一次、批改一次，并按一次批改结果打分；反思只保存学习证据，不触发第二次批改，也不要求达到固定通过线。</p>
      ${support ? `<p class="learning-growth-daily-support">${escapeHtmlLocal(support)}</p>` : ""}
    </section>`;
  }

  function interactionKey(cardId, kind) {
    return `${String(cardId || "")}:${String(kind || "")}`;
  }

  function asArray(value) {
    return Array.isArray(value) ? value.filter((item) => String(item || "").trim()).slice(0, 6) : [];
  }

  function resolveAudioUrl(audio = {}, options = {}) {
    const url = String(audio?.url || "").trim();
    if (!url) return "";
    if (typeof options.resolveGrowthAudioUrl === "function") return options.resolveGrowthAudioUrl(url, options.workspaceId);
    return url;
  }

  function renderAudioEvidence(audio = {}, label = "录音", options = {}) {
    const url = resolveAudioUrl(audio, options);
    if (!url) return "";
    const duration = Number(audio.durationMs || 0);
    const suffix = Number.isFinite(duration) && duration > 0 ? ` · ${Math.round(duration / 1000)} 秒` : "";
    return `<div class="learning-growth-submission-audio" data-learning-growth-audio-evidence>
      <strong>${escapeHtmlLocal(label + suffix)}</strong>
      <audio controls preload="metadata" src="${escapeHtmlLocal(url)}" data-learning-growth-saved-audio></audio>
      <small class="learning-growth-audio-error" data-learning-growth-audio-error hidden>录音暂时无法播放：当前浏览器不支持这个音频格式，或音频返回未通过校验。</small>
    </div>`;
  }

  function renderRecorderControls(task = {}, kind = "submission", options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const state = options.state || {};
    const recording = state.learningGrowthRecordings?.[interactionKey(cardId, kind)] || {};
    const status = String(recording.status || "").trim();
    const busy = status === "requesting" || status === "recording" || status === "stopping";
    const ready = status === "ready" && recording.url;
    const previewReady = ready && !recording.playbackError;
    const unsupported = status === "unsupported";
    const label = kind === "reflection" ? "反思录音" : "作答录音";
    const elapsed = Number(recording.elapsedMs || 0);
    const statusText = recording.message
      || (status === "recording" ? `录音中 ${Math.max(1, Math.round(elapsed / 1000))} 秒`
        : status === "requesting" ? "正在请求麦克风"
          : status === "stopping" ? "正在保存录音"
            : ready ? "录音已准备"
              : unsupported ? "当前浏览器不支持录音"
                : "可选：录一段音频作为证据");
    const buttonText = status === "recording" ? "停止录音" : ready ? "重新录音" : "开始录音";
    return `<div class="todo-reading-recorder learning-growth-card-recorder" data-learning-growth-recorder="${escapeHtmlLocal(cardId)}" data-record-kind="${escapeHtmlLocal(kind)}">
      <div class="todo-reading-recorder-actions">
        <button type="button" data-learning-growth-record-toggle="${escapeHtmlLocal(cardId)}" data-record-kind="${escapeHtmlLocal(kind)}" ${unsupported || busy && status !== "recording" ? "disabled" : ""}>${escapeHtmlLocal(buttonText)}</button>
        ${ready ? `<button type="button" data-learning-growth-record-clear="${escapeHtmlLocal(cardId)}" data-record-kind="${escapeHtmlLocal(kind)}">清除</button>` : ""}
      </div>
      <span class="learning-native-growth-submission-state" data-learning-growth-record-status>${escapeHtmlLocal(label)}：${escapeHtmlLocal(statusText)}</span>
      ${previewReady ? `<audio controls preload="metadata" src="${escapeHtmlLocal(recording.url)}" data-learning-growth-record-playback="${escapeHtmlLocal(cardId)}" data-record-kind="${escapeHtmlLocal(kind)}"></audio>` : ""}
    </div>`;
  }

  function renderSubmissionStatus(task = {}, options = {}) {
    const submission = task.latestSubmission || null;
    if (!submission) return "";
    const submittedAt = submission.submittedAt ? ` · ${escapeHtmlLocal(submission.submittedAt)}` : "";
    const counts = [];
    const chars = Number(submission.textCharCount || submission.charCount || 0);
    const words = Number(submission.wordCount || 0);
    if (Number.isFinite(words) && words > 0) counts.push(`${words} 词`);
    if (Number.isFinite(chars) && chars > 0) counts.push(`${chars} 字符`);
    const countText = counts.length ? ` · ${counts.join(" / ")}` : "";
    return `<div class="todo-learning-growth-status" data-learning-growth-submission-status>
      <strong>作答已提交${submittedAt}${escapeHtmlLocal(countText)}</strong>
      <p>这张日常卡只批改一次。批改完成后按实际分数记录学习证据，不要求反复改到某个分数。</p>
      ${renderAudioEvidence(submission.audio, "作答录音", options)}
    </div>`;
  }

  function renderFeedbackList(title, items) {
    const list = asArray(items);
    if (!list.length) return "";
    return `<div class="todo-learning-growth-feedback-list"><strong>${escapeHtmlLocal(title)}</strong><ul>${list.map((item) => `<li>${escapeHtmlLocal(item)}</li>`).join("")}</ul></div>`;
  }

  function renderEvaluationPanel(task = {}, options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const submission = task.latestSubmission || null;
    const evaluation = task.latestEvaluation || null;
    const evaluationJob = task.latestEvaluationJob || null;
    const evaluationJobFailed = String(evaluationJob?.status || "").toLowerCase() === "failed";
    const state = options.state || {};
    const busy = Boolean(state.learningGrowthEvaluationBusy?.[cardId]);
    const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "evaluation")] || "";
    if (!submission && !evaluation) return "";
    if (!evaluation) {
      if (evaluationJobFailed) {
        return `<div class="todo-learning-growth-evaluation is-failed" data-learning-growth-evaluation-panel="${escapeHtmlLocal(cardId)}">
          <div class="todo-learning-growth-evaluation-head"><strong>批改未完成</strong><span class="todo-learning-growth-score-pill">需要处理</span></div>
          <p>${escapeHtmlLocal(message || "作答已保存，但系统批改多次未完成。请稍后刷新状态，或让 Owner 检查后再处理。")}</p>
          <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${escapeHtmlLocal(cardId)}" ${busy ? "disabled" : ""}>${busy ? "刷新中" : "刷新状态"}</button></div>
        </div>`;
      }
      return `<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${escapeHtmlLocal(cardId)}">
        <div class="todo-learning-growth-evaluation-head"><strong>等待批改</strong><span class="todo-learning-growth-score-pill">一次批改</span></div>
        <p>${escapeHtmlLocal(message || "作答已保存，系统会处理一次批改。也可以手动刷新批改状态。")}</p>
        <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${escapeHtmlLocal(cardId)}" ${busy ? "disabled" : ""}>${busy ? "刷新中" : "刷新批改"}</button></div>
      </div>`;
    }
    const feedback = evaluation.feedbackSections && typeof evaluation.feedbackSections === "object" ? evaluation.feedbackSections : {};
    const weaknesses = asArray(evaluation.remainingWeaknesses).length ? evaluation.remainingWeaknesses : feedback.remainingWeaknesses;
    return `<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${escapeHtmlLocal(cardId)}">
      <div class="todo-learning-growth-evaluation-head"><strong>批改已完成</strong><span class="todo-learning-growth-score-pill">${escapeHtmlLocal(deterministicScoreText(evaluation))}</span></div>
      <p>${escapeHtmlLocal(evaluation.summary || "本次作答已经记录为学习证据。")}</p>
      ${renderFeedbackList("做得好的地方", feedback.strengths || evaluation.strengths)}
      ${renderFeedbackList("还可以练的点", weaknesses)}
      ${renderFeedbackList("下一次练习", feedback.nextPractice || evaluation.revisionRequirements)}
      ${message ? `<p class="learning-native-growth-submission-state">${escapeHtmlLocal(message)}</p>` : ""}
    </div>`;
  }

  function renderReflectionPanel(task = {}, options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const evaluation = task.latestEvaluation || null;
    if (!evaluation) return "";
    const reflection = task.latestReflection || null;
    if (reflection) {
      const submittedAt = reflection.submittedAt ? ` · ${escapeHtmlLocal(reflection.submittedAt)}` : "";
      return `<div class="todo-learning-growth-reflection-status" data-learning-growth-reflection-status>
        <strong>反思已提交${submittedAt}</strong>
        <p>${escapeHtmlLocal(reflection.summary || "反思已经作为学习证据保存，不会触发第二次批改。")}</p>
        ${renderAudioEvidence(reflection.audio, "反思录音", options)}
      </div>`;
    }
    const state = options.state || {};
    const draft = state.learningGrowthReflectionDrafts?.[cardId] || {};
    const busy = Boolean(state.learningGrowthReflectionBusy?.[cardId]);
    const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "reflection")] || "";
    return `<form class="todo-learning-growth-reflection learning-native-growth-submission-form" data-learning-growth-reflection-form="${escapeHtmlLocal(cardId)}" data-workspace-id="${escapeHtmlLocal(options.workspaceId || task.workspaceId || "")}">
      <strong>可选反思一次</strong>
      <p>可以用一句话或一段录音说清楚：哪里做得好、哪里下次继续练。反思不影响本卡分数。</p>
      <textarea class="input learning-native-growth-submission-input" rows="3" maxlength="2000" data-learning-growth-reflection-text="${escapeHtmlLocal(cardId)}" placeholder="写下反思，或者只提交录音。">${escapeHtmlLocal(draft.text || "")}</textarea>
      ${renderRecorderControls(task, "reflection", options)}
      ${message ? `<p class="learning-native-growth-submission-state">${escapeHtmlLocal(message)}</p>` : ""}
      <div class="learning-growth-teaching-actions"><button type="submit" ${busy ? "disabled" : ""}>${busy ? "提交中" : "提交反思"}</button></div>
    </form>`;
  }

  function renderTeachingQuickCheckSection(task, flow, draft = {}, options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const state = options.state || {};
    const busy = Boolean(options.busy || state.learningGrowthSubmissionBusy?.[cardId] || state.learningGrowthTeachingCheckBusy?.[cardId]);
    const completed = String(task.status || "").trim().toLowerCase() === "completed";
    const hasSubmission = Boolean(task.latestSubmission);
    const validation = draft.quickCheckText ? validateSubmissionText(draft.quickCheckText, { minWords: 1, minChars: 1 }) : null;
    const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "submission")] || "";
    return `<section class="learning-growth-teaching-section learning-growth-daily-submit-panel" data-learning-growth-teaching-section="quick_check">
      <form class="learning-growth-teaching-check-form learning-native-growth-submission-form" data-learning-growth-teaching-check-form="${escapeHtmlLocal(cardId)}" data-learning-growth-submission-form="${escapeHtmlLocal(cardId)}" data-workspace-id="${escapeHtmlLocal(options.workspaceId || task.workspaceId || "")}">
        <h4>提交作答</h4>
        <p>${escapeHtmlLocal(flow.quickCheck.instruction)}</p>
        ${flow.quickCheck.completionCriteria.length ? `<ul>${flow.quickCheck.completionCriteria.map((item) => `<li>${escapeHtmlLocal(item)}</li>`).join("")}</ul>` : ""}
        ${hasSubmission ? "" : `<textarea class="input learning-growth-teaching-input learning-native-growth-submission-input" rows="4" maxlength="3000" data-learning-growth-teaching-draft="${escapeHtmlLocal(cardId)}" data-field="quickCheckText" placeholder="写一句你确认掌握的内容，或者写下哪里还卡住。">${escapeHtmlLocal(draft.quickCheckText || "")}</textarea>`}
        ${hasSubmission ? "" : renderRecorderControls(task, "submission", options)}
        ${message ? `<p class="learning-native-growth-submission-state">${escapeHtmlLocal(message)}</p>` : ""}
        ${validation ? `<p class="todo-learning-growth-submit-requirement ${validation.ok ? "is-ready" : "is-short"}">${escapeHtmlLocal(submissionRequirementLabel(validation.guard, validation.stats))}</p>` : ""}
        ${hasSubmission || completed ? "" : `<div class="learning-growth-teaching-actions">
          <button type="submit" ${busy || completed || hasSubmission ? "disabled" : ""}>${hasSubmission || completed ? "已提交" : (busy ? "提交中" : "提交作答")}</button>
        </div>`}
      </form>
      ${renderSubmissionStatus(task, options)}
      ${renderEvaluationPanel(task, options)}
      ${renderReflectionPanel(task, options)}
    </section>`;
  }

  function renderTeachingFeedbackSection(task = {}, state = {}) {
    const summary = task.experienceSummary || {};
    const earned = dailyRewardEarned(task);
    const cap = dailyRewardCap(task);
    const completed = String(task.status || "").trim().toLowerCase() === "completed";
    if (!completed && !summary.latestAt && !summary.lastCompletionAt) return "";
    return `<section class="learning-growth-teaching-feedback" data-learning-growth-teaching-feedback>
      <strong>${escapeHtmlLocal(completed ? "本卡已完成" : "学习反馈已记录")}</strong>
      <p>${escapeHtmlLocal(earned ? `已按本次分数结算 ${earned} / ${cap} 金币；这张卡只作为低压力学习证据，不当作正式能力测验。` : `最高 ${cap} 金币，按本次分数比例结算；这张卡不当作正式能力测验。`)}</p>
      ${completed ? `<p class="learning-growth-experience-prompt">${escapeHtmlLocal("完成后可以记录难度感受，用来帮助下一张卡调节难度。")}</p>${renderExperienceSignalActions(task, state)}` : ""}
    </section>`;
  }

  function renderExperienceSignalActions(task = {}, state = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    if (String(task.status || "").trim().toLowerCase() !== "completed") return "";
    const summary = task.experienceSummary && typeof task.experienceSummary === "object" ? task.experienceSummary : {};
    const submitted = state.learningGrowthExperienceSignalSubmitted?.[cardId] || "";
    const busy = state.learningGrowthExperienceSignalBusy?.[cardId] || "";
    const selected = String(summary.latestSignalType || submitted || "").trim();
    const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "experience")] || "";
    const targetNodeIds = asArray(task.targetNodeIds || summary.targetNodeIds);
    const targetNodeText = targetNodeIds.join(" ");
    const disabled = !targetNodeIds.length;
    const actions = [
      ["too_easy", "太简单"],
      ["right_level", "正合适"],
      ["too_hard", "有点难"],
    ];
    const note = selected
      ? "难度感受已记录到成长画像输入。"
      : disabled
        ? "这张卡缺少图谱节点绑定，暂时不能写入难度感受。"
        : "选择一项，下一张卡会参考这个信号。";
    return `<div class="learning-growth-experience-actions" data-learning-growth-experience-actions="${escapeHtmlLocal(cardId)}" data-learning-growth-experience-mode="active">
      ${actions.map(([type, label]) => {
        const isPending = busy === type;
        const isSelected = selected === type || isPending;
        return `<button type="button" class="${isSelected ? "is-selected" : ""}${isPending ? " is-pending" : ""}" data-learning-growth-experience-signal="${escapeHtmlLocal(cardId)}" data-signal-type="${escapeHtmlLocal(type)}" data-workspace-id="${escapeHtmlLocal(task.workspaceId || "")}" data-target-node-ids="${escapeHtmlLocal(targetNodeText)}" aria-current="${isSelected ? "true" : "false"}" ${busy || disabled ? "disabled" : ""}>${escapeHtmlLocal(isPending ? "记录中" : label)}</button>`;
      }).join("")}
      <small data-learning-growth-experience-note>${escapeHtmlLocal(message || note)}</small>
    </div>`;
  }

  function renderTeachingCardDetail(task = {}, options = {}) {
    const cardId = String(task.taskCardId || task.id || "");
    const role = growthCardRole(task);
    const flow = teachingFlow(task);
    const state = options.state || {};
    const draft = Object.assign({}, state.learningGrowthTeachingDrafts?.[cardId] || {});
    const busy = Boolean(state.learningGrowthTeachingCheckBusy?.[cardId]);
    const duration = task.expectedDurationMinutes || {};
    const reward = dailyRewardCap(task);
    return `<section class="learning-growth-answer-card learning-growth-card-detail-shell learning-growth-teaching-card" data-learning-growth-answer-card data-learning-growth-teaching-card="${escapeHtmlLocal(cardId)}" data-learning-growth-card-role="${escapeHtmlLocal(role)}" data-learning-executable-task-id="${escapeHtmlLocal(cardId)}">
      <div class="learning-growth-card-detail-hero learning-growth-teaching-hero">
        <div class="learning-growth-teaching-head learning-growth-card-detail-head">
          <div>${renderGrowthCardRoleBadge(role)}<span>${escapeHtmlLocal(`约 ${duration.min || 10}-${duration.max || 15} 分钟`)}</span><span>${escapeHtmlLocal(`${reward} 金币`)}</span></div>
          <div class="learning-growth-card-detail-actions">${renderLearningGrowthCardShareButton(cardId)}</div>
        </div>
        <h3>${escapeHtmlLocal(task.title || "学习卡")}</h3>
      </div>
      ${renderDailyFlowRail(task)}
      ${renderDailyScorePolicyPanel(task, flow)}
      ${renderTeachingLessonSection(flow)}
      ${renderTeachingGuidedPracticeSection(task, flow, draft, options)}
      ${renderTeachingQuickCheckSection(task, flow, draft, { busy, state, workspaceId: options.workspaceId || task.workspaceId || "", resolveGrowthAudioUrl: options.resolveGrowthAudioUrl })}
      ${renderTeachingFeedbackSection(task, state)}
    </section>`;
  }

  return {
    activityLabel,
    canWithdrawSubmission,
    growthCardRole,
    isTeachingCardRole,
    renderFeedbackHistory,
    renderGrowthCardRoleBadge,
    renderLearningGrowthCardShareButton,
    renderTeachingCardDetail,
    reportHistory,
    nextActionLabel,
    submissionGuard,
    submissionPrompt,
    submissionRequirementLabel,
    submissionStage,
    submissionTextStats,
    taskModel,
    validateSubmissionText,
  };
}));
