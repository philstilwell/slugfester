#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V3811_PERFORMANCE_ROOT, assertV3811, canonicalJson, validateV3811PerformanceOutput } from "./lib/v3811-performance-judgment.mjs";
import { V3811_ADJUDICATION_ROOT, makeV3811AdjudicationSchema, validateV3811AdjudicationOutput } from "./lib/v3811-performance-adjudication.mjs";

const root = process.cwd();
const initialOutputsRoot = `${V3811_PERFORMANCE_ROOT}/initial-outputs`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const same = (actual, expected, label) => assertV3811(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);

function validateSchemaSubset(node, label = "schema") {
  if (Array.isArray(node)) return node.forEach((item, index) => validateSchemaSubset(item, `${label}[${index}]`));
  if (!node || typeof node !== "object") return;
  assertV3811(!Object.hasOwn(node, "uniqueItems"), `${label}: uniqueItems unsupported`);
  if (node.type === "object") {
    assertV3811(node.additionalProperties === false, `${label}: object must close additional properties`);
    assertV3811(Array.isArray(node.required) && canonicalJson([...node.required].sort()) === canonicalJson(Object.keys(node.properties).sort()), `${label}: every object property must be required`);
  }
  for (const [key, value] of Object.entries(node)) validateSchemaSubset(value, `${label}.${key}`);
}

const preparation = await readJson(`${V3811_ADJUDICATION_ROOT}/preparation-audit.json`);
const disagreements = await readJson(`${V3811_PERFORMANCE_ROOT}/initial-disagreements.json`);
const audioAudit = await readJson("docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json");
const schema = await readJson(preparation.sharedSchemaPath);
same(schema, makeV3811AdjudicationSchema(), "serialized adjudication schema");
validateSchemaSubset(schema);
assertV3811(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.contexts === disagreements.summary.debates && preparation.disputedMoves === disagreements.summary.disputedMoves && preparation.responseTupleChoices === disagreements.summary.responseTupleDisputes && preparation.charityPairChoices === disagreements.summary.charityTestedDisputes && preparation.burdenAdjustmentChoices === disagreements.summary.burdenAdjustmentDisputes, "preparation summary invalid");
assertV3811(preparation.dependencyClosure.initialExposedRatingFields === disagreements.summary.ratingFieldDisputes && preparation.dependencyClosure.exposedCharityRatingsAbsorbedIntoCompoundPairs + preparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant === preparation.charityPairChoices && preparation.ratingChoices + preparation.dependencyClosure.exposedCharityRatingsAbsorbedIntoCompoundPairs === disagreements.summary.ratingFieldDisputes, "dependency closure invalid");
assertV3811(preparation.audioVerifiedDisputedMoves === preparation.packetAudits.reduce((sum, item) => sum + item.audioVerifiedDisputedMoves, 0) && preparation.candidateValuesInvented === 0 && preparation.calculatedScores === 0 && preparation.authorization.freezeAdjudicationExecutionManifest && !preparation.authorization.adjudicationModelExecution && !preparation.authorization.scoreDerivation, "preparation boundary invalid");
assertV3811(sha256(await bytes(preparation.sharedSchemaPath)) === preparation.sharedSchemaSha256, "shared schema hash mismatch");

