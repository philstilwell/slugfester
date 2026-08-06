#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221176_PROTOCOL_ID, V4221176_ROOT, buildV4221176FinalLedger, loadV4221176FinalLedgerInputs, validateV4221176FinalLedger } from "./lib/v4221176-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V4221176_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${V4221176_ROOT}/final-ledger.json`;
const analysisPath = `${V4221176_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, ledgerPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const inputs = await loadV4221176FinalLedgerInputs();
const preview = buildV4221176FinalLedger(inputs.debateInputs, inputs.sourceHashes);
validateV4221176FinalLedger(preview, inputs.debateInputs, inputs.sourceHashes);
const sourceFiles = [...inputs.sourcePaths, "scripts/lib/v4221176-final-ledger.mjs", "scripts/preregister-v4221176-final-ledger.mjs", "scripts/assemble-v4221176-final-ledger.mjs", "scripts/analyze-v4221176-final-ledger.mjs", "scripts/test-v4221176-final-ledger.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = { schemaVersion: "4.2.21.17.6-final-ledger-assembly-manifest", protocolId: V4221176_PROTOCOL_ID, status: "frozen-deterministic-final-ledger-assembly", frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), calibrationOnly: true, AIOnly: true, expected: { debates: 3, disputedMoves: 53, candidateSelections: 172, roundedMeanPopulation: 106, audioVerifiedMoves: 2, calculatedScores: 0 }, sourceHashes, artifacts: { finalLedger: ledgerPath, analysis: analysisPath }, authorization: { finalLedgerAssembly: true, scoreDerivation: false, modelExecution: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) { await mkdir(path.resolve(V4221176_ROOT), { recursive: true }); await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", expected: manifest.expected, modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
