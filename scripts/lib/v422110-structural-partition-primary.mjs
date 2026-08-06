import { assertV4 } from "./v4-lean-production.mjs";
import { makeV4220PrimarySchema, validateV4220PrimaryOutput, V4220_MODEL } from "./v4220-source-span-rendering.mjs";

export const V422110_ROOT = "docs/calibration/v4.2.21.10/structural-partition-primary";
export const V422110_PROTOCOL_ID = "v4.2.21.10-structural-partition-primary";
export const V422110_OUTPUT_VERSION = "4.2.21.10-candidate-grounded-primary-a";
export const V422110_MODEL = V4220_MODEL;

const clone = (value) => structuredClone(value);
const MOVE_JUDGMENT_KEYS = ["qualifiedCandidateId", "moveId", "proposition", "attributionBasis", "importance", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"];
const SECTION_KEYS = ["sectionId", "title", "weightPercent", "rationale", "proSelections", "conSelections"];
const TOP_KEYS = ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "routes", "sectionJudgments", "burdenCompletionAdjustment", "audit"];
const AUDIT_KEYS = ["allLoadBearingLinesRepresented", "allMovesJudgedOnce", "sectionWeightsLockedBeforeRatings", "responseComponentsApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "burdenExclusionRuleApplied", "calculatedTotalsAbsent", "completeCandidateBundleReviewed", "distributedSourceCoverageReliedUpon"];

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function candidateIds(candidateBundle, side) {
  if (!candidateBundle) return null;
  const ids = candidateBundle.candidates.filter((candidate) => candidate.side === side).map((candidate) => candidate.qualifiedCandidateId);
  assertV4(ids.length > 0, `candidate bundle has no ${side} candidates`);
  return ids;
}

function makeMoveJudgmentSchema(baseMove, candidateBundle, side) {
  const properties = { qualifiedCandidateId: { type: "string", minLength: 1 } };
  const ids = candidateIds(candidateBundle, side);
  if (ids) properties.qualifiedCandidateId.enum = ids;
  for (const key of MOVE_JUDGMENT_KEYS.slice(1)) properties[key] = clone(baseMove.properties[key]);
  return { type: "object", additionalProperties: false, required: MOVE_JUDGMENT_KEYS, properties };
}

export function makeV422110PrimarySchema({ packet, candidateBundle } = {}) {
  const base = makeV4220PrimarySchema();
  const section = base.properties.sections.items;
  const move = base.properties.moves.items;
  const audit = clone(base.properties.audit);
  audit.required = audit.required.filter((key) => key !== "completeTranscriptReviewed");
  delete audit.properties.completeTranscriptReviewed;
  audit.required.push("completeCandidateBundleReviewed", "distributedSourceCoverageReliedUpon");
  audit.properties.completeCandidateBundleReviewed = { type: "boolean", const: true };
  audit.properties.distributedSourceCoverageReliedUpon = { type: "boolean", const: true };
  const sectionProperties = {
    sectionId: clone(section.properties.sectionId),
    title: clone(section.properties.title),
    weightPercent: clone(section.properties.weightPercent),
    rationale: clone(section.properties.rationale),
    proSelections: { type: "array", minItems: 1, maxItems: 2, items: makeMoveJudgmentSchema(move, candidateBundle, "pro") },
    conSelections: { type: "array", minItems: 1, maxItems: 2, items: makeMoveJudgmentSchema(move, candidateBundle, "con") }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v422110-candidate-grounded-primary-a",
    type: "object",
    additionalProperties: false,
    required: TOP_KEYS,
    properties: {
      schemaVersion: { type: "string", const: V422110_OUTPUT_VERSION },
      protocolId: { type: "string", const: V422110_PROTOCOL_ID },
      debateNumber: packet ? { type: "string", const: packet.debateNumber } : { type: "string", minLength: 1 },
      debateId: packet ? { type: "string", const: packet.debateId } : { type: "string", minLength: 1 },
      reviewerRole: clone(base.properties.reviewerRole),
      assessmentModel: clone(base.properties.assessmentModel),
      calibrationOnly: clone(base.properties.calibrationOnly),
      isolation: clone(base.properties.isolation),
      routes: clone(base.properties.routes),
      sectionJudgments: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", additionalProperties: false, required: SECTION_KEYS, properties: sectionProperties } },
      burdenCompletionAdjustment: clone(base.properties.burdenCompletionAdjustment),
      audit
    }
  };
}

function toV4220Packet(packet) {
  return { ...clone(packet), schemaVersion: "4.2.20-source-span-source-packet", protocolId: "v4.2.20-source-span-evidence-rendering" };
}

function validateStructuralShape(proposal, packet, candidateBundle) {
  exactKeys(proposal, TOP_KEYS, "structural primary proposal");
  assertV4(proposal.schemaVersion === V422110_OUTPUT_VERSION && proposal.protocolId === V422110_PROTOCOL_ID, "structural primary identity mismatch");
  assertV4(proposal.debateNumber === packet.debateNumber && proposal.debateId === packet.debateId, "structural primary debate identity mismatch");
  assertV4(proposal.reviewerRole === "integrated-primary-judge" && proposal.assessmentModel === V422110_MODEL.label && proposal.calibrationOnly === true, "structural primary reviewer identity mismatch");
  assertV4(candidateBundle.debateNumber === packet.debateNumber && candidateBundle.debateId === packet.debateId, "candidate bundle debate identity mismatch");
  assertV4(candidateBundle.completeSourceDiscovery?.everyEventOwnedExactlyOnce === true && candidateBundle.completeSourceDiscovery?.everyCoreReportedComplete === true && candidateBundle.completeSourceDiscovery?.silentDeduplicationPerformed === false, "candidate bundle does not prove complete distributed source discovery");
  exactKeys(proposal.audit, AUDIT_KEYS, "structural primary audit");
  assertV4(AUDIT_KEYS.every((key) => proposal.audit[key] === true), "every structural primary audit assertion must be true");
  assertV4(Array.isArray(proposal.sectionJudgments) && proposal.sectionJudgments.length >= 4 && proposal.sectionJudgments.length <= 6, "section count must be 4..6");
  const sectionIds = new Set();
  const candidateMap = new Map(candidateBundle.candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate]));
  assertV4(candidateMap.size === candidateBundle.candidates.length, "candidate bundle IDs are not unique");
  const selected = [];
  let weight = 0;
  for (const [sectionIndex, section] of proposal.sectionJudgments.entries()) {
    exactKeys(section, SECTION_KEYS, `sectionJudgments[${sectionIndex}]`);
    assertV4(typeof section.sectionId === "string" && section.sectionId.length > 0 && !sectionIds.has(section.sectionId), `${section.sectionId}: duplicate or invalid section ID`);
    sectionIds.add(section.sectionId);
    assertV4(Number.isInteger(section.weightPercent) && section.weightPercent >= 1 && section.weightPercent <= 97, `${section.sectionId}: invalid section weight`);
    weight += section.weightPercent;
    for (const [side, key] of [["pro", "proSelections"], ["con", "conSelections"]]) {
      assertV4(Array.isArray(section[key]) && section[key].length >= 1 && section[key].length <= 2, `${section.sectionId}.${key}: must contain one or two moves`);
      for (const [moveIndex, judgment] of section[key].entries()) {
        exactKeys(judgment, MOVE_JUDGMENT_KEYS, `${section.sectionId}.${key}[${moveIndex}]`);
        const candidate = candidateMap.get(judgment.qualifiedCandidateId);
        assertV4(candidate, `${judgment.qualifiedCandidateId}: unknown candidate`);
        assertV4(candidate.side === side, `${judgment.qualifiedCandidateId}: selected under the wrong side container`);
        selected.push({ sectionId: section.sectionId, side, judgment, candidate });
      }
    }
  }
  assertV4(weight === 100, "section weights must total 100");
  assertV4(selected.length >= 8 && selected.length <= 24, "selected move count must be 8..24");
  assertV4(new Set(selected.map((item) => item.judgment.qualifiedCandidateId)).size === selected.length, "a candidate was selected more than once");
  assertV4(new Set(selected.map((item) => item.judgment.moveId)).size === selected.length, "move IDs are not unique");
  return selected;
}

