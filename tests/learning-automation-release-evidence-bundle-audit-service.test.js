const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_TASK_IDS,
  TASK_DEFINITIONS
} = require("../src/services/learning-automation-release-evidence-bundle-service");
const {
  RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA,
  createLearningAutomationReleaseEvidenceBundleAuditService,
  requiredTaskIds
} = require("../src/services/learning-automation-release-evidence-bundle-audit-service");

function createService(files = {}) {
  return createLearningAutomationReleaseEvidenceBundleAuditService({
    readFile(filePath) {
      if (!Object.prototype.hasOwnProperty.call(files, filePath)) {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      }
      return files[filePath];
    }
  });
}

function passingBundle(overrides = {}) {
  const tasks = DEFAULT_TASK_IDS.map((taskId) => {
    const definition = TASK_DEFINITIONS.find((item) => item.taskId === taskId);
    if (definition.outputKey) {
      return {
        taskId,
        outputKey: definition.outputKey,
        ok: true,
        status: "pass",
        source: definition.commandName
      };
    }
    return {
      taskId,
      evidenceKey: definition.evidenceKey,
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
        source: "growth-release-evidence-bundle-builder",
        taskId: definition.taskId,
        evidenceId: `evidence_${definition.taskId}`
      };
    }
  }
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: "2026-06-15T14:20:00.000Z",
    requestedBy: "owner",
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
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
  }, overrides);
}

test("release evidence bundle audit service validates complete summary-only default bundle", () => {
  const service = createService({
    "/Users/xuxin/.homeai-qa/release-bundle.json": JSON.stringify(passingBundle())
  });

  assert.deepEqual(requiredTaskIds({ requiredTasks: ["scheduler-dry-run", "central_visual"] }), [
    "scheduler_dry_run",
    "central_visual"
  ]);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    bundleFile: "/Users/xuxin/.homeai-qa/release-bundle.json"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "pass");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.equal(result.bundle.bundleFileName, "release-bundle.json");
  assert.equal(result.bundle.taskCount, DEFAULT_TASK_IDS.length);
  assert.equal(result.audit.defaultTaskCoverage, true);
  assert.deepEqual(result.audit.missingRequiredTasks, []);
  assert.deepEqual(result.audit.blockedRequiredTasks, []);
  assert.deepEqual(result.audit.missingRequiredEvidenceKeys, []);
  assert.equal(JSON.stringify(result).includes("/Users/xuxin/.homeai-qa"), false);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});

test("release evidence bundle audit service fails closed for incomplete bundle", () => {
  const bundle = passingBundle();
  bundle.tasks = bundle.tasks.filter((task) => task.taskId !== "central_visual");
  bundle.evidence.centralVisualEvidence = { ok: false, status: "blocked" };
  bundle.summary.taskCount = bundle.tasks.length;
  bundle.summary.passedCount = bundle.tasks.length;

  const result = createService().evaluate({
    workspaceId: "weixin_fanfan",
    bundle
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.ok(result.audit.missingRequiredTasks.includes("central_visual"));
  assert.ok(result.audit.missingRequiredEvidenceKeys.includes("centralVisualEvidence"));
  assert.ok(result.missingRequired.includes("required_bundle_tasks"));
  assert.ok(result.missingRequired.includes("passing_required_evidence_keys"));
});

test("release evidence bundle audit service rejects privacy-risk keys and private value leaks", () => {
  const privateKey = passingBundle({
    evidence: Object.assign({}, passingBundle().evidence, {
      rawPrompt: "do not store"
    })
  });
  const keyResult = createService().evaluate({
    workspaceId: "weixin_fanfan",
    bundle: privateKey
  });
  assert.equal(keyResult.ok, false);
  assert.equal(keyResult.audit.privacyFindingCount > 0, true);
  assert.ok(keyResult.missingRequired.includes("no_privacy_risk_keys"));

  const privateValue = passingBundle();
  privateValue.evidence.centralVisualEvidence.summary = {
    screenshotPath: "/Users/xuxin/.homeai-qa/growth/central-visual.png"
  };
  const valueResult = createService().evaluate({
    workspaceId: "weixin_fanfan",
    bundle: privateValue
  });
  assert.equal(valueResult.ok, false);
  assert.equal(valueResult.audit.privateValueFindingCount > 0, true);
  assert.ok(valueResult.missingRequired.includes("no_private_value_leaks"));
});

test("release evidence bundle audit service fails closed for invalid readers and schema", () => {
  const missing = createLearningAutomationReleaseEvidenceBundleAuditService().evaluate({
    workspaceId: "weixin_fanfan",
    bundleFile: "/tmp/release-bundle.json"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "release_evidence_bundle_audit_file_reader_unavailable");

  const unsupported = createService().evaluate({
    workspaceId: "weixin_fanfan",
    bundle: Object.assign(passingBundle(), {
      schemaVersion: "wrong.schema"
    })
  });
  assert.equal(unsupported.ok, false);
  assert.ok(unsupported.missingRequired.includes("release_evidence_bundle_schema"));
});
