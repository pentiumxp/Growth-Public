const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  DEFAULT_TASK_IDS,
  TASK_DEFINITIONS
} = require("../src/services/learning-automation-release-evidence-bundle-service");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-evidence-bundle-audit.js");

const {
  collectRequiredTasks,
  inputFromArgs,
  projectReleaseEvidenceBundleAuditSmokeReadback
} = require("../scripts/smoke-growth-release-evidence-bundle-audit");

function passingBundle() {
  const tasks = DEFAULT_TASK_IDS.map((taskId) => {
    const definition = TASK_DEFINITIONS.find((item) => item.taskId === taskId);
    return {
      taskId,
      evidenceKey: definition.evidenceKey,
      outputKey: definition.outputKey,
      ok: true,
      status: "pass",
      source: definition.commandName
    };
  });
  const evidence = {};
  for (const definition of TASK_DEFINITIONS) {
    if (DEFAULT_TASK_IDS.includes(definition.taskId) && definition.evidenceKey) {
      evidence[definition.evidenceKey] = {
        ok: true,
        status: "pass",
        taskId: definition.taskId
      };
    }
  }
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: "2026-06-15T14:30:00.000Z",
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domain: "science",
      subject: "science",
      horizon: "daily_plan"
    },
    evidence,
    releaseApproval: {},
    summary: {
      source: "growth-release-evidence-bundle-builder",
      taskCount: tasks.length,
      passedCount: tasks.length,
      blockedCount: 0,
      failedTaskIds: []
    },
    tasks
  };
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

test("release evidence bundle audit smoke script parses scope and required tasks", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--required-task", "central-visual",
    "--required-tasks", "scheduler_dry_run,release_approval",
    "--release-evidence-bundle-file", "/tmp/release-bundle.json"
  ];

  assert.deepEqual(collectRequiredTasks(args), [
    "central-visual",
    "scheduler_dry_run",
    "release_approval"
  ]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    requiredTaskIds: ["central-visual", "scheduler_dry_run", "release_approval"],
    bundleFile: "/tmp/release-bundle.json",
    bundle: null
  });
});

test("release evidence bundle audit smoke script projects top-level operator readback", () => {
  const output = projectReleaseEvidenceBundleAuditSmokeReadback({
    ok: false,
    source: "growth-learning-automation-release-evidence-bundle-audit-service",
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
    status: "blocked",
    readyForReleaseEvidence: false,
    bundle: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      bundleFilePresent: true,
      bundleFileName: "release-bundle.json",
      taskCount: 2,
      passedCount: 1,
      blockedCount: 1,
      evidenceKeyCount: 2,
      releaseApprovalKeyCount: 1
    },
    audit: {
      requiredTaskCount: 2,
      defaultTaskCoverage: false,
      missingRequiredTasks: [],
      unknownRequiredTasks: [],
      blockedRequiredTasks: ["scheduler_dry_run"],
      missingRequiredEvidenceKeys: ["productionSchedulerDryRunSmokeEvidence"],
      summaryCountsMatch: true,
      taskCountMatches: true,
      passedCountMatches: true,
      blockedCountMatches: true,
      privacyFindingCount: 0,
      privateValueFindingCount: 0
    },
    missingRequired: ["passing_required_bundle_tasks", "passing_required_evidence_keys"],
    error: "release_evidence_bundle_audit_failed"
  });

  assert.equal(output.releaseEvidenceBundleAuditStatus, "blocked");
  assert.equal(output.releaseEvidenceBundleAuditOk, false);
  assert.equal(output.releaseEvidenceBundleAuditReadyForReleaseEvidence, false);
  assert.equal(output.releaseEvidenceBundleAuditWorkspaceId, "weixin_fanfan");
  assert.equal(output.releaseEvidenceBundleAuditLearnerId, "fanfan");
  assert.equal(output.releaseEvidenceBundleAuditProgramId, "program_science");
  assert.equal(output.releaseEvidenceBundleAuditDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(output.releaseEvidenceBundleAuditDomain, "science");
  assert.equal(output.releaseEvidenceBundleAuditSubject, "science");
  assert.equal(output.releaseEvidenceBundleAuditHorizon, "daily_plan");
  assert.equal(output.releaseEvidenceBundleAuditBundleFilePresent, true);
  assert.equal(output.releaseEvidenceBundleAuditBundleFileName, "release-bundle.json");
  assert.equal(output.releaseEvidenceBundleAuditBundleTaskCount, 2);
  assert.equal(output.releaseEvidenceBundleAuditBundlePassedCount, 1);
  assert.equal(output.releaseEvidenceBundleAuditBundleBlockedCount, 1);
  assert.equal(output.releaseEvidenceBundleAuditEvidenceKeyCount, 2);
  assert.equal(output.releaseEvidenceBundleAuditReleaseApprovalKeyCount, 1);
  assert.equal(output.releaseEvidenceBundleAuditRequiredTaskCount, 2);
  assert.equal(output.releaseEvidenceBundleAuditDefaultTaskCoverage, false);
  assert.equal(output.releaseEvidenceBundleAuditSummaryCountsMatch, true);
  assert.deepEqual(output.releaseEvidenceBundleAuditBlockedRequiredTasks, ["scheduler_dry_run"]);
  assert.deepEqual(output.releaseEvidenceBundleAuditMissingRequiredEvidenceKeys, ["productionSchedulerDryRunSmokeEvidence"]);
  assert.deepEqual(output.releaseEvidenceBundleAuditMissingRequired, [
    "passing_required_bundle_tasks",
    "passing_required_evidence_keys"
  ]);
  assert.equal(output.releaseEvidenceBundleAuditWritefulSchedulingAllowed, false);
  assert.equal(output.releaseEvidenceBundleAuditRuntimeConfigChange, false);
  assert.equal(output.releaseEvidenceBundleAuditConfigChangeApplied, false);
  assert.equal(output.releaseEvidenceBundleAuditSchedulerPermissionGranted, false);
});

