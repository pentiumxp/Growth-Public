const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-ui-evidence.js");
const {
  inputFromArgs,
  projectUiEvidenceSmokeReadback
} = require("../scripts/smoke-growth-ui-evidence");

function withTempEvidence(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-ui-evidence-"));
  const evidencePath = path.join(dir, "ui-evidence.json");
  try {
    return callback({ dir, evidencePath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test("UI evidence smoke script parses bounded selectors", () => {
  assert.deepEqual(inputFromArgs([
    "--workspace-id", "weixin_stephen",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "domain_pack_fanfan_cambridge_pathway_v1",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--evidence-key", "owner_daily_ui_evidence",
    "--ui-gate", "owner_daily",
    "--ui-evidence-file", "/tmp/ui.json"
  ]), {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    evidenceKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    evidenceFile: "/tmp/ui.json",
    evidence: null
  });
});

test("UI evidence smoke script fails closed for missing workspace", () => {
  const result = runScript(["--json"]);
  assert.equal(result.status, 2);
  assert.equal(parseStdout(result).error, "ui_evidence_workspace_required");
});

test("UI evidence smoke script projects bounded operator readback", () => {
  const projected = projectUiEvidenceSmokeReadback({
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "smoke_workspace",
    learnerId: "smoke_learner",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    label: "Owner daily UI product/visual evidence",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      checkKey: "owner_daily_ui_evidence",
      uiGate: "owner_daily",
      status: "pass",
      checkedAt: "2026-06-17T08:00:00.000Z",
      clientVersion: "20260617-growth",
      route: "/?embed=hermes#generate",
      screen: "owner-generation",
      screenshotPresent: true,
      domEvidencePresent: true,
      screenshotArtifactName: "growth-owner-daily.png",
      evidenceFilePresent: true,
      evidenceFileName: "ui-evidence.json",
      coverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      requiredCoverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      missingCoverage: [],
      assertionCount: 2,
      failedAssertionCount: 0
    },
    missingRequired: [],
    privateValueFindings: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  }, { workspaceId: "smoke_workspace", learnerId: "smoke_learner" });

  assert.equal(projected.uiEvidenceStatus, "pass");
  assert.equal(projected.uiEvidenceOk, true);
  assert.equal(projected.uiEvidenceWriteOperation, false);
  assert.equal(projected.uiEvidenceWriteAllowed, false);
  assert.equal(projected.uiEvidenceWritesPerformed, false);
  assert.equal(projected.uiEvidenceWorkspaceId, "smoke_workspace");
  assert.equal(projected.uiEvidenceLearnerId, "smoke_learner");
  assert.equal(projected.uiEvidenceProgramId, "program_science");
  assert.equal(projected.uiEvidenceDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(projected.uiEvidenceDomain, "science");
  assert.equal(projected.uiEvidenceSubject, "science");
  assert.equal(projected.uiEvidenceHorizon, "daily_plan");
  assert.equal(projected.uiEvidenceEvidenceKey, "ownerDailyUiEvidence");
  assert.equal(projected.uiEvidenceCheckKey, "owner_daily_ui_evidence");
  assert.equal(projected.uiEvidenceUiGate, "owner_daily");
  assert.equal(projected.uiEvidenceLabel, "Owner daily UI product/visual evidence");
  assert.equal(projected.uiEvidenceSource, "growth-learning-automation-ui-evidence-service");
  assert.equal(projected.uiEvidenceSchemaVersion, "growth.learningAutomationUiEvidence.v1");
  assert.equal(projected.uiEvidencePrivacyClass, "summary_only");
  assert.equal(projected.uiEvidenceSummaryOnly, true);
  assert.equal(projected.uiEvidenceReadyForReleaseEvidence, true);
  assert.deepEqual(projected.uiEvidenceMissingRequired, []);
  assert.equal(projected.uiEvidenceMissingRequiredCount, 0);
  assert.deepEqual(projected.uiEvidencePrivateValueFindings, []);
  assert.equal(projected.uiEvidencePrivateValueFindingCount, 0);
  assert.equal(projected.uiEvidenceProjectedSource, "home-ai-ios-pwa-visual-harness");
  assert.equal(projected.uiEvidenceProjectedEvidenceKey, "ownerDailyUiEvidence");
  assert.equal(projected.uiEvidenceProjectedCheckKey, "owner_daily_ui_evidence");
  assert.equal(projected.uiEvidenceProjectedUiGate, "owner_daily");
  assert.equal(projected.uiEvidenceProjectedStatus, "pass");
  assert.equal(projected.uiEvidenceClientVersion, "20260617-growth");
  assert.equal(projected.uiEvidenceRoute, "/?embed=hermes#generate");
  assert.equal(projected.uiEvidenceScreen, "owner-generation");
  assert.equal(projected.uiEvidenceScreenshotPresent, true);
  assert.equal(projected.uiEvidenceDomEvidencePresent, true);
  assert.equal(projected.uiEvidenceScreenshotArtifactName, "growth-owner-daily.png");
  assert.equal(projected.uiEvidenceEvidenceFilePresent, true);
  assert.equal(projected.uiEvidenceEvidenceFileName, "ui-evidence.json");
  assert.deepEqual(projected.uiEvidenceCoverage, ["owner_daily_generation", "daily_loop_preview", "target_context"]);
  assert.equal(projected.uiEvidenceCoverageCount, 3);
  assert.deepEqual(projected.uiEvidenceMissingCoverage, []);
  assert.equal(projected.uiEvidenceMissingCoverageCount, 0);
  assert.equal(projected.uiEvidenceAssertionCount, 2);
  assert.equal(projected.uiEvidenceFailedAssertionCount, 0);
  assert.equal(projected.uiEvidenceBoundarySummaryOnly, true);
  assert.equal(projected.uiEvidenceGrowthReadsOnlyEvidenceArtifacts, true);
  assert.equal(projected.uiEvidenceGrowthRunsNoVisualTooling, true);
  assert.equal(projected.uiEvidenceHomeAiOwnsVisualHarness, true);
  assert.equal(projected.uiEvidenceNoLearnerStateMutation, true);
  assert.equal(projected.uiEvidenceNoModelCalls, true);
  assert.equal(projected.uiEvidenceRuntimeConfigChange, false);
  assert.equal(projected.uiEvidenceConfigChangeApplied, false);
  assert.equal(projected.uiEvidenceWritefulSchedulingAllowed, false);
});

test("UI evidence smoke script reports missing artifact without writing", () => {
  withTempEvidence(({ dir }) => {
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "ownerDailyUiEvidence",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.status, "missing");
    assert.equal(output.error, "ui_evidence_missing");
    assert.deepEqual(output.missingRequired, ["ui_evidence_file_or_json"]);
    assert.equal(output.uiEvidenceStatus, "missing");
    assert.equal(output.uiEvidenceOk, false);
    assert.equal(output.uiEvidenceWriteOperation, false);
    assert.equal(output.uiEvidenceWriteAllowed, false);
    assert.equal(output.uiEvidenceWorkspaceId, "smoke_workspace");
    assert.equal(output.uiEvidenceLearnerId, "smoke_learner");
    assert.equal(output.uiEvidenceEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.uiEvidenceReadyForReleaseEvidence, false);
    assert.deepEqual(output.uiEvidenceMissingRequired, ["ui_evidence_file_or_json"]);
    assert.equal(output.uiEvidenceMissingRequiredCount, 1);
    assert.equal(output.uiEvidenceWritefulSchedulingAllowed, false);
  });
});

test("UI evidence smoke script returns summary-only UI evidence", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      uiGate: "owner_daily",
      route: "/?embed=hermes#generate",
      screenshotPath: "/Users/xuxin/.homeai-qa/artifacts/growth-owner-daily.png",
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "owner_daily_ui_evidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.status, "pass");
    assert.equal(output.readyForReleaseEvidence, true);
    assert.equal(output.uiEvidence.screenshotArtifactName, "growth-owner-daily.png");
    assert.equal(output.uiEvidenceStatus, "pass");
    assert.equal(output.uiEvidenceOk, true);
    assert.equal(output.uiEvidenceReadyForReleaseEvidence, true);
    assert.equal(output.uiEvidenceEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.uiEvidenceCheckKey, "owner_daily_ui_evidence");
    assert.equal(output.uiEvidenceUiGate, "owner_daily");
    assert.equal(output.uiEvidenceScreenshotPresent, true);
    assert.equal(output.uiEvidenceScreenshotArtifactName, "growth-owner-daily.png");
    assert.equal(output.uiEvidenceCoverageCount, 3);
    assert.equal(output.uiEvidenceMissingCoverageCount, 0);
    assert.equal(output.uiEvidenceAssertionCount, 1);
    assert.equal(output.uiEvidenceHomeAiOwnsVisualHarness, true);
    assert.equal(JSON.stringify(output).includes("/Users/xuxin/.homeai-qa"), false);
    assert.equal(JSON.stringify(output).includes("access-key"), false);
  });
});

