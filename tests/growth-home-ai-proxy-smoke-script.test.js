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

  const reviewBlocked = validateInput(inputFromArgs([
    "--operation", "review-advancement",
    "--workspace-id", "weixin_fanfan",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key"
  ], {}));
  assert.equal(reviewBlocked.ok, false);
  assert.equal(reviewBlocked.error, "home_ai_proxy_smoke_write_not_allowed");

  const cycleClosureBlocked = validateInput(inputFromArgs([
    "--operation", "cycle-closure",
    "--workspace-id", "weixin_fanfan",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key"
  ], {}));
  assert.equal(cycleClosureBlocked.ok, false);
  assert.equal(cycleClosureBlocked.error, "home_ai_proxy_smoke_write_not_allowed");
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

test("home ai proxy smoke script posts cycle closure through proxy", async () => {
  const calls = [];
  const input = inputFromArgs([
    "--operation", "automation-cycle-prepare",
    "--home-ai-base-url", "http://homeai.local",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--cycle-id", "cycle_proxy_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--source-target-node-id", "kg_science_previous",
    "--selected-candidate-id", "lgauto_proxy_1:lgplan_proxy_1:item_proxy_1",
    "--allowed-card-role", "daily_practice",
    "--source-plan-draft-id", "lgplan_source_1",
    "--source-task-card-id", "ltask_source_1",
    "--source-evaluation-id", "lgeval_source_1",
    "--profile-delta-id", "lgpdelta_source_1",
    "--evidence-id", "lgevidence_source_1",
    "--accept-proposal",
    "--create-digest",
    "--no-review-digest",
    "--no-create-handoff",
    "--no-deliver-handoff",
    "--auto-select-latest-completed-cycle",
    "--requested-by", "owner",
    "--allow-write"
  ], {});

  assert.equal(input.operation, "cycle-closure");
  const result = await runProxyOperation(input, {
    readFile: () => "owner-web-key",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options, body: JSON.parse(options.body) });
      return responseJson(201, {
        ok: true,
        status: "digest_pending",
        privacyClass: "summary_only",
        summaryOnly: true,
        writesPerformed: true,
        publishPerformed: false,
        schedulerStarted: false,
        stages: [
          { name: "profile_feedback", ok: true, status: "pass" },
          { name: "proposal_create", ok: true, status: "proposed" },
          { name: "proposal_review", ok: true, status: "accepted" },
          { name: "digest_create", ok: true, status: "pending" }
        ],
        summary: {
          selectedCycleId: "cycle_proxy_1",
          selectedTaskCardId: "ltask_source_1",
          proposalId: "lgauto_proxy_1",
          proposalStatus: "accepted",
          digestId: "lgadig_proxy_1",
          digestStatus: "pending",
          publishPerformed: false,
          schedulerStarted: false,
          gatewayBoundary: "proposal_creation_may_call_planner_gateway_only"
        },
        selectedCycle: {
          cycleId: "cycle_proxy_1",
          taskCardId: "ltask_source_1"
        },
        proposal: {
          proposalId: "lgauto_proxy_1",
          status: "accepted",
          workspaceId: "weixin_fanfan",
          learnerId: "fanfan",
          programId: "program_science",
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          subject: "science",
          horizon: "daily_plan"
        },
        digest: {
          digestId: "lgadig_proxy_1",
          status: "pending"
        }
      });
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://homeai.local/api/hermes-plugins/growth/proxy/api/v1/growth/automation/cycle-closures/prepare?targetWorkspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&cycleId=cycle_proxy_1&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test&sourceTargetNodeIds=kg_science_previous&selectedCandidateIds=lgauto_proxy_1%3Algplan_proxy_1%3Aitem_proxy_1&allowedCardRoles=daily_practice&sourcePlanDraftId=lgplan_source_1&sourceTaskCardId=ltask_source_1&sourceEvaluationId=lgeval_source_1&profileDeltaId=lgpdelta_source_1&evidenceId=lgevidence_source_1");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(calls[0].body, {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    cycle_id: "cycle_proxy_1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: "15",
    target_node_ids: ["kg_science_fair_test"],
    source_target_node_ids: ["kg_science_previous"],
    selected_candidate_ids: ["lgauto_proxy_1:lgplan_proxy_1:item_proxy_1"],
    allowed_card_roles: ["daily_practice"],
    source_plan_draft_id: "lgplan_source_1",
    source_task_card_id: "ltask_source_1",
    source_evaluation_id: "lgeval_source_1",
    profile_delta_id: "lgpdelta_source_1",
    evidence_id: "lgevidence_source_1",
    auto_select_latest_completed_cycle: true,
    accept_proposal: true,
    create_digest: true,
    review_digest: false,
    create_handoff: false,
    deliver_handoff: false,
    requested_by: "owner"
  });
  assert.equal(result.homeAiProxySmokeOperation, "cycle-closure");
  assert.equal(result.homeAiProxySmokeRoutePath, "/api/v1/growth/automation/cycle-closures/prepare");
  assert.equal(result.homeAiProxySmokeWriteOperation, true);
  assert.equal(result.homeAiProxySmokeWriteAllowed, true);
  assert.equal(result.homeAiProxySmokeWritesPerformed, true);
  assert.equal(result.automationCycleClosureStatus, "digest_pending");
  assert.equal(result.automationCycleClosureProposalStatus, "accepted");
  assert.equal(result.automationCycleClosureDigestStatus, "pending");
  assert.equal(result.automationCycleClosurePublishPerformed, false);
  assert.equal(result.automationCycleClosureSchedulerStarted, false);
  assert.deepEqual(result.automationCycleClosureStageNames, ["profile_feedback", "proposal_create", "proposal_review", "digest_create"]);
  assert.equal(JSON.stringify(result).includes("owner-web-key"), false);
  assert.equal(JSON.stringify(result).includes("/tmp/private-home-ai-key"), false);
});

