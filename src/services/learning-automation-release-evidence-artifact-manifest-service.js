"use strict";

const {
  UI_EVIDENCE_COLLECTION_TASKS,
  UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY,
  UI_EVIDENCE_COLLECTION_TASK_BY_ID
} = require("./learning-automation-ui-evidence-task-registry");

const RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA = "growth.learningAutomationReleaseEvidenceArtifactManifest.v1";

const UI_TASK_BY_EVIDENCE_KEY = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.evidenceKey, task])
));
const UI_TASK_BY_UI_GATE = Object.freeze(Object.fromEntries(
  UI_EVIDENCE_COLLECTION_TASKS.map((task) => [task.uiGate, task])
));

function cleanString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 180)).filter(Boolean)));
}

function readJsonFile(filePath, readFile) {
  if (!filePath) return { ok: true, value: null };
  if (typeof readFile !== "function") {
    return { ok: false, error: "release_evidence_artifact_manifest_reader_unavailable" };
  }
  try {
    return { ok: true, value: JSON.parse(readFile(filePath, "utf8")) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError
        ? "release_evidence_artifact_manifest_invalid_json"
        : "release_evidence_artifact_manifest_unreadable"
    };
  }
}

function manifestFileFromInput(input = {}) {
  return cleanString(
    input.releaseEvidenceArtifactManifestFile
    || input.release_evidence_artifact_manifest_file
    || input.evidenceArtifactManifestFile
    || input.evidence_artifact_manifest_file
    || input.uiEvidenceManifestFile
    || input.ui_evidence_manifest_file
    || input.artifactManifestFile
    || input.artifact_manifest_file
  );
}

function stripManifestInputFields(input = {}) {
  const output = Object.assign({}, input);
  [
    "releaseEvidenceArtifactManifestFile",
    "release_evidence_artifact_manifest_file",
    "evidenceArtifactManifestFile",
    "evidence_artifact_manifest_file",
    "uiEvidenceManifestFile",
    "ui_evidence_manifest_file",
    "artifactManifestFile",
    "artifact_manifest_file",
    "releaseEvidenceArtifactManifest",
    "release_evidence_artifact_manifest",
    "evidenceArtifactManifest",
    "evidence_artifact_manifest",
    "uiEvidenceManifest",
    "ui_evidence_manifest",
    "artifactManifest",
    "artifact_manifest"
  ].forEach((key) => {
    delete output[key];
  });
  return output;
}

function inlineManifestFromInput(input = {}) {
  return objectOnly(
    input.releaseEvidenceArtifactManifest
    || input.release_evidence_artifact_manifest
    || input.evidenceArtifactManifest
    || input.evidence_artifact_manifest
    || input.uiEvidenceManifest
    || input.ui_evidence_manifest
    || input.artifactManifest
    || input.artifact_manifest
  );
}

function fileFromArtifact(artifact = {}) {
  return cleanString(
    artifact.file
    || artifact.filePath
    || artifact.file_path
    || artifact.evidenceFile
    || artifact.evidence_file
    || artifact.artifactFile
    || artifact.artifact_file
    || artifact.path
  );
}

function entryKeyFromArtifact(artifact = {}) {
  return cleanString(
    artifact.taskId
    || artifact.task_id
    || artifact.evidenceKey
    || artifact.evidence_key
    || artifact.checkKey
    || artifact.check_key
    || artifact.uiGate
    || artifact.ui_gate
    || artifact.kind
    || artifact.type
    || artifact.key
  );
}

function isCentralVisualArtifact(artifact = {}) {
  const keys = [
    artifact.taskId,
    artifact.task_id,
    artifact.evidenceKey,
    artifact.evidence_key,
    artifact.checkKey,
    artifact.check_key,
    artifact.kind,
    artifact.type,
    artifact.key
  ].map((value) => cleanString(value, 120));
  return keys.some((value) => [
    "central_visual",
    "centralVisual",
    "centralVisualEvidence",
    "central_visual_evidence"
  ].includes(value));
}

