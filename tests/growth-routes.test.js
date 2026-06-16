const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer, startServer } = require("../src/app/http-server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("migration facade snapshot route requires registration bearer and returns readback", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeRegistration({ authorizationToken }) {
        if (authorizationToken !== "registration-key") {
          const error = new Error("Invalid registration credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
      }
    },
    growthService: {
      async importFromFacade({ workspaceId, includeCardDetails }) {
        return {
          ok: true,
          workspace_id: workspaceId,
          imported: { workspace_id: workspaceId, card_count: includeCardDetails ? 2 : 1 },
          readback: { workspace_id: workspaceId, card_count: includeCardDetails ? 2 : 1 }
        };
      },
      migrationReadback({ workspaceId }) {
        return {
          ok: true,
          workspace_id: workspaceId,
          snapshot: { workspace_id: workspaceId, card_count: 2 }
        };
      }
    }
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/migrations/facade-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test" })
    });
    assert.equal(denied.status, 403);

    const imported = await fetch(`${baseUrl}/api/v1/growth/migrations/facade-snapshot`, {
      method: "POST",
      headers: {
        authorization: "Bearer registration-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", include_card_details: false })
    });
    assert.equal(imported.status, 200);
    const body = await imported.json();
    assert.equal(body.ok, true);
    assert.equal(body.readback.card_count, 1);

    const readback = await fetch(`${baseUrl}/api/v1/growth/migrations/readback?workspace_id=growth:test`, {
      headers: { authorization: "Bearer registration-key" }
    });
    assert.equal(readback.status, 200);
    assert.equal((await readback.json()).snapshot.card_count, 2);
  } finally {
    await close(server);
  }
});

