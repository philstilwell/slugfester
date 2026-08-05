import {
  V41_OUTPUT_VERSION,
  V41_PROTOCOL_ID,
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
  makeV41PrimarySchema,
  validateV41PrimaryOutput
} from "./v41-lean-production.mjs";

export const V415_PASS_B_ROOT = "docs/calibration/v4.1.5/lean-retired-gate/pass-b";
export const V415_PASS_B_PACKET_VERSION = "4.1.5-triggered-pass-b-packet";
export const V415_PASS_B_OUTPUT_VERSION = "4.1.5-triggered-pass-b-output";
export const V415_PASS_B_PROTOCOL_ID = "v4.1.5-triggered-pass-b-consensus";

const clone = (value) => structuredClone(value);
const LOCKED_MOVE_KEYS = Object.freeze(["moveId", "speaker", "moveKind", "proposition", "sourceSpan", "importance"]);
const JUDGMENT_KEYS = Object.freeze(["moveId", "attributionConfidence", "attributionBasis", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"]);

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

function exactObject(properties) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

export function makeV415PassBSchema() {
  const primary = makeV41PrimarySchema();
  const primaryMove = primary.properties.sections.items.properties.proMoves.items;
  const judgmentProperties = Object.fromEntries(JUDGMENT_KEYS.map((key) => [key, clone(primaryMove.properties[key])]));
  const isolationProperties = Object.fromEntries(Object.entries(PASS_B_ISOLATION).map(([key, value]) => [key, { type: "boolean", const: value }]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v415-triggered-pass-b",
    title: "Slugfester v4.1.5 triggered Pass B judgment",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveJudgments", "burdenCompletionAdjustment", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V415_PASS_B_OUTPUT_VERSION },
      protocolId: { type: "string", const: V415_PASS_B_PROTOCOL_ID },
      debateNumber: { type: "string", minLength: 1 },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", const: "isolated-triggered-pass-b-judge" },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      calibrationOnly: { type: "boolean", const: true },
      isolation: exactObject(isolationProperties),
      moveJudgments: { type: "array", minItems: 8, maxItems: 24, items: exactObject(judgmentProperties) },
      burdenCompletionAdjustment: clone(primary.properties.burdenCompletionAdjustment),
      audit: clone(primary.properties.audit)
    }
  };
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, clone(object[key])]));
}

function orderedLockedMoves(primary) {
  return primary.sections.flatMap((section) => [
    ...section.proMoves.map((move) => ({ ...move, side: "pro", sectionId: section.sectionId })),
    ...section.conMoves.map((move) => ({ ...move, side: "con", sectionId: section.sectionId }))
  ]).sort((a, b) => a.sourceSpan.startEvent - b.sourceSpan.startEvent || a.sourceSpan.endEvent - b.sourceSpan.endEvent || a.moveId.localeCompare(b.moveId));
}

