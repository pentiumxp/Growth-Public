const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-release-evidence.js");
const readinessScriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-readiness.js");

const {
  inputFromArgs,
  operationFromArgs,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-release-evidence");

function validOwnerDailyUiEvidence() {
  return {
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      checkKey: "owner_daily_ui_evidence",
      uiGate: "owner_daily",
      status: "pass",
      route: "/?embed=hermes#generate",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: "growth-owner-daily.png",
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      requiredCoverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  };
}

function validReleasePackageReviewUiEvidence() {
  return {
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "releasePackageReviewUiEvidence",
    checkKey: "release_package_review_ui_evidence",
    uiGate: "release_package_review",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "releasePackageReviewUiEvidence",
      checkKey: "release_package_review_ui_evidence",
      uiGate: "release_package_review",
      status: "pass",
      route: "/?embed=hermes#generate",
      screenshotPresent: true,
      domEvidencePresent: true,
      screenshotArtifactName: "growth-release-package-review.png",
      coverage: [
        "package_candidate_build",
        "package_candidate_status",
        "record_package_action"
      ],
      requiredCoverage: [
        "package_candidate_build",
        "package_candidate_status",
        "record_package_action"
      ],
      missingCoverage: [],
      assertionCount: 2,
      failedAssertionCount: 0
    },
    missingRequired: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  };
}

test("automation release evidence smoke script parses default read-only list input", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--evidence-key", "owner_daily_ui_evidence",
    "--limit", "5"
  ];

  assert.equal(operationFromArgs(args), "list");
  assert.equal(shouldAllowWrite(args), false);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    evidenceKey: "owner_daily_ui_evidence",
    evidence: {},
    status: "",
    limit: 5,
    note: "",
    requestedBy: "",
    recordedBy: "",
    observedAt: "",
    createdAt: ""
  });
});

test("automation release evidence smoke script keeps default list limit when omitted", () => {
  const input = inputFromArgs([
    "--operation", "bag",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan"
  ]);

  assert.equal(input.limit, 20);
});

test("automation release evidence smoke script requires explicit allow-write for record", () => {
  const input = {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    evidenceKey: "ownerDailyUiEvidence"
  };

  const blocked = validateOperationInput("record", input, false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "automation_release_evidence_smoke_write_not_allowed");

  const allowed = validateOperationInput("record", input, true);
  assert.equal(allowed.ok, true);
});

test("automation release evidence smoke script delegates operations to service only", () => {
  const calls = [];
  const service = {
    recordEvidence(input) {
      calls.push({ type: "recordEvidence", input });
      return { ok: true, evidence: { evidenceRecordId: "lgarev_1" } };
    },
    evidenceBag(input) {
      calls.push({ type: "evidenceBag", input });
      return { ok: true, evidence: {} };
    },
    listEvidence(input) {
      calls.push({ type: "listEvidence", input });
      return { ok: true, evidence: [] };
    }
  };

  runOperation(service, "list", { workspaceId: "weixin_fanfan" });
  runOperation(service, "bag", { workspaceId: "weixin_fanfan" });
  runOperation(service, "record", { workspaceId: "weixin_fanfan", evidenceKey: "ownerDailyUiEvidence" });

  assert.deepEqual(calls.map((call) => call.type), ["listEvidence", "evidenceBag", "recordEvidence"]);
});

test("automation release evidence smoke script rejects invalid JSON before service construction", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--workspace-id", "weixin_fanfan", "--evidence-json", "{"], {
    cwd: repoRoot,
    env: Object.assign({}, process.env),
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error, "automation_release_evidence_smoke_invalid_json");
});