test("growth event route requires registration bearer and emits bounded events", async () => {
  const emitted = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeRegistration({ authorizationToken }) {
        if (authorizationToken !== "registration-key") {
          const error = new Error("Invalid registration credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
      }
    },
    growthEventService: {
      async emit(input) {
        emitted.push(input);
        return { ok: true, record: { id: input.eventId || input.event_id, event: input } };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "growth.card.completed" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/events`, {
      method: "POST",
      headers: {
        authorization: "Bearer registration-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        eventId: "event_1",
        type: "growth.card.completed",
        workspaceId: "growth:test",
        taskCardId: "card_1",
        summary: "Done."
      })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).record.id, "event_1");
    assert.equal(emitted[0].type, "growth.card.completed");
  } finally {
    await close(server);
  }
});

test("growth view targets are owner-only and use proxy workspace headers", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        calls.push(input);
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace", canSwitch: input.actorRole === "owner" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: true },
                { workspaceId: "weixin_wuping", label: "吴萍", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/view-targets`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.viewer.role, "owner");
    assert.equal(ownerBody.targets.length, 2);
    assert.deepEqual(calls[0], { actorRole: "owner", currentWorkspaceId: "weixin_stephen" });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/view-targets`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 200);
    const memberBody = await memberResponse.json();
    assert.equal(memberBody.viewer.role, "workspace");
    assert.equal(memberBody.targets.length, 1);
    assert.deepEqual(calls[1], { actorRole: "workspace", currentWorkspaceId: "weixin_stephen" });
  } finally {
    await close(server);
  }
});

test("growth card generation context route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCardGenerationContextService: {
      context(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, displayName: input.displayName },
          readiness: { ready: true }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/card-generation/context?workspaceId=growth:weixin_fanfan&domain=science&subject=science&domainPackId=uk_hk_curriculum_foundation&horizon=daily_plan&availableMinutes=15`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    assert.equal((await ownerResponse.json()).target.workspaceId, "weixin_fanfan");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "weixin_fanfan",
      displayName: "凡凡",
      label: "凡凡",
      growthWorkspaceId: undefined,
      programId: "",
      domain: "science",
      subject: "science",
      domainPackId: "uk_hk_curriculum_foundation",
      horizon: "daily_plan",
      availableMinutes: "15",
      cardRole: "",
      difficultyBand: ""
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth profile-delta audit route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningProfileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          count: 1,
          profileDeltas: [{
            profileDeltaId: input.profileDeltaId,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            evaluationId: input.evaluationId,
            changedCapabilities: [{ nodeId: "kg_science_fair_test" }],
            privacyClass: "summary_only"
          }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/profile-delta-audits?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&taskCardId=ltask_science_1&evaluationId=eval_science_1&profileDeltaId=profile_delta_eval_1&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.profileDeltas[0].profileDeltaId, "profile_delta_eval_1");
    assert.equal(JSON.stringify(ownerBody).includes("rawAnswer"), false);
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      profileDeltaId: "profile_delta_eval_1",
      taskCardId: "ltask_science_1",
      evaluationId: "eval_science_1",
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/profile-delta-audits?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth recommendation lifecycle route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningRecommendationLifecycleService: {
      listLifecycle(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.recommendationLifecycle.v1",
          privacyClass: "summary_only",
          count: 1,
          lifecycle: [{
            trajectoryId: input.trajectoryId,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            sourceTaskCardId: input.taskCardId,
            sourceEvaluationId: input.sourceEvaluationId,
            status: input.status,
            targetNodeIds: input.targetNodeIds,
            summaryOnly: true
          }],
          summary: {
            lifecycleCount: 1,
            pendingCount: 1
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/recommendations/lifecycle?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&trajectoryId=lgtraj_route_1&taskCardId=ltask_route_1&sourceEvaluationId=eval_route_1&generatedTaskCardId=ltask_next&generatedLearningGraphPlanId=lgp_next&status=pending&targetNodeIds=kg_science_fair_test,kg_science_variables&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.lifecycle[0].trajectoryId, "lgtraj_route_1");
    assert.equal(JSON.stringify(ownerBody).includes("rawAnswer"), false);
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      trajectoryId: "lgtraj_route_1",
      taskCardId: "ltask_route_1",
      sourceEvaluationId: "eval_route_1",
      generatedTaskCardId: "ltask_next",
      generatedLearningGraphPlanId: "lgp_next",
      status: "pending",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/recommendations/lifecycle?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth evidence audit route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningEvidenceAuditService: {
      listEvidenceAudit(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          count: 1,
          evidence: [{
            evidenceId: input.evidenceId,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceTaskCardId: input.taskCardId,
            graphNodeIds: input.targetNodeIds,
            privacyClass: "summary_only",
            summary: { summaryOnly: true, feedbackSummary: "Bounded summary." }
          }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/evidence/audit?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&evidenceId=lgevd_route_1&sourceType=daily_evaluation&sourceId=eval_route_1&taskCardId=ltask_route_1&cardRole=practice&status=observed&targetNodeIds=kg_science_fair_test,kg_science_variables&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.evidence[0].evidenceId, "lgevd_route_1");
    assert.equal(JSON.stringify(ownerBody).includes("rawAnswer"), false);
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      evidenceId: "lgevd_route_1",
      sourceType: "daily_evaluation",
      sourceId: "eval_route_1",
      taskCardId: "ltask_route_1",
      cardRole: "practice",
      status: "observed",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/evidence/audit?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth learning plan audit route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningPlanAuditService: {
      listPlanDrafts(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          summary: {
            planDraftCount: 1,
            publishedPlanCount: 1,
            lastPlanAt: "2026-06-14T09:15:00.000Z",
            lastPublishedAt: "2026-06-14T09:15:00.000Z"
          },
          count: 1,
          planDrafts: [{
            planDraftId: "lgplan_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "published",
            targetNodeIds: input.targetNodeIds,
            generatedTaskCardId: "ltask_route_1",
            generatedLearningGraphPlanId: "lgp_route_1",
            privacyClass: "summary_only"
          }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/learning-plans/audit?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&targetNodeIds=kg_science_fair_test,kg_science_variables&status=published&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.planDrafts[0].planDraftId, "lgplan_route_1");
    assert.equal(ownerBody.planDrafts[0].generatedTaskCardId, "ltask_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      status: "published",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/learning-plans/audit?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth learning cycle audit route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCycleAuditService: {
      listCycleAudit(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          summary: {
            planDraftCount: 1,
            evidenceCount: 1,
            profileDeltaCount: 1,
            correctionCount: 1,
            hasPublishedPlan: true
          },
          planAudit: { ok: true, count: 1, planDrafts: [{ planDraftId: input.planDraftId }] },
          evidenceAudit: { ok: true, count: 1, evidence: [{ evidenceId: input.evidenceId }] },
          profileDeltaAudit: { ok: true, count: 1, profileDeltas: [{ profileDeltaId: input.profileDeltaId }] },
          profileCorrections: { ok: true, count: 1, corrections: [{ correctionId: input.correctionId }] },
          timeline: [{ type: "profile_delta", id: input.profileDeltaId, at: "2026-06-15T08:10:00.000Z" }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/audit?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&planDraftId=lgplan_route_1&taskCardId=ltask_route_1&evaluationId=eval_route_1&profileDeltaId=lgpdelta_route_1&evidenceId=lgevd_route_1&correctionId=lgcorr_route_1&sourceId=eval_route_1&targetNodeIds=kg_science_fair_test,kg_science_variables&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.summary.hasPublishedPlan, true);
    assert.equal(ownerBody.profileDeltaAudit.profileDeltas[0].profileDeltaId, "lgpdelta_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      planDraftId: "lgplan_route_1",
      taskCardId: "ltask_route_1",
      evaluationId: "eval_route_1",
      profileDeltaId: "lgpdelta_route_1",
      evidenceId: "lgevd_route_1",
      correctionId: "lgcorr_route_1",
      sourceId: "eval_route_1",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/audit?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth learning cycle history route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCycleHistoryService: {
      listCycleHistory(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningCycleHistory.v1",
          privacyClass: "summary_only",
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          summary: { cycleCount: 1 },
          cycles: [{
            cycleId: "ltask_route_1",
            selectors: {
              taskCardId: "ltask_route_1",
              evaluationId: "eval_route_1",
              targetNodeIds: input.targetNodeIds
            },
            completeness: { complete: true, readyForAutomation: true },
            counts: { evidence: 1, profileDeltas: 1 },
            latestActivityAt: "2026-06-15T08:10:00.000Z"
          }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/history?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&planDraftId=lgplan_route_1&taskCardId=ltask_route_1&evaluationId=eval_route_1&profileDeltaId=lgpdelta_route_1&evidenceId=lgevd_route_1&correctionId=lgcorr_route_1&sourceId=eval_route_1&targetNodeIds=kg_science_fair_test,kg_science_variables&includeCompleteness=false&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.schemaVersion, "growth.learningCycleHistory.v1");
    assert.equal(ownerBody.cycles[0].cycleId, "ltask_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      planDraftId: "lgplan_route_1",
      taskCardId: "ltask_route_1",
      evaluationId: "eval_route_1",
      profileDeltaId: "lgpdelta_route_1",
      evidenceId: "lgevd_route_1",
      correctionId: "lgcorr_route_1",
      sourceId: "eval_route_1",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      includeCompleteness: "false"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/history?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth learning cycle completeness route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAuditCompletenessService: {
      evaluateCycleCompleteness(input) {
        calls.push(input);
        return {
          ok: true,
          complete: true,
          readyForAutomation: true,
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          summary: {
            requiredCount: 6,
            satisfiedRequiredCount: 6,
            missingRequired: [],
            planPublished: true,
            evaluationEvidence: true,
            profileDelta: true
          },
          findings: [{ code: "plan_publication", ok: true, severity: "required" }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/completeness?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&planDraftId=lgplan_route_1&taskCardId=ltask_route_1&evaluationId=eval_route_1&profileDeltaId=lgpdelta_route_1&evidenceId=lgevd_route_1&correctionId=lgcorr_route_1&sourceId=eval_route_1&targetNodeIds=kg_science_fair_test,kg_science_variables&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.complete, true);
    assert.equal(ownerBody.readyForAutomation, true);
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      planDraftId: "lgplan_route_1",
      taskCardId: "ltask_route_1",
      evaluationId: "eval_route_1",
      profileDeltaId: "lgpdelta_route_1",
      evidenceId: "lgevd_route_1",
      correctionId: "lgcorr_route_1",
      sourceId: "eval_route_1",
      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      limit: "5"
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/learning-cycles/completeness?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation proposal routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationProposalService: {
      listProposals(input) {
        calls.push({ type: "list", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          proposals: [{ proposalId: "lgauto_route_1", workspaceId: input.workspaceId }]
        };
      },
      async createProposal(input) {
        calls.push({ type: "create", input });
        return {
          ok: true,
          proposal: {
            proposalId: "lgauto_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            policy: { ownerReviewRequired: true, autoPublish: false }
          },
          publishAction: {
            endpoint: "/api/v1/growth/learning-plans/lgplan_next/publish",
            itemId: "plan_item_next"
          }
        };
      },
      reviewProposal(input) {
        calls.push({ type: "review", input });
        return {
          ok: true,
          proposal: {
            proposalId: input.proposalId,
            workspaceId: input.workspaceId,
            status: input.status,
            decision: {
              status: input.status,
              reason: input.reason,
              reviewedBy: input.reviewedBy
            }
          },
          publishAction: input.status === "accepted"
            ? {
                endpoint: "/api/v1/growth/learning-plans/lgplan_next/publish",
                itemId: "plan_item_next"
              }
            : null
        };
      },
      async publishAcceptedProposal(input) {
        calls.push({ type: "publishProposal", input });
        return {
          ok: true,
          proposal: {
            proposalId: input.proposalId,
            workspaceId: input.workspaceId,
            status: "accepted",
            execution: {
              status: "published",
              generatedTaskCardId: "ltask_generated_route_1"
            }
          },
          publishResult: {
            ok: true,
            planDraft: { planDraftId: "lgplan_next", status: "published" }
          }
        };
      }
    },
    learningAutomationSchedulerService: {
      dryRun(input) {
        calls.push({ type: "schedulerDryRun", input });
        return {
          ok: true,
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          summary: {
            inspected: 1,
            wouldPublish: 1,
            blocked: 0,
            skipped: 0
          },
          candidates: [{
            proposalId: "lgauto_route_1",
            decision: "would_publish",
            wouldPublish: true,
            safeToPublish: true
          }]
        };
      }
    },
    learningAutomationDigestService: {
      listDigests(input) {
        calls.push({ type: "listDigests", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          digests: [{ digestId: "lgadig_route_1", workspaceId: input.workspaceId, status: "pending" }]
        };
      },
      createDigest(input) {
        calls.push({ type: "createDigest", input });
        return {
          ok: true,
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          digest: {
            digestId: "lgadig_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "pending",
            summary: { wouldPublish: 1, blocked: 0, skipped: 0 }
          }
        };
      },
      reviewDigest(input) {
        calls.push({ type: "reviewDigest", input });
        return {
          ok: true,
          digest: {
            digestId: input.digestId,
            workspaceId: input.workspaceId,
            status: input.status,
            review: {
              status: input.status,
              reviewedBy: input.reviewedBy
            }
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/proposals?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&status=proposed&planDraftId=lgplan_next&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).proposals[0].proposalId, "lgauto_route_1");
    assert.deepEqual(calls[0], {
      type: "list",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        status: "proposed",
        planDraftId: "lgplan_next",
        limit: "5"
      }
    });

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/proposals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        horizon: "daily_plan",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        available_minutes: 15,
        source_plan_draft_id: "lgplan_previous",
        task_card_id: "ltask_previous",
        evaluation_id: "lgeval_previous",
        target_node_ids: ["kg_science_fair_test"],
        selected_item_id: "plan_item_next"
      })
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.proposal.workspaceId, "weixin_fanfan");
    assert.deepEqual(calls[1], {
      type: "create",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        horizon: "daily_plan",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        availableMinutes: 15,
        allowedCardRoles: undefined,
        lowPressure: undefined,
        targetNodeIds: ["kg_science_fair_test"],
        sourcePlanDraftId: "lgplan_previous",
        sourceTaskCardId: "ltask_previous",
        sourceEvaluationId: "lgeval_previous",
        profileDeltaId: undefined,
        evidenceId: undefined,
        correctionId: undefined,
        sourceId: undefined,
        sourceTargetNodeIds: undefined,
        itemId: "plan_item_next",
        requestedBy: "weixin_stephen"
      }
    });

    const reviewed = await fetch(`${baseUrl}/api/v1/growth/automation/proposals/lgauto_route_1/decision`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        status: "accepted",
        reason: "Owner approved manual publication."
      })
    });
    assert.equal(reviewed.status, 200);
    const reviewedBody = await reviewed.json();
    assert.equal(reviewedBody.proposal.status, "accepted");
    assert.deepEqual(calls[2], {
      type: "review",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        proposalId: "lgauto_route_1",
        status: "accepted",
        reason: "Owner approved manual publication.",
        reviewedBy: "weixin_stephen",
        decidedAt: undefined
      }
    });

    const publishedProposal = await fetch(`${baseUrl}/api/v1/growth/automation/proposals/lgauto_route_1/publish`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        generation_key: "owner-explicit-proposal-publish"
      })
    });
    assert.equal(publishedProposal.status, 201);
    const publishedProposalBody = await publishedProposal.json();
    assert.equal(publishedProposalBody.proposal.execution.status, "published");
    assert.deepEqual(calls[3], {
      type: "publishProposal",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        proposalId: "lgauto_route_1",
        generationKey: "owner-explicit-proposal-publish",
        cardSchemaVersion: undefined,
        requestedBy: "weixin_stephen",
        executedAt: undefined
      }
    });

    const schedulerDryRun = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/dry-run`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        target_node_ids: ["kg_science_fair_test"],
        limit: 5
      })
    });
    assert.equal(schedulerDryRun.status, 200);
    const schedulerDryRunBody = await schedulerDryRun.json();
    assert.equal(schedulerDryRunBody.dryRun, true);
    assert.equal(schedulerDryRunBody.writePlanned, false);
    assert.deepEqual(calls[4], {
      type: "schedulerDryRun",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        proposalId: undefined,
        planDraftId: undefined,
        selectedItemId: undefined,
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        targetNodeIds: ["kg_science_fair_test"],
        sourceTargetNodeIds: undefined,
        profileDeltaId: undefined,
        evidenceId: undefined,
        correctionId: undefined,
        sourceId: undefined,
        auditLimit: undefined,
        limit: 5,
        requestedBy: "weixin_stephen"
      }
    });

    const digestList = await fetch(`${baseUrl}/api/v1/growth/automation/digests?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&status=pending&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(digestList.status, 200);
    assert.equal((await digestList.json()).digests[0].digestId, "lgadig_route_1");
    assert.deepEqual(calls[5], {
      type: "listDigests",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "pending",
        limit: "5"
      }
    });

    const digestCreated = await fetch(`${baseUrl}/api/v1/growth/automation/digests`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        target_node_ids: ["kg_science_fair_test"],
        limit: 5
      })
    });
    assert.equal(digestCreated.status, 201);
    const digestCreatedBody = await digestCreated.json();
    assert.equal(digestCreatedBody.digest.digestId, "lgadig_route_1");
    assert.equal(digestCreatedBody.digest.summary.wouldPublish, 1);
    assert.deepEqual(calls[6], {
      type: "createDigest",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        planDraftId: undefined,
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        targetNodeIds: ["kg_science_fair_test"],
        sourceTargetNodeIds: undefined,
        profileDeltaId: undefined,
        evidenceId: undefined,
        correctionId: undefined,
        sourceId: undefined,
        auditLimit: undefined,
        limit: 5,
        requestedBy: "weixin_stephen"
      }
    });

    const digestReviewed = await fetch(`${baseUrl}/api/v1/growth/automation/digests/lgadig_route_1/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        status: "reviewed",
        selected_candidate_ids: ["lgauto_route_1:lgplan_next:plan_item_next"],
        note: "Reviewed only."
      })
    });
    assert.equal(digestReviewed.status, 200);
    const digestReviewedBody = await digestReviewed.json();
    assert.equal(digestReviewedBody.digest.status, "reviewed");
    assert.deepEqual(calls[7], {
      type: "reviewDigest",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        digestId: "lgadig_route_1",
        status: "reviewed",
        selectedCandidateIds: ["lgauto_route_1:lgplan_next:plan_item_next"],
        reason: "Reviewed only.",
        note: "Reviewed only.",
        reviewedBy: "weixin_stephen",
        reviewedAt: undefined
      }
    });

    const deniedWrite = await fetch(`${baseUrl}/api/v1/growth/automation/proposals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedWrite.status, 403);
    assert.equal((await deniedWrite.json()).error.code, "growth_automation_proposal_owner_required");

    const deniedReview = await fetch(`${baseUrl}/api/v1/growth/automation/proposals/lgauto_route_1/decision`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", status: "accepted" })
    });
    assert.equal(deniedReview.status, 403);
    assert.equal((await deniedReview.json()).error.code, "growth_automation_proposal_owner_required");

    const deniedPublish = await fetch(`${baseUrl}/api/v1/growth/automation/proposals/lgauto_route_1/publish`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedPublish.status, 403);
    assert.equal((await deniedPublish.json()).error.code, "growth_automation_proposal_owner_required");

    const deniedScheduler = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/dry-run`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedScheduler.status, 403);
    assert.equal((await deniedScheduler.json()).error.code, "growth_automation_scheduler_owner_required");

    const deniedDigestCreate = await fetch(`${baseUrl}/api/v1/growth/automation/digests`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedDigestCreate.status, 403);
    assert.equal((await deniedDigestCreate.json()).error.code, "growth_automation_digest_owner_required");

    const deniedDigestReview = await fetch(`${baseUrl}/api/v1/growth/automation/digests/lgadig_route_1/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", status: "reviewed" })
    });
    assert.equal(deniedDigestReview.status, 403);
    assert.equal((await deniedDigestReview.json()).error.code, "growth_automation_digest_owner_required");

    const deniedSchedulerTarget = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/dry-run`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_unknown" })
    });
    assert.equal(deniedSchedulerTarget.status, 403);
    assert.equal((await deniedSchedulerTarget.json()).error.code, "growth_target_not_visible");

    const deniedDigestTarget = await fetch(`${baseUrl}/api/v1/growth/automation/digests`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_unknown" })
    });
    assert.equal(deniedDigestTarget.status, 403);
    assert.equal((await deniedDigestTarget.json()).error.code, "growth_target_not_visible");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/proposals?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");

    const deniedDigestRead = await fetch(`${baseUrl}/api/v1/growth/automation/digests?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedDigestRead.status, 403);
    assert.equal((await deniedDigestRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation failure policy routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationFailurePolicyService: {
      listPolicies(input) {
        calls.push({ type: "listPolicies", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          policies: [{ policyId: "lgafpol_route_1", workspaceId: input.workspaceId, status: "active" }]
        };
      },
      evaluateReadiness(input) {
        calls.push({ type: "readiness", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          status: "failure_policy_ready",
          readyForWritefulAutomationPrerequisite: true,
          writefulSchedulingAllowed: false,
          policy: { policyId: "lgafpol_route_1", status: "active" }
        };
      },
      createPolicy(input) {
        calls.push({ type: "createPolicy", input });
        return {
          ok: true,
          policy: {
            policyId: "lgafpol_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "draft",
            policy: { writefulSchedulingAllowed: false }
          },
          readiness: {
            readyForWritefulAutomationPrerequisite: false,
            writefulSchedulingAllowed: false
          }
        };
      },
      reviewPolicy(input) {
        calls.push({ type: "reviewPolicy", input });
        return {
          ok: true,
          policy: {
            policyId: input.policyId,
            workspaceId: input.workspaceId,
            status: input.status,
            review: { status: input.status, reviewedBy: input.reviewedBy }
          },
          readiness: {
            readyForWritefulAutomationPrerequisite: input.status === "active",
            writefulSchedulingAllowed: false
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&status=active&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).policies[0].policyId, "lgafpol_route_1");
    assert.deepEqual(calls[0], {
      type: "listPolicies",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "active",
        limit: "5"
      }
    });

    const readinessResponse = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies/readiness?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(readinessResponse.status, 200);
    const readinessBody = await readinessResponse.json();
    assert.equal(readinessBody.readyForWritefulAutomationPrerequisite, true);
    assert.equal(readinessBody.writefulSchedulingAllowed, false);
    assert.equal(calls[1].type, "readiness");
    assert.equal(calls[1].input.workspaceId, "weixin_fanfan");
    assert.equal(calls[1].input.status, "");

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        policy_version: "growth.learningAutomationFailurePolicy.v1",
        policy: { writefulSchedulingAllowed: true },
        rollback_policy: { partialPublishBehavior: "service_transaction_rollback" },
        failure_policy: { retryRequiresOwner: true }
      })
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.policy.policyId, "lgafpol_route_1");
    assert.deepEqual(calls[2], {
      type: "createPolicy",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        policyVersion: "growth.learningAutomationFailurePolicy.v1",
        policy: { writefulSchedulingAllowed: true },
        rollbackPolicy: { partialPublishBehavior: "service_transaction_rollback" },
        failurePolicy: { retryRequiresOwner: true },
        requestedBy: "weixin_stephen"
      }
    });

    const reviewed = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies/lgafpol_route_1/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        status: "active",
        note: "Owner activates failure policy."
      })
    });
    assert.equal(reviewed.status, 200);
    const reviewedBody = await reviewed.json();
    assert.equal(reviewedBody.policy.status, "active");
    assert.deepEqual(calls[3], {
      type: "reviewPolicy",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        policyId: "lgafpol_route_1",
        status: "active",
        reason: "Owner activates failure policy.",
        note: "Owner activates failure policy.",
        reviewedBy: "weixin_stephen",
        reviewedAt: undefined,
        affectedPolicyIds: undefined
      }
    });

    const deniedCreate = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).error.code, "growth_automation_failure_policy_owner_required");

    const deniedReview = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies/lgafpol_route_1/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", status: "active" })
    });
    assert.equal(deniedReview.status, 403);
    assert.equal((await deniedReview.json()).error.code, "growth_automation_failure_policy_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/failure-policies?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation action handoff routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationActionHandoffService: {
      listHandoffs(input) {
        calls.push({ type: "listHandoffs", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          handoffs: [{ handoffId: "lgahand_route_1", workspaceId: input.workspaceId }]
        };
      },
      createHandoff(input) {
        calls.push({ type: "createHandoff", input });
        return {
          ok: true,
          handoff: {
            handoffId: "lgahand_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            digestId: input.digestId,
            status: "pending_delivery",
            deliveryStatus: "not_delivered"
          }
        };
      },
      async deliverHandoff(input) {
        calls.push({ type: "deliverHandoff", input });
        return {
          ok: true,
          deliveryStatus: "delivery_failed",
          handoff: {
            handoffId: input.handoffId,
            workspaceId: input.workspaceId,
            deliveryStatus: "delivery_failed"
          },
          delivery: {
            ok: false,
            error: "home_ai_notification_post_failed"
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&digestId=lgadig_ready_1&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&status=pending_delivery&deliveryStatus=not_delivered&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).handoffs[0].handoffId, "lgahand_route_1");
    assert.deepEqual(calls[0], {
      type: "listHandoffs",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        digestId: "lgadig_ready_1",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "pending_delivery",
        deliveryStatus: "not_delivered",
        limit: "5"
      }
    });

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        digest_id: "lgadig_ready_1",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        summary: "Automation digest requires Owner action."
      })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).handoff.handoffId, "lgahand_route_1");
    assert.deepEqual(calls[1], {
      type: "createHandoff",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        digestId: "lgadig_ready_1",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        summary: "Automation digest requires Owner action.",
        requestedBy: "weixin_stephen"
      }
    });

    const delivered = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs/lgahand_route_1/deliver`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan"
      })
    });
    assert.equal(delivered.status, 200);
    const deliveredBody = await delivered.json();
    assert.equal(deliveredBody.deliveryStatus, "delivery_failed");
    assert.deepEqual(calls[2], {
      type: "deliverHandoff",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        handoffId: "lgahand_route_1",
        requestedBy: "weixin_stephen"
      }
    });

    const deniedCreate = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", digest_id: "lgadig_ready_1" })
    });
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).error.code, "growth_automation_action_handoff_owner_required");

    const deniedDeliver = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs/lgahand_route_1/deliver`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedDeliver.status, 403);
    assert.equal((await deniedDeliver.json()).error.code, "growth_automation_action_handoff_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/action-handoffs?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation scheduler execution routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace(input) {
        calls.push({ type: "authorizeWorkspace", input });
        return { ok: true, workspace_id: input.workspaceId || "weixin_fanfan" };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Owner", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationSchedulerExecutionService: {
      listExecutions(input) {
        calls.push({ type: "listSchedulerExecutions", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          executions: [{
            executionId: "lgasexec_route_1",
            workspaceId: input.workspaceId,
            proposalId: input.proposalId,
            status: "published"
          }]
        };
      },
      async executeOnce(input) {
        calls.push({ type: "executeSchedulerOnce", input });
        return {
          ok: true,
          execution: {
            executionId: input.executionId,
            workspaceId: input.workspaceId,
            proposalId: input.proposalId,
            handoffId: input.handoffId,
            status: "published"
          },
          publishResult: {
            ok: true,
            proposal: { execution: { status: "published" } }
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/executions?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&handoffId=lgahand_ready_1&digestId=lgadig_ready_1&proposalId=lgauto_ready_1&status=published&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).executions[0].executionId, "lgasexec_route_1");
    assert.deepEqual(calls[0], {
      type: "listSchedulerExecutions",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        handoffId: "lgahand_ready_1",
        digestId: "lgadig_ready_1",
        proposalId: "lgauto_ready_1",
        status: "published",
        limit: "5"
      }
    });

    const executed = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/execute-once`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        handoff_id: "lgahand_ready_1",
        digest_id: "lgadig_ready_1",
        policy_id: "lgafpol_active_1",
        collection_run_id: "lgacrn_route_1",
        proposal_id: "lgauto_ready_1",
        plan_draft_id: "lgplan_next_1",
        selected_item_id: "plan_item_next_1",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        execution_id: "lgasexec_route_1",
        execution_mode: "owner_explicit_once",
        generation_key: "owner-explicit-scheduler-execution",
        activation_gates: ["writeful_execution"],
        activation_record_limit: 3
      })
    });
    assert.equal(executed.status, 201);
    assert.equal((await executed.json()).execution.status, "published");
    assert.deepEqual(calls[2], {
      type: "executeSchedulerOnce",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        handoffId: "lgahand_ready_1",
        digestId: "lgadig_ready_1",
        policyId: "lgafpol_active_1",
        collectionRunId: "lgacrn_route_1",
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next_1",
        selectedItemId: "plan_item_next_1",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        executionId: "lgasexec_route_1",
        executionMode: "owner_explicit_once",
        generationKey: "owner-explicit-scheduler-execution",
        cardSchemaVersion: undefined,
        activationGates: ["writeful_execution"],
        requiredApprovalKeys: undefined,
        activationRecordLimit: 3,
        limit: undefined,
        requestedBy: "weixin_stephen",
        createdAt: undefined,
        startedAt: undefined,
        executedAt: undefined
      }
    });

    const deniedExecute = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/execute-once`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", handoff_id: "lgahand_ready_1", proposal_id: "lgauto_ready_1" })
    });
    assert.equal(deniedExecute.status, 403);
    assert.equal((await deniedExecute.json()).error.code, "growth_automation_scheduler_execution_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/executions?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation scheduler run routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace(input) {
        calls.push({ type: "authorizeWorkspace", input });
        return { ok: true, workspace_id: input.workspaceId || "weixin_fanfan" };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Owner", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationSchedulerRunService: {
      listRuns(input) {
        calls.push({ type: "listSchedulerRuns", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          runs: [{
            runId: "lgasrun_route_1",
            workspaceId: input.workspaceId,
            status: "blocked"
          }]
        };
      },
      async runOnce(input) {
        calls.push({ type: "runSchedulerOnce", input });
        return {
          ok: true,
          backgroundSchedulerEnabled: true,
          run: {
            runId: input.runId,
            workspaceId: input.workspaceId,
            status: "completed"
          },
          executions: []
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/runs?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&status=blocked&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).runs[0].runId, "lgasrun_route_1");
    assert.deepEqual(calls[0], {
      type: "listSchedulerRuns",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "blocked",
        limit: "5"
      }
    });

    const ran = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/run-once`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        run_id: "lgasrun_route_1",
        run_mode: "background_supervised_tick",
        generation_key: "background-supervised-tick",
        card_schema_version: "growth.card.v1",
        limit: 5
      })
    });
    assert.equal(ran.status, 202);
    assert.equal((await ran.json()).run.status, "completed");
    assert.deepEqual(calls[2], {
      type: "runSchedulerOnce",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        runId: "lgasrun_route_1",
        runMode: "background_supervised_tick",
        generationKey: "background-supervised-tick",
        cardSchemaVersion: "growth.card.v1",
        limit: 5,
        requestedBy: "weixin_stephen",
        createdAt: undefined,
        startedAt: undefined,
        executedAt: undefined,
        updatedAt: undefined
      }
    });

    const deniedRun = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/run-once`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", run_id: "lgasrun_denied_1" })
    });
    assert.equal(deniedRun.status, 403);
    assert.equal((await deniedRun.json()).error.code, "growth_automation_scheduler_run_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/runs?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation scheduler worker target routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace(input) {
        calls.push({ type: "authorizeWorkspace", input });
        return { ok: true, workspace_id: input.workspaceId || "weixin_fanfan" };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Owner", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationSchedulerWorkerTargetService: {
      listTargets(input) {
        calls.push({ type: "listWorkerTargets", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          count: 1,
          targets: [{
            targetId: "lgastgt_route_1",
            workspaceId: input.workspaceId,
            status: "enabled"
          }]
        };
      },
      createTarget(input) {
        calls.push({ type: "createWorkerTarget", input });
        return {
          ok: true,
          duplicate: false,
          target: {
            targetId: "lgastgt_route_1",
            workspaceId: input.workspaceId,
            status: "proposed"
          }
        };
      },
      reviewTarget(input) {
        calls.push({ type: "reviewWorkerTarget", input });
        return {
          ok: true,
          target: {
            targetId: input.targetId,
            workspaceId: input.workspaceId,
            status: input.status
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/worker-targets?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&status=enabled&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).targets[0].targetId, "lgastgt_route_1");
    assert.deepEqual(calls[0], {
      type: "listWorkerTargets",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "enabled",
        limit: "5"
      }
    });

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/worker-targets`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        target_node_ids: ["kg_science_fair_test"],
        limit: 3
      })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).target.status, "proposed");
    assert.deepEqual(calls[2], {
      type: "createWorkerTarget",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        targetNodeIds: ["kg_science_fair_test"],
        policy: undefined,
        limit: 3,
        requestedBy: "weixin_stephen"
      }
    });

    const reviewed = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/worker-targets/lgastgt_route_1/review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        status: "enabled",
        reason: "owner_reviewed_target_scope"
      })
    });
    assert.equal(reviewed.status, 200);
    assert.equal((await reviewed.json()).target.status, "enabled");
    assert.deepEqual(calls[4], {
      type: "reviewWorkerTarget",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        targetId: "lgastgt_route_1",
        status: "enabled",
        reason: "owner_reviewed_target_scope",
        reviewedBy: "weixin_stephen",
        reviewedAt: undefined
      }
    });

    const deniedCreate = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/worker-targets`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).error.code, "growth_automation_scheduler_worker_target_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/scheduler/worker-targets?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release readiness routes are visible-target scoped and snapshot writes are Owner-only", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets({ actorRole, currentWorkspaceId }) {
        return {
          ok: true,
          viewer: { role: actorRole },
          current_workspace_id: currentWorkspaceId,
          targets: actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: currentWorkspaceId === "weixin_stephen" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: currentWorkspaceId, label: currentWorkspaceId, current: true }]
        };
      },
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Denied");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { hermes_workspace_id: "weixin_stephen" };
      }
    },
    learningAutomationReleaseReadinessService: {
      evaluateReadiness(input) {
        calls.push({ type: "evaluateReadiness", input });
        return {
          ok: true,
          status: "incomplete",
          summary: {
            readyForReleaseReview: false,
            writefulSchedulingAllowed: false
          },
          checks: [{ key: "owner_daily_ui_evidence", status: "pass" }]
        };
      },
      listSnapshots(input) {
        calls.push({ type: "listReadinessSnapshots", input });
        return {
          ok: true,
          count: 1,
          snapshots: [{
            readinessId: "lgarel_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "incomplete"
          }]
        };
      },
      createSnapshot(input) {
        calls.push({ type: "createReadinessSnapshot", input });
        return {
          ok: true,
          duplicate: false,
          snapshot: {
            readinessId: "lgarel_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "ready_for_release_review",
            summary: { writefulSchedulingAllowed: false }
          }
        };
      }
    },
    learningAutomationReleaseApprovalService: {
      listApprovals(input) {
        calls.push({ type: "listReleaseApprovals", input });
        return {
          ok: true,
          count: 1,
          approvals: [{
            approvalId: "lgarap_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            approvalKey: input.approvalKey || "writefulExecutionApproval",
            status: "approved"
          }]
        };
      },
      recordApproval(input) {
        calls.push({ type: "recordReleaseApproval", input });
        return {
          ok: true,
          duplicate: false,
          approval: {
            approvalId: "lgarap_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            approvalKey: input.approvalKey,
            status: "approved",
            writefulSchedulingAllowed: false
          }
        };
      }
    },
    learningAutomationReleaseEvidenceService: {
      listEvidence(input) {
        calls.push({ type: "listReleaseEvidence", input });
        return {
          ok: true,
          count: 1,
          evidence: [{
            evidenceRecordId: "lgarev_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            evidenceKey: input.evidenceKey || "ownerDailyUiEvidence",
            checkKey: input.checkKey || "owner_daily_ui_evidence",
            status: input.status || "pass"
          }]
        };
      },
      recordEvidence(input) {
        calls.push({ type: "recordReleaseEvidence", input });
        return {
          ok: true,
          duplicate: false,
          evidence: {
            evidenceRecordId: "lgarev_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            evidenceKey: input.evidenceKey,
            checkKey: input.checkKey,
            status: input.status || "pass"
          }
        };
      }
    },
    learningAutomationReleaseCollectionRunService: {
      listRuns(input) {
        calls.push({ type: "listReleaseCollectionRuns", input });
        return {
          ok: true,
          count: 1,
          runs: [{
            runId: "lgacrn_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "ready_for_release_review"
          }]
        };
      },
      recordRun(input) {
        calls.push({ type: "recordReleaseCollectionRun", input });
        return {
          ok: true,
          duplicate: false,
          run: {
            runId: "lgacrn_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "ready_for_release_review",
            summary: { writefulSchedulingAllowed: false }
          }
        };
      }
    },
    learningAutomationReleaseDecisionService: {
      listDecisions(input) {
        calls.push({ type: "listReleaseDecisions", input });
        return {
          ok: true,
          count: 1,
          decisions: [{
            decisionId: "lgard_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            collectionRunId: input.collectionRunId || "lgacrn_route_1",
            status: input.status || "approved"
          }]
        };
      },
      recordDecision(input) {
        calls.push({ type: "recordReleaseDecision", input });
        return {
          ok: true,
          duplicate: false,
          decision: {
            decisionId: "lgard_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            collectionRunId: input.collectionRunId || input.releaseCollectionRun?.runId,
            status: input.status,
            decision: {
              writefulSchedulingAllowed: false
            }
          }
        };
      }
    },
    learningAutomationReleasePackageService: {
      listPackages(input) {
        calls.push({ type: "listReleasePackages", input });
        return {
          ok: true,
          count: 1,
          packages: [{
            packageId: "lgapkg_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            collectionRunId: input.collectionRunId || "lgacrn_route_1",
            status: input.status || "blocked"
          }]
        };
      },
      recordPackage(input) {
        calls.push({ type: "recordReleasePackage", input });
        return {
          ok: true,
          duplicate: false,
          package: {
            packageId: "lgapkg_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            collectionRunId: input.collectionRunId || input.releasePackage?.summary?.collectionRunId,
            status: input.status || input.releasePackage?.status || "blocked",
            packageSummary: {
              writefulSchedulingAllowed: false
            }
          }
        };
      }
    },
    learningAutomationReleasePackageBuildService: {
      buildPackage(input) {
        calls.push({ type: "buildReleasePackage", input });
        return {
          ok: false,
          source: "growth-learning-automation-release-package-service",
          package: {
            schemaVersion: "growth.learningAutomationReleasePackage.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            domainPackId: input.domainPackId,
            domain: input.domain,
            subject: input.subject,
            horizon: input.horizon,
            status: "blocked",
            summary: {
              schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
              summaryOnly: true,
              stepCount: 6,
              blockedCount: 1,
              writefulSchedulingAllowed: false
            },
            steps: [{
              key: "release_evidence_bundle",
              status: "blocked",
              summaryOnly: true,
              writefulSchedulingAllowed: false
            }],
            artifacts: {
              releaseEvidenceBundle: { summaryOnly: true },
              releaseReadiness: { summaryOnly: true }
            },
            writefulSchedulingAllowed: false,
            runtimeConfigChange: false,
            configChangeApplied: false
          },
          summary: {
            summaryOnly: true,
            status: "blocked",
            writefulSchedulingAllowed: false
          }
        };
      }
    },
    learningAutomationReleaseReviewService: {
      review(input) {
        calls.push({ type: "releaseReview", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseReview.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "ready_for_owner_decision",
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false
        };
      }
    },
    learningAutomationReleaseAuthorizationService: {
      authorize(input) {
        calls.push({ type: "releaseAuthorization", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseAuthorization.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "blocked",
          authorized: false,
          requiredApprovalKeys: input.requiredApprovalKeys || ["writefulExecutionApproval"],
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false
        };
      }
    },
    learningAutomationReleaseClosureService: {
      summarize(input) {
        calls.push({ type: "releaseClosure", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseClosure.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "approval_required",
          backendEvidenceComplete: false,
          releaseClosure: {
            requiredActionCount: 1,
            missingApprovalKeys: input.requiredApprovalKeys || ["writefulExecutionApproval"]
          },
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false
        };
      }
    },
    learningAutomationReleaseActivationService: {
      preflight(input) {
        calls.push({ type: "releaseActivation", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseActivation.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "ready_for_owner_config_enablement",
          preflightPassed: true,
          requestedActivationGates: input.activationGates || ["writeful_execution"],
          requiredApprovalKeys: input.requiredApprovalKeys || ["writefulExecutionApproval"],
          activationPreflight: {
            requiredActionCount: 1,
            nextAction: {
              key: "enable_automation_runtime_config",
              action: "enable_runtime_config_gates_after_owner_decision",
              requiredActor: "owner"
            }
          },
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false,
          configChangeApplied: false
        };
      },
      listActivations(input) {
        calls.push({ type: "listReleaseActivations", input });
        return {
          ok: true,
          count: 1,
          activations: [{
            activationId: "lgaract_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: input.status || "ready_for_owner_config_enablement",
            configChangeApplied: false,
            writefulSchedulingAllowed: false,
            runtimeConfigChange: false
          }]
        };
      },
      recordActivation(input) {
        calls.push({ type: "recordReleaseActivation", input });
        return {
          ok: true,
          duplicate: false,
          activation: {
            activationId: "lgaract_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "ready_for_owner_config_enablement",
            activationPreflight: {
              configChangeApplied: false,
              writefulSchedulingAllowed: false,
              runtimeConfigChange: false
            },
            writefulSchedulingAllowed: false,
            runtimeConfigChange: false,
            configChangeApplied: false
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const readiness = await fetch(`${baseUrl}/api/v1/growth/automation/release-readiness?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&owner_daily_ui_evidence=true&writeful_execution_approval=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(readiness.status, 200);
    assert.equal((await readiness.json()).summary.writefulSchedulingAllowed, false);
    assert.deepEqual(calls[0], {
      type: "evaluateReadiness",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "",
        limit: "",
        evidence: {
          ownerDailyUiEvidence: true,
          ownerAuditUiEvidence: false,
          stageCheckpointEvidence: false,
          stageCheckpointControlsEvidence: false,
          proposalReviewUiEvidence: false,
          productionPlannerReadinessEvidence: false,
          platformActionEvidence: false,
          centralVisualEvidence: false,
          releaseWorkbenchSmokeEvidence: false,
          ownerReviewEvidence: false
        },
        releaseApproval: {
          writefulExecutionApproval: true,
          backgroundSchedulerApproval: undefined,
          backgroundWorkerApproval: undefined
        }
      }
    });

    const approvalList = await fetch(`${baseUrl}/api/v1/growth/automation/release-approvals?workspaceId=growth:weixin_fanfan&learnerId=fanfan&approvalKey=writeful_execution&status=approved&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(approvalList.status, 200);
    assert.equal((await approvalList.json()).approvals[0].approvalId, "lgarap_route_1");
    assert.deepEqual(calls[1], {
      type: "listReleaseApprovals",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        approvalKey: "writeful_execution",
        status: "approved",
        limit: "5"
      }
    });

    const snapshotList = await fetch(`${baseUrl}/api/v1/growth/automation/release-readiness/snapshots?workspaceId=growth:weixin_fanfan&learnerId=fanfan&status=incomplete&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(snapshotList.status, 200);
    assert.equal((await snapshotList.json()).snapshots[0].readinessId, "lgarel_route_1");
    assert.deepEqual(calls[2], {
      type: "listReadinessSnapshots",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        status: "incomplete",
        limit: "5"
      }
    });

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/release-readiness/snapshots`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        evidence: {
          ownerDailyUiEvidence: { ok: true }
        },
        release_approval: {
          writeful_execution_approval: { approved: true }
        },
        created_at: "2026-06-15T16:45:00.000Z"
      })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).snapshot.readinessId, "lgarel_route_1");
    assert.deepEqual(calls[3], {
      type: "createReadinessSnapshot",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        evidence: {
          ownerDailyUiEvidence: { ok: true },
          ownerAuditUiEvidence: undefined,
          stageCheckpointEvidence: undefined,
          stageCheckpointControlsEvidence: undefined,
          proposalReviewUiEvidence: undefined,
          productionPlannerReadinessEvidence: undefined,
          platformActionEvidence: undefined,
          centralVisualEvidence: undefined,
          releaseWorkbenchSmokeEvidence: undefined,
          ownerReviewEvidence: undefined
        },
        releaseApproval: {
          writeful_execution_approval: { approved: true },
          writefulExecutionApproval: { approved: true },
          backgroundSchedulerApproval: undefined,
          backgroundWorkerApproval: undefined
        },
        limit: undefined,
        requestedBy: "weixin_stephen",
        createdAt: "2026-06-15T16:45:00.000Z"
      }
    });

    const approvalCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-approvals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        approval_key: "writeful_execution",
        evidence: { evidenceId: "release_evidence_1" },
        approved_at: "2026-06-15T16:55:00.000Z"
      })
    });
    assert.equal(approvalCreated.status, 201);
    assert.equal((await approvalCreated.json()).approval.approvalId, "lgarap_route_1");
    assert.deepEqual(calls[4], {
      type: "recordReleaseApproval",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        approvalKey: "writeful_execution",
        approvalVersion: undefined,
        approval: undefined,
        evidence: { evidenceId: "release_evidence_1" },
        note: undefined,
        requestedBy: "weixin_stephen",
        approvedBy: "weixin_stephen",
        approvedAt: "2026-06-15T16:55:00.000Z",
        createdAt: undefined
      }
    });

    const collectionList = await fetch(`${baseUrl}/api/v1/growth/automation/release-collection-runs?workspaceId=growth:weixin_fanfan&learnerId=fanfan&status=ready_for_release_review&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(collectionList.status, 200);
    assert.equal((await collectionList.json()).runs[0].runId, "lgacrn_route_1");
    assert.deepEqual(calls[5], {
      type: "listReleaseCollectionRuns",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        status: "ready_for_release_review",
        limit: "5"
      }
    });

    const collectionCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-collection-runs`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        release_evidence_bundle: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
          summaryOnly: true
        },
        release_evidence_bundle_audit: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
          summaryOnly: true
        },
        release_readiness: {
          status: "ready_for_release_review"
        },
        release_evidence_bundle_file: "/tmp/release-bundle.json",
        release_evidence_bundle_audit_file: "/tmp/release-audit.json",
        release_readiness_file: "/tmp/release-readiness.json",
        created_at: "2026-06-15T17:05:00.000Z"
      })
    });
    assert.equal(collectionCreated.status, 201);
    assert.equal((await collectionCreated.json()).run.runId, "lgacrn_route_1");
    assert.deepEqual(calls[6], {
      type: "recordReleaseCollectionRun",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        releaseEvidenceBundle: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
          summaryOnly: true
        },
        releaseEvidenceBundleAudit: {
          schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
          summaryOnly: true
        },
        releaseReadiness: {
          status: "ready_for_release_review"
        },
        releaseEvidenceBundleFile: "/tmp/release-bundle.json",
        releaseEvidenceBundleAuditFile: "/tmp/release-audit.json",
        releaseReadinessFile: "/tmp/release-readiness.json",
        requestedBy: "weixin_stephen",
        createdBy: "weixin_stephen",
        createdAt: "2026-06-15T17:05:00.000Z"
      }
    });

    const decisionList = await fetch(`${baseUrl}/api/v1/growth/automation/release-decisions?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&status=approved&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(decisionList.status, 200);
    assert.equal((await decisionList.json()).decisions[0].decisionId, "lgard_route_1");
    assert.deepEqual(calls[7], {
      type: "listReleaseDecisions",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "approved",
        limit: "5"
      }
    });

    const decisionCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-decisions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        status: "approved",
        release_collection_run: {
          schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
          summaryOnly: true,
          privacyClass: "summary_only",
          runId: "lgacrn_route_1",
          status: "ready_for_release_review"
        },
        release_collection_run_file: "/tmp/collection-run.json",
        decided_at: "2026-06-15T17:15:00.000Z"
      })
    });
    assert.equal(decisionCreated.status, 201);
    assert.equal((await decisionCreated.json()).decision.decisionId, "lgard_route_1");
    assert.deepEqual(calls[8], {
      type: "recordReleaseDecision",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collectionRunId: undefined,
        status: "approved",
        releaseCollectionRun: {
          schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
          summaryOnly: true,
          privacyClass: "summary_only",
          runId: "lgacrn_route_1",
          status: "ready_for_release_review"
        },
        releaseCollectionRunFile: "/tmp/collection-run.json",
        releaseDecision: undefined,
        note: undefined,
        requestedBy: "weixin_stephen",
        decidedBy: "weixin_stephen",
        decidedAt: "2026-06-15T17:15:00.000Z",
        createdAt: undefined
      }
    });

    const releaseReview = await fetch(`${baseUrl}/api/v1/growth/automation/release-review?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&owner_daily_ui_evidence=true&scheduler_run_ui_evidence=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(releaseReview.status, 200);
    assert.equal((await releaseReview.json()).schemaVersion, "growth.learningAutomationReleaseReview.v1");
    assert.deepEqual(calls[9], {
      type: "releaseReview",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "",
        ownerDailyUiEvidence: true,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: false,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: true,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
      }
    });

    const releaseAuthorization = await fetch(`${baseUrl}/api/v1/growth/automation/release-authorization?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&requiredApprovalKey=writefulExecutionApproval&owner_daily_ui_evidence=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(releaseAuthorization.status, 200);
    assert.equal((await releaseAuthorization.json()).schemaVersion, "growth.learningAutomationReleaseAuthorization.v1");
    assert.deepEqual(calls[10], {
      type: "releaseAuthorization",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "",
        ownerDailyUiEvidence: true,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: false,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: ["writefulExecutionApproval"]
      }
    });

    const releaseClosure = await fetch(`${baseUrl}/api/v1/growth/automation/release-closure?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&requiredApprovalKeys=writefulExecutionApproval,backgroundSchedulerApproval&automation_digest_ui_evidence=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(releaseClosure.status, 200);
    assert.equal((await releaseClosure.json()).schemaVersion, "growth.learningAutomationReleaseClosure.v1");
    assert.deepEqual(calls[11], {
      type: "releaseClosure",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "",
        ownerDailyUiEvidence: false,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: true,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: ["writefulExecutionApproval", "backgroundSchedulerApproval"]
      }
    });

    const releaseActivation = await fetch(`${baseUrl}/api/v1/growth/automation/release-activation?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution,background_scheduler&requiredApprovalKey=backgroundWorkerApproval&automation_digest_ui_evidence=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(releaseActivation.status, 200);
    assert.equal((await releaseActivation.json()).schemaVersion, "growth.learningAutomationReleaseActivation.v1");
    assert.deepEqual(calls[12], {
      type: "releaseActivation",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "",
        ownerDailyUiEvidence: false,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: true,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: ["backgroundWorkerApproval"],
        activationGates: ["writeful_execution", "background_scheduler"]
      }
    });

    const activationList = await fetch(`${baseUrl}/api/v1/growth/automation/release-activations?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&status=ready_for_owner_config_enablement&activationGate=writeful_execution&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(activationList.status, 200);
    assert.equal((await activationList.json()).activations[0].activationId, "lgaract_route_1");
    assert.deepEqual(calls[13], {
      type: "listReleaseActivations",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "ready_for_owner_config_enablement",
        limit: "5",
        ownerDailyUiEvidence: false,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: false,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: undefined,
        activationGates: ["writeful_execution"]
      }
    });

    const activationCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-activations`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collection_run_id: "lgacrn_route_1",
        activation_gates: ["writeful_execution", "background_scheduler"],
        required_approval_key: "backgroundWorkerApproval",
        automation_digest_ui_evidence: true,
        activation_decision: {
          decision: "approved_for_config_enablement"
        },
        note: "Owner reviewed activation preflight.",
        recorded_at: "2026-06-16T09:20:00.000Z"
      })
    });
    assert.equal(activationCreated.status, 201);
    assert.equal((await activationCreated.json()).activation.activationId, "lgaract_route_1");
    assert.deepEqual(calls[14], {
      type: "recordReleaseActivation",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collectionRunId: "lgacrn_route_1",
        status: undefined,
        activationGate: undefined,
        activationGates: ["writeful_execution", "background_scheduler"],
        requiredApprovalKeys: "backgroundWorkerApproval",
        ownerDailyUiEvidence: undefined,
        ownerAuditUiEvidence: undefined,
        stageCheckpointEvidence: undefined,
        stageCheckpointControlsEvidence: undefined,
        proposalReviewUiEvidence: undefined,
        automationDigestUiEvidence: true,
        automationActionHandoffUiEvidence: undefined,
        schedulerExecutionUiEvidence: undefined,
        schedulerRunUiEvidence: undefined,
        schedulerWorkerTargetUiEvidence: undefined,
        releaseWorkbenchSmokeEvidence: undefined,
        ownerReviewEvidence: undefined,
        activationDecision: {
          decision: "approved_for_config_enablement"
        },
        evidence: undefined,
        note: "Owner reviewed activation preflight.",
        requestedBy: "weixin_stephen",
        recordedBy: "weixin_stephen",
        recordedAt: "2026-06-16T09:20:00.000Z",
        createdAt: undefined
      }
    });

    const packageList = await fetch(`${baseUrl}/api/v1/growth/automation/release-packages?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&status=blocked&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(packageList.status, 200);
    assert.equal((await packageList.json()).packages[0].packageId, "lgapkg_route_1");
    assert.deepEqual(calls[15], {
      type: "listReleasePackages",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "blocked",
        limit: "5"
      }
    });

    const packageCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-packages`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        release_package: {
          schemaVersion: "growth.learningAutomationReleasePackage.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          status: "blocked",
          summary: {
            schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
            summaryOnly: true,
            collectionRunId: "lgacrn_route_1",
            writefulSchedulingAllowed: false
          },
          steps: [],
          artifacts: {}
        },
        created_at: "2026-06-16T09:30:00.000Z"
      })
    });
    assert.equal(packageCreated.status, 201);
    assert.equal((await packageCreated.json()).package.packageId, "lgapkg_route_1");
    assert.deepEqual(calls[16], {
      type: "recordReleasePackage",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        packageId: undefined,
        collectionRunId: undefined,
        status: undefined,
        releasePackage: {
          schemaVersion: "growth.learningAutomationReleasePackage.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          status: "blocked",
          summary: {
            schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
            summaryOnly: true,
            collectionRunId: "lgacrn_route_1",
            writefulSchedulingAllowed: false
          },
          steps: [],
          artifacts: {}
        },
        requestedBy: "weixin_stephen",
        createdBy: "weixin_stephen",
        createdAt: "2026-06-16T09:30:00.000Z",
        ownerAuthorizedWrite: true
      }
    });

    const evidenceList = await fetch(`${baseUrl}/api/v1/growth/automation/release-evidence?workspaceId=growth:weixin_fanfan&learnerId=fanfan&evidenceKey=owner_daily_ui_evidence&status=pass&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(evidenceList.status, 200);
    assert.equal((await evidenceList.json()).evidence[0].evidenceRecordId, "lgarev_route_1");
    assert.deepEqual(calls[17], {
      type: "listReleaseEvidence",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        evidenceKey: "owner_daily_ui_evidence",
        checkKey: "",
        status: "pass",
        limit: "5"
      }
    });

    const evidenceCreated = await fetch(`${baseUrl}/api/v1/growth/automation/release-evidence`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        evidence_key: "owner_daily_ui_evidence",
        status: "pass",
        evidence: { evidenceId: "owner_daily_ui_1", source: "owner_visual_harness" },
        observed_at: "2026-06-16T10:10:00.000Z"
      })
    });
    assert.equal(evidenceCreated.status, 201);
    assert.equal((await evidenceCreated.json()).evidence.evidenceRecordId, "lgarev_route_1");
    assert.deepEqual(calls[18], {
      type: "recordReleaseEvidence",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        evidenceKey: "owner_daily_ui_evidence",
        checkKey: undefined,
        status: "pass",
        evidenceVersion: undefined,
        evidence: { evidenceId: "owner_daily_ui_1", source: "owner_visual_harness" },
        note: undefined,
        requestedBy: "weixin_stephen",
        recordedBy: "weixin_stephen",
        observedAt: "2026-06-16T10:10:00.000Z",
        createdAt: undefined
      }
    });

    const packageBuild = await fetch(`${baseUrl}/api/v1/growth/automation/release-packages/build`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        tasks: ["planner_readiness", "scheduler_dry_run"],
        required_task_ids: "planner_readiness,scheduler_dry_run",
        activation_gates: "writeful_execution",
        required_approval_keys: ["writefulExecutionApproval"],
        owner_daily_ui_evidence: true,
        scheduler_worker_target_ui_evidence: true,
        created_at: "2026-06-16T10:20:00.000Z"
      })
    });
    assert.equal(packageBuild.status, 200);
    const packageBuildBody = await packageBuild.json();
    assert.equal(packageBuildBody.package.schemaVersion, "growth.learningAutomationReleasePackage.v1");
    assert.equal(packageBuildBody.package.status, "blocked");
    assert.equal(packageBuildBody.package.writefulSchedulingAllowed, false);
    assert.deepEqual(calls[19], {
      type: "buildReleasePackage",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        availableMinutes: undefined,
        targetNodeIds: [],
        tasks: ["planner_readiness", "scheduler_dry_run"],
        requiredTaskIds: ["planner_readiness", "scheduler_dry_run"],
        requiredApprovalKeys: ["writefulExecutionApproval"],
        activationGates: ["writeful_execution"],
        activationRecordLimit: undefined,
        runtimeEnablementRecordLimit: undefined,
        collectionRunId: undefined,
        taskCardId: undefined,
        planDraftId: undefined,
        evaluationId: undefined,
        profileDeltaId: undefined,
        evidenceId: undefined,
        correctionId: undefined,
        sourceId: undefined,
        learnerCycleOperation: undefined,
        dailyLoopWriteOperation: undefined,
        ownerDailyUiEvidence: true,
        ownerAuditUiEvidence: undefined,
        stageCheckpointEvidence: undefined,
        stageCheckpointControlsEvidence: undefined,
        proposalReviewUiEvidence: undefined,
        automationDigestUiEvidence: undefined,
        automationActionHandoffUiEvidence: undefined,
        schedulerExecutionUiEvidence: undefined,
        schedulerRunUiEvidence: undefined,
        schedulerWorkerTargetUiEvidence: true,
        releaseWorkbenchSmokeEvidence: undefined,
        ownerReviewEvidence: undefined,
        evidence: undefined,
        releaseApproval: {
          writefulExecutionApproval: undefined,
          backgroundSchedulerApproval: undefined,
          backgroundWorkerApproval: undefined
        },
        requestedBy: "weixin_stephen",
        createdBy: "weixin_stephen",
        createdAt: "2026-06-16T10:20:00.000Z",
        writeCollectionRun: false,
        writePackageRecord: false,
        allowWritePackage: false
      }
    });

    const deniedCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-readiness/snapshots`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).error.code, "growth_automation_release_readiness_owner_required");

    const deniedApprovalCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-approvals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", approval_key: "writeful_execution" })
    });
    assert.equal(deniedApprovalCreate.status, 403);
    assert.equal((await deniedApprovalCreate.json()).error.code, "growth_automation_release_approval_owner_required");

    const deniedEvidenceCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-evidence`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", evidence_key: "owner_daily_ui_evidence" })
    });
    assert.equal(deniedEvidenceCreate.status, 403);
    assert.equal((await deniedEvidenceCreate.json()).error.code, "growth_automation_release_evidence_owner_required");

    const deniedCollectionCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-collection-runs`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(deniedCollectionCreate.status, 403);
    assert.equal((await deniedCollectionCreate.json()).error.code, "growth_automation_release_collection_run_owner_required");

    const deniedDecisionCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-decisions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", collection_run_id: "lgacrn_route_1", status: "blocked" })
    });
    assert.equal(deniedDecisionCreate.status, 403);
    assert.equal((await deniedDecisionCreate.json()).error.code, "growth_automation_release_decision_owner_required");

    const deniedPackageCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-packages`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_stephen",
        release_package: {
          schemaVersion: "growth.learningAutomationReleasePackage.v1",
          privacyClass: "summary_only",
          summaryOnly: true
        }
      })
    });
    assert.equal(deniedPackageCreate.status, 403);
    assert.equal((await deniedPackageCreate.json()).error.code, "growth_automation_release_package_owner_required");

    const deniedPackageBuild = await fetch(`${baseUrl}/api/v1/growth/automation/release-packages/build`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_stephen",
        tasks: ["planner_readiness"]
      })
    });
    assert.equal(deniedPackageBuild.status, 403);
    assert.equal((await deniedPackageBuild.json()).error.code, "growth_automation_release_package_build_owner_required");

    const deniedActivationCreate = await fetch(`${baseUrl}/api/v1/growth/automation/release-activations`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", activation_gate: "writeful_execution" })
    });
    assert.equal(deniedActivationCreate.status, 403);
    assert.equal((await deniedActivationCreate.json()).error.code, "growth_automation_release_activation_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/release-readiness?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation runtime enablement routes are Owner-write and visible-target read", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationRuntimeEnablementService: {
      evaluate(input) {
        calls.push({ type: "runtimeEnablement", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationRuntimeEnablement.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "ready_for_manual_runtime_config_enablement",
          requestedActivationGates: input.activationGates || ["writeful_execution"],
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      },
      listEnablements(input) {
        calls.push({ type: "listRuntimeEnablements", input });
        return {
          ok: true,
          count: 1,
          enablements: [{
            enablementId: "lgrten_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: input.enablementStatus || input.status || "ready_for_manual_runtime_config_enablement",
            configChangeApplied: false,
            runtimeConfigChange: false,
            runtimeConfigMutationPerformed: false,
            writefulSchedulingAllowed: false
          }]
        };
      },
      recordEnablement(input) {
        calls.push({ type: "recordRuntimeEnablement", input });
        return {
          ok: true,
          duplicate: false,
          enablement: {
            enablementId: "lgrten_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "ready_for_manual_runtime_config_enablement",
            enablementDecision: {
              recordOnly: true,
              advisoryOnly: true,
              configChangeApplied: false,
              runtimeConfigChange: false,
              runtimeConfigMutationPerformed: false
            },
            configChangeApplied: false,
            runtimeConfigChange: false,
            runtimeConfigMutationPerformed: false,
            writefulSchedulingAllowed: false
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const evaluated = await fetch(`${baseUrl}/api/v1/growth/automation/runtime-enablement?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution,background_scheduler&activationRecordLimit=10`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(evaluated.status, 200);
    assert.equal((await evaluated.json()).schemaVersion, "growth.learningAutomationRuntimeEnablement.v1");
    assert.deepEqual(calls[0], {
      type: "runtimeEnablement",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "",
        ownerDailyUiEvidence: false,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: false,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: undefined,
        activationGates: ["writeful_execution", "background_scheduler"],
        enablementStatus: "",
        activationRecordLimit: "10",
        runtimeEnablementRecordLimit: ""
      }
    });

    const listed = await fetch(`${baseUrl}/api/v1/growth/automation/runtime-enablements?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&enablementStatus=ready_for_manual_runtime_config_enablement&activationGate=writeful_execution&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).enablements[0].enablementId, "lgrten_route_1");
    assert.deepEqual(calls[1], {
      type: "listRuntimeEnablements",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "",
        domainPackId: "",
        domain: "",
        subject: "",
        horizon: "",
        collectionRunId: "lgacrn_route_1",
        status: "",
        limit: "5",
        ownerDailyUiEvidence: false,
        ownerAuditUiEvidence: false,
        stageCheckpointEvidence: false,
        stageCheckpointControlsEvidence: false,
        proposalReviewUiEvidence: false,
        automationDigestUiEvidence: false,
        automationActionHandoffUiEvidence: false,
        schedulerExecutionUiEvidence: false,
        schedulerRunUiEvidence: false,
        schedulerWorkerTargetUiEvidence: false,
        releaseWorkbenchSmokeEvidence: false,
        ownerReviewEvidence: false,
        requiredApprovalKeys: undefined,
        activationGates: ["writeful_execution"],
        enablementStatus: "ready_for_manual_runtime_config_enablement",
        activationRecordLimit: "",
        runtimeEnablementRecordLimit: ""
      }
    });

    const created = await fetch(`${baseUrl}/api/v1/growth/automation/runtime-enablements`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collection_run_id: "lgacrn_route_1",
        activation_gates: ["writeful_execution"],
        enablement_decision: {
          decision: "ready_for_manual_runtime_config_enablement"
        },
        note: "Owner reviewed runtime enablement readback.",
        recorded_at: "2026-06-16T10:40:00.000Z"
      })
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).enablement.enablementId, "lgrten_route_1");
    assert.deepEqual(calls[2], {
      type: "recordRuntimeEnablement",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        collectionRunId: "lgacrn_route_1",
        status: undefined,
        activationGate: undefined,
        activationGates: ["writeful_execution"],
        activationRecordLimit: undefined,
        enablementDecision: {
          decision: "ready_for_manual_runtime_config_enablement"
        },
        evidence: undefined,
        note: "Owner reviewed runtime enablement readback.",
        requestedBy: "weixin_stephen",
        recordedBy: "weixin_stephen",
        recordedAt: "2026-06-16T10:40:00.000Z",
        createdAt: undefined
      }
    });

    const deniedCreate = await fetch(`${baseUrl}/api/v1/growth/automation/runtime-enablements`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen", activation_gate: "writeful_execution" })
    });
    assert.equal(deniedCreate.status, 403);
    assert.equal((await deniedCreate.json()).error.code, "growth_automation_runtime_enablement_owner_required");

    const deniedRead = await fetch(`${baseUrl}/api/v1/growth/automation/runtime-enablement?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(deniedRead.status, 403);
    assert.equal((await deniedRead.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release controls route is visible-target read only", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationReleaseControlsService: {
      summarize(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseControls.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "activation_record_required",
          releaseControls: {
            summaryOnly: true,
            status: "activation_record_required",
            requiredActionCount: 1
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/release-controls?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution,background_scheduler&requiredApprovalKey=writefulExecutionApproval&activationRecordLimit=10&runtimeEnablementRecordLimit=6&automation_digest_ui_evidence=true`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).schemaVersion, "growth.learningAutomationReleaseControls.v1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "",
      domainPackId: "",
      domain: "",
      subject: "",
      horizon: "",
      collectionRunId: "lgacrn_route_1",
      status: "",
      limit: "",
      ownerDailyUiEvidence: false,
      ownerAuditUiEvidence: false,
      stageCheckpointEvidence: false,
      stageCheckpointControlsEvidence: false,
      proposalReviewUiEvidence: false,
      automationDigestUiEvidence: true,
      automationActionHandoffUiEvidence: false,
      schedulerExecutionUiEvidence: false,
      schedulerRunUiEvidence: false,
      schedulerWorkerTargetUiEvidence: false,
      releaseWorkbenchSmokeEvidence: false,
      ownerReviewEvidence: false,
      requiredApprovalKeys: ["writefulExecutionApproval"],
      activationGates: ["writeful_execution", "background_scheduler"],
      enablementStatus: "",
      activationRecordLimit: "10",
      runtimeEnablementRecordLimit: "6"
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/release-controls?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release inventory route aggregates visible-target readback", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationReleaseInventoryService: {
      inventory(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseInventory.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "manual_runtime_config_required",
          releaseInventory: {
            schemaVersion: "growth.learningAutomationReleaseInventory.summary.v1",
            summaryOnly: true,
            status: "manual_runtime_config_required",
            latestCollectionRunId: input.collectionRunId,
            latestPackageId: "lgapkg_route_1"
          },
          artifactReadback: {
            summaryOnly: true
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/release-inventory?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution&requiredApprovalKey=writefulExecutionApproval&limit=4&runtimeEnablementRecordLimit=6`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, "growth.learningAutomationReleaseInventory.v1");
    assert.equal(body.releaseInventory.latestPackageId, "lgapkg_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "",
      domainPackId: "",
      domain: "",
      subject: "",
      horizon: "",
      collectionRunId: "lgacrn_route_1",
      status: "",
      limit: "4",
      ownerDailyUiEvidence: false,
      ownerAuditUiEvidence: false,
      stageCheckpointEvidence: false,
      stageCheckpointControlsEvidence: false,
      proposalReviewUiEvidence: false,
      automationDigestUiEvidence: false,
      automationActionHandoffUiEvidence: false,
      schedulerExecutionUiEvidence: false,
      schedulerRunUiEvidence: false,
      schedulerWorkerTargetUiEvidence: false,
      releaseWorkbenchSmokeEvidence: false,
      ownerReviewEvidence: false,
      requiredApprovalKeys: ["writefulExecutionApproval"],
      activationGates: ["writeful_execution"],
      enablementStatus: "",
      activationRecordLimit: "",
      runtimeEnablementRecordLimit: "6"
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/release-inventory?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release dashboard route aggregates visible-target release read model", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationReleaseDashboardService: {
      dashboard(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "manual_runtime_config_required",
          releaseDashboard: {
            schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
            summaryOnly: true,
            status: "manual_runtime_config_required",
            latestCollectionRunId: input.collectionRunId,
            latestPackageId: "lgapkg_route_1",
            requiredActionCount: 1
          },
          releaseInventory: {
            summaryOnly: true,
            artifactCount: 3
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/release-dashboard?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution&requiredApprovalKey=writefulExecutionApproval&limit=4&runtimeEnablementRecordLimit=6`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, "growth.learningAutomationReleaseDashboard.v1");
    assert.equal(body.releaseDashboard.latestPackageId, "lgapkg_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "",
      domainPackId: "",
      domain: "",
      subject: "",
      horizon: "",
      collectionRunId: "lgacrn_route_1",
      status: "",
      limit: "4",
      ownerDailyUiEvidence: false,
      ownerAuditUiEvidence: false,
      stageCheckpointEvidence: false,
      stageCheckpointControlsEvidence: false,
      proposalReviewUiEvidence: false,
      automationDigestUiEvidence: false,
      automationActionHandoffUiEvidence: false,
      schedulerExecutionUiEvidence: false,
      schedulerRunUiEvidence: false,
      schedulerWorkerTargetUiEvidence: false,
      releaseWorkbenchSmokeEvidence: false,
      ownerReviewEvidence: false,
      requiredApprovalKeys: ["writefulExecutionApproval"],
      activationGates: ["writeful_execution"],
      enablementStatus: "",
      activationRecordLimit: "",
      runtimeEnablementRecordLimit: "6"
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/release-dashboard?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation owner review evidence route returns visible-target summary read model", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationOwnerReviewEvidenceService: {
      evaluate(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationOwnerReviewEvidence.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "digest_review_required",
          automationOwnerReviewEvidence: {
            schemaVersion: "growth.learningAutomationOwnerReviewEvidence.summary.v1",
            summaryOnly: true,
            status: "digest_review_required",
            missingGateKeys: ["digest_owner_review_present"],
            requiredActionCount: 1
          },
          writefulSchedulingAllowed: false,
          backgroundSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/owner-review-evidence?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&recordLimit=4`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, "growth.learningAutomationOwnerReviewEvidence.v1");
    assert.equal(body.automationOwnerReviewEvidence.missingGateKeys[0], "digest_owner_review_present");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "",
      status: "",
      limit: "",
      ownerDailyUiEvidence: false,
      ownerAuditUiEvidence: false,
      stageCheckpointEvidence: false,
      stageCheckpointControlsEvidence: false,
      proposalReviewUiEvidence: false,
      automationDigestUiEvidence: false,
      automationActionHandoffUiEvidence: false,
      schedulerExecutionUiEvidence: false,
      schedulerRunUiEvidence: false,
      schedulerWorkerTargetUiEvidence: false,
      releaseWorkbenchSmokeEvidence: false,
      ownerReviewEvidence: false,
      requiredApprovalKeys: undefined,
      activationGates: undefined,
      enablementStatus: "",
      activationRecordLimit: "",
      runtimeEnablementRecordLimit: "",
      recordLimit: "4"
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/owner-review-evidence?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release workbench route returns visible-target Owner action read model", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationReleaseWorkbenchService: {
      workbench(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseWorkbench.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "manual_runtime_config_required",
          releaseWorkbench: {
            schemaVersion: "growth.learningAutomationReleaseWorkbench.summary.v1",
            summaryOnly: true,
            status: "manual_runtime_config_required",
            ownerActionCount: 1,
            ownerActions: [{
              endpointKey: "release_evidence",
              route: { method: "POST", path: "/api/v1/growth/automation/release-evidence" }
            }]
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/release-workbench?workspaceId=growth:weixin_fanfan&learnerId=fanfan&collectionRunId=lgacrn_route_1&activationGates=writeful_execution&requiredApprovalKey=writefulExecutionApproval&limit=4&runtimeEnablementRecordLimit=6`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.schemaVersion, "growth.learningAutomationReleaseWorkbench.v1");
    assert.equal(body.releaseWorkbench.ownerActionCount, 1);
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "",
      domainPackId: "",
      domain: "",
      subject: "",
      horizon: "",
      collectionRunId: "lgacrn_route_1",
      status: "",
      limit: "4",
      ownerDailyUiEvidence: false,
      ownerAuditUiEvidence: false,
      stageCheckpointEvidence: false,
      stageCheckpointControlsEvidence: false,
      proposalReviewUiEvidence: false,
      automationDigestUiEvidence: false,
      automationActionHandoffUiEvidence: false,
      schedulerExecutionUiEvidence: false,
      schedulerRunUiEvidence: false,
      schedulerWorkerTargetUiEvidence: false,
      releaseWorkbenchSmokeEvidence: false,
      ownerReviewEvidence: false,
      requiredApprovalKeys: ["writefulExecutionApproval"],
      activationGates: ["writeful_execution"],
      enablementStatus: "",
      activationRecordLimit: "",
      runtimeEnablementRecordLimit: "6"
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/release-workbench?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth automation release workbench action route is Owner-write and visible-target scoped", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_fanfan") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningAutomationReleaseWorkbenchActionService: {
      recordAction(input) {
        calls.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.v1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "recorded",
          endpointKey: input.endpointKey,
          actionRecord: {
            summaryOnly: true,
            endpointKey: input.endpointKey,
            recordId: "lgarev_route_1",
            recordStatus: "pass"
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/automation/release-workbench/actions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_fanfan"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        endpoint_key: "release_evidence",
        evidence_key: "owner_daily_ui_evidence",
        evidence: { evidenceId: "owner_daily_ui_1" },
        requested_by: "weixin_owner"
      })
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.schemaVersion, "growth.learningAutomationReleaseWorkbenchAction.v1");
    assert.equal(body.actionRecord.recordId, "lgarev_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      programId: "program_science",
      domainPackId: undefined,
      domain: undefined,
      subject: undefined,
      horizon: "daily_plan",
      collectionRunId: undefined,
      endpointKey: "release_evidence",
      actionKey: undefined,
      action: undefined,
      evidenceKey: "owner_daily_ui_evidence",
      approvalKey: undefined,
      activationGate: undefined,
      activationGates: undefined,
      releasePackage: undefined,
      activationDecision: undefined,
      enablementDecision: undefined,
      approval: undefined,
      evidence: { evidenceId: "owner_daily_ui_1" },
      note: undefined,
      requestedBy: "weixin_owner",
      recordedBy: "weixin_owner",
      approvedBy: "weixin_owner",
      recordedAt: undefined,
      approvedAt: undefined,
      createdAt: undefined,
      ownerAuthorizedWrite: true
    });

    const denied = await fetch(`${baseUrl}/api/v1/growth/automation/release-workbench/actions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_fanfan"
      },
      body: JSON.stringify({ workspace_id: "weixin_fanfan", endpoint_key: "release_evidence" })
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_automation_release_workbench_action_owner_required");
  } finally {
    await close(server);
  }
});

test("growth profile correction routes are Owner-only and limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "weixin_stephen") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: workspaceId };
      },
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningOwnerCorrectionService: {
      listCorrections(input) {
        calls.push({ type: "list", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          count: 1,
          corrections: [{
            correctionId: input.correctionId,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            targetNodeIds: input.targetNodeIds,
            privacyClass: "summary_only"
          }]
        };
      },
      recordCorrection(input) {
        calls.push({ type: "record", input });
        return {
          ok: true,
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          correctionId: "lgcorr_route_1",
          evidenceLedger: { duplicateCount: 0, evidenceCount: 1, entries: [] },
          correction: {
            correctionId: "lgcorr_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            privacyClass: "summary_only"
          }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const listResponse = await fetch(`${baseUrl}/api/v1/growth/profile-corrections?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&correctionId=lgcorr_route_1&targetNodeIds=kg_science_fair_test,kg_science_variables&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.equal(listBody.corrections[0].privacyClass, "summary_only");
    assert.deepEqual(calls[0], {
      type: "list",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        correctionId: "lgcorr_route_1",
        targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
        limit: "5"
      }
    });

    const accepted = await fetch(`${baseUrl}/api/v1/growth/profile-corrections`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "growth:weixin_fanfan",
        learnerId: "fanfan",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        subject: "science",
        targetNodeIds: ["kg_science_fair_test"],
        reviewAction: "mark_needs_repair",
        profileDeltaId: "lgpdelta_eval_1",
        evaluationId: "eval_1",
        taskCardId: "card_1",
        reason: "Bounded Owner note."
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).correction.correctionId, "lgcorr_route_1");
    assert.deepEqual(calls[1], {
      type: "record",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: undefined,
        subject: "science",
        targetNodeIds: ["kg_science_fair_test"],
        correctionId: undefined,
        reviewAction: "mark_needs_repair",
        status: undefined,
        confidence: undefined,
        evidenceWeight: undefined,
        reason: "Bounded Owner note.",
        note: undefined,
        profileDeltaId: "lgpdelta_eval_1",
        taskCardId: "card_1",
        evaluationId: "eval_1",
        sourceEvidenceIds: undefined,
        reviewedBy: "weixin_stephen",
        reviewedAt: undefined
      }
    });

    const memberList = await fetch(`${baseUrl}/api/v1/growth/profile-corrections?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberList.status, 403);
    assert.equal((await memberList.json()).error.code, "growth_target_not_visible");

    const memberPost = await fetch(`${baseUrl}/api/v1/growth/profile-corrections`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "growth:weixin_fanfan", targetNodeIds: ["kg_science_fair_test"] })
    });
    assert.equal(memberPost.status, 403);
    assert.equal((await memberPost.json()).error.code, "growth_profile_correction_owner_required");
  } finally {
    await close(server);
  }
});

test("growth read routes fall back to proxy workspace header", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({})
    },
    growthService: {
      async status(input) {
        calls.push({ type: "status", input });
        return { ok: true, workspace_id: input.workspaceId };
      },
      async board(input) {
        calls.push({ type: "board", input });
        return { ok: true, workspace_id: input.workspaceId, cards: [], lanes: [], summary: { total: 0 } };
      }
    }
  });
  const baseUrl = await listen(server);
  try {
    const headers = { "x-hermes-plugin-workspace-id": "weixin_stephen" };
    assert.equal((await fetch(`${baseUrl}/api/v1/growth/status`, { headers })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/v1/growth/board`, { headers })).status, 200);
    assert.deepEqual(calls, [
      { type: "status", input: { workspaceId: "weixin_stephen" } },
      { type: "board", input: { workspaceId: "weixin_stephen" } }
    ]);
  } finally {
    await close(server);
  }
});

test("growth MCP execute route requires workspace bearer", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthMcpExecutor: {
      async execute({ name, input }) {
        return { ok: true, content: [{ type: "text", text: JSON.stringify({ name, input }) }] };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "growth.get_status", input: { workspace_id: "growth:test" } })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "growth.get_status", input: { workspace_id: "growth:test" } })
    });
    assert.equal(accepted.status, 200);
    const payload = JSON.parse((await accepted.json()).content[0].text);
    assert.equal(payload.name, "growth.get_status");
    assert.equal(payload.input.workspace_id, "test");

    const override = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: "growth.get_status",
        workspace_id: "growth:test",
        input: { workspace_id: "growth:other" }
      })
    });
    assert.equal(override.status, 200);
    const overridePayload = JSON.parse((await override.json()).content[0].text);
    assert.equal(overridePayload.input.workspace_id, "test");
  } finally {
    await close(server);
  }
});

test("growth audio route streams plugin-owned audio evidence", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({})
    },
    growthService: {
      async audio({ workspaceId, recordType, recordId }) {
        assert.equal(workspaceId, "weixin_child");
        assert.equal(recordType, "submission");
        assert.equal(recordId, "submission_1");
        return {
          kind: "blob",
          name: "submission.ogg",
          mime: "audio/ogg",
          content: Buffer.from("audio-body")
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/audio/submissions/submission_1?workspaceId=weixin_child`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/ogg");
    assert.equal(await response.text(), "audio-body");
  } finally {
    await close(server);
  }
});

test("growth card submission route requires workspace bearer and queues plugin evaluation", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async submitEvidence(input) {
        calls.push(input);
        return {
          ok: true,
          workspace_id: input.workspaceId,
          task_card_id: input.taskCardId,
          submission: { submissionId: "submission_1" },
          evaluation_job: { status: "pending" }
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(accepted.status, 202);
    const body = await accepted.json();
    assert.equal(body.ok, true);
    assert.equal(body.evaluation_job.status, "pending");
    assert.equal(calls[0].workspaceId, "test");
    assert.equal(calls[0].taskCardId, "card_1");

    const tooLarge = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        dataBase64: "a".repeat(17 * 1024 * 1024)
      })
    });
    assert.equal(tooLarge.status, 413);
  } finally {
    await close(server);
  }
});

test("growth card reflection route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async submitReflection(input) {
        calls.push(input);
        return {
          ok: true,
          workspace_id: input.workspaceId,
          task_card_id: input.taskCardId,
          reflection: { reflectionId: "reflection_1", status: "submitted" }
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/reflections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/reflections`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).reflection.status, "submitted");
    assert.deepEqual(calls[0], {
      workspaceId: "test",
      taskCardId: "card_1",
      body: { workspace_id: "growth:test", text: "done" }
    });
  } finally {
    await close(server);
  }
});

test("growth experience signal route requires workspace bearer and delegates service write", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    learningExperienceSignalService: {
      recordSignal(input) {
        calls.push(input);
        return {
          ok: true,
          taskCardId: input.taskCardId,
          signalType: input.signalType,
          targetNodeIds: input.targetNodeIds,
          signals: [{ signalType: input.signalType, targetNodeId: input.targetNodeIds[0] }]
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/experience-signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", signalType: "too_hard", targetNodeIds: ["kg_main_idea"] })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/experience-signals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", signalType: "too_hard", targetNodeIds: ["kg_main_idea"] })
    });
    assert.equal(accepted.status, 202);
    const body = await accepted.json();
    assert.equal(body.ok, true);
    assert.equal(body.signals[0].targetNodeId, "kg_main_idea");
    assert.deepEqual(calls[0], {
      workspace_id: "growth:test",
      signalType: "too_hard",
      targetNodeIds: ["kg_main_idea"],
      workspaceId: "test",
      learnerId: "test",
      taskCardId: "card_1"
    });
  } finally {
    await close(server);
  }
});

test("growth evaluation process route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthEvaluationService: {
      async processEvaluationQueue(input) {
        calls.push(input);
        return { ok: true, processed: 1, results: [{ jobId: "job_1", ok: true, status: "completed" }] };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/evaluations/process`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/evaluations/process`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", limit: 2 })
    });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).processed, 1);
    assert.deepEqual(calls[0], { workspaceId: "test", limit: 2 });
  } finally {
    await close(server);
  }
});

test("growth evaluation owner-review route is Owner-only and delegates retry", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "owner") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "owner" };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole },
          targets: [
            { workspaceId: "owner", label: "Owner", current: true },
            { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
          ]
        };
      }
    },
    learningEvaluationOwnerReviewService: {
      retryFailedEvaluation(input) {
        calls.push(input);
        return { ok: true, action: "retry", job: { jobId: "job_1", status: "retry" } };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "weixin_fanfan", task_card_id: "card_1" })
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_evaluation_owner_required");

    const accepted = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        task_card_id: "card_1",
        reason: "retry after Gateway recovery"
      })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).job.status, "retry");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      taskCardId: "card_1",
      jobId: undefined,
      action: "retry",
      reason: "retry after Gateway recovery",
      reviewedBy: "owner"
    });

    const hidden = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({ workspace_id: "weixin_hidden", task_card_id: "card_1" })
    });
    assert.equal(hidden.status, 403);
    assert.equal((await hidden.json()).error.code, "growth_target_not_visible");
    assert.equal(calls.length, 1);
  } finally {
    await close(server);
  }
});

test("growth learning coin monthly clear route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async learningCoinBalance(input) {
        calls.push({ type: "balance", input });
        return { ok: true, workspace_id: input.workspaceId, available_coins: 100, currency: "learning_coin" };
      },
      async clearLearningCoinBalanceForMonthlyExchange(input) {
        calls.push({ type: "clear", input });
        return { ok: true, workspace_id: input.workspaceId, cleared_coins: 100, currency: "learning_coin" };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/learning-coins/balance?workspaceId=growth:test`);
    assert.equal(denied.status, 403);

    const balance = await fetch(`${baseUrl}/api/v1/growth/learning-coins/balance?workspaceId=growth:test`, {
      headers: { authorization: "Bearer workspace-key" }
    });
    assert.equal(balance.status, 200);
    assert.equal((await balance.json()).available_coins, 100);
    assert.deepEqual(calls[0], { type: "balance", input: { workspaceId: "test" } });

    const cleared = await fetch(`${baseUrl}/api/v1/growth/learning-coins/monthly-exchange-clear`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        period: "2026-06",
        idempotencyKey: "exchange:test:2026-06",
        write: true
      })
    });
    assert.equal(cleared.status, 200);
    assert.equal((await cleared.json()).cleared_coins, 100);
    assert.deepEqual(calls[1], {
      type: "clear",
      input: {
        workspaceId: "test",
        body: {
          workspace_id: "growth:test",
          period: "2026-06",
          idempotencyKey: "exchange:test:2026-06",
          write: true
        }
      }
    });
  } finally {
    await close(server);
  }
});

