import { assertV4 } from "./v4-lean-production.mjs";

export const V4221162_PROTOCOL_ID = "v4.2.21.16.2-inventory-transport-recovery";
export const V4221162_BUNDLE_VERSION = "4.2.21.16.2-inventory-candidate-transport";

const clone = (value) => structuredClone(value);

export function buildV4221162InventoryCandidateTransport(evidenceBundle) {
  assertV4(evidenceBundle?.completeSourceDiscovery?.everyCandidateRetained === true && evidenceBundle.completeSourceDiscovery.semanticCandidateDownselectionPerformed === false, "inventory transport requires a complete unreduced evidence bundle");
  assertV4(Array.isArray(evidenceBundle.candidates) && evidenceBundle.candidates.length === evidenceBundle.candidateCount, "inventory transport candidate count mismatch");
  return {
    schemaVersion: V4221162_BUNDLE_VERSION,
    protocolId: V4221162_PROTOCOL_ID,
    debateNumber: evidenceBundle.debateNumber,
    debateId: evidenceBundle.debateId,
    completeSourceDiscovery: clone(evidenceBundle.completeSourceDiscovery),
    candidateCount: evidenceBundle.candidateCount,
    transportPolicy: {
      everyCandidateRetained: true,
      semanticCandidateDownselectionPerformed: false,
      sourceExactExcerptRetained: true,
      validatorOwnedFieldsOmittedFromModelTransport: ["attributionConfidence", "attributionBasis", "candidateConfidence", "candidateEvidence.characterCount", "candidateEvidence.tokenCount", "candidateEvidence.wholeWordBoundaries"],
      omittedFieldsRestoredFromHashLockedFullEvidenceBundleAfterSelection: true
    },
    candidates: evidenceBundle.candidates.map((candidate) => ({
      qualifiedCandidateId: candidate.qualifiedCandidateId,
      side: candidate.side,
      speaker: candidate.speaker,
      discoveryMoveKindAdvisory: candidate.discoveryMoveKindAdvisory,
      proposedProposition: candidate.proposedProposition,
      sourceSpan: clone(candidate.sourceSpan),
      loadBearingLevel: candidate.loadBearingLevel,
      loadBearingReason: candidate.loadBearingReason,
      responseIntent: clone(candidate.responseIntent),
      contextSummary: candidate.contextSummary,
      candidateEvidence: { excerpt: candidate.candidateEvidence.excerpt, sourceExact: candidate.candidateEvidence.sourceExact }
    }))
  };
}

export function validateV4221162InventoryCandidateTransport(projected, evidenceBundle) {
  const expected = buildV4221162InventoryCandidateTransport(evidenceBundle);
  assertV4(JSON.stringify(projected) === JSON.stringify(expected), "inventory candidate transport does not replay deterministically");
  assertV4(projected.candidateCount === evidenceBundle.candidateCount && projected.candidates.every((candidate, index) => candidate.qualifiedCandidateId === evidenceBundle.candidates[index].qualifiedCandidateId), "inventory candidate transport changed candidate identity or order");
  assertV4(projected.candidates.every((candidate) => candidate.candidateEvidence.sourceExact === true && typeof candidate.candidateEvidence.excerpt === "string" && candidate.candidateEvidence.excerpt.length >= 30), "inventory candidate transport lost source-exact evidence");
  return { status: "passed", debateNumber: projected.debateNumber, candidates: projected.candidateCount, everyCandidateRetained: true, semanticCandidateDownselectionPerformed: false, omittedFieldRestorationRequired: true };
}