test("automation release evidence smoke script can record against a temporary SQLite db when explicitly allowed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-evidence-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify(validOwnerDailyUiEvidence()),
      "--recorded-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, true);
    assert.equal(recordOutput.operation, "record");
    assert.equal(recordOutput.evidence.evidenceKey, "ownerDailyUiEvidence");

    const bag = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "bag",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(bag.status, 0, bag.stderr || bag.stdout);
    const bagOutput = JSON.parse(bag.stdout);
    assert.equal(bagOutput.ok, true);
    assert.equal(bagOutput.evidence.ownerDailyUiEvidence.source, "growth-learning-automation-ui-evidence-service");
    assert.equal(bagOutput.evidence.ownerDailyUiEvidence.evidenceRecordId, recordOutput.evidence.evidenceRecordId);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("automation release evidence smoke script records release package review UI evidence into SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-evidence-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-key", "release_package_review_ui_evidence",
      "--evidence-json", JSON.stringify(validReleasePackageReviewUiEvidence()),
      "--recorded-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, true);
    assert.equal(recordOutput.operation, "record");
    assert.equal(recordOutput.evidence.evidenceKey, "releasePackageReviewUiEvidence");
    assert.equal(recordOutput.evidence.checkKey, "release_package_review_ui_evidence");
    assert.equal(recordOutput.evidence.evidence.uiGate, "release_package_review");
    assert.equal(recordOutput.evidence.evidence.readyForReleaseEvidence, true);
    assert.equal(recordOutput.evidence.evidence.uiEvidence.screenshotArtifactName, "growth-release-package-review.png");
    assert.equal(recordOutput.evidence.evidence.writefulSchedulingAllowed, false);
    assert.equal(recordOutput.evidence.evidence.runtimeConfigChange, false);

    const bag = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "bag",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(bag.status, 0, bag.stderr || bag.stdout);
    const bagOutput = JSON.parse(bag.stdout);
    assert.equal(bagOutput.ok, true);
    assert.equal(bagOutput.evidence.releasePackageReviewUiEvidence.evidenceRecordId, recordOutput.evidence.evidenceRecordId);
    assert.equal(bagOutput.evidence.releasePackageReviewUiEvidence.uiGate, "release_package_review");
    assert.equal(bagOutput.evidence.releasePackageReviewUiEvidence.readyForReleaseEvidence, true);
    assert.equal(JSON.stringify(bagOutput).includes("/Users/"), false);
    assert.equal(JSON.stringify(bagOutput).includes("access-key"), false);

    const readiness = spawnSync(process.execPath, [
      readinessScriptPath,
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(readiness.status, 0, readiness.stderr || readiness.stdout);
    const readinessOutput = JSON.parse(readiness.stdout);
    const packageReviewCheck = readinessOutput.checks.find((item) => item.key === "release_package_review_ui_evidence");
    assert.equal(readinessOutput.ok, true);
    assert.notEqual(readinessOutput.status, "ready_for_release_review");
    assert.equal(packageReviewCheck.status, "pass");
    assert.equal(packageReviewCheck.summary.uiEvidenceValidated, true);
    assert.equal(readinessOutput.releaseReview.persistedEvidenceKeys.includes("releasePackageReviewUiEvidence"), true);
    assert.equal(readinessOutput.evidence.persistedEvidenceKeys.includes("releasePackageReviewUiEvidence"), true);
    assert.equal(readinessOutput.evidenceReadback.presentEvidenceKeys.includes("releasePackageReviewUiEvidence"), true);
    assert.equal(readinessOutput.evidenceReadback.missingCheckKeys.includes("release_package_review_ui_evidence"), false);
    const packageReviewReadback = readinessOutput.evidenceReadback.items.find((item) => item.key === "releasePackageReviewUiEvidence");
    assert.equal(packageReviewReadback.evidencePresent, true);
    assert.equal(packageReviewReadback.evidenceId, recordOutput.evidence.evidenceRecordId);
    assert.equal(packageReviewReadback.source, "growth-learning-automation-ui-evidence-service");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("automation release evidence smoke script rejects unvalidated pass UI evidence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-evidence-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify({ ok: true, evidenceKey: "ownerDailyUiEvidence" }),
      "--recorded-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(record.status, 1, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, false);
    assert.equal(recordOutput.error, "learning_automation_release_evidence_ui_validation_failed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
