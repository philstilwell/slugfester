import { canonicalJson } from "./v41-lean-production.mjs";
import { compileV426PrimaryOutput, makeV426PrimarySchema, validateV426PrimaryOutput } from "./v426-retired-completion.mjs";

export const V4212_ROOT = "docs/calibration/v4.2.12/lean-integrated-long-context-primary";
export const V4212_PROTOCOL_ID = "v4.2.12-lean-integrated-long-context-primary";
export const V4212_OUTPUT_VERSION = "4.2.12-lean-integrated-primary-proposal";
const clone = (value) => structuredClone(value);
const canonicalSort = (left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.qualifiedCandidateId.localeCompare(right.qualifiedCandidateId);

export function makeV4212Schema() {
  const base = makeV426PrimarySchema();
  const fullMove = base.properties.moves.items.properties;
  const retainedMoveProperties = {};
  for (const key of ["moveId", "sectionId", "proposition", "attributionBasis", "importance", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"]) retainedMoveProperties[key] = fullMove[key];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v4212-lean-integrated-primary",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "routes", "sections", "moves", "burdenCompletionAdjustment", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V4212_OUTPUT_VERSION },
      protocolId: { type: "string", const: V4212_PROTOCOL_ID },
      debateNumber: { type: "string", const: "99" },
      routes: base.properties.routes,
      sections: base.properties.sections,
      moves: {
        type: "array",
        minItems: 8,
        maxItems: 24,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["qualifiedCandidateId", ...Object.keys(retainedMoveProperties)],
          properties: { qualifiedCandidateId: { type: "string", minLength: 1 }, ...retainedMoveProperties }
        }
      },
      burdenCompletionAdjustment: base.properties.burdenCompletionAdjustment,
      audit: base.properties.audit
    }
  };
}

export function buildV4212LeanBundle(candidateBundle) {
  return {
    schemaVersion: "4.2.12-lean-candidate-bundle",
    debateNumber: candidateBundle.debateNumber,
    completeSourceDiscovery: candidateBundle.completeSourceDiscovery,
    candidateCount: candidateBundle.candidateCount,
    candidates: candidateBundle.candidates.map((candidate) => ({
      qualifiedCandidateId: candidate.qualifiedCandidateId,
      side: candidate.side,
      speaker: candidate.speaker,
      moveKind: candidate.moveKind,
      proposedProposition: candidate.proposition,
      sourceSpan: candidate.sourceSpan,
      attributionConfidence: candidate.attributionConfidence,
      attributionBasis: candidate.attributionBasis,
      loadBearingLevel: candidate.loadBearingLevel,
      loadBearingReason: candidate.loadBearingReason,
      responseIntent: candidate.responseIntent,
      contextSummary: candidate.contextSummary,
      candidateConfidence: candidate.candidateConfidence
    }))
  };
}

export function buildV4212GoldProposal(fullOutput, candidateBundle) {
  const available = candidateBundle.candidates;
  const moves = fullOutput.moves.map((move) => {
    const matches = available.filter((candidate) => candidate.side === move.side && candidate.speaker === move.speaker && candidate.sourceSpan.startEvent === move.sourceSpan.startEvent && candidate.sourceSpan.endEvent === move.sourceSpan.endEvent);
    if (matches.length !== 1) throw new Error(`${move.moveId}: exact candidate mapping failed`);
    const retained = { qualifiedCandidateId: matches[0].qualifiedCandidateId };
    for (const key of ["moveId", "sectionId", "proposition", "attributionBasis", "importance", "burdenContact", "response", "precisionFindings", "calibrationFindings", "charity", "ratings", "evidenceBasis", "assessmentConfidence"]) retained[key] = clone(move[key]);
    return retained;
  });
  return { schemaVersion: V4212_OUTPUT_VERSION, protocolId: V4212_PROTOCOL_ID, debateNumber: "99", routes: clone(fullOutput.routes), sections: clone(fullOutput.sections), moves, burdenCompletionAdjustment: clone(fullOutput.burdenCompletionAdjustment), audit: clone(fullOutput.audit) };
}

