import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";
import { clean } from "../utils/string.js";
import {
  nativeGrowthEvaluationNeedsReflection,
  nativeGrowthRequiresAudio,
  renderNativeGrowthSubmission,
  taskActionFromRecords
} from "./ProgramNativeGrowthSubmissionView.js";

export {
  nativeGrowthEvaluationNeedsReflection,
  nativeGrowthReflectionRecordingStatus,
  nativeGrowthRequiresAudio,
  nativeGrowthRequirementLabel,
  nativeGrowthSubmissionGuard,
  nativeGrowthSubmissionPrompt,
  nativeGrowthSubmissionRecordingStatus,
  renderNativeGrowthAudioRecorder,
  renderNativeGrowthReflectionRecorder,
  renderNativeGrowthReflectionResult,
  renderNativeGrowthSubmission,
  renderStructuredQuestionSubmission,
  structuredQuestionItems,
  structuredResponseMap,
  taskActionFromRecords
} from "./ProgramNativeGrowthSubmissionView.js";



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

function compactFocus(focusAreas = []) {
  return asArray(focusAreas).map((id) => focusLabel(id)).join(" / ");
}

function taskStatusText(status = "", options = {}) {
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

function latestRecordForTask(records = [], taskCardId = "", field = "updatedAt") {
  const id = clean(taskCardId);
  const matches = asArray(records).filter((record) => clean(record?.taskCardId) === id);
  if (!matches.length) return null;
  return matches.slice().sort((a, b) => String(b?.[field] || b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.[field] || a?.updatedAt || a?.createdAt || "")))[0];
}

export function taskRewardPolicy(task = {}) {
  const policy = task.rewardPolicy || {};
  return {
    maxCoins: positiveNumber(task.rewardCapCoins || policy.maxCoins || policy.rewardCapCoins, 100),
    minCoins: positiveNumber(policy.minCoins, 40),
    accuracyBonusMax: positiveNumber(policy.accuracyBonusMax, 30),
    timelinessBonusMax: positiveNumber(policy.timelinessBonusMax, 15),
    interactionBonusMax: positiveNumber(policy.interactionBonusMax, 15)
  };
}

export function rewardSettlementTime(settlement = {}) {
  return clean(settlement.settledAt || settlement.updatedAt || settlement.createdAt);
}

export function latestRewardSettlementForTask(rewardSettlements = [], task = {}) {
  const taskCardId = clean(task.taskCardId);
  const evaluationId = clean(task.latestEvaluation?.evaluationId);
  let latest = null;
  asArray(rewardSettlements).forEach((item) => {
    const matchesTask = taskCardId && clean(item?.taskCardId) === taskCardId;
    const matchesEvaluation = evaluationId && clean(item?.evaluationId) === evaluationId;
    if (!matchesTask && !matchesEvaluation) return;
    if (!latest || rewardSettlementTime(item) > rewardSettlementTime(latest)) latest = item;
  });
  return latest;
}

export function rewardSettlementDisplayText(settlement = null) {
  const coinAmount = Number(settlement?.coinAmount || 0);
  const amount = Number.isFinite(coinAmount) && coinAmount > 0 ? Math.round(coinAmount) : 0;
  const status = clean(settlement?.status);
  if (amount && status === "settled") return `已得 ${amount} 金币`;
  if (amount && (status === "ready" || status === "pending_review")) return `待结算 ${amount} 金币`;
  return "";
}

export function nativeGrowthDeterministicScoreText(evaluation = {}) {
  const score = Number(evaluation.score);
  if (!Number.isFinite(score)) return "";
  const maxScore = Number(evaluation.maxScore || evaluation.totalScore || 100);
  const boundedMax = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
  const cleanScore = Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/, "");
  const cleanMax = Number.isInteger(boundedMax) ? String(boundedMax) : boundedMax.toFixed(1).replace(/\.0$/, "");
  return `确定分数 ${cleanScore}/${cleanMax}`;
}

