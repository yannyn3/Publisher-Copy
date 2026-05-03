const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf8");

assert.match(source, /class PublisherCopySettingTab/, "plugin should expose a settings tab");
assert.match(source, /THEME_PRESETS/, "plugin should define selectable theme presets");
assert.match(source, /loadSettings\(\)/, "plugin should load persisted theme settings");
assert.match(source, /saveSettings\(\)/, "plugin should save custom theme settings");
assert.match(source, /wechatElegant/, "plugin should include an elegant WeChat default theme");
assert.match(source, /headingPrefix/, "theme should style secondary headings with a visual prefix");
assert.match(source, /accentColor/, "theme should support custom accent colors");
assert.match(source, /backgroundColor/, "theme should support custom background colors");
assert.match(source, /bearInspired/, "plugin should include a Bear-inspired writing theme");
assert.match(source, /craftInspired/, "plugin should include a Craft-inspired document theme");
assert.match(source, /headingStyle/, "themes should customize heading composition");
assert.match(source, /cardShadow/, "themes should support subtle card depth for richer layouts");
assert.match(source, /contentRadius/, "themes should support refined rounded surfaces");
assert.match(source, /titleAlign/, "plugin should support centered article titles");
assert.match(source, /bodyAlign/, "plugin should support justified body text");
assert.match(source, /paragraphIndent/, "plugin should optionally indent paragraphs");
assert.match(source, /titleCard/, "plugin should support a refined title card treatment");
assert.match(source, /text-justify/, "WeChat body text should use Chinese-friendly justification");

console.log("theme checks passed");