function uiTaskFromArtifact(artifact = {}) {
  const taskId = cleanString(artifact.taskId || artifact.task_id || artifact.key, 120).replace(/-/g, "_");
  if (taskId && UI_EVIDENCE_COLLECTION_TASK_BY_ID[taskId]) {
    return UI_EVIDENCE_COLLECTION_TASK_BY_ID[taskId];
  }
  const evidenceKey = cleanString(artifact.evidenceKey || artifact.evidence_key || artifact.key, 180);
  if (evidenceKey && UI_TASK_BY_EVIDENCE_KEY[evidenceKey]) {
    return UI_TASK_BY_EVIDENCE_KEY[evidenceKey];
  }
  const checkKey = cleanString(artifact.checkKey || artifact.check_key || artifact.key, 180);
  if (checkKey && UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY[checkKey]) {
    return UI_EVIDENCE_COLLECTION_TASK_BY_ID[UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY[checkKey]];
  }
  const uiGate = cleanString(artifact.uiGate || artifact.ui_gate || artifact.kind || artifact.type || artifact.key, 120);
  if (uiGate && UI_TASK_BY_UI_GATE[uiGate]) {
    return UI_TASK_BY_UI_GATE[uiGate];
  }
  return null;
}

function artifactsFromMap(value = {}, sourceKey = "") {
  return Object.entries(objectOnly(value)).map(([key, file]) => ({
    key,
    file,
    sourceKey
  }));
}

function manifestArtifacts(manifest = {}) {
  const source = objectOnly(manifest);
  const artifacts = [];
  const centralVisualEvidenceFile = cleanString(source.centralVisualEvidenceFile || source.central_visual_evidence_file);
  if (centralVisualEvidenceFile) {
    artifacts.push({
      taskId: "central_visual",
      file: centralVisualEvidenceFile,
      sourceKey: "centralVisualEvidenceFile"
    });
  }

  artifacts.push(...[
    ...asArray(source.artifacts),
    ...asArray(source.evidenceArtifacts || source.evidence_artifacts),
    ...asArray(source.releaseEvidenceArtifacts || source.release_evidence_artifacts),
    ...asArray(source.uiEvidenceArtifacts || source.ui_evidence_artifacts),
    ...asArray(source.uiArtifacts || source.ui_artifacts),
    ...artifactsFromMap(source.files, "files"),
    ...artifactsFromMap(source.evidenceFiles || source.evidence_files, "evidenceFiles"),
    ...artifactsFromMap(source.uiEvidenceFiles || source.ui_evidence_files, "uiEvidenceFiles")
  ].map(objectOnly).filter((artifact) => Object.keys(artifact).length));

  return artifacts;
}

