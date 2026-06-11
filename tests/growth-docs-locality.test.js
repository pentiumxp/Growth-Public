"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { checkGrowthDocsLocality } = require("../scripts/check-growth-docs-locality");

test("growth-specific docs are available in the Growth plugin workspace", () => {
  const result = checkGrowthDocsLocality();
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.forbiddenPointers, []);
  assert.equal(result.ok, true);
  assert.ok(result.requiredCount >= 20);
});