test("growth graph plan route requires workspace bearer and normalizes graph input", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    learningGraphPlanService: {
      async createPlan(input) {
        calls.push(input);
        return {
          ok: true,
          learningGraphPlanId: input.learningGraphPlanId,
          workspaceId: input.workspaceId,
          targetNodeId: input.targetNodeId,
          cardSequence: [{ cardRole: input.cardRole, targetNodeIds: input.targetNodeIds }]
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/graph/plans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learning_graph_plan_id: "lgp_1",
        target_node_id: "node_1",
        card_role: "stage_assessment"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/graph/plans`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "learner_1",
        learning_graph_plan_id: "lgp_1",
        program_id: "program_1",
        target_node_id: "node_1",
        target_node_ids: ["node_1", "node_2"],
        card_role: "stage_assessment",
        assessment_coverage_node_ids: ["node_1", "node_2"],
        difficulty_band: "bridge"
      })
    });
    assert.equal(accepted.status, 201);
    const body = await accepted.json();
    assert.equal(body.learningGraphPlanId, "lgp_1");
    assert.deepEqual(calls[0], {
      learningGraphPlanId: "lgp_1",
      learnerId: "learner_1",
      workspaceId: "test",
      programId: "program_1",
      targetNodeId: "node_1",
      targetNodeIds: ["node_1", "node_2"],
      cardRole: "stage_assessment",
      assessmentCoverageNodeIds: ["node_1", "node_2"],
      difficultyBand: "bridge"
    });
  } finally {
    await close(server);
  }
});

test("growth card graph-binding route requires workspace bearer and binds URL card id", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    learningCardGraphBindingService: {
      async bindCard(input) {
        calls.push(input);
        return {
          ok: input.learningGraphPlanId !== "missing",
          error: input.learningGraphPlanId === "missing" ? "missing_learning_graph_plan" : undefined,
          bindingId: input.bindingId,
          taskCardId: input.taskCardId,
          learningGraphPlanId: input.learningGraphPlanId
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learning_graph_plan_id: "lgp_1",
        node_ids: ["node_1"],
        card_role: "practice"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        binding_id: "lcgb_1",
        task_card_id: "card_body_should_not_win",
        learning_graph_plan_id: "lgp_1",
        node_ids: ["node_1"],
        card_role: "practice",
        assessment_coverage: ["node_1"],
        repair_metadata: { source: "route-test" }
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).taskCardId, "card_url");
    assert.deepEqual(calls[0], {
      bindingId: "lcgb_1",
      taskCardId: "card_url",
      workspaceId: "test",
      learningGraphPlanId: "lgp_1",
      nodeIds: ["node_1"],
      cardRole: "practice",
      assessmentCoverage: ["node_1"],
      repairMetadata: { source: "route-test" }
    });

    const failed = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        binding_id: "lcgb_missing",
        learning_graph_plan_id: "missing",
        node_ids: ["node_1"],
        card_role: "practice"
      })
    });
    assert.equal(failed.status, 400);
    assert.equal((await failed.json()).error, "missing_learning_graph_plan");
  } finally {
    await close(server);
  }
});

test("growth card generation route requires workspace bearer and normalizes graph plus authoring input", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key"
          && (workspaceId === "growth:test" || workspaceId === "owner");
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return {
          ok: true,
          workspace_id: workspaceId,
          hermes_workspace_id: workspaceId === "owner" ? "owner" : "test"
        };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: input.currentWorkspaceId === "owner" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCardGenerationService: {
      async generateCard(input) {
        calls.push(input);
        return {
          ok: input.targetNodeId !== "missing",
          error: input.targetNodeId === "missing" ? "missing_target_node" : undefined,
          published: { taskCardId: "generated_1" }
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        card_role: "teaching"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "learner_1",
        program_id: "program_1",
        recipe_id: "daily_english_v1",
        target_node_id: "node_1",
        card_role: "teaching",
        difficulty_band: "foundation",
        evidence_requirements: ["explain_ratio"],
        card_schema_version: "growth.card.authoring.v1",
        generation_key: "route-generation"
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).published.taskCardId, "generated_1");
    assert.deepEqual(calls[0], {
      learningGraphPlanId: undefined,
      learningGraphPlan: undefined,
      learnerId: "learner_1",
      workspaceId: "test",
      programId: "program_1",
      recipeId: "daily_english_v1",
      domainPackId: undefined,
      domain: undefined,
      subject: undefined,
      targetNodeId: "node_1",
      targetNodeIds: undefined,
      cardRole: "teaching",
      difficultyBand: "foundation",
      assessmentCoverageNodeIds: undefined,
      evidenceRequirements: ["explain_ratio"],
      sourceSummaries: undefined,
      cardSchemaVersion: "growth.card.authoring.v1",
      generationKey: "route-generation",
      taskCardId: undefined,
      stageAssessmentCycleId: undefined,
      activationState: undefined,
      activationReason: undefined,
      activationSource: undefined,
      cooldownUntil: undefined
    });

    const ownerProxyAccepted = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        recipe_id: "daily_english_v1",
        target_node_id: "node_1",
        card_role: "practice"
      })
    });
    assert.equal(ownerProxyAccepted.status, 201);
    assert.equal(calls[1].workspaceId, "weixin_fanfan");
    assert.equal(calls[1].learnerId, "fanfan");
    assert.equal(calls[1].recipeId, "daily_english_v1");

    const failed = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "missing",
        card_role: "teaching"
      })
    });
    assert.equal(failed.status, 400);
    assert.equal((await failed.json()).error, "missing_target_node");
  } finally {
    await close(server);
  }
});

test("growth learning plan draft and publish routes are scoped by visible target", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key"
          && workspaceId === "owner";
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return {
          ok: true,
          workspace_id: workspaceId,
          hermes_workspace_id: workspaceId
        };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: input.currentWorkspaceId === "owner" },
                { workspaceId: "weixin_stephen", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningPlanPublisherService: {
      async draftPlan(input) {
        calls.push({ type: "draft", input });
        return {
          ok: true,
          planDraft: {
            planDraftId: "lgplan_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            status: "draft"
          }
        };
      },
      async publishPlanItem(input) {
        calls.push({ type: "publish", input });
        return {
          ok: true,
          planDraft: {
            planDraftId: input.planDraftId,
            workspaceId: input.workspaceId,
            status: "published",
            generatedTaskCardId: "ltask_route_1"
          },
          generation: {
            published: { taskCardId: "ltask_route_1" }
          }
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/learning-plans/draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "weixin_stephen", subject: "science" })
    });
    assert.equal(denied.status, 403);

    const invisibleTargetDenied = await fetch(`${baseUrl}/api/v1/growth/learning-plans/draft`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({ workspace_id: "weixin_missing", subject: "science" })
    });
    assert.equal(invisibleTargetDenied.status, 403);
    assert.equal((await invisibleTargetDenied.json()).error.code, "growth_target_not_visible");

    const draft = await fetch(`${baseUrl}/api/v1/growth/learning-plans/draft`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_stephen",
        learner_id: "fanfan",
        subject: "science",
        horizon: "daily_plan",
        available_minutes: 15
      })
    });
    assert.equal(draft.status, 201);
    assert.equal((await draft.json()).planDraft.planDraftId, "lgplan_route_1");
    assert.deepEqual(calls[0], {
      type: "draft",
      input: {
        workspaceId: "weixin_stephen",
        learnerId: "fanfan",
        programId: undefined,
        horizon: "daily_plan",
        domain: undefined,
        subject: "science",
        availableMinutes: 15,
        allowedCardRoles: undefined,
        lowPressure: undefined,
        targetNodeId: undefined,
        targetNodeIds: undefined,
        domainPackId: undefined,
        requestedBy: "owner"
      }
    });

    const publish = await fetch(`${baseUrl}/api/v1/growth/learning-plans/lgplan_route_1/publish`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_stephen",
        item_id: "plan_item_science_1"
      })
    });
    assert.equal(publish.status, 201);
    assert.equal((await publish.json()).planDraft.generatedTaskCardId, "ltask_route_1");
    assert.deepEqual(calls[1], {
      type: "publish",
      input: {
        workspaceId: "weixin_stephen",
        learnerId: "weixin_stephen",
        planDraftId: "lgplan_route_1",
        itemId: "plan_item_science_1",
        generationKey: undefined,
        cardSchemaVersion: undefined,
        requestedBy: "owner"
      }
    });
  } finally {
    await close(server);
  }
});

test("growth domain-pack provision route is Owner-only and scoped by visible target", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key" && workspaceId === "owner";
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "owner" };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: true },
                { workspaceId: "weixin_alice", label: "Alice", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningTargetProvisioningService: {
      provisionDomainPack(input) {
        calls.push(input);
        return {
          ok: true,
          provision: {
            provisionId: "lgprov_route_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            domainPackId: input.domainPackId,
            subject: input.subject
          }
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const notOwner = await fetch(`${baseUrl}/api/v1/growth/domain-pack-provisions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "weixin_alice",
        domain_pack_id: "uk_hk_curriculum_foundation",
        subject: "science"
      })
    });
    assert.equal(notOwner.status, 403);
    assert.equal((await notOwner.json()).error.code, "growth_domain_pack_provision_owner_required");

    const invisibleTarget = await fetch(`${baseUrl}/api/v1/growth/domain-pack-provisions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_missing",
        domain_pack_id: "uk_hk_curriculum_foundation",
        subject: "science"
      })
    });
    assert.equal(invisibleTarget.status, 403);
    assert.equal((await invisibleTarget.json()).error.code, "growth_target_not_visible");

    const accepted = await fetch(`${baseUrl}/api/v1/growth/domain-pack-provisions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_alice",
        learner_id: "alice",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science"
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).provision.provisionId, "lgprov_route_1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_alice",
      learnerId: "alice",
      programId: undefined,
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      status: "active",
      source: "owner",
      requestedBy: "owner"
    });
  } finally {
    await close(server);
  }
});

