#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211729_ROOT, buildV42211729FinalLedger, loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";

const manifestPath = `${V42211729_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath = `${V42211729_ROOT}/final-ledger.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(manifest.status === "frozen-five-debate-hard-route-deterministic-final-ledger-assembly" && manifest.authorization.finalLedgerAssembly && !manifest.authorization.scoreDerivation && !manifest.authorization.modelExecution && !manifest.authorization.paidApiCalls, "hard-route final-ledger manifest invalid");
await access(path.resolve(finalLedgerPath)).then(() => { throw new Error(`${finalLedgerPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen hard-route source hash mismatch`);
const inputs = await loadV42211729FinalLedgerInputs();
const ledger = buildV42211729FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV42211729FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
await writeFile(path.resolve(finalLedgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ ...validation, finalLedger: finalLedgerPath, modelContexts: 0, paidApiCalls: 0 }, null, 2));