export function nativeGrowthTimeLabel(value = "", options = {}) {
  const raw = clean(value);
  if (!raw) return "";
  if (typeof options.formatTime === "function") {
    const formatted = clean(options.formatTime(raw));
    if (formatted) return formatted;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function renderLearningGrowthSectionHead(title = "", rightHtml = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  return `<div class="learning-growth-section-head">
      <h4>${escapeHtml(title)}</h4>
      ${rightHtml ? `<div class="learning-growth-section-head-actions">${rightHtml}</div>` : ""}
    </div>`;
}

export function nativeGrowthEvaluationCount(task = {}, evaluation = {}) {
  const candidates = [
    task.totalEvaluationCount,
    task.evaluationCount,
    evaluation.totalEvaluationCount,
    evaluation.evaluationCount,
    Array.isArray(evaluation.reportHistory) ? evaluation.reportHistory.length : 0,
    Array.isArray(task.learningGrowthReportHistory) ? task.learningGrowthReportHistory.length : 0
  ];
  const count = candidates.map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0);
  return Math.max(1, Math.round(count || 1));
}

export function nativeGrowthArtifactDirectoryPath(task = {}, evaluation = {}) {
  return clean(
    task.artifactDirectoryPath
    || task.reportDirectoryPath
    || task.deliverableDirectoryPath
    || evaluation.artifactDirectoryPath
    || evaluation.reportDirectoryPath
  );
}

export function learningGrowthPlayableAudioUrl(url = "") {
  const raw = clean(url);
  if (!raw) return "";
  if (/([?&])format=mp3(?:&|$)/i.test(raw)) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}format=mp3`;
}

export function nativeGrowthSubmissionAudio(submission = {}) {
  const audio = submission.audio || submission.raw?.audio || null;
  if (!audio || typeof audio !== "object") return null;
  const url = learningGrowthPlayableAudioUrl(audio.url || audio.href);
  if (!url) return null;
  return {
    url,
    name: clean(audio.name || "原始录音"),
    mime: clean(audio.mime || "audio/webm"),
    size: Number(audio.size || 0) || 0
  };
}

export function nativeGrowthReflectionAudio(reflection = {}) {
  const audio = reflection.audio || reflection.raw?.audio || null;
  if (!audio || typeof audio !== "object") return null;
  const url = learningGrowthPlayableAudioUrl(audio.url || audio.href);
  if (!url) return null;
  return {
    url,
    name: clean(audio.name || "复盘录音"),
    mime: clean(audio.mime || "audio/webm"),
    size: Number(audio.size || 0) || 0
  };
}

export function nativeGrowthSubmissionEvidence(task = {}, data = {}) {
  const taskCardId = clean(task.taskCardId);
  const latest = task.latestSubmission || latestRecordForTask(data.taskSubmissions || [], taskCardId, "submittedAt");
  if (!latest) return null;
  const structuredResponses = asArray(latest.structuredResponses);
  const displayText = clean(latest.displayText || latest.text);
  return Object.assign({}, latest, {
    audio: nativeGrowthSubmissionAudio(latest),
    displayText,
    structuredResponses
  });
}

export function recordsForTask(records = [], taskCardId = "", field = "submittedAt") {
  const id = clean(taskCardId);
  return asArray(records)
    .filter((record) => clean(record?.taskCardId) === id)
    .slice()
    .sort((a, b) => String(b?.[field] || b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.[field] || a?.updatedAt || a?.createdAt || "")));
}

export function renderNativeGrowthPreviousSubmission(submission = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const responses = asArray(submission.structuredResponses);
  const displayText = clean(submission.displayText);
  const audio = nativeGrowthSubmissionAudio(submission);
  const submittedAt = nativeGrowthTimeLabel(submission.submittedAt || submission.createdAt || submission.updatedAt, options);
  const head = renderLearningGrowthSectionHead("上次提交", submittedAt ? `<span class="learning-growth-submission-time" data-learning-growth-submission-time>${escapeHtml(`提交 ${submittedAt}`)}</span>` : "", options);
  if (!responses.length && !displayText && !audio) {
    return `<section class="learning-growth-answer-submission" data-learning-growth-previous-submission>
        ${head}
        <p>已有提交记录，但此次早期记录未保留可回显的结构化作答。</p>
      </section>`;
  }
  return `<section class="learning-growth-answer-submission" data-learning-growth-previous-submission>
      ${head}
      ${audio ? `<div class="learning-growth-submission-audio" data-learning-growth-submission-audio>
        <strong>${escapeHtml(audio.name)}</strong>
        <audio controls preload="metadata" src="${escapeHtml(audio.url)}"></audio>
      </div>` : ""}
      ${responses.length ? `<div class="learning-growth-previous-responses">
        ${responses.map((item, index) => {
          const title = item.title || item.questionId || `Q${index + 1}`;
          const choice = item.choice ? `<b>${escapeHtml(item.choice)}</b>` : "";
          const body = item.response || item.reason || "";
          return `<article class="learning-growth-previous-response">
            <strong>${escapeHtml(title)}</strong>
            ${choice ? `<p>${choice}</p>` : ""}
            ${body ? `<p>${escapeHtml(body)}</p>` : ""}
          </article>`;
        }).join("")}
      </div>` : ""}
      ${displayText && !responses.length ? `<details class="learning-growth-submission-transcript" ${audio ? "" : "open"}><summary>查看转写内容</summary><p>${escapeHtml(displayText)}</p></details>` : ""}
    </section>`;
}

export function renderNativeGrowthAudioEvidence(task = {}, data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  if (!taskCardId) return "";
  const submissionItems = recordsForTask(data.taskSubmissions || [], taskCardId, "submittedAt")
    .map((submission) => Object.assign({}, submission, { audio: nativeGrowthSubmissionAudio(submission), evidenceType: "submission" }))
    .filter((item) => item.audio);
  const reflectionItems = recordsForTask(data.taskReflections || [], taskCardId, "submittedAt")
    .map((reflection) => Object.assign({}, reflection, { audio: nativeGrowthReflectionAudio(reflection), evidenceType: "reflection" }))
    .filter((item) => item.audio);
  const items = submissionItems.concat(reflectionItems)
    .sort((a, b) => String(b.submittedAt || b.updatedAt || b.createdAt || "").localeCompare(String(a.submittedAt || a.updatedAt || a.createdAt || "")));
  if (!items.length) return "";
  const label = (item, index) => {
    if (item.evidenceType === "reflection") return `复盘录音 ${reflectionItems.length - reflectionItems.indexOf(item)}`;
    const attempt = Number(item.attemptNo || 0);
    return attempt ? `第 ${attempt} 次提交录音` : `提交录音 ${index + 1}`;
  };
  return `<section class="learning-growth-audio-evidence" data-learning-growth-audio-evidence>
      ${renderLearningGrowthSectionHead("录音证据", `<span>${escapeHtml(String(items.length))}</span>`, options)}
      <div class="learning-growth-audio-evidence-list">
        ${items.map((item, index) => {
          const submittedAt = nativeGrowthTimeLabel(item.submittedAt || item.createdAt || item.updatedAt, options);
          return `<article class="learning-growth-audio-evidence-item" data-learning-growth-audio-evidence-item="${escapeHtml(item.submissionId || item.reflectionId || String(index + 1))}">
            <div>
              <strong>${escapeHtml(label(item, index))}</strong>
              <small>${escapeHtml([submittedAt, item.status || ""].filter(Boolean).join(" / "))}</small>
            </div>
            <audio controls preload="metadata" src="${escapeHtml(item.audio.url)}"></audio>
          </article>`;
        }).join("")}
      </div>
    </section>`;
}

export function nativeGrowthFeedbackHistory(task = {}, evaluation = {}, options = {}) {
  const helper = options.growthTaskUi || null;
  if (helper && typeof helper.renderFeedbackHistory === "function") {
    return helper.renderFeedbackHistory(task, evaluation);
  }
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const status = clean(evaluation.status || (evaluation.passed ? "passed" : "needs_revision"));
  const scoreText = nativeGrowthDeterministicScoreText(evaluation);
  const summary = clean(evaluation.summary || evaluation.feedbackSummary || evaluation.resultSummary);
  return `<div class="todo-learning-growth-outcome is-${escapeHtml(status)}">
      <strong>${escapeHtml(scoreText || status || "待修订")}</strong>
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
    </div>`;
}

export function renderNativeGrowthFeedbackHead(task = {}, evaluation = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const evaluationCount = nativeGrowthEvaluationCount(task, evaluation);
  const directoryPath = nativeGrowthArtifactDirectoryPath(task, evaluation);
  const label = `批改：${evaluationCount}次`;
  const evaluatedAt = nativeGrowthTimeLabel(evaluation.createdAt || evaluation.completedAt || evaluation.updatedAt, options);
  const directoryHtml = directoryPath
    ? `<button type="button" class="learning-growth-board-artifact-link learning-growth-feedback-directory-link" data-learning-growth-feedback-directory-link data-directory-path-open data-directory-path="${escapeHtml(directoryPath)}" data-directory-label="${escapeHtml(task.title || "批改目录")}" aria-label="打开批改目录" title="打开批改目录"><span class="learning-growth-board-artifact-icon" aria-hidden="true"></span></button>`
    : "";
  const countHtml = `<span class="learning-growth-feedback-meta"><span class="learning-growth-feedback-count" data-learning-growth-feedback-count>${escapeHtml(label)}</span>${directoryHtml}</span>`;
  const right = `${evaluatedAt ? `<span class="learning-growth-feedback-time" data-learning-growth-feedback-time>${escapeHtml(evaluatedAt)}</span>` : ""}${countHtml}`;
  return renderLearningGrowthSectionHead("最近批改", right, options);
}

export function renderNativeGrowthEvaluationDetails(evaluation = {}, task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const sections = evaluation.feedbackSections || {};
  const revisionRequirements = asArray(evaluation.revisionRequirements);
  const strengths = asArray(sections.strengths);
  const focusAreas = asArray(sections.focusAreas);
  const rewriteChecklist = asArray(sections.rewriteChecklist);
  const reflectionPrompts = asArray(sections.reflectionPrompts);
  const criterionFeedback = asArray(sections.criterionFeedback);
  const sentenceFeedback = asArray(sections.sentenceFeedback);
  const finalConclusion = clean(sections.finalConclusion || evaluation.finalConclusion);
  const nextPractice = clean(sections.nextPractice || evaluation.nextPractice);
  const parentNote = clean(sections.parentNote || evaluation.parentNote);
  if (!revisionRequirements.length && !strengths.length && !focusAreas.length && !rewriteChecklist.length && !reflectionPrompts.length && !criterionFeedback.length && !sentenceFeedback.length && !finalConclusion && !nextPractice && !parentNote) return "";
  const list = (title, items) => items.length ? `<div class="learning-growth-feedback-detail-list"><h5>${escapeHtml(title)}</h5><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : "";
  const note = (title, value) => value ? `<article class="learning-growth-feedback-detail-note"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(value)}</p></article>` : "";
  return `<div class="learning-growth-answer-feedback-detail" data-learning-growth-feedback-detail>
      <h4>详细批改</h4>
      ${note("总结", finalConclusion)}
      ${list("需修订", revisionRequirements)}
      ${list("已做到", strengths)}
      ${list("需要关注", focusAreas)}
      ${list("修改清单", rewriteChecklist)}
      ${criterionFeedback.length ? `<div class="learning-growth-feedback-criteria">
        ${criterionFeedback.map((item) => `<article>
          <strong>${escapeHtml(item.dimension || "批改维度")}</strong>
          ${item.observation ? `<p><b>观察</b>${escapeHtml(` ${item.observation}`)}</p>` : ""}
          ${item.action ? `<p><b>修改</b>${escapeHtml(` ${item.action}`)}</p>` : ""}
        </article>`).join("")}
      </div>` : ""}
      ${sentenceFeedback.length ? `<div class="learning-growth-feedback-criteria">
        ${sentenceFeedback.map((item) => `<article>
          <strong>${escapeHtml(item.evidence || item.issue || "细节反馈")}</strong>
          ${item.issue ? `<p><b>问题</b>${escapeHtml(` ${item.issue}`)}</p>` : ""}
          ${item.whyItMatters ? `<p><b>原因</b>${escapeHtml(` ${item.whyItMatters}`)}</p>` : ""}
          ${item.fix ? `<p><b>修改</b>${escapeHtml(` ${item.fix}`)}</p>` : ""}
          ${item.example ? `<p><b>示例</b>${escapeHtml(` ${item.example}`)}</p>` : ""}
        </article>`).join("")}
      </div>` : ""}
      ${list("复盘提示", reflectionPrompts)}
      ${note("下一步练习", nextPractice)}
      ${note("家长备注", parentNote)}
    </div>`;
}

