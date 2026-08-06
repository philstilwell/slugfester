import { canonicalJson } from "./v4-lean-production.mjs";
import { compileV422112CandidateBundle, validateV422112Discovery } from "./v422112-simplified-discovery.mjs";

export const V42211722_PROTOCOL_ID = "v4.2.21.17.22-order-invariant-simplified-discovery-validation";

export function compareV42211722Candidates(left, right) {
  return left.sourceSpan.startEvent - right.sourceSpan.startEvent
    || left.sourceSpan.endEvent - right.sourceSpan.endEvent
    || left.candidateId.localeCompare(right.candidateId);
}

export function canonicalizeV42211722CandidateOrder(output) {
  const orderedOutput = structuredClone(output);
  if (!Array.isArray(orderedOutput?.candidates)) {
    return {
      orderedOutput,
      audit: {
        rawChronologyCanonical: false,
        canonicalOrderingAppliedForValidation: false,
        rawCandidateIds: null,
        canonicalCandidateIds: null,
        candidateFieldsModified: false,
      },
    };
  }
  const rawCandidateIds = orderedOutput.candidates.map((candidate) => candidate.candidateId);
  orderedOutput.candidates.sort(compareV42211722Candidates);
  const canonicalCandidateIds = orderedOutput.candidates.map((candidate) => candidate.candidateId);
  const rawChronologyCanonical = canonicalJson(rawCandidateIds) === canonicalJson(canonicalCandidateIds);
  return {
    orderedOutput,
    audit: {
      rawChronologyCanonical,
      canonicalOrderingAppliedForValidation: !rawChronologyCanonical,
      rawCandidateIds,
      canonicalCandidateIds,
      candidateFieldsModified: false,
    },
  };
}

export function validateV42211722Discovery(output, args) {
  const { orderedOutput, audit } = canonicalizeV42211722CandidateOrder(output);
  const validation = validateV422112Discovery(orderedOutput, args);
  return {
    ...validation,
    validationProtocolId: V42211722_PROTOCOL_ID,
    rawChronologyCanonical: audit.rawChronologyCanonical,
    canonicalOrderingAppliedForValidation: audit.canonicalOrderingAppliedForValidation,
    candidateFieldsModified: audit.candidateFieldsModified,
  };
}

export function compileV42211722CandidateBundle(args) {
  return compileV422112CandidateBundle(args);
}
