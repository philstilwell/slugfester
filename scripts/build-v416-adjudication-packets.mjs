#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { makeV416AdjudicationSchema, V416_ADJUDICATION_PACKET_VERSION, V416_ADJUDICATION_PROTOCOL_ID, V416_ADJUDICATION_ROOT } from "./lib/v416-adjudication.mjs";
import { flattenV416PrimaryMoves } from "./lib/v416-disagreement.mjs";
import { V416_PASS_B_ROOT } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const preparationPath = `${V416_ADJUDICATION_ROOT}/preparation-audit.json`;
const schemaPath = `${V416_ADJUDICATION_ROOT}/adjudication.schema.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
assertV4(!shouldWrite || !(await exists(preparationPath)), `${preparationPath} already exists`);
const [disagreements, audioAudit] = await Promise.all([readJson(`${V416_PASS_B_ROOT}/disagreements.json`), readJson(`${V416_PASS_B_ROOT}/audio-verification.json`)]);
assertV4(disagreements.status === "passed-deterministic-disagreement-extraction" && disagreements.authorization.prepareDisputeOnlyAdjudicationPackets && !disagreements.authorization.adjudicationModelExecution, "disagreement state does not authorize packet preparation");
assertV4(audioAudit.status === "passed-all-eight-medium-attribution-moves-audio-verified" && audioAudit.authorization.disagreementExtraction, "audio verification state invalid");
const audioByMoveId = new Map(audioAudit.debates.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (file) => readFile(path.resolve(root, file));
const schema = makeV416AdjudicationSchema();
if (shouldWrite) {
  await mkdir(path.resolve(root, `${V416_ADJUDICATION_ROOT}/packets`), { recursive: true });
  await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
}

const packetAudits = [];
let disputedMoves = 0;
let responsePairChoices = 0;
let charityPairChoices = 0;
let independentScoringFieldChoices = 0;
let burdenAdjustmentChoices = 0;
let dependencyAddedResponsiveness = 0;
let dependencyAddedCharityRatings = 0;
let absorbedResponsiveness = 0;
let absorbedCharityRatings = 0;
let audioVerifiedDisputedMoves = 0;

for (const debateDisagreements of disagreements.debates) {
  const [lockedPacket, lockedEvents, primary, passB] = await Promise.all([readJson(debateDisagreements.passBPacketPath), readJson(`${V416_PASS_B_ROOT}/locked-events/debate-${debateDisagreements.debateNumber}.json`), readJson(debateDisagreements.primaryPath), readJson(debateDisagreements.passBPath)]);
  const primaryById = new Map(flattenV416PrimaryMoves(primary).map((move) => [move.moveId, move]));
  const passBById = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  const lockedMoveById = new Map(lockedPacket.lockedSections.flatMap((section) => [...section.proMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "pro" })), ...section.conMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "con" }))]).map((move) => [move.moveId, move]));
  const eventByMoveId = new Map(lockedEvents.moves.map((move) => [move.moveId, move]));
  const disputedMovePackets = [];
  let debateAddedResponsiveness = 0;
  let debateAddedCharity = 0;
  let debateAbsorbedResponsiveness = 0;
  let debateAbsorbedCharity = 0;
  let debateAudio = 0;
  for (const dispute of debateDisagreements.moveDisputes) {
    const moveA = primaryById.get(dispute.moveId);
    const moveB = passBById.get(dispute.moveId);
    const lockedMove = lockedMoveById.get(dispute.moveId);
    const eventEvidence = eventByMoveId.get(dispute.moveId);
    assertV4(moveA && moveB && lockedMove && eventEvidence, `${dispute.moveId}: adjudication evidence missing`);
    const scoringFields = structuredClone(dispute.disputedFields.scoringFields);
    let responsePair = null;
    if (dispute.disputedFields.responseTuple !== null) {
      if (Object.hasOwn(scoringFields, "responsiveness")) { delete scoringFields.responsiveness; absorbedResponsiveness += 1; debateAbsorbedResponsiveness += 1; }
      else { dependencyAddedResponsiveness += 1; debateAddedResponsiveness += 1; }
      responsePair = {
        candidate1: { responseTuple: dispute.disputedFields.responseTuple.candidate1, responsiveness: moveA.ratings.responsiveness.value },
        candidate2: { responseTuple: dispute.disputedFields.responseTuple.candidate2, responsiveness: moveB.ratings.responsiveness.value },
        selectionRule: "Choose one indivisible response-structure and responsiveness-value pair."
      };
    }
    let charityPair = null;
    if (dispute.disputedFields.charityState !== null) {
      if (Object.hasOwn(scoringFields, "representationalCharity")) { delete scoringFields.representationalCharity; absorbedCharityRatings += 1; debateAbsorbedCharity += 1; }
      else { dependencyAddedCharityRatings += 1; debateAddedCharity += 1; }
      charityPair = {
        candidate1: dispute.disputedFields.charityState.candidate1,
        candidate2: dispute.disputedFields.charityState.candidate2,
        selectionRule: "Choose one indivisible charity-state and representational-charity-value pair."
      };
    }
    if (Object.hasOwn(scoringFields, "relevanceBurden")) {
      scoringFields.relevanceBurden.candidate1.burdenContact = moveA.burdenContact;
      scoringFields.relevanceBurden.candidate2.burdenContact = moveB.burdenContact;
      scoringFields.relevanceBurden.selectionRule = "The relevance/burden value and its burden-contact record are indivisible."
    }
    const audio = audioByMoveId.get(dispute.moveId) ?? null;
    if (audio) { assertV4(audio.status === "verified" && audio.resolvedSpeaker === lockedMove.speaker, `${dispute.moveId}: audio verification invalid`); debateAudio += 1; audioVerifiedDisputedMoves += 1; }
    disputedMovePackets.push({
      moveId: dispute.moveId,
      moveIndex: dispute.moveIndex,
      sectionId: lockedMove.sectionId,
      side: lockedMove.side,
      speaker: lockedMove.speaker,
      moveKind: lockedMove.moveKind,
      proposition: lockedMove.proposition,
      sourceSpan: lockedMove.sourceSpan,
      importance: lockedMove.importance,
      evidence: { lockedStartEvent: eventEvidence.lockedStartEvent, lockedEndEvent: eventEvidence.lockedEndEvent, contextStartEvent: eventEvidence.contextStartEvent, contextEndEvent: eventEvidence.contextEndEvent, events: eventEvidence.events, audioVerification: audio ? { status: audio.status, resolvedSpeaker: audio.resolvedSpeaker, clipSha256: audio.clip.sha256, transcriptSha256: audio.transcript.sha256, expectedSpeakerExcerptRecall: audio.deterministicEvidence.expectedSpeakerExcerptRecall, recallMargin: audio.deterministicEvidence.expectedSpeakerRecallMargin } : null },
      triggers: dispute.triggers,
      candidates: { responsePair, charityPair, scoringFields },
      requiredDecision: { responsePairChoiceRequired: responsePair !== null, charityPairChoiceRequired: charityPair !== null, scoringFieldChoiceKeys: Object.keys(scoringFields) }
    });
  }
  const burdenAdjustmentDisputes = debateDisagreements.burdenAdjustmentDisputes.map((dispute) => ({
    side: dispute.side,
    candidates: { candidate1: { value: dispute.candidate1FullRecord.value, eligibility: dispute.candidate1FullRecord.eligibility }, candidate2: { value: dispute.candidate2FullRecord.value, eligibility: dispute.candidate2FullRecord.eligibility } },
    lockedRouteEvidence: lockedPacket.lockedRoutes.find((route) => route.side === dispute.side),
    selectionRule: "Choose one complete supplied value-and-eligibility record; do not invent or mix records."
  }));
  const packet = {
    schemaVersion: V416_ADJUDICATION_PACKET_VERSION,
    protocolId: V416_ADJUDICATION_PROTOCOL_ID,
    debateNumber: debateDisagreements.debateNumber,
    debateId: debateDisagreements.debateId,
    motion: debateDisagreements.motion,
    candidateOrdering: "anonymous-and-stable; candidate numbers do not identify a pass",
    evidenceBoundary: { disputedFieldsOnly: true, lockedMoveEvidenceOnly: true, initialPassIdentitiesUnavailable: true, initialPassRationalesUnavailable: true, fullInitialOutputsUnavailable: true, nondisputedFieldsUnavailable: true, calculatedScoresUnavailable: true, legacyAssessmentsUnavailable: true, winnerLabelsUnavailable: true, publicationProseUnavailable: true, mediumAttributionAudioResolved: true },
    dependencyClosure: { responseTupleAndResponsivenessCompound: true, charityStateAndRatingCompound: true, relevanceBurdenAndContactCompound: true, responseResponsivenessAdded: debateAddedResponsiveness, responseResponsivenessAbsorbed: debateAbsorbedResponsiveness, charityRatingsAdded: debateAddedCharity, charityRatingsAbsorbed: debateAbsorbedCharity },
    disputedMoves: disputedMovePackets,
    burdenAdjustmentDisputes,
    audit: { uniqueMoves: disputedMovePackets.length, responsePairChoices: disputedMovePackets.filter((move) => move.candidates.responsePair !== null).length, charityPairChoices: disputedMovePackets.filter((move) => move.candidates.charityPair !== null).length, independentScoringFieldChoices: disputedMovePackets.reduce((sum, move) => sum + Object.keys(move.candidates.scoringFields).length, 0), burdenAdjustmentChoices: burdenAdjustmentDisputes.length, audioVerifiedDisputedMoves: debateAudio, calculatedScores: 0 }
  };
  const packetPath = `${V416_ADJUDICATION_ROOT}/packets/debate-${debateDisagreements.debateNumber}.json`;
  if (shouldWrite) await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  const audit = { debateNumber: debateDisagreements.debateNumber, debateId: debateDisagreements.debateId, packetPath, packetSha256: shouldWrite ? sha256(await bytes(packetPath)) : null, ...packet.audit };
  packetAudits.push(audit);
  disputedMoves += audit.uniqueMoves;
  responsePairChoices += audit.responsePairChoices;
  charityPairChoices += audit.charityPairChoices;
  independentScoringFieldChoices += audit.independentScoringFieldChoices;
  burdenAdjustmentChoices += audit.burdenAdjustmentChoices;
}
assertV4(disputedMoves === disagreements.summary.disputedMoves, "adjudication packets changed disputed move population");
assertV4(responsePairChoices === disagreements.summary.responseTupleDisputes && charityPairChoices === disagreements.summary.charityStateDisputes, "compound pair counts mismatch");
assertV4(independentScoringFieldChoices + absorbedResponsiveness + absorbedCharityRatings === disagreements.summary.scoringFieldDisputes, "scoring field dependency absorption mismatch");
assertV4(burdenAdjustmentChoices === disagreements.summary.burdenAdjustmentDisputes, "burden adjustment count mismatch");
const preparation = {
  schemaVersion: "4.1.6-dispute-only-adjudication-preparation",
  protocolId: V416_ADJUDICATION_PROTOCOL_ID,
  status: "passed-dispute-only-adjudication-preparation",
  sourceDisagreements: `${V416_PASS_B_ROOT}/disagreements.json`,
  audioVerification: `${V416_PASS_B_ROOT}/audio-verification.json`,
  sharedSchema: schemaPath,
  sharedSchemaSha256: shouldWrite ? sha256(await bytes(schemaPath)) : null,
  contexts: packetAudits.length,
  disputedMoves,
  responsePairChoices,
  charityPairChoices,
  independentScoringFieldChoices,
  burdenAdjustmentChoices,
  dependencyClosure: { responsivenessFieldsAdded: dependencyAddedResponsiveness, responsivenessFieldsAbsorbed: absorbedResponsiveness, charityRatingsAdded: dependencyAddedCharityRatings, charityRatingsAbsorbed: absorbedCharityRatings },
  audioVerifiedDisputedMoves,
  candidateValuesInvented: 0,
  calculatedScores: 0,
  meteredApiCostUsd: 0,
  authorization: { exactSchemaPreflight: true, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  packetAudits
};
if (shouldWrite) await writeFile(path.resolve(root, preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: preparation.contexts, disputedMoves, responsePairChoices, charityPairChoices, independentScoringFieldChoices, burdenAdjustmentChoices, dependencyClosure: preparation.dependencyClosure, audioVerifiedDisputedMoves, exactSchemaPreflightAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
