import { createHash } from "node:crypto";
import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
  V4_BURDEN_RANGES
} from "./v4-lean-production.mjs";
import {
  makeV4220PrimarySchema,
  renderV4220EvidenceWindow,
  validateV4220PrimaryOutput
} from "./v4220-source-span-rendering.mjs";
import { mapV4219Responsiveness } from "./v4219-primary-recovery.mjs";

export const V422116_ROOT = "docs/calibration/v4.2.21.16/decomposed-consensus-contract";
export const V422116_PROTOCOL_ID = "v4.2.21.16-decomposed-consensus-contract";
export const V422116_INVENTORY_OUTPUT_VERSION = "4.2.21.16-score-blind-inventory-proposal";
export const V422116_LOCKED_INVENTORY_VERSION = "4.2.21.16-locked-inventory";
export const V422116_JUDGMENT_PACKET_VERSION = "4.2.21.16-independent-judgment-packet";
export const V422116_JUDGMENT_OUTPUT_VERSION = "4.2.21.16-independent-judgment";
export const V422116_MODEL = Object.freeze({ label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low" });

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const INVENTORY_TOP_KEYS = Object.freeze(["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "routes", "sectionSelections", "audit"]);
const INVENTORY_SECTION_KEYS = Object.freeze(["sectionId", "title", "weightPercent", "rationale", "proSelections", "conSelections"]);
const INVENTORY_SELECTION_KEYS = Object.freeze(["qualifiedCandidateId", "moveId", "moveKind", "proposition"]);
const JUDGMENT_TOP_KEYS = Object.freeze(["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "lockedInventorySha256", "isolation", "moveJudgments", "burdenCompletionAdjustment", "audit"]);
const MOVE_JUDGMENT_KEYS = Object.freeze(["importance", "burdenContactCode", "response", "precisionFindings", "calibrationFindings", "charityAssessment", "ratings", "evidenceBasis", "assessmentConfidence"]);

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function assertString(value, minimum, label) {
  assertV4(typeof value === "string" && value.trim().length >= minimum, `${label}: string shorter than ${minimum}`);
}

function assertUniqueStrings(values, label) {
  assertV4(Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0), `${label}: expected string array`);
  assertV4(new Set(values).size === values.length, `${label}: duplicate values`);
}

function candidateId(candidate) {
  return candidate.qualifiedCandidateId;
}

function candidateMoveKind(candidate) {
  return candidate.discoveryMoveKindAdvisory ?? candidate.moveKind;
}

function candidateProposition(candidate) {
  return candidate.proposedProposition ?? candidate.proposition;
}

function candidateIds(evidenceBundle, side) {
  const ids = evidenceBundle.candidates.filter((candidate) => candidate.side === side).map(candidateId);
  assertV4(ids.length > 0, `candidate evidence bundle has no ${side} candidates`);
  return ids;
}

export function flattenV422116Bridges(routes) {
  return routes.flatMap((route) => route.bridges ?? [route.motionBridge, ...(route.centralBridges ?? []), ...(route.subsidiaryBridges ?? [])]);
}

function inventorySelectionSchema(evidenceBundle, side) {
  return {
    type: "object",
    additionalProperties: false,
    required: INVENTORY_SELECTION_KEYS,
    properties: {
      qualifiedCandidateId: { type: "string", enum: candidateIds(evidenceBundle, side) },
      moveId: { type: "string", minLength: 1 },
      moveKind: { type: "string", enum: ["constructive", "reply"], description: "Global classification by the score-blind curator; discovery classification is advisory." },
      proposition: { type: "string", minLength: 25 }
    }
  };
}

export function makeV422116InventorySchema({ evidenceBundle } = {}) {
  assertV4(evidenceBundle?.debateNumber && evidenceBundle?.debateId, "inventory schema requires a candidate evidence bundle");
  const base = makeV4220PrimarySchema();
  const section = base.properties.sections.items;
  const isolation = clone(base.properties.isolation);
  isolation.properties.otherJudgmentsUnavailable.description = "No independent judgment, adjudication, score, or legacy assessment is available to the curator.";
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v422116-score-blind-inventory",
    title: "Slugfester v4.2.21.16 score-blind partition inventory lock",
    type: "object",
    additionalProperties: false,
    required: INVENTORY_TOP_KEYS,
    properties: {
      schemaVersion: { type: "string", const: V422116_INVENTORY_OUTPUT_VERSION },
      protocolId: { type: "string", const: V422116_PROTOCOL_ID },
      debateNumber: { type: "string", const: evidenceBundle.debateNumber },
      debateId: { type: "string", const: evidenceBundle.debateId },
      reviewerRole: { type: "string", const: "score-blind-inventory-curator" },
      assessmentModel: { type: "string", const: V422116_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      isolation,
      routes: clone(base.properties.routes),
      sectionSelections: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: INVENTORY_SECTION_KEYS,
          properties: {
            sectionId: clone(section.properties.sectionId),
            title: clone(section.properties.title),
            weightPercent: clone(section.properties.weightPercent),
            rationale: clone(section.properties.rationale),
            proSelections: { type: "array", minItems: 1, maxItems: 2, items: inventorySelectionSchema(evidenceBundle, "pro") },
            conSelections: { type: "array", minItems: 1, maxItems: 2, items: inventorySelectionSchema(evidenceBundle, "con") }
          }
        }
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["completeCandidateEvidenceBundleReviewed", "everySelectedCandidateUsedOnce", "ratingsUnavailable", "responseTopologyUnavailable", "otherJudgmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable"],
        properties: Object.fromEntries(["completeCandidateEvidenceBundleReviewed", "everySelectedCandidateUsedOnce", "ratingsUnavailable", "responseTopologyUnavailable", "otherJudgmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable"].map((key) => [key, { type: "boolean", const: true }]))
      }
    }
  };
}

function validateInventoryRoutes(routes) {
  assertV4(Array.isArray(routes) && routes.length === 2, "inventory requires exactly two routes");
  assertV4(routes.map((route) => route.side).sort().join("|") === "con|pro", "inventory requires one route per side");
  const bridgeIds = flattenV422116Bridges(routes).map((bridge) => bridge.bridgeId);
  assertUniqueStrings(bridgeIds, "inventory bridge IDs");
  for (const route of routes) {
    assertString(route.routeId, 1, "inventory route ID");
    assertString(route.description, 40, `${route.routeId}.description`);
    assertString(route.successCriteria, 40, `${route.routeId}.successCriteria`);
    const bridges = route.bridges ?? [route.motionBridge, ...(route.centralBridges ?? []), ...(route.subsidiaryBridges ?? [])];
    assertV4(bridges.filter((bridge) => bridge.tier === "motion").length === 1 && bridges.some((bridge) => bridge.tier === "central") && bridges.some((bridge) => bridge.tier === "subsidiary"), `${route.routeId}: incomplete burden tiers`);
  }
}

export function validateV422116InventoryProposal(proposal, evidenceBundle) {
  exactKeys(proposal, INVENTORY_TOP_KEYS, "inventory proposal");
  assertV4(proposal.schemaVersion === V422116_INVENTORY_OUTPUT_VERSION && proposal.protocolId === V422116_PROTOCOL_ID, "inventory proposal identity mismatch");
  assertV4(proposal.debateNumber === evidenceBundle.debateNumber && proposal.debateId === evidenceBundle.debateId, "inventory debate identity mismatch");
  assertV4(proposal.reviewerRole === "score-blind-inventory-curator" && proposal.assessmentModel === V422116_MODEL.label && proposal.calibrationOnly === true, "inventory reviewer boundary mismatch");
  assertV4(!containsProhibitedCalculatedField(proposal), "inventory proposal contains a prohibited calculated field");
  assertV4(evidenceBundle.completeSourceDiscovery?.everyEventOwnedExactlyOnce === true && evidenceBundle.completeSourceDiscovery?.everyCoreReportedComplete === true && evidenceBundle.completeSourceDiscovery?.everyCandidateRetained === true && evidenceBundle.completeSourceDiscovery?.semanticCandidateDownselectionPerformed === false, "candidate evidence bundle does not prove complete, unreduced discovery");
  exactKeys(proposal.isolation, ["legacyAssessmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable", "otherJudgmentsUnavailable", "assessmentProseUnavailable", "contaminationDetected"], "inventory isolation");
  assertV4(Object.entries(proposal.isolation).every(([key, value]) => value === (key === "contaminationDetected" ? false : true)), "inventory isolation boundary failed");
  exactKeys(proposal.audit, ["completeCandidateEvidenceBundleReviewed", "everySelectedCandidateUsedOnce", "ratingsUnavailable", "responseTopologyUnavailable", "otherJudgmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable"], "inventory audit");
  assertV4(Object.values(proposal.audit).every((value) => value === true), "inventory audit assertions must be true");
  validateInventoryRoutes(proposal.routes);
  assertV4(Array.isArray(proposal.sectionSelections) && proposal.sectionSelections.length >= 4 && proposal.sectionSelections.length <= 6, "inventory section count must be 4..6");
  const candidateMap = new Map(evidenceBundle.candidates.map((candidate) => [candidateId(candidate), candidate]));
  assertV4(candidateMap.size === evidenceBundle.candidates.length, "candidate evidence IDs are not unique");
  const sectionIds = new Set();
  const selected = [];
  let weightTotal = 0;
  for (const [sectionIndex, section] of proposal.sectionSelections.entries()) {
    exactKeys(section, INVENTORY_SECTION_KEYS, `sectionSelections[${sectionIndex}]`);
    assertString(section.sectionId, 1, `sectionSelections[${sectionIndex}].sectionId`);
    assertV4(!sectionIds.has(section.sectionId), `${section.sectionId}: duplicate section ID`);
    sectionIds.add(section.sectionId);
    assertString(section.title, 3, `${section.sectionId}.title`);
    assertString(section.rationale, 40, `${section.sectionId}.rationale`);
    assertV4(Number.isInteger(section.weightPercent) && section.weightPercent >= 1 && section.weightPercent <= 97, `${section.sectionId}: invalid section weight`);
    weightTotal += section.weightPercent;
    for (const [side, key] of [["pro", "proSelections"], ["con", "conSelections"]]) {
      assertV4(Array.isArray(section[key]) && section[key].length >= 1 && section[key].length <= 2, `${section.sectionId}.${key}: must contain one or two selections`);
      for (const selection of section[key]) {
        exactKeys(selection, INVENTORY_SELECTION_KEYS, `${section.sectionId}.${key}`);
        const candidate = candidateMap.get(selection.qualifiedCandidateId);
        assertV4(candidate && candidate.side === side, `${selection.qualifiedCandidateId}: unknown candidate or wrong side`);
        assertString(selection.moveId, 1, `${selection.qualifiedCandidateId}.moveId`);
        assertV4(["constructive", "reply"].includes(selection.moveKind), `${selection.moveId}: invalid global move kind`);
        assertString(selection.proposition, 25, `${selection.moveId}.proposition`);
        selected.push({ sectionId: section.sectionId, selection, candidate });
      }
    }
  }
  assertV4(weightTotal === 100, "inventory section weights must total 100");
  assertV4(selected.length >= 8 && selected.length <= 24, "inventory selected move count must be 8..24");
  assertUniqueStrings(selected.map(({ selection }) => selection.qualifiedCandidateId), "selected candidate IDs");
  assertUniqueStrings(selected.map(({ selection }) => selection.moveId), "selected move IDs");
  const ordered = [...selected].sort((left, right) => left.candidate.sourceSpan.startEvent - right.candidate.sourceSpan.startEvent || left.candidate.sourceSpan.endEvent - right.candidate.sourceSpan.endEvent || left.selection.moveId.localeCompare(right.selection.moveId));
  for (const [index, item] of ordered.entries()) if (item.selection.moveKind === "reply") {
    assertV4(ordered.slice(0, index).some((prior) => prior.candidate.side !== item.candidate.side), `${item.selection.moveId}: reply has no earlier selected opposing move`);
  }
  return { status: "passed", debateNumber: proposal.debateNumber, sections: proposal.sectionSelections.length, moves: selected.length, selected, ordered };
}

export function compileV422116LockedInventory(proposal, evidenceBundle, eventsDocument) {
  const validated = validateV422116InventoryProposal(proposal, evidenceBundle);
  const sections = proposal.sectionSelections.map(({ proSelections, conSelections, ...section }) => clone(section));
  const moves = validated.ordered.map(({ sectionId, selection, candidate }) => {
    const evidence = renderV4220EvidenceWindow({ moveId: selection.moveId, proposition: selection.proposition, sourceSpan: candidate.sourceSpan, evidenceBasis: candidate.loadBearingReason, response: { rationale: candidate.contextSummary } }, eventsDocument);
    return {
      moveId: selection.moveId,
      qualifiedCandidateId: selection.qualifiedCandidateId,
      sectionId,
      side: candidate.side,
      speaker: candidate.speaker,
      moveKind: selection.moveKind,
      proposition: selection.proposition,
      sourceSpan: clone(candidate.sourceSpan),
      attributionConfidence: candidate.attributionConfidence,
      attributionBasis: candidate.attributionBasis,
      candidateConfidence: candidate.candidateConfidence,
      discoveryMoveKindAdvisory: candidateMoveKind(candidate),
      finalSelectedEvidence: evidence
    };
  });
  const lockedInventory = {
    schemaVersion: V422116_LOCKED_INVENTORY_VERSION,
    protocolId: V422116_PROTOCOL_ID,
    debateNumber: proposal.debateNumber,
    debateId: proposal.debateId,
    curatorModel: proposal.assessmentModel,
    calibrationOnly: true,
    routes: clone(proposal.routes),
    sections,
    moves,
    lockPolicy: {
      scoreBlind: true,
      ratingsAbsent: true,
      responseTopologyAbsent: true,
      calculatedTotalsAbsent: true,
      winnerLabelsAbsent: true,
      finalEvidenceRepositoryRendered: true,
      chronologyRepositoryOwned: true
    }
  };
  return {
    lockedInventory,
    validation: { status: "passed", sections: sections.length, moves: moves.length, finalEvidenceSourceExact: moves.every((move) => move.finalSelectedEvidence.sourceExact), ratingsAbsent: true, responseTopologyAbsent: true },
    provenance: moves.map((move) => ({ moveId: move.moveId, qualifiedCandidateId: move.qualifiedCandidateId, repositoryOwnedFields: ["sectionId", "side", "speaker", "sourceSpan", "attributionConfidence", "attributionBasis", "finalSelectedEvidence"], curatorAuthoredFields: ["moveId", "moveKind", "proposition"], discoveryMoveKindAdvisory: move.discoveryMoveKindAdvisory, globalMoveKind: move.moveKind }))
  };
}

export function buildV422116BurdenContactOptions(lockedInventory) {
  const options = [{ code: "bc-000", burdenContact: null, label: "No express contact with an eligible burden bridge" }];
  let index = 1;
  for (const bridge of flattenV422116Bridges(lockedInventory.routes)) for (const polarity of ["support", "attack"]) {
    options.push({ code: `bc-${String(index).padStart(3, "0")}`, burdenContact: { polarity, tier: bridge.tier, bridgeId: bridge.bridgeId }, label: `${polarity} ${bridge.tier} bridge ${bridge.bridgeId}: ${bridge.description}` });
    index += 1;
  }
  return options;
}

export function buildV422116JudgmentPacket(lockedInventory, reviewerPass) {
  assertV4(["A", "B"].includes(reviewerPass), "reviewerPass must be A or B");
  const lockedInventorySha256 = sha256(canonicalJson(lockedInventory));
  return {
    schemaVersion: V422116_JUDGMENT_PACKET_VERSION,
    protocolId: V422116_PROTOCOL_ID,
    debateNumber: lockedInventory.debateNumber,
    debateId: lockedInventory.debateId,
    reviewerPass,
    reviewerRole: `independent-judge-${reviewerPass.toLowerCase()}`,
    assessmentModel: V422116_MODEL.label,
    lockedInventorySha256,
    lockedInventory: clone(lockedInventory),
    burdenContactOptions: buildV422116BurdenContactOptions(lockedInventory),
    judgmentBoundary: {
      sameLockedInventoryForBothPasses: true,
      candidateSelectionUnavailable: true,
      otherIndependentJudgmentUnavailable: true,
      priorAssessmentsAndScoresUnavailable: true,
      responseTargetsLimitedToEarlierOpposingLockedMoves: true,
      modelAuthoredAbsoluteResponsivenessProhibited: true,
      modelAuthoredAbsoluteRelevanceBurdenProhibited: true,
      repositoryDerivedResponseClass: true,
      repositoryMappedBurdenTierRange: true,
      scoresDerivedAfterAdjudicationOnly: true
    }
  };
}

function withinRatingSchema(description) {
  return { type: "object", additionalProperties: false, required: ["value", "rationale"], properties: { value: { type: "integer", minimum: 0, maximum: 100, description }, rationale: { type: "string", minLength: 40 } } };
}

function responseComponentSchema(targetDefinition, includeContacted = true) {
  const required = ["targetMoveId", "text"];
  const properties = {
    targetMoveId: clone(targetDefinition),
    text: { type: "string", minLength: 15 }
  };
  if (includeContacted) {
    required.push("contacted");
    properties.contacted = { type: "boolean" };
  }
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties
  };
}

function replyResponseSchema(targetDefinition) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["responseMode", "primaryComponent", "additionalComponents", "issueBearingContraryMaterial", "rationale", "responsivenessWithinClass"],
    properties: {
      responseMode: { type: "string", enum: ["ordinary-primary-contacted", "ordinary-primary-uncontacted", "diagnostic-defeat", "justified-reframe"], description: "The repository derives primary-component contact and the mutually exclusive special-response flags from this single mode." },
      primaryComponent: responseComponentSchema(targetDefinition, false),
      additionalComponents: { type: "array", minItems: 0, maxItems: 7, items: responseComponentSchema(targetDefinition) },
      issueBearingContraryMaterial: { type: "boolean" },
      rationale: { type: "string", minLength: 60 },
      responsivenessWithinClass: { $ref: "#/$defs/withinRating" }
    }
  };
}

