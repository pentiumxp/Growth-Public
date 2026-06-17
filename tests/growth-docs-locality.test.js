"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkGrowthDocsLocality,
  extractTestReferences
} = require("../scripts/check-growth-docs-locality");

test("growth docs locality extracts unique test harness references", () => {
  assert.deepEqual(extractTestReferences([
    "`tests/example-service.test.js`",
    "`tests/example-service.test.js`",
    "and tests/nested/example-smoke-script.test.js"
  ].join(" ")), [
    "tests/example-service.test.js",
    "tests/nested/example-smoke-script.test.js"
  ]);
});

test("growth-specific docs are available in the Growth plugin workspace", () => {
  const result = checkGrowthDocsLocality();
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.forbiddenPointers, []);
  assert.deepEqual(result.stalePlaybookDomainPackMarkers, []);
  assert.deepEqual(result.missingHarnessReferences, []);
  assert.equal(result.ok, true);
  assert.ok(result.requiredCount >= 20);
  assert.ok(result.harnessReferenceDocCount >= 3);
});