export function renderTaskRewardPolicy(task = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const policy = taskRewardPolicy(task);
  const settlementText = rewardSettlementDisplayText(task.latestRewardSettlement || task.rewardSettlement || null);
  return `<section class="learning-growth-answer-reward" data-learning-task-reward-policy>
      <div class="learning-growth-answer-reward-head">
        <h4>奖励机制</h4>
        <strong>${settlementText ? escapeHtml(settlementText) : `奖励 ${escapeHtml(String(policy.maxCoins))} 金币`}</strong>
      </div>
      ${settlementText ? `<p class="learning-growth-answer-reward-settlement" data-learning-task-reward-settlement>${escapeHtml(settlementText)}</p>` : ""}
      <div class="learning-growth-answer-reward-grid">
        <span><b>${escapeHtml(String(policy.minCoins))}%</b><small>通过基础权重</small></span>
        <span><b>${escapeHtml(String(policy.accuracyBonusMax))}%</b><small>准确度权重</small></span>
        <span><b>${escapeHtml(String(policy.timelinessBonusMax))}%</b><small>按时权重</small></span>
        <span><b>${escapeHtml(String(policy.interactionBonusMax))}%</b><small>修改互动权重</small></span>
      </div>
      <p>上面数字是奖励比例，最终金币数按本卡上限折算；证据不足或超出自动结算阈值时需要 Owner 复核。</p>
    </section>`;
}

