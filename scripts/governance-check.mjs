#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components", "lib"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const ignorePathSubstrings = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}scripts${path.sep}`,
  `${path.sep}lib${path.sep}tokn-constants.ts`,
  `${path.sep}lib${path.sep}codegen.ts`,
  `${path.sep}app${path.sep}api${path.sep}workspaces${path.sep}`,
];

const rules = [
  {
    id: "duration-literal",
    description: "Hardcoded duration literal found (prefer token reference).",
    regex: /\bduration\s*:\s*\d+(?:\.\d+)?\b/g,
  },
  {
    id: "delay-literal",
    description: "Hardcoded delay literal found (prefer token reference).",
    regex: /\bdelay\s*:\s*\d+(?:\.\d+)?\b/g,
  },
  {
    id: "ease-literal",
    description: "Hardcoded easing literal found (prefer token reference).",
    regex: /\bease\s*:\s*["'`](?:ease|linear|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]*\))["'`]/g,
  },
  {
    id: "css-transition-ms",
    description: "Hardcoded CSS transition milliseconds found (prefer tokenized variable).",
    regex: /transition[^;\n]*\b\d+ms\b/g,
  },
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (ignorePathSubstrings.some((part) => fullPath.includes(part))) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!allowedExtensions.has(path.extname(entry.name))) continue;
    files.push(fullPath);
  }
  return files;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

async function main() {
  const findings = [];
  for (const relRoot of scanRoots) {
    const absRoot = path.join(root, relRoot);
    try {
      const stat = await fs.stat(absRoot);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    const files = await walk(absRoot);
    for (const filePath of files) {
      const content = await fs.readFile(filePath, "utf8");
      for (const rule of rules) {
        for (const match of content.matchAll(rule.regex)) {
          const idx = match.index ?? 0;
          const line = lineOf(content, idx);
          const excerpt = match[0].slice(0, 140);
          findings.push({
            file: path.relative(root, filePath),
            line,
            rule: rule.id,
            description: rule.description,
            excerpt,
          });
        }
      }
    }
  }

  if (findings.length === 0) {
    console.log("Governance check: no hardcoded motion findings.");
    process.exit(0);
  }

  console.log(`Governance check: ${findings.length} finding(s).`);
  for (const finding of findings.slice(0, 200)) {
    console.log(
      `${finding.file}:${finding.line} [${finding.rule}] ${finding.description} -> ${finding.excerpt}`,
    );
  }

  if (findings.length > 200) {
    console.log(`... ${findings.length - 200} more findings omitted.`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error("Governance check failed unexpectedly:", error);
  process.exit(2);
});