function moveJudgmentSchema(move, targetDefinition) {
  const response = move.moveKind === "constructive"
    ? {
        type: "object",
        additionalProperties: false,
        required: ["rationale", "responsivenessWithinClass"],
        properties: {
          rationale: { type: "string", minLength: 60 },
          responsivenessWithinClass: { $ref: "#/$defs/withinRating" }
        }
      }
    : replyResponseSchema(targetDefinition);
  return {
    type: "object",
    additionalProperties: false,
    required: MOVE_JUDGMENT_KEYS,
    properties: {
      importance: { type: "integer", minimum: 1, maximum: 3 },
      burdenContactCode: { $ref: "#/$defs/burdenContactCode" },
      response,
      precisionFindings: { $ref: "#/$defs/precisionFindings" },
      calibrationFindings: { $ref: "#/$defs/calibrationFindings" },
      charityAssessment: { $ref: "#/$defs/charityAssessment" },
      ratings: {
        type: "object",
        additionalProperties: false,
        required: ["logicalCoherence", "evidenceWarrant", "relevanceWithinTier"],
        properties: {
          logicalCoherence: { $ref: "#/$defs/directRating" },
          evidenceWarrant: { $ref: "#/$defs/directRating" },
          relevanceWithinTier: { $ref: "#/$defs/withinRating" }
        }
      },
      evidenceBasis: { type: "string", minLength: 40 },
      assessmentConfidence: { type: "string", enum: ["high", "medium", "low"] }
    }
  };
}

