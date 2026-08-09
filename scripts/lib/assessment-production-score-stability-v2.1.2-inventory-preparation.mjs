import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";
import { buildV422115EvidenceBundle } from "./v422115-candidate-evidence-transport.mjs";
import {
  CANDIDATE_SHARDED_INVENTORY,
  buildCandidateCensus,
  candidateCensusCanonicalSha256,
  fullCandidateTransportCanonicalSha256,
} from "./assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  DECOMPOSED_INVENTORY_LIMITS,
} from "./assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

export const V212_CANDIDATE_SHARDED_INVENTORY = Object.freeze({
  protocolId:
    "assessment-production-score-stability-v2.1.2-fresh-validation-candidate-sharded-inventory",
  sourcePacketVersion:
    "1.0-score-stability-v2.1.2-candidate-sharded-inventory-source-packet",
  evidenceBundleVersion:
    "1.0-score-stability-v2.1.2-candidate-evidence-bundle",
  evidenceProtocolId:
    "assessment-production-score-stability-v2.1.2-candidate-evidence-transport",
  columnarTransportVersion:
    "1.0-score-stability-v2.1.2-lossless-columnar-candidate-transport",
  maximumCopiedInputBytes: 115000,
});

export const V212_INVENTORY_COLUMN_ORDER = Object.freeze([
  "qualifiedCandidateId",
  "side",
  "speaker",
  "discoveryMoveKindAdvisory",
  "proposedProposition",
  "sourceSpan.startEvent",
  "sourceSpan.endEvent",
  "loadBearingLevel",
  "loadBearingReason",
  "responseIntent.kind",
  "responseIntent.earlierTargetDescription",
  "contextSummary",
  "candidateEvidence.excerpt",
  "candidateEvidence.sourceExact",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

function getPath(value, dottedPath) {
  return dottedPath
    .split(".")
    .reduce((current, key) => current[key], value);
}

function setPath(value, dottedPath, fieldValue) {
  const keys = dottedPath.split(".");
  let current = value;
  for (let index = 0; index < keys.length - 1; index += 1) {
    current[keys[index]] ??= {};
    current = current[keys[index]];
  }
  current[keys.at(-1)] = fieldValue;
}

export function buildV212InventorySourcePacket(sourcePacket) {
  assertV4(
    sourcePacket?.schemaVersion ===
      "1.0-score-stability-v2.1.2-validation-score-blind-source-packet" &&
      sourcePacket.protocolId ===
        "assessment-production-score-stability-v2.1.2-fresh-validation-source-preparation" &&
      sourcePacket.modelInputBoundary?.scoreBlindDiscoveryOnly === true &&
      sourcePacket.modelInputBoundary?.developmentValidationOnly === true,
    "v2.1.2 discovery source packet is unavailable"
  );
  return {
    ...clone(sourcePacket),
    schemaVersion: V212_CANDIDATE_SHARDED_INVENTORY.sourcePacketVersion,
    protocolId: V212_CANDIDATE_SHARDED_INVENTORY.protocolId,
    modelInputBoundary: {
      candidateShardedInventoryOnly: true,
      developmentValidationOnly: true,
      stagingOnlyIntermediateOutput: true,
      scoreBlind: true,
      candidateCensusAvailableToPlanner: true,
      candidateEvidenceExcerptsUnavailableToPlanner: true,
      candidateSelectionUnavailableToPlanner: true,
      plannerWritableDomainsLimitedToRoutesAndSections: true,
      immutableAcceptedPlanRequiredBeforeSidePacketFreeze: true,
      completeSideCandidateEvidenceAvailableOnlyToCorrespondingSelector: true,
      otherSideCandidateEvidenceUnavailableToSelector: true,
      otherSideSelectorOutputUnavailableToSelector: true,
      inventoryPlanExecutionMetadataUnavailableToSelector: true,
      legacyAssessmentsUnavailable: true,
      priorJudgmentsUnavailable: true,
      ratingsUnavailable: true,
      scoresAndCalculatedTotalsUnavailable: true,
      winnersTagsAndPublicationProseUnavailable: true,
      otherDebatesUnavailable: true,
    },
  };
}

export function buildV212InventoryEvidenceBundle(
  candidateBundle,
  eventsDocument
) {
  assertV4(
    candidateBundle?.schemaVersion ===
      "1.0-score-stability-v2.1.2-candidate-bundle" &&
      candidateBundle.protocolId ===
        "assessment-production-score-stability-v2.1.2-bounded-end-discovery" &&
      candidateBundle.completeSourceDiscovery
        ?.repositoryDerivedLexicalTokenCounts === true &&
      candidateBundle.completeSourceDiscovery
        ?.modelAuthoredLexicalTokenCounts === false &&
      candidateBundle.completeSourceDiscovery?.modelAuthoredBoundedEndEvents ===
        true,
    "passing v2.1.2 candidate bundle required"
  );
  const inherited = buildV422115EvidenceBundle(
    candidateBundle,
    eventsDocument
  );
  return {
    ...inherited,
    schemaVersion: V212_CANDIDATE_SHARDED_INVENTORY.evidenceBundleVersion,
    protocolId: V212_CANDIDATE_SHARDED_INVENTORY.evidenceProtocolId,
    completeSourceDiscovery: {
      ...clone(candidateBundle.completeSourceDiscovery),
      everyCandidateRetained:
        inherited.candidates.length === candidateBundle.candidates.length,
      semanticCandidateDownselectionPerformed: false,
    },
  };
}

export function validateV212InventoryEvidenceBundle(
  evidenceBundle,
  candidateBundle,
  eventsDocument
) {
  const expected = buildV212InventoryEvidenceBundle(
    candidateBundle,
    eventsDocument
  );
  assertV4(
    isDeepStrictEqual(evidenceBundle, expected),
    "v2.1.2 candidate evidence bundle does not replay deterministically"
  );
  assertV4(
    evidenceBundle.candidateCount === candidateBundle.candidateCount &&
      evidenceBundle.candidates.every(
        (candidate, index) =>
          candidate.qualifiedCandidateId ===
          candidateBundle.candidates[index].qualifiedCandidateId
      ) &&
      evidenceBundle.candidates.every(
        (candidate) =>
          candidate.candidateEvidence.sourceExact === true &&
          candidate.candidateEvidence.tokenCount >= 12 &&
          candidate.candidateEvidence.tokenCount <= 90 &&
          candidate.candidateEvidence.characterCount <= 450
      ),
    "v2.1.2 evidence bounds or candidate identity drifted"
  );
  return {
    status: "passed",
    debateNumber: evidenceBundle.debateNumber,
    candidates: evidenceBundle.candidateCount,
    everyCandidateRetained: true,
    semanticCandidateDownselectionPerformed: false,
  };
}

export function buildV212LosslessColumnarCandidateTransport(source) {
  assertV4(
    source?.completeSourceDiscovery?.everyCandidateRetained === true &&
      source.completeSourceDiscovery.semanticCandidateDownselectionPerformed ===
        false &&
      Array.isArray(source.candidates) &&
      source.candidates.length === source.candidateCount,
    "complete unreduced candidate transport required"
  );
  return {
    schemaVersion:
      V212_CANDIDATE_SHARDED_INVENTORY.columnarTransportVersion,
    sourceSchemaVersion: source.schemaVersion,
    protocolId: source.protocolId,
    debateNumber: source.debateNumber,
    debateId: source.debateId,
    candidateCount: source.candidateCount,
    completeSourceDiscovery: clone(source.completeSourceDiscovery),
    transportPolicy: clone(source.transportPolicy),
    columnOrder: [...V212_INVENTORY_COLUMN_ORDER],
    candidateRows: source.candidates.map((candidate) =>
      V212_INVENTORY_COLUMN_ORDER.map((field) => getPath(candidate, field))
    ),
  };
}

export function decodeV212LosslessColumnarCandidateTransport(columnar) {
  assertV4(
    isDeepStrictEqual(
      columnar.columnOrder,
      [...V212_INVENTORY_COLUMN_ORDER]
    ),
    `${columnar.debateNumber}: inventory column order drifted`
  );
  return {
    schemaVersion: columnar.sourceSchemaVersion,
    protocolId: columnar.protocolId,
    debateNumber: columnar.debateNumber,
    debateId: columnar.debateId,
    completeSourceDiscovery: clone(columnar.completeSourceDiscovery),
    candidateCount: columnar.candidateCount,
    transportPolicy: clone(columnar.transportPolicy),
    candidates: columnar.candidateRows.map((row) => {
      assertV4(
        row.length === V212_INVENTORY_COLUMN_ORDER.length,
        `${columnar.debateNumber}: invalid inventory candidate row width`
      );
      const candidate = {};
      V212_INVENTORY_COLUMN_ORDER.forEach((field, index) =>
        setPath(candidate, field, row[index])
      );
      return candidate;
    }),
  };
}

export function validateV212LosslessColumnarCandidateTransport(
  columnar,
  source
) {
  assertV4(
    isDeepStrictEqual(
      columnar,
      buildV212LosslessColumnarCandidateTransport(source)
    ) &&
      isDeepStrictEqual(
        decodeV212LosslessColumnarCandidateTransport(columnar),
        source
      ),
    "v2.1.2 columnar candidate transport is not lossless"
  );
  return {
    status: "passed",
    debateNumber: columnar.debateNumber,
    candidates: columnar.candidateCount,
    everyCandidateRetained: true,
  };
}

function fixedString(prefix, maximum, fill) {
  assertV4(prefix.length <= maximum, `${prefix}: fixture prefix too long`);
  return `${prefix}${fill.repeat(maximum - prefix.length)}`;
}

export function buildMaximumCandidateShardedPlanFixture({
  legacySchema,
  candidateTransport,
}) {
  const candidateCensus = buildCandidateCensus(candidateTransport);
  const routes = ["pro", "con"].map((side) => ({
    routeId: fixedString(
      `route-${side}-`,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      side === "pro" ? "p" : "c"
    ),
    side,
    description: fixedString(
      `${side} route description `,
      DECOMPOSED_INVENTORY_LIMITS.routeDescription,
      side === "pro" ? "P" : "C"
    ),
    successCriteria: fixedString(
      `${side} route success criteria `,
      DECOMPOSED_INVENTORY_LIMITS.routeSuccessCriteria,
      side === "pro" ? "S" : "T"
    ),
    motionBridge: {
      bridgeId: fixedString(
        `${side}-motion-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        "m"
      ),
      tier: "motion",
      description: fixedString(
        `${side} motion bridge `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "M"
      ),
    },
    centralBridges: Array.from({ length: 4 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-central-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "central",
      description: fixedString(
        `${side} central bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "C"
      ),
    })),
    subsidiaryBridges: Array.from({ length: 2 }, (_, index) => ({
      bridgeId: fixedString(
        `${side}-subsidiary-${index}-`,
        DECOMPOSED_INVENTORY_LIMITS.identifier,
        String(index)
      ),
      tier: "subsidiary",
      description: fixedString(
        `${side} subsidiary bridge ${index} `,
        DECOMPOSED_INVENTORY_LIMITS.bridgeDescription,
        "B"
      ),
    })),
  }));
  const weights = [17, 17, 17, 17, 16, 16];
  const sections = weights.map((weightPercent, index) => ({
    sectionId: fixedString(
      `section-${legacySchema.properties.debateNumber.const}-${index}-`,
      DECOMPOSED_INVENTORY_LIMITS.identifier,
      String(index)
    ),
    title: fixedString(
      `Section ${index} `,
      DECOMPOSED_INVENTORY_LIMITS.title,
      "T"
    ),
    weightPercent,
    rationale: fixedString(
      `Section ${index} rationale `,
      DECOMPOSED_INVENTORY_LIMITS.sectionRationale,
      "R"
    ),
  }));
  return {
    schemaVersion: CANDIDATE_SHARDED_INVENTORY.planSchemaVersion,
    protocolId: CANDIDATE_SHARDED_INVENTORY.planProtocolId,
    debateNumber: legacySchema.properties.debateNumber.const,
    debateId: legacySchema.properties.debateId.const,
    reviewerRole: CANDIDATE_SHARDED_INVENTORY.planReviewerRole,
    assessmentModel: CANDIDATE_SHARDED_INVENTORY.model,
    calibrationOnly: true,
    candidateCensusCanonicalSha256:
      candidateCensusCanonicalSha256(candidateCensus),
    fullCandidateTransportCanonicalSha256:
      fullCandidateTransportCanonicalSha256(candidateTransport),
    isolation: {
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      otherJudgmentsUnavailable: true,
      assessmentProseUnavailable: true,
      otherDebatesUnavailable: true,
      candidateEvidenceExcerptsUnavailable: true,
      contaminationDetected: false,
    },
    routes,
    sections,
    audit: {
      completeCandidateCensusReviewed: true,
      allCandidateIdsAndChronologyAvailable: true,
      candidateEvidenceExcerptsDeferredToSideSelectors: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
}

export function canonicalV212InventorySha256(value) {
  return sha256(canonicalJson(value));
}
