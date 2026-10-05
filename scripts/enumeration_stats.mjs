#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const help = `Usage: node scripts/enumeration_stats.mjs <file.md|directory>... [options]

  --json             All Markdown files, sorted by path; no ranking filters
  --annotate         Dense prose warnings only, in GitHub annotation format; exit 0
  --min-sentences N  Minimum prose sentences for saturation (default: 15)
  --min-words N      Human ranking minimum prose words (default: 200)
  --limit N          Human ranking row limit (default: 20)
  --include-loose    Include low-confidence comma chains without a conjunction
  --help             Show this help

Scores prose only: paragraphs, blockquotes and VitePress container text.
Bullet and numbered item text is separate under lists in JSON, not prose metrics.
Strict enumerations have >=3 comma-separated items ending in and/or (Oxford or not).
--include-loose also counts low-confidence comma chains without a conjunction.
Dense = any enumeration with >=5 items, or >=2 enumerations in one sentence.
Reasons report the largest item count and/or the number of lists.
Saturation = 100 * enumeratedSentences / sentences; below --min-sentences
it is null in JSON and '-' in human output. Dense flags still apply.
Per1000Words = 1000 * enumerations / words. Empty denominators yield zero.
Human output ranks by dense count, then saturation (null last), then path.
--min-words and --limit filter human output only; JSON/annotations include all files.

Frontmatter, headings, tables, code blocks, images and URLs are excluded.
Link labels remain; inline code counts as one token with punctuation masked.
Wrapped text is joined; evidence lines locate sentence starts.
Parentheticals are separate list segments; Markdown/sentence parsing is approximate.

This is a review heuristic, NOT a grammatical or authorship detector or a build gate.
Clauses can look like list items; short lead-ins and nested lists can be missed.
Inspect evidence before drawing conclusions; compare corpora with the same options.
`;

const countWords = (text) => (text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
const comparePath = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function inlineProse(text, codes) {
  return text
    .replace(/(`+)([\s\S]*?)\1(?!`)/g, (_, marker, code) => {
      const token = `INLINECODE${codes.length}TOKEN`;
      codes.push({ token, text: `${marker}${code}${marker}` });
      return token;
    })
    .replace(/!\[[^\]]*\](?:\([^\n]*?\)|\[[^\]]*\])?/g, "")
    .replace(/\[([^\]]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<?https?:\/\/[^\s<>]+>?/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_~]/g, "")
    .trim();
}

function proseBlocks(markdown, codes) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let fence = null;
  let bulletIndent = null;
  let table = false;
  let start = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
    start = end < 0 ? lines.length : end + 1;
  }
  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
  };
  const tableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*\|[\s|:\-]*$/.test(line || "");
  for (let index = start; index < lines.length; index++) {
    const line = lines[index].replace(/\t/g, "    ").replace(/^\s*>\s?/, "");
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (new RegExp(`^\\s*${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
      continue;
    }
    if (marker) {
      flush();
      fence = { character: marker[1][0], length: marker[1].length };
      continue;
    }
    if (!line.trim()) {
      flush();
      table = false;
      continue;
    }
    if (table && line.includes("|")) continue;
    table = false;
    if (tableSeparator(lines[index + 1])) {
      flush();
      table = true;
      index++;
      continue;
    }
    if (/^\s{0,3}#{1,6}(?:\s|$)|^\s*:::|^\s*\[[^\]]+\]:|^\s*<[^>]+>\s*$/.test(line)
      || /^\s*(?:[-*_]\s*){3,}$|^\s*=+\s*$/.test(line)
      || /^\s*(?:=+|-+)\s*$/.test(lines[index + 1] || "")) {
      flush();
      bulletIndent = null;
      continue;
    }
    const item = line.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/);
    let body = line;
    if (item) {
      flush();
      bulletIndent = item[1].length + line.slice(item[1].length).indexOf(item[2]);
      body = item[2];
    } else {
      const indent = line.length - line.trimStart().length;
      if (indent >= 4 && (!current.length || bulletIndent === null || indent >= bulletIndent + 4)) {
        flush();
        continue;
      }
      if (indent === 0 && bulletIndent !== null) {
        flush();
        bulletIndent = null;
      }
    }
    body = inlineProse(body.replace(/^\s*>\s?/, ""), codes);
    if (body) current.push({ text: body, line: index + 1, list: bulletIndent !== null });
  }
  flush();
  return blocks;
}

