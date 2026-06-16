"use strict";

const { UI_GATE_SPECS } = require("./learning-automation-ui-evidence-service");

function snakeToCamel(value = "") {
  return String(value || "").replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function fileFlagFromBodyField(value = "") {
  return `--${String(value || "").replace(/_/g, "-")}`;
}

const UI_EVIDENCE_COLLECTION_TASKS = Object.freeze(Object.values(UI_GATE_SPECS).map((spec) => {
  const fileBodyField = `${spec.checkKey}_file`;
  const fileField = snakeToCamel(fileBodyField);
  return Object.freeze({
    taskId: `${spec.uiGate}_ui`,
    evidenceKey: spec.evidenceKey,
    checkKey: spec.checkKey,
    uiGate: spec.uiGate,
    fileField,
    fileBodyField,
    fileFlag: fileFlagFromBodyField(fileBodyField)
  });
}));

const UI_EVIDENCE_COLLECTION_TASK_IDS = Object.freeze(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => task.taskId)
);

const UI_EVIDENCE_COLLECTION_TASK_BY_ID = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.taskId, task])
));

const UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.checkKey, task.taskId])
));

const UI_EVIDENCE_FILE_FIELDS = Object.freeze(
  UI_EVIDENCE_COLLECTION_TASKS.flatMap((task) => [task.fileField, task.fileBodyField])
);

module.exports = {
  UI_EVIDENCE_COLLECTION_TASKS,
  UI_EVIDENCE_COLLECTION_TASK_IDS,
  UI_EVIDENCE_COLLECTION_TASK_BY_ID,
  UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY,
  UI_EVIDENCE_FILE_FIELDS
};
