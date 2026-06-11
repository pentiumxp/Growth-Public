"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_DOCS = Object.freeze([
  "docs/GROWTH_DOCS_INDEX.md",
  "docs/GROWTH_CARD_GENERATION_RULES.md",
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
  "docs/GROWTH_CARD_GENERATION_RULES.md",
  "docs/GROWTH_KNOWLEDGE_GRAPH_MIGRATION.md",
  "docs/GROWTH_PLUGIN_ARCHITECTURE.md",
  "docs/HOME_AI_PLATFORM_CONTRACT.md"
]);

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function checkGrowthDocsLocality() {
  const missing = REQUIRED_DOCS.filter((relPath) => !fs.existsSync(path.join(ROOT, relPath)));
  const forbiddenPointers = [];
  for (const relPath of CURRENT_DOCS) {
    if (!fs.existsSync(path.join(ROOT, relPath))) continue;
    const text = read(relPath);
    for (const marker of FORBIDDEN_CURRENT_POINTERS) {
      if (text.includes(marker)) forbiddenPointers.push({ file: relPath, marker });
    }
  }
  return {
    ok: missing.length === 0 && forbiddenPointers.length === 0,
    requiredCount: REQUIRED_DOCS.length,
    missing,
    forbiddenPointers
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
  REQUIRED_DOCS,
  checkGrowthDocsLocality
};
