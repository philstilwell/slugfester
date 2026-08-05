#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { buildV416FinalLedger, loadV416FinalLedgerInputs, validateV416FinalLedger, V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";

const finalLedgerPath = `${V416_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifest = await readJson(`${V416_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`);
assertV4(manifest.status === "frozen-deterministic-final-ledger-assembly" && manifest.authorization.finalLedgerAssembly && !manifest.authorization.scoreDerivation, "final-ledger manifest invalid");
await access(path.resolve(finalLedgerPath)).then(() => { throw new Error(`${finalLedgerPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen source hash mismatch`);
const { debateInputs, sourceHashes } = await loadV416FinalLedgerInputs();
const ledger = buildV416FinalLedger(debateInputs, sourceHashes);
const validation = validateV416FinalLedger(ledger, debateInputs, sourceHashes);
await writeFile(path.resolve(finalLedgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: validation.status, finalLedger: finalLedgerPath, debates: validation.debates, disputedMoves: validation.disputedMoves, candidateSelections: validation.candidateSelections, roundedMeanMerges: validation.roundedMeanMerges, dependencyMeanMergesSuppressed: validation.dependencyMeanMergesSuppressed, calculatedScores: 0, scoreDerivationAuthorized: validation.scoreDerivationAuthorized }, null, 2));