const audioByMoveId = new Map(audioAudit.debateAudits.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
let dryValidated = 0;
let checkedMoves = 0;

for (const packetAudit of preparation.packetAudits) {
  assertV3811(sha256(await bytes(packetAudit.packetPath)) === packetAudit.packetSha256, `${packetAudit.debateNumber}: packet hash mismatch`);
  const packet = await readJson(packetAudit.packetPath);
  const disagreement = disagreements.debates.find((item) => item.debateNumber === packet.debateNumber);
  const lockedPacket = await readJson(`${V3811_PERFORMANCE_ROOT}/packets/debate-${packet.debateNumber}.json`);
  const passA = await readJson(`${initialOutputsRoot}/debate-${packet.debateNumber}-pass-a.json`);
  const passB = await readJson(`${initialOutputsRoot}/debate-${packet.debateNumber}-pass-b.json`);
  validateV3811PerformanceOutput(passA, lockedPacket, "A");
  validateV3811PerformanceOutput(passB, lockedPacket, "B");
  assertV3811(packet.evidenceBoundary.disputedFieldsOnly && packet.evidenceBoundary.nondisputedPerformanceFieldsUnavailable && packet.evidenceBoundary.initialPassRationalesUnavailable && packet.evidenceBoundary.fullInitialOutputsUnavailable && packet.evidenceBoundary.calculatedScoresUnavailable && packet.evidenceBoundary.mediumConfidenceMovesRequireAudioVerification, `${packet.debateNumber}: evidence boundary invalid`);
  assertV3811(packet.disputedMoves.length === disagreement.moveDisputes.length, `${packet.debateNumber}: disputed move count mismatch`);

  for (let index = 0; index < packet.disputedMoves.length; index += 1) {
    const prepared = packet.disputedMoves[index];
    const extracted = disagreement.moveDisputes[index];
    assertV3811(prepared.moveId === extracted.moveId && prepared.moveIndex === extracted.moveIndex, `${packet.debateNumber}:${index}: move order mismatch`);
    const lockedMove = lockedPacket.moves[prepared.moveIndex];
    same(prepared.evidence.proposition, lockedMove.proposition, `${prepared.moveId}: proposition`);
    same(prepared.evidence.atomicExcerpt, lockedMove.atomicExcerpt, `${prepared.moveId}: atomic excerpt`);
    same(prepared.evidence.contextWindow, lockedMove.contextWindow, `${prepared.moveId}: context window`);
    same(prepared.evidence.responseTargets, lockedMove.responseTargets, `${prepared.moveId}: response targets`);
    same(prepared.candidates.responseTuple, extracted.disputedFields.responseTuple, `${prepared.moveId}: response candidates`);
    const expectedRatings = structuredClone(extracted.disputedFields.ratings);
    if (extracted.disputedFields.charityTested !== null) delete expectedRatings.representationalCharity;
    same(prepared.candidates.ratings, expectedRatings, `${prepared.moveId}: rating candidates`);
    if (extracted.disputedFields.charityTested === null) assertV3811(prepared.candidates.charityPair === null, `${prepared.moveId}: unexpected charity pair`);
    else {
      const judgmentA = passA.moveJudgments[prepared.moveIndex];
      const judgmentB = passB.moveJudgments[prepared.moveIndex];
      same(prepared.candidates.charityPair.candidate1, { charityTested: judgmentA.charityTested, representationalCharity: judgmentA.ratings.representationalCharity.value }, `${prepared.moveId}: charity candidate1`);
      same(prepared.candidates.charityPair.candidate2, { charityTested: judgmentB.charityTested, representationalCharity: judgmentB.ratings.representationalCharity.value }, `${prepared.moveId}: charity candidate2`);
    }
    const audio = audioByMoveId.get(prepared.moveId);
    if (!audio) assertV3811(prepared.evidence.audioVerification === null, `${prepared.moveId}: unexpected audio verification`);
    else {
      assertV3811(prepared.evidence.audioVerification.status === audio.verificationStatus && prepared.evidence.audioVerification.clipSha256 === audio.clipSha256 && prepared.evidence.audioVerification.transcriptSha256 === audio.transcriptSha256 && prepared.evidence.audioVerification.audioDerivedTranscript === audio.audioDerivedTranscript, `${prepared.moveId}: audio verification mismatch`);
    }
    checkedMoves += 1;
  }

  const fixture = {
    schemaVersion: "3.8.11-performance-adjudication-output",
    protocolId: "v3.8.11-performance-judgment-consensus",
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
  const dry = validateV3811AdjudicationOutput(fixture, packet);
  assertV3811(dry.status === "passed" && dry.calculatedScores === 0, `${packet.debateNumber}: dry fixture failed`);
  dryValidated += 1;
}

assertV3811(checkedMoves === preparation.disputedMoves && dryValidated === preparation.contexts, "preparation validator coverage incomplete");
console.log(JSON.stringify({ status: "passed", sharedSchemaSubsetLintPassed: true, packetsValidated: preparation.contexts, disputedMovesValidated: checkedMoves, syntheticDecisionFixturesValidated: dryValidated, dependencyAddedCharityRatings: preparation.dependencyClosure.charityRatingsAddedToCloseFlagValueInvariant, audioVerifiedDisputedMoves: preparation.audioVerifiedDisputedMoves, candidateValuesInvented: 0, calculatedScores: 0, freezeAdjudicationExecutionManifestAuthorized: true, adjudicationModelExecutionAuthorized: false, scoreDerivationAuthorized: false }, null, 2));