test("UI evidence smoke script validates release package review gate", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      evidenceKey: "releasePackageReviewUiEvidence",
      uiGate: "release_package_review",
      domAssertions: [{ name: "build and record buttons", status: "pass" }],
      coverage: [
        "package_candidate_build",
        "package_candidate_status",
        "record_package_action"
      ]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "release_package_review_ui_evidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.evidenceKey, "releasePackageReviewUiEvidence");
    assert.equal(output.checkKey, "release_package_review_ui_evidence");
    assert.equal(output.uiGate, "release_package_review");
    assert.deepEqual(output.uiEvidence.missingCoverage, []);
    assert.equal(output.uiEvidenceStatus, "pass");
    assert.equal(output.uiEvidenceEvidenceKey, "releasePackageReviewUiEvidence");
    assert.equal(output.uiEvidenceCheckKey, "release_package_review_ui_evidence");
    assert.equal(output.uiEvidenceUiGate, "release_package_review");
    assert.equal(output.uiEvidenceDomEvidencePresent, true);
    assert.equal(output.uiEvidenceMissingCoverageCount, 0);
  });
});

test("UI evidence smoke script rejects private projected values", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "/Users/example/.homeai-qa/private-ui-source.json",
      evidenceKey: "ownerDailyUiEvidence",
      screenshotPresent: true,
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "ownerDailyUiEvidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "ui_evidence_incomplete");
    assert.deepEqual(output.privateValueFindings, ["$.source"]);
    assert.equal(output.uiEvidenceStatus, "blocked");
    assert.equal(output.uiEvidenceOk, false);
    assert.deepEqual(output.uiEvidencePrivateValueFindings, ["$.source"]);
    assert.equal(output.uiEvidencePrivateValueFindingCount, 1);
    assert.ok(output.uiEvidenceMissingRequired.includes("no_private_value_leaks"));
    assert.equal(output.uiEvidenceWritefulSchedulingAllowed, false);
    assert.equal(JSON.stringify(output).includes("/Users/example"), false);
  });
});
