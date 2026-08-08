#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  buildV422115EvidenceBundle,
  validateV422115EvidenceBundle
} from "./lib/v422115-candidate-evidence-transport.mjs";
import { makeV422116InventorySchema } from "./lib/v422116-decomposed-consensus.mjs";
import {
  buildV4221162InventoryCandidateTransport,
  validateV4221162InventoryCandidateTransport
} from "./lib/v4221162-inventory-transport.mjs";

const ROOT = "docs/assessment-production/canary-v1-inventory";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
const discovery = JSON.parse(await readFile(preparation.inputs.discoveryAnalysis, "utf8"));

assert.equal(preparation.status, "ten-production-canary-score-blind-inventory-contexts-prepared");
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.AIOnly, true);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.candidates, 322);
assert.equal(preparation.totals.proCandidates, 152);
assert.equal(preparation.totals.conCandidates, 170);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.transport.everyCandidateRetained, true);
assert.equal(preparation.transport.semanticCandidateDownselectionPerformed, false);
assert(preparation.transport.maximumCopiedInputBytes <= preparation.transport.provenCeilingBytes);
assert.equal(preparation.audioPolicy.mediumConfidenceAlwaysRequiresVerification, true);
assert.equal(preparation.audioPolicy.discoveryBelowHighCandidates, 0);
assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(preparation.authorization.inventoryExecutionManifest, true);
for (const key of [
  "inventoryModelExecution",
  "retry",
  "semanticCorrection",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "paidTranscription",
  "audioVerification",
  "adjudicationExecution",
  "scoreDerivation",
  "publicationFinalization",
  "productionMutation",
  "remainingProductionBatches"
]) assert.equal(preparation.authorization[key], false, `${key} must remain unauthorized`);

assert.equal(sha256(await readFile(preparation.inputs.discoveryAnalysis)), preparation.inputs.discoveryAnalysisSha256);
assert.equal(sha256(await readFile(preparation.inputs.sourcePreparation)), preparation.inputs.sourcePreparationSha256);
assert.equal(sha256(await readFile(preparation.inputs.manual)), preparation.inputs.manualSha256);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: preparation source hash changed`);
}

const discoveryByNumber = new Map(discovery.debates.map((debate) => [debate.debateNumber, debate]));
let candidateTotal = 0;
for (const context of preparation.contexts) {
  const discovered = discoveryByNumber.get(context.debateNumber);
  assert(discovered, `${context.debateNumber}: missing discovery record`);
  const [
    candidateBundleBytes,
    sparseBytes,
    fullEvidenceBytes,
    transportBytes,
    schemaBytes,
    eventsBytes,
    packetBytes,
    ledgerBytes,
    manualBytes
  ] = await Promise.all([
    readFile(context.discoveryCandidateBundle),
    readFile(context.discoverySparseContext),
    readFile(context.validatorCandidateEvidenceBundle),
    readFile(context.modelCandidateTransport),
    readFile(context.schema),
    readFile(context.originalEvents),
    readFile(context.packet),
    readFile(context.fullLedger),
    readFile(preparation.inputs.manual)
  ]);

  assert.equal(sha256(candidateBundleBytes), context.discoveryCandidateBundleSha256);
  assert.equal(context.discoveryCandidateBundleSha256, discovered.bundleSha256);
  assert.equal(sha256(sparseBytes), context.discoverySparseContextSha256);
  assert.equal(context.discoverySparseContextSha256, discovered.sparseSha256);
  assert.equal(sha256(fullEvidenceBytes), context.validatorCandidateEvidenceBundleSha256);
  assert.equal(sha256(transportBytes), context.modelCandidateTransportSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(ledgerBytes), context.fullLedgerSha256);

  const candidateBundle = JSON.parse(candidateBundleBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const fullEvidence = JSON.parse(fullEvidenceBytes);
  const transport = JSON.parse(transportBytes);
  const schema = JSON.parse(schemaBytes);
  assert.equal(validateV422115EvidenceBundle(fullEvidence, candidateBundle, eventsDocument).status, "passed");
  assert.equal(validateV4221162InventoryCandidateTransport(transport, fullEvidence).status, "passed");
  assert.deepEqual(fullEvidence, buildV422115EvidenceBundle(candidateBundle, eventsDocument));
  assert.deepEqual(transport, buildV4221162InventoryCandidateTransport(fullEvidence));
  assert.deepEqual(schema, makeV422116InventorySchema({ evidenceBundle: transport }));
  assert.equal(transport.candidateCount, context.candidates);
  assert.equal(transport.candidates.length, context.candidates);
  assert.equal(new Set(transport.candidates.map((candidate) => candidate.qualifiedCandidateId)).size, context.candidates);
  assert(transport.candidates.every((candidate) => candidate.candidateEvidence.sourceExact === true));
  assert(transport.candidates.every((candidate) => !Object.hasOwn(candidate, "attributionConfidence")));
  assert.equal(
    manualBytes.length + packetBytes.length + transportBytes.length + schemaBytes.length,
    context.copiedInputBytes
  );
  assert(context.copiedInputBytes <= preparation.transport.provenCeilingBytes);
  assert(context.proCandidates >= 4);
  assert(context.conCandidates >= 4);
  candidateTotal += context.candidates;
}
assert.equal(candidateTotal, 322);

for (const outputPath of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);
}

console.log(JSON.stringify({
  status: "passed",
  debates: preparation.totals.debates,
  candidates: preparation.totals.candidates,
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  everyCandidateRetained: true,
  exactEvidenceReplay: true,
  deterministicSchemaReplay: true,
  modelContexts: 0,
  audioCalls: 0,
  scoresDerived: 0,
  nextAuthorized: "inventory-execution-manifest"
}, null, 2));
