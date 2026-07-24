#!/usr/bin/env node
// Compares PR coverage/coverage-summary.json against a baseline summary from main.
// Fails (exit 1) if any metric (lines, statements, functions, branches) drops.
import { readFileSync, existsSync } from "node:fs";

const BASELINE_PATH = process.argv[2] ?? "baseline-coverage/coverage-summary.json";
const CURRENT_PATH = process.argv[3] ?? "coverage/coverage-summary.json";
const METRICS = ["lines", "statements", "functions", "branches"];

if (!existsSync(BASELINE_PATH)) {
  console.log(
    `No baseline coverage found at ${BASELINE_PATH} (first run on main?) — skipping gate.`,
  );
  process.exit(0);
}
if (!existsSync(CURRENT_PATH)) {
  console.error(`No current coverage found at ${CURRENT_PATH}. Did 'pnpm test:coverage' run?`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")).total;
const current = JSON.parse(readFileSync(CURRENT_PATH, "utf-8")).total;

let failed = false;
const rows = [];

for (const metric of METRICS) {
  const basePct = baseline[metric].pct;
  const currPct = current[metric].pct;
  const delta = currPct - basePct;
  const ok = delta >= 0;
  if (!ok) failed = true;
  rows.push(
    `${ok ? "✅" : "❌"} ${metric.padEnd(11)} ${basePct.toFixed(2)}% -> ${currPct.toFixed(2)}% (${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%)`,
  );
}

console.log("Coverage comparison vs main:\n" + rows.join("\n"));

if (failed) {
  console.error(
    "\nCoverage regression detected. This PR lowers test coverage — add tests before merging.",
  );
  process.exit(1);
}

console.log("\nCoverage did not regress.");
