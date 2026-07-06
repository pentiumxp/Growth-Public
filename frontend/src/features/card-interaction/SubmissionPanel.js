import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

export function interactionKey(cardId, kind) {
  return `${clean(cardId)}:${clean(kind)}`;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => clean(item)).slice(0, 6) : [];
}

function cardIdForTask(task = {}) {
  return clean(task.taskCardId || task.id);
}

function resolveAudioUrl(audio = {}, options = {}) {
  const url = clean(audio?.url);
  if (!url) return "";
  if (typeof options.resolveGrowthAudioUrl === "function") return options.resolveGrowthAudioUrl(url, options.workspaceId);
  return url;
}

export function deterministicScoreText(evaluation = {}) {
  const score = Number(evaluation.score);
  if (!Number.isFinite(score)) return "未返回确定分数";
  const maxScore = Number(evaluation.maxScore || evaluation.totalScore || 100);
  const boundedMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
  const cleanScore = Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/, "");
  const cleanMax = Number.isInteger(boundedMax) ? String(boundedMax) : boundedMax.toFixed(1).replace(/\.0$/, "");
  return `确定分数 ${cleanScore}/${cleanMax}`;
}

export function renderAudioEvidence(audio = {}, label = "录音", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const url = resolveAudioUrl(audio, options);
  if (!url) return "";
  const duration = Number(audio.durationMs || 0);
  const suffix = Number.isFinite(duration) && duration > 0 ? ` · ${Math.round(duration / 1000)} 秒` : "";
  return `<div class="learning-growth-submission-audio" data-learning-growth-audio-evidence>
      <strong>${escapeHtml(label + suffix)}</strong>
      <audio controls preload="metadata" src="${escapeHtml(url)}" data-learning-growth-saved-audio></audio>
      <small class="learning-growth-audio-error" data-learning-growth-audio-error hidden>录音暂时无法播放：当前浏览器不支持这个音频格式，或音频返回未通过校验。</small>
    </div>`;
}

export function recorderStatusText(recording = {}, kind = "submission") {
  const status = clean(recording.status);
  const ready = status === "ready" && recording.url;
  const unsupported = status === "unsupported";
  const elapsed = Number(recording.elapsedMs || 0);
  return recording.message
    || (status === "recording" ? `录音中 ${Math.max(1, Math.round(elapsed / 1000))} 秒`
      : status === "requesting" ? "正在请求麦克风"
        : status === "stopping" ? "正在保存录音"
          : ready ? "录音已准备"
            : unsupported ? "当前浏览器不支持录音"
              : "可选：录一段音频作为证据");
}

export function renderRecorderControls(task = {}, kind = "submission", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = cardIdForTask(task);
  const state = options.state || {};
  const recording = state.learningGrowthRecordings?.[interactionKey(cardId, kind)] || {};
  const status = clean(recording.status);
  const busy = status === "requesting" || status === "recording" || status === "stopping";
  const ready = status === "ready" && recording.url;
  const previewReady = ready && !recording.playbackError;
  const unsupported = status === "unsupported";
  const label = kind === "reflection" ? "反思录音" : "作答录音";
  const buttonText = status === "recording" ? "停止录音" : ready ? "重新录音" : "开始录音";
  return `<div class="todo-reading-recorder learning-growth-card-recorder" data-learning-growth-recorder="${escapeHtml(cardId)}" data-record-kind="${escapeHtml(kind)}">
      <div class="todo-reading-recorder-actions">
        <button type="button" data-learning-growth-record-toggle="${escapeHtml(cardId)}" data-record-kind="${escapeHtml(kind)}" ${unsupported || busy && status !== "recording" ? "disabled" : ""}>${escapeHtml(buttonText)}</button>
        ${ready ? `<button type="button" data-learning-growth-record-clear="${escapeHtml(cardId)}" data-record-kind="${escapeHtml(kind)}">清除</button>` : ""}
      </div>
      <span class="learning-native-growth-submission-state" data-learning-growth-record-status>${escapeHtml(label)}：${escapeHtml(recorderStatusText(recording, kind))}</span>
      ${previewReady ? `<audio controls preload="metadata" src="${escapeHtml(recording.url)}" data-learning-growth-record-playback="${escapeHtml(cardId)}" data-record-kind="${escapeHtml(kind)}"></audio>` : ""}
    </div>`;
}

export function renderSubmissionStatus(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const submission = task.latestSubmission || null;
  if (!submission) return "";
  const submittedAt = submission.submittedAt ? ` · ${escapeHtml(submission.submittedAt)}` : "";
  const counts = [];
  const chars = Number(submission.textCharCount || submission.charCount || 0);
  const words = Number(submission.wordCount || 0);
  if (Number.isFinite(words) && words > 0) counts.push(`${words} 词`);
  if (Number.isFinite(chars) && chars > 0) counts.push(`${chars} 字符`);
  const countText = counts.length ? ` · ${counts.join(" / ")}` : "";
  return `<div class="todo-learning-growth-status" data-learning-growth-submission-status>
      <strong>作答已提交${submittedAt}${escapeHtml(countText)}</strong>
      <p>这张日常卡只批改一次。批改完成后按实际分数记录学习证据，不要求反复改到某个分数。</p>
      ${renderAudioEvidence(submission.audio, "作答录音", options)}
    </div>`;
}

