import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function taskModel(task = {}) {
  const model = task.taskModel || task.learningTaskModel || {};
  return model && typeof model === "object" ? model : {};
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function latestRecordForTask(records = [], taskCardId = "", field = "updatedAt") {
  const id = clean(taskCardId);
  const matches = asArray(records).filter((record) => clean(record?.taskCardId) === id);
  if (!matches.length) return null;
  return matches.slice().sort((a, b) => String(b?.[field] || b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.[field] || a?.updatedAt || a?.createdAt || "")))[0];
}

export function nativeGrowthRequiresAudio(task = {}) {
  const model = taskModel(task);
  const activityType = clean(model.activityType).toLowerCase();
  const skillId = clean(model.skillId || task.skillId || asArray(task.skillIds)[0]).toLowerCase();
  return activityType === "speaking"
    || activityType === "pronunciation"
    || skillId === "english_speaking_retell"
    || skillId === "english_pronunciation_shadowing";
}

export function nativeGrowthSubmissionPrompt(task = {}, options = {}) {
  const helper = options.growthTaskUi || null;
  if (helper && typeof helper.submissionPrompt === "function") {
    return helper.submissionPrompt({}, Object.assign({ learningTaskModel: taskModel(task) }, task));
  }
  return "写下本次学习任务作答，提交后由 AI 批改并生成反馈。";
}

export function nativeGrowthSubmissionGuard(task = {}, options = {}) {
  const helper = options.growthTaskUi || null;
  if (helper && typeof helper.submissionGuard === "function") {
    return helper.submissionGuard(Object.assign({ learningTaskModel: taskModel(task) }, task), {});
  }
  const activity = clean(taskModel(task).activityType).toLowerCase();
  const base = {
    writing: { minWords: 80, minChars: 300 },
    reading: { minWords: 50, minChars: 250 },
    listening: { minWords: 35, minChars: 180 },
    speaking: { minWords: 45, minChars: 220 },
    pronunciation: { minWords: 20, minChars: 100 },
    vocabulary: { minWords: 40, minChars: 220 },
    grammar: { minWords: 35, minChars: 180 },
    rewriting: { minWords: 70, minChars: 380 },
    presentation: { minWords: 60, minChars: 320 },
    weekly_challenge: { minWords: 80, minChars: 450 }
  }[activity] || { minWords: 40, minChars: 200 };
  return Object.assign({ activityType: activity || "default", stage: "draft" }, base);
}

export function nativeGrowthRequirementLabel(guard = {}, options = {}) {
  const helper = options.growthTaskUi || null;
  if (helper && typeof helper.submissionRequirementLabel === "function") {
    return helper.submissionRequirementLabel(guard);
  }
  return `至少 ${positiveNumber(guard.minWords, 0)} 个英文词 / ${positiveNumber(guard.minChars, 0)} 个有效字符`;
}

export function structuredResponseMap(submission = {}) {
  const map = new Map();
  asArray(submission.structuredResponses).forEach((item, index) => {
    const key = clean(item?.questionId || item?.id || `q${index + 1}`);
    if (key) map.set(key, item);
  });
  return map;
}

export function structuredQuestionItems(task = {}) {
  const model = taskModel(task);
  const items = Array.isArray(task.questionItems)
    ? task.questionItems
    : Array.isArray(model.questionItems)
      ? model.questionItems
      : Array.isArray(model.questions) ? model.questions : [];
  return items.map((item, index) => {
    const id = clean(item?.id || `q${index + 1}`);
    const type = clean(item?.type || item?.questionType).toLowerCase();
    const choices = Array.isArray(item?.choices) ? item.choices : [];
    return Object.assign({}, item, {
      id,
      type: type === "single_choice" ? "multiple_choice" : type,
      choices
    });
  }).filter((item) => item.id && (item.stem || item.body || item.prompt || item.title || item.question || item.choices.length));
}

