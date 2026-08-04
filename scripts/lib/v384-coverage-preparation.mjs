import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import {
  contextExcerpt,
  eventExcerpt,
  normalizeWords
} from "./v381-source-preparation.mjs";
import {
  assert,
  canonicalJson,
  validateClosedSchema,
  validateSchemaValue
} from "./v36-decision-cards.mjs";

export const V384_GATE_ROOT = "docs/calibration/v3.8.4/held-out-score-reconstruction-gate";
export const V384_GATE_MANIFEST = `${V384_GATE_ROOT}/gate-manifest.json`;
export const V384_COVERAGE_ROOT = `${V384_GATE_ROOT}/coverage`;
export const V384_COVERAGE_MANUAL = `${V384_GATE_ROOT}/coverage-manual.md`;
export const V384_COVERAGE_EXECUTION_MANIFEST = `${V384_COVERAGE_ROOT}/proposal-execution-manifest.json`;
export const V384_DEBATE_NUMBERS = ["103", "55", "161"];
export const SELECTION_ROLES = ["load-bearing-constructive", "major-direct-reply", "material-concession", "contextual-only"];
export const MOVE_KINDS = ["constructive", "reply", "concession"];

export const readJson = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));

const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const boolean = (extra = {}) => ({ type: "boolean", ...extra });
const array = (items, extra = {}) => ({ type: "array", items, ...extra });
const closedObject = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});
const nullableOmission = (packet) => ({
  anyOf: [
    { type: "null" },
    closedObject({
      side: string({ enum: ["pro", "con"] }),
      speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }),
      opportunityStartEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
      opportunityEndEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
      omittedResponse: string({ minLength: 60 }),
      assessmentConsequence: string({ minLength: 60 })
    })
  ]
});

export function additionRef(index) {
  return `addition-${String(index + 1).padStart(2, "0")}`;
}

export function additionMoveId(debateId, index) {
  return `${debateId}-coverage-${String(index + 1).padStart(2, "0")}-v384`;
}

function stripSeed(move) {
  return {
    moveId: move.moveId,
    sourceSpan: move.sourceSpan,
    atomicExcerpt: move.atomicExcerpt,
    contextWindow: move.contextWindow,
    proposition: move.proposition,
    speaker: move.speaker,
    side: move.side,
    attributionConfidence: move.attributionConfidence,
    audioVerificationRequired: move.audioVerificationRequired
  };
}

function stripRoutes(routes) {
  return routes.map((route) => ({
    routeId: route.routeId,
    side: route.side,
    description: route.description,
    successCriteria: route.successCriteria,
    bridges: route.bridges.map((bridge) => ({
      bridgeId: bridge.bridgeId,
      tier: bridge.tier,
      description: bridge.description
    }))
  }));
}

