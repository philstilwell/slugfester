import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { scoreDimensions } from "./reassessment-scoring.mjs";

export const MULTI_SPEAKER_PROTOCOL_ID =
  "assessment-production-multi-speaker-approximation-v1";
export const MULTI_SPEAKER_RUBRIC =
  "Slugfester Reassessment Rubric v2 — Multi-Speaker Approximation";
export const MULTI_SPEAKER_MODEL = "5.6 Sol";
export const MULTI_SPEAKER_REASONING = "low";
export const DIMENSION_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "calibrationCharity"
]);

const SIDES = Object.freeze(["pro", "con"]);
const clone = (value) => structuredClone(value);

export function assertMultiSpeaker(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function fileRecord(filePath) {
  const bytes = readFileSync(filePath);
  return { path: filePath, bytes: bytes.length, sha256: sha256(bytes) };
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertString(value, label, minimum = 1) {
  assertMultiSpeaker(
    typeof value === "string" && value.trim().length >= minimum,
    `${label}: expected a string of at least ${minimum} characters`
  );
}

function exactKeys(value, keys, label) {
  assertMultiSpeaker(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected an object`
  );
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertMultiSpeaker(
    actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]),
    `${label}: keys must be ${expected.join(", ")}`
  );
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeEvents(eventsDocument) {
  assertMultiSpeaker(Array.isArray(eventsDocument), "events: expected an array");
  return eventsDocument.map((event, index) => {
    assertMultiSpeaker(
      Number.isInteger(event.startMs) &&
        Number.isInteger(event.durationMs) &&
        typeof event.text === "string" &&
        event.text.trim(),
      `events[${index}]: invalid event`
    );
    return {
      startMs: event.startMs,
      durationMs: event.durationMs,
      text: event.text.replace(/\s+/g, " ").trim()
    };
  });
}

function spanText(events, startEvent, endEvent) {
  return events
    .slice(startEvent, endEvent + 1)
    .map((event) => event.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function allMoveIds(inventory) {
  return new Set(inventory.moves.map((move) => move.moveId));
}

function speakersBySide(inventory) {
  return new Map(
    SIDES.flatMap((side) =>
      inventory.sides[side].speakers.map((speaker) => [speaker, side])
    )
  );
}

export function validateMultiSpeakerInventory(inventory, eventsDocument) {
  const events = normalizeEvents(eventsDocument);
  assertMultiSpeaker(
    inventory?.schemaVersion === "1.0-multi-speaker-score-blind-inventory" &&
      inventory.protocolId === MULTI_SPEAKER_PROTOCOL_ID &&
      inventory.status === "complete-and-frozen" &&
      inventory.assessmentModel === MULTI_SPEAKER_MODEL &&
      inventory.reasoningEffort === MULTI_SPEAKER_REASONING,
    "inventory: identity, model, or status mismatch"
  );
  assertString(inventory.debateNumber, "inventory.debateNumber");
  assertString(inventory.debateId, "inventory.debateId");

  exactKeys(inventory.sides, SIDES, "inventory.sides");
  const speakerSide = speakersBySide(inventory);
  const speakerCount = SIDES.reduce((total, side) => {
    const item = inventory.sides[side];
    exactKeys(item, ["label", "speakers"], `inventory.sides.${side}`);
    assertString(item.label, `inventory.sides.${side}.label`);
    assertMultiSpeaker(
      Array.isArray(item.speakers) && item.speakers.length >= 1,
      `inventory.sides.${side}.speakers: at least one speaker required`
    );
    item.speakers.forEach((speaker, index) =>
      assertString(speaker, `inventory.sides.${side}.speakers[${index}]`)
    );
    return total + item.speakers.length;
  }, 0);
  assertMultiSpeaker(
    speakerSide.size === speakerCount,
    "inventory: a speaker cannot belong to both sides or appear twice"
  );
  assertMultiSpeaker(
    speakerCount >= 3 && speakerCount <= 8,
    "inventory: expected 3–8 substantive interlocutors"
  );

  assertMultiSpeaker(
    Array.isArray(inventory.routes) && inventory.routes.length === 2,
    "inventory.routes: exactly one route per side required"
  );
  const routeBySide = new Map(inventory.routes.map((route) => [route.side, route]));
  assertMultiSpeaker(
    routeBySide.size === 2 && SIDES.every((side) => routeBySide.has(side)),
    "inventory.routes: pro and con routes required"
  );
  const bridgeById = new Map();
  for (const side of SIDES) {
    const route = routeBySide.get(side);
    assertString(route.routeId, `${side}.routeId`);
    assertString(route.description, `${side}.route.description`, 20);
    assertMultiSpeaker(
      Array.isArray(route.bridges) &&
        route.bridges.length >= 3 &&
        route.bridges.length <= 7,
      `${side}.route.bridges: expected 3–7 bridges`
    );
    const tiers = route.bridges.map((bridge) => bridge.tier);
    assertMultiSpeaker(
      tiers.filter((tier) => tier === "motion").length === 1 &&
        tiers.includes("central") &&
        tiers.includes("subsidiary"),
      `${side}.route.bridges: motion, central, and subsidiary tiers required`
    );
    for (const bridge of route.bridges) {
      assertString(bridge.bridgeId, `${side}.bridgeId`);
      assertString(bridge.description, `${side}.${bridge.bridgeId}.description`, 20);
      assertMultiSpeaker(
        ["motion", "central", "subsidiary"].includes(bridge.tier),
        `${side}.${bridge.bridgeId}: invalid tier`
      );
      assertMultiSpeaker(
        !bridgeById.has(bridge.bridgeId),
        `inventory: duplicate bridge ${bridge.bridgeId}`
      );
      bridgeById.set(bridge.bridgeId, { ...bridge, side });
    }
  }

  assertMultiSpeaker(
    Array.isArray(inventory.sections) &&
      inventory.sections.length >= 4 &&
      inventory.sections.length <= 7,
    "inventory.sections: expected 4–7 sections"
  );
  const sectionIds = new Set();
  let sectionWeightTotal = 0;
  for (const [index, section] of inventory.sections.entries()) {
    assertString(section.sectionId, `sections[${index}].sectionId`);
    assertString(section.title, `sections[${index}].title`);
    assertString(section.rationale, `sections[${index}].rationale`, 20);
    assertMultiSpeaker(
      !sectionIds.has(section.sectionId),
      `inventory: duplicate section ${section.sectionId}`
    );
    assertMultiSpeaker(
      Number.isInteger(section.weightPercent) && section.weightPercent > 0,
      `${section.sectionId}: positive integer weight required`
    );
    sectionIds.add(section.sectionId);
    sectionWeightTotal += section.weightPercent;
  }
  assertMultiSpeaker(
    sectionWeightTotal === 100,
    "inventory.sections: weights must total 100"
  );

  assertMultiSpeaker(
    Array.isArray(inventory.moves) &&
      inventory.moves.length >= 12 &&
      inventory.moves.length <= 40,
    "inventory.moves: expected 12–40 moves"
  );
  const moveIds = allMoveIds(inventory);
  assertMultiSpeaker(
    moveIds.size === inventory.moves.length,
    "inventory.moves: move IDs must be unique"
  );
  let previousStartEvent = -1;
  for (const [index, move] of inventory.moves.entries()) {
    const label = `moves[${index}]`;
    assertString(move.moveId, `${label}.moveId`);
    assertString(move.proposition, `${label}.proposition`, 20);
    assertMultiSpeaker(sectionIds.has(move.sectionId), `${label}: unknown section`);
    assertMultiSpeaker(
      speakerSide.get(move.speaker) === move.side,
      `${label}: speaker/side mismatch`
    );
    assertMultiSpeaker(
      ["constructive", "reply"].includes(move.moveKind),
      `${label}: invalid move kind`
    );
    assertMultiSpeaker(
      Number.isInteger(move.importance) && move.importance >= 1 && move.importance <= 3,
      `${label}: importance must be 1–3`
    );
    const bridge = bridgeById.get(move.burdenContact?.bridgeId);
    assertMultiSpeaker(
      bridge && bridge.side === move.side && bridge.tier === move.burdenContact.tier,
      `${label}: burden bridge must belong to the move's side and match its tier`
    );

    const { startEvent, endEvent, startMs, endMs, excerpt } = move.sourceSpan ?? {};
    assertMultiSpeaker(
      Number.isInteger(startEvent) &&
        Number.isInteger(endEvent) &&
        startEvent >= 0 &&
        startEvent <= endEvent &&
        endEvent < events.length,
      `${label}: invalid source span`
    );
    assertMultiSpeaker(
      startEvent >= previousStartEvent,
      `${label}: moves must be chronological`
    );
    previousStartEvent = startEvent;
    assertMultiSpeaker(
      startMs === events[startEvent].startMs &&
        endMs === events[endEvent].startMs + events[endEvent].durationMs,
      `${label}: source timestamps do not match events`
    );
    assertMultiSpeaker(
      excerpt === spanText(events, startEvent, endEvent),
      `${label}: excerpt is not source-exact`
    );
    assertMultiSpeaker(
      ["high", "medium", "low"].includes(move.attributionConfidence),
      `${label}: invalid attribution confidence`
    );
    assertString(move.attributionBasis, `${label}.attributionBasis`, 20);
    assertMultiSpeaker(
      Array.isArray(move.quoteEligibleExactSpans),
      `${label}: quoteEligibleExactSpans must be an array`
    );
    for (const quote of move.quoteEligibleExactSpans) {
      assertMultiSpeaker(
        wordCount(quote) >= 3 && wordCount(quote) <= 18 && excerpt.includes(quote),
        `${label}: quote must be an exact 3–18 word substring`
      );
    }

    assertMultiSpeaker(Array.isArray(move.respondsToIds), `${label}: respondsToIds missing`);
    assertMultiSpeaker(Array.isArray(move.adoptsMoveIds), `${label}: adoptsMoveIds missing`);
    for (const targetId of move.respondsToIds) {
      const targetIndex = inventory.moves.findIndex((candidate) => candidate.moveId === targetId);
      const target = inventory.moves[targetIndex];
      assertMultiSpeaker(
        targetIndex >= 0 && targetIndex < index && target.side !== move.side,
        `${label}: response targets must be earlier opposing moves`
      );
    }
    for (const adoptedId of move.adoptsMoveIds) {
      const adoptedIndex = inventory.moves.findIndex(
        (candidate) => candidate.moveId === adoptedId
      );
      const adopted = inventory.moves[adoptedIndex];
      assertMultiSpeaker(
        adoptedIndex >= 0 &&
          adoptedIndex < index &&
          adopted.side === move.side &&
          adopted.speaker !== move.speaker,
        `${label}: adopted moves must be earlier teammate moves`
      );
    }
    if (move.moveKind === "constructive") {
      assertMultiSpeaker(
        move.respondsToIds.length === 0,
        `${label}: constructive move cannot have opposing targets`
      );
    } else {
      assertMultiSpeaker(
        move.respondsToIds.length > 0,
        `${label}: reply requires an earlier opposing target`
      );
    }
  }

  for (const sectionId of sectionIds) {
    for (const side of SIDES) {
      assertMultiSpeaker(
        inventory.moves.some(
          (move) => move.sectionId === sectionId && move.side === side
        ),
        `${sectionId}: ${side} has no selected move`
      );
    }
  }

  assertMultiSpeaker(
    Array.isArray(inventory.speakerCoverage) &&
      inventory.speakerCoverage.length === speakerSide.size,
    "inventory.speakerCoverage: one record per speaker required"
  );
  const coverageSpeakers = new Set();
  for (const record of inventory.speakerCoverage) {
    assertMultiSpeaker(
      speakerSide.has(record.speaker) && !coverageSpeakers.has(record.speaker),
      "inventory.speakerCoverage: unknown or duplicate speaker"
    );
    coverageSpeakers.add(record.speaker);
    assertMultiSpeaker(
      Number.isInteger(record.substantiveOpportunityCount) &&
        record.substantiveOpportunityCount >= 0,
      `${record.speaker}: invalid opportunity count`
    );
    assertMultiSpeaker(
      Array.isArray(record.selectedMoveIds) &&
        record.selectedMoveIds.every(
          (moveId) =>
            moveIds.has(moveId) &&
            inventory.moves.find((move) => move.moveId === moveId)?.speaker ===
              record.speaker
        ),
      `${record.speaker}: selectedMoveIds do not match speaker ownership`
    );
    const actualIds = inventory.moves
      .filter((move) => move.speaker === record.speaker)
      .map((move) => move.moveId);
    assertMultiSpeaker(
      canonicalJson(record.selectedMoveIds) === canonicalJson(actualIds),
      `${record.speaker}: coverage record does not enumerate every selected move`
    );
    if (record.substantiveOpportunityCount > 0) {
      assertMultiSpeaker(
        record.selectedMoveIds.length > 0,
        `${record.speaker}: substantive speaker has no selected move`
      );
    }
    if (record.selectedMoveIds.length === 0) {
      assertString(record.omissionReason, `${record.speaker}.omissionReason`, 20);
    }
  }

  assertMultiSpeaker(
    inventory.audit?.completeTranscriptReviewed === true &&
      inventory.audit?.legacyAssessmentsUnavailable === true &&
      inventory.audit?.allSpansSourceExact === true &&
      inventory.audit?.speakerOwnershipExplicit === true &&
      inventory.audit?.calculatedTotalsAbsent === true,
    "inventory.audit: required claims missing"
  );

  return {
    status: "passed",
    debateNumber: inventory.debateNumber,
    speakers: speakerSide.size,
    sections: inventory.sections.length,
    moves: inventory.moves.length,
    belowHighAttributionMoveIds: inventory.moves
      .filter((move) => move.attributionConfidence !== "high")
      .map((move) => move.moveId)
  };
}

function validateAdjustment(adjustment, inventory, label) {
  exactKeys(
    adjustment,
    ["value", "rationale", "distinctUnscoredConsequence", "relatedMoveIds"],
    label
  );
  assertMultiSpeaker(
    Number.isInteger(adjustment.value) && adjustment.value >= -5 && adjustment.value <= 5,
    `${label}.value: expected -5..5`
  );
  assertString(adjustment.rationale, `${label}.rationale`, 40);
  assertMultiSpeaker(Array.isArray(adjustment.relatedMoveIds), `${label}.relatedMoveIds: array required`);
  const moveIds = allMoveIds(inventory);
  assertMultiSpeaker(
    adjustment.relatedMoveIds.every((moveId) => moveIds.has(moveId)),
    `${label}: unknown related move`
  );
  if (adjustment.value === 0) {
    assertMultiSpeaker(
      adjustment.distinctUnscoredConsequence === null ||
        (typeof adjustment.distinctUnscoredConsequence === "string" &&
          adjustment.distinctUnscoredConsequence.trim()),
      `${label}: zero adjustment consequence must be null or explanatory text`
    );
  } else {
    assertString(
      adjustment.distinctUnscoredConsequence,
      `${label}.distinctUnscoredConsequence`,
      30
    );
    assertMultiSpeaker(
      adjustment.relatedMoveIds.length > 0,
      `${label}: nonzero adjustment requires related moves`
    );
  }
}

export function validateMultiSpeakerPrimaryJudgment(
  judgment,
  inventory,
  { expectedPass, expectedInventorySha256 }
) {
  assertMultiSpeaker(
    judgment?.schemaVersion === "1.0-multi-speaker-primary-judgment" &&
      judgment.protocolId === MULTI_SPEAKER_PROTOCOL_ID &&
      judgment.status === "complete-and-schema-valid" &&
      judgment.pass === expectedPass &&
      judgment.debateNumber === inventory.debateNumber &&
      judgment.debateId === inventory.debateId &&
      judgment.reviewerRole === "isolated-score-blind-primary-judge" &&
      judgment.assessmentModel === MULTI_SPEAKER_MODEL &&
      judgment.reasoningEffort === MULTI_SPEAKER_REASONING &&
      judgment.inventorySha256 === expectedInventorySha256,
    `${expectedPass}: judgment identity mismatch`
  );
  assertMultiSpeaker(
    judgment.isolation?.legacyAssessmentsUnavailable === true &&
      judgment.isolation?.calculatedTotalsUnavailable === true &&
      judgment.isolation?.winnerLabelsUnavailable === true &&
      judgment.isolation?.otherJudgmentUnavailable === true &&
      judgment.isolation?.publicationProseUnavailable === true &&
      judgment.isolation?.otherDebatesUnavailable === true &&
      judgment.isolation?.contaminationDetected === false,
    `${expectedPass}: isolation boundary mismatch`
  );
  assertMultiSpeaker(
    Array.isArray(judgment.judgments) &&
      judgment.judgments.length === inventory.moves.length,
    `${expectedPass}: judgment population differs from inventory`
  );
  assertMultiSpeaker(
    canonicalJson(judgment.judgments.map((item) => item.moveId)) ===
      canonicalJson(inventory.moves.map((move) => move.moveId)),
    `${expectedPass}: judgment order differs from inventory`
  );
  for (const item of judgment.judgments) {
    assertMultiSpeaker(
      ["high", "medium", "low"].includes(item.assessmentConfidence),
      `${expectedPass}.${item.moveId}: invalid assessment confidence`
    );
    exactKeys(item.dimensions, DIMENSION_KEYS, `${expectedPass}.${item.moveId}.dimensions`);
    for (const dimension of DIMENSION_KEYS) {
      exactKeys(
        item.dimensions[dimension],
        ["value", "rationale"],
        `${expectedPass}.${item.moveId}.${dimension}`
      );
      assertMultiSpeaker(
        Number.isInteger(item.dimensions[dimension].value) &&
          item.dimensions[dimension].value >= 0 &&
          item.dimensions[dimension].value <= 100,
        `${expectedPass}.${item.moveId}.${dimension}: value outside 0..100`
      );
      assertString(
        item.dimensions[dimension].rationale,
        `${expectedPass}.${item.moveId}.${dimension}.rationale`,
        40
      );
    }
  }
  exactKeys(judgment.burdenCompletionAdjustment, SIDES, `${expectedPass}.burdenCompletionAdjustment`);
  for (const side of SIDES) {
    validateAdjustment(
      judgment.burdenCompletionAdjustment[side],
      inventory,
      `${expectedPass}.burdenCompletionAdjustment.${side}`
    );
  }
  assertMultiSpeaker(
    judgment.audit?.completeLockedInventoryReviewed === true &&
      judgment.audit?.allMovesJudgedOnce === true &&
      judgment.audit?.ratingsOnlyNoCalculatedScores === true &&
      judgment.audit?.scoreBlind === true &&
      judgment.audit?.speakerCreditNotTransferred === true,
    `${expectedPass}.audit: required claims missing`
  );
  return { status: "passed", pass: expectedPass, moves: judgment.judgments.length };
}

function judgmentMap(judgment) {
  return new Map(judgment.judgments.map((item) => [item.moveId, item]));
}

function dimensionValues(item) {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, item.dimensions[key].value])
  );
}