export function renderNativeGrowthSequenceDecision(task = {}, options = {}) {
  const decision = task.learningGrowthSequenceDecision || task.sequenceDecision || null;
  if (!decision || typeof decision !== "object") return "";
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const strategyLabels = {
    repair: "修补",
    stabilize: "巩固",
    stretch: "拓展",
    transfer: "迁移"
  };
  const strategy = clean(decision.strategy);
  const skills = compactFocus(decision.targetSkillIds || []).slice(0, 140);
  const reason = clean(decision.reason);
  const meta = [
    strategyLabels[strategy] || strategy,
    decision.difficultyBand,
    decision.gradeReference,
    skills
  ].filter(Boolean);
  if (!meta.length && !reason) return "";
  return `<section class="learning-growth-answer-reward" data-learning-growth-sequence-decision>
      <div class="learning-growth-answer-reward-head">
        <h4>下一卡策略</h4>
        <strong>${escapeHtml(strategyLabels[strategy] || strategy || "按能力画像推进")}</strong>
      </div>
      ${meta.length ? `<div class="learning-growth-answer-card-meta">${meta.map((item) => `<span>${escapeHtml(String(item))}</span>`).join("")}</div>` : ""}
      ${reason ? `<p>${escapeHtml(reason)}</p>` : ""}
    </section>`;
}