export function compileAndValidateV422110Primary(proposal, { packet, candidateBundle, eventsDocument, eventsBytes, fullLedgerBytes }) {
  const selected = validateStructuralShape(proposal, packet, candidateBundle).sort((left, right) => left.candidate.sourceSpan.startEvent - right.candidate.sourceSpan.startEvent || left.candidate.sourceSpan.endEvent - right.candidate.sourceSpan.endEvent || left.judgment.moveId.localeCompare(right.judgment.moveId));
  const chronologicalIndex = new Map(selected.map((item, index) => [item.judgment.moveId, index]));
  for (const [index, item] of selected.entries()) {
    const response = item.judgment.response;
    if (item.candidate.moveKind === "constructive") {
      assertV4(response.decisiveTargetIds.length === 0 && response.components.length === 0, `${item.judgment.moveId}: constructive candidate cannot target a selected move`);
    } else {
      for (const targetId of response.decisiveTargetIds) {
        assertV4(chronologicalIndex.has(targetId) && chronologicalIndex.get(targetId) < index, `${item.judgment.moveId}: reply target is not an earlier selected move`);
        assertV4(selected[chronologicalIndex.get(targetId)].side !== item.side, `${item.judgment.moveId}: reply target is not on the opposing side`);
      }
    }
  }
  const output = {
    schemaVersion: "4.2.20-source-span-primary-judgment",
    protocolId: "v4.2.20-source-span-evidence-rendering",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: proposal.reviewerRole,
    assessmentModel: proposal.assessmentModel,
    calibrationOnly: proposal.calibrationOnly,
    isolation: clone(proposal.isolation),
    routes: clone(proposal.routes),
    sections: proposal.sectionJudgments.map(({ proSelections, conSelections, ...section }) => clone(section)),
    moves: selected.map(({ sectionId, judgment, candidate }) => {
      const { qualifiedCandidateId, ...authored } = judgment;
      return { moveId: authored.moveId, sectionId, side: candidate.side, speaker: candidate.speaker, moveKind: candidate.moveKind, proposition: authored.proposition, sourceSpan: clone(candidate.sourceSpan), attributionConfidence: candidate.attributionConfidence, attributionBasis: authored.attributionBasis, importance: authored.importance, burdenContact: clone(authored.burdenContact), response: clone(authored.response), precisionFindings: clone(authored.precisionFindings), calibrationFindings: clone(authored.calibrationFindings), charity: clone(authored.charity), ratings: clone(authored.ratings), evidenceBasis: authored.evidenceBasis, assessmentConfidence: authored.assessmentConfidence };
    }),
    burdenCompletionAdjustment: clone(proposal.burdenCompletionAdjustment),
    audit: { completeTranscriptReviewed: true, allLoadBearingLinesRepresented: proposal.audit.allLoadBearingLinesRepresented, allMovesJudgedOnce: proposal.audit.allMovesJudgedOnce, sectionWeightsLockedBeforeRatings: proposal.audit.sectionWeightsLockedBeforeRatings, responseComponentsApplied: proposal.audit.responseComponentsApplied, closedPrecisionAnchorsApplied: proposal.audit.closedPrecisionAnchorsApplied, closedCalibrationAnchorsApplied: proposal.audit.closedCalibrationAnchorsApplied, charityAnchorApplied: proposal.audit.charityAnchorApplied, burdenExclusionRuleApplied: proposal.audit.burdenExclusionRuleApplied, calculatedTotalsAbsent: proposal.audit.calculatedTotalsAbsent }
  };
  const validation = validateV4220PrimaryOutput(output, toV4220Packet(packet), eventsDocument, eventsBytes, fullLedgerBytes);
  const provenance = output.moves.map((move) => {
    const item = selected.find((selectedItem) => selectedItem.judgment.moveId === move.moveId);
    return { moveId: move.moveId, qualifiedCandidateId: item.judgment.qualifiedCandidateId, repositoryOwnedFields: ["sectionId", "side", "speaker", "moveKind", "sourceSpan", "attributionConfidence"], immutableCandidateFieldsPreserved: move.side === item.candidate.side && move.speaker === item.candidate.speaker && move.moveKind === item.candidate.moveKind && move.sourceSpan.startEvent === item.candidate.sourceSpan.startEvent && move.sourceSpan.endEvent === item.candidate.sourceSpan.endEvent && move.attributionConfidence === item.candidate.attributionConfidence };
  });
  assertV4(provenance.every((item) => item.immutableCandidateFieldsPreserved), "repository-owned candidate provenance mismatch");
  return { output, validation: { ...validation, structuralPartitionPrimary: { status: "passed", sectionsStructurallyPaired: true, oneToTwoMovesPerSidePerSection: true, completeDistributedSourceDiscoveryReliedUpon: true, immutableCandidateFieldsRepositoryOwned: true, automaticTargetRepairPerformed: false } }, provenance };
}