function passMoveScore(item) {
  return scoreDimensions(dimensionValues(item), item.moveId);
}

function adjustmentFingerprint(adjustment) {
  return canonicalJson({
    direction: Math.sign(adjustment.value),
    relatedMoveIds: [...adjustment.relatedMoveIds].sort(),
    hasDistinctConsequence: Boolean(adjustment.distinctUnscoredConsequence)
  });
}

export function extractMultiSpeakerDisagreements({ inventory, passA, passB }) {
  const a = judgmentMap(passA);
  const b = judgmentMap(passB);
  const disputes = [];
  for (const move of inventory.moves) {
    const left = a.get(move.moveId);
    const right = b.get(move.moveId);
    const moveScoreDelta = Math.abs(passMoveScore(left) - passMoveScore(right));
    for (const dimension of DIMENSION_KEYS) {
      const dimensionDelta = Math.abs(
        left.dimensions[dimension].value - right.dimensions[dimension].value
      );
      if (dimensionDelta > 8 || (moveScoreDelta > 4 && dimensionDelta > 0)) {
        disputes.push({
          disputeId: `${move.moveId}:${dimension}`,
          kind: "move-dimension",
          moveId: move.moveId,
          field: dimension,
          trigger: { dimensionDelta, moveScoreDelta },
          options: {
            "option-a": clone(left.dimensions[dimension]),
            "option-b": clone(right.dimensions[dimension])
          }
        });
      }
    }
    if (left.assessmentConfidence !== right.assessmentConfidence) {
      disputes.push({
        disputeId: `${move.moveId}:assessmentConfidence`,
        kind: "move-categorical",
        moveId: move.moveId,
        field: "assessmentConfidence",
        trigger: { categoricalDifference: true },
        options: {
          "option-a": left.assessmentConfidence,
          "option-b": right.assessmentConfidence
        }
      });
    }
  }
  for (const side of SIDES) {
    const left = passA.burdenCompletionAdjustment[side];
    const right = passB.burdenCompletionAdjustment[side];
    const valueDelta = Math.abs(left.value - right.value);
    const categoricalDifference =
      adjustmentFingerprint(left) !== adjustmentFingerprint(right);
    if (valueDelta > 2 || categoricalDifference) {
      disputes.push({
        disputeId: `burdenCompletionAdjustment:${side}`,
        kind: "burden-adjustment",
        side,
        field: "burdenCompletionAdjustment",
        trigger: { valueDelta, categoricalDifference },
        options: { "option-a": clone(left), "option-b": clone(right) }
      });
    }
  }
  return {
    schemaVersion: "1.0-multi-speaker-disagreement-extraction",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "complete-and-frozen",
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    deterministic: true,
    thresholds: {
      dimensionDeltaGreaterThan: 8,
      moveScoreDeltaGreaterThan: 4,
      burdenAdjustmentDeltaGreaterThan: 2
    },
    disputes,
    audit: {
      movesCompared: inventory.moves.length,
      disputesExtracted: disputes.length,
      passIdentitiesRemovedFromAdjudicationOptions: true,
      calculatedTotalsUnavailableToAdjudicator: true
    }
  };
}

