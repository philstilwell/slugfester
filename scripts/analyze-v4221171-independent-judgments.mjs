#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = process.env.SLUGFESTER_JUDGMENT_ROOT ?? "docs/calibration/v4.2.21.17/independent-judgment-three";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsAttempted === 6 && execution.retries === 0 && execution.scoresDerived === 0, "independent judgment execution incomplete or crossed its boundary");
const contexts = [];
for (const result of execution.results) {
  if (!result.accepted) {
    contexts.push({ debateNumber: result.debateNumber, reviewerPass: result.reviewerPass, accepted: false, status: result.status, elapsedMs: result.elapsedMs, failure: result.timedOut ? "timeout" : result.validationMessage ?? result.status });
    continue;
  }
  const context = manifest.contexts.find((item) => item.debateNumber === result.debateNumber && item.reviewerPass === result.reviewerPass);
  const [raw, validation] = await Promise.all([context.rawOutput, context.validationOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  contexts.push({ debateNumber: result.debateNumber, reviewerPass: result.reviewerPass, accepted: true, status: result.status, elapsedMs: result.elapsedMs, moves: raw.moves.length, lockedInventorySha256: result.lockedInventorySha256, mediumConfidenceMoves: validation.mediumConfidenceMoves, unchangedV4220ValidatorPassed: validation.unchangedV4220ValidatorPassed, semanticRepairPerformed: validation.semanticRepairPerformed, scoresDerived: validation.scoresDerived });
}
const pairs = ["133", "178", "182"].map((debateNumber) => {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  return { debateNumber, contexts: pair.length, bothAccepted: pair.length === 2 && pair.every((context) => context.accepted), sameLockedInventory: pair.length === 2 && pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256, mediumConfidenceMoves: [...new Set(pair.flatMap((context) => context.mediumConfidenceMoves ?? []))] };
});
const passed = execution.validContexts === 6 && contexts.every((context) => context.accepted && context.unchangedV4220ValidatorPassed && context.semanticRepairPerformed === false && context.scoresDerived === 0) && pairs.every((pair) => pair.bothAccepted && pair.sameLockedInventory);
const analysis = {
  schemaVersion: "4.2.21.17.1-independent-judgment-gate-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "six-independent-judgments-passed-disagreement-extraction-authorized" : "independent-judgment-gate-failed-analysis-only",
  calibrationOnly: true,
  AIOnly: true,
  execution: { contextsPlanned: 6, contextsAttempted: 6, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: 0, totalElapsedMs: execution.totalElapsedMs, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  contexts,
  pairs,
  acceptance: { sixValidContexts: execution.validContexts === 6, sameLockedInventoryEveryPair: pairs.every((pair) => pair.sameLockedInventory), unchangedV4220ValidatorPasses: contexts.filter((context) => context.unchangedV4220ValidatorPassed).length, semanticRepairs: 0, scores: 0, passed },
  authorization: { disagreementExtraction: passed, audioVerificationPreparation: false, adjudicationPreparation: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, execution: analysis.execution, pairs, acceptance: analysis.acceptance, authorization: analysis.authorization }, null, 2));
