import { escapeHtml as defaultEscapeHtml } from "../../utils/escapeHtml.js";
import { clean } from "../../utils/string.js";

export function statusText(status = "") {
  const value = clean(status);
  if (value === "loading_context") return "加载中";
  if (value === "drafting") return "规划中";
  if (value === "drafted") return "已规划";
  if (value === "advancing") return "生成中";
  if (value === "publishing") return "发布中";
  if (value === "generating") return "生成中";
  if (value === "published") return "已发布";
  if (value === "failed") return "失败";
  return "待生成";
}

export function progressStepRows(activeStep = "prepare", escapeHtml = defaultEscapeHtml) {
  const steps = [
    ["context", "整理上下文", "图谱、画像、近期信号"],
    ["planner", "起草计划", "Gateway 返回 plan draft"],
    ["validation", "校验草稿", "teachingFlow、图谱绑定、隐私扫描"],
    ["authoring", "生成卡片", "Gateway 返回 authoring draft"],
    ["publish", "发布卡片", "事务写入 Growth SQLite"]
  ];
  const activeIndex = Math.max(0, steps.findIndex(([id]) => id === clean(activeStep)));
  return steps.map(([id, label, detail], index) => {
    const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
    return `<span data-progress-step="${escapeHtml(id)}" data-progress-state="${state}">
        <em>${index + 1}</em>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>`;
  }).join("");
}

export function progressPanel(state = {}, escapeHtml = defaultEscapeHtml) {
  const visible = state.status === "generating" || state.status === "drafting" || state.status === "publishing" || state.status === "advancing";
  if (!visible) return "";
  const step = clean(state.progressStep || "context") || "context";
  const message = clean(state.progressMessage || "正在处理学习闭环，请稍等。");
  const title = state.status === "drafting"
    ? "正在规划下一张"
    : state.status === "publishing"
      ? "正在发布卡片"
      : state.status === "advancing"
        ? "正在生成卡片"
        : "正在生成卡片";
  return `<section class="learning-card-generation-progress" data-card-generation-progress role="status" aria-live="polite">
      <div class="learning-card-generation-progress-head">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(message)}</small>
        </span>
        <em>${escapeHtml(statusText(state.status))}</em>
      </div>
      <div class="learning-card-generation-progress-steps">
        ${progressStepRows(step, escapeHtml)}
      </div>
    </section>`;
}
