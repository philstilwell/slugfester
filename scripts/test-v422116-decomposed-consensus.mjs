#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  buildV422116JudgmentPacket,
  compileAndValidateV422116Judgment,
  compileV422116LockedInventory,
  findV422116WithinValue,
  makeV422116InventorySchema,
  makeV422116JudgmentSchema,
  mapV422116BurdenRelevance,
  V422116_INVENTORY_OUTPUT_VERSION,
  V422116_JUDGMENT_OUTPUT_VERSION,
  V422116_MODEL,
  V422116_PROTOCOL_ID,
  V422116_ROOT,
  validateV422116InventoryProposal,
  validateV422116JudgmentOutput
} from "./lib/v422116-decomposed-consensus.mjs";
import { V4_BURDEN_RANGES } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const fixtureRoot = "docs/calibration/v4.2.20/source-span-rendering";
const preparation = JSON.parse(await readFile(`${fixtureRoot}/preparation-manifest.json`, "utf8"));
const context = preparation.contexts.find((item) => item.debateNumber === "27");
const [sourceOutput, sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes] = await Promise.all([
  readFile(context.rawOutput, "utf8").then(JSON.parse),
  readFile(context.packet, "utf8").then(JSON.parse),
  readFile(context.originalEvents, "utf8").then(JSON.parse),
  readFile(context.originalEvents),
  readFile(context.sourceLedger)
]);

const clone = (value) => structuredClone(value);
const isolation = {
  legacyAssessmentsUnavailable: true,
  calculatedTotalsUnavailable: true,
  winnerLabelsUnavailable: true,
  otherJudgmentsUnavailable: true,
  assessmentProseUnavailable: true,
  contaminationDetected: false
};

const evidenceBundle = {
  schemaVersion: "4.2.21.15-candidate-evidence-bundle",
  protocolId: "v4.2.21.15-candidate-evidence-transport",
  debateNumber: sourceOutput.debateNumber,
  debateId: sourceOutput.debateId,
  completeSourceDiscovery: {
    chunks: 1,
    everyEventOwnedExactlyOnce: true,
    everyCoreReportedComplete: true,
    everyCandidateRetained: true,
    semanticCandidateDownselectionPerformed: false
  },
  candidateCount: sourceOutput.moves.length,
  candidates: sourceOutput.moves.map((move) => ({
    qualifiedCandidateId: `fixture:${move.moveId}`,
    side: move.side,
    speaker: move.speaker,
    discoveryMoveKindAdvisory: move.moveKind,
    proposedProposition: move.proposition,
    sourceSpan: clone(move.sourceSpan),
    attributionConfidence: move.attributionConfidence,
    attributionBasis: move.attributionBasis,
    loadBearingLevel: move.importance,
    loadBearingReason: move.evidenceBasis,
    responseIntent: { kind: move.moveKind, earlierTargetDescription: move.response.rationale },
    contextSummary: move.response.rationale,
    candidateConfidence: "high",
    candidateEvidence: { excerpt: "fixture evidence is rerendered from the original local source during inventory compilation", sourceExact: true }
  }))
};

const inventoryProposal = {
  schemaVersion: V422116_INVENTORY_OUTPUT_VERSION,
  protocolId: V422116_PROTOCOL_ID,
  debateNumber: sourceOutput.debateNumber,
  debateId: sourceOutput.debateId,
  reviewerRole: "score-blind-inventory-curator",
  assessmentModel: V422116_MODEL.label,
  calibrationOnly: true,
  isolation,
  routes: clone(sourceOutput.routes),
  sectionSelections: sourceOutput.sections.map((section) => ({
    ...clone(section),
    proSelections: sourceOutput.moves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").map((move) => ({ qualifiedCandidateId: `fixture:${move.moveId}`, moveId: move.moveId, moveKind: move.moveKind, proposition: move.proposition })),
    conSelections: sourceOutput.moves.filter((move) => move.sectionId === section.sectionId && move.side === "con").map((move) => ({ qualifiedCandidateId: `fixture:${move.moveId}`, moveId: move.moveId, moveKind: move.moveKind, proposition: move.proposition }))
  })),
  audit: {
    completeCandidateEvidenceBundleReviewed: true,
    everySelectedCandidateUsedOnce: true,
    ratingsUnavailable: true,
    responseTopologyUnavailable: true,
    otherJudgmentsUnavailable: true,
    calculatedTotalsUnavailable: true,
    winnerLabelsUnavailable: true
  }
};

const inventorySchema = makeV422116InventorySchema({ evidenceBundle });
assert.equal(inventorySchema.properties.routes.items.additionalProperties, false);
assert.equal(inventorySchema.properties.sectionSelections.minItems, 4);
assert.equal(inventorySchema.properties.sectionSelections.maxItems, 6);
assert.equal(inventorySchema.properties.sectionSelections.items.properties.proSelections.maxItems, 2);
assert.equal(inventorySchema.properties.sectionSelections.items.properties.conSelections.maxItems, 2);
assert.equal(validateV422116InventoryProposal(inventoryProposal, evidenceBundle).status, "passed");
const firstInventory = compileV422116LockedInventory(inventoryProposal, evidenceBundle, eventsDocument);
const secondInventory = compileV422116LockedInventory(inventoryProposal, evidenceBundle, eventsDocument);
assert.deepEqual(firstInventory, secondInventory);
assert.equal(firstInventory.validation.finalEvidenceSourceExact, true);
assert.equal(firstInventory.lockedInventory.moves.length, 12);
assert.equal(JSON.stringify(firstInventory.lockedInventory).includes('"ratings"'), false);
assert.equal(JSON.stringify(firstInventory.lockedInventory).includes('"response"'), false);

