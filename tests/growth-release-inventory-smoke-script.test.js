const assert = require("node:assert/strict");
const test = require("node:test");
const {
  inputFromArgs,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-inventory");

test("release inventory smoke script parses scope, gates, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--collection-run-id", "lgacrn_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "writefulExecutionApproval",
    "--runtime-enablement-record-limit", "7",
    "--automation-digest-ui-evidence", "true",
    "--json"
  ]);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(input.runtimeEnablementRecordLimit, 7);
  assert.equal(input.automationDigestUiEvidence, true);
});

test("release inventory smoke script requires workspace", () => {
  const result = validateInput(inputFromArgs([]));
  assert.equal(result.ok, false);
  assert.equal(result.error, "release_inventory_smoke_workspace_required");
});

test("release inventory smoke script delegates to inventory service only", () => {
  const calls = [];
  const result = runOperation({
    inventory(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseInventory.v1",
        status: "records_available",
        releaseInventory: { summaryOnly: true }
      };
    }
  }, {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    limit: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseInventory.v1");
  assert.deepEqual(calls, [{ workspaceId: "weixin_fanfan", learnerId: "fanfan", limit: 5 }]);
});
