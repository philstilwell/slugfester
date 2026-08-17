#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import {
  POST_CANARY_BATCH_02_DISPUTE_ADJ_ISOLATION,
  POST_CANARY_BATCH_02_DISPUTE_ADJ_OUTPUT_VERSION,
  POST_CANARY_BATCH_02_DISPUTE_ADJ_PROTOCOL_ID,
  POST_CANARY_BATCH_02_DISPUTE_ADJ_ROOT,
  validatePostCanaryBatch02DisputeAdjudicationOutput
} from "./lib/assessment-production-post-canary-batch-02-dispute-adjudication.mjs";

const EXPECTED_DEBATES = ["103", "172", "04", "136", "83", "66", "126", "99", "93", "101"];
const EXPECTED_AUDIO = [
  "83:pro-modality-02",
  "83:con-initial-instant-event",
  "99:con-natural-emergent-spacetime",
  "99:con-physical-basis-more-parsimonious",
  "99:pro-deeper-laws-compatible-with-mind",
  "99:pro-fundamental-consciousness-ends-regress",
  "99:pro-neural-correlation-interface-model",
  "93:pro-foreknowledge-not-causation",
  "93:pro-christian-falsifiability",
  "101:pro-child-sacrifice-punishment-incoherence"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(
  await readFile(`${POST_CANARY_BATCH_02_DISPUTE_ADJ_ROOT}/preparation-manifest.json`, "utf8")
);

assert.equal(
  preparation.status,
  "prepared-ten-isolated-post-canary-batch-02-dispute-only-adjudication-contexts"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 2);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.deepEqual(preparation.contexts.map((item) => item.debateNumber), EXPECTED_DEBATES);
assert.equal(preparation.totals.contexts, 10);
assert.equal(preparation.totals.disputedMoves, 182);
assert.equal(preparation.totals.candidateSelections, 535);
assert.equal(preparation.totals.audioVerifiedMoves, 10);
assert.equal(preparation.totals.maximumCopiedInputBytes <= 350000, true);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.finalLedgersAssembled, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.scoreBlind, true);
assert.equal(preparation.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(preparation.acceptedSourceBoundary.allTwentyJudgmentsAccepted, true);
assert.equal(preparation.acceptedSourceBoundary.allTenAudioMovesVerified, true);
assert.equal(preparation.acceptedSourceBoundary.audioValidationOverlaysPreserved, 2);
assert.equal(preparation.acceptedSourceBoundary.additionalPaidCallsThisStage, 0);
assert.equal(preparation.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(preparation.authorization.executionPreparationManifest, true);
for (const [key, value] of Object.entries(preparation.authorization)) {
  if (key !== "executionPreparationManifest") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
for (const key of [
  "disputedFieldsOnly",
  "initialPassIdentitiesUnavailable",
  "initialPassRationalesUnavailable",
  "calculatedScoresUnavailable",
  "winnersUnavailable",
  "legacyAssessmentsUnavailable",
  "publicationProseUnavailable"
]) assert.equal(preparation.evidenceBoundary[key], true, key);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

const actualAudio = [];
for (const context of preparation.contexts) {
  const [packetBytes, provenanceBytes] = await Promise.all([
    readFile(context.packet),
    readFile(context.provenance)
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(provenanceBytes), context.provenanceSha256);
  const packetText = packetBytes.toString("utf8");
  const provenanceText = provenanceBytes.toString("utf8");
  const packet = JSON.parse(packetText);
  const provenance = JSON.parse(provenanceText);
  assert.equal(packet.productionCanary, false);
  assert.equal(packet.batchNumber, 2);
  assert.equal(packet.stagingOnly, true);
  assert.equal(packet.developmentValidationOnly, false);
  assert.equal(packet.disputedMoves.length, context.disputedMoves);
  assert.equal(packet.evidenceBoundary.calculatedScoresUnavailable, true);
  assert.equal(packetText.includes('"passA"'), false);
  assert.equal(packetText.includes('"passB"'), false);
  assert.equal(packetText.includes("Overall Commentary"), false);
  assert.equal(packetText.includes("AI Extension"), false);
  assert.equal(provenance.modelInput, false);
  assert.equal(
    provenanceText.includes('"passA"') || provenanceText.includes('"passB"'),
    true
  );
  assert.equal(
    packet.disputedMoves.filter((move) => move.evidence.audioVerification !== null).length,
    context.audioVerifiedMoves
  );
  assert.equal(context.audioTranscriptInputs.length, context.audioVerifiedMoves);
  for (const input of context.audioTranscriptInputs) {
    assert.equal(input.modelInputFile.endsWith(".json"), true);
    assert.equal(sha256(await readFile(input.sourcePath)), input.sha256);
    actualAudio.push(`${context.debateNumber}:${input.moveId}`);
  }

  const output = {
    schemaVersion: POST_CANARY_BATCH_02_DISPUTE_ADJ_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_02_DISPUTE_ADJ_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    developmentValidationOnly: false,
    isolation: structuredClone(POST_CANARY_BATCH_02_DISPUTE_ADJ_ISOLATION),
    moveDecisions: packet.disputedMoves.map((move) => ({
      moveId: move.moveId,
      importancePairChoice: move.candidates.importancePair ? 1 : null,
      attributionPairChoice: move.candidates.attributionPair ? 1 : null,
      responsePairChoice: move.candidates.responsePair ? 1 : null,
      charityPairChoice: move.candidates.charityPair ? 1 : null,
      assessmentConfidencePairChoice:
        move.candidates.assessmentConfidencePair ? 1 : null,
      scoringFieldChoices: Object.keys(move.candidates.scoringFields).map(
        (fieldKey) => ({ fieldKey, choice: 1 })
      ),
      rationale:
        "The selected candidate is better supported by the locked evidence for this disputed move."
    })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({
      side: item.side,
      choice: 1,
      rationale:
        "The selected candidate best follows the strict residual burden-adjustment exclusion rule."
    })),
    audit: {
      allDisputedMovesDecidedOnce: true,
      onlyCandidateValuesSelected: true,
      dependencyPairsKeptIndivisible: true,
      nondisputedFieldsUntouched: true,
      calculatedScoresAbsent: true,
      publicationProseAbsent: true
    }
  };
  const validation = validatePostCanaryBatch02DisputeAdjudicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  assert.equal(validation.disputedMoves, context.disputedMoves);
  assert.equal(validation.candidateSelections, context.candidateSelections);
  assert.equal(validation.calculatedScores, 0);
}
assert.deepEqual(actualAudio.sort(), [...EXPECTED_AUDIO].sort());
assert.deepEqual(
  (await readdir(`${POST_CANARY_BATCH_02_DISPUTE_ADJ_ROOT}/packets`)).sort(),
  EXPECTED_DEBATES.map((number) => `debate-${number}.json`).sort()
);
assert.deepEqual(
  (await readdir(`${POST_CANARY_BATCH_02_DISPUTE_ADJ_ROOT}/provenance`)).sort(),
  EXPECTED_DEBATES.map((number) => `debate-${number}.json`).sort()
);

console.log(JSON.stringify({
  status: "passed",
  contexts: 10,
  disputedMoves: 182,
  candidateSelections: 535,
  audioVerifiedMoves: 10,
  passIdentitiesInModelPackets: 0,
  syntheticCompilerValidations: 10,
  maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  finalLedgersAssembled: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
}, null, 2));