function applyManifestToInput(input = {}, manifest = {}) {
  const output = stripManifestInputFields(input);
  const artifacts = manifestArtifacts(manifest);
  const artifactTaskIds = uniqueStrings(output.artifactTaskIds || output.artifact_task_ids || []);
  const invalidEntries = [];
  let mappedArtifactCount = 0;
  let uiArtifactCount = 0;
  let centralVisualArtifactCount = 0;
  let conflictCount = 0;

  artifacts.forEach((artifact, index) => {
    const file = fileFromArtifact(artifact);
    const key = entryKeyFromArtifact(artifact);
    if (!file) {
      invalidEntries.push({ index, key, reason: "evidence_artifact_file_required" });
      return;
    }
    if (isCentralVisualArtifact(artifact)) {
      artifactTaskIds.push("central_visual");
      if (!output.centralVisualEvidenceFile && !output.central_visual_evidence_file) {
        output.centralVisualEvidenceFile = file;
      } else {
        conflictCount += 1;
      }
      mappedArtifactCount += 1;
      centralVisualArtifactCount += 1;
      return;
    }
    const task = uiTaskFromArtifact(artifact);
    if (!task) {
      invalidEntries.push({ index, key, reason: "evidence_artifact_key_unknown" });
      return;
    }
    artifactTaskIds.push(task.taskId);
    if (!output[task.fileField] && !output[task.fileBodyField]) {
      output[task.fileField] = file;
    } else {
      conflictCount += 1;
    }
    mappedArtifactCount += 1;
    uiArtifactCount += 1;
  });

  output.artifactTaskIds = uniqueStrings(artifactTaskIds);

  return {
    ok: invalidEntries.length === 0 && mappedArtifactCount > 0,
    input: output,
    error: invalidEntries.length
      ? "release_evidence_artifact_manifest_invalid"
      : (mappedArtifactCount ? "" : "release_evidence_artifact_manifest_empty"),
    invalidEntries,
    summary: {
      schemaVersion: cleanString(manifest.schemaVersion || manifest.schema_version || RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA, 120),
      source: "growth-learning-automation-release-evidence-artifact-manifest-service",
      artifactCount: artifacts.length,
      mappedArtifactCount,
      uiArtifactCount,
      centralVisualArtifactCount,
      conflictCount,
      artifactTaskIds: uniqueStrings(artifactTaskIds)
    }
  };
}

function mergeArtifactTaskIdsIntoCollectionTasks(input = {}) {
  const artifactTaskIds = uniqueStrings(input.artifactTaskIds || input.artifact_task_ids || []);
  if (!artifactTaskIds.length) return input;
  return Object.assign({}, input, {
    tasks: uniqueStrings([
      ...asArray(input.tasks || input.taskIds || input.task_ids),
      ...artifactTaskIds
    ]),
    requiredTaskIds: uniqueStrings([
      ...asArray(input.requiredTaskIds || input.required_task_ids || input.requiredTasks || input.required_tasks),
      ...artifactTaskIds
    ])
  });
}

function createLearningAutomationReleaseEvidenceArtifactManifestService(options = {}) {
  const readFile = options.readFile;

  function applyToInput(input = {}) {
    const manifestFile = manifestFileFromInput(input);
    const inlineManifest = inlineManifestFromInput(input);
    const manifests = [];

    if (manifestFile) {
      const parsed = readJsonFile(manifestFile, readFile);
      if (!parsed.ok) {
        return Object.assign({}, parsed, {
          input: stripManifestInputFields(input),
          invalidEntries: []
        });
      }
      manifests.push(parsed.value);
    }
    if (Object.keys(inlineManifest).length) {
      manifests.push(inlineManifest);
    }

    if (!manifests.length) {
      return {
        ok: true,
        input: stripManifestInputFields(input),
        summary: {
          source: "growth-learning-automation-release-evidence-artifact-manifest-service",
          artifactCount: 0,
          mappedArtifactCount: 0,
          uiArtifactCount: 0,
          centralVisualArtifactCount: 0,
          conflictCount: 0,
          artifactTaskIds: uniqueStrings(input.artifactTaskIds || input.artifact_task_ids || [])
        }
      };
    }

    return manifests.reduce((current, manifest) => {
      if (!current.ok) return current;
      const applied = applyManifestToInput(current.input, manifest);
      return applied.ok ? applied : applied;
    }, { ok: true, input });
  }

  function applyToCollectionInput(input = {}) {
    const result = applyToInput(input);
    if (!result.ok) return result;
    return Object.assign({}, result, {
      input: mergeArtifactTaskIdsIntoCollectionTasks(result.input)
    });
  }

  return {
    applyToCollectionInput,
    applyToInput
  };
}

module.exports = {
  RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
  applyManifestToInput,
  createLearningAutomationReleaseEvidenceArtifactManifestService,
  manifestFileFromInput,
  manifestArtifacts,
  mergeArtifactTaskIdsIntoCollectionTasks,
  stripManifestInputFields
};
