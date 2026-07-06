import { escapeHtml as defaultEscapeHtml } from "../utils/escapeHtml.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isOwner(options = {}) {
  return Boolean(options.state?.auth?.isOwner || options.isOwner);
}

export function learnerFacts(data = {}) {
  const profile = data.learnerProfile || {};
  const refs = asArray(data.curriculumReferences);
  const sources = asArray(data.sources);
  const programs = asArray(data.programs);
  const refText = refs.concat(programs).map((item) => JSON.stringify(item || {})).join(" ").toLowerCase();
  const sourceText = sources.map((item) => JSON.stringify(item || {})).join(" ").toLowerCase();
  const grade = refText.includes("grade7") || sourceText.includes("grade7") ? "七年级" : "待确认";
  const level = refText.includes("5_5-6") || refText.includes("5.5-6") || sourceText.includes("5.5-6")
    ? "5.5-6 / B1 过渡"
    : "待确认";
  return {
    displayName: profile.displayName || profile.learnerId || "学习者",
    grade,
    level,
    sourceCount: sources.length,
    goalCount: asArray(data.goals).length,
    programCount: programs.length
  };
}

export function renderSourceGoalForms(options = {}) {
  if (!isOwner(options)) return "";
  return `<div class="learning-foundation-owner-grid">
      <form id="learningSourceForm" class="learning-program-form" data-learning-source-create>
        <div class="learning-section-heading">
          <h3>资料来源</h3>
          <span>SQLite</span>
        </div>
        <select id="learningSourceType" class="input">
          <option value="parent_config">家长录入</option>
          <option value="school">学校</option>
          <option value="tutor">私教</option>
          <option value="cleaned_history">历史清洗</option>
          <option value="assessment_summary">测评摘要</option>
        </select>
        <input id="learningSourceTitle" class="input" type="text" autocomplete="off" placeholder="来源名称">
        <textarea id="learningSourceSummary" class="input" rows="3" placeholder="只写摘要和结论，不粘贴孩子完整作答或转写"></textarea>
        <input id="learningSourceTags" class="input" type="text" autocomplete="off" placeholder="标签，用逗号分隔">
        <button class="learning-coin-primary" type="submit">保存来源</button>
      </form>
      <form id="learningGoalForm" class="learning-program-form" data-learning-goal-create>
        <div class="learning-section-heading">
          <h3>学习目标</h3>
          <span>Goal</span>
        </div>
        <input id="learningGoalTitle" class="input" type="text" autocomplete="off" placeholder="目标名称">
        <textarea id="learningGoalSummary" class="input" rows="3" placeholder="目标、范围、要求和验收标准"></textarea>
        <div class="learning-program-field-grid">
          <label><span>领域</span><select id="learningGoalDomain" class="input"><option value="english">English</option><option value="math">Math</option><option value="programming">Programming</option></select></label>
          <label><span>优先级</span><input id="learningGoalPriority" class="input" type="number" min="0" max="100" value="80"></label>
          <label><span>截止日期</span><input id="learningGoalTargetDate" class="input" type="date"></label>
        </div>
        <input id="learningGoalFocus" class="input" type="text" autocomplete="off" placeholder="能力范围：reading, speaking, writing">
        <button class="learning-coin-primary" type="submit">保存目标</button>
      </form>
    </div>`;
}

export function renderFoundationImportForm(options = {}) {
  if (!isOwner(options)) return "";
  return `<form id="learningFoundationImportForm" class="learning-program-form learning-foundation-import-form" data-learning-foundation-import>
      <div class="learning-section-heading">
        <h3>批量基础导入</h3>
        <span>Summary only</span>
      </div>
      <textarea id="learningFoundationImportSources" class="input" rows="3" placeholder="来源，每行：类型 | 标题 | 摘要 | 标签"></textarea>
      <textarea id="learningFoundationImportGoals" class="input" rows="3" placeholder="目标，每行：领域 | 标题 | 目标摘要 | 能力标签"></textarea>
      <textarea id="learningFoundationImportProfile" class="input" rows="2" placeholder="学习画像摘要：只写结论，不粘贴完整作答或转写"></textarea>
      <button class="learning-coin-primary" type="submit">导入摘要</button>
    </form>`;
}

