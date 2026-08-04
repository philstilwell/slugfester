#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, canonicalJson, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";
import { V388_ADJUDICATION_ROOT, makeV388AdjudicationSchema, validateV388AdjudicationOutput } from "./lib/v388-performance-adjudication.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const same = (actual, expected, label) => assertV388(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);

function validateSchemaSubset(node, label = "schema") {
  if (Array.isArray(node)) return node.forEach((item, index) => validateSchemaSubset(item, `${label}[${index}]`));
  if (!node || typeof node !== "object") return;
  assertV388(!Object.hasOwn(node, "uniqueItems"), `${label}: uniqueItems unsupported`);
  if (node.type === "object") {
    assertV388(node.additionalProperties === false, `${label}: object must close additional properties`);
    assertV388(Array.isArray(node.required) && canonicalJson([...node.required].sort()) === canonicalJson(Object.keys(node.properties).sort()), `${label}: every object property must be required`);
  }
  for (const [key, value] of Object.entries(node)) validateSchemaSubset(value, `${label}.${key}`);
}

const preparation = await readJson(`${V388_ADJUDICATION_ROOT}/preparation-audit.json`);
const disagreements = await readJson(`${V388_PERFORMANCE_ROOT}/initial-disagreements.json`);
const audioAudit = await readJson(`${V388_PERFORMANCE_ROOT}/audio-verification.json`);
const schema = await readJson(preparation.sharedSchemaPath);
same(schema, makeV388AdjudicationSchema(), "serialized adjudication schema");
validateSchemaSubset(schema);
assertV388(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.contexts === 3 && preparation.disputedMoves === 76 && preparation.responseTupleChoices === 34 && preparation.charityPairChoices === 6 && preparation.ratingChoices === 184 && preparation.burdenAdjustmentChoices === 6, "preparation summary invalid");
assertV388(preparation.dependencyClosure.initialExposedRatingFields === 188 && preparation.dependencyClosure.exposedCharityRatingsAbsorbedIntoCompoundPairs === 4 && preparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant === 2, "dependency closure invalid");
assertV388(preparation.audioVerifiedDisputedMoves === 16 && preparation.candidateValuesInvented === 0 && preparation.calculatedScores === 0 && preparation.authorization.freezeAdjudicationExecutionManifest && !preparation.authorization.adjudicationModelExecution && !preparation.authorization.scoreDerivation, "preparation boundary invalid");
assertV388(sha256(await bytes(preparation.sharedSchemaPath)) === preparation.sharedSchemaSha256, "shared schema hash mismatch");

