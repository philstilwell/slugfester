import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { contextExcerpt, eventExcerpt, normalizeWords } from "./v381-source-preparation.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V388_ROOT = "docs/calibration/v3.8.8/coverage-independent-review";
export const V388_DEBATE_NUMBERS = ["103", "55", "161"];
export const V388_MANUAL = `${V388_ROOT}/review-manual.md`;
export const SELECTION_ROLES = ["load-bearing-constructive", "major-direct-reply", "material-concession", "contextual-only"];
export const MOVE_KINDS = ["constructive", "reply", "concession"];
export const readJson = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));

const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const boolean = (extra = {}) => ({ type: "boolean", ...extra });
const array = (items, extra = {}) => ({ type: "array", items, ...extra });
const closedObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
export const candidateRef = (index) => `candidate-${String(index + 1).padStart(2, "0")}`;
export const missingRef = (index) => `missing-${String(index + 1).padStart(2, "0")}`;

function seedRecord(decision) {
  return {
    stableRef: decision.seedMoveId,
    startEvent: decision.source.sourceSpan.startEvent,
    endEvent: decision.source.sourceSpan.endEvent,
    sourceSpan: decision.source.sourceSpan,
    atomicExcerpt: decision.source.atomicExcerpt,
    contextWindow: decision.source.contextWindow,
    speaker: decision.source.speaker,
    side: decision.source.side,
    proposition: decision.source.proposition,
    attributionConfidence: decision.source.attributionConfidence,
    attributionBasis: `The fixed source span was resolved in the prior two-vote source stage; the complete transcript and surrounding context identify ${decision.source.speaker} as the continuous speaker.`,
    selectionRole: decision.selectionRole,
    moveKind: decision.moveKind,
    respondsToStableRefs: decision.respondsToRefs,
    rationale: decision.rationale
  };
}

function additionRecord(move) {
  return {
    stableRef: move.moveId,
    startEvent: move.startEvent,
    endEvent: move.endEvent,
    sourceSpan: move.sourceSpan,
    atomicExcerpt: move.atomicExcerpt,
    contextWindow: move.contextWindow,
    speaker: move.speaker,
    side: move.side,
    proposition: move.proposition,
    attributionConfidence: move.attributionConfidence,
    attributionBasis: move.attributionBasis,
    selectionRole: move.selectionRole,
    moveKind: move.moveKind,
    respondsToStableRefs: move.respondsToRefs,
    rationale: move.rationale
  };
}