export function renderSourceDirectoryPanel(sourceDirectories = [], options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!isOwner(options)) return "";
  const directories = asArray(sourceDirectories);
  if (!directories.length) return "";
  return `<div class="learning-source-directory-panel" data-learning-source-directories>
      ${directories.map((directory) => {
        const summaryFiles = asArray(directory.summaryFiles);
        const available = Number(directory.availableSummaryCount || summaryFiles.filter((item) => item.exists).length || 0);
        const label = directory.directoryLabel || "学习资料";
        const fileMeta = summaryFiles.length
          ? summaryFiles.map((item) => `${item.exists ? "已识别" : "未找到"}:${item.role || item.ref || ""}`).join(" / ")
          : "尚未检测到清洗摘要";
        return `<article class="learning-source-directory-card" data-learning-source-directory="${escapeHtml(directory.bindingId || "")}">
          <div>
            <strong>${escapeHtml(label)} 路 ${escapeHtml(directory.displayName || directory.learnerId || "")}</strong>
            <p>${escapeHtml(`Summary only / ${available} summaries / ${directory.policy || "summary_only_cleaned_data"}`)}</p>
            <small>${escapeHtml(fileMeta)}</small>
          </div>
          <div class="learning-source-directory-actions">
            <button type="button" data-learning-source-directory-import="${escapeHtml(directory.bindingId || "")}">导入清洗摘要</button>
            <button type="button" data-learning-source-directory-bootstrap="${escapeHtml(directory.bindingId || "")}">初始化目标计划</button>
          </div>
        </article>`;
      }).join("")}
    </div>`;
}

export function renderFoundationPanel(data = {}, options = {}) {
  const escapeHtml = options.escapeHtml || defaultEscapeHtml;
  if (!isOwner(options)) return "";
  const sources = asArray(data.sources).slice(0, 5);
  const goals = asArray(data.goals).slice(0, 5);
  const refs = asArray(data.curriculumReferences).slice(0, 5);
  const profile = data.learnerProfile || null;
  const facts = learnerFacts(data);
  return `<section class="learning-coin-panel learning-foundation-panel learning-owner-step" data-learning-foundation data-learning-owner-step="learner">
      <div class="learning-section-heading">
        <h3>1. 确认学习对象</h3>
        <button type="button" data-learning-profile-rebuild>重建画像</button>
      </div>
      <div class="learning-owner-fact-grid">
        <span><strong>${escapeHtml(facts.displayName)}</strong><small>学习对象</small></span>
        <span><strong>${escapeHtml(facts.grade)}</strong><small>年级</small></span>
        <span><strong>${escapeHtml(facts.level)}</strong><small>英语水平</small></span>
        <span><strong>${escapeHtml(String(facts.sourceCount))}</strong><small>摘要来源</small></span>
      </div>
      ${renderSourceDirectoryPanel(data.sourceDirectories || [], options)}
      <div class="learning-foundation-grid">
        <article>
          <strong>学习画像</strong>
          <p>${escapeHtml(profile?.profileSummary || "尚未重建画像")}</p>
        </article>
        <article>
          <strong>目标</strong>
          ${goals.length ? goals.map((goal) => `<p>${escapeHtml(goal.title || goal.goalId)} · ${escapeHtml(goal.domain || "")}</p>`).join("") : `<p>还没有目标</p>`}
        </article>
        <article>
          <strong>资料来源</strong>
          ${sources.length ? sources.map((source) => `<p>${escapeHtml(source.title || source.sourceId)} · ${escapeHtml(source.sourceType || "")}</p>`).join("") : `<p>还没有来源摘要</p>`}
        </article>
        <article>
          <strong>公开课程参考</strong>
          ${refs.length ? refs.map((ref) => `<p>${escapeHtml(ref.title || ref.referenceId)}</p>`).join("") : `<p>课程参考未初始化</p>`}
        </article>
      </div>
      <details class="learning-owner-advanced">
        <summary>手动补充来源、目标或摘要</summary>
        ${renderSourceGoalForms(options)}
        ${renderFoundationImportForm(options)}
      </details>
    </section>`;
}