export function nativeGrowthReadingMaterial(task = {}) {
  const model = taskModel(task);
  const material = model.readingMaterial || task.readingMaterial || {};
  let passage = clean(material.passage || material.text || material.content);
  let title = clean(material.title || "原始阅读材料");
  if (!passage) {
    const instruction = clean(task.learnerInstruction || task.instruction || model.learnerInstruction);
    const match = instruction.match(/(?:Reading material|Reading passage|Passage|Article)\s*:\s*([\s\S]+)$/i);
    if (match) {
      passage = clean(match[1]);
      const firstLineEnd = passage.indexOf("\n");
      const firstLine = firstLineEnd >= 0 ? passage.slice(0, firstLineEnd).trim() : "";
      if (firstLine && firstLine.length <= 120) {
        title = firstLine;
        passage = passage.slice(firstLineEnd + 1).trim();
      }
    }
  }
  if (!passage) return null;
  return {
    title,
    passage,
    meta: [material.cefr, material.wordCount ? `${material.wordCount} words` : "", material.estimatedReadingMinutes ? `${material.estimatedReadingMinutes} min` : ""].filter(Boolean)
  };
}

export function renderNativeGrowthReadingMaterial(task = {}, options = {}) {
  const material = nativeGrowthReadingMaterial(task);
  if (!material) return "";
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  return `<details class="learning-growth-answer-instruction learning-growth-reading-material" data-learning-growth-reading-material>
      <summary>查看原始阅读材料</summary>
      <article>
        <h4>${escapeHtml(material.title)}</h4>
        ${material.meta.length ? `<div class="learning-growth-reading-material-meta">${material.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        <p>${escapeHtml(material.passage)}</p>
      </article>
    </details>`;
}

export function renderNativeGrowthInstruction(task = {}, instruction = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!instruction) return "";
  if (task.latestEvaluation) {
    return `<details class="learning-growth-answer-instruction learning-growth-answer-instruction-collapsed" data-learning-growth-task-prompt-collapsed>
        <summary>查看题目要求</summary>
        <p>${escapeHtml(instruction)}</p>
      </details>`;
  }
  return `<section class="learning-growth-answer-instruction"><h4>任务要求</h4><p>${escapeHtml(instruction)}</p></section>`;
}

export function renderNativeGrowthOwnerMenu(task = {}, options = {}) {
  if (!isOwner(options)) return "";
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  const status = clean(task.status).toLowerCase();
  if (!taskCardId || ["completed", "archived", "blocked"].includes(status)) return "";
  return `<details class="learning-growth-owner-menu" data-learning-growth-owner-menu>
      <summary aria-label="更多操作" title="更多操作">&#8942;</summary>
      <div class="learning-growth-owner-menu-panel">
        <button type="button" data-learning-growth-manual-pass="${escapeHtml(taskCardId)}">手工通过</button>
      </div>
    </details>`;
}

export function renderLearningGrowthCardShareButton(taskCardId = "", options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const id = clean(taskCardId);
  if (!id) return "";
  return `<button type="button" class="learning-growth-card-share-button" data-learning-growth-card-share="${escapeHtml(id)}" aria-label="${escapeHtml("分享学习卡图片")}" title="${escapeHtml("分享学习卡图片")}">分享</button>`;
}

export function renderNativeGrowthTaskDetail(task = {}, data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  const taskCardId = clean(task.taskCardId);
  if (!taskCardId) return `<div class="learning-coin-empty">未找到这张学习卡。</div>`;
  const model = taskModel(task);
  const skills = compactFocus(task.skillIds || model.skillTargets || []).slice(0, 120);
  const latestSubmission = nativeGrowthSubmissionEvidence(task, data);
  const latestEvaluation = task.latestEvaluation || latestRecordForTask(data.evaluations || [], taskCardId, "createdAt");
  const latestReflection = task.latestReflection || latestRecordForTask(data.taskReflections || [], taskCardId, "submittedAt");
  const latestRewardSettlement = task.latestRewardSettlement || latestRewardSettlementForTask(data.rewardSettlements || [], {
    taskCardId,
    latestEvaluation
  });
  const taskSubmissionCount = asArray(data.taskSubmissions).filter((item) => clean(item?.taskCardId) === taskCardId).length;
  const taskEvaluationCount = asArray(data.evaluations).filter((item) => clean(item?.taskCardId) === taskCardId).length;
  const meta = [task.plannedDate, task.plannedMinutes ? `${task.plannedMinutes} min` : "", skills].filter(Boolean);
  const instruction = clean(task.learnerInstruction || task.instruction || model.learnerInstruction || task.instructionPreview || task.summary);
  const taskForForm = Object.assign({}, task, {
    source: clean(task.source) || "learning-growth",
    nativeState: Object.assign({}, task.nativeState || {}, { nextAction: taskActionFromRecords(task, data) }),
    latestSubmission,
    latestEvaluation,
    latestReflection,
    latestRewardSettlement,
    totalSubmissionCount: Number(task.totalSubmissionCount || 0) || taskSubmissionCount || undefined,
    totalEvaluationCount: Number(task.totalEvaluationCount || 0) || taskEvaluationCount || undefined
  });
  return `<section class="learning-growth-answer-card learning-growth-card-detail-shell" data-learning-growth-answer-card data-learning-executable-task-id="${escapeHtml(taskCardId)}">
      <div class="learning-growth-card-detail-hero">
        <div class="learning-growth-answer-card-head learning-growth-card-detail-head">
          <div>
            <span>答题卡</span>
            <h3>${escapeHtml(task.title || taskCardId || "学习任务")}</h3>
          </div>
          <div class="learning-growth-answer-card-status learning-growth-card-detail-actions">
            <strong>${escapeHtml(taskStatusText(task.status, options))}</strong>
            ${renderLearningGrowthCardShareButton(taskCardId, options)}
            ${renderNativeGrowthOwnerMenu(taskForForm, options)}
            <button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button>
          </div>
        </div>
        ${meta.length ? `<div class="learning-growth-answer-card-meta learning-growth-card-detail-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      </div>
      ${renderTaskRewardPolicy(taskForForm, options)}
      ${renderNativeGrowthSequenceDecision(taskForForm, options)}
      ${renderNativeGrowthReadingMaterial(taskForForm, options)}
      ${latestSubmission ? renderNativeGrowthPreviousSubmission(latestSubmission, options) : ""}
      ${renderNativeGrowthAudioEvidence(taskForForm, data, options)}
      ${latestEvaluation ? `<section class="learning-growth-answer-feedback">${renderNativeGrowthFeedbackHead(taskForForm, latestEvaluation, options)}${nativeGrowthFeedbackHistory(taskForForm, latestEvaluation, options)}${renderNativeGrowthEvaluationDetails(latestEvaluation, taskForForm, options)}</section>` : ""}
      ${renderNativeGrowthInstruction(taskForForm, instruction, options)}
      ${renderNativeGrowthSubmission(taskForForm, Object.assign({}, options, { hideNativeGrowthDetailButton: true, programsData: data }))}
    </section>`;
}

export function isNativeGrowthTaskDetail(task = {}) {
  return Boolean(
    task.source === "learning-growth"
    || task.nativeState
    || task.latestSubmission
    || task.latestEvaluation
    || task.latestReflection
    || asArray(task.questionItems).length
    || asArray(taskModel(task).questionItems).length
    || asArray(taskModel(task).questions).length
  );
}
