"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { checkGrowthCardAuthoringBoundary } = require("../scripts/check-growth-card-authoring-boundary");

test("growth card authoring stays plugin-owned and Gateway-only by contract", () => {
  const result = checkGrowthCardAuthoringBoundary();
  assert.deepEqual(result.missingDocMarkers, []);
  assert.deepEqual(result.forbiddenSourcePatterns, []);
  assert.equal(result.ok, true);
});
