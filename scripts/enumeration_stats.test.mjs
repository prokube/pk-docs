#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeMarkdown } from "./enumeration_stats.mjs";

const labs = [
  "Labs are browser-based development environments with access to the compute resources, storage, credentials, and platform tools available in your workspace.",
  "You can use Labs to explore data, write code, start platform workflows, and prepare work for production runtimes without setting up a local development environment first.",
  "From within a Lab you can access other prokube tools programmatically through `kubectl`, SDKs, CLIs, and APIs, for example to launch pipelines, run hyperparameter tuning or distributed computing experiments, develop MCP servers, and test agent workflows.",
].join("\n\n");
const intro = analyzeMarkdown(labs);
assert.equal(intro.enumerations, 4);
assert.equal(intro.enumeratedSentences, 3);
assert.equal(intro.saturation, null);
assert.equal(analyzeMarkdown(labs, { minSentences: 3 }).saturation, 100);
assert.equal(intro.denseCount, 1);
assert.equal(intro.dense[0].reason, "2 lists");
assert.deepEqual(intro.evidence.map((entry) => entry.line), [1, 3, 5]);
assert.deepEqual(intro.evidence[2].matches.map((match) => match.items.length), [4, 4]);
assert.equal(intro.evidence[2].matches[1].items[1], "run hyperparameter tuning or distributed computing experiments");
assert.match(intro.evidence[2].sentence, /`kubectl`/);

for (const sentence of [
  "Use compute, storage and credentials.",
  "Explore data, write code or run experiments.",
  "Use alpha, beta, gamma, delta, epsilon, and zeta.",
  "Use alpha, beta, gamma, delta, epsilon or zeta.",
  "If needed, use compute, storage, and credentials.",
]) assert.equal(analyzeMarkdown(sentence).enumerations, 1, sentence);

for (const sentence of [
  "If X, do Y, or do Z.",
  "If X, do Y or do Z.",
  "When it fails, retry, or stop.",
  "Unless ready, wait, or cancel.",
  "For team work, use a team workspace and credentials.",
  "Use `alpha, beta, and gamma` safely.",
  "Use ``alpha, `beta`, and gamma`` safely.",
  "Read [the guide](https://example.test/alpha,beta,and-gamma).",
  "Read https://example.test/alpha,beta,and-gamma today.",
  "Look ![alpha, beta, and gamma](image.png) here.",
  "Use the UI, the API, or both.",
  "Use the UI, the API, and both.",
  "Use the UI, the API, or neither.",
  "Use the UI, the API or both.",
  "Use the UI, the API and both.",
  "Use the UI, the API or neither.",
  "Agent Gateway is the routing layer for external API traffic, the same layer that fronts classic model-serving endpoints and Knative services in MLOps.",
]) assert.equal(analyzeMarkdown(sentence, { includeLoose: true }).enumerations, 0, sentence);

assert.equal(analyzeMarkdown("Use `alpha, beta`, storage, and credentials.").enumerations, 1);
assert.equal(analyzeMarkdown("Use `alpha, beta, gamma`.").words, 2);
assert.equal(analyzeMarkdown("Use [compute](https://example.test/a(b)), storage, and credentials.").enumerations, 1);
assert.equal(analyzeMarkdown("Use [compute][ref], storage, and credentials.\n\n[ref]: https://example.test").words, 5);