export function renderStructuredQuestionSubmission(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const questions = structuredQuestionItems(task);
  if (!questions.length) return "";
  const previousResponses = structuredResponseMap(task.latestSubmission || {});
  return `<div class="learning-native-growth-questions" data-learning-native-growth-questions>
      ${questions.map((item, index) => {
        const questionId = clean(item.id || `q${index + 1}`);
        const type = clean(item.type || "written");
        const title = clean(item.title || `第 ${index + 1} 题`);
        const prompt = clean(item.stem || item.body || item.prompt || item.question);
        const previous = previousResponses.get(questionId) || {};
        if (type === "multiple_choice") {
          const choices = asArray(item.choices).map((choice, choiceIndex) => {
            const value = clean(choice?.id || choice?.value || String.fromCharCode(65 + choiceIndex));
            const label = clean(choice?.label || value);
            const text = clean(choice?.text || choice?.content || choice?.label || value);
            const checked = clean(previous.choice) === value ? " checked" : "";
            return `<label class="learning-native-growth-choice">
              <input type="radio" name="learning-growth-${escapeHtml(questionId)}" value="${escapeHtml(value)}" data-learning-native-growth-question-choice="${escapeHtml(questionId)}"${checked}>
              <span><b>${escapeHtml(label)}</b>${escapeHtml(text === label ? "" : ` ${text}`)}</span>
            </label>`;
          }).join("");
          return `<fieldset class="learning-native-growth-question" data-learning-native-growth-question="${escapeHtml(questionId)}" data-question-type="multiple_choice" data-question-title="${escapeHtml(title)}">
            <legend>${escapeHtml(title)}</legend>
            ${prompt ? `<p>${escapeHtml(prompt)}</p>` : ""}
            <div class="learning-native-growth-choice-list">${choices}</div>
            <label class="learning-native-growth-reason-label">
              <span>${escapeHtml(item.reasonLabel || "简短理由")}</span>
              <textarea class="input learning-native-growth-question-reason" rows="2" maxlength="1200" data-learning-native-growth-question-reason="${escapeHtml(questionId)}" placeholder="${escapeHtml(item.reasonPlaceholder || "写 1-2 句理由")}">${escapeHtml(previous.reason || "")}</textarea>
            </label>
          </fieldset>`;
        }
        return `<fieldset class="learning-native-growth-question" data-learning-native-growth-question="${escapeHtml(questionId)}" data-question-type="written" data-question-title="${escapeHtml(title)}">
          <legend>${escapeHtml(title)}</legend>
          ${prompt ? `<p>${escapeHtml(prompt)}</p>` : ""}
          <textarea class="input learning-native-growth-question-response" rows="5" maxlength="5000" data-learning-native-growth-question-response="${escapeHtml(questionId)}" placeholder="${escapeHtml(item.responsePlaceholder || "写出关键推理过程")}">${escapeHtml(previous.response || "")}</textarea>
        </fieldset>`;
      }).join("")}
    </div>`;
}

export function nativeGrowthSubmissionRecordingStatus(taskCardId = "", options = {}) {
  const recorder = options.state?.learningNativeGrowthSubmissionRecorders?.[taskCardId] || {};
  if (recorder.status === "requesting") return "正在请求麦克风权限...";
  if (recorder.status === "recording") return "正在录音";
  if (recorder.status === "stopping") return "正在生成复述录音...";
  if (recorder.status === "ready") return "已录好复述";
  if (recorder.status === "unsupported") return "当前浏览器不支持直接录音。";
  if (recorder.status === "error") return recorder.error || "复述录音不可用，请重试。";
  return "阅读上方材料后，用英语录音复述。提交后会先转写，再进入 AI 批改。";
}

export function nativeGrowthReflectionRecordingStatus(taskCardId = "", options = {}) {
  const recorder = options.state?.learningNativeGrowthSubmissionRecorders?.[taskCardId] || {};
  if (recorder.status === "requesting") return "正在请求麦克风权限...";
  if (recorder.status === "recording") return "正在录音";
  if (recorder.status === "stopping") return "正在生成复盘录音...";
  if (recorder.status === "ready") return "已录好复盘";
  if (recorder.status === "unsupported") return "当前浏览器不支持直接录音。";
  if (recorder.status === "error") return recorder.error || "复盘录音不可用，请重试。";
  return "阅读 AI 反馈后，录一段复盘，说明错误、修改原因和下次练习方向。";
}

export function renderNativeGrowthAudioRecorder(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  const recorder = options.state?.learningNativeGrowthSubmissionRecorders?.[taskCardId] || {};
  const status = clean(recorder.status);
  const ready = status === "ready" && recorder.url;
  const recording = status === "recording";
  const waiting = status === "requesting" || status === "stopping";
  return `<div class="learning-native-growth-recorder" data-learning-native-growth-recorder="${escapeHtml(taskCardId)}">
      <div class="learning-native-growth-recorder-status" data-learning-native-growth-record-status="${escapeHtml(taskCardId)}">${escapeHtml(nativeGrowthSubmissionRecordingStatus(taskCardId, options))}</div>
      ${ready ? `<audio controls preload="metadata" src="${escapeHtml(recorder.url)}"></audio>` : ""}
      <div class="learning-program-task-actions learning-native-growth-recorder-actions">
        ${recording
          ? `<button type="button" data-learning-native-growth-record-stop="${escapeHtml(taskCardId)}">停止录音</button>`
          : `<button type="button" data-learning-native-growth-record-start="${escapeHtml(taskCardId)}" ${waiting ? "disabled" : ""}>${ready ? "重新录音" : "开始录音"}</button>`}
        ${ready || recording || status === "error" ? `<button type="button" data-learning-native-growth-record-cancel="${escapeHtml(taskCardId)}">清除</button>` : ""}
      </div>
    </div>`;
}

