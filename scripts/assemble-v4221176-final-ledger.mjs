#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221176_ROOT, buildV4221176FinalLedger, loadV4221176FinalLedgerInputs, validateV4221176FinalLedger } from "./lib/v4221176-final-ledger.mjs";

const manifestPath = `${V4221176_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath = `${V4221176_ROOT}/final-ledger.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(manifest.status === "frozen-deterministic-final-ledger-assembly" && manifest.authorization.finalLedgerAssembly && !manifest.authorization.scoreDerivation, "final-ledger manifest invalid");
await access(path.resolve(finalLedgerPath)).then(() => { throw new Error(`${finalLedgerPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen source hash mismatch`);
const inputs = await loadV4221176FinalLedgerInputs();
const ledger = buildV4221176FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV4221176FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
await writeFile(path.resolve(finalLedgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ ...validation, finalLedger: finalLedgerPath }, null, 2));
