const fs = require("node:fs");
const path = require("node:path");

function cleanString(value) {
  return String(value || "").trim();
}

function createGrowthSnapshotStore({ filePath }) {
  function readAll() {
    if (!filePath || !fs.existsSync(filePath)) return { snapshots: [] };
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  function writeAll(snapshot) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    fs.renameSync(tempPath, filePath);
  }

  function workspaceIdOf(value) {
    return cleanString(value) || "growth:local-dev";
  }

  return {
    get(workspaceId) {
      const id = workspaceIdOf(workspaceId);
      return (readAll().snapshots || []).find((item) => item.workspace_id === id) || null;
    },

    upsert(snapshot) {
      const workspaceId = workspaceIdOf(snapshot.workspace_id || snapshot.workspaceId);
      const all = readAll();
      const snapshots = all.snapshots || [];
      const next = Object.assign({}, snapshot, {
        workspace_id: workspaceId,
        updated_at: cleanString(snapshot.updated_at) || new Date().toISOString(),
      });
      const index = snapshots.findIndex((item) => item.workspace_id === workspaceId);
      if (index >= 0) snapshots[index] = Object.assign({}, snapshots[index], next);
      else snapshots.push(next);
      writeAll({ snapshots });
      return next;
    },
  };
}

module.exports = { createGrowthSnapshotStore };
