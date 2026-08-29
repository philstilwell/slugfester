import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { scoreDimensions } from "./reassessment-scoring.mjs";

export const STANDALONE_ROOT =
  "docs/assessment-production/standalone-debates-v1";
export const STANDALONE_PROTOCOL_ID =
  "assessment-production-standalone-debate-v1";
export const STANDALONE_SITE_LEDGER_ADAPTER_VERSION =
  "1.0-assessment-production-standalone-debate-site-ledger-adapter";
export const STANDALONE_SCORE_PROTOCOL_ID =
  "standalone-v1-single-deterministic-score-pass";
export const DIMENSION_KEYS = Object.freeze([
  "logicalCoherence",
  "evidenceWarrant",
  "responsiveness",
  "relevanceBurden",
  "precisionClarity",
  "calibrationCharity"
]);

const clone = (value) => structuredClone(value);

export function assertStandalone(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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

export function fileRecord(filePath, root = process.cwd()) {
  const absolute = new URL(`file://${root.replace(/\/$/, "")}/${filePath}`);
  const bytes = readFileSync(absolute);
  return { path: filePath, sha256: sha256(bytes), bytes: bytes.length };
}

function exactKeys(value, keys, label) {
  assertStandalone(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertStandalone(
    actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]),
    `${label}: keys must be ${expected.join(", ")}`
  );
}