export function renderNativeGrowthReflectionRecorder(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  const recorder = options.state?.learningNativeGrowthSubmissionRecorders?.[taskCardId] || {};
  const status = clean(recorder.status);
  const ready = status === "ready" && recorder.url;
  const recording = status === "recording";
  const waiting = status === "requesting" || status === "stopping";
  return `<div class="learning-native-growth-recorder" data-learning-native-growth-reflection-recorder="${escapeHtml(taskCardId)}">
      <div class="learning-native-growth-recorder-status" data-learning-native-growth-reflection-record-status="${escapeHtml(taskCardId)}">${escapeHtml(nativeGrowthReflectionRecordingStatus(taskCardId, options))}</div>
      ${ready ? `<audio controls preload="metadata" src="${escapeHtml(recorder.url)}"></audio>` : ""}
      <div class="learning-program-task-actions learning-native-growth-recorder-actions">
        ${recording
          ? `<button type="button" data-learning-native-growth-reflection-record-stop="${escapeHtml(taskCardId)}">停止录音</button>`
          : `<button type="button" data-learning-native-growth-reflection-record-start="${escapeHtml(taskCardId)}" ${waiting ? "disabled" : ""}>${ready ? "重新录复盘" : "开始录复盘"}</button>`}
        ${ready || recording || status === "error" ? `<button type="button" data-learning-native-growth-reflection-record-cancel="${escapeHtml(taskCardId)}">清除</button>` : ""}
      </div>
    </div>`;
}

export function nativeGrowthEvaluationNeedsReflection(evaluation = {}) {
  const status = clean(evaluation?.status).toLowerCase();
  const nextStep = clean(evaluation?.nextStep || evaluation?.reflectionGate?.nextStep).toLowerCase();
  if (status === "reflection_required" || nextStep === "spoken_reflection_required" || evaluation?.reflectionRequired === true) return true;
  if (status !== "draft_feedback" && nextStep !== "rewrite_and_reflect") return false;
  const score = Number(evaluation?.score);
  const passLine = Number(evaluation?.finalPassingScore || evaluation?.passingScore || 80) || 80;
  return Number.isFinite(score) && score >= passLine;
}

export function taskActionFromRecords(task = {}, data = {}) {
  const taskCardId = clean(task.taskCardId);
  const reflection = task.latestReflection || latestRecordForTask(data.taskReflections || [], taskCardId, "submittedAt");
  const evaluation = task.latestEvaluation || latestRecordForTask(data.evaluations || [], taskCardId, "createdAt");
  const submission = task.latestSubmission || latestRecordForTask(data.taskSubmissions || [], taskCardId, "submittedAt");
  if (clean(task.status).toLowerCase() === "completed" || clean(reflection?.status).toLowerCase() === "accepted") return "complete";
  if (nativeGrowthEvaluationNeedsReflection(evaluation)) return "spoken_reflection";
  if (["needs_repair", "needs_revision"].includes(clean(evaluation?.status))) return "revise";
  if (evaluation?.passed || ["passed", "completed", "complete"].includes(clean(evaluation?.status))) return "complete";
  const nativeAction = clean(task.nativeState?.nextAction);
  if (nativeAction && nativeAction !== "submit") return nativeAction;
  if (clean(submission?.status)) return "waiting_feedback";
  return nativeAction || "submit";
}

export function renderNativeGrowthReflectionResult(reflection = null, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!reflection) return "";
  const status = clean(reflection.status);
  return `<div class="learning-native-growth-submission-state${status === "accepted" ? " is-ready" : ""}" data-learning-native-growth-reflection-result>
      ${escapeHtml(reflection.summary || (status === "rejected" ? "上次复盘未通过，请重新录音复盘。" : "复盘已提交。"))}
    </div>`;
}

