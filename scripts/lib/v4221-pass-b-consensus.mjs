import { createHash } from "node:crypto";
import { assertV4, canonicalJson, containsProhibitedCalculatedField, deriveEpistemicCalibration, derivePrecisionClarity } from "./v4-lean-production.mjs";
import { deriveV4219ResponseClass } from "./v4219-primary-recovery.mjs";
import { V4220_MODEL, V4220_OUTPUT_VERSION, V4220_PROTOCOL_ID, makeV4220PrimarySchema, renderV4220EvidenceWindow, validateV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";

export const V4221_ROOT = "docs/calibration/v4.2.21/pass-b-consensus";
export const V4221_PROTOCOL_ID = "v4.2.21-source-span-consensus";
export const V4221_PASS_B_PACKET_VERSION = "4.2.21-source-span-pass-b-packet";
export const V4221_PASS_B_OUTPUT_VERSION = "4.2.21-source-span-pass-b-output";
export const V4221_ADJUDICATION_PACKET_VERSION = "4.2.21-dispute-only-adjudication-packet";
export const V4221_ADJUDICATION_OUTPUT_VERSION = "4.2.21-dispute-only-adjudication-output";
export const V4221_SCALAR_DISPUTE_THRESHOLD = 5;
export const V4221_SCORING_FIELD_KEYS = Object.freeze(["logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity", "precisionClarity", "epistemicCalibration"]);

const clone = (value) => structuredClone(value);
const MODEL_LABEL = V4220_MODEL.label;
const LOCKED_MOVE_KEYS = Object.freeze(["moveId", "sectionId", "side", "speaker", "moveKind", "proposition", "sourceSpan", "importance"]);
const JUDGMENT_KEYS = Object.freeze(["moveId", "attributionConfidence", "attributionBasis", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"]);
const PRIMARY_ISOLATION = Object.freeze({
  legacyAssessmentsUnavailable: true,
  calculatedTotalsUnavailable: true,
  winnerLabelsUnavailable: true,
  otherJudgmentsUnavailable: true,
  assessmentProseUnavailable: true,
  contaminationDetected: false
});
const PASS_B_ISOLATION = Object.freeze({
  legacyAssessmentsUnavailable: true,
  primaryJudgmentsUnavailable: true,
  primaryRatingsUnavailable: true,
  primaryTotalsUnavailable: true,
  triggerReasonsUnavailable: true,
  controlSelectionUnavailable: true,
  comparatorUnavailable: true,
  winnerLabelsUnavailable: true,
  otherDebatesUnavailable: true,
  assessmentProseUnavailable: true,
  contaminationDetected: false
});
const ADJUDICATION_ISOLATION = Object.freeze({
  candidateOrderingAnonymous: true,
  passIdentitiesUnavailable: true,
  initialRationalesUnavailable: true,
  nondisputedFieldsUnavailable: true,
  fullInitialOutputsUnavailable: true,
  legacyAssessmentsUnavailable: true,
  calculatedScoresUnavailable: true,
  winnerLabelsUnavailable: true,
  publicationProseUnavailable: true,
  contaminationDetected: false
});

function exactObject(properties) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label}: keys mismatch`);
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, clone(object[key])]));
}

function orderedMoves(moves) {
  return [...moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.moveId.localeCompare(right.moveId));
}

function stripRationale(object) {
  const { rationale, ...rest } = object;
  return rest;
}

function sorted(values) {
  return [...values].sort();
}

function responseStructure(move) {
  const response = move.response;
  return {
    derivedClass: deriveV4219ResponseClass(move),
    decisiveTargetIds: sorted(response.decisiveTargetIds),
    components: [...response.components].map(clone).sort((a, b) => a.componentId.localeCompare(b.componentId)),
    issueBearingContraryMaterial: response.issueBearingContraryMaterial,
    diagnosticConsequenceExplicit: response.diagnosticConsequenceExplicit,
    replacementDemandAnswered: response.replacementDemandAnswered
  };
}

function responseCandidate(move) {
  return { responseStructure: responseStructure(move), responsivenessWithinClass: { value: move.response.responsivenessWithinClass.value } };
}

function rawScoringFields(move) {
  return {
    logicalCoherence: move.ratings.logicalCoherence.value,
    evidenceWarrant: move.ratings.evidenceWarrant.value,
    relevanceBurden: move.ratings.relevanceBurden.value,
    representationalCharity: move.ratings.representationalCharity.value,
    precisionClarity: derivePrecisionClarity(move.precisionFindings).value,
    epistemicCalibration: deriveEpistemicCalibration(move.calibrationFindings).value
  };
}

function scoringFieldCandidate(move, key) {
  const value = rawScoringFields(move)[key];
  if (["logicalCoherence", "evidenceWarrant", "representationalCharity"].includes(key)) return { value };
  if (key === "relevanceBurden") return { value, burdenContact: clone(move.burdenContact) };
  if (key === "precisionClarity") return { value, closedFindings: stripRationale(clone(move.precisionFindings)) };
  if (key === "epistemicCalibration") return { value, closedFindings: stripRationale(clone(move.calibrationFindings)) };
  throw new Error(`unknown v4.2.21 scoring field: ${key}`);
}

export function makeV4221PassBSchema() {
  const primary = makeV4220PrimarySchema();
  const move = primary.properties.moves.items;
  const judgmentProperties = Object.fromEntries(JUDGMENT_KEYS.map((key) => [key, clone(move.properties[key])]));
  const isolationProperties = Object.fromEntries(Object.entries(PASS_B_ISOLATION).map(([key, value]) => [key, { type: "boolean", const: value }]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v4221-source-span-pass-b",
    title: "Slugfester v4.2.21 isolated source-span Pass B judgment",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveJudgments", "burdenCompletionAdjustment", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V4221_PASS_B_OUTPUT_VERSION },
      protocolId: { type: "string", const: V4221_PROTOCOL_ID },
      debateNumber: clone(primary.properties.debateNumber),
      debateId: clone(primary.properties.debateId),
      reviewerRole: { type: "string", const: "isolated-source-span-pass-b-judge" },
      assessmentModel: { type: "string", const: MODEL_LABEL },
      calibrationOnly: { type: "boolean", const: true },
      isolation: exactObject(isolationProperties),
      moveJudgments: { type: "array", minItems: 8, maxItems: 24, items: exactObject(judgmentProperties) },
      burdenCompletionAdjustment: clone(primary.properties.burdenCompletionAdjustment),
      audit: clone(primary.properties.audit)
    }
  };
}

export function buildV4221PassBPacket(primary, sourcePacket) {
  assertV4(primary?.schemaVersion === V4220_OUTPUT_VERSION && primary?.protocolId === V4220_PROTOCOL_ID, "v4.2.21 Pass B requires an accepted v4.2.20 raw primary");
  const moves = orderedMoves(primary.moves).map((move) => pick(move, LOCKED_MOVE_KEYS));
  return {
    schemaVersion: V4221_PASS_B_PACKET_VERSION,
    protocolId: V4221_PROTOCOL_ID,
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
    motion: sourcePacket.motion,
    sides: clone(sourcePacket.sides),
    durationSeconds: sourcePacket.durationSeconds,
    eventCount: sourcePacket.eventCount,
    sourceChain: clone(sourcePacket.sourceChain),
    transportChain: clone(sourcePacket.transportChain),
    lockedRoutes: clone(primary.routes),
    lockedSections: clone(primary.sections),
    lockedMoves: moves,
    lockedMoveOrder: moves.map((move) => move.moveId),
    modelInputBoundary: {
      completeTimestampedSourceLedgerRequired: true,
      lockedInventoryRoutesSectionsAndWeightsVisible: true,
      modelSelectsNoSourceTextOrSourceSpan: true,
      repositoryOwnedEvidenceRendering: true,
      repositoryDerivedResponseClass: true,
      modelAuthorsWithinClassResponsivenessOnly: true,
      primaryJudgmentsUnavailable: true,
      primaryRatingsUnavailable: true,
      primaryTotalsUnavailable: true,
      triggerReasonsUnavailable: true,
      controlSelectionUnavailable: true,
      comparatorUnavailable: true,
      legacyAssessmentsUnavailable: true,
      priorWinnersUnavailable: true,
      otherDebatesUnavailable: true,
      publicationProseUnavailable: true
    }
  };
}

export function validateV4221PassBPacket(packet) {
  const keys = ["schemaVersion", "protocolId", "debateNumber", "debateId", "motion", "sides", "durationSeconds", "eventCount", "sourceChain", "transportChain", "lockedRoutes", "lockedSections", "lockedMoves", "lockedMoveOrder", "modelInputBoundary"];
  exactKeys(packet, keys, "Pass B packet");
  assertV4(packet.schemaVersion === V4221_PASS_B_PACKET_VERSION && packet.protocolId === V4221_PROTOCOL_ID, "Pass B packet identity mismatch");
  assertV4(Array.isArray(packet.lockedMoves) && packet.lockedMoves.length >= 8 && packet.lockedMoves.length <= 24, "Pass B locked move population invalid");
  assertV4(canonicalJson(packet.lockedMoves.map((move) => move.moveId)) === canonicalJson(packet.lockedMoveOrder), "Pass B locked move order mismatch");
  assertV4(new Set(packet.lockedMoveOrder).size === packet.lockedMoveOrder.length, "Pass B locked move IDs must be unique");
  for (const move of packet.lockedMoves) {
    exactKeys(move, LOCKED_MOVE_KEYS, `${move.moveId}.lockedMove`);
    exactKeys(move.sourceSpan, ["startEvent", "endEvent"], `${move.moveId}.lockedSourceSpan`);
  }
  assertV4(Object.values(packet.modelInputBoundary).every((value) => value === true), "Pass B model boundary flags must all be true");
  return { status: "passed", debateNumber: packet.debateNumber, lockedMoves: packet.lockedMoves.length, lockedSections: packet.lockedSections.length, primaryJudgmentFieldsVisible: 0, modelAuthoredEvidenceTextVisible: 0 };
}

export function extractV4221PassBOutput(primary) {
  return {
    schemaVersion: V4221_PASS_B_OUTPUT_VERSION,
    protocolId: V4221_PROTOCOL_ID,
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
    reviewerRole: "isolated-source-span-pass-b-judge",
    assessmentModel: MODEL_LABEL,
    calibrationOnly: true,
    isolation: clone(PASS_B_ISOLATION),
    moveJudgments: orderedMoves(primary.moves).map((move) => pick(move, JUDGMENT_KEYS)),
    burdenCompletionAdjustment: clone(primary.burdenCompletionAdjustment),
    audit: clone(primary.audit)
  };
}

export function reconstructV4221PassB(packet, output) {
  const byId = new Map(output.moveJudgments.map((move) => [move.moveId, move]));
  return {
    schemaVersion: V4220_OUTPUT_VERSION,
    protocolId: V4220_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "integrated-primary-judge",
    assessmentModel: MODEL_LABEL,
    calibrationOnly: true,
    isolation: clone(PRIMARY_ISOLATION),
    routes: clone(packet.lockedRoutes),
    sections: clone(packet.lockedSections),
    burdenCompletionAdjustment: clone(output.burdenCompletionAdjustment),
    audit: clone(output.audit),
    moves: packet.lockedMoves.map((locked) => ({ ...clone(locked), ...clone(byId.get(locked.moveId)), moveId: locked.moveId }))
  };
}

export function validateV4221PassBOutput(output, packet, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  validateV4221PassBPacket(packet);
  const schema = makeV4221PassBSchema();
  exactKeys(output, schema.required, "Pass B output");
  assertV4(output.schemaVersion === V4221_PASS_B_OUTPUT_VERSION && output.protocolId === V4221_PROTOCOL_ID, "Pass B output identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "Pass B debate identity mismatch");
  assertV4(output.reviewerRole === "isolated-source-span-pass-b-judge" && output.assessmentModel === MODEL_LABEL && output.calibrationOnly === true, "Pass B reviewer boundary mismatch");
  assertV4(canonicalJson(output.isolation) === canonicalJson(PASS_B_ISOLATION), "Pass B isolation mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "Pass B output contains a prohibited calculated field");
  assertV4(canonicalJson(output.moveJudgments.map((move) => move.moveId)) === canonicalJson(packet.lockedMoveOrder), "Pass B move order or coverage mismatch");
  for (const [index, judgment] of output.moveJudgments.entries()) exactKeys(judgment, JUDGMENT_KEYS, `Pass B judgment ${index}`);
  const reconstructed = reconstructV4221PassB(packet, output);
  const validation = validateV4220PrimaryOutput(reconstructed, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { status: "passed", debateNumber: output.debateNumber, moves: output.moveJudgments.length, sections: validation.sections, mediumOrLowAttributionMoves: validation.mediumOrLowAttributionMoves, sourceSpanTopologyReused: true, repositoryOwnedEvidenceRendering: true, repositoryDerivedResponseClass: true, calculatedScores: 0 };
}

export function extractV4221MoveDisagreement(moveA, moveB) {
  assertV4(moveA.moveId === moveB.moveId, "move identity mismatch during v4.2.21 disagreement extraction");
  const structureA = responseStructure(moveA);
  const structureB = responseStructure(moveB);
  const responseStructureMismatch = canonicalJson(structureA) !== canonicalJson(structureB);
  const responsivenessWithinClassDelta = Math.abs(moveA.response.responsivenessWithinClass.value - moveB.response.responsivenessWithinClass.value);
  const responsePairDispute = responseStructureMismatch || responsivenessWithinClassDelta > V4221_SCALAR_DISPUTE_THRESHOLD;
  const attributionConfidenceMismatch = moveA.attributionConfidence !== moveB.attributionConfidence;
  const audioVerificationRequired = moveA.attributionConfidence !== "high" || moveB.attributionConfidence !== "high";
  const charityTestedMismatch = moveA.charity.tested !== moveB.charity.tested;
  const assessmentConfidenceMismatch = moveA.assessmentConfidence !== moveB.assessmentConfidence;
  const fieldsA = rawScoringFields(moveA);
  const fieldsB = rawScoringFields(moveB);
  const burdenContactMismatch = canonicalJson(moveA.burdenContact) !== canonicalJson(moveB.burdenContact);
  const precisionFindingsMismatch = canonicalJson(stripRationale(moveA.precisionFindings)) !== canonicalJson(stripRationale(moveB.precisionFindings));
  const calibrationFindingsMismatch = canonicalJson(stripRationale(moveA.calibrationFindings)) !== canonicalJson(stripRationale(moveB.calibrationFindings));
  const materialScoringFieldKeys = V4221_SCORING_FIELD_KEYS.filter((key) => {
    if (key === "representationalCharity" && charityTestedMismatch) return false;
    if (key === "relevanceBurden" && burdenContactMismatch) return true;
    if (key === "precisionClarity" && precisionFindingsMismatch) return true;
    if (key === "epistemicCalibration" && calibrationFindingsMismatch) return true;
    return Math.abs(fieldsA[key] - fieldsB[key]) > V4221_SCALAR_DISPUTE_THRESHOLD;
  });
  const nondisputedScalarMerges = V4221_SCORING_FIELD_KEYS.filter((key) => fieldsA[key] !== fieldsB[key] && !materialScoringFieldKeys.includes(key) && !(key === "representationalCharity" && charityTestedMismatch)).map((key) => ({ fieldKey: key, candidate1: fieldsA[key], candidate2: fieldsB[key], roundedMeanAfterAdjudication: Math.round((fieldsA[key] + fieldsB[key]) / 2) }));
  if (!responsePairDispute && responsivenessWithinClassDelta > 0) nondisputedScalarMerges.push({ fieldKey: "responsivenessWithinClass", candidate1: moveA.response.responsivenessWithinClass.value, candidate2: moveB.response.responsivenessWithinClass.value, roundedMeanAfterAdjudication: Math.round((moveA.response.responsivenessWithinClass.value + moveB.response.responsivenessWithinClass.value) / 2) });
  return {
    moveId: moveA.moveId,
    triggers: { attributionConfidenceMismatch, audioVerificationRequired, responseStructureMismatch, responsivenessWithinClassDelta, responsePairDispute, charityTestedMismatch, assessmentConfidenceMismatch, burdenContactMismatch, precisionFindingsMismatch, calibrationFindingsMismatch, materialScoringFieldKeys },
    candidates: {
      attributionPair: attributionConfidenceMismatch ? { candidate1: { attributionConfidence: moveA.attributionConfidence }, candidate2: { attributionConfidence: moveB.attributionConfidence } } : null,
      responsePair: responsePairDispute ? { candidate1: responseCandidate(moveA), candidate2: responseCandidate(moveB) } : null,
      charityPair: charityTestedMismatch ? { candidate1: { tested: moveA.charity.tested, representationalCharity: fieldsA.representationalCharity }, candidate2: { tested: moveB.charity.tested, representationalCharity: fieldsB.representationalCharity } } : null,
      assessmentConfidencePair: assessmentConfidenceMismatch ? { candidate1: { assessmentConfidence: moveA.assessmentConfidence }, candidate2: { assessmentConfidence: moveB.assessmentConfidence } } : null,
      scoringFields: Object.fromEntries(materialScoringFieldKeys.map((key) => [key, { candidate1: scoringFieldCandidate(moveA, key), candidate2: scoringFieldCandidate(moveB, key) }]))
    },
    nondisputedScalarMerges,
    disputed: attributionConfidenceMismatch || responsePairDispute || charityTestedMismatch || assessmentConfidenceMismatch || materialScoringFieldKeys.length > 0,
    calculatedScores: 0
  };
}

export function extractV4221Disagreements(primaryA, primaryB) {
  assertV4(primaryA.debateNumber === primaryB.debateNumber && primaryA.debateId === primaryB.debateId, "v4.2.21 pass identities differ");
  const movesA = orderedMoves(primaryA.moves);
  const movesB = orderedMoves(primaryB.moves);
  assertV4(canonicalJson(movesA.map((move) => move.moveId)) === canonicalJson(movesB.map((move) => move.moveId)), "v4.2.21 pass move populations differ");
  for (let index = 0; index < movesA.length; index += 1) assertV4(canonicalJson(pick(movesA[index], LOCKED_MOVE_KEYS)) === canonicalJson(pick(movesB[index], LOCKED_MOVE_KEYS)), `${movesA[index].moveId}: locked move content differs between passes`);
  const moves = movesA.map((moveA, index) => extractV4221MoveDisagreement(moveA, movesB[index]));
  const adjustments = ["pro", "con"].filter((side) => canonicalJson(v4221AdjustmentSemanticTuple(primaryA.burdenCompletionAdjustment[side])) !== canonicalJson(v4221AdjustmentSemanticTuple(primaryB.burdenCompletionAdjustment[side]))).map((side) => ({ side, candidate1: v4221AdjustmentSemanticTuple(primaryA.burdenCompletionAdjustment[side]), candidate2: v4221AdjustmentSemanticTuple(primaryB.burdenCompletionAdjustment[side]) }));
  return { schemaVersion: "4.2.21-deterministic-disagreements", protocolId: V4221_PROTOCOL_ID, debateNumber: primaryA.debateNumber, debateId: primaryA.debateId, moveDisputes: moves.filter((move) => move.disputed), nondisputedScalarMerges: moves.flatMap((move) => move.nondisputedScalarMerges.map((merge) => ({ moveId: move.moveId, ...merge }))), burdenAdjustmentDisputes: adjustments, audit: { uniqueMovesCompared: moves.length, aggregateOrDiagnosticScoresComputed: 0, weightedScoresComputed: 0, scoreBasedDisputeTriggers: 0, rationaleWordingAloneCreatesDispute: false }, scoreDerivationAuthorized: false };
}

export function v4221AdjustmentSemanticTuple(adjustment) {
  return {
    value: adjustment.value,
    eligibility: {
      distinctDebateWideConsequence: adjustment.eligibility.distinctDebateWideConsequence,
      affectsBurdenCompletion: adjustment.eligibility.affectsBurdenCompletion,
      notAlreadyScored: adjustment.eligibility.notAlreadyScored,
      affectedBurdenIds: sorted(adjustment.eligibility.affectedBurdenIds),
      relatedMoveIds: sorted(adjustment.eligibility.relatedMoveIds),
      alreadyCapturedBy: sorted(adjustment.eligibility.alreadyCapturedBy)
    }
  };
}

function neutralEvidence(move, eventsDocument) {
  return renderV4220EvidenceWindow({ ...clone(move), evidenceBasis: "", response: { rationale: "" } }, eventsDocument);
}

export function buildV4221AudioWorkItems(primaryA, primaryB, packet, eventsDocument) {
  const byA = new Map(primaryA.moves.map((move) => [move.moveId, move]));
  const byB = new Map(primaryB.moves.map((move) => [move.moveId, move]));
  return packet.lockedMoves.filter((locked) => byA.get(locked.moveId).attributionConfidence !== "high" || byB.get(locked.moveId).attributionConfidence !== "high").map((locked) => {
    const evidence = neutralEvidence(locked, eventsDocument);
    return { moveId: locked.moveId, expectedSpeaker: locked.speaker, sourceSpan: clone(locked.sourceSpan), verificationExcerpt: evidence.excerpt, trigger: { passAConfidence: byA.get(locked.moveId).attributionConfidence, passBConfidence: byB.get(locked.moveId).attributionConfidence, eitherPassBelowHigh: true }, evidenceOwnership: "repository-rendered-from-locked-span-and-proposition", audioVerificationRequired: true };
  });
}

function anonymizedPair(pair, salt) {
  if (!pair) return { packetPair: null, provenance: null };
  const swap = (createHash("sha256").update(salt).digest()[0] & 1) === 1;
  return swap ? { packetPair: { candidate1: clone(pair.candidate2), candidate2: clone(pair.candidate1) }, provenance: { candidate1: "passB", candidate2: "passA" } } : { packetPair: clone(pair), provenance: { candidate1: "passA", candidate2: "passB" } };
}

export function buildV4221AdjudicationPacket(disagreements, packet, eventsDocument, audioVerificationByMoveId = new Map()) {
  const lockedById = new Map(packet.lockedMoves.map((move) => [move.moveId, move]));
  const provenance = { moves: {}, burdenAdjustments: {} };
  const disputedMoves = disagreements.moveDisputes.map((dispute) => {
    const locked = lockedById.get(dispute.moveId);
    assertV4(locked, `${dispute.moveId}: locked adjudication move missing`);
    const pairs = {};
    for (const key of ["attributionPair", "responsePair", "charityPair", "assessmentConfidencePair"]) pairs[key] = anonymizedPair(dispute.candidates[key], `${packet.debateNumber}:${dispute.moveId}:${key}`);
    const scoringFields = {};
    const scoringProvenance = {};
    for (const [key, pair] of Object.entries(dispute.candidates.scoringFields)) {
      const anonymous = anonymizedPair(pair, `${packet.debateNumber}:${dispute.moveId}:scoring:${key}`);
      scoringFields[key] = anonymous.packetPair;
      scoringProvenance[key] = anonymous.provenance;
    }
    provenance.moves[dispute.moveId] = { attributionPair: pairs.attributionPair.provenance, responsePair: pairs.responsePair.provenance, charityPair: pairs.charityPair.provenance, assessmentConfidencePair: pairs.assessmentConfidencePair.provenance, scoringFields: scoringProvenance };
    const evidence = neutralEvidence(locked, eventsDocument);
    const audio = audioVerificationByMoveId.get(dispute.moveId) ?? null;
    const requiresAudio = dispute.triggers.audioVerificationRequired;
    if (requiresAudio) assertV4(audio?.status === "verified" && audio?.expectedSpeaker === locked.speaker, `${dispute.moveId}: verified audio required before adjudication`);
    return {
      moveId: dispute.moveId,
      sectionId: locked.sectionId,
      side: locked.side,
      speaker: locked.speaker,
      moveKind: locked.moveKind,
      proposition: locked.proposition,
      importance: locked.importance,
      sourceSpan: { ...clone(locked.sourceSpan), excerpt: evidence.excerpt },
      evidence: { events: clone(eventsDocument.events ?? eventsDocument).slice(Math.max(0, locked.sourceSpan.startEvent - 2), locked.sourceSpan.endEvent + 3), audioVerification: audio ? clone(audio) : null },
      candidates: { attributionPair: pairs.attributionPair.packetPair, responsePair: pairs.responsePair.packetPair, charityPair: pairs.charityPair.packetPair, assessmentConfidencePair: pairs.assessmentConfidencePair.packetPair, scoringFields },
      requiredDecision: { attributionPairChoiceRequired: pairs.attributionPair.packetPair !== null, responsePairChoiceRequired: pairs.responsePair.packetPair !== null, charityPairChoiceRequired: pairs.charityPair.packetPair !== null, assessmentConfidencePairChoiceRequired: pairs.assessmentConfidencePair.packetPair !== null, scoringFieldChoiceKeys: Object.keys(scoringFields) }
    };
  });
  const burdenAdjustmentDisputes = disagreements.burdenAdjustmentDisputes.map((dispute) => {
    const anonymous = anonymizedPair({ candidate1: dispute.candidate1, candidate2: dispute.candidate2 }, `${packet.debateNumber}:adjustment:${dispute.side}`);
    provenance.burdenAdjustments[dispute.side] = anonymous.provenance;
    return { side: dispute.side, candidates: anonymous.packetPair };
  });
  const adjudicationPacket = { schemaVersion: V4221_ADJUDICATION_PACKET_VERSION, protocolId: V4221_PROTOCOL_ID, debateNumber: packet.debateNumber, debateId: packet.debateId, candidateOrdering: "deterministically anonymized independently for every pair", evidenceBoundary: { disputedFieldsOnly: true, initialPassIdentitiesUnavailable: true, initialPassRationalesUnavailable: true, nondisputedFieldsUnavailable: true, calculatedScoresUnavailable: true, publicationProseUnavailable: true }, disputedMoves, burdenAdjustmentDisputes };
  return { packet: adjudicationPacket, provenance };
}

const choiceOrNull = { anyOf: [{ type: "null" }, { type: "integer", enum: [1, 2] }] };

export function makeV4221AdjudicationSchema() {
  const flagProperties = Object.fromEntries(Object.entries(ADJUDICATION_ISOLATION).map(([key, value]) => [key, { type: "boolean", const: value }]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v4221-dispute-only-adjudication",
    title: "Slugfester v4.2.21 dispute-only adjudication",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveDecisions", "burdenAdjustmentDecisions", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V4221_ADJUDICATION_OUTPUT_VERSION },
      protocolId: { type: "string", const: V4221_PROTOCOL_ID },
      debateNumber: { type: "string", minLength: 1 },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", const: "dispute-only-adjudicator" },
      assessmentModel: { type: "string", const: MODEL_LABEL },
      calibrationOnly: { type: "boolean", const: true },
      isolation: exactObject(flagProperties),
      moveDecisions: { type: "array", minItems: 0, maxItems: 24, items: exactObject({ moveId: { type: "string", minLength: 1 }, attributionPairChoice: choiceOrNull, responsePairChoice: choiceOrNull, charityPairChoice: choiceOrNull, assessmentConfidencePairChoice: choiceOrNull, scoringFieldChoices: { type: "array", minItems: 0, maxItems: V4221_SCORING_FIELD_KEYS.length, items: exactObject({ fieldKey: { type: "string", enum: V4221_SCORING_FIELD_KEYS }, choice: { type: "integer", enum: [1, 2] } }) }, rationale: { type: "string", minLength: 40 } }) },
      burdenAdjustmentDecisions: { type: "array", minItems: 0, maxItems: 2, items: exactObject({ side: { type: "string", enum: ["pro", "con"] }, choice: { type: "integer", enum: [1, 2] }, rationale: { type: "string", minLength: 40 } }) },
      audit: exactObject(Object.fromEntries(["allDisputedMovesDecidedOnce", "onlyCandidateValuesSelected", "dependencyPairsKeptIndivisible", "nondisputedFieldsUntouched", "calculatedScoresAbsent", "publicationProseAbsent"].map((key) => [key, { type: "boolean", const: true }])))
    }
  };
}

function validateChoice(value, required, label) {
  if (required) assertV4(value === 1 || value === 2, `${label}: candidate 1 or 2 required`);
  else assertV4(value === null, `${label}: nondisputed pair choice must be null`);
}

export function validateV4221AdjudicationOutput(output, packet) {
  const schema = makeV4221AdjudicationSchema();
  exactKeys(output, schema.required, "adjudication output");
  assertV4(output.schemaVersion === V4221_ADJUDICATION_OUTPUT_VERSION && output.protocolId === V4221_PROTOCOL_ID, "adjudication identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "adjudication debate identity mismatch");
  assertV4(output.reviewerRole === "dispute-only-adjudicator" && output.assessmentModel === MODEL_LABEL && output.calibrationOnly === true, "adjudication reviewer boundary mismatch");
  assertV4(canonicalJson(output.isolation) === canonicalJson(ADJUDICATION_ISOLATION), "adjudication isolation mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "adjudication contains a prohibited calculated field");
  assertV4(output.moveDecisions.length === packet.disputedMoves.length, "adjudication move count mismatch");
  for (const [index, required] of packet.disputedMoves.entries()) {
    const decision = output.moveDecisions[index];
    exactKeys(decision, ["moveId", "attributionPairChoice", "responsePairChoice", "charityPairChoice", "assessmentConfidencePairChoice", "scoringFieldChoices", "rationale"], `moveDecisions[${index}]`);
    assertV4(decision.moveId === required.moveId, `moveDecisions[${index}]: move order mismatch`);
    validateChoice(decision.attributionPairChoice, required.candidates.attributionPair !== null, `${decision.moveId}.attributionPairChoice`);
    validateChoice(decision.responsePairChoice, required.candidates.responsePair !== null, `${decision.moveId}.responsePairChoice`);
    validateChoice(decision.charityPairChoice, required.candidates.charityPair !== null, `${decision.moveId}.charityPairChoice`);
    validateChoice(decision.assessmentConfidencePairChoice, required.candidates.assessmentConfidencePair !== null, `${decision.moveId}.assessmentConfidencePairChoice`);
    const expected = Object.keys(required.candidates.scoringFields).sort();
    const actual = decision.scoringFieldChoices.map((item) => item.fieldKey).sort();
    assertV4(canonicalJson(expected) === canonicalJson(actual) && new Set(actual).size === actual.length, `${decision.moveId}: scoring decision keys mismatch`);
    assertV4(decision.scoringFieldChoices.every((item) => (item.choice === 1 || item.choice === 2) && V4221_SCORING_FIELD_KEYS.includes(item.fieldKey)), `${decision.moveId}: invalid scoring choice`);
    assertV4(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `${decision.moveId}: adjudication rationale too short`);
  }
  assertV4(output.burdenAdjustmentDecisions.length === packet.burdenAdjustmentDisputes.length, "burden adjustment decision count mismatch");
  for (const [index, required] of packet.burdenAdjustmentDisputes.entries()) {
    const decision = output.burdenAdjustmentDecisions[index];
    exactKeys(decision, ["side", "choice", "rationale"], `burdenAdjustmentDecisions[${index}]`);
    assertV4(decision.side === required.side && (decision.choice === 1 || decision.choice === 2), `burdenAdjustmentDecisions[${index}] mismatch`);
    assertV4(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `burdenAdjustmentDecisions[${index}].rationale too short`);
  }
  assertV4(canonicalJson(output.audit) === canonicalJson(Object.fromEntries(Object.keys(schema.properties.audit.properties).map((key) => [key, true]))), "adjudication audit mismatch");
  return { status: "passed", debateNumber: packet.debateNumber, disputedMoves: packet.disputedMoves.length, candidateSelections: packet.disputedMoves.reduce((sum, move) => sum + [move.candidates.attributionPair, move.candidates.responsePair, move.candidates.charityPair, move.candidates.assessmentConfidencePair].filter(Boolean).length + Object.keys(move.candidates.scoringFields).length, packet.burdenAdjustmentDisputes.length), calculatedScores: 0, scoreDerivationAuthorized: false };
}

export { ADJUDICATION_ISOLATION as V4221_ADJUDICATION_ISOLATION, PASS_B_ISOLATION as V4221_PASS_B_ISOLATION };
