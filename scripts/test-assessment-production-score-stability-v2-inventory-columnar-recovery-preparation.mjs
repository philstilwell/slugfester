#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(
  await readFile(`${ROOT}/preparation-manifest.json`, "utf8")
);
const diagnosis = JSON.parse(
  await readFile(preparation.inputs.timeoutDiagnosis, "utf8")
);
const originalPreparation = JSON.parse(
  await readFile(preparation.inputs.originalPreparation, "utf8")
);
const columnOrder = preparation.transport.columnOrder;

function setPath(value, dottedPath, fieldValue) {
  const keys = dottedPath.split(".");
  let current = value;
  for (let index = 0; index < keys.length - 1; index += 1) {
    current[keys[index]] ??= {};
    current = current[keys[index]];
  }
  current[keys.at(-1)] = fieldValue;
}
function decode(columnar) {
  return {
    schemaVersion: columnar.sourceSchemaVersion,
    protocolId: columnar.protocolId,
    debateNumber: columnar.debateNumber,
    debateId: columnar.debateId,
    candidateCount: columnar.candidateCount,
    completeSourceDiscovery: structuredClone(columnar.completeSourceDiscovery),
    candidates: columnar.candidateRows.map((row) => {
      assert.equal(row.length, columnOrder.length);
      const candidate = {};
      columnOrder.forEach((field, index) => setPath(candidate, field, row[index]));
      return candidate;
    }),
    transportPolicy: structuredClone(columnar.transportPolicy),
  };
}

assert.equal(
  diagnosis.status,
  "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized"
);
assert.equal(
  preparation.status,
  "ten-fresh-columnar-v2-validation-inventory-contexts-prepared"
);
assert.equal(preparation.developmentValidationOnly, true);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.priorGateDisposition.preservedAsFailed, true);
assert.equal(
  preparation.priorGateDisposition.priorValidOutputsReusableForSuccessorAcceptance,
  false
);
assert.equal(preparation.currentCanaryDisposition.reclassified, false);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.candidates, 406);
assert.equal(preparation.totals.proCandidates, 203);
assert.equal(preparation.totals.conCandidates, 203);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.transport.everyCandidateRetained, true);
assert.equal(preparation.transport.everyOriginalModelVisibleFieldRetained, true);
assert.equal(preparation.transport.semanticCandidateDownselectionPerformed, false);
assert.equal(preparation.transport.parsedRoundTripIdentityVerified, true);
assert.equal(preparation.transport.timeoutExtensionApplied, false);
assert(preparation.transport.minimumSavingsFraction >= 0.17);
assert(
  preparation.transport.maximumCopiedInputBytes <
    preparation.transport.originalMaximumCopiedInputBytes
);
assert(preparation.transport.maximumCopiedInputBytes <= 85000);
assert.equal(preparation.authorization.recoveryExecutionManifest, true);
for (const key of [
  "recoveryModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(preparation.authorization[key], false, `${key} must be false`);
}
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}

let candidates = 0;
for (const context of preparation.contexts) {
  const original = originalPreparation.contexts.find(
    (prior) => prior.debateNumber === context.debateNumber
  );
  assert(original);
  const [columnarBytes, originalBytes, manualBytes, guideBytes, packetBytes, schemaBytes] =
    await Promise.all([
      readFile(context.modelCandidateTransport),
      readFile(context.priorModelCandidateTransport),
      readFile(preparation.inputs.manual),
      readFile(preparation.inputs.columnarTransportGuide),
      readFile(context.packet),
      readFile(context.schema),
    ]);
  assert.equal(sha256(columnarBytes), context.modelCandidateTransportSha256);
  assert.equal(sha256(originalBytes), context.priorModelCandidateTransportSha256);
  const columnar = JSON.parse(columnarBytes);
  const originalTransport = JSON.parse(originalBytes);
  assert(columnarBytes.equals(Buffer.from(`${JSON.stringify(columnar)}\n`)));
  assert.deepEqual(columnar.columnOrder, columnOrder);
  assert.equal(columnar.candidateRows.length, context.candidates);
  assert(isDeepStrictEqual(decode(columnar), originalTransport));
  assert.equal(
    manualBytes.length +
      guideBytes.length +
      packetBytes.length +
      columnarBytes.length +
      schemaBytes.length,
    context.copiedInputBytes
  );
  assert(context.copiedInputBytes < original.copiedInputBytes);
  assert(context.columnarSavingsFraction >= 0.17);
  candidates += context.candidates;
}
assert.equal(candidates, 406);
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, output), false);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.contexts.length,
      candidates,
      originalMaximumCopiedInputBytes:
        preparation.transport.originalMaximumCopiedInputBytes,
      columnarMaximumCopiedInputBytes:
        preparation.transport.maximumCopiedInputBytes,
      minimumSavingsFraction: preparation.transport.minimumSavingsFraction,
      exactRoundTripIdentity: true,
      priorGatePreservedFailed: true,
      priorOutputsReusable: false,
      timeoutExtensionAuthorized: false,
      modelContexts: 0,
      scoresDerived: 0,
      nextAuthorized: "recovery-execution-manifest",
    },
    null,
    2
  )
);