export function buildV422110FixtureProposal(fullOutput, candidateBundle) {
  const candidates = new Map(candidateBundle.candidates.map((candidate) => [candidate.moveId, candidate]));
  const retain = (move) => {
    const candidate = candidates.get(move.moveId);
    assertV4(candidate, `${move.moveId}: fixture candidate missing`);
    const judgment = { qualifiedCandidateId: candidate.qualifiedCandidateId };
    for (const key of MOVE_JUDGMENT_KEYS.slice(1)) judgment[key] = clone(move[key]);
    return judgment;
  };
  return {
    schemaVersion: V422110_OUTPUT_VERSION,
    protocolId: V422110_PROTOCOL_ID,
    debateNumber: fullOutput.debateNumber,
    debateId: fullOutput.debateId,
    reviewerRole: fullOutput.reviewerRole,
    assessmentModel: fullOutput.assessmentModel,
    calibrationOnly: fullOutput.calibrationOnly,
    isolation: clone(fullOutput.isolation),
    routes: clone(fullOutput.routes),
    sectionJudgments: fullOutput.sections.map((section) => ({ ...clone(section), proSelections: fullOutput.moves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").map(retain), conSelections: fullOutput.moves.filter((move) => move.sectionId === section.sectionId && move.side === "con").map(retain) })),
    burdenCompletionAdjustment: clone(fullOutput.burdenCompletionAdjustment),
    audit: { allLoadBearingLinesRepresented: fullOutput.audit.allLoadBearingLinesRepresented, allMovesJudgedOnce: fullOutput.audit.allMovesJudgedOnce, sectionWeightsLockedBeforeRatings: fullOutput.audit.sectionWeightsLockedBeforeRatings, responseComponentsApplied: fullOutput.audit.responseComponentsApplied, closedPrecisionAnchorsApplied: fullOutput.audit.closedPrecisionAnchorsApplied, closedCalibrationAnchorsApplied: fullOutput.audit.closedCalibrationAnchorsApplied, charityAnchorApplied: fullOutput.audit.charityAnchorApplied, burdenExclusionRuleApplied: fullOutput.audit.burdenExclusionRuleApplied, calculatedTotalsAbsent: fullOutput.audit.calculatedTotalsAbsent, completeCandidateBundleReviewed: true, distributedSourceCoverageReliedUpon: true }
  };
}
