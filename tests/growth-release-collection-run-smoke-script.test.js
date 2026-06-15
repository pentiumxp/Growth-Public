const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-collection-run.js");

const {
  inputFromArgs,
  shouldWriteRecord
} = require("../scripts/smoke-growth-release-collection-run");

function sampleBundle() {
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan"
    },
    tasks: [{
      taskId: "planner_readiness",
      status: "pass",
      evidenceKey: "productionPlannerReadinessEvidence"
    }],
    evidence: {
      productionPlannerReadinessEvidence: { ok: true }
    },
    summary: {
      taskCount: 1,
      passedCount: 1,
      blockedCount: 0
    }
  };
}

function sampleAudit() {
  return {
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pass",
    readyForReleaseEvidence: true,
    bundle: {
      taskCount: 1,
      passedCount: 1,
      blockedCount: 0
    },
    audit: {
      defaultTaskCoverage: true,
      requiredTaskCount: 1,
      missingRequiredTasks: [],
      unknownRequiredTasks: [],
      blockedRequiredTasks: [],
      missingRequiredEvidenceKeys: []
    },
    missingRequired: []
  };
}

function sampleReadiness() {
  return {
    ok: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    checks: [{ key: "release_evidence_bundle_audit", status: "pass" }],
    evidence: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.evidence.v1",
      summaryOnly: true,
      externalEvidenceKeys: ["releaseEvidenceBundleAudit"]
    },
    summary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      persistedApprovalKeys: []
    }
  };
}

function withTempFiles(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-collection-run-smoke-"));
  const bundlePath = path.join(dir, "release-bundle.json");
  const auditPath = path.join(dir, "release-audit.json");
  const readinessPath = path.join(dir, "release-readiness.json");
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  fs.writeFileSync(bundlePath, JSON.stringify(sampleBundle()), "utf8");
  fs.writeFileSync(auditPath, JSON.stringify(sampleAudit()), "utf8");
  fs.writeFileSync(readinessPath, JSON.stringify(sampleReadiness()), "utf8");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ auditPath, bundlePath, dbPath, dir, readinessPath });
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

test("release collection run smoke script parses bounded artifact selectors", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--bundle-json", JSON.stringify(sampleBundle()),
    "--audit-json", JSON.stringify(sampleAudit()),
    "--readiness-json", JSON.stringify(sampleReadiness()),
    "--write-record",
    "--created-by", "weixin_owner",
    "--created-at", "2026-06-15T19:30:00.000Z"
  ];

  const input = inputFromArgs(args);
  assert.equal(shouldWriteRecord(args), true);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(input.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
  assert.equal(input.releaseReadiness.status, "ready_for_release_review");
});

test("release collection run smoke script evaluates without writes and strips artifact paths", () => {
  withTempFiles(({ auditPath, bundlePath, readinessPath, dir }) => {
    const result = runScript([
      "--bundle-file", bundlePath,
      "--audit-file", auditPath,
      "--readiness-file", readinessPath,
      "--json"
    ]);

    assert.equal(result.status, 0);
    const json = parseStdout(result);
    assert.equal(json.ok, true);
    assert.equal(json.status, "ready_for_release_review");
    assert.equal(json.summary.artifactFileNames.bundle, "release-bundle.json");
    assert.equal(result.stdout.includes(dir), false);
    assert.equal(result.stdout.includes("/Users/"), false);
  });
});

test("release collection run smoke script writes summary-only record only when requested", () => {
  withTempFiles(({ auditPath, bundlePath, dbPath, readinessPath }) => {
    const result = runScript([
      "--bundle-file", bundlePath,
      "--audit-file", auditPath,
      "--readiness-file", readinessPath,
      "--write-record",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const json = parseStdout(result);
    assert.equal(json.ok, true);
    assert.equal(json.run.status, "ready_for_release_review");
    assert.equal(json.run.privacyClass, "summary_only");

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const row = db.prepare("SELECT COUNT(*) AS count FROM learning_growth_automation_release_collection_runs").get();
      assert.equal(row.count, 1);
    } finally {
      db.close();
    }
  });
});

test("release collection run smoke script fails closed on invalid JSON", () => {
  const result = runScript([
    "--bundle-json", "{",
    "--audit-json", JSON.stringify(sampleAudit()),
    "--readiness-json", JSON.stringify(sampleReadiness())
  ]);

  assert.equal(result.status, 2);
  const json = parseStdout(result);
  assert.equal(json.ok, false);
  assert.equal(json.error, "release_collection_run_smoke_invalid_json");
});