function burdenAdjustmentSchema(moveIds, bridgeIds) {
  const eligibility = {
    type: "object",
    additionalProperties: false,
    required: ["distinctDebateWideConsequence", "affectsBurdenCompletion", "notAlreadyScored", "affectedBurdenIds", "completionCriterion", "relatedMoveIds", "distinctConsequence", "alreadyCapturedBy", "counterfactual"],
    properties: {
      distinctDebateWideConsequence: { type: "boolean" },
      affectsBurdenCompletion: { type: "boolean" },
      notAlreadyScored: { type: "boolean" },
      affectedBurdenIds: { type: "array", items: { type: "string", enum: bridgeIds } },
      completionCriterion: { type: "string", minLength: 1 },
      relatedMoveIds: { type: "array", items: { type: "string", enum: moveIds } },
      distinctConsequence: { type: "string", minLength: 1 },
      alreadyCapturedBy: { type: "array", items: { type: "string", minLength: 1 } },
      counterfactual: { type: "string", minLength: 1 }
    }
  };
  const side = { type: "object", additionalProperties: false, required: ["eligibleValueCandidate", "rationale", "eligibility"], properties: { eligibleValueCandidate: { type: "integer", minimum: -5, maximum: 5, description: "Applied only if every strict residual-eligibility condition is satisfied; otherwise the repository deterministically applies zero." }, rationale: { type: "string", minLength: 40 }, eligibility } };
  return { type: "object", additionalProperties: false, required: ["pro", "con"], properties: { pro: clone(side), con: clone(side) } };
}

