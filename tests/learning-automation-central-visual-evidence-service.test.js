const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CENTRAL_VISUAL_EVIDENCE_SCHEMA,
  createLearningAutomationCentralVisualEvidenceService,
  publicScope
} = require("../src/services/learning-automation-central-visual-evidence-service");

function createService(files = {}) {
  return createLearningAutomationCentralVisualEvidenceService({
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

test("central visual evidence service validates Home AI embedded-plugin visual summary", () => {
  const service = createService({
    "/tmp/visual.json": JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      checkedAt: "2026-06-15T13:40:00.000Z",
      debugUrl: "http://127.0.0.1:19074/",
      clientVersion: "20260615-growth",
      lane: { id: "ios-pwa-2" },
      screenshotPath: "/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth.png",
      assertions: [
        { name: "plugin shell visible", status: "pass" },
        { name: "no horizontal overflow", ok: true }
      ]
    })
  });

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    evidenceFile: "/tmp/visual.json"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, CENTRAL_VISUAL_EVIDENCE_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "pass");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.equal(result.visualEvidence.pluginId, "growth");
  assert.equal(result.visualEvidence.scenario, "embedded-plugin-shell");
  assert.equal(result.visualEvidence.screenshotPresent, true);
  assert.equal(result.visualEvidence.screenshotArtifactName, "ios-pwa-visual-embedded-plugin-shell-growth.png");
  assert.equal(result.visualEvidence.evidenceFileName, "visual.json");
  assert.equal(result.visualEvidence.assertionCount, 2);
  assert.equal(result.visualEvidence.failedAssertionCount, 0);
  assert.equal(result.centralBoundary.homeAiOwnsVisualHarness, true);
  assert.equal(result.centralBoundary.growthRunsNoAppium, true);
  assert.deepEqual(result.privateValueFindings, []);
  assert.equal(JSON.stringify(result).includes("/Users/xuxin/.homeai-qa"), false);
  assert.equal(JSON.stringify(result).includes("debug-url-secret"), false);
});

test("central visual evidence service fails closed for missing, mismatched, or failed evidence", () => {
  const service = createService();
  const missing = service.evaluate({ workspaceId: "weixin_fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, "missing");
  assert.deepEqual(missing.missingRequired, ["central_visual_evidence_file_or_json"]);

  const mismatch = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: {
      ok: true,
      pluginId: "finance",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true
    }
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.status, "blocked");
  assert.ok(mismatch.missingRequired.includes("matching_plugin_id"));

  const failed = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: {
      ok: true,
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true,
      assertions: [{ name: "contrast", status: "failed" }]
    }
  });
  assert.equal(failed.ok, false);
  assert.ok(failed.missingRequired.includes("passing_visual_assertions"));
});

test("central visual evidence service rejects privacy-risk fields and unavailable readers", () => {
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    plugin_id: "growth",
    scenario: "embedded-plugin-shell"
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    pluginId: "growth",
    scenario: "embedded-plugin-shell"
  });

  const service = createService();
  const privacy = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: {
      ok: true,
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true,
      accessToken: "not allowed"
    }
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "central_visual_evidence_privacy_failed");

  const privateScopeValue = service.evaluate({
    workspaceId: "weixin_fanfan",
    domain: "Bearer local-token",
    evidence: {
      ok: true,
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true
    }
  });
  assert.equal(privateScopeValue.ok, false);
  assert.equal(privateScopeValue.error, "central_visual_evidence_privacy_failed");
  assert.deepEqual(privateScopeValue.privateValueFindings, ["$.domain"]);

  const privateProjectedValue = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: {
      ok: true,
      source: "/Users/example/.homeai-qa/private-source.json",
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true
    }
  });
  assert.equal(privateProjectedValue.ok, false);
  assert.equal(privateProjectedValue.status, "blocked");
  assert.equal(privateProjectedValue.error, "central_visual_evidence_incomplete");
  assert.deepEqual(privateProjectedValue.privateValueFindings, ["$.source"]);
  assert.ok(privateProjectedValue.missingRequired.includes("no_private_value_leaks"));

  const noReader = createLearningAutomationCentralVisualEvidenceService().evaluate({
    workspaceId: "weixin_fanfan",
    evidenceFile: "/tmp/visual.json"
  });
  assert.equal(noReader.ok, false);
  assert.equal(noReader.error, "central_visual_evidence_file_reader_unavailable");
});