const loose = analyzeMarkdown("Compute, storage, credentials.", { includeLoose: true });
assert.equal(analyzeMarkdown("Compute, storage, credentials.").enumerations, 0);
assert.equal(loose.enumerations, 1);
assert.equal(loose.evidence[0].matches[0].confidence, "loose");
const two = analyzeMarkdown("Use compute, storage, and credentials; inspect pods, services and secrets.");
assert.equal(two.enumerations, 2);
assert.equal(two.enumeratedSentences, 1);
assert.equal(analyzeMarkdown("Therefore, we do not write our own material and instead recommend official resources.").enumerations, 0);
for (const [sentence, items] of [
  ["From a Lab, you reach other prokube tools through `kubectl`, SDKs, CLIs, and APIs.", 4],
  ["Before running it, administrators should confirm the backend store, artifact store, retention policy, and backup state.", 4],
  ["Some workflows need custom images, for example pipeline components, KServe predictors, model servers, or agent runtimes.", 4],
]) {
  const result = analyzeMarkdown(sentence);
  assert.equal(result.enumerations, 1, sentence);
  assert.equal(result.evidence[0].matches[0].items.length, items, sentence);
  assert.equal(result.denseCount, 0, sentence);
}
const including = analyzeMarkdown("Labs use resources, including CPUs, GPUs, and persistent volumes.");
assert.equal(including.enumerations, 1);
assert.deepEqual(including.evidence[0].matches[0].items, ["CPUs", "GPUs", "persistent volumes"]);
const parenthetical = analyzeMarkdown("An external caller (an SDK, a CI job, or another agent outside the workspace) authenticates with an API key scoped to one of the `/a2a`, `/mcp`, or `/ai` paths.");
assert.equal(parenthetical.enumerations, 2);
assert.deepEqual(parenthetical.evidence[0].matches[0].items, ["an SDK", "a CI job", "another agent outside the workspace"]);
assert.deepEqual(parenthetical.evidence[0].matches.map((match) => match.items.length), [3, 3]);
assert.equal(parenthetical.dense[0].reason, "2 lists");
const withWithout = analyzeMarkdown("Run the job with or without GPUs, on CPU nodes, and in any workspace.");
assert.equal(withWithout.enumerations, 1);
assert.deepEqual(withWithout.evidence[0].matches[0].items, ["Run the job with or without GPUs", "on CPU nodes", "in any workspace"]);
assert.equal(analyzeMarkdown("Use alpha, beta, gamma, delta, and epsilon.").dense[0].reason, "5 items");
assert.equal(analyzeMarkdown("Use alpha, beta, gamma, delta, and epsilon; inspect pods, services, and secrets.").dense[0].reason, "5 items, 2 lists");
assert.equal(analyzeMarkdown("Use alpha, beta, and gamma.").denseCount, 0);
assert.equal(analyzeMarkdown("- an MCP server or memory store, for tool and retrieval access;").enumerations, 0);
const proseKinds = analyzeMarkdown("> Use alpha, beta, and gamma.\n\n::: info\nUse pods, services, and secrets.\n:::\n\n1. Use CPU, GPU, and storage.\n   Wrapped text.\n\nOrdinary prose.");
assert.equal(proseKinds.enumerations, 2);
assert.equal(proseKinds.sentences, 3);
assert.deepEqual(proseKinds.lists, { sentences: 2, enumerations: 1, enumeratedSentences: 1 });

const excluded = [
  "---", "title: alpha, beta, and gamma", "---",
  "# alpha, beta, and gamma", "",
  "Setext alpha, beta, and gamma", "===", "",
  "```js", "alpha, beta, and gamma", "~~~", "still, in, and code", "```", "",
  "~~~~", "alpha, beta, and gamma", "~~~", "still, in, and code", "~~~~", "",
  "    alpha, beta, and gamma", "",
  "| Heading | Other |", "| --- | --- |", "| alpha, beta, and gamma | content |", "",
  "Heading | Other", "--- | ---", "alpha, beta, and gamma | content", "",
  "![alpha, beta, and gamma](image.png)", "",
  "Plain prose.",
].join("\n");
assert.deepEqual(analyzeMarkdown(excluded), {
  words: 2, sentences: 1, enumerations: 0, enumeratedSentences: 0,
  saturation: null, per1000Words: 0, denseCount: 0, dense: [],
  lists: { sentences: 0, enumerations: 0, enumeratedSentences: 0 }, evidence: [],
});
const wrapped = analyzeMarkdown("# Heading\n\nUse compute,\nstorage, and credentials.\n\n- Read compute,\n  storage and credentials\n- Plain text\n\n    ignored, code, and commands\n");
assert.equal(wrapped.enumerations, 1);
assert.equal(wrapped.sentences, 1);
assert.deepEqual(wrapped.evidence.map((entry) => entry.line), [3]);
assert.deepEqual(wrapped.lists, { sentences: 2, enumerations: 1, enumeratedSentences: 1 });
assert.equal(analyzeMarkdown("- Compute, storage\n- Credentials and tools").enumerations, 0);
assert.equal(analyzeMarkdown("Version 1.5.0 uses 3.14 units, e.g. compute, storage, and credentials. Dr. Smith agrees.").sentences, 2);
assert.equal(analyzeMarkdown("").saturation, null);