export function validateMultiSpeakerAdjudication(adjudication, disagreements) {
  assertMultiSpeaker(
    adjudication?.schemaVersion === "1.0-multi-speaker-dispute-adjudication" &&
      adjudication.protocolId === MULTI_SPEAKER_PROTOCOL_ID &&
      adjudication.status === "complete-and-schema-valid" &&
      adjudication.debateNumber === disagreements.debateNumber &&
      adjudication.debateId === disagreements.debateId &&
      adjudication.reviewerRole === "isolated-dispute-only-adjudicator" &&
      adjudication.assessmentModel === MULTI_SPEAKER_MODEL &&
      adjudication.reasoningEffort === MULTI_SPEAKER_REASONING,
    "adjudication: identity mismatch"
  );
  assertMultiSpeaker(
    adjudication.isolation?.passIdentitiesUnavailable === true &&
      adjudication.isolation?.calculatedTotalsUnavailable === true &&
      adjudication.isolation?.winnerLabelsUnavailable === true &&
      adjudication.isolation?.publicationProseUnavailable === true &&
      adjudication.isolation?.otherDebatesUnavailable === true &&
      adjudication.isolation?.contaminationDetected === false,
    "adjudication: isolation boundary mismatch"
  );
  const expected = disagreements.disputes.map((dispute) => dispute.disputeId);
  const actual = (adjudication.resolutions ?? []).map(
    (resolution) => resolution.disputeId
  );
  assertMultiSpeaker(
    canonicalJson(actual) === canonicalJson(expected),
    "adjudication: resolution order or population differs from disputes"
  );
  for (const resolution of adjudication.resolutions) {
    assertMultiSpeaker(
      ["option-a", "option-b"].includes(resolution.selectedOption),
      `${resolution.disputeId}: must select an existing anonymous option`
    );
    assertString(resolution.rationale, `${resolution.disputeId}.rationale`, 40);
  }
  return { status: "passed", disputes: expected.length };
}

