"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RELEASE_UNION_TEST_FILES,
  buildNodeTestArgs
} = require("../scripts/run-growth-release-union-tests");

test("release union script registers the final release gate harness", () => {
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/learning-automation-release-review-service.test.js"), true);
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/learning-automation-release-authorization-service.test.js"), true);
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/learning-automation-release-closure-service.test.js"), true);
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/learning-automation-release-preflight-service.test.js"), true);
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/growth-routes.test.js"), true);
  assert.equal(RELEASE_UNION_TEST_FILES.includes("tests/growth-architecture-boundary.test.js"), true);
  assert.deepEqual(buildNodeTestArgs(["--test-reporter", "spec"]).slice(0, 3), [
    "--test",
    "--test-reporter",
    "spec"
  ]);
});

