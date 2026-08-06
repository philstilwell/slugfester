import { assertV4 } from "./v4-lean-production.mjs";
import { normalizeV418Events } from "./v418-source-integrity.mjs";
import { renderV4220EvidenceWindow } from "./v4220-source-span-rendering.mjs";

export const V422115_ROOT = "docs/calibration/v4.2.21.15/candidate-evidence-transport";
export const V422115_PROTOCOL_ID = "v4.2.21.15-candidate-evidence-transport";
export const V422115_BUNDLE_VERSION = "4.2.21.15-candidate-evidence-bundle";

const clone = (value) => structuredClone(value);

export function buildV422115EvidenceBundle(candidateBundle, eventsDocument) {
  assertV4(Array.isArray(candidateBundle?.candidates) && candidateBundle.candidates.length >= 8, "candidate evidence transport requires a complete candidate bundle");
  const events = normalizeV418Events(eventsDocument);
  const candidates = candidateBundle.candidates.map((candidate) => {
    const rendered = renderV4220EvidenceWindow({ moveId: candidate.qualifiedCandidateId, proposition: candidate.proposition, sourceSpan: candidate.sourceSpan, evidenceBasis: candidate.loadBearingReason, response: { rationale: candidate.contextSummary } }, events);
    return { qualifiedCandidateId: candidate.qualifiedCandidateId, side: candidate.side, speaker: candidate.speaker, discoveryMoveKindAdvisory: candidate.moveKind, proposedProposition: candidate.proposition, sourceSpan: clone(candidate.sourceSpan), attributionConfidence: candidate.attributionConfidence, attributionBasis: candidate.attributionBasis, loadBearingLevel: candidate.loadBearingLevel, loadBearingReason: candidate.loadBearingReason, responseIntent: clone(candidate.responseIntent), contextSummary: candidate.contextSummary, candidateConfidence: candidate.candidateConfidence, candidateEvidence: { excerpt: rendered.excerpt, characterCount: rendered.characterCount, tokenCount: rendered.tokenCount, sourceExact: rendered.sourceExact, wholeWordBoundaries: rendered.wholeWordBoundaries } };
  });
  return { schemaVersion: V422115_BUNDLE_VERSION, protocolId: V422115_PROTOCOL_ID, debateNumber: candidateBundle.debateNumber, debateId: candidateBundle.debateId, completeSourceDiscovery: { chunks: candidateBundle.completeSourceDiscovery.chunks, everyEventOwnedExactlyOnce: candidateBundle.completeSourceDiscovery.everyEventOwnedExactlyOnce, everyCoreReportedComplete: candidateBundle.completeSourceDiscovery.everyCoreReportedComplete, everyCandidateRetained: candidates.length === candidateBundle.candidates.length, semanticCandidateDownselectionPerformed: false }, candidateCount: candidates.length, evidencePolicy: { excerptsPerCandidate: 1, minimumTokens: 12, maximumTokens: 90, maximumCharacters: 450, sourceExact: true, renderingAnchors: ["proposition", "loadBearingReason", "contextSummary"], finalSelectedMoveEvidenceRerenderedAfterPrimary: true }, candidates };
}

export function validateV422115EvidenceBundle(evidenceBundle, candidateBundle, eventsDocument) {
  const expected = buildV422115EvidenceBundle(candidateBundle, eventsDocument);
  assertV4(JSON.stringify(evidenceBundle) === JSON.stringify(expected), "candidate evidence bundle does not replay deterministically");
  assertV4(evidenceBundle.candidateCount === candidateBundle.candidateCount && evidenceBundle.candidates.every((candidate, index) => candidate.qualifiedCandidateId === candidateBundle.candidates[index].qualifiedCandidateId), "candidate evidence transport changed candidate inventory");
  assertV4(evidenceBundle.candidates.every((candidate) => candidate.candidateEvidence.sourceExact && candidate.candidateEvidence.tokenCount >= 12 && candidate.candidateEvidence.tokenCount <= 90 && candidate.candidateEvidence.characterCount <= 450), "candidate evidence bounds failed");
  return { status: "passed", debateNumber: evidenceBundle.debateNumber, candidates: evidenceBundle.candidateCount, everyCandidateRetained: true, sourceExactEvidence: true, semanticCandidateDownselectionPerformed: false };
}
