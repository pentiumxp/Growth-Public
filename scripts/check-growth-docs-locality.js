"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_DOCS = Object.freeze([
  "docs/GROWTH_DOCS_INDEX.md",
  "docs/TEST_MATRIX.md",
  "docs/IMPLEMENTATION_NOTES/harness-required-matrix.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-completion-audit.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-owner-approval-request.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-deploy-lane-request-draft.json",
  "docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md",
  "docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md",
  "docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md",
  "docs/GROWTH_LEARNING_OPERATING_LOOP.md",
  "docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md",
  "docs/GROWTH_AI_LEARNING_ROADMAP.md",
  "docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md",
  "docs/GROWTH_CARD_GENERATION_RULES.md",
  "docs/GROWTH_AI_CARD_LOOP.md",
  "docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md",
  "docs/GROWTH_PLUGIN_ARCHITECTURE.md",
  "docs/HOME_AI_PLATFORM_CONTRACT.md",
  "docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_DESIGN.zh-CN.md",
  "docs/home-ai-growth/FANFAN_LEARNING_EVERGREEN_CARD_IMPLEMENTATION.zh-CN.md",
  "docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_ARCHITECTURE.zh-CN.md",
  "docs/home-ai-growth/FANFAN_LEARNING_SYSTEM_IMPLEMENTATION_V1_1.zh-CN.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/async-growth-evaluation-queue.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-architecture.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-design.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-implementation.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-knowledge-graph-requirements.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-learning-workflow-contract-harness.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-pluginization-plan.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-flow.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/growth-teaching-card-implementation.md",
  "docs/home-ai-growth/IMPLEMENTATION_NOTES/learning-mastery-profile.md",
  "docs/home-ai-growth/MODULES/growth-learning.md",
  "docs/home-ai-growth/RUNBOOKS/growth-card-stuck-waiting-ai.md",
  "docs/home-ai-growth/RUNBOOKS/growth-submit-button-disabled.md"
]);

const FORBIDDEN_CURRENT_POINTERS = Object.freeze([
  "/Users/hermes-dev/HermesMobileDev/app/docs/IMPLEMENTATION_NOTES/growth-",
  "/Users/hermes-dev/HermesMobileDev/app/docs/MODULES/growth-learning.md",
  "/Users/hermes-dev/HermesMobileDev/app/docs/RUNBOOKS/growth-",
  "/Users/hermes-dev/HermesMobileDev/app/docs/FANFAN_LEARNING_"
]);

const CURRENT_DOCS = Object.freeze([
  "docs/GROWTH_DOCS_INDEX.md",
  "docs/TEST_MATRIX.md",
  "docs/IMPLEMENTATION_NOTES/harness-required-matrix.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-completion-audit.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-owner-cutover-evidence-packet.md",
  "docs/IMPLEMENTATION_NOTES/growth-vite-owner-approval-request.md",
  "docs/GROWTH_AI_LEARNING_SYSTEM_SCHEME.md",
  "docs/GROWTH_AI_LEARNING_CLOSED_LOOP_PLAN.md",
  "docs/GROWTH_AI_LEARNING_IMPLEMENTATION_PLAN.md",
  "docs/GROWTH_LEARNING_OPERATING_LOOP.md",
  "docs/GROWTH_AI_LEARNING_OPERATING_LOOP_BLUEPRINT.md",
  "docs/GROWTH_AI_LEARNING_ROADMAP.md",
  "docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_DIGEST_PLAN.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_FAILURE_POLICY.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_ACTION_HANDOFF.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_SCHEDULER_EXECUTION.md",
  "docs/GROWTH_AI_LEARNING_AUTOMATION_BACKGROUND_SCHEDULER.md",
  "docs/GROWTH_CARD_GENERATION_RULES.md",
  "docs/GROWTH_AI_CARD_LOOP.md",
  "docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md",
  "docs/GROWTH_PLUGIN_ARCHITECTURE.md",
  "docs/HOME_AI_PLATFORM_CONTRACT.md"
]);

const PLAYBOOK_DOCS = Object.freeze([
  "docs/GROWTH_LEARNING_OPERATING_LOOP.md",
  "docs/GROWTH_AI_LEARNING_ROADMAP.md",
  "docs/GROWTH_AI_LEARNING_NEXT_STAGE_PLAN.md",
  "docs/GROWTH_CARD_GENERATION_MANAGEMENT_UI.md"
]);

const FORBIDDEN_PLAYBOOK_DOMAIN_PACK_MARKERS = Object.freeze([
  "domainPackId=uk_hk_curriculum_foundation",
  "--domain-pack-id uk_hk_curriculum_foundation",
  "\"domainPackId\": \"uk_hk_curriculum_foundation\"",
  "\"selectedDomainPackId\": \"uk_hk_curriculum_foundation\""
]);

const HARNESS_REFERENCE_DOCS = Object.freeze([
  "docs/TEST_MATRIX.md",
  "docs/IMPLEMENTATION_NOTES/harness-required-matrix.md",
  "docs/GROWTH_PLUGIN_ARCHITECTURE.md"
]);

const TEST_REFERENCE_PATTERN = /tests\/[A-Za-z0-9._/-]+\.test\.js/g;

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function extractTestReferences(text = "") {
  return Array.from(new Set(String(text || "").match(TEST_REFERENCE_PATTERN) || [])).sort();
}

function missingHarnessReferences() {
  const missing = [];
  for (const relPath of HARNESS_REFERENCE_DOCS) {
    if (!fs.existsSync(path.join(ROOT, relPath))) continue;
    for (const reference of extractTestReferences(read(relPath))) {
      if (!fs.existsSync(path.join(ROOT, reference))) {
        missing.push({ file: relPath, reference });
      }
    }
  }
  return missing;
}

function checkGrowthDocsLocality() {
  const missing = REQUIRED_DOCS.filter((relPath) => !fs.existsSync(path.join(ROOT, relPath)));
  const forbiddenPointers = [];
  const stalePlaybookDomainPackMarkers = [];
  const missingHarnessReferencesResult = missingHarnessReferences();
  for (const relPath of CURRENT_DOCS) {
    if (!fs.existsSync(path.join(ROOT, relPath))) continue;
    const text = read(relPath);
    for (const marker of FORBIDDEN_CURRENT_POINTERS) {
      if (text.includes(marker)) forbiddenPointers.push({ file: relPath, marker });
    }
  }
  for (const relPath of PLAYBOOK_DOCS) {
    if (!fs.existsSync(path.join(ROOT, relPath))) continue;
    const text = read(relPath);
    for (const marker of FORBIDDEN_PLAYBOOK_DOMAIN_PACK_MARKERS) {
      if (text.includes(marker)) stalePlaybookDomainPackMarkers.push({ file: relPath, marker });
    }
  }
  return {
    ok: missing.length === 0
      && forbiddenPointers.length === 0
      && stalePlaybookDomainPackMarkers.length === 0
      && missingHarnessReferencesResult.length === 0,
    requiredCount: REQUIRED_DOCS.length,
    missing,
    forbiddenPointers,
    stalePlaybookDomainPackMarkers,
    harnessReferenceDocCount: HARNESS_REFERENCE_DOCS.length,
    missingHarnessReferences: missingHarnessReferencesResult
  };
}

if (require.main === module) {
  const result = checkGrowthDocsLocality();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  HARNESS_REFERENCE_DOCS,
  REQUIRED_DOCS,
  checkGrowthDocsLocality,
  extractTestReferences,
  missingHarnessReferences
};
