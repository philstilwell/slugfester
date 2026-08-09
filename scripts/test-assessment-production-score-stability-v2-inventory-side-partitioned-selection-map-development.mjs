#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { auditSidePartitionedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-side-partitioned-selection-map-development";
const analysis = JSON.parse(await readFile(`${ROOT}/development-analysis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "side-partitioned-order-free-map-retired-regression-passed-successor-preparation-authorized"
);
assert.equal(
  analysis.failedGateDisposition.predecessorTimeoutGatePreservedFailed,
  true
);
assert.equal(
  analysis.failedGateDisposition.columnarRecoveryGatePreservedFailed,
  true
);
assert.equal(
  analysis.failedGateDisposition.uniqueSelectionSuccessorGatePreservedFailed,
  true
);
assert.equal(analysis.failedGateDisposition.allThreeAcceptedAsPassed, false);
assert.equal(
  analysis.failedGateDisposition.priorOutputsReusableForSuccessorAcceptance,
  false
);
assert.equal(analysis.design.everyCandidateKeyRequired, true);
assert.equal(analysis.design.duplicateCandidateSelectionRepresentable, false);
assert.equal(analysis.design.repositorySideEncodedByExclusiveParentMap, true);
assert.equal(analysis.design.wrongSideCandidateKeyRepresentable, false);
assert.equal(analysis.design.orderWithinSideModelAuthored, false);
assert.equal(analysis.design.orderWithinSideRepositoryDerivedFromChronology, true);
assert.equal(analysis.design.positionCollisionRepresentable, false);
assert.equal(analysis.design.unsupportedUniqueItemsUsed, false);
assert.equal(
  analysis.design.sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties,
  false
);
assert.equal(
  analysis.design.sectionSideCardinalityDeterministicallyValidated,
  true
);
assert.equal(analysis.design.semanticCandidateDownselectionPerformed, false);
assert.equal(analysis.schemas.length, 10);
assert.equal(analysis.regression.acceptedArtifactsTested, 13);
assert.equal(analysis.regression.legacySelectionMembershipIdentical, 13);
assert.equal(analysis.regression.lockedInventoriesCanonicallyIdentical, 13);
assert.equal(
  analysis.regression.failedDebate31DuplicateRejectedBeforeProjection,
  true
);
assert.equal(
  analysis.regression.failedDebate31CardinalityRejectedAfterOrderRemoval,
  true
);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert(analysis.transport.maximumCopiedInputBytes <= 115000);
for (const record of analysis.schemas) {
  const bytes = await readFile(record.schema);
  assert.equal(sha256(bytes), record.schemaSha256);
  assert.equal(
    bytes.equals(Buffer.from(`${JSON.stringify(JSON.parse(bytes))}\n`)),
    true
  );
  assert.equal(bytes.includes(Buffer.from('"uniqueItems"')), false);
  assert.equal(bytes.includes(Buffer.from('"orderWithinSide"')), false);
  const schema = JSON.parse(bytes);
  const audit = auditSidePartitionedStrictSchema(schema);
  assert.equal(audit.nullableCandidateProperties, record.candidates);
  assert.equal(audit.totalObjectProperties, record.totalObjectProperties);
  assert.equal(audit.maximumSchemaTreeDepth, record.maximumSchemaTreeDepth);
  assert.equal(
    audit.totalSchemaStringCharacters,
    record.totalSchemaStringCharacters
  );
  const proKeys = Object.keys(
    schema.properties.candidateSelectionsBySide.properties.pro.properties
  );
  const conKeys = Object.keys(
    schema.properties.candidateSelectionsBySide.properties.con.properties
  );
  assert.equal(proKeys.length, record.proCandidates);
  assert.equal(conKeys.length, record.conCandidates);
  assert.equal(proKeys.some((candidateId) => conKeys.includes(candidateId)), false);
  assert.equal(record.candidateIdentityStructurallyUnique, true);
  assert.equal(record.repositorySideStructurallyPartitioned, true);
  assert.equal(record.wrongSideCandidateKeyRepresentable, false);
  assert.equal(record.modelAuthoredOrderPresent, false);
  assert(record.totalObjectProperties <= 5000);
  assert(record.maximumSchemaTreeDepth <= 10);
  assert(record.totalSchemaStringCharacters <= 120000);
  assert(record.copiedInputBytes <= 115000);
}
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(analysis.totals.modelContextsExecuted, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.authorization.successorPreparation, true);
for (const key of [
  "successorExecutionManifest",
  "successorModelExecution",
  "retry",
  "semanticCorrection",
  "priorOutputReuseForSuccessorAcceptance",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: analysis.schemas.length,
      candidates: analysis.totals.candidates,
      acceptedRetiredOutputsReplayed:
        analysis.regression.acceptedArtifactsTested,
      failedOutputsProbed: analysis.totals.failedOutputsProbed,
      duplicateCandidateSelectionRepresentable: false,
      wrongSideCandidateKeyRepresentable: false,
      positionCollisionRepresentable: false,
      failedDebate31CardinalityRejected: true,
      maximumCopiedInputBytes: analysis.transport.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
    },
    null,
    2
  )
);
