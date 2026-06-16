"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
  applyManifestToInput,
  createLearningAutomationReleaseEvidenceArtifactManifestService,
  manifestArtifacts
} = require("../src/services/learning-automation-release-evidence-artifact-manifest-service");

test("release evidence artifact manifest maps central visual and UI artifacts to transient inputs", () => {
  const result = applyManifestToInput({
    workspaceId: "fanfan",
    tasks: ["planner_readiness"]
  }, {
    schemaVersion: RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA,
    privacyClass: "summary_only",
    centralVisualEvidenceFile: "/Users/hermes-dev/.homeai-qa/central-visual.json",
    artifacts: [
      {
        evidenceKey: "releasePackageReviewUiEvidence",
        file: "/Users/hermes-dev/.homeai-qa/release-package-review-ui.json"
      },
      {
        checkKey: "scheduler_run_ui_evidence",
        evidenceFile: "/Users/hermes-dev/.homeai-qa/scheduler-run-ui.json"
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.input.centralVisualEvidenceFile, "/Users/hermes-dev/.homeai-qa/central-visual.json");
  assert.equal(result.input.releasePackageReviewUiEvidenceFile, "/Users/hermes-dev/.homeai-qa/release-package-review-ui.json");
  assert.equal(result.input.schedulerRunUiEvidenceFile, "/Users/hermes-dev/.homeai-qa/scheduler-run-ui.json");
  assert.equal(result.input.releaseEvidenceArtifactManifestFile, undefined);
  assert.deepEqual(result.input.artifactTaskIds, [
    "central_visual",
    "release_package_review_ui",
    "scheduler_run_ui"
  ]);
  assert.equal(result.summary.mappedArtifactCount, 3);
  assert.equal(result.summary.uiArtifactCount, 2);
  assert.equal(result.summary.centralVisualArtifactCount, 1);
  assert.equal(JSON.stringify(result.summary).includes("/Users/"), false);
});

test("release evidence artifact manifest supports map-shaped UI artifact files", () => {
  const artifacts = manifestArtifacts({
    uiEvidenceFiles: {
      ownerDailyUiEvidence: "/tmp/owner-daily-ui.json",
      automation_digest_ui_evidence: "/tmp/automation-digest-ui.json"
    }
  });
  assert.equal(artifacts.length, 2);

  const result = applyManifestToInput({}, { uiEvidenceFiles: {
    ownerDailyUiEvidence: "/tmp/owner-daily-ui.json",
    automation_digest_ui_evidence: "/tmp/automation-digest-ui.json"
  } });
  assert.equal(result.ok, true);
  assert.equal(result.input.ownerDailyUiEvidenceFile, "/tmp/owner-daily-ui.json");
  assert.equal(result.input.automationDigestUiEvidenceFile, "/tmp/automation-digest-ui.json");
  assert.deepEqual(result.input.artifactTaskIds, ["owner_daily_ui", "automation_digest_ui"]);
});

test("release evidence artifact manifest fails closed for unknown artifact keys", () => {
  const result = applyManifestToInput({}, {
    artifacts: [{
      evidenceKey: "rawScreenshotArchive",
      file: "/Users/hermes-dev/.homeai-qa/raw-screenshots.zip"
    }]
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_artifact_manifest_invalid");
  assert.deepEqual(result.invalidEntries, [{
    index: 0,
    key: "rawScreenshotArchive",
    reason: "evidence_artifact_key_unknown"
  }]);
  assert.equal(JSON.stringify(result.invalidEntries).includes("/Users/"), false);
});

test("release evidence artifact manifest file reader returns bounded errors", () => {
  const service = createLearningAutomationReleaseEvidenceArtifactManifestService({
    readFile() {
      throw new Error("EACCES /Users/hermes-dev/.homeai-qa/manifest.json");
    }
  });
  const result = service.applyToInput({
    releaseEvidenceArtifactManifestFile: "/Users/hermes-dev/.homeai-qa/manifest.json"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "release_evidence_artifact_manifest_unreadable");
  assert.deepEqual(result.invalidEntries, []);
  assert.equal(JSON.stringify(result).includes("EACCES"), false);
  assert.equal(JSON.stringify(result).includes("/Users/"), false);
});