const packetA = buildV422116JudgmentPacket(firstInventory.lockedInventory, "A");
const packetB = buildV422116JudgmentPacket(firstInventory.lockedInventory, "B");
assert.equal(packetA.lockedInventorySha256, packetB.lockedInventorySha256);
assert.deepEqual(packetA.lockedInventory, packetB.lockedInventory);
assert.notEqual(packetA.reviewerRole, packetB.reviewerRole);

function contactCode(packet, burdenContact) {
  const option = packet.burdenContactOptions.find((candidate) => JSON.stringify(candidate.burdenContact) === JSON.stringify(burdenContact));
  assert(option, `missing burden contact option for ${JSON.stringify(burdenContact)}`);
  return option.code;
}

function responseJudgment(move) {
  if (move.moveKind === "constructive") return { rationale: move.response.rationale, responsivenessWithinClass: clone(move.response.responsivenessWithinClass) };
  const specialResponseMode = move.response.diagnosticConsequenceExplicit ? "diagnostic-defeat" : move.response.replacementDemandAnswered ? "justified-reframe" : "none";
  const components = move.response.components.map(({ targetMoveId, text, contacted }) => ({ targetMoveId, text, contacted }));
  const contactedIndex = components.findIndex((component) => component.contacted);
  const primaryIndex = contactedIndex >= 0 ? contactedIndex : 0;
  if (specialResponseMode !== "none") assert(contactedIndex >= 0, `${move.moveId}: fixture special response lacks a contacted primary component`);
  const primaryComponent = { targetMoveId: components[primaryIndex].targetMoveId, text: components[primaryIndex].text };
  const responseMode = specialResponseMode === "none" ? (contactedIndex >= 0 ? "ordinary-primary-contacted" : "ordinary-primary-uncontacted") : specialResponseMode;
  return { responseMode, primaryComponent, additionalComponents: components.filter((_, index) => index !== primaryIndex), issueBearingContraryMaterial: move.response.issueBearingContraryMaterial, rationale: move.response.rationale, responsivenessWithinClass: clone(move.response.responsivenessWithinClass) };
}

function judgmentFixture(packet) {
  return {
    schemaVersion: V422116_JUDGMENT_OUTPUT_VERSION,
    protocolId: V422116_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: packet.reviewerRole,
    assessmentModel: V422116_MODEL.label,
    calibrationOnly: true,
    lockedInventorySha256: packet.lockedInventorySha256,
    isolation: {
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      otherIndependentJudgmentUnavailable: true,
      assessmentProseUnavailable: true,
      contaminationDetected: false
    },
    moveJudgments: Object.fromEntries(sourceOutput.moves.map((move) => {
      const tier = move.burdenContact?.tier ?? "none";
      const charityTested = move.charity.tested;
      return [move.moveId, {
        importance: move.importance,
        burdenContactCode: contactCode(packet, move.burdenContact),
        response: responseJudgment(move),
        precisionFindings: clone(move.precisionFindings),
        calibrationFindings: clone(move.calibrationFindings),
        charityAssessment: { mode: charityTested ? "tested" : "not-tested", alternative: move.charity.alternative, decisiveQualification: move.charity.decisiveQualification, testedRatingValue: charityTested ? move.ratings.representationalCharity.value : 75, ratingRationale: move.ratings.representationalCharity.rationale },
        ratings: {
          logicalCoherence: clone(move.ratings.logicalCoherence),
          evidenceWarrant: clone(move.ratings.evidenceWarrant),
          relevanceWithinTier: { value: findV422116WithinValue(V4_BURDEN_RANGES[tier], move.ratings.relevanceBurden.value), rationale: move.ratings.relevanceBurden.rationale }
        },
        evidenceBasis: move.evidenceBasis,
        assessmentConfidence: move.assessmentConfidence
      }];
    })),
    burdenCompletionAdjustment: Object.fromEntries(["pro", "con"].map((side) => [side, { eligibleValueCandidate: sourceOutput.burdenCompletionAdjustment[side].value, rationale: sourceOutput.burdenCompletionAdjustment[side].rationale, eligibility: clone(sourceOutput.burdenCompletionAdjustment[side].eligibility) }])),
    audit: {
      sameLockedInventoryReviewed: true,
      everyLockedMoveJudgedOnce: true,
      candidateSelectionUnavailable: true,
      earlierOpposingTargetEnumsApplied: true,
      responseComponentsApplied: true,
      withinClassResponsivenessApplied: true,
      withinTierBurdenRelevanceApplied: true,
      closedPrecisionAnchorsApplied: true,
      closedCalibrationAnchorsApplied: true,
      charityAnchorApplied: true,
      strictBurdenExclusionRuleApplied: true,
      scoresNotDerived: true
    }
  };
}