const cli = fileURLToPath(new URL("./enumeration_stats.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "enumeration-stats-"));
try {
  fs.mkdirSync(path.join(directory, "nested"));
  fs.writeFileSync(path.join(directory, "z.md"), "Plain text.");
  fs.writeFileSync(path.join(directory, "nested", "a.md"), labs);
  fs.writeFileSync(path.join(directory, "ignore.txt"), labs);
  const json = run(directory, "--json", "--min-words", "99999", "--limit", "0");
  assert.equal(json.status, 0, json.stderr);
  const pages = JSON.parse(json.stdout);
  assert.equal(pages.length, 2);
  assert.match(pages[0].file, /nested\/a\.md$/);
  assert.equal(pages[0].enumerations, 4);
  assert.equal(pages[0].saturation, null);
  assert.deepEqual(Object.keys(pages[0]).sort(), ["file", "words", "sentences", "enumerations", "enumeratedSentences", "saturation", "per1000Words", "denseCount", "dense", "lists", "evidence"].sort());
  assert.deepEqual(Object.keys(pages[0].dense[0]).sort(), ["line", "sentence", "reason", "matches"].sort());
  assert.equal(JSON.parse(run(directory, "--json", "--min-sentences", "3").stdout)[0].saturation, 100);
  assert.equal(pages[1].enumerations, 0);
  assert.equal(run(directory, "--json", "--min-words", "99999", "--limit", "0").stdout, json.stdout);
  assert.match(run(directory).stdout, /0\/2 pages eligible/);
  assert.match(run(directory, "--min-words", "0", "--limit", "1").stdout, /nested\/a\.md/);
  assert.doesNotMatch(run(directory, "--min-words", "0", "--limit", "1").stdout, /z\.md/);
  assert.equal(JSON.parse(run(path.join(directory, "z.md"), "--json").stdout).length, 1);
  const multiple = run(path.join(directory, "z.md"), path.join(directory, "nested"), "--json");
  assert.equal(multiple.status, 0, multiple.stderr);
  assert.equal(multiple.stdout, json.stdout);
  assert.equal(JSON.parse(run(directory, directory, "--json").stdout).length, 2);
  const annotation = run(directory, "--annotate", "--min-words", "99999", "--limit", "0");
  assert.equal(annotation.status, 0, annotation.stderr);
  assert.equal(annotation.stdout, `::warning file=${pages[0].file},line=5,title=Dense enumeration (2 lists)::${labs.split("\n\n")[2].slice(0, 199)}…\n`);
  assert.match(run(directory, "--min-words", "0").stdout, /1\t-\t4\t3\t3\t/);
  const escapedFile = path.join(directory, "percent%,comma\r\n.md");
  fs.writeFileSync(escapedFile, "Use 50% CPU, storage, networks, secrets,\nand credentials.");
  const escaped = run(escapedFile, "--annotate");
  assert.equal(escaped.status, 0, escaped.stderr);
  const escapedPath = path.relative(process.cwd(), escapedFile).split(path.sep).join("/").replaceAll("%", "%25").replaceAll(",", "%2C").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  assert.equal(escaped.stdout, `::warning file=${escapedPath},line=1,title=Dense enumeration (5 items)::Use 50%25 CPU, storage, networks, secrets, and credentials.\n`);
  assert.equal(run(path.join(directory, "z.md"), "--annotate").stdout, "");
  const combinedFile = path.join(directory, "combined.md");
  fs.writeFileSync(combinedFile, "Use alpha, beta, gamma, delta, and epsilon; inspect pods, services, and secrets.");
  assert.match(run(combinedFile, "--annotate").stdout, /title=Dense enumeration \(5 items%2C 2 lists\)::/);
  const ranking = path.join(directory, "ranking");
  fs.mkdirSync(ranking);
  fs.writeFileSync(path.join(ranking, "a.md"), "Plain prose.");
  fs.writeFileSync(path.join(ranking, "b.md"), "Plain prose. More prose.");
  fs.writeFileSync(path.join(ranking, "c.md"), "Use alpha, beta, gamma, delta, and epsilon.");
  const rows = run(ranking, "--min-words", "0", "--min-sentences", "2").stdout.trim().split("\n").slice(2);
  assert.deepEqual(rows.map((row) => row.split("\t").at(-1).split("/").at(-1)), ["c.md", "b.md", "a.md"]);
  fs.writeFileSync(path.join(directory, "z.md"), "Compute, storage, credentials.");
  assert.equal(JSON.parse(run(path.join(directory, "z.md"), "--json", "--include-loose").stdout)[0].enumerations, 1);
  assert.equal(run("--help").status, 0);
  for (const args of [[], [directory, "--unknown"], [directory, "--limit", "bad"], [directory, "--min-words", "-1"], [directory, "--min-sentences"], [directory, "--json", "--annotate"], [path.join(directory, "ignore.txt")], [path.join(directory, "missing.md")]]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /enumeration_stats:/);
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
console.log("enumeration_stats: all assertion and CLI tests passed");
