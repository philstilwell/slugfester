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

function validateFormatFitness(inventory, speakerSide, sectionIds, moveIds) {
  const fitness = inventory.formatFitness;
  assertMultiSpeaker(
    fitness && typeof fitness === "object" && !Array.isArray(fitness),
    "inventory.formatFitness: expected an object"
  );
  assertMultiSpeaker(
    ["debate", "discussion"].includes(fitness.publicFormat),
    "inventory.formatFitness.publicFormat: expected debate or discussion"
  );
  assertMultiSpeaker(
    ["clear", "approximate", "not-meaningful"].includes(fitness.twoSidedFit),
    "inventory.formatFitness.twoSidedFit: invalid classification"
  );
  assertMultiSpeaker(
    typeof fitness.scorecardEligible === "boolean" &&
      typeof fitness.winnerEligible === "boolean",
    "inventory.formatFitness: eligibility values must be boolean"
  );
  assertString(fitness.rationale, "inventory.formatFitness.rationale", 40);
  if (fitness.twoSidedFit === "clear") {
    assertMultiSpeaker(
      fitness.publicFormat === "debate" && fitness.scorecardEligible,
      "inventory.formatFitness: clear fit must be an eligible debate"
    );
  }
  if (fitness.twoSidedFit === "not-meaningful") {
    assertMultiSpeaker(
      fitness.publicFormat === "discussion" &&
        !fitness.scorecardEligible &&
        !fitness.winnerEligible,
      "inventory.formatFitness: a non-meaningful two-side fit must be a discussion without a scorecard or winner"
    );
  }
  assertMultiSpeaker(
    !fitness.winnerEligible || fitness.scorecardEligible,
    "inventory.formatFitness: winner eligibility requires scorecard eligibility"
  );

  assertMultiSpeaker(
    Array.isArray(fitness.speakerRoles) &&
      fitness.speakerRoles.length === speakerSide.size,
    "inventory.formatFitness.speakerRoles: one record per speaker required"
  );
  const roleSpeakers = new Set();
  let mixedRolePresent = false;
  for (const [index, record] of fitness.speakerRoles.entries()) {
    const label = `inventory.formatFitness.speakerRoles[${index}]`;
    assertMultiSpeaker(
      speakerSide.has(record.speaker) && !roleSpeakers.has(record.speaker),
      `${label}: unknown or duplicate speaker`
    );
    roleSpeakers.add(record.speaker);
    assertMultiSpeaker(
      record.assignedSide === speakerSide.get(record.speaker),
      `${label}: assigned side does not match the inventory side`
    );
    assertMultiSpeaker(
      ["advocate", "critic", "mixed"].includes(record.role),
      `${label}: invalid participant role`
    );
    assertString(record.rationale, `${label}.rationale`, 30);
    mixedRolePresent ||= record.role === "mixed";
  }

  const expectedAlignmentKeys = new Set(
    [...sectionIds].flatMap((sectionId) =>
      [...speakerSide.keys()].map((speaker) => `${sectionId}\u0000${speaker}`)
    )
  );
  assertMultiSpeaker(
    Array.isArray(fitness.sectionAlignments) &&
      fitness.sectionAlignments.length === expectedAlignmentKeys.size,
    "inventory.formatFitness.sectionAlignments: one record per section and speaker required"
  );
  const alignmentKeys = new Set();
  let mixedAlignmentPresent = false;
  let opposingAlignmentPresent = false;
  for (const [index, record] of fitness.sectionAlignments.entries()) {
    const label = `inventory.formatFitness.sectionAlignments[${index}]`;
    const key = `${record.sectionId}\u0000${record.speaker}`;
    assertMultiSpeaker(
      expectedAlignmentKeys.has(key) && !alignmentKeys.has(key),
      `${label}: unknown or duplicate section/speaker pair`
    );
    alignmentKeys.add(key);
    assertMultiSpeaker(
      [
        "supports-assigned-side",
        "opposes-assigned-side",
        "mixed",
        "inactive"
      ].includes(record.alignment),
      `${label}: invalid alignment`
    );
    assertMultiSpeaker(
      Array.isArray(record.selectedMoveIds) &&
        record.selectedMoveIds.every((moveId) => moveIds.has(moveId)),
      `${label}.selectedMoveIds: unknown move`
    );
    const actualMoveIds = inventory.moves
      .filter(
        (move) =>
          move.sectionId === record.sectionId && move.speaker === record.speaker
      )
      .map((move) => move.moveId);
    assertMultiSpeaker(
      canonicalJson(record.selectedMoveIds) === canonicalJson(actualMoveIds),
      `${label}: selected moves do not match the inventory`
    );
    assertMultiSpeaker(
      actualMoveIds.length === 0
        ? record.alignment === "inactive"
        : record.alignment !== "inactive",
      `${label}: inactive status must match selected-move participation`
    );
    assertString(record.rationale, `${label}.rationale`, 20);
    mixedAlignmentPresent ||= record.alignment === "mixed";
    opposingAlignmentPresent ||= record.alignment === "opposes-assigned-side";
  }
  assertMultiSpeaker(
    !fitness.scorecardEligible || !opposingAlignmentPresent,
    "inventory.formatFitness: opposing selected contributions make the two-side scorecard ineligible"
  );
  assertMultiSpeaker(
    !fitness.winnerEligible || (!mixedRolePresent && !mixedAlignmentPresent),
    "inventory.formatFitness: mixed roles or alignments require winner withholding"
  );
  return {
    publicFormat: fitness.publicFormat,
    twoSidedFit: fitness.twoSidedFit,
    scorecardEligible: fitness.scorecardEligible,
    winnerEligible: fitness.winnerEligible,
    mixedRolePresent,
    mixedAlignmentPresent
  };
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

  const formatFitness = validateFormatFitness(
    inventory,
    speakerSide,
    sectionIds,
    moveIds
  );

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
      inventory.audit?.formatFitnessComplete === true &&
      inventory.audit?.sectionAlignmentsComplete === true &&
      inventory.audit?.calculatedTotalsAbsent === true,
    "inventory.audit: required claims missing"
  );

  return {
    status: "passed",
    debateNumber: inventory.debateNumber,
    speakers: speakerSide.size,
    sections: inventory.sections.length,
    moves: inventory.moves.length,
    formatFitness,
    belowHighAttributionMoveIds: inventory.moves
      .filter((move) => move.attributionConfidence !== "high")
      .map((move) => move.moveId)
  };
}