export function makeReviewArtifacts(proposalPacket, enriched) {
  assert(enriched.audit.coverageClaim === "complete-proposal-pending-independent-review" && enriched.inventorySummary.selectedMoveCount <= 28, "proposal is not ready for review");
  const records = [
    ...enriched.seedDecisions.filter((item) => item.decision === "retain").map(seedRecord),
    ...enriched.additions.map(additionRecord)
  ].sort((left, right) => left.startEvent - right.startEvent || left.endEvent - right.endEvent || left.stableRef.localeCompare(right.stableRef));
  assert(records.length === enriched.inventorySummary.selectedMoveCount, "selected review candidate count mismatch");
  const refByStable = new Map(records.map((record, index) => [record.stableRef, candidateRef(index)]));
  const mappingEntries = records.map((record, index) => ({
    candidateRef: candidateRef(index),
    stableRef: record.stableRef,
    proposalSnapshot: {
      candidateValid: true,
      speaker: record.speaker,
      side: record.side,
      proposition: record.proposition,
      attributionConfidence: record.attributionConfidence,
      attributionBasis: record.attributionBasis,
      selectionRole: record.selectionRole,
      moveKind: record.moveKind,
      respondsToRefs: record.respondsToStableRefs.map((ref) => {
        const mapped = refByStable.get(ref);
        assert(mapped, `${record.stableRef}: response target absent from selected inventory: ${ref}`);
        return mapped;
      }),
      rationale: record.rationale
    }
  }));
  const normalizeRefs = (refs) => refs.map((ref) => {
    const mapped = refByStable.get(ref);
    assert(mapped, `coverage reference absent from review inventory: ${ref}`);
    return mapped;
  });
  const packet = {
    schemaVersion: "3.8.8-independent-coverage-review-packet",
    protocolId: "v3.8.8-independent-coverage-review",
    debateNumber: proposalPacket.debateNumber,
    debateId: proposalPacket.debateId,
    motion: proposalPacket.motion,
    sides: proposalPacket.sides,
    eventCount: proposalPacket.eventCount,
    routes: proposalPacket.routes,
    acceptedBridgeIds: proposalPacket.acceptedBridgeIds,
    candidates: records.map((record, index) => ({
      candidateRef: candidateRef(index),
      sourceSpan: record.sourceSpan,
      atomicExcerpt: record.atomicExcerpt,
      contextWindow: record.contextWindow
    })),
    sourceFilesInContext: { fullTranscript: "transcript.txt", timestampedEvents: "events.json" },
    hiddenProposalFields: ["stable move IDs", "speaker", "side", "proposition", "attribution confidence", "attribution basis", "selection role", "move kind", "response links", "selection rationale", "bridge assignments", "concession assignments"],
    reviewRules: {
      fullTranscriptReviewRequired: true,
      candidateReviewRequiredForEveryCandidate: true,
      missingMovesMaximum: 8,
      finalSelectedMovesMaximum: 28,
      finalSelectedMovesMinimumPerSide: 4,
      everyAcceptedBridgeMustBeRepresentedOrOmissionRecorded: true,
      loadBearingConstructiveMinimumPerSide: 1,
      majorDirectReplyMinimumPerSide: 1,
      materialConcessionMustBeRepresentedOrNoneFound: true,
      mediumOrLowAttributionRequiresLaterAudioVerification: true
    },
    prohibitedOutputs: ["stable move IDs", "burden-contact labels", "section assignments", "weights", "importance", "scores", "winner", "participant assessments", "Overall Commentary", "AI Extension", "legacy prose"]
  };
  const mapping = {
    schemaVersion: "3.8.8-independent-coverage-review-private-mapping",
    debateNumber: proposalPacket.debateNumber,
    debateId: proposalPacket.debateId,
    mappingEntries,
    proposalBridgeCoverage: enriched.bridgeCoverage.map((coverage) => ({ ...structuredClone(coverage), moveRefs: normalizeRefs(coverage.moveRefs) })),
    proposalConcessionAudit: enriched.materialConcessionAudit.map((audit) => ({ ...structuredClone(audit), moveRefs: normalizeRefs(audit.moveRefs) })),
    proposalAudit: structuredClone(enriched.audit)
  };
  return { packet, mapping };
}

function nullableOmission(packet) {
  return { anyOf: [{ type: "null" }, closedObject({ side: string({ enum: ["pro", "con"] }), speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), opportunityStartEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }), opportunityEndEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }), omittedResponse: string({ minLength: 60 }), assessmentConsequence: string({ minLength: 60 }) })] };
}

export function makeReviewSchema(packet) {
  const candidateRefs = packet.candidates.map((item) => item.candidateRef);
  const missingRefs = Array.from({ length: 8 }, (_value, index) => missingRef(index));
  const allRefs = [...candidateRefs, ...missingRefs];
  const refArray = (extra = {}) => array(string({ enum: allRefs }), { maxItems: 8, ...extra });
  const semantics = {
    selectionRole: string({ enum: SELECTION_ROLES }),
    moveKind: string({ enum: MOVE_KINDS }),
    respondsToRefs: refArray(),
    rationale: string({ minLength: 70 })
  };
  const candidateReview = closedObject({
    candidateRef: string({ enum: candidateRefs }), candidateValid: boolean(),
    speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }),
    side: string({ enum: ["pro", "con"] }), proposition: string({ minLength: 30 }),
    attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 50 }),
    ...semantics
  });
  const missingMove = closedObject({
    missingRef: string({ enum: missingRefs }), startEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }), endEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
    speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }), side: string({ enum: ["pro", "con"] }),
    proposition: string({ minLength: 30 }), attributionConfidence: string({ enum: ["high", "medium", "low"] }), attributionBasis: string({ minLength: 50 }),
    ...semantics
  });
  const bridgeCoverage = closedObject({ bridgeId: string({ enum: packet.acceptedBridgeIds }), status: string({ enum: ["represented", "consequential-omission"] }), moveRefs: refArray(), omission: nullableOmission(packet), rationale: string({ minLength: 80 }) });
  const concessionAudit = closedObject({ side: string({ enum: ["pro", "con"] }), status: string({ enum: ["represented", "none-found"] }), moveRefs: refArray({ maxItems: 6 }), rationale: string({ minLength: 80 }) });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v388-independent-coverage-review-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: "3.8.8-independent-coverage-review-output" }),
      debateNumber: string({ const: packet.debateNumber }), debateId: string({ const: packet.debateId }), reviewerRole: string({ const: "coverage-reviewer" }),
      candidateReviews: array(candidateReview, { minItems: candidateRefs.length, maxItems: candidateRefs.length }),
      missingMoves: array(missingMove, { maxItems: 8 }),
      bridgeCoverage: array(bridgeCoverage, { minItems: packet.acceptedBridgeIds.length, maxItems: packet.acceptedBridgeIds.length }),
      materialConcessionAudit: array(concessionAudit, { minItems: 2, maxItems: 2 }),
      audit: closedObject({ fullTranscriptReviewed: boolean({ const: true }), candidateInventoryTreatedAsProvisional: boolean({ const: true }), hiddenProposalFieldsUnavailable: boolean({ const: true }), scoresAndAssessmentProseAbsent: boolean({ const: true }), coverageClaim: string({ const: "complete-independent-review-pending-disagreement-extraction" }) })
    })
  };
}

