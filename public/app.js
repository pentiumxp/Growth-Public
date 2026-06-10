(async function bootGrowthPlugin() {
  const statusPill = document.getElementById("status-pill");
  const summary = document.getElementById("summary");
  const emptyState = document.getElementById("empty-state");
  const taskList = document.getElementById("task-list");
  const cardDetail = document.getElementById("card-detail");
  const params = new URLSearchParams(window.location.search);
  const workspaceId = params.get("workspaceId") || params.get("workspace_id") || "";
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";

  function text(value, fallback) {
    const normalized = String(value || "").trim();
    return normalized || fallback;
  }

  function audioWithQuery(audio) {
    const url = text(audio && audio.url, "");
    if (!url) return "";
    if (!workspaceId) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
  }

  function audioBlock(label, audio) {
    const url = audioWithQuery(audio);
    if (!url) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "audio-evidence";
    const caption = document.createElement("span");
    caption.textContent = `${label}：${text(audio.name, "录音")}`;
    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    wrapper.append(caption, player);
    return wrapper;
  }

  function setDetail(card, source) {
    if (!card) {
      cardDetail.hidden = true;
      cardDetail.replaceChildren();
      return;
    }
    const title = document.createElement("h3");
    title.textContent = text(card.title, "未命名任务");
    const meta = document.createElement("p");
    meta.textContent = `状态：${text(card.status, "未设置")}。下一步：${text(card.nextAction || card.primaryAction, "查看任务")}`;
    const preview = document.createElement("p");
    preview.textContent = text(card.instructionPreview, "暂无任务说明摘要。");
    const sourceLine = document.createElement("p");
    sourceLine.textContent = `来源：${text(source, "growth-plugin")}`;
    const nodes = [title, meta, preview, sourceLine];
    const submissionAudio = audioBlock("提交录音", card.latestSubmission && card.latestSubmission.audio);
    const reflectionAudio = audioBlock("复盘录音", card.latestReflection && card.latestReflection.audio);
    if (submissionAudio) nodes.push(submissionAudio);
    if (reflectionAudio) nodes.push(reflectionAudio);
    cardDetail.replaceChildren(...nodes);
    cardDetail.hidden = false;
  }

  async function openCard(taskCardId) {
    const response = await fetch(`/api/v1/growth/cards/${encodeURIComponent(taskCardId)}${query}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setDetail({
        title: "无法打开任务",
        status: "异常",
        nextAction: result.error || "请稍后重试",
        instructionPreview: ""
      }, "growth-plugin");
      return;
    }
    setDetail(result.card, result.source);
  }

  function renderCards(cards) {
    taskList.replaceChildren();
    const visibleCards = Array.isArray(cards) ? cards.filter((card) => card && card.taskCardId) : [];
    taskList.hidden = visibleCards.length === 0;
    emptyState.hidden = visibleCards.length > 0;
    for (const card of visibleCards) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "task-button";
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = text(card.title, "未命名任务");
      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = `${text(card.status, "未设置")} · ${text(card.domain || card.activityType, "成长任务")}`;
      button.append(title, meta);
      button.addEventListener("click", () => {
        openCard(card.taskCardId).catch(() => {
          setDetail({
            title: "无法打开任务",
            status: "离线",
            nextAction: "请确认 Growth 插件服务正在运行",
            instructionPreview: ""
          }, "growth-plugin");
        });
      });
      taskList.append(button);
    }
  }

  try {
    const [statusResponse, boardResponse] = await Promise.all([
      fetch(`/api/v1/growth/status${query}`, { cache: "no-store" }),
      fetch(`/api/v1/growth/board${query}`, { cache: "no-store" })
    ]);
    const status = await statusResponse.json();
    const board = await boardResponse.json();
    statusPill.textContent = status.ok ? "已连接" : "异常";
    summary.textContent = `当前阶段：${status.stage}。任务数：${board.summary.total}。`;
    emptyState.textContent = status.message || "暂无成长任务。";
    renderCards(board.cards);
  } catch (_error) {
    statusPill.textContent = "离线";
    summary.textContent = "无法连接成长插件服务。";
    emptyState.textContent = "请确认 Growth 插件服务正在运行。";
    taskList.hidden = true;
    cardDetail.hidden = true;
  }
})();
