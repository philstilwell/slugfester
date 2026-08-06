#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  compileV422116LockedInventory,
  makeV422116InventorySchema,
  V422116_INVENTORY_OUTPUT_VERSION,
  V422116_MODEL,
  V422116_PROTOCOL_ID,
  V422116_ROOT,
  validateV422116InventoryProposal
} from "./lib/v422116-decomposed-consensus.mjs";

const preparation = JSON.parse(await readFile(`${V422116_ROOT}/inventory-preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "retired-partition-three-inventory-contexts-prepared");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.transport.scoringRubricsDelivered, false);
assert(preparation.totals.maximumCopiedInputBytes <= 115000);

const fixtureResults = [];
for (const context of preparation.contexts) {
  const [evidenceBundle, schema] = await Promise.all([context.candidateEvidenceBundle, context.schema].map((file) => readFile(file, "utf8").then(JSON.parse)));
  assert.equal(schema.properties.debateNumber.const, context.debateNumber);
  assert.equal(schema.properties.sectionSelections.minItems, 4);
  assert.equal(schema.properties.sectionSelections.maxItems, 6);
  assert.equal(schema.properties.sectionSelections.items.properties.proSelections.maxItems, 2);
  assert.equal(schema.properties.sectionSelections.items.properties.conSelections.maxItems, 2);
  assert.deepEqual(schema, makeV422116InventorySchema({ evidenceBundle }));
  for (const future of [context.proposalOutput, context.lockedInventoryOutput, context.validationOutput, context.provenanceOutput]) assert.equal(await access(future).then(() => true, () => false), false, `future gate output already exists: ${future}`);
  if (!["133", "178"].includes(context.debateNumber)) continue;
  const predecessor = JSON.parse(await readFile(`docs/calibration/v4.2.21.15/candidate-evidence-transport/primary-proposals/debate-${context.debateNumber}.json`, "utf8"));
  const proposal = {
    schemaVersion: V422116_INVENTORY_OUTPUT_VERSION,
    protocolId: V422116_PROTOCOL_ID,
    debateNumber: predecessor.debateNumber,
    debateId: predecessor.debateId,
    reviewerRole: "score-blind-inventory-curator",
    assessmentModel: V422116_MODEL.label,
    calibrationOnly: true,
    isolation: structuredClone(predecessor.isolation),
    routes: structuredClone(predecessor.routes),
    sectionSelections: predecessor.sectionJudgments.map(({ proSelections, conSelections, ...section }) => ({
      ...structuredClone(section),
      proSelections: proSelections.map(({ qualifiedCandidateId, moveId, moveKind, proposition }) => ({ qualifiedCandidateId, moveId, moveKind, proposition })),
      conSelections: conSelections.map(({ qualifiedCandidateId, moveId, moveKind, proposition }) => ({ qualifiedCandidateId, moveId, moveKind, proposition }))
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
  assert.equal(validateV422116InventoryProposal(proposal, evidenceBundle).status, "passed");
  const events = JSON.parse(await readFile(context.originalEvents, "utf8"));
  const compiled = compileV422116LockedInventory(proposal, evidenceBundle, events);
  assert.equal(compiled.validation.status, "passed");
  assert.equal(compiled.validation.finalEvidenceSourceExact, true);
  assert.equal(JSON.stringify(compiled.lockedInventory).includes('"ratings"'), false);
  assert.equal(JSON.stringify(compiled.lockedInventory).includes('"response"'), false);
  fixtureResults.push({ debateNumber: context.debateNumber, sections: compiled.lockedInventory.sections.length, moves: compiled.lockedInventory.moves.length, deterministicInventoryCompilation: true, finalEvidenceSourceExact: true });
}

console.log(JSON.stringify({ status: "passed", contextsPrepared: 3, actualPartitionStructuralFixtures: fixtureResults, predecessorRatingsAndResponsesDiscarded: true, predecessorProposalsReusableForAssessment: false, futureGateOutputsAbsent: true, maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), scoringRubricsDelivered: false, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