function validateSemantics(move, validRefs, ref, valid) {
  assert(new Set(move.respondsToRefs).size === move.respondsToRefs.length, `${ref}: duplicate response ref`);
  for (const target of move.respondsToRefs) assert(validRefs.has(target), `${ref}: response target is not selected: ${target}`);
  if (!valid) {
    assert(move.selectionRole === "contextual-only" && move.moveKind === "constructive" && move.respondsToRefs.length === 0, `${ref}: invalid candidate semantics invalid`);
    return;
  }
  assert(move.selectionRole !== "contextual-only", `${ref}: selected move cannot be contextual-only`);
  if (move.moveKind === "constructive") assert(move.respondsToRefs.length === 0, `${ref}: constructive move cannot have response targets`);
  else assert(move.respondsToRefs.length >= 1, `${ref}: reply or concession requires response target`);
  if (move.selectionRole === "load-bearing-constructive") assert(move.moveKind === "constructive", `${ref}: constructive role-kind mismatch`);
  if (move.selectionRole === "major-direct-reply") assert(move.moveKind === "reply", `${ref}: reply role-kind mismatch`);
  if (move.selectionRole === "material-concession") assert(move.moveKind === "concession", `${ref}: concession role-kind mismatch`);
  if (move.moveKind === "concession") assert(move.selectionRole === "material-concession", `${ref}: concession kind-role mismatch`);
  assert(!move.respondsToRefs.includes(ref), `${ref}: self-reference prohibited`);
}