test("growth stage assessment routes require workspace authorization and delegate policy to service", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key"
          && (workspaceId === "growth:test" || workspaceId === "owner");
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return {
          ok: true,
          workspace_id: workspaceId,
          hermes_workspace_id: workspaceId === "owner" ? "owner" : "test"
        };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: input.currentWorkspaceId === "owner" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningStageAssessmentService: {
      evaluateEligibility(input) {
        calls.push({ type: "eligibility", input });
        return { ok: true, eligible: true, cycle: { cycleId: "cycle_1", status: "eligible" } };
      },
      async activateStageAssessment(input) {
        calls.push({ type: "activate", input });
        return { ok: true, cycle: { cycleId: "cycle_1", status: "active" }, published: { taskCardId: "stage_1" } };
      }
    },
    learningStageCheckpointControlsService: {
      controls(input) {
        calls.push({ type: "controls", input });
        return {
          ok: true,
          schemaVersion: "growth.stageCheckpointControls.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          target: {
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            label: input.label
          },
          summary: {
            status: "ready_for_owner_activation",
            readyForOwnerActivation: true
          },
          actions: [{
            key: "activate_stage_assessment",
            enabled: true,
            route: {
              method: "POST",
              path: "/api/v1/growth/stage-assessments/activate"
            }
          }]
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/eligibility`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(denied.status, 403);

    const eligibility = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/eligibility`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "test",
        program_id: "program_1",
        subject_id: "english",
        capability_cluster_id: "reading",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1", "node_2"]
      })
    });
    assert.equal(eligibility.status, 200);
    assert.deepEqual(calls[0], {
      type: "eligibility",
      input: {
        cycleId: undefined,
        workspaceId: "test",
        learnerId: "test",
        programId: "program_1",
        subjectId: "english",
        capabilityClusterId: "reading",
        targetNodeId: "node_1",
        targetNodeIds: undefined,
        assessmentCoverageNodeIds: ["node_1", "node_2"],
        difficultyBand: undefined,
        evidenceRequirements: undefined,
        sourceSummaries: undefined,
        generationKey: undefined,
        taskCardId: undefined,
        activationSource: undefined,
        activationReason: undefined,
        cooldownUntil: undefined,
        sourceCardIds: undefined,
        note: undefined
      }
    });

    const ownerActivate = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/activate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"],
        activation_source: "owner_manual"
      })
    });
    assert.equal(ownerActivate.status, 201);
    assert.equal(calls[1].type, "activate");
    assert.equal(calls[1].input.workspaceId, "weixin_fanfan");
    assert.equal(calls[1].input.activationSource, "owner_manual");

    const deniedOwnerManual = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/activate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"],
        activation_source: "owner_manual"
      })
    });
    assert.equal(deniedOwnerManual.status, 403);
    assert.equal((await deniedOwnerManual.json()).error.code, "growth_stage_assessment_owner_required");

    const challengeOther = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/challenge`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "other",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(challengeOther.status, 403);
    assert.equal((await challengeOther.json()).error.code, "growth_stage_assessment_challenge_not_visible");

    const challenge = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/challenge`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(challenge.status, 201);
    assert.equal(calls[2].type, "activate");
    assert.equal(calls[2].input.workspaceId, "test");
    assert.equal(calls[2].input.learnerId, "test");
    assert.equal(calls[2].input.activationSource, "executor_challenge");

    const deniedControls = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/controls?workspaceId=weixin_fanfan`, {
      headers: {
        authorization: "Bearer workspace-key",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "growth:test"
      }
    });
    assert.equal(deniedControls.status, 403);
    assert.equal((await deniedControls.json()).error.code, "growth_stage_checkpoint_controls_owner_required");

    const controls = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/controls?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&targetNodeIds=node_1,node_2&assessmentCoverageNodeIds=node_1,node_2`, {
      headers: {
        authorization: "Bearer workspace-key",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      }
    });
    assert.equal(controls.status, 200);
    const controlsBody = await controls.json();
    assert.equal(controlsBody.schemaVersion, "growth.stageCheckpointControls.v1");
    assert.equal(controlsBody.privacyClass, "summary_only");
    assert.equal(controlsBody.summary.status, "ready_for_owner_activation");
    assert.deepEqual(calls[3], {
      type: "controls",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        growthWorkspaceId: undefined,
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        subjectId: "science",
        capabilityClusterId: "",
        targetNodeId: "node_1",
        targetNodeIds: ["node_1", "node_2"],
        assessmentCoverageNodeIds: ["node_1", "node_2"],
        requestedBy: "owner"
      }
    });
  } finally {
    await close(server);
  }
});

