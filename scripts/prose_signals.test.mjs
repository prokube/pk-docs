#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeMarkdown } from "./prose_signals.mjs";

const signals = (markdown, options) => analyzeMarkdown(markdown, options).findings.map((finding) => finding.signal);

for (const sentence of [
  "Names must be at most 128 characters.",
  "Values allow up to 6 decimal places.",
  "Each file is limited to 1 MiB (1,048,576 bytes).",
  "Enter a whole number from 1 to 4,294,967,295.",
  "Values must not contain NUL characters.",
]) assert.deepEqual(signals(sentence), ["code-limit"], sentence);

for (const sentence of [
  "Servers deployed by earlier prokube releases need the label.",
  "References stop matching after an upgrade.",
  "The page previously showed raw counts.",
]) assert.deepEqual(signals(sentence), ["history"], sentence);

for (const sentence of [
  "Add up to 50 variables.",
  "Upload up to 10 files of 1 MiB each.",
  "Logs are retained for 10 days by default.",
  "Set the threshold to `100000` before calibration.",
  "Revoke the grant when the workspace should no longer use the model.",
]) assert.deepEqual(signals(sentence), [], sentence);

assert.deepEqual(signals("Check references after upgrading.", { isUpgradePage: true }), []);
assert.deepEqual(signals("```text\nat most 128 characters\n```\n\n| Name | at most 128 characters |\n|---|---|\n\n# Before upgrading"), []);
assert.deepEqual(signals("Use `at most 128 characters` as an example string."), []);
assert.equal(analyzeMarkdown("Intro.\n\nNames must be at most 128 characters.").findings[0].line, 3);

console.log("prose_signals tests passed");
