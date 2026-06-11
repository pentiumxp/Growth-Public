const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "growth-homeai-legacy.css"), "utf8");

test("embedded Growth shell owns vertical scrolling inside the iframe", () => {
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?height: 100%;/);
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?-webkit-overflow-scrolling: touch;/);
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?touch-action: pan-y;/);
  assert.match(css, /body\s*\{[\s\S]*?overflow: hidden;/);
});

test("Growth task board lane remains scrollable when iframe root scrolling is unreliable", () => {
  assert.match(css, /\.growth-shell \.learning-growth-board-page\s*\{[\s\S]*?height: 100%;/);
  assert.match(css, /\.growth-shell \.learning-growth-board\s*\{[\s\S]*?grid-template-rows: auto auto minmax\(0, 1fr\);/);
  assert.match(css, /\.growth-shell \.learning-growth-board-lanes\s*\{[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.growth-shell \.learning-growth-board-lane\.active\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.growth-shell \.learning-growth-board-lane\.active\s*\{[\s\S]*?-webkit-overflow-scrolling: touch;/);
  assert.match(css, /\.growth-shell \.learning-growth-board-card\s*\{[\s\S]*?touch-action: pan-y;/);
});

test("Owner settings and generation tabs remain scrollable on mobile iframes", () => {
  assert.match(css, /\.growth-shell \.learning-growth-settings-page\s*\{[\s\S]*?height: 100%;/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-page\s*\{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\);/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-page\s*\{[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-tabs\s*\{[\s\S]*?height: 100%;/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-tabs \.learning-growth-tabs\s*\{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\);/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-tabs \.learning-growth-tab-panel\.active\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-tabs \.learning-growth-tab-panel\.active\s*\{[\s\S]*?-webkit-overflow-scrolling: touch;/);
  assert.match(css, /\.growth-shell \.learning-growth-settings-tabs \.learning-growth-tab-panel\.active\s*\{[\s\S]*?touch-action: pan-y;/);
  assert.match(css, /\.learning-card-generation-manager\s*\{[\s\S]*?touch-action: pan-y;/);
});
