import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, contextExcerpt, eventExcerpt } from "./v381-source-preparation.mjs";
import { validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V388_REVIEW_ROOT = "docs/calibration/v3.8.8/coverage-independent-review";
export const V388_CONSENSUS_ROOT = "docs/calibration/v3.8.8/coverage-consensus";
export const V388_DEBATE_NUMBERS = ["55", "103", "161"];

const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const normalizeText = (value) => String(value).replace(/\s+/g, " ").trim();
const sortedUnique = (values) => [...new Set(values)].sort();

function mappingByCandidate(mapping) {
  return new Map(mapping.mappingEntries.map((entry) => [entry.candidateRef, entry]));
}

export function stableMissingRef(debateId, missingRef) {
  assert(/^missing-\d{2}$/.test(missingRef), `${missingRef}: invalid missing reference`);
  return `${debateId}-coverage-${missingRef}-v388`;
}

export function stableRefResolver(mapping) {
  const byCandidate = mappingByCandidate(mapping);
  return (ref) => {
    if (byCandidate.has(ref)) return byCandidate.get(ref).stableRef;
    if (/^missing-\d{2}$/.test(ref)) return stableMissingRef(mapping.debateId, ref);
    throw new Error(`${ref}: unresolved local reference`);
  };
}

function candidateContext(packet, candidateRef) {
  const candidate = packet.candidates.find((item) => item.candidateRef === candidateRef);
  assert(candidate, `${candidateRef}: candidate context missing`);
  return {
    motion: packet.motion,
    candidate: structuredClone(candidate)
  };
}

function routeAndBridge(packet, bridgeId) {
  for (const route of packet.routes) {
    const bridge = route.bridges.find((item) => item.bridgeId === bridgeId);
    if (bridge) return {
      route: {
        routeId: route.routeId,
        side: route.side,
        description: route.description,
        successCriteria: route.successCriteria
      },
      bridge: structuredClone(bridge)
    };
  }
  throw new Error(`${bridgeId}: bridge context missing`);
}

function selectedEvidence(packet, review, refs) {
  const missingByRef = new Map(review.missingMoves.map((item) => [item.missingRef, item]));
  return sortedUnique(refs).map((ref) => {
    const candidate = packet.candidates.find((item) => item.candidateRef === ref);
    if (candidate) return { ref, sourceSpan: candidate.sourceSpan, atomicExcerpt: candidate.atomicExcerpt };
    const missing = missingByRef.get(ref);
    if (missing) return {
      ref,
      sourceSpan: { startEvent: missing.startEvent, endEvent: missing.endEvent },
      proposition: missing.proposition
    };
    throw new Error(`${ref}: selected evidence reference missing`);
  });
}

function comparison(field) {
  return { ...field, agreed: same(field.proposalValue, field.reviewValue) };
}

export function compareCoverageProposalAndReview({ packet, mapping, review, events, audioVerification }) {
  assert(packet.debateNumber === mapping.debateNumber && mapping.debateNumber === review.debateNumber, "coverage comparison identity mismatch");
  const byCandidate = mappingByCandidate(mapping);
  const toStable = stableRefResolver(mapping);
  const fields = [];

  for (const reviewed of review.candidateReviews) {
    const entry = byCandidate.get(reviewed.candidateRef);
    assert(entry, `${reviewed.candidateRef}: private mapping missing`);
    const proposal = entry.proposalSnapshot;
    const base = {
      subjectType: "candidate",
      subjectId: entry.stableRef,
      context: candidateContext(packet, reviewed.candidateRef)
    };
    fields.push(comparison({
      ...base,
      fieldId: `candidate:${entry.stableRef}:valid`,
      fieldName: "valid",
      proposalValue: proposal.candidateValid,
      reviewValue: reviewed.candidateValid
    }));
    if (!reviewed.candidateValid) continue;
    const pairs = [
      ["speakerSide", { speaker: proposal.speaker, side: proposal.side }, { speaker: reviewed.speaker, side: reviewed.side }],
      ["proposition", normalizeText(proposal.proposition), normalizeText(reviewed.proposition)],
      ["attributionConfidence", proposal.attributionConfidence, reviewed.attributionConfidence],
      ["selectionRole", proposal.selectionRole, reviewed.selectionRole],
      ["moveKind", proposal.moveKind, reviewed.moveKind],
      ["respondsToRefs", sortedUnique(proposal.respondsToRefs.map(toStable)), sortedUnique(reviewed.respondsToRefs.map(toStable))]
    ];
    for (const [fieldName, proposalValue, reviewValue] of pairs) fields.push(comparison({
      ...base,
      fieldId: `candidate:${entry.stableRef}:${fieldName}`,
      fieldName,
      proposalValue,
      reviewValue
    }));
  }

  const audioRecords = new Map((audioVerification?.records ?? []).map((record) => [`${record.debateNumber}:${record.subjectRef}`, record]));
  for (const missing of review.missingMoves) {
    const stableRef = stableMissingRef(mapping.debateId, missing.missingRef);
    const startMs = events[missing.startEvent].startMs;
    const endMs = events[missing.endEvent].startMs + events[missing.endEvent].durationMs;
    const reviewValue = {
      stableRef,
      sourceSpan: { startEvent: missing.startEvent, endEvent: missing.endEvent, startMs, endMs },
      atomicExcerpt: eventExcerpt(events, missing.startEvent, missing.endEvent),
      contextWindow: contextExcerpt(events, missing.startEvent, missing.endEvent),
      speaker: missing.speaker,
      side: missing.side,
      proposition: normalizeText(missing.proposition),
      attributionConfidence: missing.attributionConfidence,
      selectionRole: missing.selectionRole,
      moveKind: missing.moveKind,
      respondsToRefs: sortedUnique(missing.respondsToRefs.map(toStable))
    };
    fields.push(comparison({
      fieldId: `missing:${stableRef}:inclusion`,
      subjectType: "missing-move",
      subjectId: stableRef,
      fieldName: "inclusion",
      proposalValue: null,
      reviewValue,
      context: {
        motion: packet.motion,
        localMissingRef: missing.missingRef,
        sourceSpan: reviewValue.sourceSpan,
        atomicExcerpt: reviewValue.atomicExcerpt,
        contextWindow: reviewValue.contextWindow,
        audioVerification: audioRecords.get(`${packet.debateNumber}:${missing.missingRef}`) ?? null
      }
    }));
  }

  const reviewBridgeById = new Map(review.bridgeCoverage.map((item) => [item.bridgeId, item]));
  for (const proposed of mapping.proposalBridgeCoverage) {
    const reviewed = reviewBridgeById.get(proposed.bridgeId);
    assert(reviewed, `${proposed.bridgeId}: reviewed bridge coverage missing`);
    const evidenceRefs = [...proposed.moveRefs, ...reviewed.moveRefs];
    fields.push(comparison({
      fieldId: `bridge:${proposed.bridgeId}:coverageStatus`,
      subjectType: "bridge",
      subjectId: proposed.bridgeId,
      fieldName: "coverageStatus",
      proposalValue: proposed.status,
      reviewValue: reviewed.status,
      context: {
        motion: packet.motion,
        ...routeAndBridge(packet, proposed.bridgeId),
        evidence: selectedEvidence(packet, review, evidenceRefs)
      },
      provenance: {
        proposalMoveRefs: proposed.moveRefs.map(toStable),
        reviewMoveRefs: reviewed.moveRefs.map(toStable)
      }
    }));
  }

  const reviewConcessionBySide = new Map(review.materialConcessionAudit.map((item) => [item.side, item]));
  for (const proposed of mapping.proposalConcessionAudit) {
    const reviewed = reviewConcessionBySide.get(proposed.side);
    assert(reviewed, `${proposed.side}: reviewed concession audit missing`);
    fields.push(comparison({
      fieldId: `concession:${proposed.side}:audit`,
      subjectType: "concession",
      subjectId: proposed.side,
      fieldName: "audit",
      proposalValue: { status: proposed.status, moveRefs: sortedUnique(proposed.moveRefs.map(toStable)) },
      reviewValue: { status: reviewed.status, moveRefs: sortedUnique(reviewed.moveRefs.map(toStable)) },
      context: {
        motion: packet.motion,
        side: proposed.side,
        evidence: selectedEvidence(packet, review, [...proposed.moveRefs, ...reviewed.moveRefs])
      }
    }));
  }
  return fields;
}

export function makeCoverageAdjudicationArtifacts(debateNumber, debateId, comparisons, rotationSeed = 0) {
  const disputes = comparisons.filter((item) => !item.agreed);
  const map = { schemaVersion: "3.8.8-coverage-adjudication-option-map", debateNumber, debateId, fields: [] };
  const disputedFields = disputes.map((dispute, index) => {
    const values = (rotationSeed + index) % 2 === 0
      ? [{ origin: "proposal", value: dispute.proposalValue }, { origin: "review", value: dispute.reviewValue }]
      : [{ origin: "review", value: dispute.reviewValue }, { origin: "proposal", value: dispute.proposalValue }];
    const candidates = values.map((item, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, value: item.value }));
    map.fields.push({
      fieldId: dispute.fieldId,
      options: values.map((item, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, origin: item.origin, value: item.value }))
    });
    return {
      fieldId: dispute.fieldId,
      subjectType: dispute.subjectType,
      subjectId: dispute.subjectId,
      fieldName: dispute.fieldName,
      context: structuredClone(dispute.context),
      candidates
    };
  });
  const packet = {
    schemaVersion: "3.8.8-coverage-adjudication-packet",
    debateNumber,
    debateId,
    reviewerRole: "coverage-adjudicator",
    disputedFields
  };
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v388-coverage-adjudication-${debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "debateId", "reviewerRole", "fields"],
    properties: {
      schemaVersion: { type: "string", const: "3.8.8-coverage-adjudication-output" },
      debateNumber: { type: "string", const: debateNumber },
      debateId: { type: "string", const: debateId },
      reviewerRole: { type: "string", const: "coverage-adjudicator" },
      fields: {
        type: "array",
        minItems: disputes.length,
        maxItems: disputes.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fieldId", "optionId", "rationale"],
          properties: {
            fieldId: { type: "string", enum: disputes.map((item) => item.fieldId) },
            optionId: { type: "string", enum: ["option-1", "option-2"] },
            rationale: { type: "string", minLength: 80 }
          }
        }
      }
    }
  };
  return { packet, schema, map };
}