export function makeV422116JudgmentSchema({ packet } = {}) {
  assertV4(packet?.schemaVersion === V422116_JUDGMENT_PACKET_VERSION && ["A", "B"].includes(packet.reviewerPass), "judgment schema requires a valid judgment packet");
  const rawMoveSchema = makeV4220PrimarySchema().properties.moves.items;
  const moveProperties = {};
  const targetDefinitions = {};
  for (const [index, move] of packet.lockedInventory.moves.entries()) {
    const earlierOpposing = packet.lockedInventory.moves.slice(0, index).filter((candidate) => candidate.side !== move.side).map((candidate) => candidate.moveId);
    if (move.moveKind === "reply") assertV4(earlierOpposing.length > 0, `${move.moveId}: reply schema has no legal earlier opposing target`);
    const targetDefinitionName = `targetSet${String(index).padStart(2, "0")}`;
    if (move.moveKind === "reply") targetDefinitions[targetDefinitionName] = { type: "string", enum: earlierOpposing, description: "Only earlier opposing locked moves; later and same-side targets are structurally unavailable." };
    moveProperties[move.moveId] = moveJudgmentSchema(move, move.moveKind === "reply" ? { $ref: `#/$defs/${targetDefinitionName}` } : null);
  }
  const moveIds = packet.lockedInventory.moves.map((move) => move.moveId);
  const bridgeIds = flattenV422116Bridges(packet.lockedInventory.routes).map((bridge) => bridge.bridgeId);
  const charityAssessment = {
    anyOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["mode", "alternative", "decisiveQualification", "testedRatingValue", "ratingRationale"],
        properties: {
          mode: { type: "string", const: "not-tested" },
          alternative: { type: "string", const: "" },
          decisiveQualification: { type: "string", const: "" },
          testedRatingValue: { type: "integer", const: 75 },
          ratingRationale: { type: "string", minLength: 40 }
        }
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["mode", "alternative", "decisiveQualification", "testedRatingValue", "ratingRationale"],
        properties: {
          mode: { type: "string", const: "tested" },
          alternative: { type: "string", minLength: 10 },
          decisiveQualification: { type: "string", minLength: 10 },
          testedRatingValue: { type: "integer", minimum: 0, maximum: 100 },
          ratingRationale: { type: "string", minLength: 40 }
        }
      }
    ]
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v422116-independent-judgment-${packet.reviewerPass.toLowerCase()}`,
    title: `Slugfester v4.2.21.16 isolated independent judgment ${packet.reviewerPass}`,
    type: "object",
    additionalProperties: false,
    required: JUDGMENT_TOP_KEYS,
    $defs: {
      burdenContactCode: { type: "string", enum: packet.burdenContactOptions.map((option) => option.code) },
      directRating: clone(rawMoveSchema.properties.ratings.properties.logicalCoherence),
      withinRating: withinRatingSchema("A 0–100 quality position within the response class or burden tier selected elsewhere in the same move judgment; the repository maps the legal absolute range."),
      precisionFindings: clone(rawMoveSchema.properties.precisionFindings),
      calibrationFindings: clone(rawMoveSchema.properties.calibrationFindings),
      charityAssessment,
      ...targetDefinitions
    },
    properties: {
      schemaVersion: { type: "string", const: V422116_JUDGMENT_OUTPUT_VERSION },
      protocolId: { type: "string", const: V422116_PROTOCOL_ID },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      reviewerRole: { type: "string", const: packet.reviewerRole },
      assessmentModel: { type: "string", const: V422116_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      lockedInventorySha256: { type: "string", const: packet.lockedInventorySha256 },
      isolation: {
        type: "object",
        additionalProperties: false,
        required: ["legacyAssessmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable", "otherIndependentJudgmentUnavailable", "assessmentProseUnavailable", "contaminationDetected"],
        properties: {
          legacyAssessmentsUnavailable: { type: "boolean", const: true },
          calculatedTotalsUnavailable: { type: "boolean", const: true },
          winnerLabelsUnavailable: { type: "boolean", const: true },
          otherIndependentJudgmentUnavailable: { type: "boolean", const: true },
          assessmentProseUnavailable: { type: "boolean", const: true },
          contaminationDetected: { type: "boolean", const: false }
        }
      },
      moveJudgments: { type: "object", additionalProperties: false, required: moveIds, properties: moveProperties },
      burdenCompletionAdjustment: burdenAdjustmentSchema(moveIds, bridgeIds),
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["sameLockedInventoryReviewed", "everyLockedMoveJudgedOnce", "candidateSelectionUnavailable", "earlierOpposingTargetEnumsApplied", "responseComponentsApplied", "withinClassResponsivenessApplied", "withinTierBurdenRelevanceApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "strictBurdenExclusionRuleApplied", "scoresNotDerived"],
        properties: Object.fromEntries(["sameLockedInventoryReviewed", "everyLockedMoveJudgedOnce", "candidateSelectionUnavailable", "earlierOpposingTargetEnumsApplied", "responseComponentsApplied", "withinClassResponsivenessApplied", "withinTierBurdenRelevanceApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "strictBurdenExclusionRuleApplied", "scoresNotDerived"].map((key) => [key, { type: "boolean", const: true }]))
      }
    }
  };
}

function mapWithinRange(range, withinValue) {
  assertV4(Number.isInteger(withinValue) && withinValue >= 0 && withinValue <= 100, "within-range value must be an integer from 0 through 100");
  return range[0] + Math.round((range[1] - range[0]) * withinValue / 100);
}

export function mapV422116BurdenRelevance(burdenContact, withinValue) {
  return mapWithinRange(V4_BURDEN_RANGES[burdenContact?.tier ?? "none"], withinValue);
}

function compileResponse(move, judgment) {
  if (move.moveKind === "constructive") return {
    decisiveTargetIds: [],
    components: [],
    issueBearingContraryMaterial: false,
    diagnosticConsequenceExplicit: false,
    replacementDemandAnswered: false,
    rationale: judgment.response.rationale,
    responsivenessWithinClass: clone(judgment.response.responsivenessWithinClass)
  };
  const mode = judgment.response.responseMode;
  const primaryContacted = mode !== "ordinary-primary-uncontacted";
  const authoredComponents = [{ ...judgment.response.primaryComponent, contacted: primaryContacted }, ...judgment.response.additionalComponents];
  const components = authoredComponents.map((component, index) => ({ componentId: `${move.moveId}-component-${String(index + 1).padStart(2, "0")}`, targetMoveId: component.targetMoveId, text: component.text, contacted: component.contacted, decisive: true }));
  return {
    decisiveTargetIds: [...new Set(components.map((component) => component.targetMoveId))],
    components,
    issueBearingContraryMaterial: judgment.response.issueBearingContraryMaterial,
    diagnosticConsequenceExplicit: mode === "diagnostic-defeat",
    replacementDemandAnswered: mode === "justified-reframe",
    rationale: judgment.response.rationale,
    responsivenessWithinClass: clone(judgment.response.responsivenessWithinClass)
  };
}

function strictAdjustmentEligible(adjustment) {
  const eligibility = adjustment.eligibility;
  return eligibility.distinctDebateWideConsequence === true
    && eligibility.affectsBurdenCompletion === true
    && eligibility.notAlreadyScored === true
    && eligibility.affectedBurdenIds.length > 0
    && eligibility.relatedMoveIds.length > 0
    && eligibility.alreadyCapturedBy.length === 0
    && [eligibility.completionCriterion, eligibility.distinctConsequence, eligibility.counterfactual].every((text) => typeof text === "string" && text.trim().length >= 30);
}

function compileAdjustment(adjustment) {
  return { value: strictAdjustmentEligible(adjustment) ? adjustment.eligibleValueCandidate : 0, rationale: adjustment.rationale, eligibility: clone(adjustment.eligibility) };
}

export function validateV422116JudgmentOutput(output, packet) {
  exactKeys(output, JUDGMENT_TOP_KEYS, "independent judgment output");
  assertV4(output.schemaVersion === V422116_JUDGMENT_OUTPUT_VERSION && output.protocolId === V422116_PROTOCOL_ID, "independent judgment identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.lockedInventorySha256 === packet.lockedInventorySha256, "independent judgment locked-inventory identity mismatch");
  assertV4(output.reviewerRole === packet.reviewerRole && output.assessmentModel === V422116_MODEL.label && output.calibrationOnly === true, "independent judgment reviewer boundary mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "independent judgment contains a prohibited calculated field");
  exactKeys(output.isolation, ["legacyAssessmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable", "otherIndependentJudgmentUnavailable", "assessmentProseUnavailable", "contaminationDetected"], "judgment isolation");
  assertV4(Object.entries(output.isolation).every(([key, value]) => value === (key === "contaminationDetected" ? false : true)), "judgment isolation boundary failed");
  const moveIds = packet.lockedInventory.moves.map((move) => move.moveId);
  exactKeys(output.moveJudgments, moveIds, "moveJudgments");
  const contactOptions = new Map(packet.burdenContactOptions.map((option) => [option.code, option]));
  for (const [index, move] of packet.lockedInventory.moves.entries()) {
    const judgment = output.moveJudgments[move.moveId];
    exactKeys(judgment, MOVE_JUDGMENT_KEYS, `moveJudgments.${move.moveId}`);
    assertV4(Number.isInteger(judgment.importance) && judgment.importance >= 1 && judgment.importance <= 3, `${move.moveId}: invalid importance`);
    assertV4(contactOptions.has(judgment.burdenContactCode), `${move.moveId}: unknown burden contact code`);
    const earlierOpposing = new Set(packet.lockedInventory.moves.slice(0, index).filter((candidate) => candidate.side !== move.side).map((candidate) => candidate.moveId));
    if (move.moveKind === "constructive") exactKeys(judgment.response, ["rationale", "responsivenessWithinClass"], `${move.moveId}.response`);
    else {
      exactKeys(judgment.response, ["responseMode", "primaryComponent", "additionalComponents", "issueBearingContraryMaterial", "rationale", "responsivenessWithinClass"], `${move.moveId}.response`);
      assertV4(["ordinary-primary-contacted", "ordinary-primary-uncontacted", "diagnostic-defeat", "justified-reframe"].includes(judgment.response.responseMode), `${move.moveId}: invalid response mode`);
      exactKeys(judgment.response.primaryComponent, ["targetMoveId", "text"], `${move.moveId}.response.primaryComponent`);
      assertV4(Array.isArray(judgment.response.additionalComponents) && judgment.response.additionalComponents.length <= 7, `${move.moveId}: additional reply components must be 0..7`);
      const components = [{ ...judgment.response.primaryComponent, contacted: judgment.response.responseMode !== "ordinary-primary-uncontacted" }, ...judgment.response.additionalComponents];
      for (const component of components) {
        exactKeys(component, ["targetMoveId", "text", "contacted"], `${move.moveId}.response.component`);
        assertV4(earlierOpposing.has(component.targetMoveId), `${move.moveId}: target is not an earlier opposing locked move`);
        assertString(component.text, 15, `${move.moveId}.response.component.text`);
        assertV4(typeof component.contacted === "boolean", `${move.moveId}: component contact must be boolean`);
      }
    }
    assertString(judgment.response.rationale, 60, `${move.moveId}.response.rationale`);
    assertV4(Number.isInteger(judgment.response.responsivenessWithinClass?.value) && judgment.response.responsivenessWithinClass.value >= 0 && judgment.response.responsivenessWithinClass.value <= 100, `${move.moveId}: invalid within-class responsiveness`);
    assertString(judgment.response.responsivenessWithinClass?.rationale, 40, `${move.moveId}.response.responsivenessWithinClass.rationale`);
    exactKeys(judgment.ratings, ["logicalCoherence", "evidenceWarrant", "relevanceWithinTier"], `${move.moveId}.ratings`);
    for (const key of ["logicalCoherence", "evidenceWarrant", "relevanceWithinTier"]) {
      assertV4(Number.isInteger(judgment.ratings[key]?.value) && judgment.ratings[key].value >= 0 && judgment.ratings[key].value <= 100, `${move.moveId}.${key}: invalid value`);
      assertString(judgment.ratings[key]?.rationale, 40, `${move.moveId}.${key}.rationale`);
    }
    exactKeys(judgment.charityAssessment, ["mode", "alternative", "decisiveQualification", "testedRatingValue", "ratingRationale"], `${move.moveId}.charityAssessment`);
    assertV4(["tested", "not-tested"].includes(judgment.charityAssessment.mode), `${move.moveId}: invalid charity mode`);
    if (judgment.charityAssessment.mode === "not-tested") assertV4(judgment.charityAssessment.alternative === "" && judgment.charityAssessment.decisiveQualification === "" && judgment.charityAssessment.testedRatingValue === 75, `${move.moveId}: untested charity anchor invalid`);
    else {
      assertString(judgment.charityAssessment.alternative, 10, `${move.moveId}.charityAssessment.alternative`);
      assertString(judgment.charityAssessment.decisiveQualification, 10, `${move.moveId}.charityAssessment.decisiveQualification`);
      assertV4(Number.isInteger(judgment.charityAssessment.testedRatingValue) && judgment.charityAssessment.testedRatingValue >= 0 && judgment.charityAssessment.testedRatingValue <= 100, `${move.moveId}: invalid tested charity rating`);
    }
    assertString(judgment.charityAssessment.ratingRationale, 40, `${move.moveId}.charityAssessment.ratingRationale`);
    assertString(judgment.evidenceBasis, 40, `${move.moveId}.evidenceBasis`);
    assertV4(["high", "medium", "low"].includes(judgment.assessmentConfidence), `${move.moveId}: invalid assessment confidence`);
  }
  exactKeys(output.burdenCompletionAdjustment, ["pro", "con"], "burdenCompletionAdjustment");
  for (const side of ["pro", "con"]) {
    const adjustment = output.burdenCompletionAdjustment[side];
    exactKeys(adjustment, ["eligibleValueCandidate", "rationale", "eligibility"], `burdenCompletionAdjustment.${side}`);
    assertV4(Number.isInteger(adjustment.eligibleValueCandidate) && adjustment.eligibleValueCandidate >= -5 && adjustment.eligibleValueCandidate <= 5, `${side}: invalid eligible adjustment candidate`);
    assertString(adjustment.rationale, 40, `${side}.adjustment.rationale`);
  }
  exactKeys(output.audit, ["sameLockedInventoryReviewed", "everyLockedMoveJudgedOnce", "candidateSelectionUnavailable", "earlierOpposingTargetEnumsApplied", "responseComponentsApplied", "withinClassResponsivenessApplied", "withinTierBurdenRelevanceApplied", "closedPrecisionAnchorsApplied", "closedCalibrationAnchorsApplied", "charityAnchorApplied", "strictBurdenExclusionRuleApplied", "scoresNotDerived"], "judgment audit");
  assertV4(Object.values(output.audit).every((value) => value === true), "judgment audit assertions must be true");
  return { status: "passed", debateNumber: output.debateNumber, reviewerPass: packet.reviewerPass, moves: moveIds.length };
}

export function compileAndValidateV422116Judgment(output, packet, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes }) {
  validateV422116JudgmentOutput(output, packet);
  const contactOptions = new Map(packet.burdenContactOptions.map((option) => [option.code, option.burdenContact]));
  const moves = packet.lockedInventory.moves.map((move) => {
    const judgment = output.moveJudgments[move.moveId];
    const burdenContact = clone(contactOptions.get(judgment.burdenContactCode));
    const charityTested = judgment.charityAssessment.mode === "tested";
    return {
      moveId: move.moveId,
      sectionId: move.sectionId,
      side: move.side,
      speaker: move.speaker,
      moveKind: move.moveKind,
      proposition: move.proposition,
      sourceSpan: clone(move.sourceSpan),
      attributionConfidence: move.attributionConfidence,
      attributionBasis: move.attributionBasis,
      importance: judgment.importance,
      burdenContact,
      response: compileResponse(move, judgment),
      precisionFindings: clone(judgment.precisionFindings),
      calibrationFindings: clone(judgment.calibrationFindings),
      charity: { tested: charityTested, alternative: charityTested ? judgment.charityAssessment.alternative : "", decisiveQualification: charityTested ? judgment.charityAssessment.decisiveQualification : "" },
      ratings: {
        logicalCoherence: clone(judgment.ratings.logicalCoherence),
        evidenceWarrant: clone(judgment.ratings.evidenceWarrant),
        relevanceBurden: { value: mapV422116BurdenRelevance(burdenContact, judgment.ratings.relevanceWithinTier.value), rationale: judgment.ratings.relevanceWithinTier.rationale },
        representationalCharity: { value: charityTested ? judgment.charityAssessment.testedRatingValue : 75, rationale: judgment.charityAssessment.ratingRationale }
      },
      evidenceBasis: judgment.evidenceBasis,
      assessmentConfidence: judgment.assessmentConfidence
    };
  });
  const rawOutput = {
    schemaVersion: "4.2.20-source-span-primary-judgment",
    protocolId: "v4.2.20-source-span-evidence-rendering",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "integrated-primary-judge",
    assessmentModel: output.assessmentModel,
    calibrationOnly: true,
    isolation: { legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerLabelsUnavailable: true, otherJudgmentsUnavailable: true, assessmentProseUnavailable: true, contaminationDetected: false },
    routes: clone(packet.lockedInventory.routes),
    sections: clone(packet.lockedInventory.sections),
    moves,
    burdenCompletionAdjustment: { pro: compileAdjustment(output.burdenCompletionAdjustment.pro), con: compileAdjustment(output.burdenCompletionAdjustment.con) },
    audit: { completeTranscriptReviewed: true, allLoadBearingLinesRepresented: true, allMovesJudgedOnce: true, sectionWeightsLockedBeforeRatings: true, responseComponentsApplied: true, closedPrecisionAnchorsApplied: true, closedCalibrationAnchorsApplied: true, charityAnchorApplied: true, burdenExclusionRuleApplied: true, calculatedTotalsAbsent: true }
  };
  const validation = validateV4220PrimaryOutput(rawOutput, sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes);
  const compiledResponseClasses = rawOutput.moves.map((move) => {
    const response = move.response;
    const contacted = response.components.filter((component) => component.contacted).length;
    const responseClass = move.moveKind === "constructive" ? "constructive-opening" : response.diagnosticConsequenceExplicit ? "diagnostic-defeat" : response.replacementDemandAnswered ? "justified-reframe" : contacted > 0 && contacted === response.components.length ? "full-answer" : contacted > 0 ? "partial-answer" : response.issueBearingContraryMaterial ? "relevant-nonanswer" : "nonanswer";
    return { moveId: move.moveId, responseClass, responsiveness: mapV4219Responsiveness(responseClass, output.moveJudgments[move.moveId].response.responsivenessWithinClass.value), burdenTier: move.burdenContact?.tier ?? "none", relevanceBurden: move.ratings.relevanceBurden.value };
  });
  return {
    rawOutput,
    validation: {
      ...validation,
      decomposedConsensus: {
        status: "passed",
        reviewerPass: packet.reviewerPass,
        sameLockedInventory: true,
        candidateSelectionUnavailable: true,
        allTargetEnumsEarlierAndOpposing: true,
        modelAuthoredAbsoluteResponsiveness: false,
        modelAuthoredAbsoluteRelevanceBurden: false,
        strictBurdenExclusionRepositoryApplied: true,
        scoresDerived: 0,
        compiledResponseClasses
      }
    },
    provenance: {
      lockedInventorySha256: packet.lockedInventorySha256,
      inventoryOwnedFields: ["routes", "sections", "moveId", "sectionId", "side", "speaker", "moveKind", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis"],
      judgmentOwnedFields: ["importance", "burdenContactCode", "response", "precisionFindings", "calibrationFindings", "charityAssessment", "ratings", "evidenceBasis", "assessmentConfidence", "burdenCompletionAdjustment"],
      repositoryDerivedFields: ["response.decisiveTargetIds", "response.components.componentId", "response.components.decisive", "response.class", "ratings.responsiveness", "ratings.relevanceBurden", "untested-charity-rating", "burdenCompletionAdjustment.value"],
      semanticRepairPerformed: false,
      scoresDerived: 0
    }
  };
}

export function findV422116WithinValue(range, absoluteValue) {
  for (let value = 0; value <= 100; value += 1) if (mapWithinRange(range, value) === absoluteValue) return value;
  throw new Error(`no within-range mapping recreates ${absoluteValue} in ${range.join("..")}`);
}
