#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221176_ROOT, loadV4221176FinalLedgerInputs, validateV4221176FinalLedger } from "./lib/v4221176-final-ledger.mjs";
import { deriveV4221177Scores } from "./lib/v4221177-score-gate.mjs";

const manifestPath = `${V4221176_ROOT}/score-pass-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(manifest.status === "frozen-single-deterministic-score-pass" && manifest.authorization.scoreDerivation && manifest.authorization.scorePassesMaximum === 1 && !manifest.authorization.workflowQualityAnalysis, "score manifest invalid");
const scoresPath = manifest.artifacts.calculatedScores;
await access(path.resolve(scoresPath)).then(() => { throw new Error(`${scoresPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen source hash mismatch`);
const [ledger, inputs, productionModule] = await Promise.all([readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse), loadV4221176FinalLedgerInputs(), import(pathToFileURL(path.resolve(manifest.inputs.productionReference)).href)]);
validateV4221176FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const requiredNumbers = new Set(ledger.debates.map((debate) => debate.debateNumber));
const productionReferences = productionModule.debates.filter((debate) => requiredNumbers.has(debate.number)).map((debate) => ({ debateNumber: debate.number, pro: debate.score.pro, con: debate.score.con }));
assertV4(productionReferences.length === 3, "three production diagnostic references required");
const calculated = deriveV4221177Scores(ledger, inputs.debateInputs, productionReferences, { finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger], productionReferenceSha256: manifest.sourceHashes[manifest.inputs.productionReference] });
await writeFile(path.resolve(scoresPath), `${JSON.stringify(calculated, null, 2)}\n`);
console.log(JSON.stringify({ status: calculated.status, debates: calculated.debates.map((debate) => ({ debateNumber: debate.debateNumber, passA: { pro: debate.passA.overall.pro.score, con: debate.passA.overall.con.score, winner: debate.passA.winner }, passB: { pro: debate.passB.overall.pro.score, con: debate.passB.overall.con.score, winner: debate.passB.winner }, final: { pro: debate.final.overall.pro.score, con: debate.final.overall.con.score, winner: debate.final.winner }, productionDiagnostic: debate.productionReferenceDiagnosticOnly })), stability: calculated.stability, scoringPasses: 1, acceptancePassed: calculated.totals.acceptancePassed, nextAuthorized: "workflow-quality-analysis" }, null, 2));
