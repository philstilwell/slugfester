#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { V4220_ROOT } from "./lib/v4220-source-span-rendering.mjs";
import {
  V4221_ADJUDICATION_ISOLATION,
  V4221_ADJUDICATION_OUTPUT_VERSION,
  V4221_PASS_B_OUTPUT_VERSION,
  V4221_PROTOCOL_ID,
  V4221_ROOT,
  buildV4221AdjudicationPacket,
  buildV4221AudioWorkItems,
  buildV4221PassBPacket,
  extractV4221Disagreements,
  extractV4221PassBOutput,
  makeV4221AdjudicationSchema,
  makeV4221PassBSchema,
  reconstructV4221PassB,
  validateV4221AdjudicationOutput,
  validateV4221PassBOutput,
  validateV4221PassBPacket
} from "./lib/v4221-pass-b-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const debateNumber = "27";
const [primary, sourcePacket] = await Promise.all([
  readFile(`${V4220_ROOT}/primary-outputs/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
  readFile(`${V4220_ROOT}/packets/debate-${debateNumber}.json`, "utf8").then(JSON.parse)
]);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(sourcePacket.sourceChain.eventsPath), readFile(sourcePacket.transportChain.sourceLedgerPath)]);
const events = JSON.parse(eventsBytes);

const packet = buildV4221PassBPacket(primary, sourcePacket);
const packetValidation = validateV4221PassBPacket(packet);
assert.equal(packetValidation.status, "passed");
assert.equal(packetValidation.primaryJudgmentFieldsVisible, 0);
assert.equal(packetValidation.modelAuthoredEvidenceTextVisible, 0);
assert.equal(packet.lockedMoves.some((move) => Object.hasOwn(move, "evidenceBasis") || Object.hasOwn(move, "response") || Object.hasOwn(move, "ratings")), false);
assert.equal(packet.lockedMoves.every((move) => canonicalJson(Object.keys(move.sourceSpan).sort()) === canonicalJson(["endEvent", "startEvent"])), true);

const passBOutput = extractV4221PassBOutput(primary);
assert.equal(passBOutput.schemaVersion, V4221_PASS_B_OUTPUT_VERSION);
const passBValidation = validateV4221PassBOutput(passBOutput, packet, sourcePacket, events, eventsBytes, ledgerBytes);
assert.equal(passBValidation.status, "passed");
assert.equal(passBValidation.calculatedScores, 0);
const reconstructed = reconstructV4221PassB(packet, passBOutput);
assert.equal(canonicalJson(reconstructed.moves), canonicalJson(primary.moves));

const identical = extractV4221Disagreements(primary, reconstructed);
assert.equal(identical.moveDisputes.length, 0);
assert.equal(identical.nondisputedScalarMerges.length, 0);
assert.equal(identical.audit.aggregateOrDiagnosticScoresComputed, 0);
assert.equal(identical.audit.scoreBasedDisputeTriggers, 0);

const withinThreeOutput = structuredClone(passBOutput);
withinThreeOutput.moveJudgments[0].response.responsivenessWithinClass.value += 3;
const withinThree = reconstructV4221PassB(packet, withinThreeOutput);
const withinThreeDisagreements = extractV4221Disagreements(primary, withinThree);
assert.equal(withinThreeDisagreements.moveDisputes.length, 0);
assert.deepEqual(withinThreeDisagreements.nondisputedScalarMerges.map((item) => item.fieldKey), ["responsivenessWithinClass"]);

const disputedOutput = structuredClone(passBOutput);
const disputedMove = disputedOutput.moveJudgments[0];
disputedMove.response.responsivenessWithinClass.value += 6;
disputedMove.ratings.logicalCoherence.value -= 6;
disputedMove.precisionFindings.qualificationExplicitness = "explicit";
disputedMove.attributionConfidence = "medium";
disputedMove.assessmentConfidence = disputedMove.assessmentConfidence === "high" ? "medium" : "high";
const disputedRaw = reconstructV4221PassB(packet, disputedOutput);
validateV4221PassBOutput(disputedOutput, packet, sourcePacket, events, eventsBytes, ledgerBytes);
const disagreements = extractV4221Disagreements(primary, disputedRaw);
assert.equal(disagreements.moveDisputes.length, 1);
assert.equal(disagreements.audit.aggregateOrDiagnosticScoresComputed, 0);
assert.equal(disagreements.scoreDerivationAuthorized, false);
const firstDispute = disagreements.moveDisputes[0];
assert.equal(firstDispute.triggers.responsePairDispute, true);
assert.equal(firstDispute.triggers.attributionConfidenceMismatch, true);
assert.equal(firstDispute.triggers.assessmentConfidenceMismatch, true);
assert(firstDispute.triggers.materialScoringFieldKeys.includes("logicalCoherence"));
assert(firstDispute.triggers.materialScoringFieldKeys.includes("precisionClarity"));
assert.equal(firstDispute.triggers.materialScoringFieldKeys.includes("responsiveness"), false);

const audioItems = buildV4221AudioWorkItems(primary, disputedRaw, packet, events);
assert.equal(audioItems.length, 1);
assert.equal(audioItems[0].moveId, primary.moves[0].moveId);
assert.equal(audioItems[0].trigger.eitherPassBelowHigh, true);
assert.equal(audioItems[0].evidenceOwnership, "repository-rendered-from-locked-span-and-proposition");
assert(audioItems[0].verificationExcerpt.length > 0);
const lockedText = events.slice(packet.lockedMoves[0].sourceSpan.startEvent, packet.lockedMoves[0].sourceSpan.endEvent + 1).map((event) => event.text).join(" ").replace(/\s+/g, " ").trim();
assert(lockedText.includes(audioItems[0].verificationExcerpt));

const sharedMediumA = structuredClone(primary);
const sharedMediumB = structuredClone(primary);
sharedMediumA.moves[0].attributionConfidence = "medium";
sharedMediumB.moves[0].attributionConfidence = "medium";
assert.equal(extractV4221Disagreements(sharedMediumA, sharedMediumB).moveDisputes.length, 0);
assert.equal(buildV4221AudioWorkItems(sharedMediumA, sharedMediumB, packet, events).length, 1);

assert.throws(() => buildV4221AdjudicationPacket(disagreements, packet, events), /verified audio required/);
const audioByMoveId = new Map([[audioItems[0].moveId, { status: "verified", expectedSpeaker: audioItems[0].expectedSpeaker, deterministicEvidence: { excerptRecall: 0.96, recallMargin: 0.62 } }]]);
const builtAdjudication = buildV4221AdjudicationPacket(disagreements, packet, events, audioByMoveId);
assert.equal(builtAdjudication.packet.disputedMoves.length, 1);
assert.equal(Object.values(builtAdjudication.provenance.moves[firstDispute.moveId].scoringFields).every((item) => item.candidate1 !== item.candidate2), true);
assert.equal(JSON.stringify(builtAdjudication.packet).includes("passA"), false);
assert.equal(JSON.stringify(builtAdjudication.packet).includes("passB"), false);
assert.equal(JSON.stringify(builtAdjudication.packet).includes("responsivenessWithinClass"), true);
assert.equal(Object.hasOwn(builtAdjudication.packet.disputedMoves[0].candidates.scoringFields, "responsiveness"), false);
assert.equal(builtAdjudication.packet.disputedMoves[0].evidence.audioVerification.status, "verified");

const adjudicationOutput = {
  schemaVersion: V4221_ADJUDICATION_OUTPUT_VERSION,
  protocolId: V4221_PROTOCOL_ID,
  debateNumber: primary.debateNumber,
  debateId: primary.debateId,
  reviewerRole: "dispute-only-adjudicator",
  assessmentModel: "5.6 Sol",
  calibrationOnly: true,
  isolation: structuredClone(V4221_ADJUDICATION_ISOLATION),
  moveDecisions: builtAdjudication.packet.disputedMoves.map((move) => ({
    moveId: move.moveId,
    attributionPairChoice: move.candidates.attributionPair ? 1 : null,
    responsePairChoice: move.candidates.responsePair ? 1 : null,
    charityPairChoice: move.candidates.charityPair ? 1 : null,
    assessmentConfidencePairChoice: move.candidates.assessmentConfidencePair ? 1 : null,
    scoringFieldChoices: Object.keys(move.candidates.scoringFields).map((fieldKey) => ({ fieldKey, choice: 1 })),
    rationale: "The selected candidates best match the locked transcript evidence and the applicable closed rubric anchors."
  })),
  burdenAdjustmentDecisions: [],
  audit: {
    allDisputedMovesDecidedOnce: true,
    onlyCandidateValuesSelected: true,
    dependencyPairsKeptIndivisible: true,
    nondisputedFieldsUntouched: true,
    calculatedScoresAbsent: true,
    publicationProseAbsent: true
  }
};
const adjudicationValidation = validateV4221AdjudicationOutput(adjudicationOutput, builtAdjudication.packet);
assert.equal(adjudicationValidation.status, "passed");
assert.equal(adjudicationValidation.calculatedScores, 0);
assert.equal(adjudicationValidation.scoreDerivationAuthorized, false);

const futureOutput = structuredClone(passBOutput);
futureOutput.moveJudgments[0].response.decisiveTargetIds = [packet.lockedMoveOrder.at(-1)];
futureOutput.moveJudgments[0].response.components = [{ componentId: "future-target", targetMoveId: packet.lockedMoveOrder.at(-1), text: "A deliberately invalid future selected target.", contacted: true, decisive: true }];
futureOutput.moveJudgments[0].response.issueBearingContraryMaterial = true;
assert.throws(() => validateV4221PassBOutput(futureOutput, packet, sourcePacket, events, eventsBytes, ledgerBytes), /reply target must already appear|response target must be an earlier move/);
const leakedPacket = structuredClone(packet);
leakedPacket.lockedMoves[0].sourceSpan.excerpt = "A model-authored or pass-authored excerpt must never enter the locked source-span packet.";
assert.throws(() => validateV4221PassBPacket(leakedPacket), /keys mismatch/);

const result = {
  schemaVersion: "4.2.21-pass-b-consensus-design-verification",
  protocolId: V4221_PROTOCOL_ID,
  status: "passed-code-only-pass-b-consensus-compatibility",
  developmentOnly: true,
  fixtureDebate: debateNumber,
  contracts: {
    isolatedPassBConsumesLockedSourceSpanInventory: true,
    primaryJudgmentsAndRatingsHidden: true,
    modelAuthoredEvidenceTextAbsent: true,
    passBReconstructsThroughFullV4220Validator: true,
    responseClassRepositoryDerived: true,
    responsivenessJudgedWithinClassOnly: true,
    deterministicDisagreementExtraction: true,
    aggregateOrDiagnosticScoresBeforeAdjudication: 0,
    responseAndWithinClassPositionIndivisibleWhenDisputed: true,
    relevanceAndBurdenContactIndivisibleWhenDisputed: true,
    closedPrecisionAndCalibrationFindingsCompared: true,
    scalarDisputeThresholdGreaterThan: 5,
    nondisputedScalarResolutionDeferredUntilAfterAdjudication: true,
    eitherPassBelowHighTriggersAudio: true,
    audioEvidenceRepositoryRenderedFromLockedSpan: true,
    verifiedAudioRequiredBeforeAffectedAdjudication: true,
    candidatePairsDeterministicallyAnonymized: true,
    thirdPassReceivesDisputedFieldsOnly: true,
    scoresDerived: 0
  },
  mutationTests: {
    futureTargetRejected: true,
    authoredExcerptLeakRejected: true,
    withinClassDeltaThreeDeferredToMean: true,
    withinClassDeltaSixDisputedAsCompoundPair: true,
    closedPrecisionFindingMismatchDisputed: true,
    mediumConfidenceAudioTriggerCreated: true,
    agreedMediumConfidenceStillTriggersAudio: true,
    missingAudioBlocksAdjudicationPacket: true,
    exactAdjudicationSchemaValidated: true
  },
  totals: { modelContexts: 0, audioCalls: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { preparePassBPrimaryGate: true, passBModelExecution: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};

if (shouldWrite) {
  await mkdir(path.resolve(V4221_ROOT), { recursive: true });
  await writeFile(path.resolve(V4221_ROOT, "pass-b.schema.json"), `${JSON.stringify(makeV4221PassBSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V4221_ROOT, "adjudication.schema.json"), `${JSON.stringify(makeV4221AdjudicationSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V4221_ROOT, "design-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