export function makeCoverageProposalPacket(debate, resolved, events) {
  assert(resolved.debateNumber === debate.debateNumber && resolved.debateId === debate.debateId, `${debate.debateNumber}: resolved seed identity mismatch`);
  assert(resolved.moves.length === 8 && resolved.moves.every((move) => move.accepted === true), `${debate.debateNumber}: expected eight accepted seeds`);
  assert(resolved.moves.every((move) => move.attributionConfidence === "high" && move.audioVerificationRequired === false), `${debate.debateNumber}: seed source chain is not fully resolved`);
  const routes = stripRoutes(resolved.routes.filter((route) => route.accepted));
  const bridgeIds = routes.flatMap((route) => route.bridges.map((bridge) => bridge.bridgeId));
  assert(routes.length === 2 && bridgeIds.length === 10, `${debate.debateNumber}: expected two routes and ten accepted bridges`);
  return {
    schemaVersion: "3.8.4-full-coverage-proposal-packet",
    protocolId: "v3.8.4-heldout-score-reconstruction-gate",
    stage: "full-coverage-proposal",
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    videoId: debate.videoId,
    motion: debate.motion,
    sides: debate.sides,
    eventCount: events.length,
    transcript: debate.transcript,
    events: debate.events,
    routes,
    acceptedBridgeIds: bridgeIds,
    seedMoves: resolved.moves.map(stripSeed),
    sourceFilesInContext: {
      fullTranscript: "transcript.txt",
      timestampedEvents: "events.json"
    },
    coverageRules: {
      seedInventoryKnownIncomplete: true,
      fullTranscriptReviewRequired: true,
      seedDecisionRequiredForEverySeed: true,
      atLeastOneAdditionRequired: true,
      additionsMaximum: 24,
      finalSelectedMovesMaximum: 28,
      finalSelectedMovesMinimumPerSide: 4,
      everyAcceptedBridgeMustBeRepresentedOrOmissionRecorded: true,
      loadBearingConstructiveMinimumPerSide: 1,
      majorDirectReplyMinimumPerSide: 1,
      materialConcessionMustBeRepresentedOrNoneFound: true,
      additionsOrderedByStartEvent: true,
      additionIdsArePacketLocalOnly: true,
      stableAdditionMoveIdsAreDerivedAfterValidation: true,
      mediumOrLowAttributionRequiresLaterAudioVerification: true
    },
    hiddenSeedFields: [
      "provisionalBurdenContact",
      "provisionalLabelWarning",
      "attributionBasis.proposal",
      "attributionBasis.review"
    ],
    prohibitedOutputs: [
      "burden-contact labels",
      "section assignments",
      "section weights",
      "move importance",
      "raw scoring judgments",
      "calculated scores",
      "participant assessments",
      "Overall Commentary",
      "AI Extension",
      "legacy assessment reconstruction"
    ],
    outputPolicy: "Return one schema-conforming JSON object. Cite source only with event coordinates and packet-local move references; exact excerpts and stable IDs are derived deterministically."
  };
}

export function makeCoverageProposalSchema(packet) {
  const seedIds = packet.seedMoves.map((move) => move.moveId);
  const allRefs = [...seedIds, ...Array.from({ length: 24 }, (_value, index) => additionRef(index))];
  const refArray = (extra = {}) => array(string({ enum: allRefs }), extra);
  const moveSemantics = {
    selectionRole: string({ enum: SELECTION_ROLES }),
    moveKind: string({ enum: MOVE_KINDS }),
    respondsToRefs: refArray({ maxItems: 6 }),
    rationale: string({ minLength: 70 })
  };
  const seedDecision = closedObject({
    seedMoveId: string({ enum: seedIds }),
    decision: string({ enum: ["retain", "exclude"] }),
    ...moveSemantics
  });
  const addition = closedObject({
    localRef: string({ enum: allRefs.filter((ref) => ref.startsWith("addition-")) }),
    startEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
    endEvent: integer({ minimum: 0, maximum: packet.eventCount - 1 }),
    speaker: string({ enum: [...packet.sides.pro.speakers, ...packet.sides.con.speakers] }),
    side: string({ enum: ["pro", "con"] }),
    proposition: string({ minLength: 30 }),
    attributionConfidence: string({ enum: ["high", "medium", "low"] }),
    attributionBasis: string({ minLength: 50 }),
    ...moveSemantics
  });
  const bridgeCoverage = closedObject({
    bridgeId: string({ enum: packet.acceptedBridgeIds }),
    status: string({ enum: ["represented", "consequential-omission"] }),
    moveRefs: refArray({ maxItems: 8 }),
    omission: nullableOmission(packet),
    rationale: string({ minLength: 80 })
  });
  const concessionAudit = closedObject({
    side: string({ enum: ["pro", "con"] }),
    status: string({ enum: ["represented", "none-found"] }),
    moveRefs: refArray({ maxItems: 6 }),
    rationale: string({ minLength: 80 })
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v384-full-coverage-proposal-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: "3.8.4-full-coverage-proposal-output" }),
      debateNumber: string({ const: packet.debateNumber }),
      debateId: string({ const: packet.debateId }),
      reviewerRole: string({ const: "coverage-proposer" }),
      seedDecisions: array(seedDecision, { minItems: seedIds.length, maxItems: seedIds.length }),
      additions: array(addition, { minItems: 1, maxItems: 24 }),
      bridgeCoverage: array(bridgeCoverage, { minItems: packet.acceptedBridgeIds.length, maxItems: packet.acceptedBridgeIds.length }),
      materialConcessionAudit: array(concessionAudit, { minItems: 2, maxItems: 2 }),
      audit: closedObject({
        fullTranscriptReviewed: boolean({ const: true }),
        seedInventoryTreatedAsIncomplete: boolean({ const: true }),
        legacyAssessmentUnavailable: boolean({ const: true }),
        scoresAndAssessmentProseAbsent: boolean({ const: true }),
        coverageClaim: string({ const: "complete-proposal-pending-independent-review" })
      })
    })
  };
}

