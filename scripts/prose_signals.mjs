#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const help = `Usage: node scripts/prose_signals.mjs <file.md|directory>... [--json | --annotate]

Advisory review signals for writing that reads like a transcript of the UI or code:

  code-limit  Validation detail the UI enforces, such as character limits,
              decimal places, byte counts, or large numeric ranges.
  history     Version history in a feature page, such as "earlier releases" or
              "after upgrading". Lines that name the release, such as "before
              prokube 1.10" or "the upgrade to mlflow-oidc-auth 11", count as
              anchored. Ignored in upgrading.md.

Tables, code blocks, headings, images, and frontmatter are excluded.
Repetition and bold density are deliberately not checked.
Signals are review prompts, NOT a build gate.
`;

const CODE_LIMIT_PATTERNS = [
  /\b\d[\d,]*\s*(?:characters|chars)\b/i,
  /\b\d+\s+decimal places\b/i,
  /\b\d[\d,]*\s+bytes\b/i,
  /\bfrom\s+\d[\d,]*\s+to\s+\d{1,3}(?:,\d{3}){2,}\b/i,
  /\b(?:NUL|control) characters\b/i,
];
const RELEASE_ANCHORS = [
  /\bprokube\s+v?\d+\.\d+/i,
  /\bupgrad\w*\s+to\s+[\w.-]+\s+v?\d+(?:\.\d+)*/i,
];
const HISTORY_PATTERNS = [
  /\b(?:earlier|older|previous|prior)\s+(?:prokube\s+|platform\s+)?(?:releases?|versions?)\b/i,
  /\bafter\s+(?:an?\s+|the\s+)?upgrad(?:e|ing)\b/i,
  /\bpreviously\b/i,
];

function proseLines(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let start = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
    start = end < 0 ? lines.length : end + 1;
  }
  const result = [];
  let fence = null;
  for (let index = start; index < lines.length; index++) {
    const line = lines[index];
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    if (!line.trim() || /^\s*(?:#{1,6}\s|\||:::|!\[|<)/.test(line)) continue;
    result.push({ line: index + 1, text: line.replace(/^\s*(?:>\s?)?(?:[-*+]|\d+[.)])?\s*/, "") });
  }
  return result;
}

export function analyzeMarkdown(markdown, { isUpgradePage = false } = {}) {
  const withoutCode = (text) => text.replace(/`[^`]*`/g, "CODE").replace(/\]\([^)]*\)/g, "]");
  const findings = [];
  for (const entry of proseLines(markdown)) {
    const text = withoutCode(entry.text);
    const limit = CODE_LIMIT_PATTERNS.find((pattern) => pattern.test(text));
    if (limit) findings.push({ signal: "code-limit", line: entry.line, message: `"${text.match(limit)[0]}": drop validation the form enforces; keep limits that affect planning.` });
    const history = !isUpgradePage && !RELEASE_ANCHORS.some((pattern) => pattern.test(text)) && HISTORY_PATTERNS.find((pattern) => pattern.test(text));
    if (history) findings.push({ signal: "history", line: entry.line, message: `"${text.match(history)[0]}": describe current behavior; put upgrade steps in admin/upgrading.md.` });
  }
  return { findings };
}

function markdownFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (!/\.md$/i.test(target)) throw new Error("Input file must have a .md extension");
    return [target];
  }
  if (!stat.isDirectory()) throw new Error("Input must be a file or directory");
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return markdownFiles(child);
    return entry.isFile() && /\.md$/i.test(entry.name) ? [child] : [];
  }).sort();
}

function main(args) {
  if (args.includes("--help")) {
    console.log(help);
    return;
  }
  const json = args.includes("--json");
  const annotate = args.includes("--annotate");
  const unknown = args.find((arg) => arg.startsWith("-") && arg !== "--json" && arg !== "--annotate");
  if (unknown) throw new Error(`Unknown option: ${unknown}`);
  if (json && annotate) throw new Error("--json and --annotate are mutually exclusive");
  const targets = args.filter((arg) => !arg.startsWith("-"));
  if (!targets.length) throw new Error("Specify input files or directories; use --help for usage");
  const pages = [...new Set(targets.flatMap((target) => markdownFiles(path.resolve(target))))].map((file) => ({
    file: path.relative(process.cwd(), file).split(path.sep).join("/"),
    ...analyzeMarkdown(fs.readFileSync(file, "utf8"), { isUpgradePage: path.basename(file) === "upgrading.md" }),
  }));
  if (json) {
    console.log(JSON.stringify(pages, null, 2));
    return;
  }
  for (const page of pages) for (const finding of page.findings) {
    if (annotate) {
      const escape = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
      const file = escape(page.file).replaceAll(":", "%3A").replaceAll(",", "%2C");
      console.log(`::warning file=${file},line=${finding.line},title=Prose signal (${finding.signal})::${escape(finding.message)}`);
    } else {
      console.log(`${page.file}:${finding.line}\t${finding.signal}\t${finding.message}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`prose_signals: ${error.message}`);
    process.exitCode = 1;
  }
}