function splitSentences(block) {
  const text = block.map((entry) => entry.text).join(" ");
  const starts = [];
  let offset = 0;
  for (const entry of block) {
    starts.push({ offset, line: entry.line });
    offset += entry.text.length + 1;
  }
  const results = [];
  let start = 0;
  const append = (end) => {
    const leading = text.slice(start, end).search(/\S/);
    if (leading < 0) return;
    const position = start + leading;
    const line = starts.filter((entry) => entry.offset <= position).at(-1).line;
    results.push({ line, sentence: text.slice(position, end).trim() });
  };
  for (let index = 0; index < text.length; index++) {
    if (!/[.!?]/.test(text[index])) continue;
    if (text[index] === ".") {
      if (/\d/.test(text[index - 1] || "") && /\d/.test(text[index + 1] || "")) continue;
      const prefix = text.slice(start, index + 1);
      if (/\b(?:e\.g|i\.e|Mr|Mrs|Ms|Dr|Prof|vs|etc|Fig|No)\.$/i.test(prefix)
        || /(?:\b[A-Za-z]\.)+$/.test(prefix)) continue;
    }
    let end = index + 1;
    while (/[.!?"'\u201d\u2019)\]]/.test(text[end] || " ")) end++;
    if (end < text.length && !/\s/.test(text[end])) continue;
    append(end);
    start = end;
    index = end - 1;
  }
  append(text.length);
  return results;
}

function enumerationMatches(sentence, includeLoose) {
  const matches = [];
  const clauseStart = /^(?:if|when|unless|although|because|while|whereas|however|otherwise|then|but|so|which|who)\b/i;
  const segments = [];
  let outer = sentence;
  while (/\([^()]*\)/.test(outer)) {
    outer = outer.replace(/\(([^()]*)\)/g, (_, inner) => { segments.push(inner); return " "; });
  }
  segments.push(outer.replace(/\s+/g, " "));
  for (const section of segments.flatMap((segment) => segment.replace(/[.!?]+$/, "").split(/[;:]/))) {
    let pending = [];
    const loose = () => {
      if (includeLoose && pending.length >= 3) {
        matches.push({ confidence: "loose", items: pending, text: pending.join(", ") });
      }
      pending = [];
    };
    const chunks = section.split(",").map((chunk) => chunk.trim());
    for (let index = 0; index < chunks.length; index++) {
      let chunk = chunks[index];
      if (index === 0 && /^(?:therefore|however|nevertheless|furthermore|additionally|consequently|instead|for example)$/i.test(chunk)) continue;
      const introducer = /^(?:including|such as|e\.g\.|for example|for instance|like)\s+/i;
      if (introducer.test(chunk)) {
        pending = [];
        chunk = chunk.replace(introducer, "");
      }
      // Leading adverbial phrases ("From a Lab", "Before running it") are not list items.
      if (index === 0 && /^(?:for|in|on|at|from|before|after|during|within|once|since|until|by|with|without|to|depending on)\b/i.test(chunk)
        && countWords(chunk) <= 8) continue;
      if (!chunk || clauseStart.test(chunk)) {
        loose();
        continue;
      }
      if (/^(?:(?:and|or)\s+)?(?:both|neither)\b/i.test(chunk)
        || /^(?:(?:and|or)\s+)?(?:a|an|the)\b.*\b(?:that|which|who)\b/i.test(chunk)) {
        pending = [];
        continue;
      }
      const oxford = chunk.match(/^(and|or)\s+(.+)$/i);
      const conjunction = chunk.match(/^(.+?)(?<!\bwith)\s+(and|or)\s+(.+)$/i);
      if (conjunction && /^(?:both|neither)\b/i.test(conjunction[3])) {
        pending = [];
        continue;
      }
      let items = null;
      if (oxford && pending.length >= 2) items = [...pending, oxford[2]];
      else if (!oxford && conjunction && pending.length >= 1
        && !chunks.slice(index + 1).some((next) => /^(and|or)\s+/i.test(next))) {
        items = [...pending, conjunction[1], conjunction[3]];
      }
      if (items) {
        matches.push({ confidence: "strict", items, text: [...pending, chunk].join(", ") });
        pending = [];
      } else if (oxford) {
        loose();
      } else pending.push(chunk);
    }
    loose();
  }
  return matches;
}

export function analyzeMarkdown(markdown, { includeLoose = false, minSentences = 15 } = {}) {
  const codes = [];
  const blocks = proseBlocks(markdown, codes);
  const prose = blocks.filter((block) => !block[0].list);
  const sentences = prose.flatMap(splitSentences);
  const listSentences = blocks.filter((block) => block[0].list).flatMap(splitSentences);
  const restore = (text) => {
    for (const code of codes) text = text.replaceAll(code.token, code.text);
    return text;
  };
  const evidence = [];
  for (const entry of sentences) {
    const matches = enumerationMatches(entry.sentence, includeLoose);
    if (!matches.length) continue;
    evidence.push({ line: entry.line, sentence: restore(entry.sentence), matches: matches.map((match) => ({
      ...match, text: restore(match.text), items: match.items.map(restore),
    })) });
  }
  const words = prose.reduce((total, block) => total + countWords(block.map((entry) => entry.text).join(" ")), 0);
  const enumerations = evidence.reduce((total, entry) => total + entry.matches.length, 0);
  const dense = evidence.flatMap((entry) => {
    const items = Math.max(...entry.matches.map((match) => match.items.length));
    const reasons = [items >= 5 ? `${items} items` : "", entry.matches.length >= 2 ? `${entry.matches.length} lists` : ""].filter(Boolean);
    return reasons.length ? [{ ...entry, reason: reasons.join(", ") }] : [];
  });
  const listCounts = listSentences.map((entry) => enumerationMatches(entry.sentence, includeLoose).length);
  return {
    words, sentences: sentences.length, enumerations, enumeratedSentences: evidence.length,
    saturation: sentences.length < minSentences ? null : sentences.length ? 100 * evidence.length / sentences.length : 0,
    per1000Words: words ? 1000 * enumerations / words : 0,
    denseCount: dense.length, dense,
    lists: { sentences: listSentences.length, enumerations: listCounts.reduce((total, count) => total + count, 0), enumeratedSentences: listCounts.filter(Boolean).length }, evidence,
  };
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
  }).sort(comparePath);
}

