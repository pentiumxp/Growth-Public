const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "..", "public", "growth-homeai-legacy.css"), "utf8");

test("embedded Growth shell owns vertical scrolling inside the iframe", () => {
  assert.match(css, /html,\s*body\s*\{[\s\S]*?height: var\(--app-height, var\(--app-viewport-height, 100%\)\);/);
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?height: var\(--app-height, var\(--app-viewport-height, 100%\)\);/);
  assert.match(css, /\.growth-shell\s*\{[\s\S]*?max-height: var\(--app-height, var\(--app-viewport-height, none\)\);/);
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

test("Owner card generation progress and dark mode contrast are covered", () => {
  assert.match(css, /\.learning-card-generation-progress\s*\{[\s\S]*?position: fixed;/);
  assert.match(css, /\.learning-card-generation-progress-steps\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-card-generation-structured/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-card-generation-actions button\.primary/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-card-generation-progress/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*:root\[data-theme="system"\] \.learning-card-generation-progress/);
});

test("Generated Growth card flow keeps mobile and dark-mode layout guards", () => {
  assert.match(css, /\.learning-growth-daily-flow\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.learning-growth-card-detail-shell \.learning-growth-teaching-section,[\s\S]*?\.learning-growth-card-detail-shell \.learning-growth-teaching-feedback\s*\{[\s\S]*?padding: 12px;/);
  assert.match(css, /\.learning-growth-card-detail-shell \.learning-native-growth-submission-form\s*\{[\s\S]*?background: transparent;/);
  assert.match(css, /\.learning-growth-experience-actions\.is-readonly\s*\{[\s\S]*?display: flex;/);
  assert.match(css, /\.learning-growth-experience-actions span\s*\{[\s\S]*?display: inline-flex;/);
  assert.match(css, /\.learning-growth-experience-actions span\s*\{[\s\S]*?border-radius: 999px;/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.learning-growth-daily-flow\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-growth-daily-flow/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-growth-daily-flow span\.is-current/);
  assert.match(css, /:root\[data-theme="dark"\] \.learning-growth-experience-actions span/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*:root\[data-theme="system"\] \.learning-growth-daily-flow span\.is-current/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*:root\[data-theme="system"\] \.learning-growth-experience-actions span/);
});