function assertText(value, minimum, label) {
  assert(typeof value === "string" && value.trim().length >= minimum, `${label}: must contain at least ${minimum} characters`);
}

function validateMoveSemantics(move, validRefs, label) {
  assert(SELECTION_ROLES.includes(move.selectionRole) && MOVE_KINDS.includes(move.moveKind), `${label}: move semantics invalid`);
  assertText(move.rationale, 70, `${label}.rationale`);
  assert(Array.isArray(move.respondsToRefs) && move.respondsToRefs.length <= 6, `${label}: response references invalid`);
  assert(new Set(move.respondsToRefs).size === move.respondsToRefs.length, `${label}: duplicate response reference`);
  for (const ref of move.respondsToRefs) assert(validRefs.has(ref), `${label}: response reference is not a selected move: ${ref}`);
  if (move.moveKind === "constructive") assert(move.respondsToRefs.length === 0, `${label}: constructive move cannot have response targets`);
  else assert(move.respondsToRefs.length >= 1, `${label}: reply or concession requires a selected response target`);
  if (move.selectionRole === "load-bearing-constructive") assert(move.moveKind === "constructive", `${label}: load-bearing role requires constructive kind`);
  if (move.selectionRole === "major-direct-reply") assert(move.moveKind === "reply", `${label}: major reply role requires reply kind`);
  if (move.selectionRole === "material-concession") assert(move.moveKind === "concession", `${label}: concession role requires concession kind`);
  if (move.moveKind === "concession") assert(move.selectionRole === "material-concession", `${label}: concession kind requires material-concession role`);
}

function selectedOutputRefs(output) {
  return [
    ...output.seedDecisions.filter((item) => item.decision === "retain").map((item) => item.seedMoveId),
    ...output.additions.map((item) => item.localRef)
  ];
}

