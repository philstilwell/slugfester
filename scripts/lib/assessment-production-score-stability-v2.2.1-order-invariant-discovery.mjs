import { canonicalJson } from "./v4-lean-production.mjs";
import {
  compileV212CandidateBundle,
  validateV212Discovery,
} from "./assessment-production-score-stability-v2.1.2-discovery.mjs";

export const V221_DISCOVERY_VALIDATION_PROTOCOL_ID =
  "assessment-production-score-stability-v2.2.1-order-invariant-bounded-end-discovery";

export function compareV221DiscoveryCandidates(left, right) {
  return (
    left.sourceWindow.startEvent - right.sourceWindow.startEvent ||
    left.sourceWindow.endEvent - right.sourceWindow.endEvent ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

export function canonicalizeV221DiscoveryCandidateOrder(output) {
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
  const rawCandidateIds = orderedOutput.candidates.map(
    (candidate) => candidate.candidateId
  );
  orderedOutput.candidates.sort(compareV221DiscoveryCandidates);
  const canonicalCandidateIds = orderedOutput.candidates.map(
    (candidate) => candidate.candidateId
  );
  const rawChronologyCanonical =
    canonicalJson(rawCandidateIds) === canonicalJson(canonicalCandidateIds);
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

export function validateV221Discovery(output, args) {
  const { orderedOutput, audit } =
    canonicalizeV221DiscoveryCandidateOrder(output);
  const validation = validateV212Discovery(orderedOutput, args);
  return {
    ...validation,
    validationProtocolId: V221_DISCOVERY_VALIDATION_PROTOCOL_ID,
    rawChronologyCanonical: audit.rawChronologyCanonical,
    canonicalOrderingAppliedForValidation:
      audit.canonicalOrderingAppliedForValidation,
    rawCandidateIds: audit.rawCandidateIds,
    canonicalCandidateIds: audit.canonicalCandidateIds,
    candidateFieldsModified: audit.candidateFieldsModified,
  };
}

export function compileV221CandidateBundle(args) {
  return compileV212CandidateBundle(args);
}