export function compileAndValidateV4212(proposal, candidateBundle, packet, eventsDocument, eventsBytes, ledgerBytes) {
  if (proposal.schemaVersion !== V4212_OUTPUT_VERSION || proposal.protocolId !== V4212_PROTOCOL_ID || proposal.debateNumber !== "99") throw new Error("v4.2.12 proposal identity mismatch");
  const candidates = new Map(candidateBundle.candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate]));
  if (candidates.size !== candidateBundle.candidates.length) throw new Error("v4.2.12 candidate identities are not unique");
  const selectedIds = proposal.moves.map((move) => move.qualifiedCandidateId);
  if (new Set(selectedIds).size !== selectedIds.length || selectedIds.some((id) => !candidates.has(id))) throw new Error("v4.2.12 selected candidate set is invalid");
  const moveIds = proposal.moves.map((move) => move.moveId);
  if (new Set(moveIds).size !== moveIds.length) throw new Error("v4.2.12 move IDs are not unique");
  const selected = proposal.moves.map((move) => ({ proposal: move, candidate: candidates.get(move.qualifiedCandidateId) })).sort((left, right) => canonicalSort(left.candidate, right.candidate));
  const canonicalMoveIds = selected.map((item) => item.proposal.moveId);
  const canonicalIndex = new Map(canonicalMoveIds.map((moveId, index) => [moveId, index]));
  for (const [index, item] of selected.entries()) {
    if (item.candidate.moveKind === "constructive" && (item.proposal.response.class !== "constructive-opening" || item.proposal.response.decisiveTargetIds.length !== 0)) throw new Error(`${item.proposal.moveId}: constructive response mismatch`);
    if (item.candidate.moveKind === "reply") for (const targetId of item.proposal.response.decisiveTargetIds) if (!canonicalIndex.has(targetId) || canonicalIndex.get(targetId) >= index) throw new Error(`${item.proposal.moveId}: reply target is not an earlier selected move`);
  }
  const output = {
    schemaVersion: "4.2.6-conservative-excerpt-retired-primary-output",
    protocolId: "v4.2.6-conservative-excerpt-retired-completion",
    debateNumber: "99",
    debateId: packet.debateId,
    reviewerRole: "integrated-primary-judge",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: { legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerLabelsUnavailable: true, otherJudgmentsUnavailable: true, assessmentProseUnavailable: true, contaminationDetected: false },
    routes: clone(proposal.routes),
    sections: clone(proposal.sections),
    moves: selected.map(({ proposal: move, candidate }) => ({
      moveId: move.moveId,
      sectionId: move.sectionId,
      side: candidate.side,
      speaker: candidate.speaker,
      moveKind: candidate.moveKind,
      proposition: move.proposition,
      sourceSpan: clone(candidate.sourceSpan),
      attributionConfidence: candidate.attributionConfidence,
      attributionBasis: move.attributionBasis,
      importance: move.importance,
      burdenContact: clone(move.burdenContact),
      response: clone(move.response),
      precisionFindings: clone(move.precisionFindings),
      calibrationFindings: clone(move.calibrationFindings),
      charity: clone(move.charity),
      ratings: clone(move.ratings),
      evidenceBasis: move.evidenceBasis,
      assessmentConfidence: move.assessmentConfidence
    })),
    burdenCompletionAdjustment: clone(proposal.burdenCompletionAdjustment),
    audit: clone(proposal.audit)
  };
  const validation = validateV426PrimaryOutput(output, packet, eventsDocument, eventsBytes, ledgerBytes);
  const provenance = output.moves.map((move, index) => ({ moveId: move.moveId, qualifiedCandidateId: selected[index].candidate.qualifiedCandidateId, immutableCandidateFieldsPreserved: canonicalJson({ side: move.side, speaker: move.speaker, moveKind: move.moveKind, sourceSpan: move.sourceSpan, attributionConfidence: move.attributionConfidence }) === canonicalJson({ side: selected[index].candidate.side, speaker: selected[index].candidate.speaker, moveKind: selected[index].candidate.moveKind, sourceSpan: selected[index].candidate.sourceSpan, attributionConfidence: selected[index].candidate.attributionConfidence }) }));
  if (provenance.some((item) => !item.immutableCandidateFieldsPreserved)) throw new Error("v4.2.12 candidate provenance mismatch");
  return { output, compiled: compileV426PrimaryOutput(output, packet, eventsDocument), validation: { ...validation, leanIntegratedPrimary: { status: "passed", selectedCandidateIdsUnique: true, immutableCandidateFieldsRepositoryOwned: true, fullValidatorUnchanged: true } }, provenance };
}