export function buildV415PassBPacket(primary, sourcePacket) {
  const ordered = orderedLockedMoves(primary);
  return {
    schemaVersion: V415_PASS_B_PACKET_VERSION,
    protocolId: V415_PASS_B_PROTOCOL_ID,
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
    motion: sourcePacket.motion,
    sides: clone(sourcePacket.sides),
    durationSeconds: sourcePacket.durationSeconds,
    eventCount: sourcePacket.eventCount,
    sourceChain: clone(sourcePacket.sourceChain),
    lockedRoutes: clone(primary.routes),
    lockedSections: primary.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      weightPercent: section.weightPercent,
      rationale: section.rationale,
      proMoves: section.proMoves.map((move) => pick(move, LOCKED_MOVE_KEYS)),
      conMoves: section.conMoves.map((move) => pick(move, LOCKED_MOVE_KEYS))
    })),
    lockedMoveOrder: ordered.map((move) => move.moveId),
    modelInputBoundary: {
      completeTranscriptRequired: true,
      timestampedEventsRequired: true,
      lockedInventoryAndWeightsVisible: true,
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

export function extractV415PassBOutput(primary) {
  const ordered = orderedLockedMoves(primary);
  return {
    schemaVersion: V415_PASS_B_OUTPUT_VERSION,
    protocolId: V415_PASS_B_PROTOCOL_ID,
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
    reviewerRole: "isolated-triggered-pass-b-judge",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: clone(PASS_B_ISOLATION),
    moveJudgments: ordered.map((move) => pick(move, JUDGMENT_KEYS)),
    burdenCompletionAdjustment: clone(primary.burdenCompletionAdjustment),
    audit: clone(primary.audit)
  };
}

export function reconstructV415PassB(packet, output) {
  const byMove = new Map(output.moveJudgments.map((judgment) => [judgment.moveId, judgment]));
  const sections = packet.lockedSections.map((section) => ({
    ...clone(section),
    proMoves: section.proMoves.map((move) => ({ ...clone(move), ...clone(byMove.get(move.moveId)), moveId: move.moveId })),
    conMoves: section.conMoves.map((move) => ({ ...clone(move), ...clone(byMove.get(move.moveId)), moveId: move.moveId }))
  }));
  return {
    schemaVersion: V41_OUTPUT_VERSION,
    protocolId: V41_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "integrated-primary-judge",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: {
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      otherJudgmentsUnavailable: true,
      assessmentProseUnavailable: true,
      contaminationDetected: false
    },
    routes: clone(packet.lockedRoutes),
    sections,
    burdenCompletionAdjustment: clone(output.burdenCompletionAdjustment),
    audit: clone(output.audit)
  };
}

export function validateV415PassBPacket(packet) {
  const keys = ["schemaVersion", "protocolId", "debateNumber", "debateId", "motion", "sides", "durationSeconds", "eventCount", "sourceChain", "lockedRoutes", "lockedSections", "lockedMoveOrder", "modelInputBoundary"];
  assertV4(packet && canonicalJson(Object.keys(packet).sort()) === canonicalJson(keys.sort()), "Pass B packet keys invalid");
  assertV4(packet.schemaVersion === V415_PASS_B_PACKET_VERSION && packet.protocolId === V415_PASS_B_PROTOCOL_ID, "Pass B packet identity mismatch");
  assertV4(Array.isArray(packet.lockedMoveOrder) && packet.lockedMoveOrder.length >= 8 && packet.lockedMoveOrder.length <= 24 && new Set(packet.lockedMoveOrder).size === packet.lockedMoveOrder.length, "Pass B locked move order invalid");
  const nested = packet.lockedSections.flatMap((section) => [...section.proMoves, ...section.conMoves]);
  assertV4(nested.length === packet.lockedMoveOrder.length, "Pass B locked move count mismatch");
  for (const move of nested) assertV4(canonicalJson(Object.keys(move).sort()) === canonicalJson([...LOCKED_MOVE_KEYS].sort()), `${move.moveId}: Pass B locked move leaked judgment fields`);
  for (const value of Object.values(packet.modelInputBoundary)) assertV4(value === true, "Pass B model boundary flag invalid");
  return { status: "passed", debateNumber: packet.debateNumber, lockedMoves: nested.length, lockedSections: packet.lockedSections.length, primaryJudgmentFieldsVisible: 0 };
}

export function validateV415PassBOutput(output, packet, sourcePacket) {
  validateV415PassBPacket(packet);
  const schema = makeV415PassBSchema();
  assertV4(output && canonicalJson(Object.keys(output).sort()) === canonicalJson(schema.required.sort()), "Pass B output keys invalid");
  assertV4(output.schemaVersion === V415_PASS_B_OUTPUT_VERSION && output.protocolId === V415_PASS_B_PROTOCOL_ID, "Pass B output identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "Pass B debate identity mismatch");
  assertV4(output.reviewerRole === "isolated-triggered-pass-b-judge" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true, "Pass B reviewer boundary mismatch");
  assertV4(canonicalJson(output.isolation) === canonicalJson(PASS_B_ISOLATION), "Pass B isolation mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "Pass B output contains calculated fields");
  assertV4(Array.isArray(output.moveJudgments) && canonicalJson(output.moveJudgments.map((item) => item.moveId)) === canonicalJson(packet.lockedMoveOrder), "Pass B move order or coverage mismatch");
  for (const [index, judgment] of output.moveJudgments.entries()) assertV4(canonicalJson(Object.keys(judgment).sort()) === canonicalJson([...JUDGMENT_KEYS].sort()), `Pass B judgment ${index} keys invalid`);
  const reconstructed = reconstructV415PassB(packet, output);
  const validation = validateV41PrimaryOutput(reconstructed, sourcePacket);
  return { status: "passed", debateNumber: output.debateNumber, moves: output.moveJudgments.length, sections: validation.sections, mediumOrLowAttributionMoves: validation.mediumOrLowAttributionMoves, calculatedFields: 0 };
}
