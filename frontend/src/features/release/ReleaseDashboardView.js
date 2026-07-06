export const releaseDashboardReadbackRow = Object.freeze(["dashboard", "Dashboard"]);

export function releaseDashboardReadbackData(data = {}) {
  const value = data.dashboard || {};
  return value.releaseDashboard || value.dashboard || value;
}
