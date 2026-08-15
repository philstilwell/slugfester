#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT,
  buildPostCanaryBatch01FinalLedger,
  loadPostCanaryBatch01FinalLedgerInputs,
  validatePostCanaryBatch01FinalLedger
} from "./lib/assessment-production-post-canary-batch-01-final-ledger.mjs";

const manifestPath =
  `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const ledgerPath = `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/analysis.json`;
const scoreArtifactCandidates = [
  `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/calculated-scores.json`,
  `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/score-analysis.json`,
  `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/score-pass-manifest.json`
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [manifest, storedLedger, analysis] = await Promise.all(
  [manifestPath, ledgerPath, analysisPath].map((file) =>
    readFile(path.resolve(file), "utf8").then(JSON.parse)
  )
);
assert.equal(
  manifest.status,
  "frozen-ten-debate-post-canary-batch-01-deterministic-final-ledger-assembly"
);
assert.equal(manifest.userAuthorization.instruction, "I approve.");
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.userAuthorization.finalLedgerAssembly, true);
assert.equal(manifest.userAuthorization.modelExecution, false);
assert.equal(manifest.userAuthorization.paidServices, false);
assert.equal(manifest.userAuthorization.scoreDerivation, false);
assert.equal(manifest.authorization.finalLedgerAssembly, true);
assert.equal(manifest.authorization.deterministicValidation, true);
assert.equal(manifest.authorization.modelExecution, false);
assert.equal(manifest.authorization.paidServices, false);
assert.equal(manifest.authorization.scorePassManifestPreparation, false);
assert.equal(manifest.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `source hash mismatch: ${file}`
  );
}

const inputs = await loadPostCanaryBatch01FinalLedgerInputs();
const rebuiltLedger = buildPostCanaryBatch01FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
assert.deepEqual(storedLedger, rebuiltLedger);
const validation = validatePostCanaryBatch01FinalLedger(
  storedLedger,
  inputs.debateInputs,
  inputs.sourceHashes
);
assert.equal(validation.status, "passed");
assert.equal(storedLedger.debates.length, 10);
assert.deepEqual(
  storedLedger.debates.map((debate) => debate.debateNumber),
  ["31", "94", "52", "146", "91", "175", "75", "72", "13", "195"]
);
assert.equal(storedLedger.audit.finalMoves, 177);
assert.equal(storedLedger.audit.disputedMoves, 169);
assert.equal(storedLedger.audit.pairSelections, 183);
assert.equal(storedLedger.audit.scoringFieldSelections, 258);
assert.equal(storedLedger.audit.burdenAdjustmentSelections, 20);
assert.equal(storedLedger.audit.candidateSelections, 461);
assert.equal(storedLedger.audit.meanMerges, 370);
assert.equal(storedLedger.audit.dependencyMeanMergesSuppressed, 0);
assert.equal(storedLedger.audit.audioVerifiedMoves, 3);
assert.equal(storedLedger.audit.correctedDebate195AdjudicationReplay, true);
assert.equal(storedLedger.audit.modelContextsThisStage, 0);
assert.equal(storedLedger.audit.paidServiceCallsThisStage, 0);
assert.equal(storedLedger.audit.calculatedScores, 0);
assert.equal(storedLedger.audit.directIncrementalCostUsd, 0);
assert.equal(
  Object.values(storedLedger.authorization).every((value) => value === false),
  true
);
assert.equal(validation.scoreDerivationAuthorized, false);
const debate195 = storedLedger.debates.find(
  (debate) => debate.debateNumber === "195"
);
assert.equal(debate195.mergeAudit.correctedAdjudicationOutputUsed, true);
assert.equal(
  debate195.mergeAudit.adjudicationOutputPath,
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-2/merged-adjudication-output.json"
);
assert.equal(debate195.mergeAudit.disputedMoves, 18);
assert.equal(debate195.mergeAudit.burdenAdjustmentSelections.length, 2);
assert.equal(debate195.mergeAudit.calculatedScores, 0);
assert.equal(
  storedLedger.debates.filter(
    (debate) => debate.mergeAudit.correctedAdjudicationOutputUsed
  ).length,
  1
);

const mutatedLedger = structuredClone(storedLedger);
mutatedLedger.debates[0].finalJudgment.moves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() =>
  validatePostCanaryBatch01FinalLedger(
    mutatedLedger,
    inputs.debateInputs,
    inputs.sourceHashes
  )
);
const mutatedInputs = structuredClone(inputs.debateInputs);
const firstDisputed = mutatedInputs[0].adjudicationPacket.disputedMoves.find(
  (move) => move.candidates.responsePair
);
const mapping =
  mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair;
mutatedInputs[0].provenance.mappings.moves[
  firstDisputed.moveId
].responsePair = {
  candidate1: mapping.candidate2,
  candidate2: mapping.candidate1
};
assert.throws(() =>
  buildPostCanaryBatch01FinalLedger(mutatedInputs, inputs.sourceHashes)
);

assert.equal(
  analysis.status,
  "post-canary-batch-01-deterministic-final-ledger-gate-passed"
);
assert.equal(analysis.validation.status, "passed");
assert.equal(analysis.integrity.rawAdjudicationOutputsPreserved, true);
assert.equal(analysis.integrity.modelScoresPresent, false);
assert.equal(analysis.integrity.repositoryScoresPresent, false);
assert.equal(analysis.totals.debates, 10);
assert.equal(analysis.totals.finalMoves, 177);
assert.equal(analysis.totals.disputedMoves, 169);
assert.equal(analysis.totals.candidateSelections, 461);
assert.equal(analysis.totals.finalLedgersAssembled, 10);
assert.equal(analysis.totals.modelContextsThisStage, 0);
assert.equal(analysis.totals.paidServiceCallsThisStage, 0);
assert.equal(analysis.totals.calculatedScores, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);
assert.equal(
  Object.values(analysis.authorization).every((value) => value === false),
  true
);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-approval-required-before-batch-01-single-deterministic-score-pass-preparation"
);
for (const file of scoreArtifactCandidates) {
  assert.equal(await exists(file), false, `unauthorized score artifact: ${file}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed-frozen",
      debates: 10,
      finalMoves: storedLedger.audit.finalMoves,
      disputedMoves: storedLedger.audit.disputedMoves,
      candidateSelections: storedLedger.audit.candidateSelections,
      roundedMeanPopulation:
        storedLedger.audit.meanMerges +
        storedLedger.audit.dependencyMeanMergesSuppressed,
      audioVerifiedMoves: storedLedger.audit.audioVerifiedMoves,
      correctedDebate195AdjudicationReplay: true,
      deterministicReplayMutationRejected: true,
      provenanceMutationRejected: true,
      modelContextsThisStage: 0,
      paidServiceCallsThisStage: 0,
      calculatedScores: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