export function validateMultiSpeakerInventoryAudit(
  inventoryAudit,
  inventory,
  {
    expectedInventorySha256,
    expectedTranscriptSha256,
    expectedEventsSha256
  }
) {
  assertMultiSpeaker(
    inventoryAudit?.schemaVersion ===
      "1.0-multi-speaker-independent-inventory-audit" &&
      inventoryAudit.protocolId === MULTI_SPEAKER_PROTOCOL_ID &&
      inventoryAudit.status === "complete-and-schema-valid" &&
      inventoryAudit.debateNumber === inventory.debateNumber &&
      inventoryAudit.debateId === inventory.debateId &&
      inventoryAudit.reviewerRole ===
        "independent-score-blind-inventory-auditor" &&
      inventoryAudit.assessmentModel === MULTI_SPEAKER_MODEL &&
      inventoryAudit.reasoningEffort === MULTI_SPEAKER_REASONING &&
      inventoryAudit.inventorySha256 === expectedInventorySha256,
    "inventory audit: identity or inventory lock mismatch"
  );
  assertMultiSpeaker(
    inventoryAudit.sourceLocks?.transcriptSha256 === expectedTranscriptSha256 &&
      inventoryAudit.sourceLocks?.eventsSha256 === expectedEventsSha256,
    "inventory audit: source lock mismatch"
  );
  assertMultiSpeaker(
    inventoryAudit.isolation?.legacyAssessmentsUnavailable === true &&
      inventoryAudit.isolation?.calculatedTotalsUnavailable === true &&
      inventoryAudit.isolation?.winnerLabelsUnavailable === true &&
      inventoryAudit.isolation?.primaryJudgmentsUnavailable === true &&
      inventoryAudit.isolation?.publicationProseUnavailable === true &&
      inventoryAudit.isolation?.otherDebatesUnavailable === true &&
      inventoryAudit.isolation?.contaminationDetected === false,
    "inventory audit: isolation boundary mismatch"
  );
  assertMultiSpeaker(
    Array.isArray(inventoryAudit.findings),
    "inventory audit: findings must be an array"
  );
  const findingIds = new Set();
  const findingCategories = new Set([
    "omitted-load-bearing-move",
    "speaker-ownership",
    "side-assignment",
    "section-membership",
    "importance",
    "response-link",
    "adoption-link",
    "opportunity-coverage",
    "format-fitness"
  ]);
  for (const [index, finding] of inventoryAudit.findings.entries()) {
    const label = `inventoryAudit.findings[${index}]`;
    assertString(finding.findingId, `${label}.findingId`);
    assertMultiSpeaker(
      !findingIds.has(finding.findingId),
      `${label}: duplicate finding ID`
    );
    findingIds.add(finding.findingId);
    assertMultiSpeaker(
      findingCategories.has(finding.category),
      `${label}: invalid category`
    );
    assertMultiSpeaker(
      ["blocking", "material", "minor"].includes(finding.severity),
      `${label}: invalid severity`
    );
    assertString(finding.rationale, `${label}.rationale`, 40);
    assertMultiSpeaker(
      Array.isArray(finding.relatedMoveIds) &&
        finding.relatedMoveIds.every((moveId) => allMoveIds(inventory).has(moveId)),
      `${label}: unknown related move`
    );
    assertMultiSpeaker(
      typeof finding.correctionRequired === "boolean" &&
        typeof finding.resolved === "boolean",
      `${label}: correction and resolution flags must be boolean`
    );
    if (finding.severity !== "minor" || finding.correctionRequired) {
      assertMultiSpeaker(finding.resolved, `${label}: material finding is unresolved`);
    }
  }
  assertMultiSpeaker(
    Array.isArray(inventoryAudit.correctionHistory) &&
      inventoryAudit.correctionHistory.length <= 1,
    "inventory audit: at most one bounded correction cycle is permitted"
  );
  for (const [index, correction] of inventoryAudit.correctionHistory.entries()) {
    const label = `inventoryAudit.correctionHistory[${index}]`;
    assertString(correction.priorInventorySha256, `${label}.priorInventorySha256`, 64);
    assertString(correction.summary, `${label}.summary`, 40);
    assertMultiSpeaker(
      Array.isArray(correction.resolvedFindingIds) &&
        correction.resolvedFindingIds.every((findingId) => findingIds.has(findingId)),
      `${label}: correction references an unknown finding`
    );
  }
  const expectedVerdict = inventory.formatFitness.scorecardEligible
    ? "accept"
    : "discussion-only";
  assertMultiSpeaker(
    inventoryAudit.verdict === expectedVerdict &&
      inventoryAudit.approvedForScoring ===
        inventory.formatFitness.scorecardEligible,
    "inventory audit: verdict does not match format eligibility"
  );
  assertMultiSpeaker(
    inventoryAudit.audit?.completeTranscriptReviewed === true &&
      inventoryAudit.audit?.allLoadBearingMovesChecked === true &&
      inventoryAudit.audit?.speakerOwnershipChecked === true &&
      inventoryAudit.audit?.opportunityCoverageChecked === true &&
      inventoryAudit.audit?.formatFitnessChecked === true &&
      inventoryAudit.audit?.scoreBlind === true,
    "inventory audit: required claims missing"
  );
  return {
    status: "passed",
    verdict: inventoryAudit.verdict,
    approvedForScoring: inventoryAudit.approvedForScoring,
    findings: inventoryAudit.findings.length,
    corrections: inventoryAudit.correctionHistory.length
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
  { expectedPass, expectedInventorySha256, expectedInventoryAuditSha256 }
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
      judgment.inventorySha256 === expectedInventorySha256 &&
      judgment.inventoryAuditSha256 === expectedInventoryAuditSha256,
    `${expectedPass}: judgment identity mismatch`
  );
  assertMultiSpeaker(
    inventory.formatFitness?.scorecardEligible === true,
    `${expectedPass}: format is not scorecard-eligible`
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

export function validateMultiSpeakerAudioVerification(
  audio,
  inventory,
  { expectedInventorySha256 }
) {
  assertMultiSpeaker(
    audio?.schemaVersion === "1.0-multi-speaker-audio-verification" &&
      audio.protocolId === MULTI_SPEAKER_PROTOCOL_ID &&
      audio.status === "complete-and-schema-valid" &&
      audio.debateNumber === inventory.debateNumber &&
      audio.debateId === inventory.debateId &&
      audio.inventorySha256 === expectedInventorySha256,
    "audio: identity or inventory lock mismatch"
  );
  assertMultiSpeaker(
    Array.isArray(audio.verifications) &&
      canonicalJson(audio.verifications.map((item) => item.moveId)) ===
        canonicalJson(inventory.moves.map((move) => move.moveId)),
    "audio: every selected move must be verified in inventory order"
  );
  const moveById = new Map(inventory.moves.map((move) => [move.moveId, move]));
  for (const [index, verification] of audio.verifications.entries()) {
    const label = `audio.verifications[${index}]`;
    const move = moveById.get(verification.moveId);
    assertMultiSpeaker(
      verification.speaker === move.speaker &&
        verification.speakerVerified === true &&
        verification.startBoundaryVerified === true &&
        verification.endBoundaryVerified === true &&
        verification.crossTalkResolved === true &&
        verification.result === "confirmed",
      `${label}: ownership, boundary, cross-talk, or result is unresolved`
    );
    assertMultiSpeaker(
      canonicalJson(verification.quoteEligibleExactSpansVerified) ===
        canonicalJson(move.quoteEligibleExactSpans),
      `${label}: quote verification population differs from the inventory`
    );
    assertString(verification.notes, `${label}.notes`, 20);
  }
  assertMultiSpeaker(
    Array.isArray(audio.correctionsApplied) && audio.correctionsApplied.length <= 1,
    "audio: at most one bounded correction-and-reaudit cycle is permitted"
  );
  for (const [index, correction] of audio.correctionsApplied.entries()) {
    const label = `audio.correctionsApplied[${index}]`;
    assertString(correction.priorInventorySha256, `${label}.priorInventorySha256`, 64);
    assertString(correction.summary, `${label}.summary`, 40);
    assertMultiSpeaker(
      correction.reaudited === true,
      `${label}: corrected inventory must be independently re-audited`
    );
  }
  assertMultiSpeaker(
    audio.audit?.allSelectedMovesVerified === true &&
      audio.audit?.allSpeakerHandoffsVerified === true &&
      audio.audit?.allCrossTalkResolved === true &&
      audio.audit?.allQuoteEligibleSpansVerified === true &&
      audio.audit?.unresolvedAttributions === 0,
    "audio.audit: required claims missing"
  );
  return {
    status: "passed",
    verifiedMoves: audio.verifications.length,
    corrections: audio.correctionsApplied.length
  };
}

export function assembleMultiSpeakerFinalLedger({
  inventory,
  inventorySha256,
  inventoryAudit,
  inventoryAuditSha256,
  expectedTranscriptSha256,
  expectedEventsSha256,
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
  validateMultiSpeakerInventoryAudit(inventoryAudit, inventory, {
    expectedInventorySha256: inventorySha256,
    expectedTranscriptSha256,
    expectedEventsSha256
  });
  assertMultiSpeaker(
    sha256(canonicalJson(inventoryAudit)) === inventoryAuditSha256 &&
      passA.inventoryAuditSha256 === inventoryAuditSha256 &&
      passB.inventoryAuditSha256 === inventoryAuditSha256,
    "final ledger: independent inventory audit lock mismatch"
  );
  validateMultiSpeakerAudioVerification(audio, inventory, {
    expectedInventorySha256: inventorySha256
  });
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
      inventoryAudit: { sha256: inventoryAuditSha256 },
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
    formatFitness: clone(inventory.formatFitness),
    moves,
    burdenCompletionAdjustment,
    audit: {
      inventoryStructureUnchanged: true,
      speakerOwnershipUnchanged: true,
      disputesResolved: disagreements.disputes.length,
      unresolvedDisputes: 0,
      independentInventoryAuditLocked: true,
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

function weightedMoveMean(moves) {
  const importanceTotal = moves.reduce(
    (total, move) => total + move.importance,
    0
  );
  return moves.reduce(
    (total, move) => total + move.score * move.importance,
    0
  ) / importanceTotal;
}

function scoreLedger(
  inventory,
  dimensionsForMove,
  adjustmentForSide,
  { speakerWeighting = "contribution", excludedSpeaker = null } = {}
) {
  assertMultiSpeaker(
    ["contribution", "equal-active-speaker"].includes(speakerWeighting),
    "score ledger: invalid speaker weighting"
  );
  const sections = inventory.sections.map((section) => {
    const sides = Object.fromEntries(
      SIDES.map((side) => {
        const moves = inventory.moves
          .filter(
            (move) =>
              move.sectionId === section.sectionId &&
              move.side === side &&
              move.speaker !== excludedSpeaker
          )
          .map((move) => ({
            moveId: move.moveId,
            speaker: move.speaker,
            importance: move.importance,
            dimensions: dimensionsForMove(move.moveId),
            score: scoreFromDimensions(dimensionsForMove(move.moveId))
          }));
        assertMultiSpeaker(
          moves.length > 0,
          `${section.sectionId}: ${side} has no moves under the requested diagnostic`
        );
        const activeSpeakers = [...new Set(moves.map((move) => move.speaker))];
        const score =
          speakerWeighting === "equal-active-speaker"
            ? activeSpeakers.reduce((total, speaker) => {
                const speakerMoves = moves.filter(
                  (move) => move.speaker === speaker
                );
                return total + weightedMoveMean(speakerMoves);
              }, 0) / activeSpeakers.length
            : weightedMoveMean(moves);
        return [
          side,
          {
            score: Math.round(score),
            speakerWeighting,
            activeSpeakers,
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
            speakerContributionScore:
              moves.length > 0 ? Math.round(weightedMoveMean(moves)) : null,
            publishedRankingEligible: false
          }
        ];
      })
    )
  );
  const scoreLeader =
    overall.pro.score === overall.con.score
      ? "tie"
      : overall.pro.score > overall.con.score
        ? "pro"
        : "con";
  const winnerEligible = inventory.formatFitness?.winnerEligible !== false;
  return {
    sections,
    overall,
    speakers,
    scoreLeader,
    winner: winnerEligible ? scoreLeader : "withheld",
    winnerEligible,
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
    rankingPolicy: {
      debateExcludedFromInterlocutorRankings: true,
      speakerContributionScoresPublished: false,
      futurePolicyAuthorizationRequired: true
    },
    audit: {
      calculator:
        "scripts/lib/assessment-production-multi-speaker-approximation-v1.mjs",
      dimensionCalculator: "scripts/lib/reassessment-scoring.mjs#scoreDimensions",
      modelAuthoredTotals: 0,
      manualScoreOverrides: 0,
      scorePassOrdinal: 1,
      speakerContributionScoresDiagnosticOnly: true,
      rankingExclusionLocked: true
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

export function deriveMultiSpeakerScoreUncertainty({
  inventory,
  passA,
  passB,
  finalScores
}) {
  const a = derivePassScores(inventory, passA);
  const b = derivePassScores(inventory, passB);
  const sides = Object.fromEntries(
    SIDES.map((side) => {
      const primaryScores = [a.overall[side].score, b.overall[side].score];
      const minimum = Math.min(...primaryScores);
      const maximum = Math.max(...primaryScores);
      return [
        side,
        {
          consensus: finalScores.overall[side].score,
          passA: primaryScores[0],
          passB: primaryScores[1],
          primaryRange: { minimum, maximum },
          display:
            `Consensus ${finalScores.overall[side].score}; independent assessments ` +
            `${primaryScores[0]} and ${primaryScores[1]} (range ${minimum}–${maximum}).`
        }
      ];
    })
  );
  const aById = judgmentMap(passA);
  const bById = judgmentMap(passB);
  const moveDeltas = inventory.moves.map((move) => ({
    moveId: move.moveId,
    speaker: move.speaker,
    side: move.side,
    passA: passMoveScore(aById.get(move.moveId)),
    passB: passMoveScore(bById.get(move.moveId)),
    delta: Math.abs(
      passMoveScore(aById.get(move.moveId)) -
        passMoveScore(bById.get(move.moveId))
    )
  }));
  return {
    schemaVersion: "1.0-multi-speaker-score-uncertainty",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "derived-without-score-mutation",
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    sides,
    primaryLeaders: {
      passA: a.scoreLeader,
      passB: b.scoreLeader,
      agree: a.scoreLeader === b.scoreLeader
    },
    moveDeltas,
    metrics: {
      meanMoveScoreDelta: Number(
        (
          moveDeltas.reduce((total, move) => total + move.delta, 0) /
          moveDeltas.length
        ).toFixed(2)
      ),
      maximumMoveScoreDelta: Math.max(...moveDeltas.map((move) => move.delta))
    },
    publicationRequired: true
  };
}

function sensitivitySummary(scored) {
  return {
    overall: clone(scored.overall),
    scoreLeader: scored.scoreLeader,
    winningMargin: scored.winningMargin
  };
}

export function analyzeMultiSpeakerFormatSensitivity({
  finalLedger,
  finalScores
}) {
  const moveById = new Map(finalLedger.moves.map((move) => [move.moveId, move]));
  const dimensionsForMove = (moveId) => moveById.get(moveId).finalDimensions;
  const adjustmentForSide = (side) =>
    finalLedger.burdenCompletionAdjustment[side].value;
  const equalActiveSpeaker = scoreLedger(
    finalLedger,
    dimensionsForMove,
    adjustmentForSide,
    { speakerWeighting: "equal-active-speaker" }
  );
  const baseline = sensitivitySummary(finalScores);
  const equalSummary = {
    ...sensitivitySummary(equalActiveSpeaker),
    changesLeadingSide:
      equalActiveSpeaker.scoreLeader !== finalScores.scoreLeader
  };
  const leaveOneSpeakerOut = SIDES.flatMap((side) =>
    finalLedger.sides[side].speakers.map((speaker) => {
      const wouldLeaveEmptySection = finalLedger.sections.some((section) =>
        SIDES.some(
          (sectionSide) =>
            !finalLedger.moves.some(
              (move) =>
                move.sectionId === section.sectionId &&
                move.side === sectionSide &&
                move.speaker !== speaker
            )
        )
      );
      const adjustmentAffected = SIDES.some((adjustmentSide) =>
        finalLedger.burdenCompletionAdjustment[
          adjustmentSide
        ].relatedMoveIds.some(
          (moveId) => moveById.get(moveId)?.speaker === speaker
        )
      );
      if (wouldLeaveEmptySection || adjustmentAffected) {
        return {
          speaker,
          side,
          status: "not-computable",
          reason: wouldLeaveEmptySection
            ? "Removing this speaker leaves at least one scored section without a move on one side."
            : "Removing this speaker would also remove evidence supporting a side-level burden adjustment.",
          changesLeadingSide: null
        };
      }
      const scored = scoreLedger(
        finalLedger,
        dimensionsForMove,
        adjustmentForSide,
        { excludedSpeaker: speaker }
      );
      return {
        speaker,
        side,
        status: "computed",
        ...sensitivitySummary(scored),
        changesLeadingSide: scored.scoreLeader !== finalScores.scoreLeader
      };
    })
  );
  const leaderChangingVariants = [
    ...(equalSummary.changesLeadingSide
      ? ["equal-active-speaker"]
      : []),
    ...leaveOneSpeakerOut
      .filter((item) => item.changesLeadingSide)
      .map((item) => `leave-out:${item.speaker}`)
  ];
  return {
    schemaVersion: "1.0-multi-speaker-format-sensitivity",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "derived-without-score-mutation",
    debateNumber: finalLedger.debateNumber,
    debateId: finalLedger.debateId,
    baseline,
    equalActiveSpeaker: equalSummary,
    leaveOneSpeakerOut,
    structuralDependencySpeakers: leaveOneSpeakerOut
      .filter((item) => item.status === "not-computable")
      .map((item) => item.speaker),
    leaderChangingVariants,
    formatSensitive: leaderChangingVariants.length > 0,
    officialScoresChanged: false
  };
}

export function buildMultiSpeakerPublicationDiagnostics({
  finalLedger,
  finalScores,
  uncertainty,
  sensitivity
}) {
  assertMultiSpeaker(
    [finalScores, uncertainty, sensitivity].every(
      (record) =>
        record?.debateNumber === finalLedger.debateNumber &&
        record?.debateId === finalLedger.debateId
    ),
    "publication diagnostics: debate identity mismatch"
  );
  assertMultiSpeaker(
    uncertainty.status === "derived-without-score-mutation" &&
      sensitivity.status === "derived-without-score-mutation" &&
      sensitivity.officialScoresChanged === false,
    "publication diagnostics: required score diagnostics are incomplete"
  );
  for (const side of SIDES) {
    assertMultiSpeaker(
      uncertainty.sides[side].consensus === finalScores.overall[side].score,
      `publication diagnostics: ${side} consensus differs from the official score`
    );
  }
  return {
    schemaVersion: "1.0-multi-speaker-publication-diagnostics",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "ready-for-publication-reconstruction",
    debateNumber: finalLedger.debateNumber,
    debateId: finalLedger.debateId,
    rubric: MULTI_SPEAKER_RUBRIC,
    disclosure:
      "The displayed totals assess the two sides collectively under the multi-speaker approximation workflow.",
    publicFormat: finalLedger.formatFitness.publicFormat,
    winnerEligible: finalLedger.formatFitness.winnerEligible,
    winner: finalScores.winner,
    sides: Object.fromEntries(
      SIDES.map((side) => [side, clone(uncertainty.sides[side])])
    ),
    formatSensitive: sensitivity.formatSensitive,
    formatSensitivityNotice: sensitivity.formatSensitive
      ? "Format-sensitive: at least one reasonable speaker-weighting diagnostic changes the leading side."
      : null,
    interlocutorRankingEligible: false,
    speakerContributionScoresPublishable: false
  };
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
  const sharedWinner =
    a.scoreLeader === b.scoreLeader && a.scoreLeader !== "tie"
      ? a.scoreLeader
      : null;
  const winnerDirectionPassed =
    sharedWinner === null || [sharedWinner, "tie"].includes(finalScores.scoreLeader);
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

export function buildMultiSpeakerCheckpointReliabilityReport({
  records,
  expectedDebateNumbers = ["71", "84", "154"]
}) {
  assertMultiSpeaker(
    Array.isArray(records) && records.length === expectedDebateNumbers.length,
    "checkpoint report: expected one record per checkpoint debate"
  );
  assertMultiSpeaker(
    canonicalJson(records.map((record) => record.debateNumber)) ===
      canonicalJson(expectedDebateNumbers),
    "checkpoint report: debate order or population mismatch"
  );
  const debates = records.map((record) => {
    const formatFitness = record.inventory?.formatFitness;
    const publicationPassed = record.publicationValidation?.passed === true;
    const renderingPassed =
      record.renderingValidation?.desktopPassed === true &&
      record.renderingValidation?.mobilePassed === true &&
      record.renderingValidation?.accessibilityPassed === true;
    const inventoryAuditPassed =
      record.inventoryAudit?.approvedForScoring === true &&
      record.inventoryAudit?.verdict === "accept";
    const audioPassed =
      record.audio?.status === "complete-and-schema-valid" &&
      record.audio?.audit?.unresolvedAttributions === 0 &&
      record.audio?.verifications?.length === record.inventory?.moves?.length;
    const disagreementsPassed =
      record.disagreements?.status === "complete-and-frozen" &&
      Array.isArray(record.disagreements?.disputes);
    const uncertaintyPassed =
      record.uncertainty?.status === "derived-without-score-mutation" &&
      SIDES.every(
        (side) =>
          Number.isInteger(record.uncertainty?.sides?.[side]?.primaryRange?.minimum) &&
          Number.isInteger(record.uncertainty?.sides?.[side]?.primaryRange?.maximum)
      );
    const sensitivityPassed =
      record.sensitivity?.status === "derived-without-score-mutation" &&
      record.sensitivity?.officialScoresChanged === false;
    const reasons = [];
    if (!formatFitness?.scorecardEligible) reasons.push("scorecard-ineligible-format");
    if (!inventoryAuditPassed) reasons.push("inventory-audit-failed");
    if (!audioPassed) reasons.push("audio-verification-failed");
    if (!disagreementsPassed) reasons.push("disagreement-extraction-missing");
    if (!uncertaintyPassed) reasons.push("uncertainty-report-missing");
    if (!sensitivityPassed) reasons.push("sensitivity-report-missing");
    if (record.stability?.passed !== true) reasons.push("score-stability-failed");
    if (record.sensitivity?.formatSensitive === true) {
      reasons.push("format-sensitive-leading-side");
    }
    if (!publicationPassed) reasons.push("publication-validation-failed");
    if (!renderingPassed) reasons.push("rendering-validation-failed");
    return {
      debateNumber: record.debateNumber,
      format: record.format,
      publicFormat: formatFitness?.publicFormat,
      twoSidedFit: formatFitness?.twoSidedFit,
      winnerWithheld: formatFitness?.winnerEligible === false,
      inventoryFindings: record.inventoryAudit?.findings?.length ?? 0,
      inventoryCorrections:
        record.inventoryAudit?.correctionHistory?.length ?? 0,
      attributionCorrections: record.audio?.correctionsApplied?.length ?? 0,
      movesAudioVerified: record.audio?.verifications?.length ?? 0,
      disputes: record.disagreements?.disputes?.length ?? 0,
      meanMoveScoreDelta: record.uncertainty?.metrics?.meanMoveScoreDelta,
      maximumMoveScoreDelta: record.uncertainty?.metrics?.maximumMoveScoreDelta,
      primaryScoreRanges: Object.fromEntries(
        SIDES.map((side) => [
          side,
          record.uncertainty?.sides?.[side]?.primaryRange
        ])
      ),
      formatSensitive: record.sensitivity?.formatSensitive === true,
      leaderChangingVariants:
        record.sensitivity?.leaderChangingVariants ?? [],
      structuralDependencySpeakers:
        record.sensitivity?.structuralDependencySpeakers ?? [],
      scoreStabilityPassed: record.stability?.passed === true,
      publicationPassed,
      renderingPassed,
      passed: reasons.length === 0,
      holdReasons: reasons
    };
  });
  const holdReasons = debates.flatMap((debate) =>
    debate.holdReasons.map((reason) => `Debate ${debate.debateNumber}: ${reason}`)
  );
  return {
    schemaVersion: "1.0-multi-speaker-checkpoint-reliability-report",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "complete",
    checkpointDebateNumbers: [...expectedDebateNumbers],
    debates,
    aggregate: {
      debates: debates.length,
      passed: debates.filter((debate) => debate.passed).length,
      inventoryFindings: debates.reduce(
        (total, debate) => total + debate.inventoryFindings,
        0
      ),
      inventoryCorrections: debates.reduce(
        (total, debate) => total + debate.inventoryCorrections,
        0
      ),
      attributionCorrections: debates.reduce(
        (total, debate) => total + debate.attributionCorrections,
        0
      ),
      disputes: debates.reduce((total, debate) => total + debate.disputes, 0),
      formatSensitiveDebates: debates.filter(
        (debate) => debate.formatSensitive
      ).length,
      winnersWithheld: debates.filter((debate) => debate.winnerWithheld).length
    },
    decision: {
      status: holdReasons.length > 0 ? "hold-for-review" : "proceed-to-batches",
      laterBatchExecutionAuthorized: holdReasons.length === 0,
      reasons: holdReasons
    }
  };
}
