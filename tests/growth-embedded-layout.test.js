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