test("release evidence bundle audit smoke script validates a summary-only bundle file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-bundle-audit-"));
  const bundlePath = path.join(dir, "release-bundle.json");
  fs.writeFileSync(bundlePath, JSON.stringify(passingBundle(), null, 2), "utf8");

  try {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--release-evidence-bundle-file", bundlePath,
      "--json"
    ]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.status, "pass");
    assert.equal(output.readyForReleaseEvidence, true);
    assert.equal(output.releaseEvidenceBundleAuditStatus, "pass");
    assert.equal(output.releaseEvidenceBundleAuditOk, true);
    assert.equal(output.releaseEvidenceBundleAuditReadyForReleaseEvidence, true);
    assert.equal(output.releaseEvidenceBundleAuditWorkspaceId, "weixin_fanfan");
    assert.equal(output.releaseEvidenceBundleAuditLearnerId, "weixin_fanfan");
    assert.equal(output.releaseEvidenceBundleAuditBundleFilePresent, true);
    assert.equal(output.releaseEvidenceBundleAuditBundleFileName, "release-bundle.json");
    assert.equal(output.releaseEvidenceBundleAuditBundleTaskCount, DEFAULT_TASK_IDS.length);
    assert.equal(output.releaseEvidenceBundleAuditBundlePassedCount, DEFAULT_TASK_IDS.length);
    assert.equal(output.releaseEvidenceBundleAuditBundleBlockedCount, 0);
    assert.equal(output.releaseEvidenceBundleAuditDefaultTaskCoverage, true);
    assert.equal(output.releaseEvidenceBundleAuditSummaryCountsMatch, true);
    assert.equal(output.releaseEvidenceBundleAuditWritefulSchedulingAllowed, false);
    assert.equal(output.bundle.bundleFileName, "release-bundle.json");
    assert.equal(output.audit.defaultTaskCoverage, true);
    assert.equal(JSON.stringify(output).includes(bundlePath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release evidence bundle audit smoke script fails closed for missing bundle and privacy risk", () => {
  const missing = runScript(["--workspace-id", "weixin_fanfan", "--json"]);
  assert.equal(missing.status, 0);
  const missingOutput = parseStdout(missing);
  assert.equal(missingOutput.error, "release_evidence_bundle_audit_bundle_required");
  assert.equal(missingOutput.releaseEvidenceBundleAuditStatus, "missing");
  assert.equal(missingOutput.releaseEvidenceBundleAuditOk, false);
  assert.equal(missingOutput.releaseEvidenceBundleAuditWorkspaceId, "weixin_fanfan");

  const privateBundle = passingBundle();
  privateBundle.evidence.productionSchedulerDryRunSmokeEvidence.rawPrompt = "not allowed";
  const privacy = runScript([
    "--workspace-id", "weixin_fanfan",
    "--release-evidence-bundle-json", JSON.stringify(privateBundle),
    "--json"
  ]);
  assert.equal(privacy.status, 0);
  const output = parseStdout(privacy);
  assert.equal(output.ok, false);
  assert.ok(output.missingRequired.includes("no_privacy_risk_keys"));
  assert.equal(output.releaseEvidenceBundleAuditStatus, "blocked");
  assert.equal(output.releaseEvidenceBundleAuditPrivacyFindingCount > 0, true);
});
