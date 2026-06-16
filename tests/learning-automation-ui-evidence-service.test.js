const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UI_EVIDENCE_SCHEMA,
  UI_GATE_SPECS,
  createLearningAutomationUiEvidenceService,
  publicScope
} = require("../src/services/learning-automation-ui-evidence-service");

function createService(files = {}) {
  return createLearningAutomationUiEvidenceService({
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

test("UI evidence service validates a summary-only Owner daily UI artifact", () => {
  const service = createService({
    "/tmp/ui.json": JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      uiGate: "owner_daily",
      checkedAt: "2026-06-16T09:20:00.000Z",
      clientVersion: "20260616-growth",
      route: "/?embed=hermes#generate",
      screen: "owner_generation",
      screenshotPath: "/Users/xuxin/.homeai-qa/artifacts/growth-owner-daily.png",
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      assertions: [
        { name: "Generate action visible", status: "pass" },
        { name: "Progress state visible", ok: true }
      ]
    })
  });

  const result = service.evaluate({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    evidenceKey: "owner_daily_ui_evidence",
    evidenceFile: "/tmp/ui.json"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, UI_EVIDENCE_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.evidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.checkKey, "owner_daily_ui_evidence");
  assert.equal(result.uiGate, "owner_daily");
  assert.equal(result.status, "pass");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.equal(result.uiEvidence.screenshotPresent, true);
  assert.equal(result.uiEvidence.screenshotArtifactName, "growth-owner-daily.png");
  assert.equal(result.uiEvidence.evidenceFileName, "ui.json");
  assert.deepEqual(result.uiEvidence.missingCoverage, []);
  assert.equal(result.uiEvidence.assertionCount, 2);
  assert.equal(result.uiEvidence.failedAssertionCount, 0);
  assert.equal(result.uiEvidenceBoundary.homeAiOwnsVisualHarness, true);
  assert.equal(result.uiEvidenceBoundary.growthRunsNoVisualTooling, true);
  assert.equal(JSON.stringify(result).includes("/Users/xuxin/.homeai-qa"), false);
});

test("UI evidence service validates release package review UI coverage", () => {
  const service = createService();
  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    evidenceKey: "release_package_review_ui_evidence",
    evidence: {
      ok: true,
      evidenceKey: "releasePackageReviewUiEvidence",
      uiGate: "release_package_review",
      domEvidencePresent: true,
      coverage: [
        "package_candidate_build",
        "package_candidate_status",
        "record_package_action"
      ],
      assertions: [{ name: "package candidate and record controls visible", status: "pass" }]
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.evidenceKey, "releasePackageReviewUiEvidence");
  assert.equal(result.checkKey, "release_package_review_ui_evidence");
  assert.equal(result.uiGate, "release_package_review");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.deepEqual(result.uiEvidence.missingCoverage, []);
  assert.equal(result.uiEvidence.domEvidencePresent, true);
});

test("UI evidence service rejects missing gate, coverage gaps, and failed assertions", () => {
  const service = createService();
  const missing = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "ownerDailyUiEvidence"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, "missing");
  assert.deepEqual(missing.missingRequired, ["ui_evidence_file_or_json"]);

  const wrongGate = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "ownerDailyUiEvidence",
    evidence: {
      ok: true,
      evidenceKey: "ownerAuditUiEvidence",
      screenshotPresent: true,
      coverage: UI_GATE_SPECS.ownerDailyUiEvidence.requiredCoverage
    }
  });
  assert.equal(wrongGate.ok, false);
  assert.ok(wrongGate.missingRequired.includes("matching_ui_gate"));

  const coverageGap = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "automationDigestUiEvidence",
    evidence: {
      ok: true,
      evidenceKey: "automationDigestUiEvidence",
      domEvidencePresent: true,
      coverage: ["digest_list"]
    }
  });
  assert.equal(coverageGap.ok, false);
  assert.ok(coverageGap.missingRequired.includes("required_ui_coverage"));
  assert.deepEqual(coverageGap.uiEvidence.missingCoverage, ["required_action", "review_state"]);

  const failed = service.evaluate({
    workspaceId: "weixin_stephen",
    uiGate: "scheduler-run",
    evidence: {
      ok: true,
      evidenceKey: "schedulerRunUiEvidence",
      screenshotPresent: true,
      coverage: UI_GATE_SPECS.schedulerRunUiEvidence.requiredCoverage,
      assertions: [{ name: "disabled state", status: "failed" }]
    }
  });
  assert.equal(failed.ok, false);
  assert.ok(failed.missingRequired.includes("passing_ui_assertions"));
});

test("UI evidence service rejects invalid keys and privacy-risk values", () => {
  assert.deepEqual(publicScope({
    workspace_id: "weixin_stephen",
    learner_id: "fanfan",
    check_key: "proposal_review_ui_evidence"
  }), {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    evidenceKey: "proposalReviewUiEvidence",
    checkKey: "proposal_review_ui_evidence",
    uiGate: "proposal_review"
  });

  const service = createService();
  const invalidKey = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "not_a_gate"
  });
  assert.equal(invalidKey.ok, false);
  assert.equal(invalidKey.error, "ui_evidence_key_invalid");

  const privacy = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "ownerDailyUiEvidence",
    evidence: {
      ok: true,
      evidenceKey: "ownerDailyUiEvidence",
      screenshotPresent: true,
      coverage: UI_GATE_SPECS.ownerDailyUiEvidence.requiredCoverage,
      accessToken: "not allowed"
    }
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "ui_evidence_privacy_failed");

  const privateProjectedValue = service.evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "ownerDailyUiEvidence",
    evidence: {
      ok: true,
      source: "/Users/example/.homeai-qa/private-ui-source.json",
      evidenceKey: "ownerDailyUiEvidence",
      screenshotPresent: true,
      coverage: UI_GATE_SPECS.ownerDailyUiEvidence.requiredCoverage
    }
  });
  assert.equal(privateProjectedValue.ok, false);
  assert.equal(privateProjectedValue.error, "ui_evidence_incomplete");
  assert.deepEqual(privateProjectedValue.privateValueFindings, ["$.source"]);
  assert.equal(JSON.stringify(privateProjectedValue).includes("/Users/example"), false);

  const noReader = createLearningAutomationUiEvidenceService().evaluate({
    workspaceId: "weixin_stephen",
    evidenceKey: "ownerDailyUiEvidence",
    evidenceFile: "/tmp/ui.json"
  });
  assert.equal(noReader.ok, false);
  assert.equal(noReader.error, "ui_evidence_file_reader_unavailable");
});
