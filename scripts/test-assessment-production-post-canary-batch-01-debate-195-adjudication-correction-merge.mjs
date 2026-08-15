#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  validatePostCanaryBatch01DisputeAdjudicationOutput
} from "./lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication";
const CORRECTION_ROOT = `${ROOT}/correction-2`;
const originalOutputPath = `${ROOT}/outputs/debate-195.json`;
const correctionOutputPath = `${CORRECTION_ROOT}/correction-output.json`;
const mergedOutputPath = `${CORRECTION_ROOT}/merged-adjudication-output.json`;
const validationPath = `${CORRECTION_ROOT}/complete-adjudication-validation.json`;
const auditPath = `${CORRECTION_ROOT}/merge-audit.json`;
const analysisPath = `${CORRECTION_ROOT}/post-merge-analysis.json`;
const finalLedgerCandidates = [
  `${ROOT}/final-ledger.json`,
  `${ROOT}/final-ledgers`,
  `${CORRECTION_ROOT}/final-ledger.json`,
  `${CORRECTION_ROOT}/final-ledgers`
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [activation, originalBytes, correctionBytes, mergedBytes, validation,
  audit, analysis] = await Promise.all([
  readFile(`${ROOT}/execution-activation.json`, "utf8").then(JSON.parse),
  readFile(originalOutputPath),
  readFile(correctionOutputPath),
  readFile(mergedOutputPath),
  readFile(validationPath, "utf8").then(JSON.parse),
  readFile(auditPath, "utf8").then(JSON.parse),
  readFile(analysisPath, "utf8").then(JSON.parse)
]);
const original = JSON.parse(originalBytes);
const correction = JSON.parse(correctionBytes);
const merged = JSON.parse(mergedBytes);

assert.equal(audit.status, "passed-frozen");
assert.equal(audit.userAuthorization.instruction, "You have approval.");
assert.equal(audit.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(audit.userAuthorization.deterministicMerge, true);
assert.equal(audit.userAuthorization.modelExecution, false);
assert.equal(audit.userAuthorization.paidServices, false);
assert.equal(audit.userAuthorization.finalLedgerAssembly, false);
assert.equal(audit.userAuthorization.scoreDerivation, false);
assert.equal(audit.inputs.originalRawAdjudicationOutput.sha256, sha256(originalBytes));
assert.equal(audit.inputs.acceptedCorrectionOutput.sha256, sha256(correctionBytes));
assert.equal(audit.output.sha256, sha256(mergedBytes));
assert.deepEqual(
  audit.transformation.authorizedRootFieldsChanged,
  ["burdenAdjustmentDecisions"]
);
assert.deepEqual(audit.transformation.immutableRootFieldsChanged, []);
assert.equal(audit.transformation.moveDecisionsBefore, 18);
assert.equal(audit.transformation.moveDecisionsAfter, 18);
assert.equal(
  audit.transformation.moveDecisionsSha256Before,
  audit.transformation.moveDecisionsSha256After
);
assert.equal(audit.transformation.originalRawOutputBytesModified, false);
assert.equal(audit.transformation.correctionRawOutputBytesModified, false);
assert.equal(audit.totals.modelContextsThisStage, 0);
assert.equal(audit.totals.paidServiceCallsThisStage, 0);
assert.equal(audit.totals.deterministicMergesThisStage, 1);
assert.equal(audit.totals.finalLedgersAssembledThisStage, 0);
assert.equal(audit.totals.scoresDerivedThisStage, 0);
assert.equal(audit.totals.directIncrementalCostUsd, 0);
assert.equal(Object.values(audit.downstreamAuthorization).every((value) => value === false), true);
for (const [file, digest] of Object.entries(audit.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

assert.equal(original.moveDecisions.length, 18);
assert.equal(original.burdenAdjustmentDecisions.length, 0);
assert.equal(correction.burdenAdjustmentDecisions.length, 2);
assert.equal(merged.moveDecisions.length, 18);
assert.equal(merged.burdenAdjustmentDecisions.length, 2);
assert.deepEqual(
  merged.burdenAdjustmentDecisions,
  correction.burdenAdjustmentDecisions
);
assert.equal(
  canonicalJson(merged.moveDecisions),
  canonicalJson(original.moveDecisions)
);
const originalRootKeys = Object.keys(original).sort();
assert.deepEqual(Object.keys(merged).sort(), originalRootKeys);
assert.deepEqual(
  originalRootKeys.filter(
    (key) => canonicalJson(original[key]) !== canonicalJson(merged[key])
  ),
  ["burdenAdjustmentDecisions"]
);

const packet = JSON.parse(
  await readFile(`${ROOT}/packets/debate-195.json`, "utf8")
);
const debate195Replay = validatePostCanaryBatch01DisputeAdjudicationOutput(
  merged,
  packet
);
assert.equal(debate195Replay.status, "passed");
assert.equal(debate195Replay.disputedMoves, 18);
assert.equal(merged.burdenAdjustmentDecisions.length, 2);
assert.equal(debate195Replay.candidateSelections, 43);
assert.equal(debate195Replay.calculatedScores, 0);
assert.equal(validation.status, "passed");
assert.equal(validation.outputSha256, sha256(mergedBytes));
assert.equal(validation.moveDecisions, 18);
assert.equal(validation.burdenAdjustmentDecisions, 2);
assert.equal(validation.candidateSelections, 43);
assert.equal(validation.calculatedScores, 0);
assert.deepEqual(validation.immutableRootFieldsChanged, []);
assert.equal(validation.originalRawOutputPreserved, true);
assert.equal(validation.correctionRawOutputPreserved, true);
assert.equal(validation.finalLedgerAssembled, false);

assert.equal(
  analysis.status,
  "post-canary-batch-01-dispute-only-adjudication-gate-passed-after-debate-195-deterministic-correction-awaiting-separate-final-ledger-assembly-approval"
);
assert.equal(analysis.contexts.length, 10);
assert.deepEqual(
  analysis.contexts.map((context) => context.debateNumber),
  ["31", "94", "52", "146", "91", "175", "75", "72", "13", "195"]
);
assert.equal(analysis.gate.passed, true);
assert.equal(analysis.gate.semanticPass, true);
assert.equal(analysis.gate.timingPass, true);
assert.equal(analysis.gate.scoreBlindPass, true);
assert.equal(analysis.gate.isolationPass, true);
assert.equal(analysis.gate.preservationPass, true);
assert.equal(analysis.gate.validContexts, 10);
assert.equal(analysis.gate.disputedMovesDecided, 169);
assert.equal(analysis.gate.candidateSelections, 461);
assert.equal(analysis.gate.finalLedgersAssembled, 0);
assert.equal(analysis.gate.scoresDerived, 0);
assert.equal(analysis.debate195.status, "completed-valid-after-deterministic-correction-merge");
assert.equal(analysis.debate195.moveDecisions, 18);
assert.equal(analysis.debate195.burdenAdjustmentDecisions, 2);
assert.equal(analysis.debate195.candidateSelections, 43);
assert.equal(analysis.debate195.calculatedScores, 0);
assert.equal(analysis.totals.modelContextsThisStage, 0);
assert.equal(analysis.totals.paidServiceCallsThisStage, 0);
assert.equal(analysis.totals.finalLedgersAssembledThisStage, 0);
assert.equal(analysis.totals.scoresDerivedThisStage, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);
assert.equal(Object.values(analysis.authorization).every((value) => value === false), true);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-approval-required-before-batch-01-deterministic-final-ledger-assembly"
);

let totalMoves = 0;
let totalSelections = 0;
for (const context of activation.contexts) {
  const contextOutput =
    context.debateNumber === "195"
      ? merged
      : JSON.parse(await readFile(context.output, "utf8"));
  const contextPacket = JSON.parse(await readFile(context.packet, "utf8"));
  const replay = validatePostCanaryBatch01DisputeAdjudicationOutput(
    contextOutput,
    contextPacket
  );
  assert.equal(replay.status, "passed", `${context.debateNumber}: replay failed`);
  assert.equal(replay.calculatedScores, 0);
  totalMoves += replay.disputedMoves;
  totalSelections += replay.candidateSelections;
}
assert.equal(totalMoves, 169);
assert.equal(totalSelections, 461);
for (const candidate of finalLedgerCandidates) {
  assert.equal(await exists(candidate), false, `unauthorized final-ledger artifact: ${candidate}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed-frozen",
      debateNumber: "195",
      moveDecisionsPreserved: 18,
      burdenAdjustmentDecisionsMerged: 2,
      debate195CandidateSelections: 43,
      batchValidContexts: 10,
      batchDisputedMoves: totalMoves,
      batchCandidateSelections: totalSelections,
      modelContextsThisStage: 0,
      paidServiceCallsThisStage: 0,
      finalLedgersAssembled: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
