#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  makeV223CompactJudgmentPacket,
  makeV223CompactJudgmentSchema,
  stripV223SchemaDescriptions,
} from "./lib/assessment-production-score-stability-v2.2.3-compact-judgment-schema.mjs";

const ROOT = "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const EXPECTED_DEBATES = [
  "17",
  "39",
  "121",
  "21",
  "75",
  "168",
  "177",
  "56",
  "49",
  "132",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assert.equal(
  preparation.status,
  "twenty-v2.2.3-independent-judgment-contexts-prepared-and-frozen"
);
assert.equal(preparation.schemaVersion, "1.0-score-stability-v2.2.3-independent-judgment-preparation");
assert.equal(preparation.developmentValidationOnly, true);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.AIOnly, true);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.scoreBlind, true);
assert.equal(preparation.contexts.length, 20);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.contexts, 20);
assert.equal(preparation.totals.uniqueMoves, 197);
assert.equal(preparation.totals.movesJudgedAcrossPasses, 394);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert(preparation.transport.maximumCopiedInputBytes <= preparation.transport.provenCeilingBytes);
assert.equal(preparation.transport.schemaDescriptionAnnotationsRemoved, true);
assert.equal(preparation.transport.schemaValidationKeywordsChanged, false);
assert.equal(preparation.transport.identicalSchemaSubtreeInterningOnly, true);
assert.equal(
  preparation.transport.deterministicallyRedundantBurdenContactLabelsRemoved,
  true
);
assert.equal(preparation.transport.validationKeywordsRemoved, 0);
assert.equal(preparation.transport.validationKeywordsRelaxed, 0);
assert.equal(preparation.transport.targetEnumsChanged, 0);
assert.equal(preparation.isolation.twoIndependentPassesPerDebate, true);
assert.equal(preparation.isolation.byteIdenticalLockedInventoryPerPair, true);
assert.equal(preparation.isolation.otherPassUnavailable, true);
assert.equal(preparation.isolation.failedV221PlanOutputsUnavailable, true);
assert.equal(preparation.audioPolicy.mediumConfidenceAlwaysRequiresVerification, true);
assert.equal(preparation.audioPolicy.pendingAttributionVerificationMoves.length, 0);
assert.equal(preparation.executionPolicyToFreezeSeparately.maximumParallelContexts, 2);
assert.deepEqual(preparation.executionPolicyToFreezeSeparately.schedulerRamp, [1, 2]);
assert.equal(preparation.executionPolicyToFreezeSeparately.retriesMaximum, 0);
assert.equal(
  preparation.executionPolicyToFreezeSeparately.timeoutExtensionsMaximum,
  0
);
assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(preparation.authorization.independentJudgmentExecutionManifest, true);
for (const key of [
  "independentJudgmentModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "disagreementExtraction",
  "paidTranscription",
  "audioVerification",
  "adjudicationExecution",
  "scoreDerivation",
  "publicationFinalization",
  "productionMutation",
  "remainingProductionBatches"
]) assert.equal(preparation.authorization[key], false, `${key} must remain unauthorized`);
assert.equal(
  preparation.failedGateDisposition.v221PlanningGatePreservedFailed,
  true
);
assert.equal(
  preparation.proposedPolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(
  preparation.inventorySuccessorContract.fallbackAppliedOnlyToRetainedOrphanReply,
  true
);
assert.equal(preparation.predecessorPacketFailure.preservedFailed, true);
assert.equal(preparation.predecessorPacketFailure.partialPacketFreezeAccepted, false);
assert.equal(preparation.predecessorPacketFailure.transportCeilingRaised, false);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: preparation source hash changed`);
}
for (const [pathKey, hashKey] of [
  ["productionManifest", "productionManifestSha256"],
  ["inventoryAnalysis", "inventoryAnalysisSha256"],
  ["inventoryPreparation", "inventoryPreparationSha256"],
  ["sourcePreparation", "sourcePreparationSha256"],
  ["predecessorFailure", "predecessorFailureSha256"],
  ["manual", "manualSha256"]
]) {
  assert.equal(sha256(await readFile(preparation.inputs[pathKey])), preparation.inputs[hashKey]);
}

for (const debateNumber of EXPECTED_DEBATES) {
  const pair = preparation.contexts.filter((context) => context.debateNumber === debateNumber);
  assert.equal(pair.length, 2, `${debateNumber}: expected two contexts`);
  assert.deepEqual(pair.map((context) => context.reviewerPass).sort(), ["A", "B"]);
  assert.equal(pair[0].lockedInventorySha256, pair[1].lockedInventorySha256);
  assert.equal(pair[0].lockedInventoryCanonicalSha256, pair[1].lockedInventoryCanonicalSha256);
  assert.equal(pair[0].sourcePacketSha256, pair[1].sourcePacketSha256);
}

let movesAcrossPasses = 0;
for (const context of preparation.contexts) {
  const [
    lockedInventoryBytes,
    sourcePacketBytes,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
    ledgerBytes,
    packetBytes,
    schemaBytes,
    manualBytes
  ] = await Promise.all([
    readFile(context.lockedInventory),
    readFile(context.sourcePacket),
    readFile(context.originalTranscript),
    readFile(context.originalEvents),
    readFile(context.originalManifest),
    readFile(context.fullLedger),
    readFile(context.judgmentPacket),
    readFile(context.schema),
    readFile(preparation.inputs.manual)
  ]);
  assert.equal(sha256(lockedInventoryBytes), context.lockedInventorySha256);
  assert.equal(sha256(sourcePacketBytes), context.sourcePacketSha256);
  assert.equal(sha256(transcriptBytes), context.originalTranscriptSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  assert.equal(sha256(manifestBytes), context.originalManifestSha256);
  assert.equal(sha256(ledgerBytes), context.fullLedgerSha256);
  assert.equal(sha256(packetBytes), context.judgmentPacketSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);

  const lockedInventory = JSON.parse(lockedInventoryBytes);
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assert.equal(sha256(canonicalJson(lockedInventory)), context.lockedInventoryCanonicalSha256);
  const compactPacket = makeV223CompactJudgmentPacket(
    lockedInventory,
    context.reviewerPass
  );
  assert.deepEqual(packet, compactPacket.packet);
  assert.deepEqual(context.packetCompactionAudit, compactPacket.audit);
  const compact = makeV223CompactJudgmentSchema({ packet });
  assert.deepEqual(schema, stripV223SchemaDescriptions(compact.schema));
  assert.deepEqual(context.schemaCompactionAudit, compact.audit);
  assert.equal(schemaBytes.toString("utf8").includes('"uniqueItems"'), false);
  assert.equal(packet.reviewerRole, `independent-judge-${context.reviewerPass.toLowerCase()}`);
  assert.equal(packet.judgmentBoundary.sameLockedInventoryForBothPasses, true);
  assert.equal(packet.judgmentBoundary.otherIndependentJudgmentUnavailable, true);
  assert.equal(packet.judgmentBoundary.priorAssessmentsAndScoresUnavailable, true);
  assert.equal(
    manualBytes.length + sourcePacketBytes.length + packetBytes.length + schemaBytes.length,
    context.copiedInputBytes
  );
  assert(context.copiedInputBytes <= preparation.transport.provenCeilingBytes);
  movesAcrossPasses += context.moves;
}
assert.equal(movesAcrossPasses, 394);

for (const outputPath of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);
  assert.equal(await access(outputPath).then(() => true, () => false), false);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-v2.2.3-independent-judgment-execution-manifest-model-free-only"
);

console.log(JSON.stringify({
  status: "passed",
  debates: preparation.totals.debates,
  contexts: preparation.totals.contexts,
  uniqueMoves: preparation.totals.uniqueMoves,
  movesJudgedAcrossPasses: preparation.totals.movesJudgedAcrossPasses,
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  pairwiseInventoryAndSourceIdentity: true,
  deterministicPacketAndSchemaReplay: true,
  modelContexts: 0,
  audioCalls: 0,
  scoresDerived: 0,
  nextAuthorized: "independent-judgment-execution-manifest"
}, null, 2));