export function validateCoverageProposalRaw(output, packet, schema, events) {
  validateSchemaValue(validateClosedSchema(schema), output, `coverageProposal.${packet.debateNumber}`);
  assert(output.schemaVersion === "3.8.4-full-coverage-proposal-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "coverage-proposer", "coverage proposal identity invalid");
  assert(!containsScoreField(output), "coverage proposal contains a score field");
  assert(output.seedDecisions.length === packet.seedMoves.length && output.additions.length >= 1 && output.additions.length <= 24, "coverage proposal count invalid");
  assert(canonicalJson(output.seedDecisions.map((item) => item.seedMoveId)) === canonicalJson(packet.seedMoves.map((item) => item.moveId)), "seed decisions must preserve packet order and identity");
  assert(canonicalJson(output.bridgeCoverage.map((item) => item.bridgeId)) === canonicalJson(packet.acceptedBridgeIds), "bridge coverage must preserve packet route order and identity");
  assert(canonicalJson(output.materialConcessionAudit.map((item) => item.side)) === canonicalJson(["pro", "con"]), "concession audit must contain pro then con");

  const selectedRefs = selectedOutputRefs(output);
  const validRefs = new Set(selectedRefs);
  assert(validRefs.size === selectedRefs.length, "selected move references must be unique");
  assert(selectedRefs.length <= 28, "final selected move count exceeds 28");

  for (let index = 0; index < output.seedDecisions.length; index += 1) {
    const decision = output.seedDecisions[index];
    if (decision.decision === "exclude") {
      assert(decision.selectionRole === "contextual-only" && decision.moveKind === "constructive" && decision.respondsToRefs.length === 0, `${decision.seedMoveId}: excluded seed must be contextual-only constructive with no response reference`);
      assertText(decision.rationale, 70, `${decision.seedMoveId}.rationale`);
    } else {
      validateMoveSemantics(decision, validRefs, decision.seedMoveId);
      assert(!decision.respondsToRefs.includes(decision.seedMoveId), `${decision.seedMoveId}: self-reference prohibited`);
    }
  }

  const sourceSpans = new Set(packet.seedMoves.map((move) => `${move.sourceSpan.startEvent}:${move.sourceSpan.endEvent}`));
  let previousStart = -1;
  for (let index = 0; index < output.additions.length; index += 1) {
    const move = output.additions[index];
    assert(move.localRef === additionRef(index), `${move.localRef}: additions must use sequential packet-local refs`);
    assert(move.selectionRole !== "contextual-only", `${move.localRef}: contextual-only additions are prohibited`);
    assert(move.startEvent >= 0 && move.endEvent < events.length && move.startEvent <= move.endEvent, `${move.localRef}: event range invalid`);
    assert(move.startEvent >= previousStart, `${move.localRef}: additions must be ordered by startEvent`);
    previousStart = move.startEvent;
    const spanKey = `${move.startEvent}:${move.endEvent}`;
    assert(!sourceSpans.has(spanKey), `${move.localRef}: exact source span duplicates a seed or earlier addition`);
    sourceSpans.add(spanKey);
    const words = normalizeWords(eventExcerpt(events, move.startEvent, move.endEvent)).length;
    assert(words >= 20 && words <= 220, `${move.localRef}: atomic source span must contain 20-220 normalized words; found ${words}`);
    const startMs = events[move.startEvent].startMs;
    const endMs = events[move.endEvent].startMs + events[move.endEvent].durationMs;
    assert(endMs > startMs && endMs - startMs <= 150000, `${move.localRef}: source span duration must be 150 seconds or less`);
    assert(packet.sides[move.side].speakers.includes(move.speaker), `${move.localRef}: speaker-side mismatch`);
    assertText(move.proposition, 30, `${move.localRef}.proposition`);
    assertText(move.attributionBasis, 50, `${move.localRef}.attributionBasis`);
    validateMoveSemantics(move, validRefs, move.localRef);
    assert(!move.respondsToRefs.includes(move.localRef), `${move.localRef}: self-reference prohibited`);
  }

  const sideForRef = new Map(packet.seedMoves.map((move) => [move.moveId, move.side]));
  for (const move of output.additions) sideForRef.set(move.localRef, move.side);
  for (const side of ["pro", "con"]) {
    const sideRefs = selectedRefs.filter((ref) => sideForRef.get(ref) === side);
    assert(sideRefs.length >= 4, `${side}: at least four selected moves required`);
    const selectedMoves = [
      ...output.seedDecisions.filter((item) => item.decision === "retain" && sideForRef.get(item.seedMoveId) === side),
      ...output.additions.filter((item) => item.side === side)
    ];
    assert(selectedMoves.some((move) => move.selectionRole === "load-bearing-constructive"), `${side}: load-bearing constructive move missing`);
    assert(selectedMoves.some((move) => move.selectionRole === "major-direct-reply"), `${side}: major direct reply missing`);
  }

  for (const coverage of output.bridgeCoverage) {
    assertText(coverage.rationale, 80, `${coverage.bridgeId}.rationale`);
    assert(new Set(coverage.moveRefs).size === coverage.moveRefs.length, `${coverage.bridgeId}: duplicate move reference`);
    for (const ref of coverage.moveRefs) assert(validRefs.has(ref), `${coverage.bridgeId}: bridge references a nonselected move`);
    const bridgeSide = packet.routes.find((route) => route.bridges.some((bridge) => bridge.bridgeId === coverage.bridgeId)).side;
    if (coverage.status === "represented") {
      assert(coverage.moveRefs.length >= 1 && coverage.omission === null, `${coverage.bridgeId}: represented bridge requires move refs and no omission`);
      assert(coverage.moveRefs.some((ref) => sideForRef.get(ref) === bridgeSide), `${coverage.bridgeId}: represented bridge lacks a move from its route side`);
    } else {
      assert(coverage.moveRefs.length === 0 && coverage.omission !== null, `${coverage.bridgeId}: omission requires no move refs and a record`);
      assert(coverage.omission.side === bridgeSide && packet.sides[bridgeSide].speakers.includes(coverage.omission.speaker), `${coverage.bridgeId}: omission speaker-side mismatch`);
      assert(coverage.omission.opportunityStartEvent >= 0 && coverage.omission.opportunityEndEvent < events.length && coverage.omission.opportunityStartEvent <= coverage.omission.opportunityEndEvent, `${coverage.bridgeId}: omission opportunity span invalid`);
      assertText(coverage.omission.omittedResponse, 60, `${coverage.bridgeId}.omittedResponse`);
      assertText(coverage.omission.assessmentConsequence, 60, `${coverage.bridgeId}.assessmentConsequence`);
    }
  }

  for (const audit of output.materialConcessionAudit) {
    assertText(audit.rationale, 80, `${audit.side}.concessionAudit.rationale`);
    assert(new Set(audit.moveRefs).size === audit.moveRefs.length, `${audit.side}: duplicate concession refs`);
    for (const ref of audit.moveRefs) assert(validRefs.has(ref) && sideForRef.get(ref) === audit.side, `${audit.side}: concession audit ref invalid`);
    if (audit.status === "none-found") assert(audit.moveRefs.length === 0, `${audit.side}: none-found concession audit must have no refs`);
    else {
      assert(audit.moveRefs.length >= 1, `${audit.side}: represented concession requires refs`);
      const roleByRef = new Map([
        ...output.seedDecisions.filter((item) => item.decision === "retain").map((item) => [item.seedMoveId, item.selectionRole]),
        ...output.additions.map((item) => [item.localRef, item.selectionRole])
      ]);
      assert(audit.moveRefs.every((ref) => roleByRef.get(ref) === "material-concession"), `${audit.side}: concession refs must have material-concession role`);
    }
  }

  assert(output.audit.fullTranscriptReviewed && output.audit.seedInventoryTreatedAsIncomplete && output.audit.legacyAssessmentUnavailable && output.audit.scoresAndAssessmentProseAbsent, "coverage audit affirmations invalid");
  assert(output.audit.coverageClaim === "complete-proposal-pending-independent-review", "coverage audit claim invalid");
  return output;
}

export function enrichCoverageProposal(raw, packet, events) {
  const seedById = new Map(packet.seedMoves.map((move) => [move.moveId, move]));
  const refMap = new Map([
    ...packet.seedMoves.map((move) => [move.moveId, move.moveId]),
    ...raw.additions.map((move, index) => [move.localRef, additionMoveId(packet.debateId, index)])
  ]);
  const normalizeRefs = (refs) => refs.map((ref) => {
    const normalized = refMap.get(ref);
    assert(normalized, `coverage reference cannot be normalized: ${ref}`);
    return normalized;
  });
  const seedDecisions = raw.seedDecisions.map((decision) => ({
    ...structuredClone(decision),
    respondsToRefs: normalizeRefs(decision.respondsToRefs),
    source: structuredClone(seedById.get(decision.seedMoveId))
  }));
  const additions = raw.additions.map((move, index) => ({
    moveId: additionMoveId(packet.debateId, index),
    ...structuredClone(move),
    respondsToRefs: normalizeRefs(move.respondsToRefs),
    sourceSpan: {
      startEvent: move.startEvent,
      endEvent: move.endEvent,
      startMs: events[move.startEvent].startMs,
      endMs: events[move.endEvent].startMs + events[move.endEvent].durationMs
    },
    atomicExcerpt: eventExcerpt(events, move.startEvent, move.endEvent),
    contextWindow: contextExcerpt(events, move.startEvent, move.endEvent)
  }));
  const selectedMoves = [
    ...seedDecisions.filter((decision) => decision.decision === "retain").map((decision) => ({
      moveId: decision.seedMoveId,
      sourceType: "inherited-seed",
      side: decision.source.side,
      speaker: decision.source.speaker,
      selectionRole: decision.selectionRole,
      moveKind: decision.moveKind,
      respondsToRefs: decision.respondsToRefs
    })),
    ...additions.map((move) => ({
      moveId: move.moveId,
      localRef: move.localRef,
      sourceType: "coverage-addition",
      side: move.side,
      speaker: move.speaker,
      selectionRole: move.selectionRole,
      moveKind: move.moveKind,
      respondsToRefs: move.respondsToRefs
    }))
  ];
  return {
    schemaVersion: "3.8.4-full-coverage-proposal-enriched",
    debateNumber: raw.debateNumber,
    debateId: raw.debateId,
    reviewerRole: raw.reviewerRole,
    enrichment: {
      deterministic: true,
      semanticFieldsChanged: false,
      exactSourceTextDerivedFromEvents: true,
      stableAdditionIdsModelAuthored: false,
      identifierReferencesNormalized: true
    },
    seedDecisions,
    additions,
    bridgeCoverage: raw.bridgeCoverage.map((coverage) => ({ ...structuredClone(coverage), moveRefs: normalizeRefs(coverage.moveRefs) })),
    materialConcessionAudit: raw.materialConcessionAudit.map((audit) => ({ ...structuredClone(audit), moveRefs: normalizeRefs(audit.moveRefs) })),
    audit: structuredClone(raw.audit),
    inventorySummary: {
      retainedSeedCount: seedDecisions.filter((item) => item.decision === "retain").length,
      excludedSeedCount: seedDecisions.filter((item) => item.decision === "exclude").length,
      additionCount: additions.length,
      selectedMoveCount: selectedMoves.length,
      selectedMovesPerSide: Object.fromEntries(["pro", "con"].map((side) => [side, selectedMoves.filter((item) => item.side === side).length])),
      mediumOrLowAdditionCount: additions.filter((item) => item.attributionConfidence !== "high").length,
      representedBridgeCount: raw.bridgeCoverage.filter((item) => item.status === "represented").length,
      consequentialOmissionCount: raw.bridgeCoverage.filter((item) => item.status === "consequential-omission").length
    },
    selectedMoves
  };
}

export function validateEnrichedCoverageProposal(enriched, packet, events) {
  assert(enriched.schemaVersion === "3.8.4-full-coverage-proposal-enriched" && enriched.debateNumber === packet.debateNumber && enriched.debateId === packet.debateId, "enriched coverage identity invalid");
  assert(enriched.enrichment.deterministic && !enriched.enrichment.semanticFieldsChanged && enriched.enrichment.exactSourceTextDerivedFromEvents && !enriched.enrichment.stableAdditionIdsModelAuthored && enriched.enrichment.identifierReferencesNormalized, "enrichment contract invalid");
  for (let index = 0; index < enriched.additions.length; index += 1) {
    const move = enriched.additions[index];
    assert(move.moveId === additionMoveId(packet.debateId, index), `${move.localRef}: stable move ID invalid`);
    assert(move.atomicExcerpt === eventExcerpt(events, move.startEvent, move.endEvent), `${move.localRef}: exact excerpt mismatch`);
    assert(move.contextWindow === contextExcerpt(events, move.startEvent, move.endEvent), `${move.localRef}: context window mismatch`);
  }
  const normalizedRefArrays = [
    ...enriched.seedDecisions.map((item) => item.respondsToRefs),
    ...enriched.additions.map((item) => item.respondsToRefs),
    ...enriched.bridgeCoverage.map((item) => item.moveRefs),
    ...enriched.materialConcessionAudit.map((item) => item.moveRefs)
  ];
  assert(normalizedRefArrays.flat().every((ref) => !/^addition-\d+$/.test(ref)), "packet-local reference survived deterministic enrichment");
  assert(enriched.inventorySummary.selectedMoveCount === enriched.selectedMoves.length, "selected move summary mismatch");
  return enriched;
}

export function coveragePhaseLockPaths(contexts, completedUpstream = []) {
  return [...new Set([
    ...contexts.flatMap((item) => [item.packet, item.schema, item.transcript, item.events]),
    ...completedUpstream
  ].filter(Boolean))];
}

export { assert, canonicalJson, eventExcerpt, contextExcerpt };
