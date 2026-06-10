const fs = require("node:fs");
const path = require("node:path");

function createJsonWorkspaceStore({ filePath }) {
  function readAll() {
    if (!fs.existsSync(filePath)) {
      return { workspaces: [] };
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  function writeAll(snapshot) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    fs.renameSync(tempPath, filePath);
  }

  return {
    list() {
      return readAll().workspaces || [];
    },
    get(workspaceId) {
      return this.list().find((workspace) => workspace.workspace_id === workspaceId) || null;
    },
    upsert(workspace) {
      const snapshot = readAll();
      const workspaces = snapshot.workspaces || [];
      const index = workspaces.findIndex((item) => item.workspace_id === workspace.workspace_id);
      if (index >= 0) {
        workspaces[index] = { ...workspaces[index], ...workspace };
      } else {
        workspaces.push(workspace);
      }
      writeAll({ workspaces });
      return workspace;
    }
  };
}

module.exports = { createJsonWorkspaceStore };
