#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { auditEndpointCompatibleStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-unique-selection-map-successor";
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert.equal(
  preparation.status,
  "ten-fresh-unique-selection-map-v2-validation-inventory-contexts-prepared"
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.candidates, 406);
assert.equal(preparation.totals.proCandidates, 203);
assert.equal(preparation.totals.conCandidates, 203);
assert.equal(preparation.currentCanaryDisposition.reclassified, false);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(preparation.failedGateDisposition.predecessorTimeoutGatePreservedFailed, true);
assert.equal(preparation.failedGateDisposition.columnarRecoveryGatePreservedFailed, true);
assert.equal(
  preparation.failedGateDisposition.priorValidOutputsReusableForSuccessorAcceptance,
  false
);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.selectionTopology.everyCandidateKeyRequired, true);
assert.equal(
  preparation.selectionTopology.duplicateCandidateSelectionRepresentable,
  false
);
assert.equal(preparation.selectionTopology.unsupportedUniqueItemsUsed, false);
assert.equal(preparation.selectionTopology.preservedRegressionRoundTrips, 11);
assert.equal(preparation.selectionTopology.preservedLockedInventoriesIdentical, 11);
assert.equal(preparation.selectionTopology.failedDebate31DuplicateRejected, true);
assert(preparation.transport.maximumCopiedInputBytes <= 115000);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.scoresDerived, 0);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const context of preparation.contexts) {
  const [manual, columnarGuide, uniqueGuide, packet, transport, schemaBytes] =
    await Promise.all([
      readFile(preparation.inputs.manual),
      readFile(preparation.inputs.columnarTransportGuide),
      readFile(preparation.inputs.uniqueSelectionMapGuide),
      readFile(context.packet),
      readFile(context.modelCandidateTransport),
      readFile(context.schema),
    ]);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(schemaBytes.includes(Buffer.from('"uniqueItems"')), false);
  const audit = auditEndpointCompatibleStrictSchema(JSON.parse(schemaBytes));
  assert.equal(audit.nullableCandidateProperties, context.candidates);
  assert.equal(context.candidateSelectionProperties, context.candidates);
  assert.equal(
    manual.length +
      columnarGuide.length +
      uniqueGuide.length +
      packet.length +
      transport.length +
      schemaBytes.length,
    context.copiedInputBytes
  );
  assert(context.copiedInputBytes <= 115000);
}
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(output), false, `${output}: premature output`);
  assert.equal(Object.hasOwn(preparation.sourceHashes, output), false);
}
assert.equal(preparation.authorization.successorExecutionManifest, true);
for (const key of [
  "successorModelExecution",
  "retry",
  "timeoutExtension",
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
  assert.equal(preparation.authorization[key], false, `${key}: must be false`);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: preparation.contexts.length,
      candidates: preparation.totals.candidates,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      duplicateCandidateSelectionRepresentable: false,
      priorGatesPreservedFailed: true,
      priorOutputsReusable: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-execution-manifest",
    },
    null,
    2
  )
);
