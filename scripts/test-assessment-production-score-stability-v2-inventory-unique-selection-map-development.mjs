#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { auditEndpointCompatibleStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-unique-selection-map-development";
const analysis = JSON.parse(await readFile(`${ROOT}/development-analysis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "unique-selection-map-retired-regression-passed-successor-preparation-authorized"
);
assert.equal(analysis.failedGateDisposition.predecessorTimeoutGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.columnarRecoveryGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.recoveryAcceptedAsPassed, false);
assert.equal(
  analysis.failedGateDisposition.recoveryValidOutputsReusableForSuccessorAcceptance,
  false
);
assert.equal(analysis.failedGateDisposition.currentCanaryReclassified, false);
assert.equal(analysis.failedGateDisposition.proposedPolicyPromoted, false);
assert.equal(analysis.design.everyCandidateKeyRequired, true);
assert.equal(analysis.design.duplicateCandidateSelectionRepresentable, false);
assert.equal(analysis.design.unsupportedUniqueItemsUsed, false);
assert.equal(analysis.design.semanticCandidateDownselectionPerformed, false);
assert.equal(analysis.schemas.length, 10);
assert.equal(analysis.regression.acceptedArtifactsTested, 11);
assert.equal(analysis.regression.exactLegacyProposalRoundTrips, 11);
assert.equal(analysis.regression.lockedInventoriesCanonicallyIdentical, 11);
assert.equal(
  analysis.regression.failedDebate31DuplicateRejectedBeforeProjection,
  true
);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert(analysis.transport.maximumCopiedInputBytes <= 115000);
for (const record of analysis.schemas) {
  const bytes = await readFile(record.schema);
  assert.equal(sha256(bytes), record.schemaSha256);
  assert.equal(bytes.equals(Buffer.from(`${JSON.stringify(JSON.parse(bytes))}\n`)), true);
  assert.equal(bytes.includes(Buffer.from('"uniqueItems"')), false);
  const schemaAudit = auditEndpointCompatibleStrictSchema(JSON.parse(bytes));
  assert.equal(schemaAudit.nullableCandidateProperties, record.candidates);
  assert.equal(schemaAudit.totalObjectProperties, record.totalObjectProperties);
  assert.equal(schemaAudit.maximumSchemaTreeDepth, record.maximumSchemaTreeDepth);
  assert.equal(
    schemaAudit.totalSchemaStringCharacters,
    record.totalSchemaStringCharacters
  );
  assert(record.totalObjectProperties <= 5000);
  assert(record.maximumSchemaTreeDepth <= 10);
  assert(record.totalSchemaStringCharacters <= 120000);
  assert.equal(record.candidateIdentityStructurallyUnique, true);
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
      duplicateCandidateSelectionRepresentable: false,
      failedDebate31DuplicateRejected: true,
      maximumCopiedInputBytes: analysis.transport.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
    },
    null,
    2
  )
);
