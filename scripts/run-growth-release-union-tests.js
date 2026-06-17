"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const RELEASE_UNION_TEST_FILES = Object.freeze([
  "tests/learning-automation-release-package-repository.test.js",
  "tests/learning-automation-release-package-service.test.js",
  "tests/growth-release-package-script.test.js",
  "tests/learning-automation-release-controls-service.test.js",
  "tests/learning-automation-release-dashboard-service.test.js",
  "tests/learning-automation-release-inventory-service.test.js",
  "tests/learning-automation-release-workbench-service.test.js",
  "tests/learning-automation-release-review-service.test.js",
  "tests/learning-automation-release-authorization-service.test.js",
  "tests/learning-automation-release-closure-service.test.js",
  "tests/learning-automation-release-preflight-service.test.js",
  "tests/learning-automation-release-preflight-repository.test.js",
  "tests/learning-automation-release-activation-service.test.js",
  "tests/learning-automation-runtime-enablement-service.test.js",
  "tests/growth-release-controls-smoke-script.test.js",
  "tests/growth-release-dashboard-smoke-script.test.js",
  "tests/growth-release-inventory-smoke-script.test.js",
  "tests/growth-release-workbench-smoke-script.test.js",
  "tests/growth-release-review-smoke-script.test.js",
  "tests/growth-release-authorization-smoke-script.test.js",
  "tests/growth-release-closure-smoke-script.test.js",
  "tests/growth-release-preflight-smoke-script.test.js",
  "tests/growth-release-activation-smoke-script.test.js",
  "tests/growth-runtime-enablement-smoke-script.test.js",
  "tests/growth-routes.test.js",
  "tests/growth-architecture-boundary.test.js"
]);

function buildNodeTestArgs(extraArgs = []) {
  return ["--test", ...extraArgs, ...RELEASE_UNION_TEST_FILES];
}

function runReleaseUnionTests(extraArgs = []) {
  return spawnSync(process.execPath, buildNodeTestArgs(extraArgs), {
    cwd: ROOT,
    stdio: "inherit"
  });
}

if (require.main === module) {
  const result = runReleaseUnionTests(process.argv.slice(2));
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status || 0);
}

module.exports = {
  RELEASE_UNION_TEST_FILES,
  buildNodeTestArgs,
  runReleaseUnionTests
};

