#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";
import { deriveV42211730Scores, V42211730_ROOT } from "./lib/v42211730-hard-route-score-gate.mjs";

const manifestPath = `${V42211730_ROOT}/score-pass-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(manifest.status === "frozen-hard-route-single-deterministic-score-pass" && manifest.authorization.scoreDerivation && manifest.authorization.scorePassesMaximum === 1 && !manifest.authorization.workflowQualityAnalysis, "hard-route score manifest invalid");
const scoresPath = manifest.artifacts.calculatedScores;
await access(path.resolve(scoresPath)).then(() => { throw new Error(`${scoresPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen hard-route score source hash mismatch`);
const [ledger, inputs, productionModule] = await Promise.all([readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse), loadV42211729FinalLedgerInputs(), import(pathToFileURL(path.resolve(manifest.inputs.productionReference)).href)]);
validateV42211729FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const requiredNumbers = new Set(ledger.debates.map((debate) => debate.debateNumber));
const productionReferences = productionModule.debates.filter((debate) => requiredNumbers.has(debate.number)).map((debate) => ({ debateNumber: debate.number, pro: debate.score.pro, con: debate.score.con }));
assertV4(productionReferences.length === 5, "five production diagnostic references required");
const calculated = deriveV42211730Scores(ledger, inputs.debateInputs, productionReferences, { finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger], productionReferenceSha256: manifest.sourceHashes[manifest.inputs.productionReference] });
await writeFile(path.resolve(scoresPath), `${JSON.stringify(calculated, null, 2)}\n`);
console.log(JSON.stringify({ status: calculated.status, debates: calculated.debates.map((debate) => ({ debateNumber: debate.debateNumber, passA: { pro: debate.passA.overall.pro.score, con: debate.passA.overall.con.score, winner: debate.passA.winner }, passB: { pro: debate.passB.overall.pro.score, con: debate.passB.overall.con.score, winner: debate.passB.winner }, final: { pro: debate.final.overall.pro.score, con: debate.final.overall.con.score, winner: debate.final.winner }, productionDiagnostic: debate.productionReferenceDiagnosticOnly })), stability: calculated.stability, scoringPasses: 1, acceptancePassed: calculated.totals.acceptancePassed, nextAuthorized: "workflow-quality-analysis" }, null, 2));