test("growth evaluation worker processes queue when enabled", async () => {
  let processed = 0;
  const server = startServer({
    port: 0,
    evaluationWorkerEnabled: true,
    evaluationWorkerIntervalMs: 5000
  }, {
    growthEvaluationService: {
      async processEvaluationQueue() {
        processed += 1;
        return { ok: true, processed: 0, results: [] };
      }
    }
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(processed >= 1, true);
  } finally {
    await close(server);
  }
});

test("growth scheduler background worker timer is default-disabled and only calls worker service when enabled", async () => {
  let disabledTicks = 0;
  const disabledServer = startServer({
    port: 0,
    automationBackgroundWorkerEnabled: false,
    automationBackgroundWorkerIntervalMs: 5000,
    automationBackgroundWorkerTargets: [{ workspaceId: "weixin_fanfan" }]
  }, {
    learningAutomationSchedulerWorkerService: {
      async tickTargets() {
        disabledTicks += 1;
        return { ok: true, results: [] };
      }
    }
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(disabledTicks, 0);
  } finally {
    await close(disabledServer);
  }

  const calls = [];
  const enabledServer = startServer({
    port: 0,
    automationBackgroundWorkerEnabled: true,
    automationBackgroundWorkerIntervalMs: 5000,
    automationBackgroundWorkerLeaseMs: 600000,
    automationBackgroundWorkerId: "growth-worker-test",
    automationBackgroundWorkerTargets: [{
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      subject: "science"
    }]
  }, {
    learningAutomationSchedulerWorkerService: {
      async tickTargets(input) {
        calls.push(input);
        return { ok: true, results: [] };
      }
    }
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(calls.length >= 1, true);
    assert.equal(calls[0].workerId, "growth-worker-test");
    assert.equal(calls[0].leaseMs, 600000);
    assert.equal(calls[0].targets[0].workspaceId, "weixin_fanfan");
  } finally {
    await close(enabledServer);
  }
});

test("growth daily loop preview is Owner-only and limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningDailyLoopService: {
      preview(input) {
        calls.push(input);
        return {
          ok: true,
          operation: "preview",
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          scope: { subject: input.subject },
          readiness: { ready: true }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/daily-loop/preview?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test&planDraftId=lgplan_route_1&taskCardId=ltask_route_1&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    assert.equal((await ownerResponse.json()).operation, "preview");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      growthWorkspaceId: undefined,
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: "15",
	      targetNodeIds: ["kg_science_fair_test"],
      planDraftId: "lgplan_route_1",
      itemId: "",
      taskCardId: "ltask_route_1",
      evaluationId: "",
      profileDeltaId: "",
      evidenceId: "",
      correctionId: "",
      sourceId: "",
      limit: "5",
      requestedBy: "weixin_stephen"
    });

    const memberDenied = await fetch(`${baseUrl}/api/v1/growth/daily-loop/preview?workspaceId=weixin_stephen`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberDenied.status, 403);
    assert.equal((await memberDenied.json()).error.code, "growth_daily_loop_owner_required");

    const invisibleDenied = await fetch(`${baseUrl}/api/v1/growth/daily-loop/preview?workspaceId=weixin_missing`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(invisibleDenied.status, 403);
    assert.equal((await invisibleDenied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth learning loop state is Owner-only and limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningLoopStateService: {
      state(input) {
        calls.push(input);
        return {
          ok: true,
          source: "growth-learning-loop-state-service",
          schemaVersion: "growth.learningLoopState.v1",
          target: { workspaceId: input.workspaceId, learnerId: input.learnerId },
          scope: { subject: input.subject },
          status: "ready_to_draft",
          recommendationEvidence: {
            schemaVersion: "growth.learningLoopState.recommendationEvidence.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            summary: { explanationReady: true }
          },
          nextAction: { action: "draft_daily_plan" }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
	    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/learning-loop/state?workspaceId=growth:weixin_fanfan&learnerId=fanfan&programId=program_science&domainPackId=uk_hk_curriculum_foundation&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_science_fair_test,kg_science_variables&planDraftId=lgplan_route_1&itemId=plan_item_route_1&taskCardId=ltask_route_1&limit=5`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.schemaVersion, "growth.learningLoopState.v1");
    assert.equal(ownerBody.status, "ready_to_draft");
    assert.equal(ownerBody.recommendationEvidence.schemaVersion, "growth.learningLoopState.recommendationEvidence.v1");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      label: "凡凡",
      growthWorkspaceId: undefined,
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: "15",
	      targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      planDraftId: "lgplan_route_1",
      itemId: "plan_item_route_1",
      taskCardId: "ltask_route_1",
      evaluationId: "",
      profileDeltaId: "",
      evidenceId: "",
      correctionId: "",
      sourceId: "",
      limit: "5",
      requestedBy: "weixin_stephen"
    });

    const memberDenied = await fetch(`${baseUrl}/api/v1/growth/learning-loop/state?workspaceId=weixin_stephen`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberDenied.status, 403);
    assert.equal((await memberDenied.json()).error.code, "growth_learning_loop_state_owner_required");

    const invisibleDenied = await fetch(`${baseUrl}/api/v1/growth/learning-loop/state?workspaceId=weixin_missing`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(invisibleDenied.status, 403);
    assert.equal((await invisibleDenied.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth daily loop draft and publish delegate through service with Owner write authorization", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "owner-token" || workspaceId !== "weixin_stephen") {
          const error = new Error("denied");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { workspace_id: "growth:weixin_stephen", hermes_workspace_id: "weixin_stephen" };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningDailyLoopService: {
      async draft(input) {
        calls.push({ type: "draft", input });
        return {
          ok: true,
          planDraft: { planDraftId: "lgplan_route_1", workspaceId: input.workspaceId, status: "draft" }
        };
      },
      async publish(input) {
        calls.push({ type: "publish", input });
        return {
          ok: true,
          planDraft: {
            planDraftId: input.planDraftId,
            workspaceId: input.workspaceId,
            status: "published",
            generatedTaskCardId: "ltask_route_1"
          },
          generation: { published: { taskCardId: "ltask_route_1" } }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const draftResponse = await fetch(`${baseUrl}/api/v1/growth/daily-loop/draft`, {
      method: "POST",
      headers: {
        authorization: "Bearer owner-token",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        domain_pack_id: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        available_minutes: 15,
        target_node_ids: ["kg_science_fair_test"]
      })
    });
    assert.equal(draftResponse.status, 201);
    assert.equal((await draftResponse.json()).planDraft.planDraftId, "lgplan_route_1");

    const publishResponse = await fetch(`${baseUrl}/api/v1/growth/daily-loop/publish`, {
      method: "POST",
      headers: {
        authorization: "Bearer owner-token",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        program_id: "program_science",
        plan_draft_id: "lgplan_route_1",
        selected_item_id: "plan_item_1",
        task_card_id: "ltask_route_1",
        domain: "science",
        subject: "science"
      })
    });
    assert.equal(publishResponse.status, 201);
    assert.equal((await publishResponse.json()).generation.published.taskCardId, "ltask_route_1");

    assert.deepEqual(calls[0], {
      type: "draft",
      input: {
        workspaceId: "weixin_fanfan",
        learnerId: "fanfan",
        displayName: "凡凡",
        label: "凡凡",
        growthWorkspaceId: undefined,
        programId: "program_science",
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science",
        horizon: "daily_plan",
        availableMinutes: 15,
        allowedCardRoles: undefined,
        lowPressure: undefined,
        targetNodeId: undefined,
        targetNodeIds: ["kg_science_fair_test"],
        planDraftId: undefined,
        itemId: undefined,
        generationKey: undefined,
        cardSchemaVersion: undefined,
        taskCardId: undefined,
        evaluationId: undefined,
        profileDeltaId: undefined,
        evidenceId: undefined,
        correctionId: undefined,
        sourceId: undefined,
        limit: undefined,
        requestedBy: "weixin_stephen"
      }
    });
    assert.equal(calls[1].type, "publish");
    assert.equal(calls[1].input.workspaceId, "weixin_fanfan");
    assert.equal(calls[1].input.planDraftId, "lgplan_route_1");
    assert.equal(calls[1].input.itemId, "plan_item_1");

    const denied = await fetch(`${baseUrl}/api/v1/growth/daily-loop/draft`, {
      method: "POST",
      headers: {
        authorization: "Bearer owner-token",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      },
      body: JSON.stringify({ workspace_id: "weixin_stephen" })
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_daily_loop_owner_required");
  } finally {
    await close(server);
  }
});