const audioByMoveId = new Map(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
let dryValidated = 0;
let checkedMoves = 0;

for (const packetAudit of preparation.packetAudits) {
  assertV388(sha256(await bytes(packetAudit.packetPath)) === packetAudit.packetSha256, `${packetAudit.debateNumber}: packet hash mismatch`);
  const packet = await readJson(packetAudit.packetPath);
  const disagreement = disagreements.debates.find((item) => item.debateNumber === packet.debateNumber);
  const lockedPacket = await readJson(`${V388_PERFORMANCE_ROOT}/packets/debate-${packet.debateNumber}.json`);
  const passA = await readJson(`${recoveryRoot}/normalized/outputs/debate-${packet.debateNumber}-pass-a.json`);
  const passB = await readJson(`${recoveryRoot}/normalized/outputs/debate-${packet.debateNumber}-pass-b.json`);
  validateV388PerformanceOutput(passA, lockedPacket, "A");
  validateV388PerformanceOutput(passB, lockedPacket, "B");
  assertV388(packet.evidenceBoundary.disputedFieldsOnly && packet.evidenceBoundary.nondisputedPerformanceFieldsUnavailable && packet.evidenceBoundary.initialPassRationalesUnavailable && packet.evidenceBoundary.fullInitialOutputsUnavailable && packet.evidenceBoundary.calculatedScoresUnavailable && packet.evidenceBoundary.mediumConfidenceMovesRequireAudioVerification, `${packet.debateNumber}: evidence boundary invalid`);
  assertV388(packet.disputedMoves.length === disagreement.moveDisputes.length, `${packet.debateNumber}: disputed move count mismatch`);

  for (let index = 0; index < packet.disputedMoves.length; index += 1) {
    const prepared = packet.disputedMoves[index];
    const extracted = disagreement.moveDisputes[index];
    assertV388(prepared.moveId === extracted.moveId && prepared.moveIndex === extracted.moveIndex, `${packet.debateNumber}:${index}: move order mismatch`);
    const lockedMove = lockedPacket.moves[prepared.moveIndex];
    same(prepared.evidence.proposition, lockedMove.proposition, `${prepared.moveId}: proposition`);
    same(prepared.evidence.atomicExcerpt, lockedMove.atomicExcerpt, `${prepared.moveId}: atomic excerpt`);
    same(prepared.evidence.contextWindow, lockedMove.contextWindow, `${prepared.moveId}: context window`);
    same(prepared.evidence.responseTargets, lockedMove.responseTargets, `${prepared.moveId}: response targets`);
    same(prepared.candidates.responseTuple, extracted.disputedFields.responseTuple, `${prepared.moveId}: response candidates`);
    const expectedRatings = structuredClone(extracted.disputedFields.ratings);
    if (extracted.disputedFields.charityTested !== null) delete expectedRatings.representationalCharity;
    same(prepared.candidates.ratings, expectedRatings, `${prepared.moveId}: rating candidates`);
    if (extracted.disputedFields.charityTested === null) assertV388(prepared.candidates.charityPair === null, `${prepared.moveId}: unexpected charity pair`);
    else {
      const judgmentA = passA.moveJudgments[prepared.moveIndex];
      const judgmentB = passB.moveJudgments[prepared.moveIndex];
      same(prepared.candidates.charityPair.candidate1, { charityTested: judgmentA.charityTested, representationalCharity: judgmentA.ratings.representationalCharity.value }, `${prepared.moveId}: charity candidate1`);
      same(prepared.candidates.charityPair.candidate2, { charityTested: judgmentB.charityTested, representationalCharity: judgmentB.ratings.representationalCharity.value }, `${prepared.moveId}: charity candidate2`);
    }
    const audio = audioByMoveId.get(prepared.moveId);
    if (!audio) assertV388(prepared.evidence.audioVerification === null, `${prepared.moveId}: unexpected audio verification`);
    else {
      assertV388(prepared.evidence.audioVerification.status === audio.verificationStatus && prepared.evidence.audioVerification.clipSha256 === audio.clipSha256 && prepared.evidence.audioVerification.transcriptSha256 === audio.transcriptSha256 && prepared.evidence.audioVerification.audioDerivedTranscript === audio.audioDerivedTranscript, `${prepared.moveId}: audio verification mismatch`);
    }
    checkedMoves += 1;
  }

  const fixture = {
    schemaVersion: "3.8.8-performance-adjudication-output",
    protocolId: "v3.8.8-performance-judgment-consensus",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "performance-adjudicator",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: {
      initialPassIdentityUnavailable: true,
      candidateOrderingAnonymous: true,
      nondisputedFieldsUnavailable: true,
      legacyAssessmentsUnavailable: true,
      calculatedScoresUnavailable: true,
      winnerLabelsUnavailable: true,
      assessmentProseUnavailable: true,
      contaminationDetected: false,
    },
    moveDecisions: packet.disputedMoves.map((move) => ({
      moveId: move.moveId,
      responseTupleChoice: move.candidates.responseTuple === null ? null : 1,
      charityPairChoice: move.candidates.charityPair === null ? null : 1,
      ratingChoices: Object.keys(move.candidates.ratings).map((ratingKey) => ({ ratingKey, choice: 1 })),
      rationale: "Synthetic preparation fixture selects candidate one solely to validate the closed decision shape.",
    })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({ side: item.side, choice: 1, rationale: "Synthetic preparation fixture selects candidate one solely to validate the closed decision shape." })),
    audit: {
      allDisputedMovesDecidedOnce: true,
      onlyCandidateValuesSelected: true,
      nondisputedFieldsUntouched: true,
      calculatedScoresAbsent: true,
      publicationProseAbsent: true,
    },
  };
  const dry = validateV388AdjudicationOutput(fixture, packet);
  assertV388(dry.status === "passed" && dry.calculatedScores === 0, `${packet.debateNumber}: dry fixture failed`);
  dryValidated += 1;
}

assertV388(checkedMoves === 76 && dryValidated === 3, "preparation validator coverage incomplete");
console.log(JSON.stringify({ status: "passed", sharedSchemaSubsetLintPassed: true, packetsValidated: 3, disputedMovesValidated: checkedMoves, syntheticDecisionFixturesValidated: dryValidated, dependencyAddedCharityRatings: 2, audioVerifiedDisputedMoves: 16, candidateValuesInvented: 0, calculatedScores: 0, freezeAdjudicationExecutionManifestAuthorized: true, adjudicationModelExecutionAuthorized: false, scoreDerivationAuthorized: false }, null, 2));
