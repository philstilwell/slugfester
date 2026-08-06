import { createHash } from "node:crypto";
import { assertV4, canonicalJson, containsProhibitedCalculatedField } from "./v4-lean-production.mjs";

export const V4221175_ROOT = "docs/calibration/v4.2.21.17.5/dispute-only-adjudication";
export const V4221175_PROTOCOL_ID = "v4.2.21.17.5-decomposed-consensus";
export const V4221175_PACKET_VERSION = "4.2.21.17.5-dispute-only-adjudication-packet";
export const V4221175_OUTPUT_VERSION = "4.2.21.17.5-dispute-only-adjudication-output";
export const V4221175_SCORING_FIELD_KEYS = Object.freeze(["logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity", "precisionClarity", "epistemicCalibration"]);

const MODEL_LABEL = "5.6 Sol";
const ISOLATION = Object.freeze({
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
const clone = (value) => structuredClone(value);

function exactObject(properties) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label}: keys mismatch`);
}

function anonymizedPair(pair, salt) {
  if (!pair) return { packetPair: null, provenance: null };
  const swap = (createHash("sha256").update(salt).digest()[0] & 1) === 1;
  return swap
    ? { packetPair: { candidate1: clone(pair.candidate2), candidate2: clone(pair.candidate1) }, provenance: { candidate1: "passB", candidate2: "passA" } }
    : { packetPair: clone(pair), provenance: { candidate1: "passA", candidate2: "passB" } };
}

export function buildV4221175AdjudicationPacket(disagreements, lockedInventory, events, audioVerificationByMoveId = new Map()) {
  const lockedById = new Map(lockedInventory.moves.map((move) => [move.moveId, move]));
  const audioRequired = new Set(disagreements.audioVerificationMoveIds);
  const provenance = { moves: {}, burdenAdjustments: {} };
  const audioTranscriptInputs = [];
  const disputedMoves = disagreements.moveDisputes.map((dispute) => {
    const locked = lockedById.get(dispute.moveId);
    assertV4(locked, `${dispute.moveId}: locked adjudication move missing`);
    const pairs = {};
    for (const key of ["importancePair", "attributionPair", "responsePair", "charityPair", "assessmentConfidencePair"]) pairs[key] = anonymizedPair(dispute.candidates[key], `${lockedInventory.debateNumber}:${dispute.moveId}:${key}`);
    const scoringFields = {};
    const scoringProvenance = {};
    for (const [key, pair] of Object.entries(dispute.candidates.scoringFields)) {
      const anonymous = anonymizedPair(pair, `${lockedInventory.debateNumber}:${dispute.moveId}:scoring:${key}`);
      scoringFields[key] = anonymous.packetPair;
      scoringProvenance[key] = anonymous.provenance;
    }
    provenance.moves[dispute.moveId] = {
      importancePair: pairs.importancePair.provenance,
      attributionPair: pairs.attributionPair.provenance,
      responsePair: pairs.responsePair.provenance,
      charityPair: pairs.charityPair.provenance,
      assessmentConfidencePair: pairs.assessmentConfidencePair.provenance,
      scoringFields: scoringProvenance
    };
    const contextStartEvent = Math.max(0, locked.sourceSpan.startEvent - 2);
    const contextEndEvent = Math.min(events.length - 1, locked.sourceSpan.endEvent + 2);
    const audio = audioVerificationByMoveId.get(dispute.moveId) ?? null;
    const requiresAudio = audioRequired.has(dispute.moveId);
    if (requiresAudio) {
      assertV4(audio?.status === "verified" && audio.deterministicEvidence?.transcriptHashMatched, `${dispute.moveId}: verified audio transcript required before adjudication`);
      const modelInputFile = `audio-transcript-${dispute.moveId}.txt`;
      audioTranscriptInputs.push({ moveId: dispute.moveId, sourcePath: audio.transcript.path, modelInputFile, sha256: audio.transcript.sha256 });
    }
    return {
      moveId: dispute.moveId,
      sectionId: locked.sectionId,
      side: locked.side,
      speaker: locked.speaker,
      moveKind: locked.moveKind,
      proposition: locked.proposition,
      sourceSpan: { ...clone(locked.sourceSpan), excerpt: locked.finalSelectedEvidence.excerpt },
      evidence: {
        contextStartEvent,
        contextEndEvent,
        events: clone(events.slice(contextStartEvent, contextEndEvent + 1)),
        audioVerification: audio ? { status: audio.status, expectedSpeaker: audio.expectedSpeaker, clipSha256: audio.clip.sha256, transcriptSha256: audio.transcript.sha256, transcriptModel: audio.transcript.model, excerptRecall: audio.deterministicEvidence.excerptRecall, modelInputFile: `audio-transcript-${dispute.moveId}.txt` } : null
      },
      candidates: {
        importancePair: pairs.importancePair.packetPair,
        attributionPair: pairs.attributionPair.packetPair,
        responsePair: pairs.responsePair.packetPair,
        charityPair: pairs.charityPair.packetPair,
        assessmentConfidencePair: pairs.assessmentConfidencePair.packetPair,
        scoringFields
      },
      requiredDecision: {
        importancePairChoiceRequired: pairs.importancePair.packetPair !== null,
        attributionPairChoiceRequired: pairs.attributionPair.packetPair !== null,
        responsePairChoiceRequired: pairs.responsePair.packetPair !== null,
        charityPairChoiceRequired: pairs.charityPair.packetPair !== null,
        assessmentConfidencePairChoiceRequired: pairs.assessmentConfidencePair.packetPair !== null,
        scoringFieldChoiceKeys: Object.keys(scoringFields)
      }
    };
  });
  const burdenAdjustmentDisputes = disagreements.burdenAdjustmentDisputes.map((dispute) => {
    const anonymous = anonymizedPair({ candidate1: dispute.candidate1, candidate2: dispute.candidate2 }, `${lockedInventory.debateNumber}:adjustment:${dispute.side}`);
    provenance.burdenAdjustments[dispute.side] = anonymous.provenance;
    return { side: dispute.side, candidates: anonymous.packetPair };
  });
  return {
    packet: {
      schemaVersion: V4221175_PACKET_VERSION,
      protocolId: V4221175_PROTOCOL_ID,
      debateNumber: lockedInventory.debateNumber,
      debateId: lockedInventory.debateId,
      candidateOrdering: "deterministically anonymized independently for every pair",
      evidenceBoundary: {
        disputedFieldsOnly: true,
        initialPassIdentitiesUnavailable: true,
        initialPassRationalesUnavailable: true,
        nondisputedFieldsUnavailable: true,
        calculatedScoresUnavailable: true,
        publicationProseUnavailable: true,
        audioTranscriptAvailableOnlyForTriggeredMoves: true
      },
      disputedMoves,
      burdenAdjustmentDisputes
    },
    provenance,
    audioTranscriptInputs
  };
}

const choiceOrNull = { anyOf: [{ type: "null" }, { type: "integer", enum: [1, 2] }] };

export function makeV4221175AdjudicationSchema() {
  const isolationProperties = Object.fromEntries(Object.entries(ISOLATION).map(([key, value]) => [key, { type: "boolean", const: value }]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v4221175-dispute-only-adjudication",
    title: "Slugfester v4.2.21.17.5 dispute-only adjudication",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveDecisions", "burdenAdjustmentDecisions", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V4221175_OUTPUT_VERSION },
      protocolId: { type: "string", const: V4221175_PROTOCOL_ID },
      debateNumber: { type: "string", minLength: 1 },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", const: "isolated-disputed-fields-only-adjudicator" },
      assessmentModel: { type: "string", const: MODEL_LABEL },
      calibrationOnly: { type: "boolean", const: true },
      isolation: exactObject(isolationProperties),
      moveDecisions: {
        type: "array",
        minItems: 0,
        maxItems: 24,
        items: exactObject({
          moveId: { type: "string", minLength: 1 },
          importancePairChoice: clone(choiceOrNull),
          attributionPairChoice: clone(choiceOrNull),
          responsePairChoice: clone(choiceOrNull),
          charityPairChoice: clone(choiceOrNull),
          assessmentConfidencePairChoice: clone(choiceOrNull),
          scoringFieldChoices: { type: "array", minItems: 0, maxItems: V4221175_SCORING_FIELD_KEYS.length, items: exactObject({ fieldKey: { type: "string", enum: [...V4221175_SCORING_FIELD_KEYS] }, choice: { type: "integer", enum: [1, 2] } }) },
          rationale: { type: "string", minLength: 40 }
        })
      },
      burdenAdjustmentDecisions: { type: "array", minItems: 0, maxItems: 2, items: exactObject({ side: { type: "string", enum: ["pro", "con"] }, choice: { type: "integer", enum: [1, 2] }, rationale: { type: "string", minLength: 40 } }) },
      audit: exactObject(Object.fromEntries(["allDisputedMovesDecidedOnce", "onlyCandidateValuesSelected", "dependencyPairsKeptIndivisible", "nondisputedFieldsUntouched", "calculatedScoresAbsent", "publicationProseAbsent"].map((key) => [key, { type: "boolean", const: true }])))
    }
  };
}

function validateChoice(value, required, label) {
  if (required) assertV4(value === 1 || value === 2, `${label}: candidate 1 or 2 required`);
  else assertV4(value === null, `${label}: nondisputed pair choice must be null`);
}

export function validateV4221175AdjudicationOutput(output, packet) {
  const schema = makeV4221175AdjudicationSchema();
  exactKeys(output, schema.required, "adjudication output");
  assertV4(output.schemaVersion === V4221175_OUTPUT_VERSION && output.protocolId === V4221175_PROTOCOL_ID, "adjudication identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "adjudication debate identity mismatch");
  assertV4(output.reviewerRole === "isolated-disputed-fields-only-adjudicator" && output.assessmentModel === MODEL_LABEL && output.calibrationOnly === true, "adjudication reviewer boundary mismatch");
  assertV4(canonicalJson(output.isolation) === canonicalJson(ISOLATION), "adjudication isolation mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "adjudication contains a prohibited calculated field");
  assertV4(output.moveDecisions.length === packet.disputedMoves.length, "adjudication move count mismatch");
  for (const [index, required] of packet.disputedMoves.entries()) {
    const decision = output.moveDecisions[index];
    exactKeys(decision, ["moveId", "importancePairChoice", "attributionPairChoice", "responsePairChoice", "charityPairChoice", "assessmentConfidencePairChoice", "scoringFieldChoices", "rationale"], `moveDecisions[${index}]`);
    assertV4(decision.moveId === required.moveId, `moveDecisions[${index}]: move order mismatch`);
    validateChoice(decision.importancePairChoice, required.candidates.importancePair !== null, `${decision.moveId}.importancePairChoice`);
    validateChoice(decision.attributionPairChoice, required.candidates.attributionPair !== null, `${decision.moveId}.attributionPairChoice`);
    validateChoice(decision.responsePairChoice, required.candidates.responsePair !== null, `${decision.moveId}.responsePairChoice`);
    validateChoice(decision.charityPairChoice, required.candidates.charityPair !== null, `${decision.moveId}.charityPairChoice`);
    validateChoice(decision.assessmentConfidencePairChoice, required.candidates.assessmentConfidencePair !== null, `${decision.moveId}.assessmentConfidencePairChoice`);
    const expected = Object.keys(required.candidates.scoringFields).sort();
    const actual = decision.scoringFieldChoices.map((item) => item.fieldKey).sort();
    assertV4(canonicalJson(expected) === canonicalJson(actual) && new Set(actual).size === actual.length, `${decision.moveId}: scoring decision keys mismatch`);
    assertV4(decision.scoringFieldChoices.every((item) => (item.choice === 1 || item.choice === 2) && V4221175_SCORING_FIELD_KEYS.includes(item.fieldKey)), `${decision.moveId}: invalid scoring choice`);
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
  const candidateSelections = packet.disputedMoves.reduce((sum, move) => sum + [move.candidates.importancePair, move.candidates.attributionPair, move.candidates.responsePair, move.candidates.charityPair, move.candidates.assessmentConfidencePair].filter(Boolean).length + Object.keys(move.candidates.scoringFields).length, packet.burdenAdjustmentDisputes.length);
  return { status: "passed", debateNumber: packet.debateNumber, disputedMoves: packet.disputedMoves.length, candidateSelections, calculatedScores: 0, scoreDerivationAuthorized: false };
}

export { ISOLATION as V4221175_ADJUDICATION_ISOLATION };