export function renderFeedbackList(title, items, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const list = asArray(items);
  if (!list.length) return "";
  return `<div class="todo-learning-growth-feedback-list"><strong>${escapeHtml(title)}</strong><ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

export function renderEvaluationJobStatus(evaluationJob = {}, owner = false, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const status = clean(evaluationJob.status).toLowerCase();
  const parts = [];
  const attemptCount = Number(evaluationJob.attemptCount || 0);
  if (attemptCount > 0) parts.push(`已尝试 ${attemptCount} 次`);
  if (status === "retry" && evaluationJob.availableAt) parts.push(`下次处理 ${evaluationJob.availableAt}`);
  if (status === "processing" && evaluationJob.leaseUntil) parts.push(`处理中，租约到 ${evaluationJob.leaseUntil}`);
  const review = evaluationJob.lastOwnerReview || null;
  if (owner && review?.reviewedAt) parts.push(`Owner 已在 ${review.reviewedAt} 重新加入队列`);
  if (owner && evaluationJob.lastError) parts.push(`错误摘要：${clean(evaluationJob.lastError).slice(0, 120)}`);
  if (!parts.length) return "";
  return `<p class="learning-native-growth-submission-state">${escapeHtml(parts.join(" · "))}</p>`;
}

export function renderEvaluationPanel(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const cardId = cardIdForTask(task);
  const submission = task.latestSubmission || null;
  const evaluation = task.latestEvaluation || null;
  const evaluationJob = task.latestEvaluationJob || null;
  const evaluationJobFailed = clean(evaluationJob?.status).toLowerCase() === "failed";
  const state = options.state || {};
  const owner = Boolean(state.auth?.isOwner || options.isOwner);
  const busy = Boolean(state.learningGrowthEvaluationBusy?.[cardId]);
  const message = state.learningGrowthInteractionMessages?.[interactionKey(cardId, "evaluation")] || "";
  const workspaceId = clean(task.workspaceId || options.workspaceId);
  if (!submission && !evaluation) return "";
  if (!evaluation) {
    if (evaluationJobFailed) {
      const ownerRetryButton = owner
        ? `<button type="button" class="learning-growth-secondary-action" data-learning-growth-evaluation-retry="${escapeHtml(cardId)}" data-workspace-id="${escapeHtml(workspaceId)}" ${busy ? "disabled" : ""}>${busy ? "处理中" : "重新批改"}</button>`
        : "";
      return `<div class="todo-learning-growth-evaluation is-failed" data-learning-growth-evaluation-panel="${escapeHtml(cardId)}">
          <div class="todo-learning-growth-evaluation-head"><strong>批改未完成</strong><span class="todo-learning-growth-score-pill">需要处理</span></div>
          <p>${escapeHtml(message || "作答已保存，但系统批改多次未完成。请稍后刷新状态，或让 Owner 检查后再处理。")}</p>
          ${renderEvaluationJobStatus(evaluationJob, owner, options)}
          <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${escapeHtml(cardId)}" ${busy ? "disabled" : ""}>${busy ? "刷新中" : "刷新状态"}</button>${ownerRetryButton}</div>
        </div>`;
    }
    return `<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${escapeHtml(cardId)}">
        <div class="todo-learning-growth-evaluation-head"><strong>等待批改</strong><span class="todo-learning-growth-score-pill">一次批改</span></div>
        <p>${escapeHtml(message || "作答已保存，系统会处理一次批改。也可以手动刷新批改状态。")}</p>
        ${renderEvaluationJobStatus(evaluationJob, owner, options)}
        <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${escapeHtml(cardId)}" ${busy ? "disabled" : ""}>${busy ? "刷新中" : "刷新批改"}</button></div>
      </div>`;
  }
  const feedback = evaluation.feedbackSections && typeof evaluation.feedbackSections === "object" ? evaluation.feedbackSections : {};
  const weaknesses = asArray(evaluation.remainingWeaknesses).length ? evaluation.remainingWeaknesses : feedback.remainingWeaknesses;
  return `<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${escapeHtml(cardId)}">
      <div class="todo-learning-growth-evaluation-head"><strong>批改已完成</strong><span class="todo-learning-growth-score-pill">${escapeHtml(deterministicScoreText(evaluation))}</span></div>
      <p>${escapeHtml(evaluation.summary || "本次作答已经记录为学习证据。")}</p>
      ${renderFeedbackList("做得好的地方", feedback.strengths || evaluation.strengths, options)}
      ${renderFeedbackList("还可以练的点", weaknesses, options)}
      ${renderFeedbackList("下一次练习", feedback.nextPractice || evaluation.revisionRequirements, options)}
      ${message ? `<p class="learning-native-growth-submission-state">${escapeHtml(message)}</p>` : ""}
    </div>`;
}