export function renderNativeGrowthSubmission(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  if (!taskCardId) return "";
  const guard = nativeGrowthSubmissionGuard(task, options);
  const requiresAudio = nativeGrowthRequiresAudio(task);
  const structuredQuestions = !requiresAudio ? renderStructuredQuestionSubmission(task, options) : "";
  const workspaceId = clean(task.workspaceId);
  const nextAction = clean(task.nativeState?.nextAction || taskActionFromRecords(task, options.programsData || {}));
  const previousText = clean(task.latestSubmission?.displayText || task.latestSubmission?.text);
  const submittingRecord = options.state?.learningNativeGrowthSubmissionSubmitting?.[taskCardId];
  const submitting = Boolean(submittingRecord);
  const editing = Boolean(options.state?.learningGrowthAnswerEditing?.[taskCardId] || options.state?.learningNativeGrowthAnswerEditing?.[taskCardId]);
  const latestEvaluationStatus = clean(task.latestEvaluation?.status);
  const hasGradedResult = Boolean(task.latestEvaluation && latestEvaluationStatus && latestEvaluationStatus !== "pending");
  const latestReflection = task.latestReflection || task.nativeState?.latestReflection || null;
  const latestReflectionRejected = clean(latestReflection?.status).toLowerCase() === "rejected";
  const detailButton = options.hideNativeGrowthDetailButton ? "" : `<button type="button" data-learning-open-growth-task="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(workspaceId)}">查看任务详情</button>`;
  const stateLabel = submitting
    ? (requiresAudio ? "正在发送录音，服务端确认前尚未保存；请保持本页面打开。" : "正在发送作答，服务端确认前尚未保存；请保持本页面打开。")
    : (nextAction === "spoken_reflection" && latestReflectionRejected ? "上次复盘未通过，需要重新录音复盘" : ({
      submit: "待作答",
      waiting_feedback: "已提交，等待 AI 批改",
      revise: "需要修改后再提交",
      spoken_reflection: "需要录音或文字复盘",
      complete: "已完成"
    }[nextAction] || ""));

  if (nextAction === "complete") {
    return `<div class="learning-native-growth-submission-state is-ready">${escapeHtml(stateLabel || "已完成")}</div>`;
  }
  if (nextAction === "revise" && hasGradedResult && !editing && !submitting) {
    return `<div class="learning-native-growth-revision-collapsed" data-learning-native-growth-revision-collapsed="${escapeHtml(taskCardId)}">
        <p>${escapeHtml(stateLabel || "需要修改后再提交")}</p>
        <button type="button" data-learning-native-growth-edit-answer="${escapeHtml(taskCardId)}">修改答案</button>
        ${detailButton}
      </div>`;
  }
  if (nextAction === "spoken_reflection") {
    return `<form class="learning-native-growth-submission-form" data-learning-native-growth-reflection-form="${escapeHtml(taskCardId)}" data-task-card-id="${escapeHtml(taskCardId)}">
        ${renderNativeGrowthReflectionResult(latestReflection, options)}
        <p class="learning-native-growth-prompt">阅读 AI 反馈后，用自己的话说明本次主要错误、修改原因和下次练习方向。</p>
        ${renderNativeGrowthReflectionRecorder(task, options)}
        <div class="learning-native-growth-submission-state" data-learning-native-growth-reflection-state="${escapeHtml(taskCardId)}">${escapeHtml(stateLabel)}</div>
        <div class="learning-program-task-actions">
          <button type="submit" data-learning-submit-native-growth-reflection="${escapeHtml(taskCardId)}">提交录音复盘</button>
          ${detailButton}
        </div>
      </form>`;
  }
  return `<form class="learning-native-growth-submission-form" data-learning-native-growth-submission-form="${escapeHtml(taskCardId)}" data-task-card-id="${escapeHtml(taskCardId)}" data-workspace-id="${escapeHtml(workspaceId)}" data-min-words="${escapeHtml(String(guard.minWords || 0))}" data-min-chars="${escapeHtml(String(guard.minChars || 0))}" data-requires-audio="${requiresAudio ? "1" : "0"}">
      <p class="learning-native-growth-prompt">${escapeHtml(nativeGrowthSubmissionPrompt(task, options))}</p>
      ${stateLabel ? `<div class="learning-native-growth-submission-state">${escapeHtml(stateLabel)}</div>` : ""}
      ${requiresAudio ? renderNativeGrowthAudioRecorder(task, options) : structuredQuestions || `<textarea class="input learning-native-growth-submission-input" name="text" rows="4" maxlength="12000" data-learning-native-growth-submission-input="${escapeHtml(taskCardId)}" placeholder="在这里直接写作答，提交后等待 AI 批改">${escapeHtml(previousText)}</textarea>
      <div class="todo-learning-growth-submit-requirement" data-learning-native-growth-submission-count="${escapeHtml(taskCardId)}">${escapeHtml(nativeGrowthRequirementLabel(guard, options))}</div>`}
      <div class="learning-program-task-actions">
        <button type="submit" data-learning-submit-native-growth="${escapeHtml(taskCardId)}" ${submitting ? "disabled" : ""}>${requiresAudio ? "提交录音给 AI 批改" : "提交给 AI 批改"}</button>
        ${detailButton}
      </div>
      <div class="learning-native-growth-submission-state" data-learning-native-growth-submission-state="${escapeHtml(taskCardId)}" aria-live="polite"></div>
    </form>`;
}
