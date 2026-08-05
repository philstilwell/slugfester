#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { loadV416FinalLedgerInputs, validateV416FinalLedger, V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";
import { deriveV416Scores } from "./lib/v416-score-gate.mjs";

const manifest = await readJson(`${V416_FINAL_LEDGER_ROOT}/score-derivation-manifest.json`);
assertV4(manifest.status === "frozen-single-deterministic-score-pass" && manifest.authorization.scoreDerivation && !manifest.authorization.publicationFinalization, "score manifest invalid");
const scoresPath = manifest.artifacts.calculatedScores;
await access(path.resolve(scoresPath)).then(() => { throw new Error(`${scoresPath} already exists`); }, () => true);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === expected, `${file}: frozen source hash mismatch`);
const [ledger, comparator, inputs] = await Promise.all([readJson(manifest.inputs.finalLedger), readJson(manifest.inputs.retiredComparator), loadV416FinalLedgerInputs()]);
validateV416FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const calculated = deriveV416Scores(ledger, comparator, { finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger], comparatorSha256: manifest.sourceHashes[manifest.inputs.retiredComparator] });
await writeFile(path.resolve(scoresPath), `${JSON.stringify(calculated, null, 2)}\n`);
console.log(JSON.stringify({ status: calculated.status, debates: 3, sides: 6, scores: calculated.debates.map((debate) => ({ debateNumber: debate.debateNumber, pro: debate.scores.overall.pro.score, con: debate.scores.overall.con.score, winner: debate.scores.winner, expectedPro: debate.comparator.expected.pro, expectedCon: debate.comparator.expected.con, maximumAbsoluteDelta: debate.comparator.maximumAbsoluteDelta, winnerPreserved: debate.comparator.winnerPreserved })), winnerClassificationsPreserved: calculated.totals.winnerClassificationsPreserved, sidesWithinFive: calculated.totals.sidesWithinFive, maximumAbsoluteDelta: calculated.totals.maximumAbsoluteDelta, acceptancePassed: calculated.totals.acceptancePassed, publicationFinalizationAuthorized: calculated.authorization.publicationFinalization }, null, 2));