function main(args) {
  if (args.includes("--help")) {
    console.log(help);
    return;
  }
  const targets = [];
  let json = false;
  let annotate = false;
  let includeLoose = false;
  let minWords = 200;
  let limit = 20;
  let minSentences = 15;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--json") json = true;
    else if (arg === "--annotate") annotate = true;
    else if (arg === "--include-loose") includeLoose = true;
    else if (arg === "--min-words" || arg === "--limit" || arg === "--min-sentences") {
      const value = args[++index];
      if (!/^\d+$/.test(value || "") || !Number.isSafeInteger(Number(value))) {
        throw new Error(`${arg} requires a nonnegative integer`);
      }
      if (arg === "--min-words") minWords = Number(value);
      else if (arg === "--limit") limit = Number(value);
      else minSentences = Number(value);
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else targets.push(arg);
  }
  if (!targets.length) throw new Error("Specify input files or directories; use --help for usage");
  if (json && annotate) throw new Error("--json and --annotate are mutually exclusive");
  const pages = [...new Set(targets.flatMap((target) => markdownFiles(path.resolve(target))))].map((file) => ({
    file: path.relative(process.cwd(), file).split(path.sep).join("/"),
    ...analyzeMarkdown(fs.readFileSync(file, "utf8"), { includeLoose, minSentences }),
  })).sort((left, right) => comparePath(left.file, right.file));
  if (annotate) {
    const escape = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
    for (const page of pages) for (const entry of page.dense) {
      const sentence = entry.sentence.replace(/[\r\n]+/g, " ");
      const message = sentence.length > 200 ? `${sentence.slice(0, 199)}…` : sentence;
      const file = escape(page.file).replaceAll(":", "%3A").replaceAll(",", "%2C");
      const reason = escape(entry.reason).replaceAll(",", "%2C");
      console.log(`::warning file=${file},line=${entry.line},title=Dense enumeration (${reason})::${escape(message)}`);
    }
    return;
  }
  if (json) {
    console.log(JSON.stringify(pages, null, 2));
    return;
  }
  const ranked = pages.filter((page) => page.words >= minWords).sort((left, right) =>
    right.denseCount - left.denseCount || (right.saturation ?? -1) - (left.saturation ?? -1) || comparePath(left.file, right.file));
  console.log(`Inline enumeration heuristic (${includeLoose ? "strict + loose" : "strict only"}); >=${minWords} words; ${ranked.length}/${pages.length} pages eligible`);
  console.log("dense\tsat%\tlists\tlist-sents\tsents\twords\tfile");
  for (const page of ranked.slice(0, limit)) {
    console.log(`${page.denseCount}\t${page.saturation === null ? "-" : page.saturation.toFixed(2)}\t${page.enumerations}\t${page.enumeratedSentences}\t${page.sentences}\t${page.words}\t${page.file}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`enumeration_stats: ${error.message}`);
    process.exitCode = 1;
  }
}
