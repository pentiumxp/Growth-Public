const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
  proxyBody,
  proxyUrl,
  runProxyOperation,
  validateInput
} = require("../scripts/smoke-growth-home-ai-proxy");

function responseJson(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}

test("home ai proxy smoke script builds bounded proxy readiness request", async () => {
  const calls = [];
  const input = inputFromArgs([
    "--operation", "release-readiness",
    "--home-ai-base-url", "http://127.0.0.1:8797",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--limit", "5"
  ], {});

  const result = await runProxyOperation(input, {
    readFile: () => "owner-web-key",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return responseJson(200, {
        ok: true,
        status: "incomplete",
        summary: {
          status: "incomplete",
          counts: { pass: 43, missing: 4, blocked: 0 },
          missingRequired: ["production_planner_readiness_evidence"]
        },
        releaseReview: {
          readyForReleaseReview: false,
          writefulSchedulingAllowed: false,
          missingCheckKeys: ["production_planner_readiness_evidence"],
          missingEvidenceKeys: ["productionPlannerReadinessEvidence"],
          persistedEvidenceKeys: [],
          persistedApprovalKeys: []
        }
      });
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:8797/api/hermes-plugins/growth/proxy/api/v1/growth/automation/release-readiness?targetWorkspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&limit=5");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers["X-Hermes-Web-Key"], "owner-web-key");
  assert.equal(result.homeAiProxySmokeOperation, "release-readiness");
  assert.equal(result.homeAiProxySmokeHttpStatus, 200);
  assert.equal(result.releaseReadinessStatus, "incomplete");
  assert.equal(result.passCheckCount, 43);
  assert.equal(result.homeAiProxySmokeWriteOperation, false);
  assert.equal(JSON.stringify(result).includes("owner-web-key"), false);
  assert.equal(JSON.stringify(result).includes("/tmp/private-home-ai-key"), false);
});

test("home ai proxy smoke script gates writes unless explicitly allowed", () => {
  const blocked = validateInput(inputFromArgs([
    "--operation", "daily-loop-advance",
    "--workspace-id", "weixin_fanfan",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key"
  ], {}));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "home_ai_proxy_smoke_write_not_allowed");

  const allowed = validateInput(inputFromArgs([
    "--operation", "daily-loop-advance",
    "--workspace-id", "weixin_fanfan",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--allow-write"
  ], {}));
  assert.deepEqual(allowed, { ok: true });
});

test("home ai proxy smoke script posts controlled daily-loop writes through proxy", async () => {
  const calls = [];
  const input = inputFromArgs([
    "--operation", "daily-loop-advance",
    "--home-ai-base-url", "http://homeai.local",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--recipe-id", "daily_science_v1",
    "--allow-write",
    "--body-json", JSON.stringify({ recipe_id: "daily_science_v1", requested_by: "owner" })
  ], {});

  const result = await runProxyOperation(input, {
    readFile: () => "owner-web-key",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options, body: JSON.parse(options.body) });
      return responseJson(201, {
        ok: true,
        operation: "advance",
        stage: "published",
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        scope: { domain: "science", subject: "science", targetNodeIds: ["kg_science_fair_test"] },
        readiness: { ready: true },
        actions: { canAdvance: true },
        generation: {
          ok: true,
          recipeId: "daily_science_v1",
          published: { taskCardId: "ltask_proxy_1", status: "published" }
        }
      });
    }
  });

  assert.equal(calls[0].url, "http://homeai.local/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/advance?targetWorkspaceId=weixin_fanfan&learnerId=fanfan&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(calls[0].body, {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: "15",
    target_node_ids: ["kg_science_fair_test"],
    recipe_id: "daily_science_v1",
    requested_by: "owner"
  });
  assert.equal(result.dailyLoopOperation, "advance");
  assert.equal(result.dailyLoopOutcome, "published");
  assert.equal(result.dailyLoopPublishedTaskCardId, "ltask_proxy_1");
  assert.equal(result.homeAiProxySmokeWriteOperation, true);
  assert.equal(result.homeAiProxySmokeWriteAllowed, true);
  assert.equal(result.homeAiProxySmokeWritesPerformed, true);
});

test("home ai proxy smoke script projects planner-readiness and platform evidence", async () => {
  const plannerInput = inputFromArgs([
    "--operation", "planner-readiness",
    "--home-ai-base-url", "http://homeai.local",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "science",
    "--target-node-ids", "kg_science_fair_test"
  ], {});
  const plannerUrl = proxyUrl(plannerInput, {
    method: "GET",
    path: "/api/v1/growth/automation/planner-readiness"
  });
  assert.equal(String(plannerUrl), "http://homeai.local/api/hermes-plugins/growth/proxy/api/v1/growth/automation/planner-readiness?targetWorkspaceId=weixin_fanfan&learnerId=fanfan&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test");

  const plannerResult = await runProxyOperation(plannerInput, {
    readFile: () => "owner-web-key",
    fetchImpl: async () => responseJson(200, {
      ok: true,
      gatewayMode: "responses",
      context: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        domain: "science",
        subject: "science",
        candidateNodeCount: 1,
        recentEvidenceCount: 2,
        privacyClass: "summary_only"
      },
      draftSummary: {
        schemaVersion: "growth.learningPlanDraft.v1",
        horizon: "daily_plan",
        itemCount: 1,
        targetNodeIds: ["kg_science_fair_test"]
      }
    })
  });
  assert.equal(plannerResult.plannerReadinessOk, true);
  assert.equal(plannerResult.plannerReadinessDraftItemCount, 1);
  assert.equal(plannerResult.homeAiProxySmokeRoutePath, "/api/v1/growth/automation/planner-readiness");

  const platformInput = inputFromArgs([
    "--operation", "platform-action-evidence",
    "--workspace-id", "weixin_fanfan",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key"
  ], {});
  assert.equal(proxyBody(platformInput, { method: "GET" }), undefined);
  const platformResult = await runProxyOperation(platformInput, {
    readFile: () => "owner-web-key",
    fetchImpl: async () => responseJson(200, {
      ok: true,
      source: "growth-learning-automation-platform-action-evidence-service",
      schemaVersion: "growth.learningAutomationPlatformActionEvidence.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "pass",
      readyForReleaseEvidence: true,
      count: 1,
      latestReceipt: {
        eventId: "event_proxy",
        actionInboxReceiptPresent: true,
        webPushReceiptPresent: true
      },
      missingRequired: [],
      platformBoundary: {
        summaryOnly: true,
        homeAiOwnsActionInbox: true,
        homeAiOwnsWebPush: true,
        growthReadsOnlyBoundedReceiptSummary: true
      }
    })
  });
  assert.equal(platformResult.platformActionEvidenceOk, true);
  assert.equal(platformResult.platformActionEvidenceReadyForReleaseEvidence, true);
  assert.equal(platformResult.platformActionEvidenceLatestEventId, "event_proxy");
});
