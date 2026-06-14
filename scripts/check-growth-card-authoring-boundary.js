"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_DOC_MARKERS = Object.freeze([
  "learning-card-authoring-service",
  "growth-gateway-authoring-client",
  "learning-card-authoring-validation-service",
  "learning-card-evaluation-service",
  "growth-gateway-evaluation-client",
  "learning-profile-projection-service",
  "learning-card-generation-service",
  "history-summary",
  "card-authoring-publisher",
  "POST /api/v1/growth/cards/generate",
  "daily_score_once",
  "score_proportional",
  "passScoreRequired",
  "Gateway is the only model boundary for Growth card authoring.",
  "Gateway is the only model boundary for Growth card evaluation.",
  "learningGraphPlan",
  "learningProfile",
  "historical summaries",
  "versioned card schema",
  "growth.card.evaluation.v1",
  "skillResults",
  "authoring draft",
  "evaluation draft",
  "validate the `teachingFlow` contract",
  "validate card-role policy",
  "validate graph plan and graph binding consistency",
  "privacy and bounded-content scans",
  "valid streaming response",
  "valid JSON response",
  "empty output",
  "invalid JSON",
  "model timeout",
  "repair pass failure",
  "database transaction failure"
]);

const FORBIDDEN_SOURCE_PATTERNS = Object.freeze([
  {
    pattern: /\bOPENAI_API_KEY\b/,
    reason: "direct OpenAI API key boundary"
  },
  {
    pattern: /\bANTHROPIC_API_KEY\b/,
    reason: "direct Anthropic API key boundary"
  },
  {
    pattern: /\bDEEPSEEK_API_KEY\b/,
    reason: "direct DeepSeek API key boundary"
  },
  {
    pattern: /api\.openai\.com/i,
    reason: "direct OpenAI endpoint"
  },
  {
    pattern: /api\.anthropic\.com/i,
    reason: "direct Anthropic endpoint"
  },
  {
    pattern: /api\.deepseek\.com/i,
    reason: "direct DeepSeek endpoint"
  },
  {
    pattern: /require\(["']openai["']\)/i,
    reason: "direct OpenAI client import"
  },
  {
    pattern: /from\s+["']openai["']/i,
    reason: "direct OpenAI client import"
  },
  {
    pattern: /require\(["']@anthropic-ai\/sdk["']\)/i,
    reason: "direct Anthropic client import"
  },
  {
    pattern: /from\s+["']@anthropic-ai\/sdk["']/i,
    reason: "direct Anthropic client import"
  }
]);

const SOURCE_DIRS = Object.freeze(["src", "scripts"]);

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function checkRequiredDocMarkers() {
  const generationRules = fs.readFileSync(path.join(ROOT, "docs/GROWTH_CARD_GENERATION_RULES.md"), "utf8");
  const architecture = fs.readFileSync(path.join(ROOT, "docs/GROWTH_PLUGIN_ARCHITECTURE.md"), "utf8");
  const contract = fs.readFileSync(path.join(ROOT, "docs/HOME_AI_PLATFORM_CONTRACT.md"), "utf8");
  const allText = [generationRules, architecture, contract].join("\n");
  return REQUIRED_DOC_MARKERS.filter((marker) => !allText.includes(marker));
}

function checkForbiddenSourcePatterns() {
  const violations = [];
  for (const dir of SOURCE_DIRS) {
    for (const filePath of walkFiles(path.join(ROOT, dir))) {
      const relativePath = rel(filePath);
      if (relativePath === "scripts/check-growth-card-authoring-boundary.js") continue;
      const text = fs.readFileSync(filePath, "utf8");
      for (const { pattern, reason } of FORBIDDEN_SOURCE_PATTERNS) {
        if (pattern.test(text)) violations.push({ file: relativePath, reason });
      }
    }
  }
  return violations;
}

function checkGrowthCardAuthoringBoundary() {
  const missingDocMarkers = checkRequiredDocMarkers();
  const forbiddenSourcePatterns = checkForbiddenSourcePatterns();
  return {
    ok: missingDocMarkers.length === 0 && forbiddenSourcePatterns.length === 0,
    missingDocMarkers,
    forbiddenSourcePatterns
  };
}

if (require.main === module) {
  const result = checkGrowthCardAuthoringBoundary();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  checkGrowthCardAuthoringBoundary
};