function assertString(value, label, minimum = 1) {
  assertStandalone(
    typeof value === "string" && value.trim().length >= minimum,
    `${label}: expected a string of at least ${minimum} characters`
  );
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeEvents(eventsDocument) {
  assertStandalone(Array.isArray(eventsDocument), "events: expected an array");
  return eventsDocument.map((event, index) => {
    assertStandalone(
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

export function validateStandaloneInventory(
  inventory,
  eventsDocument,
  { repositoryOnly = false } = {}
) {
  const events = repositoryOnly ? null : normalizeEvents(eventsDocument);
  assertStandalone(
    inventory?.schemaVersion === "1.0-standalone-score-blind-inventory" &&
      inventory.protocolId === STANDALONE_PROTOCOL_ID &&
      inventory.status === "complete-and-frozen" &&
      inventory.debateNumber === "196" &&
      inventory.debateId === "huemer-rasmussen-god-existence-2026" &&
      inventory.assessmentModel === "5.6 Sol",
    "inventory: identity or status mismatch"
  );
  assertStandalone(
    Array.isArray(inventory.routes) && inventory.routes.length === 2,
    "inventory: exactly two routes required"
  );
  assertStandalone(
    canonicalJson(inventory.routes.map((route) => route.side).sort()) ===
      canonicalJson(["con", "pro"]),
    "inventory: one route per side required"
  );
  const bridgeIds = new Set();
  for (const route of inventory.routes) {
    assertStandalone(
      Array.isArray(route.bridges) &&
        route.bridges.length >= 3 &&
        route.bridges.length <= 7,
      `${route.side}: bridge count outside 3..7`
    );
    const tiers = route.bridges.map((bridge) => bridge.tier);
    assertStandalone(
      tiers.filter((tier) => tier === "motion").length === 1 &&
        tiers.includes("central") &&
        tiers.includes("subsidiary"),
      `${route.side}: route must include motion, central, and subsidiary bridges`
    );
    for (const bridge of route.bridges) {
      assertString(bridge.bridgeId, `${route.side}.bridgeId`);
      assertStandalone(
        !bridgeIds.has(bridge.bridgeId),
        `inventory: duplicate bridge ${bridge.bridgeId}`
      );
      bridgeIds.add(bridge.bridgeId);
    }
  }

  assertStandalone(
    Array.isArray(inventory.sections) &&
      inventory.sections.length >= 4 &&
      inventory.sections.length <= 7,
    "inventory: section count outside 4..7"
  );
  const sectionIds = new Set();
  let weightTotal = 0;
  for (const section of inventory.sections) {
    assertString(section.sectionId, "section.sectionId");
    assertStandalone(
      !sectionIds.has(section.sectionId),
      `inventory: duplicate section ${section.sectionId}`
    );
    sectionIds.add(section.sectionId);
    assertStandalone(
      Number.isInteger(section.weightPercent) && section.weightPercent > 0,
      `${section.sectionId}: invalid weight`
    );
    weightTotal += section.weightPercent;
  }
  assertStandalone(weightTotal === 100, "inventory: section weights must total 100");

  assertStandalone(
    Array.isArray(inventory.moves) &&
      inventory.moves.length >= 8 &&
      inventory.moves.length <= 48,
    "inventory: move count outside 8..48"
  );
  const moveIds = allMoveIds(inventory);
  assertStandalone(
    moveIds.size === inventory.moves.length,
    "inventory: move IDs must be unique"
  );
  let previousStartEvent = -1;
  for (const [index, move] of inventory.moves.entries()) {
    const label = `moves[${index}]`;
    assertStandalone(sectionIds.has(move.sectionId), `${label}: unknown section`);
    assertStandalone(
      (move.side === "pro" && move.speaker === "Joshua Rasmussen") ||
        (move.side === "con" && move.speaker === "Michael Huemer"),
      `${label}: speaker/side mismatch`
    );
    assertStandalone(
      ["constructive", "reply"].includes(move.moveKind),
      `${label}: invalid move kind`
    );
    const { startEvent, endEvent, startMs, endMs, excerpt } = move.sourceSpan ?? {};
    assertStandalone(
      Number.isInteger(startEvent) &&
        Number.isInteger(endEvent) &&
        startEvent >= 0 &&
        startEvent <= endEvent &&
        (repositoryOnly || endEvent < events.length),
      `${label}: invalid event span`
    );
    assertStandalone(
      startEvent >= previousStartEvent,
      `${label}: moves are not chronological`
    );
    previousStartEvent = startEvent;
    if (!repositoryOnly) {
      const expectedStart = events[startEvent].startMs;
      const expectedEnd =
        events[endEvent].startMs + events[endEvent].durationMs;
      assertStandalone(
        startMs === expectedStart && endMs === expectedEnd,
        `${label}: timestamp endpoints do not match events`
      );
      const expectedExcerpt = spanText(events, startEvent, endEvent);
      assertStandalone(excerpt === expectedExcerpt, `${label}: excerpt is not source-exact`);
    }
    assertStandalone(
      Array.isArray(move.quoteEligibleExactSpans),
      `${label}: quoteEligibleExactSpans must be an array`
    );
    for (const quote of move.quoteEligibleExactSpans) {
      assertStandalone(
        wordCount(quote) >= 3 &&
          wordCount(quote) <= 18 &&
          excerpt.includes(quote),
        `${label}: quote is not an exact 3-18 word source substring`
      );
    }
    assertStandalone(
      ["high", "medium", "low"].includes(move.attributionConfidence),
      `${label}: invalid attribution confidence`
    );
    assertStandalone(
      Number.isInteger(move.importance) && move.importance >= 1 && move.importance <= 3,
      `${label}: invalid importance`
    );
    assertStandalone(
      bridgeIds.has(move.burdenContact?.bridgeId),
      `${label}: unknown burden bridge`
    );
    assertStandalone(
      move.burdenContact.tier ===
        inventory.routes
          .flatMap((route) => route.bridges)
          .find((bridge) => bridge.bridgeId === move.burdenContact.bridgeId)?.tier,
      `${label}: burden tier differs from bridge`
    );
    assertStandalone(Array.isArray(move.respondsToIds), `${label}: respondsToIds missing`);
    assertStandalone(
      move.respondsToIds.every(
        (targetId) =>
          moveIds.has(targetId) &&
          inventory.moves.findIndex((candidate) => candidate.moveId === targetId) < index
      ),
      `${label}: response target must be an earlier move`
    );
    assertStandalone(
      Array.isArray(move.responseComponents),
      `${label}: responseComponents missing`
    );
    if (move.moveKind === "constructive") {
      assertStandalone(
        move.respondsToIds.length === 0 && move.responseComponents.length === 0,
        `${label}: constructive move cannot have response targets`
      );
    } else {
      assertStandalone(
        move.respondsToIds.length > 0 && move.responseComponents.length > 0,
        `${label}: reply requires response targets and components`
      );
      for (const component of move.responseComponents) {
        assertStandalone(
          move.respondsToIds.includes(component.targetMoveId),
          `${label}: response component target is not selected`
        );
      }
    }
  }
  for (const sectionId of sectionIds) {
    for (const side of ["pro", "con"]) {
      assertStandalone(
        inventory.moves.some(
          (move) => move.sectionId === sectionId && move.side === side
        ),
        `${sectionId}: ${side} has no move`
      );
    }
  }
  assertStandalone(
    inventory.audit?.calculatedTotalsAbsent === true &&
      inventory.audit?.completeTranscriptReviewed === true &&
      inventory.audit?.allSpansSourceExact === true,
    "inventory: required audit claims missing"
  );
  return {
    status: "passed",
    debateNumber: inventory.debateNumber,
    sections: inventory.sections.length,
    moves: inventory.moves.length,
    belowHighAttributionMoveIds: inventory.moves
      .filter((move) => move.attributionConfidence !== "high")
      .map((move) => move.moveId)
  };
}

function validateEligibility(eligibility, label, inventory) {
  const keys = [
    "distinctDebateWideConsequence",
    "affectsBurdenCompletion",
    "notAlreadyScored",
    "affectedBurdenIds",
    "completionCriterion",
    "relatedMoveIds",
    "distinctConsequence",
    "alreadyCapturedBy",
    "counterfactual"
  ];
  exactKeys(eligibility, keys, label);
  for (const key of [
    "distinctDebateWideConsequence",
    "affectsBurdenCompletion",
    "notAlreadyScored"
  ]) {
    assertStandalone(typeof eligibility[key] === "boolean", `${label}.${key}: boolean required`);
  }
  for (const key of ["affectedBurdenIds", "relatedMoveIds", "alreadyCapturedBy"]) {
    assertStandalone(Array.isArray(eligibility[key]), `${label}.${key}: array required`);
  }
  const bridgeIds = new Set(inventory.routes.flatMap((route) => route.bridges.map((bridge) => bridge.bridgeId)));
  const moveIds = allMoveIds(inventory);
  assertStandalone(
    eligibility.affectedBurdenIds.every((id) => bridgeIds.has(id)),
    `${label}: unknown burden ID`
  );
  assertStandalone(
    eligibility.relatedMoveIds.every((id) => moveIds.has(id)),
    `${label}: unknown move ID`
  );
}

export function validateStandalonePrimaryJudgment(
  judgment,
  inventory,
  { expectedPass, expectedInventorySha256 }
) {
  assertStandalone(
    judgment?.schemaVersion === "1.0-standalone-primary-judgment" &&
      judgment.protocolId === STANDALONE_PROTOCOL_ID &&
      judgment.status === "complete-and-schema-valid" &&
      judgment.pass === expectedPass &&
      judgment.debateNumber === inventory.debateNumber &&
      judgment.debateId === inventory.debateId &&
      judgment.reviewerRole === "isolated-score-blind-primary-judge" &&
      judgment.assessmentModel === "5.6 Sol" &&
      judgment.reasoningEffort === "low" &&
      judgment.inventorySha256 === expectedInventorySha256,
    `${expectedPass}: judgment identity mismatch`
  );
  assertStandalone(
    judgment.isolation?.legacyAssessmentsUnavailable === true &&
      judgment.isolation?.calculatedTotalsUnavailable === true &&
      judgment.isolation?.winnerLabelsUnavailable === true &&
      judgment.isolation?.otherJudgmentUnavailable === true &&
      judgment.isolation?.publicationProseUnavailable === true &&
      judgment.isolation?.otherDebatesUnavailable === true &&
      judgment.isolation?.contaminationDetected === false,
    `${expectedPass}: isolation boundary mismatch`
  );
  assertStandalone(
    Array.isArray(judgment.judgments) &&
      judgment.judgments.length === inventory.moves.length,
    `${expectedPass}: judgment count differs from inventory`
  );
  const expectedMoveIds = inventory.moves.map((move) => move.moveId);
  assertStandalone(
    canonicalJson(judgment.judgments.map((item) => item.moveId)) ===
      canonicalJson(expectedMoveIds),
    `${expectedPass}: judgment move order differs from inventory`
  );
  for (const [index, item] of judgment.judgments.entries()) {
    assertStandalone(
      ["high", "medium", "low"].includes(item.assessmentConfidence),
      `${expectedPass}.judgments[${index}]: invalid assessment confidence`
    );
    exactKeys(item.dimensions, DIMENSION_KEYS, `${expectedPass}.${item.moveId}.dimensions`);
    for (const dimension of DIMENSION_KEYS) {
      exactKeys(
        item.dimensions[dimension],
        ["value", "rationale"],
        `${expectedPass}.${item.moveId}.${dimension}`
      );
      assertStandalone(
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
  for (const side of ["pro", "con"]) {
    const adjustment = judgment.burdenCompletionAdjustment?.[side];
    exactKeys(adjustment, ["value", "rationale", "eligibility"], `${expectedPass}.${side}.adjustment`);
    assertStandalone(
      Number.isInteger(adjustment.value) && adjustment.value >= -5 && adjustment.value <= 5,
      `${expectedPass}.${side}.adjustment: value outside -5..5`
    );
    validateEligibility(adjustment.eligibility, `${expectedPass}.${side}.eligibility`, inventory);
    const eligibility = adjustment.eligibility;
    if (eligibility.alreadyCapturedBy.length > 0 || !eligibility.notAlreadyScored) {
      assertStandalone(
        adjustment.value === 0,
        `${expectedPass}.${side}.adjustment: duplicate capture forces zero`
      );
    }
    if (adjustment.value !== 0) {
      assertStandalone(
        eligibility.distinctDebateWideConsequence &&
          eligibility.affectsBurdenCompletion &&
          eligibility.notAlreadyScored &&
          eligibility.affectedBurdenIds.length > 0 &&
          eligibility.relatedMoveIds.length > 0 &&
          eligibility.alreadyCapturedBy.length === 0,
        `${expectedPass}.${side}.adjustment: nonzero value is ineligible`
      );
      for (const key of [
        "completionCriterion",
        "distinctConsequence",
        "counterfactual"
      ]) {
        assertString(
          eligibility[key],
          `${expectedPass}.${side}.eligibility.${key}`,
          30
        );
      }
    }
  }
  assertStandalone(
    judgment.audit?.completeLockedInventoryReviewed === true &&
      judgment.audit?.allMovesJudgedOnce === true &&
      judgment.audit?.ratingsOnlyNoCalculatedScores === true &&
      judgment.audit?.publicationBlind === true &&
      judgment.audit?.scoreBlind === true,
    `${expectedPass}: required audit claims missing`
  );
  return { status: "passed", pass: expectedPass, moves: judgment.judgments.length };
}

function judgmentMap(pass) {
  return new Map(pass.judgments.map((item) => [item.moveId, item]));
}

function dimensionValues(item) {
  return Object.fromEntries(
    DIMENSION_KEYS.map((key) => [key, item.dimensions[key].value])
  );
}

function passMoveScore(item) {
  return scoreDimensions(dimensionValues(item), item.moveId);
}

export function extractStandaloneDisagreements({ inventory, passA, passB }) {
  const a = judgmentMap(passA);
  const b = judgmentMap(passB);
  const disputes = [];
  for (const move of inventory.moves) {
    const left = a.get(move.moveId);
    const right = b.get(move.moveId);
    const leftScore = passMoveScore(left);
    const rightScore = passMoveScore(right);
    const scoreDelta = Math.abs(leftScore - rightScore);
    for (const dimension of DIMENSION_KEYS) {
      const delta = Math.abs(
        left.dimensions[dimension].value - right.dimensions[dimension].value
      );
      if (delta > 8 || (scoreDelta > 4 && delta > 0)) {
        disputes.push({
          disputeId: `${move.moveId}:${dimension}`,
          kind: "move-dimension",
          moveId: move.moveId,
          field: dimension,
          trigger: {
            dimensionDelta: delta,
            moveScoreDelta: scoreDelta,
            dimensionThreshold: 8,
            moveScoreThreshold: 4
          },
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
  for (const side of ["pro", "con"]) {
    const left = passA.burdenCompletionAdjustment[side];
    const right = passB.burdenCompletionAdjustment[side];
    const valueDelta = Math.abs(left.value - right.value);
    const categoricalDifference =
      canonicalJson(left.eligibility) !== canonicalJson(right.eligibility);
    if (valueDelta > 2 || categoricalDifference) {
      disputes.push({
        disputeId: `burdenCompletionAdjustment:${side}`,
        kind: "burden-adjustment",
        side,
        field: "burdenCompletionAdjustment",
        trigger: {
          valueDelta,
          threshold: 2,
          categoricalDifference
        },
        options: {
          "option-a": clone(left),
          "option-b": clone(right)
        }
      });
    }
  }
  return {
    schemaVersion: "1.0-standalone-disagreement-extraction",
    protocolId: STANDALONE_PROTOCOL_ID,
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

function selectionMap(adjudication) {
  return new Map(
    (adjudication.resolutions ?? []).map((resolution) => [
      resolution.disputeId,
      resolution
    ])
  );
}

export function validateStandaloneAdjudication(
  adjudication,
  disagreements
) {
  assertStandalone(
    adjudication?.schemaVersion === "1.0-standalone-dispute-adjudication" &&
      adjudication.protocolId === STANDALONE_PROTOCOL_ID &&
      adjudication.status === "complete-and-schema-valid" &&
      adjudication.debateNumber === disagreements.debateNumber &&
      adjudication.debateId === disagreements.debateId &&
      adjudication.reviewerRole === "isolated-dispute-only-adjudicator" &&
      adjudication.assessmentModel === "5.6 Sol" &&
      adjudication.reasoningEffort === "low",
    "adjudication: identity mismatch"
  );
  assertStandalone(
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
  assertStandalone(
    canonicalJson(actual) === canonicalJson(expected),
    "adjudication: resolution order or population differs from disputes"
  );
  for (const resolution of adjudication.resolutions) {
    assertStandalone(
      ["option-a", "option-b"].includes(resolution.selectedOption),
      `${resolution.disputeId}: selectedOption must be option-a or option-b`
    );
    assertString(resolution.rationale, `${resolution.disputeId}.rationale`, 40);
  }
  return { status: "passed", disputes: expected.length };
}

function resolveAdjustment(left, right, resolution) {
  if (resolution) return clone(resolution.selectedOption === "option-a" ? left : right);
  if (canonicalJson(left.eligibility) === canonicalJson(right.eligibility)) {
    return {
      value: Math.round((left.value + right.value) / 2),
      rationale:
        "Rounded mean of the two isolated primary judgments; no adjudication threshold or categorical disagreement was triggered.",
      eligibility: clone(left.eligibility)
    };
  }
  throw new Error("unresolved burden-adjustment eligibility disagreement");
}

export function assembleStandaloneFinalLedger({
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
  const a = judgmentMap(passA);
  const b = judgmentMap(passB);
  const resolutions = selectionMap(adjudication);
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
            (left.dimensions[dimension].value +
              right.dimensions[dimension].value) /
              2
          ),
          rationale:
            "Rounded mean of the two isolated judgments; no field-level adjudication threshold was triggered.",
          resolution: "rounded-mean"
        };
      }
    }
    const confidenceResolution = resolutions.get(
      `${move.moveId}:assessmentConfidence`
    );
    const assessmentConfidence = confidenceResolution
      ? confidenceResolution.selectedOption === "option-a"
        ? left.assessmentConfidence
        : right.assessmentConfidence
      : left.assessmentConfidence;
    assertStandalone(
      confidenceResolution ||
        left.assessmentConfidence === right.assessmentConfidence,
      `${move.moveId}: unresolved assessment-confidence difference`
    );
    return {
      ...clone(move),
      judgments: {
        passA: clone(left),
        passB: clone(right)
      },
      finalDimensions,
      assessmentConfidence
    };
  });
  const burdenCompletionAdjustment = Object.fromEntries(
    ["pro", "con"].map((side) => {
      const left = passA.burdenCompletionAdjustment[side];
      const right = passB.burdenCompletionAdjustment[side];
      const resolution = resolutions.get(`burdenCompletionAdjustment:${side}`);
      return [side, resolveAdjustment(left, right, resolution)];
    })
  );
  return {
    schemaVersion: "1.0-standalone-resolved-final-ledger",
    protocolId: STANDALONE_PROTOCOL_ID,
    status: "fully-resolved-and-frozen-before-scoring",
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    model: "5.6 Sol",
    rubric: "Slugfester Reassessment Rubric v2",
    sourceManifest:
      "docs/assessment-production/standalone-debates-v1/debate-196/source/source-lock.json",
    evidenceLocks: {
      inventory: { sha256: inventorySha256 },
      passA: { sha256: passASha256 },
      passB: { sha256: passBSha256 },
      disagreements: { sha256: disagreementsSha256 },
      adjudication: { sha256: adjudicationSha256 },
      audio: { sha256: audioSha256 }
    },
    routes: clone(inventory.routes),
    sections: clone(inventory.sections),
    moves,
    burdenCompletionAdjustment,
    audit: {
      inventoryStructureUnchanged: true,
      acceptedJudgmentsPreserved: true,
      disputesResolved: disagreements.disputes.length,
      unresolvedDisputes: 0,
      requiredAudioChecksComplete: audio.status === "complete",
      calculatedMoveScoresAbsent: true,
      calculatedSectionScoresAbsent: true,
      calculatedOverallScoresAbsent: true,
      readyForSingleScorePass: true
    }
  };
}

function scoreLedgerFromDimensions(inventory, dimensionsByMove, adjustmentBySide) {
  const sections = inventory.sections.map((section) => {
    const sides = Object.fromEntries(
      ["pro", "con"].map((side) => {
        const moves = inventory.moves
          .filter(
            (move) => move.sectionId === section.sectionId && move.side === side
          )
          .map((move) => {
            const dimensions = dimensionsByMove(move.moveId);
            return {
              moveId: move.moveId,
              importance: move.importance,
              dimensions,
              score: scoreDimensions(dimensions, move.moveId)
            };
          });
        const importanceTotal = moves.reduce(
          (sum, move) => sum + move.importance,
          0
        );
        const score = Math.round(
          moves.reduce(
            (sum, move) => sum + move.score * move.importance,
            0
          ) / importanceTotal
        );
        return [side, { score, moves }];
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
    ["pro", "con"].map((side) => {
      const weightedSectionMean = sections.reduce(
        (sum, section) =>
          sum + section.sides[side].score * (section.weightPercent / 100),
        0
      );
      const burdenCompletionAdjustment = adjustmentBySide(side);
      return [
        side,
        {
          weightedSectionMean: Number(weightedSectionMean.toFixed(2)),
          burdenCompletionAdjustment,
          score: Math.max(
            0,
            Math.min(100, Math.round(weightedSectionMean + burdenCompletionAdjustment))
          )
        }
      ];
    })
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
    winner,
    winningMargin: Math.abs(overall.pro.score - overall.con.score)
  };
}

export function deriveStandaloneScores(finalLedger) {
  const inventory = {
    sections: finalLedger.sections,
    moves: finalLedger.moves
  };
  const byId = new Map(finalLedger.moves.map((move) => [move.moveId, move]));
  return {
    schemaVersion: "1.0-standalone-score-output",
    protocolId: STANDALONE_SCORE_PROTOCOL_ID,
    status: "single-deterministic-score-pass-complete",
    debateNumber: finalLedger.debateNumber,
    debateId: finalLedger.debateId,
    ...scoreLedgerFromDimensions(
      inventory,
      (moveId) =>
        Object.fromEntries(
          DIMENSION_KEYS.map((dimension) => [
            dimension,
            byId.get(moveId).finalDimensions[dimension].value
          ])
        ),
      (side) => finalLedger.burdenCompletionAdjustment[side].value
    ),
    audit: {
      calculator: "scripts/lib/assessment-production-standalone-debate-v1.mjs",
      dimensionCalculator: "scripts/lib/reassessment-scoring.mjs#scoreDimensions",
      modelAuthoredTotals: 0,
      manualScoreOverrides: 0,
      scorePassOrdinal: 1
    }
  };
}

function derivePassScores(inventory, pass) {
  const byId = judgmentMap(pass);
  return scoreLedgerFromDimensions(
    inventory,
    (moveId) => dimensionValues(byId.get(moveId)),
    (side) => pass.burdenCompletionAdjustment[side].value
  );
}

function winnerDirection(scores) {
  if (scores.overall.pro.score === scores.overall.con.score) return "tie";
  return scores.overall.pro.score > scores.overall.con.score ? "pro" : "con";
}

export function validateStandaloneScoreStability({
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
  for (const side of ["pro", "con"]) {
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
    distances.reduce((sum, value) => sum + value, 0) / distances.length;
  const winnerA = winnerDirection(a);
  const winnerB = winnerDirection(b);
  const winnerFinal = winnerDirection(finalScores);
  const directionPassed =
    winnerA !== winnerB ||
    winnerA === "tie" ||
    [winnerA, "tie"].includes(winnerFinal);
  assertStandalone(
    meanAbsoluteDistance <= 4,
    `score stability: mean distance ${meanAbsoluteDistance} exceeds 4`
  );
  assertStandalone(
    maximumDistance <= 8,
    `score stability: maximum distance ${maximumDistance} exceeds 8`
  );
  assertStandalone(
    maximumExcursion <= 3,
    `score stability: excursion ${maximumExcursion} exceeds 3`
  );
  assertStandalone(directionPassed, "score stability: final winner reverses two-pass direction");
  return {
    status: "passed",
    passA: a,
    passB: b,
    final: clone(finalScores),
    meanAbsoluteDistance: Number(meanAbsoluteDistance.toFixed(2)),
    maximumDistance,
    maximumExcursion,
    directionPassed
  };
}

function publishedMoves(candidate, sectionIndex, side) {
  return (candidate.sections?.[sectionIndex]?.exchanges ?? [])
    .map((exchange) => exchange?.[side])
    .filter(Boolean)
    .map((move) => ({ moveId: move.ledgerMoveId, score: move.score }));
}

export function validateStandaloneCandidate(candidate, scores) {
  assertStandalone(
    candidate?.id === scores.debateId &&
      candidate.number === scores.debateNumber &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2",
    "candidate: identity or attribution mismatch"
  );
  assertStandalone(
    candidate.score?.pro === scores.overall.pro.score &&
      candidate.score?.con === scores.overall.con.score &&
      candidate.overall?.pro?.score === scores.overall.pro.score &&
      candidate.overall?.con?.score === scores.overall.con.score,
    "candidate: overall scores differ from deterministic output"
  );
  assertStandalone(
    candidate.sections?.length === scores.sections.length,
    "candidate: section count differs from score output"
  );
  let moves = 0;
  for (const [sectionIndex, scoreSection] of scores.sections.entries()) {
    const published = candidate.sections[sectionIndex];
    assertStandalone(
      published.sectionId === scoreSection.sectionId &&
        published.title === scoreSection.title &&
        published.score.pro === scoreSection.sides.pro.score &&
        published.score.con === scoreSection.sides.con.score,
      `${scoreSection.sectionId}: identity or score mismatch`
    );
    for (const side of ["pro", "con"]) {
      const expected = scoreSection.sides[side].moves.map((move) => ({
        moveId: move.moveId,
        score: move.score
      }));
      assertStandalone(
        canonicalJson(publishedMoves(candidate, sectionIndex, side)) ===
          canonicalJson(expected),
        `${scoreSection.sectionId}.${side}: move IDs or scores differ`
      );
      moves += expected.length;
    }
  }
  assertStandalone(
    candidate.logicalExtension?.pro && candidate.logicalExtension?.con,
    "candidate: AI Extension missing"
  );
  return { status: "passed", sections: candidate.sections.length, moves };
}

export function validateStandaloneSiteLedgerAdapter({
  adapter,
  candidate,
  repositoryOnly = false,
  root = process.cwd()
}) {
  assertStandalone(
    adapter?.schemaVersion === STANDALONE_SITE_LEDGER_ADAPTER_VERSION &&
      adapter.protocolId === STANDALONE_PROTOCOL_ID &&
      adapter.status === "frozen-standalone-site-ledger-adapter" &&
      adapter.productionCanary === false &&
      adapter.standalonePostCampaign === true &&
      adapter.campaignBatch === null &&
      adapter.model === "5.6 Sol" &&
      adapter.rubric === "Slugfester Reassessment Rubric v2" &&
      adapter.scoreProtocolId === STANDALONE_SCORE_PROTOCOL_ID,
    "standalone adapter: identity mismatch"
  );
  for (const record of Object.values(adapter.evidenceLocks)) {
    if (repositoryOnly && record.path.startsWith(".assessment-cache/")) continue;
    const absolute = `${root}/${record.path}`;
    assertStandalone(existsSync(absolute), `${record.path}: missing`);
    assertStandalone(
      sha256(readFileSync(absolute)) === record.sha256,
      `${record.path}: SHA-256 changed`
    );
  }
  const finalLedger = JSON.parse(
    readFileSync(`${root}/${adapter.evidenceLocks.finalLedger.path}`, "utf8")
  );
  const replayed = deriveStandaloneScores(finalLedger);
  const { scoreStability: _storedScoreStability, ...storedCalculated } =
    adapter.calculated;
  assertStandalone(
    canonicalJson(replayed) === canonicalJson(storedCalculated),
    "standalone adapter: repository score replay changed"
  );
  const candidateAudit = validateStandaloneCandidate(candidate, adapter.calculated);
  assertStandalone(
    adapter.audit?.sections === candidateAudit.sections &&
      adapter.audit.moves === candidateAudit.moves &&
      adapter.audit.repositoryDerivedScores === true &&
      adapter.audit.modelAuthoredTotals === 0 &&
      adapter.audit.manualScoreOverrides === 0 &&
      adapter.audit.scorePasses === 1 &&
      adapter.audit.batch18Selected === false,
    "standalone adapter: audit changed"
  );
  return {
    status: "passed",
    debateNumber: adapter.debateNumber,
    sections: candidateAudit.sections,
    moves: candidateAudit.moves,
    repositoryScoreReplayPassed: true
  };
}