function resolutionMap(adjudication) {
  return new Map(
    adjudication.resolutions.map((resolution) => [resolution.disputeId, resolution])
  );
}

export function assembleMultiSpeakerFinalLedger({
  inventory,
  inventorySha256,
  passA,
  passASha256,
  passB,
  passBSha256,
  disagreements,
  disagreementsSha256,
  adjudication,
  adjudicationSha256,
  audio,
  audioSha256
}) {
  const requiredAudio = inventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId);
  assertMultiSpeaker(audio?.status === "complete", "audio: status must be complete");
  assertMultiSpeaker(
    canonicalJson(audio.verifiedMoveIds ?? []) === canonicalJson(requiredAudio),
    "audio: verified move population differs from required attribution checks"
  );
  const a = judgmentMap(passA);
  const b = judgmentMap(passB);
  const resolutions = resolutionMap(adjudication);
  const moves = inventory.moves.map((move) => {
    const left = a.get(move.moveId);
    const right = b.get(move.moveId);
    const finalDimensions = {};
    for (const dimension of DIMENSION_KEYS) {
      const resolution = resolutions.get(`${move.moveId}:${dimension}`);
      if (resolution) {
        const selected =
          resolution.selectedOption === "option-a"
            ? left.dimensions[dimension]
            : right.dimensions[dimension];
        finalDimensions[dimension] = {
          ...clone(selected),
          resolution: "adjudicated-existing-option",
          adjudicationRationale: resolution.rationale
        };
      } else {
        finalDimensions[dimension] = {
          value: Math.round(
            (left.dimensions[dimension].value + right.dimensions[dimension].value) / 2
          ),
          rationale:
            "Rounded mean of the two isolated judgments; no adjudication threshold was triggered.",
          resolution: "rounded-mean"
        };
      }
    }
    const confidenceResolution = resolutions.get(
      `${move.moveId}:assessmentConfidence`
    );
    assertMultiSpeaker(
      confidenceResolution ||
        left.assessmentConfidence === right.assessmentConfidence,
      `${move.moveId}: unresolved assessment-confidence disagreement`
    );
    const assessmentConfidence = confidenceResolution
      ? confidenceResolution.selectedOption === "option-a"
        ? left.assessmentConfidence
        : right.assessmentConfidence
      : left.assessmentConfidence;
    return {
      ...clone(move),
      judgments: { passA: clone(left), passB: clone(right) },
      finalDimensions,
      assessmentConfidence
    };
  });
  const burdenCompletionAdjustment = Object.fromEntries(
    SIDES.map((side) => {
      const left = passA.burdenCompletionAdjustment[side];
      const right = passB.burdenCompletionAdjustment[side];
      const resolution = resolutions.get(`burdenCompletionAdjustment:${side}`);
      if (resolution) {
        const selected = resolution.selectedOption === "option-a" ? left : right;
        return [
          side,
          {
            ...clone(selected),
            resolution: "adjudicated-existing-option",
            adjudicationRationale: resolution.rationale
          }
        ];
      }
      assertMultiSpeaker(
        adjustmentFingerprint(left) === adjustmentFingerprint(right),
        `${side}: unresolved burden-adjustment category disagreement`
      );
      return [
        side,
        {
          value: Math.round((left.value + right.value) / 2),
          rationale:
            "Rounded mean of the two isolated judgments; no adjudication threshold was triggered.",
          distinctUnscoredConsequence:
            left.distinctUnscoredConsequence ?? right.distinctUnscoredConsequence,
          relatedMoveIds: [...left.relatedMoveIds],
          resolution: "rounded-mean"
        }
      ];
    })
  );
  return {
    schemaVersion: "1.0-multi-speaker-resolved-final-ledger",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "fully-resolved-and-frozen-before-scoring",
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    model: MULTI_SPEAKER_MODEL,
    rubric: MULTI_SPEAKER_RUBRIC,
    evidenceLocks: {
      inventory: { sha256: inventorySha256 },
      passA: { sha256: passASha256 },
      passB: { sha256: passBSha256 },
      disagreements: { sha256: disagreementsSha256 },
      adjudication: { sha256: adjudicationSha256 },
      audio: { sha256: audioSha256 }
    },
    sides: clone(inventory.sides),
    routes: clone(inventory.routes),
    sections: clone(inventory.sections),
    speakerCoverage: clone(inventory.speakerCoverage),
    moves,
    burdenCompletionAdjustment,
    audit: {
      inventoryStructureUnchanged: true,
      speakerOwnershipUnchanged: true,
      disputesResolved: disagreements.disputes.length,
      unresolvedDisputes: 0,
      requiredAudioChecksComplete: true,
      calculatedTotalsAbsent: true,
      readyForSingleScorePass: true
    }
  };
}

