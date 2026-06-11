const assert = require("node:assert/strict");
const test = require("node:test");

const { createGrowthService } = require("../src/services/growth-service");
const { createGrowthWriteOrchestrator } = require("../src/services/growth-write-orchestrator");
const { createSqliteGrowthWriteProvider } = require("../src/services/growth-providers/sqlite-write-provider");

test("Growth write orchestrator keeps writes disabled outside plugin data-owner mode", () => {
  let called = false;
  const orchestrator = createGrowthWriteOrchestrator({
    preferPluginData: false,
    sqliteWriteProvider: {
      enabled: () => true,
      submitEvidence: () => {
        called = true;
        return { ok: true };
      }
    }
  });

  const result = orchestrator.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: { text: "done" }
  });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.error, "growth_plugin_write_not_available");
  assert.equal(result.workspace_id, "weixin_child");
  assert.equal(result.task_card_id, "card_1");
});

test("SQLite write provider maps Growth commands to bounded store calls", () => {
  const calls = [];
  const provider = createSqliteGrowthWriteProvider({
    learningStore: {
      submitEvidence(input) {
        calls.push(["submitEvidence", input]);
        return { ok: true, submission_id: "sub_1" };
      },
      submitReflection(input) {
        calls.push(["submitReflection", input]);
        return { ok: true, reflection_id: "ref_1" };
      },
      learningCoinBalance(input) {
        calls.push(["learningCoinBalance", input]);
        return { ok: true, balance: 8 };
      },
      clearLearningCoinBalanceForMonthlyExchange(input) {
        calls.push(["clearLearningCoinBalanceForMonthlyExchange", input]);
        return { ok: true, cleared_amount: 8 };
      }
    }
  });

  assert.equal(provider.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: { text: "done", workspaceId: "ignored" }
  }).submission_id, "sub_1");
  assert.equal(provider.submitReflection({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: { text: "review" }
  }).reflection_id, "ref_1");
  assert.equal(provider.learningCoinBalance({ workspaceId: "weixin_child" }).balance, 8);
  assert.equal(provider.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    body: { amount: 8 }
  }).cleared_amount, 8);

  assert.deepEqual(calls, [
    ["submitEvidence", { text: "done", workspaceId: "weixin_child", taskCardId: "card_1" }],
    ["submitReflection", { text: "review", workspaceId: "weixin_child", taskCardId: "card_1" }],
    ["learningCoinBalance", { workspaceId: "weixin_child" }],
    ["clearLearningCoinBalanceForMonthlyExchange", { amount: 8, workspaceId: "weixin_child" }]
  ]);
});

test("Growth service delegates plugin write commands through the write provider boundary", async () => {
  const calls = [];
  const service = createGrowthService({
    config: { dataOwner: "plugin" },
    learningStore: {
      submitEvidence(input) {
        calls.push(["submitEvidence", input]);
        return { ok: true, submission_id: "sub_1" };
      },
      submitReflection(input) {
        calls.push(["submitReflection", input]);
        return { ok: true, reflection_id: "ref_1" };
      },
      learningCoinBalance(input) {
        calls.push(["learningCoinBalance", input]);
        return { ok: true, balance: 13 };
      },
      clearLearningCoinBalanceForMonthlyExchange(input) {
        calls.push(["clearLearningCoinBalanceForMonthlyExchange", input]);
        return { ok: true, cleared_amount: 13 };
      }
    }
  });

  assert.equal((await service.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: { text: "done" }
  })).submission_id, "sub_1");
  assert.equal((await service.submitReflection({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: { text: "review" }
  })).reflection_id, "ref_1");
  assert.equal((await service.learningCoinBalance({ workspaceId: "weixin_child" })).balance, 13);
  assert.equal((await service.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    body: { amount: 13 }
  })).cleared_amount, 13);

  assert.deepEqual(calls.map(([name]) => name), [
    "submitEvidence",
    "submitReflection",
    "learningCoinBalance",
    "clearLearningCoinBalanceForMonthlyExchange"
  ]);
});

test("Growth write orchestrator returns bounded errors when a plugin write provider is incomplete", () => {
  const orchestrator = createGrowthWriteOrchestrator({
    preferPluginData: true,
    sqliteWriteProvider: createSqliteGrowthWriteProvider({ learningStore: {} })
  });

  assert.equal(orchestrator.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: {}
  }).error, "growth_plugin_write_not_available");
  assert.equal(orchestrator.submitReflection({
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    body: {}
  }).error, "growth_plugin_reflection_write_not_available");
  assert.equal(orchestrator.learningCoinBalance({
    workspaceId: "weixin_child"
  }).error, "growth_learning_coin_balance_unavailable");
  assert.equal(orchestrator.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    body: {}
  }).error, "growth_learning_coin_clear_unavailable");
});
