#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_MODEL,
  V212_DISCOVERY_PROTOCOL_ID,
  buildV212TokenCountedChunkLedger,
  makeV212DiscoverySchema,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  buildV42219ChunkLedger,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/source-preparation";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(
  await readFile(`${ROOT}/preparation-manifest.json`, "utf8")
);
const selection = JSON.parse(
  await readFile(preparation.inputs.selection, "utf8")
);
const analysis = JSON.parse(
  await readFile(preparation.inputs.successorAnalysis, "utf8")
);

assert.equal(
  preparation.status,
  "fresh-ten-debate-v2.1.2-source-token-ledgers-and-discovery-packets-prepared"
);
assert.equal(preparation.discoveryProtocolId, V212_DISCOVERY_PROTOCOL_ID);
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
for (const field of [
  "ownershipBoundedSchemas",
  "boundedEndSchemas",
  "modelEndEventRequiringSchemas",
  "requestedTokenProhibitingSchemas",
  "deterministicTokenMinimumContexts",
  "speakerAllowlistedSchemas",
]) {
  assert.equal(preparation.totals[field], preparation.totals.discoveryContexts);
}
assert.equal(preparation.totals.sourceEvents, selection.totals.eventCount);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.semanticCorrections, 0);
assert.equal(preparation.totals.audioCalls, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(preparation.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(preparation.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(preparation.failedGateDisposition.v211DiscoveryPreservedFailed, true);
assert.equal(
  preparation.failedGateDisposition.retiredOutputsAcceptedForSuccessorEvidence,
  false
);
assert.equal(preparation.failedGateDisposition.currentCanaryReclassified, false);
assert.equal(preparation.failedGateDisposition.v21PolicyPromoted, false);
assert.equal(preparation.proposedPolicy.version, "v2.1-proposal");
assert.equal(preparation.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(preparation.successorContract.thresholdRelaxed, false);
assert.equal(preparation.successorContract.silentCandidateDeletion, false);
assert.equal(preparation.successorContract.automaticTruncation, false);
assert.equal(preparation.successorContract.automaticSemanticRepair, false);
assert.deepEqual(preparation.successorContract.sourceSelectionShape, [
  "startEvent",
  "endEvent",
]);
assert.equal(preparation.successorContract.modelAuthoredEndEvent, true);
assert.equal(
  preparation.successorContract
    .modelAuthoredEndEventStructurallyBoundedByLockedContext,
  true
);
assert.equal(preparation.successorContract.modelAuthoredLexicalTokenCount, false);
assert.equal(preparation.successorContract.repositoryDerivedLexicalTokenCount, true);
assert.equal(
  preparation.successorContract.minimumLexicalTokens,
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS
);
assert.equal(preparation.successorContract.requestedLexicalTokensRemoved, true);
assert.deepEqual(preparation.model, {
  ...V212_DISCOVERY_MODEL,
  scoreBlind: true,
  meteredApiCostUsdMaximum: 0,
});
assert.equal(selection.authorization.freshSourcePreparation, true);
assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(
  preparation.authorization.discoveryExecutionManifestPreparation,
  true
);
for (const key of [
  "discoveryModelExecution",
  "inventoryPreparation",
  "inventoryModelExecution",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "paidTranscription",
  "audioVerification",
  "adjudicationModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(preparation.authorization[key], false, `${key}: must be false`);
}
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}

const selectedByNumber = new Map(
  selection.selected.map((debate) => [debate.debateNumber, debate])
);
const prohibitedPacketKeys = new Set([
  "assessment",
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

function assertNoPropertyNamed(value, prohibited, location = "schema") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.notEqual(key, prohibited, `${location}.${key}: prohibited property`);
    assertNoPropertyNamed(child, prohibited, `${location}.${key}`);
  }
}

function validateTokenLedger(tokenBytes, chunkBytes, chunk) {
  const tokenRows = tokenBytes
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  const sourceRows = chunkBytes
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
  assert.equal(tokenRows.length, sourceRows.length);
  assert.equal(tokenRows.length, chunk.contextEvents);
  for (const [index, row] of tokenRows.entries()) {
    assert.equal(row.length, 5);
    assert.deepEqual([row[0], row[1], row[2], row[4]], sourceRows[index]);
    assert.equal(Number.isInteger(row[3]) && row[3] > 0, true);
  }
  assert.equal(tokenRows[0][0], chunk.contextStartEvent);
  assert.equal(tokenRows.at(-1)[0], chunk.contextEndEvent);
  return tokenRows.length;
}

let replayedTokenRows = 0;
for (const context of preparation.contexts) {
  const frozen = selectedByNumber.get(context.debateNumber);
  assert(frozen, `${context.debateNumber}: not in frozen selection`);
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
  const eventsDocument = JSON.parse(eventsBytes);
  assertNoProhibitedKeys(packet);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.equal(packet.eventCount, context.sourceEvents);
  assert.equal(packet.modelInputBoundary.scoreBlindDiscoveryOnly, true);
  assert.equal(packet.modelInputBoundary.stagingOnlyIntermediateOutput, true);
  assert.equal(packet.modelInputBoundary.developmentValidationOnly, true);
  assert.equal(packet.modelInputBoundary.modelAuthoredEndEventRequired, true);
  assert.equal(
    packet.modelInputBoundary.modelAuthoredEndEventBoundedByLockedContext,
    true
  );
  assert.equal(
    packet.modelInputBoundary.repositoryDerivesInclusiveWindowLexicalTokenCount,
    true
  );
  assert.equal(
    packet.modelInputBoundary.minimumLexicalTokens,
    V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS
  );
  assert.equal(
    packet.modelInputBoundary.minimumLexicalTokensDeterministicallyEnforced,
    true
  );
  assert.equal(
    packet.modelInputBoundary
      .minimumLexicalTokensStructurallyEnforcedByOutputSchema,
    false
  );
  assert.equal(packet.modelInputBoundary.requestedLexicalTokensProhibited, true);
  assert.equal(packet.modelInputBoundary.tokenCountedChunkLedgerRequired, true);
  assert.equal(
    packet.modelInputBoundary.moveBeginningInLookbehindOwnedByPredecessorChunk,
    true
  );
  assert.equal(
    packet.modelInputBoundary
      .legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable,
    true
  );
  assert.equal(
    validateV42219PartitionPlan(plan, fullLedgerBytes).status,
    "passed"
  );
  assert(plan.chunks.length >= 2);
  assert.equal(plan.chunks.length, context.chunks.length);
  const rebuilt = buildProductionCanarySourcePacket({
    debate: { ...frozen, sourceEventCount: frozen.eventCount },
    transcriptPath: context.originalTranscript,
    eventsPath: context.originalEvents,
    manifestPath: context.originalManifest,
    sourceLedgerPath: context.fullLedger,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
  });
  assert(rebuilt.sourceLedgerBytes.equals(fullLedgerBytes));
  assert.deepEqual(rebuilt.sourceProjection, context.sourceProjection);
  const expectedSpeakers = [
    ...new Set([...packet.sides.pro.speakers, ...packet.sides.con.speakers]),
  ];
  assert.equal(expectedSpeakers.length, 2);
  for (const chunk of context.chunks) {
    const [chunkBytes, tokenBytes, schemaBytes] = await Promise.all([
      readFile(chunk.chunkLedgerPath),
      readFile(chunk.tokenCountedLedgerPath),
      readFile(chunk.schemaPath),
    ]);
    assert.equal(sha256(chunkBytes), chunk.chunkLedgerSha256);
    assert.equal(sha256(tokenBytes), chunk.tokenCountedLedgerSha256);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    assert.equal(
      validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).status,
      "passed"
    );
    assert(buildV42219ChunkLedger(fullLedgerBytes, chunk).equals(chunkBytes));
    assert(buildV212TokenCountedChunkLedger(chunkBytes).equals(tokenBytes));
    replayedTokenRows += validateTokenLedger(tokenBytes, chunkBytes, chunk);
    const schema = JSON.parse(schemaBytes);
    const rebuiltSchema = makeV212DiscoverySchema({
      packet,
      chunk,
      eventsDocument,
      candidatesMaximum: plan.limits.candidatesPerChunkMaximum,
    });
    assert.deepEqual(schema, rebuiltSchema);
    assertNoPropertyNamed(schema, "requestedLexicalTokens");
    const candidate = schema.properties.candidates.items;
    const sourceWindow = candidate.properties.sourceWindow;
    assert.deepEqual(sourceWindow.required, ["startEvent", "endEvent"]);
    assert.equal(sourceWindow.additionalProperties, false);
    assert.equal(
      sourceWindow.properties.startEvent.minimum,
      chunk.coreStartEvent
    );
    assert.equal(
      sourceWindow.properties.startEvent.maximum,
      chunk.coreEndEvent
    );
    assert.equal(
      sourceWindow.properties.endEvent.minimum,
      chunk.coreStartEvent
    );
    assert.equal(
      sourceWindow.properties.endEvent.maximum,
      chunk.contextEndEvent
    );
    assert.deepEqual(candidate.properties.speaker.enum, expectedSpeakers);
    assert.equal(schema.properties.assessmentModel.const, "5.6 Sol");
    assert.equal(schema.properties.calibrationOnly.const, true);
    assert.equal(schema.properties.completeCoreReviewed.const, true);
  }
}

assert.equal(replayedTokenRows, preparation.totals.tokenCountedLedgerRows);
assert.equal(
  preparation.futureOutputPathsExcludedFromSourceHashes.length,
  preparation.totals.discoveryContexts
);
for (const outputPath of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "freeze-v2.1.2-discovery-execution-manifest-model-free-only"
);
assert.equal(
  analysis.status,
  "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.totals.debates,
      discoveryContexts: preparation.totals.discoveryContexts,
      sourceEvents: preparation.totals.sourceEvents,
      sourceLedgerBytes: preparation.totals.sourceLedgerBytes,
      tokenCountedLedgerRows: preparation.totals.tokenCountedLedgerRows,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      exactSourceReplay: true,
      exactPartitionReplay: true,
      exactTokenLedgerReplay: true,
      exactSchemaReplay: true,
      modelContextsExecuted: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