export function validateCoverageAdjudicationOutput(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema), output, `coverageAdjudication.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8.8-coverage-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "coverage-adjudicator", "coverage adjudication identity invalid");
  assert(output.fields.length === packet.disputedFields.length && !containsScoreField(output), "coverage adjudication count or score prohibition invalid");
  for (let index = 0; index < packet.disputedFields.length; index += 1) {
    const expected = packet.disputedFields[index];
    const actual = output.fields[index];
    assert(actual.fieldId === expected.fieldId && expected.candidates.some((candidate) => candidate.optionId === actual.optionId), `${expected.fieldId}: adjudication choice invalid`);
  }
  return output;
}

function adjudicatedValue(map, fieldId, optionId) {
  const value = map.fields.find((item) => item.fieldId === fieldId)?.options.find((item) => item.optionId === optionId)?.value;
  assert(value !== undefined, `${fieldId}.${optionId}: adjudication option missing`);
  return value;
}

export function resolveCoverageFields(comparisons, adjudicationOutput, adjudicationMap) {
  const adjudicated = new Map((adjudicationOutput?.fields ?? []).map((item) => [item.fieldId, adjudicatedValue(adjudicationMap, item.fieldId, item.optionId)]));
  return comparisons.map((field) => {
    const finalValue = field.agreed ? field.proposalValue : adjudicated.get(field.fieldId);
    assert(finalValue !== undefined, `${field.fieldId}: final value missing`);
    const votes = Number(same(finalValue, field.proposalValue)) + Number(same(finalValue, field.reviewValue)) + Number(!field.agreed && same(finalValue, adjudicated.get(field.fieldId)));
    assert(votes >= 2, `${field.fieldId}: two-vote resolution absent`);
    return { ...field, finalValue, finalVotes: votes };
  });
}

export { assert, canonicalJson };
