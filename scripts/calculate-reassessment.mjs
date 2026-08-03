#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import {
  calculateV2Ledger,
  calculateV21Ledger,
  calculateV22Ledger
} from "./lib/reassessment-scoring.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const check = args.includes("--check");
const ledgerPath = args.find((argument) => !argument.startsWith("--"));

if (!ledgerPath || (write && check)) {
  console.error("Usage: node scripts/calculate-reassessment.mjs <ledger.json> [--write|--check]");
  process.exit(1);
}

const source = await readFile(ledgerPath, "utf8");
const input = JSON.parse(source);
const calculated =
  input.schemaVersion === "2.2"
    ? calculateV22Ledger(input)
    : input.schemaVersion === "2.1"
      ? calculateV21Ledger(input)
      : calculateV2Ledger(input);
const output = `${JSON.stringify(calculated, null, 2)}\n`;

if (check) {
  if (source !== output) {
    console.error(`${ledgerPath} contains stale or mismatched computed fields`);
    process.exit(1);
  }
  console.log(`Validated computed scores in ${ledgerPath}.`);
} else if (write) {
  await writeFile(ledgerPath, output);
  console.log(`Updated computed scores in ${ledgerPath}.`);
} else {
  process.stdout.write(output);
}
