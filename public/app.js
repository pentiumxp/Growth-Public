(async function bootGrowthPlugin() {
  const statusPill = document.getElementById("status-pill");
  const summary = document.getElementById("summary");
  const emptyState = document.getElementById("empty-state");
  const params = new URLSearchParams(window.location.search);
  const workspaceId = params.get("workspaceId") || params.get("workspace_id") || "";
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";

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
  } catch (_error) {
    statusPill.textContent = "离线";
    summary.textContent = "无法连接成长插件服务。";
    emptyState.textContent = "请确认 Growth 插件服务正在运行。";
  }
})();
