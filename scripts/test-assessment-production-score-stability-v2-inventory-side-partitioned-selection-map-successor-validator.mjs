#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { convertLegacyProposalToSidePartitionedSelectionMap } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
import { validateV2InventorySidePartitionedSelectionMapSuccessorProposal } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-stage.mjs";

const preparationPath =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-side-partitioned-selection-map-successor/preparation-manifest.json";
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
const context = preparation.contexts.find(
  (candidate) => candidate.debateNumber === "86"
);
assert(context, "Debate 86 successor context unavailable");
const [legacyProposal, candidateTransport] = await Promise.all([
  readFile(
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/inventory-proposals/debate-86.json",
    "utf8"
  ).then(JSON.parse),
  readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
]);
const proposal = convertLegacyProposalToSidePartitionedSelectionMap({
  legacyProposal,
  candidateTransport,
});
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-side-partitioned-selection-validator-")
);
try {
  const proposalPath = path.join(temporary, "proposal.json");
  await writeFile(proposalPath, `${JSON.stringify(proposal)}\n`);
  const validation =
    await validateV2InventorySidePartitionedSelectionMapSuccessorProposal({
      proposalPath,
      preparationPath,
      debateNumber: "86",
      shouldWrite: false,
    });
  assert.equal(validation.status, "passed");
  assert.equal(validation.sidePartitionedSelectionMapUsed, true);
  assert.equal(validation.everyCandidateKeyRequired, true);
  assert.equal(validation.candidateIdentityStructurallyUnique, true);
  assert.equal(validation.duplicateCandidateSelectionRepresentable, false);
  assert.equal(validation.repositorySideStructurallyPartitioned, true);
  assert.equal(validation.wrongSideCandidateKeyRepresentable, false);
  assert.equal(validation.modelAuthoredOrderAbsent, true);
  assert.equal(validation.orderWithinSideRepositoryDerivedFromChronology, true);
  assert.equal(validation.positionCollisionRepresentable, false);
  assert.equal(validation.sectionSideCardinalityDeterministicallyValidated, true);
  assert.equal(validation.selectedCandidatesProjectedDeterministically, true);
  assert.equal(validation.sections, 5);
  assert.equal(validation.moves, 17);
  assert.equal(validation.scoresDerived, 0);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