test("home ai proxy smoke script posts review advancement through proxy", async () => {
  const calls = [];
  const input = inputFromArgs([
    "--operation", "automation-review-advance",
    "--home-ai-base-url", "http://homeai.local",
    "--home-ai-access-key-file", "/tmp/private-home-ai-key",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--cycle-id", "cycle_proxy_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--source-target-node-id", "kg_science_previous",
    "--selected-candidate-id", "lgauto_proxy_1:lgplan_proxy_1:item_proxy_1",
    "--source-plan-draft-id", "lgplan_source_1",
    "--source-task-card-id", "ltask_source_1",
    "--source-evaluation-id", "lgeval_source_1",
    "--proposal-id", "lgauto_proxy_1",
    "--digest-id", "lgadig_proxy_1",
    "--handoff-id", "lgahand_proxy_1",
    "--profile-delta-id", "lgpdelta_source_1",
    "--evidence-id", "lgevidence_source_1",
    "--prepare-review-packet",
    "--review-digest",
    "--ensure-failure-policy",
    "--create-handoff",
    "--no-deliver-handoff",
    "--no-attempt-execution",
    "--requested-by", "owner",
    "--allow-write"
  ], {});

  assert.equal(input.operation, "review-advancement");
  const result = await runProxyOperation(input, {
    readFile: () => "owner-web-key",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options, body: JSON.parse(options.body) });
      return responseJson(201, {
        ok: true,
        status: "not_delivered",
        privacyClass: "summary_only",
        summaryOnly: true,
        writesPerformed: true,
        publishPerformed: false,
        schedulerStarted: false,
        stages: [
          { name: "cycle_closure", ok: true, status: "pending" },
          { name: "digest_review", ok: true, status: "reviewed" },
          { name: "failure_policy_review", ok: true, status: "active" },
          { name: "handoff_create", ok: true, status: "not_delivered" }
        ],
        summary: {
          selectedCycleId: "cycle_proxy_1",
          selectedTaskCardId: "ltask_source_1",
          proposalId: "lgauto_proxy_1",
          proposalStatus: "accepted",
          digestId: "lgadig_proxy_1",
          digestStatus: "reviewed",
          policyId: "lgafpol_proxy_1",
          policyStatus: "active",
          handoffId: "lgahand_proxy_1",
          handoffDeliveryStatus: "not_delivered",
          publishPerformed: false,
          schedulerStarted: false,
          gatewayBoundary: "cycle_closure_proposal_creation_may_call_planner_gateway_only"
        }
      });
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://homeai.local/api/hermes-plugins/growth/proxy/api/v1/growth/automation/review-advancements/advance?targetWorkspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&cycleId=cycle_proxy_1&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test&sourceTargetNodeIds=kg_science_previous&selectedCandidateIds=lgauto_proxy_1%3Algplan_proxy_1%3Aitem_proxy_1&sourcePlanDraftId=lgplan_source_1&sourceTaskCardId=ltask_source_1&sourceEvaluationId=lgeval_source_1&proposalId=lgauto_proxy_1&digestId=lgadig_proxy_1&handoffId=lgahand_proxy_1&profileDeltaId=lgpdelta_source_1&evidenceId=lgevidence_source_1");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(calls[0].body, {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    cycle_id: "cycle_proxy_1",
    domain_pack_id: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    available_minutes: "15",
    target_node_ids: ["kg_science_fair_test"],
    source_target_node_ids: ["kg_science_previous"],
    selected_candidate_ids: ["lgauto_proxy_1:lgplan_proxy_1:item_proxy_1"],
    source_plan_draft_id: "lgplan_source_1",
    source_task_card_id: "ltask_source_1",
    source_evaluation_id: "lgeval_source_1",
    proposal_id: "lgauto_proxy_1",
    digest_id: "lgadig_proxy_1",
    handoff_id: "lgahand_proxy_1",
    profile_delta_id: "lgpdelta_source_1",
    evidence_id: "lgevidence_source_1",
    prepare_review_packet: true,
    review_digest: true,
    ensure_failure_policy: true,
    create_handoff: true,
    deliver_handoff: false,
    attempt_execution: false,
    requested_by: "owner"
  });
  assert.equal(result.homeAiProxySmokeOperation, "review-advancement");
  assert.equal(result.homeAiProxySmokeRoutePath, "/api/v1/growth/automation/review-advancements/advance");
  assert.equal(result.homeAiProxySmokeWriteOperation, true);
  assert.equal(result.homeAiProxySmokeWriteAllowed, true);
  assert.equal(result.homeAiProxySmokeWritesPerformed, true);
  assert.equal(result.automationReviewAdvancementStatus, "not_delivered");
  assert.equal(result.automationReviewAdvancementDigestStatus, "reviewed");
  assert.equal(result.automationReviewAdvancementPolicyStatus, "active");
  assert.equal(result.automationReviewAdvancementHandoffDeliveryStatus, "not_delivered");
  assert.equal(result.automationReviewAdvancementPublishPerformed, false);
  assert.equal(result.automationReviewAdvancementSchedulerStarted, false);
  assert.equal(JSON.stringify(result).includes("owner-web-key"), false);
  assert.equal(JSON.stringify(result).includes("/tmp/private-home-ai-key"), false);
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
