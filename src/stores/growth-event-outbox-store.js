const fs = require("node:fs");
const path = require("node:path");

function cleanString(value) {
  return String(value || "").trim();
}

function readJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { events: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

function createGrowthEventOutboxStore({ filePath }) {
  function readAll() {
    return readJsonFile(filePath);
  }

  function writeAll(value) {
    writeJsonFile(filePath, value);
  }

  return {
    append(record) {
      const all = readAll();
      const events = all.events || [];
      const next = Object.assign({}, record, {
        id: cleanString(record.id),
        status: cleanString(record.status) || "pending",
        created_at: cleanString(record.created_at) || new Date().toISOString(),
        updated_at: cleanString(record.updated_at) || new Date().toISOString()
      });
      events.push(next);
      writeAll({ events });
      return next;
    },

    list(status = "") {
      const events = readAll().events || [];
      const cleanStatus = cleanString(status);
      return cleanStatus ? events.filter((event) => event.status === cleanStatus) : events;
    },

    update(id, patch) {
      const all = readAll();
      const events = all.events || [];
      const cleanId = cleanString(id);
      const index = events.findIndex((event) => event.id === cleanId);
      if (index < 0) return null;
      events[index] = Object.assign({}, events[index], patch, {
        id: events[index].id,
        updated_at: cleanString(patch.updated_at) || new Date().toISOString()
      });
      writeAll({ events });
      return events[index];
    }
  };
}

module.exports = { createGrowthEventOutboxStore };
