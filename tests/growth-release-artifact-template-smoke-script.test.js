"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  projectArtifactTemplateSmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-artifact-template");

test("release artifact template smoke script parses bounded release scope", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--program-id", "science",
    "--domain-pack-id", "igcse",
    "--domain", "science",
    "--subject", "biology",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "writefulExecutionApproval"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.programId, "science");
  assert.equal(input.domainPackId, "igcse");
  assert.equal(input.domain, "science");
  assert.equal(input.subject, "biology");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
});

test("release artifact template smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_artifact_template_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release artifact template smoke script delegates only to service template", () => {
  const calls = [];
  const result = runOperation({
    template(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactTemplate.v1",
        status: "artifact_manifest_required",
        releaseArtifactTemplate: { summaryOnly: true }
      };
    }
  }, {
    workspaceId: "fanfan",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "artifact_manifest_required");
  assert.equal(result.releaseArtifactTemplateStatus, "artifact_manifest_required");
  assert.equal(result.artifactSlotCount, 0);
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release artifact template smoke script projects top-level operator readback", () => {
  const result = projectArtifactTemplateSmokeReadback({
    ok: true,
    status: "artifact_manifest_required",
    releaseArtifactTemplate: {
      status: "artifact_manifest_required",
      manifestSchemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
      artifactSlotCount: 2,
      artifactTaskIds: ["central_visual", "owner_daily_ui"],
      readyForManifestInput: false,
      artifactManifestTemplate: {
        schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1"
      },
      releaseEvidenceChecklist: {
        status: "release_evidence_prerequisites",
        items: [
          { kind: "home_ai_visual_artifact" },
          { kind: "release_evidence_collection_task" },
          { kind: "write_gated_release_evidence" },
          { kind: "release_state_prerequisite" },
          { kind: "release_approval" },
          { kind: "release_record" },
          { kind: "manual_or_unsupported_release_evidence" }
        ]
      },
      releaseEvidenceActionPlan: {
        status: "release_evidence_actions_required",
        actionCount: 4,
        submittableActionCount: 0,
        phaseBlockedActionCount: 2,
        readyPhase: "release_evidence_prerequisites",
        nextSubmittableAction: null
      }
    }
  });

  assert.equal(result.releaseArtifactTemplateStatus, "artifact_manifest_required");
  assert.equal(result.manifestSchemaVersion, "growth.learningAutomationReleaseEvidenceArtifactManifest.v1");
  assert.equal(result.artifactSlotCount, 2);
  assert.deepEqual(result.artifactTaskIds, ["central_visual", "owner_daily_ui"]);
  assert.equal(result.readyForManifestInput, false);
  assert.equal(result.releaseEvidenceChecklistStatus, "release_evidence_prerequisites");
  assert.equal(result.checklistItemCount, 7);
  assert.equal(result.artifactChecklistItemCount, 1);
  assert.equal(result.collectionChecklistItemCount, 1);
  assert.equal(result.writeGatedItemCount, 1);
  assert.equal(result.statePrerequisiteItemCount, 1);
  assert.equal(result.approvalItemCount, 1);
  assert.equal(result.recordItemCount, 1);
  assert.equal(result.unsupportedItemCount, 1);
  assert.equal(result.releaseEvidenceActionPlanStatus, "release_evidence_actions_required");
  assert.equal(result.actionCount, 4);
  assert.equal(result.submittableActionCount, 0);
  assert.equal(result.phaseBlockedActionCount, 2);
  assert.equal(result.readyPhase, "release_evidence_prerequisites");
  assert.equal(result.nextSubmittableAction, null);
});

test("release artifact template smoke script runs no-write template against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-artifact-template-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-artifact-template.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gate", "writeful_execution",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "release_artifact_template");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseEvidenceArtifactTemplate.v1");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.releaseArtifactTemplate.summaryOnly, true);
    assert.equal(output.releaseArtifactTemplateStatus, output.releaseArtifactTemplate.status);
    assert.equal(output.manifestSchemaVersion, "growth.learningAutomationReleaseEvidenceArtifactManifest.v1");
    assert.equal(output.artifactSlotCount, output.releaseArtifactTemplate.artifactSlotCount);
    assert.equal(output.artifactTaskIds.includes("owner_daily_ui"), true);
    assert.equal(output.readyForManifestInput, output.releaseArtifactTemplate.readyForManifestInput);
    assert.equal(output.releaseArtifactTemplate.artifactManifestTemplate.schemaVersion, "growth.learningAutomationReleaseEvidenceArtifactManifest.v1");
    assert.equal(Array.isArray(output.releaseArtifactTemplate.artifactSlots), true);
    assert.equal(output.releaseArtifactTemplate.releaseEvidenceChecklist.schemaVersion, "growth.learningAutomationReleaseEvidenceChecklist.v1");
    assert.equal(Array.isArray(output.releaseArtifactTemplate.releaseEvidenceChecklist.items), true);
    assert.equal(output.releaseArtifactTemplate.releaseEvidenceActionPlan.schemaVersion, "growth.learningAutomationReleaseEvidenceActionPlan.v1");
    assert.equal(Array.isArray(output.releaseArtifactTemplate.releaseEvidenceActionPlan.actions), true);
    assert.equal(output.checklistItemCount, output.releaseArtifactTemplate.releaseEvidenceChecklist.items.length);
    assert.equal(output.statePrerequisiteItemCount > 0, true);
    assert.equal(output.releaseEvidenceActionPlanStatus, output.releaseArtifactTemplate.releaseEvidenceActionPlan.status);
    assert.equal(output.actionCount, output.releaseArtifactTemplate.releaseEvidenceActionPlan.actionCount);
    assert.equal(output.submittableActionCount, output.releaseArtifactTemplate.releaseEvidenceActionPlan.submittableActionCount);
    assert.equal(output.phaseBlockedActionCount, output.releaseArtifactTemplate.releaseEvidenceActionPlan.phaseBlockedActionCount);
    assert.equal(output.readyPhase, output.releaseArtifactTemplate.releaseEvidenceActionPlan.readyPhase);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
    assert.equal(JSON.stringify(output).includes("/Users/"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