export function validateReviewOutput(output, packet, schema, events) {
  validateSchemaValue(validateClosedSchema(schema), output, `coverageReview.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8.8-independent-coverage-review-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "coverage-reviewer", "review identity invalid");
  assert(!containsScoreField(output), "coverage review contains score field");
  assert(canonicalJson(output.candidateReviews.map((item) => item.candidateRef)) === canonicalJson(packet.candidates.map((item) => item.candidateRef)), "candidate review order invalid");
  assert(output.missingMoves.every((item, index) => item.missingRef === missingRef(index)), "missing moves must use sequential refs");
  assert(canonicalJson(output.bridgeCoverage.map((item) => item.bridgeId)) === canonicalJson(packet.acceptedBridgeIds), "bridge order invalid");
  assert(canonicalJson(output.materialConcessionAudit.map((item) => item.side)) === canonicalJson(["pro", "con"]), "concession audit order invalid");
  const selectedRefs = [...output.candidateReviews.filter((item) => item.candidateValid).map((item) => item.candidateRef), ...output.missingMoves.map((item) => item.missingRef)];
  const validRefs = new Set(selectedRefs);
  assert(validRefs.size === selectedRefs.length && selectedRefs.length <= 28, "selected review inventory count invalid");
  const sideForRef = new Map();
  for (const review of output.candidateReviews) {
    assert(packet.sides[review.side].speakers.includes(review.speaker), `${review.candidateRef}: speaker-side mismatch`);
    if (review.candidateValid) sideForRef.set(review.candidateRef, review.side);
  }
  let previousMissingStart = -1;
  for (const move of output.missingMoves) {
    assert(move.startEvent >= 0 && move.endEvent < events.length && move.startEvent <= move.endEvent, `${move.missingRef}: source range invalid`);
    assert(move.startEvent >= previousMissingStart, `${move.missingRef}: missing moves not chronological`);
    previousMissingStart = move.startEvent;
    const words = normalizeWords(eventExcerpt(events, move.startEvent, move.endEvent)).length;
    const duration = events[move.endEvent].startMs + events[move.endEvent].durationMs - events[move.startEvent].startMs;
    assert(words >= 20 && words <= 220 && duration > 0 && duration <= 150000, `${move.missingRef}: source span bounds invalid`);
    assert(packet.sides[move.side].speakers.includes(move.speaker), `${move.missingRef}: speaker-side mismatch`);
    sideForRef.set(move.missingRef, move.side);
  }
  for (const review of output.candidateReviews) validateSemantics(review, validRefs, review.candidateRef, review.candidateValid);
  for (const move of output.missingMoves) validateSemantics(move, validRefs, move.missingRef, true);
  for (const side of ["pro", "con"]) {
    const moves = [...output.candidateReviews.filter((item) => item.candidateValid && item.side === side), ...output.missingMoves.filter((item) => item.side === side)];
    assert(moves.length >= 4, `${side}: fewer than four selected review moves`);
    assert(moves.some((item) => item.selectionRole === "load-bearing-constructive") && moves.some((item) => item.selectionRole === "major-direct-reply"), `${side}: required role coverage missing`);
  }
  for (const coverage of output.bridgeCoverage) {
    const routeSide = packet.routes.find((route) => route.bridges.some((bridge) => bridge.bridgeId === coverage.bridgeId)).side;
    assert(new Set(coverage.moveRefs).size === coverage.moveRefs.length, `${coverage.bridgeId}: duplicate move refs`);
    for (const ref of coverage.moveRefs) assert(validRefs.has(ref), `${coverage.bridgeId}: nonselected move ref`);
    if (coverage.status === "represented") assert(coverage.moveRefs.length >= 1 && coverage.omission === null && coverage.moveRefs.some((ref) => sideForRef.get(ref) === routeSide), `${coverage.bridgeId}: represented bridge invalid`);
    else assert(coverage.moveRefs.length === 0 && coverage.omission !== null && coverage.omission.side === routeSide && packet.sides[routeSide].speakers.includes(coverage.omission.speaker) && coverage.omission.opportunityStartEvent <= coverage.omission.opportunityEndEvent, `${coverage.bridgeId}: omission invalid`);
  }
  const roleForRef = new Map([...output.candidateReviews.filter((item) => item.candidateValid).map((item) => [item.candidateRef, item.selectionRole]), ...output.missingMoves.map((item) => [item.missingRef, item.selectionRole])]);
  for (const audit of output.materialConcessionAudit) {
    assert(new Set(audit.moveRefs).size === audit.moveRefs.length, `${audit.side}: duplicate concession refs`);
    for (const ref of audit.moveRefs) assert(validRefs.has(ref) && sideForRef.get(ref) === audit.side, `${audit.side}: invalid concession ref`);
    if (audit.status === "none-found") assert(audit.moveRefs.length === 0, `${audit.side}: none-found must have no refs`);
    else assert(audit.moveRefs.length >= 1 && audit.moveRefs.every((ref) => roleForRef.get(ref) === "material-concession"), `${audit.side}: represented concession invalid`);
  }
  assert(output.audit.fullTranscriptReviewed && output.audit.candidateInventoryTreatedAsProvisional && output.audit.hiddenProposalFieldsUnavailable && output.audit.scoresAndAssessmentProseAbsent && output.audit.coverageClaim === "complete-independent-review-pending-disagreement-extraction", "review audit invalid");
  return {
    selectedMoveCount: selectedRefs.length,
    validCandidateCount: output.candidateReviews.filter((item) => item.candidateValid).length,
    missingMoveCount: output.missingMoves.length,
    mediumOrLowCount: [...output.candidateReviews.filter((item) => item.candidateValid), ...output.missingMoves].filter((item) => item.attributionConfidence !== "high").length,
    representedBridgeCount: output.bridgeCoverage.filter((item) => item.status === "represented").length,
    consequentialOmissionCount: output.bridgeCoverage.filter((item) => item.status === "consequential-omission").length
  };
}

export function makeProposalEquivalentFixture(packet, mapping) {
  return {
    schemaVersion: "3.8.8-independent-coverage-review-output",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "coverage-reviewer",
    candidateReviews: mapping.mappingEntries.map((entry) => ({ candidateRef: entry.candidateRef, ...structuredClone(entry.proposalSnapshot) })),
    missingMoves: [],
    bridgeCoverage: structuredClone(mapping.proposalBridgeCoverage),
    materialConcessionAudit: structuredClone(mapping.proposalConcessionAudit),
    audit: { fullTranscriptReviewed: true, candidateInventoryTreatedAsProvisional: true, hiddenProposalFieldsUnavailable: true, scoresAndAssessmentProseAbsent: true, coverageClaim: "complete-independent-review-pending-disagreement-extraction" }
  };
}
