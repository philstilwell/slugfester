#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/source-preparation";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(
  await readFile(`${ROOT}/preparation-manifest.json`, "utf8")
);
const master = JSON.parse(
  await readFile(preparation.inputs.validationManifest, "utf8")
);
const selection = JSON.parse(
  await readFile(preparation.inputs.selection, "utf8")
);

assert.equal(
  preparation.status,
  "fresh-ten-debate-v2-validation-source-and-discovery-packets-prepared"
);
assert.equal(preparation.developmentValidationOnly, true);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.partitionedDiscoveryDebates, 10);
assert.equal(
  preparation.totals.directSizedSources +
    preparation.totals.partitionMediumSources +
    preparation.totals.partitionHeavySources,
  10
);
assert.equal(
  preparation.totals.ownershipBoundedSchemas,
  preparation.totals.discoveryContexts
);
assert.equal(
  preparation.totals.speakerAllowlistedSchemas,
  preparation.totals.discoveryContexts
);
assert.equal(preparation.totals.sourceEvents, selection.totals.eventCount);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.currentCanaryDisposition.reclassified, false);
assert.equal(
  preparation.currentCanaryDisposition.status,
  "failed-under-frozen-exact-rounded-winner-rule"
);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.deepEqual(preparation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  meteredApiCostUsdMaximum: 0,
});
assert.equal(master.authorization.sourcePreparationPacketPreparation, true);
assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(preparation.authorization.discoveryExecutionManifest, true);
for (const key of [
  "discoveryModelExecution",
  "inventoryModelExecution",
  "independentJudgmentModelExecution",
  "paidTranscription",
  "audioVerification",
  "adjudicationModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(preparation.authorization[key], false, `${key} must be false`);
}

for (const [file, expectedHash] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), expectedHash, `${file}: source drift`);
}

const selectedByNumber = new Map(
  selection.selected.map((debate) => [debate.debateNumber, debate])
);
const prohibitedPacketKeys = new Set([
  "assessment",
  "assessmentModel",
  "assessmentRubric",
  "logicalExtension",
  "overall",
  "score",
  "scores",
  "sections",
  "tags",
  "winner",
]);

function assertNoProhibitedKeys(value, location = "packet") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoProhibitedKeys(item, `${location}[${index}]`)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert(!prohibitedPacketKeys.has(key), `${location}.${key}: prohibited field`);
    assertNoProhibitedKeys(child, `${location}.${key}`);
  }
}

for (const context of preparation.contexts) {
  const frozen = selectedByNumber.get(context.debateNumber);
  assert(frozen, `${context.debateNumber}: missing from frozen selection`);
  const [
    packetBytes,
    planBytes,
    fullLedgerBytes,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
  ] = await Promise.all([
    readFile(context.packet),
    readFile(context.plan),
    readFile(context.fullLedger),
    readFile(context.originalTranscript),
    readFile(context.originalEvents),
    readFile(context.originalManifest),
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(planBytes), context.planSha256);
  assert.equal(sha256(fullLedgerBytes), context.fullLedgerSha256);
  assert.equal(sha256(transcriptBytes), context.originalTranscriptSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  assert.equal(sha256(manifestBytes), context.originalManifestSha256);
  assert.equal(
    context.originalTranscriptSha256,
    frozen.sourceChain.transcriptSha256
  );
  assert.equal(context.originalEventsSha256, frozen.sourceChain.eventsSha256);
  assert.equal(
    context.originalManifestSha256,
    frozen.sourceChain.manifestSha256
  );

  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  assert.deepEqual(
    Object.keys(packet).sort(),
    [
      "debateId",
      "debateNumber",
      "durationSeconds",
      "eventCount",
      "modelInputBoundary",
      "motion",
      "protocolId",
      "schemaVersion",
      "sides",
      "sourceChain",
      "transportChain",
    ].sort()
  );
  assertNoProhibitedKeys(packet);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.equal(packet.eventCount, context.sourceEvents);
  assert.equal(packet.modelInputBoundary.scoreBlindDiscoveryOnly, true);
  assert.equal(packet.modelInputBoundary.stagingOnlyIntermediateOutput, true);
  assert.equal(packet.modelInputBoundary.developmentValidationOnly, true);
  assert.equal(
    packet.modelInputBoundary
      .legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable,
    true
  );
  assert.equal(validateV42219PartitionPlan(plan, fullLedgerBytes).status, "passed");
  assert(plan.chunks.length >= 2);
  assert.equal(plan.chunks.length, context.chunks.length);

  const rebuilt = buildProductionCanarySourcePacket({
    debate: {
      ...frozen,
      sourceEventCount: frozen.eventCount,
    },
    transcriptPath: context.originalTranscript,
    eventsPath: context.originalEvents,
    manifestPath: context.originalManifest,
    sourceLedgerPath: context.fullLedger,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
  });
  assert(
    rebuilt.sourceLedgerBytes.equals(fullLedgerBytes),
    `${context.debateNumber}: compact ledger replay failed`
  );
  assert.deepEqual(rebuilt.sourceProjection, context.sourceProjection);

  const expectedSpeakers = [
    ...new Set([...packet.sides.pro.speakers, ...packet.sides.con.speakers]),
  ];
  assert.equal(expectedSpeakers.length, 2);
  for (const chunk of context.chunks) {
    const [chunkBytes, schemaBytes] = await Promise.all([
      readFile(chunk.chunkLedgerPath),
      readFile(chunk.schemaPath),
    ]);
    assert.equal(sha256(chunkBytes), chunk.chunkLedgerSha256);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    assert.equal(
      validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).status,
      "passed"
    );
    const schema = JSON.parse(schemaBytes);
    const span = schema.properties.candidates.items.properties.sourceSpan.properties;
    assert.equal(span.startEvent.minimum, chunk.coreStartEvent);
    assert.equal(span.startEvent.maximum, chunk.coreEndEvent);
    assert.equal(span.endEvent.minimum, chunk.contextStartEvent);
    assert.equal(span.endEvent.maximum, chunk.contextEndEvent);
    assert.deepEqual(
      schema.properties.candidates.items.properties.speaker.enum,
      expectedSpeakers
    );
    assert.equal(schema.properties.calibrationOnly.const, true);
    assert.equal(schema.properties.completeCoreReviewed.const, true);
  }
}

assert.equal(
  preparation.futureOutputPathsExcludedFromSourceHashes.length,
  preparation.totals.discoveryContexts
);
for (const outputPath of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.totals.debates,
      discoveryContexts: preparation.totals.discoveryContexts,
      sourceEvents: preparation.totals.sourceEvents,
      sourceLedgerBytes: preparation.totals.sourceLedgerBytes,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      exactSourceReplay: true,
      exactPartitionReplay: true,
      ownershipBoundedSchemas: preparation.totals.ownershipBoundedSchemas,
      speakerAllowlistedSchemas: preparation.totals.speakerAllowlistedSchemas,
      currentCanaryStillFailed: true,
      proposedPolicyPromoted: false,
      modelContexts: 0,
      audioCalls: 0,
      scoresDerived: 0,
      nextAuthorized: "discovery-execution-manifest",
    },
    null,
    2
  )
);