function scoreFromDimensions(dimensions) {
  return scoreDimensions(
    Object.fromEntries(
      DIMENSION_KEYS.map((dimension) => [dimension, dimensions[dimension].value])
    )
  );
}

function scoreLedger(inventory, dimensionsForMove, adjustmentForSide) {
  const sections = inventory.sections.map((section) => {
    const sides = Object.fromEntries(
      SIDES.map((side) => {
        const moves = inventory.moves
          .filter(
            (move) => move.sectionId === section.sectionId && move.side === side
          )
          .map((move) => ({
            moveId: move.moveId,
            speaker: move.speaker,
            importance: move.importance,
            dimensions: dimensionsForMove(move.moveId),
            score: scoreFromDimensions(dimensionsForMove(move.moveId))
          }));
        const importanceTotal = moves.reduce(
          (total, move) => total + move.importance,
          0
        );
        return [
          side,
          {
            score: Math.round(
              moves.reduce(
                (total, move) => total + move.score * move.importance,
                0
              ) / importanceTotal
            ),
            moves
          }
        ];
      })
    );
    return {
      sectionId: section.sectionId,
      title: section.title,
      weightPercent: section.weightPercent,
      sides
    };
  });
  const overall = Object.fromEntries(
    SIDES.map((side) => {
      const weightedSectionMean = sections.reduce(
        (total, section) =>
          total + section.sides[side].score * (section.weightPercent / 100),
        0
      );
      const adjustment = adjustmentForSide(side);
      return [
        side,
        {
          weightedSectionMean: Number(weightedSectionMean.toFixed(2)),
          burdenCompletionAdjustment: adjustment,
          score: Math.max(0, Math.min(100, Math.round(weightedSectionMean + adjustment)))
        }
      ];
    })
  );
  const speakers = Object.fromEntries(
    SIDES.flatMap((side) =>
      inventory.sides[side].speakers.map((speaker) => {
        const moves = inventory.moves
          .filter((move) => move.speaker === speaker)
          .map((move) => ({
            moveId: move.moveId,
            importance: move.importance,
            score: scoreFromDimensions(dimensionsForMove(move.moveId))
          }));
        const importanceTotal = moves.reduce(
          (total, move) => total + move.importance,
          0
        );
        const sideImportanceTotal = inventory.moves
          .filter((move) => move.side === side)
          .reduce((total, move) => total + move.importance, 0);
        return [
          speaker,
          {
            side,
            selectedMoveCount: moves.length,
            importanceTotal,
            sideImportanceShare: Number(
              (importanceTotal / sideImportanceTotal).toFixed(4)
            ),
            speakerContributionScore: Math.round(
              moves.reduce(
                (total, move) => total + move.score * move.importance,
                0
              ) / importanceTotal
            ),
            publishedRankingEligible: false
          }
        ];
      })
    )
  );
  const winner =
    overall.pro.score === overall.con.score
      ? "tie"
      : overall.pro.score > overall.con.score
        ? "pro"
        : "con";
  return {
    sections,
    overall,
    speakers,
    winner,
    winningMargin: Math.abs(overall.pro.score - overall.con.score)
  };
}