const schemaA = makeV422116JudgmentSchema({ packet: packetA });
const schemaB = makeV422116JudgmentSchema({ packet: packetB });
assert.deepEqual(schemaA.properties.moveJudgments.required, firstInventory.lockedInventory.moves.map((move) => move.moveId));
assert.deepEqual(schemaB.properties.moveJudgments.required, schemaA.properties.moveJudgments.required);
for (const [index, move] of firstInventory.lockedInventory.moves.entries()) if (move.moveKind === "reply") {
  const legalTargets = new Set(firstInventory.lockedInventory.moves.slice(0, index).filter((candidate) => candidate.side !== move.side).map((candidate) => candidate.moveId));
  const responseSchema = schemaA.properties.moveJudgments.properties[move.moveId].properties.response;
  const targetReference = responseSchema.properties.primaryComponent.properties.targetMoveId.$ref;
  assert.equal(responseSchema.properties.additionalComponents.items.properties.targetMoveId.$ref, targetReference);
  const schemaTargets = new Set(schemaA.$defs[targetReference.split("/").at(-1)].enum);
  assert.deepEqual([...schemaTargets].sort(), [...legalTargets].sort());
}

const judgmentA = judgmentFixture(packetA);
const judgmentB = judgmentFixture(packetB);
assert.equal(validateV422116JudgmentOutput(judgmentA, packetA).status, "passed");
assert.equal(validateV422116JudgmentOutput(judgmentB, packetB).status, "passed");
const compiledA = compileAndValidateV422116Judgment(judgmentA, packetA, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes });
const compiledB = compileAndValidateV422116Judgment(judgmentB, packetB, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes });
assert.equal(compiledA.validation.status, "passed");
assert.equal(compiledB.validation.status, "passed");
assert.deepEqual(compiledA.rawOutput, compiledB.rawOutput);
assert.equal(compiledA.provenance.semanticRepairPerformed, false);
assert.equal(compiledA.provenance.scoresDerived, 0);

for (const move of compiledA.rawOutput.moves) {
  const tier = move.burdenContact?.tier ?? "none";
  assert(move.ratings.relevanceBurden.value >= V4_BURDEN_RANGES[tier][0] && move.ratings.relevanceBurden.value <= V4_BURDEN_RANGES[tier][1]);
}
assert.equal(mapV422116BurdenRelevance(null, 0), 0);
assert.equal(mapV422116BurdenRelevance(null, 100), 54);
assert.equal(mapV422116BurdenRelevance({ tier: "motion" }, 0), 90);
assert.equal(mapV422116BurdenRelevance({ tier: "motion" }, 100), 100);

const excludedAdjustment = clone(judgmentA);
excludedAdjustment.burdenCompletionAdjustment.pro.eligibleValueCandidate = 5;
excludedAdjustment.burdenCompletionAdjustment.pro.eligibility.distinctDebateWideConsequence = false;
const excludedCompiled = compileAndValidateV422116Judgment(excludedAdjustment, packetA, { sourcePacket, eventsDocument, eventsBytes, sourceLedgerBytes });
assert.equal(excludedCompiled.rawOutput.burdenCompletionAdjustment.pro.value, 0);

const summary = {
  schemaVersion: "4.2.21.16-decomposed-consensus-fixture-result",
  protocolId: V422116_PROTOCOL_ID,
  status: "passed",
  debateNumber: sourceOutput.debateNumber,
  inventory: { sections: firstInventory.lockedInventory.sections.length, moves: firstInventory.lockedInventory.moves.length, scoreBlind: true, ratingsAbsent: true, responseTopologyAbsent: true, deterministicReplay: true, finalEvidenceSourceExact: true },
  independentJudgments: { passes: 2, sameLockedInventorySha256: packetA.lockedInventorySha256, candidateSelectionUnavailable: true, exactMovePropertySet: true, earlierOpposingTargetEnumsOnly: true, unchangedV4220ValidatorPassed: true },
  repositoryDerivations: { responseTargetsFromComponents: true, responseClass: true, absoluteResponsiveness: true, absoluteRelevanceBurden: true, untestedCharityAnchor: true, strictBurdenResidualExclusion: true },
  downstreamRequired: { deterministicDisagreementExtraction: true, mediumConfidenceAudioVerification: true, disputedFieldsOnlyAdjudication: true, scoresAfterAdjudicationOnly: true },
  semanticRepairPerformed: false,
  modelContextsExecuted: 0,
  audioCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0
};

if (shouldWrite) {
  await mkdir(V422116_ROOT, { recursive: true });
  await writeFile(`${V422116_ROOT}/inventory-template.schema.json`, `${JSON.stringify(inventorySchema, null, 2)}\n`);
  await writeFile(`${V422116_ROOT}/judgment-a-fixture.schema.json`, `${JSON.stringify(schemaA, null, 2)}\n`);
  await writeFile(`${V422116_ROOT}/fixture-result.json`, `${JSON.stringify(summary, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