export function deriveMultiSpeakerScores(finalLedger) {
  const moveById = new Map(finalLedger.moves.map((move) => [move.moveId, move]));
  const scored = scoreLedger(
    finalLedger,
    (moveId) => moveById.get(moveId).finalDimensions,
    (side) => finalLedger.burdenCompletionAdjustment[side].value
  );
  return {
    schemaVersion: "1.0-multi-speaker-score-output",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "single-deterministic-score-pass-complete",
    debateNumber: finalLedger.debateNumber,
    debateId: finalLedger.debateId,
    ...scored,
    audit: {
      calculator:
        "scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs",
      dimensionCalculator: "scripts/lib/reassessment-scoring.mjs#scoreDimensions",
      modelAuthoredTotals: 0,
      manualScoreOverrides: 0,
      scorePassOrdinal: 1,
      speakerContributionScoresDiagnosticOnly: true
    }
  };
}

function derivePassScores(inventory, pass) {
  const byId = judgmentMap(pass);
  return scoreLedger(
    inventory,
    (moveId) => byId.get(moveId).dimensions,
    (side) => pass.burdenCompletionAdjustment[side].value
  );
}

export function validateMultiSpeakerScoreStability({
  inventory,
  passA,
  passB,
  finalScores
}) {
  const a = derivePassScores(inventory, passA);
  const b = derivePassScores(inventory, passB);
  const distances = [];
  let maximumDistance = 0;
  let maximumExcursion = 0;
  for (const side of SIDES) {
    const values = [a.overall[side].score, b.overall[side].score];
    const final = finalScores.overall[side].score;
    for (const value of values) {
      const distance = Math.abs(final - value);
      distances.push(distance);
      maximumDistance = Math.max(maximumDistance, distance);
    }
    const low = Math.min(...values);
    const high = Math.max(...values);
    const excursion = final < low ? low - final : final > high ? final - high : 0;
    maximumExcursion = Math.max(maximumExcursion, excursion);
  }
  const meanAbsoluteDistance =
    distances.reduce((total, value) => total + value, 0) / distances.length;
  const sharedWinner = a.winner === b.winner && a.winner !== "tie" ? a.winner : null;
  const winnerDirectionPassed =
    sharedWinner === null || [sharedWinner, "tie"].includes(finalScores.winner);
  const result = {
    status: "evaluated",
    passScores: {
      passA: a.overall,
      passB: b.overall,
      final: finalScores.overall
    },
    metrics: {
      meanAbsoluteDistance,
      maximumDistance,
      maximumExcursion
    },
    thresholds: {
      meanAbsoluteDistanceAtMost: 4,
      maximumDistanceAtMost: 8,
      maximumExcursionAtMost: 3
    },
    winnerDirectionPassed,
    passed:
      meanAbsoluteDistance <= 4 &&
      maximumDistance <= 8 &&
      maximumExcursion <= 3 &&
      winnerDirectionPassed
  };
  assertMultiSpeaker(result.passed, "score stability: active v2.2 limits failed");
  return result;
}
