#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_MODEL,
  makeV212DiscoverySchema,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  buildBatch15TokenCountedChunkLedger,
  findBatch15ZeroLexicalTokenRows,
} from "./lib/assessment-production-post-canary-batch-15-source-preparation.mjs";
import {
  buildV42219ChunkLedger,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const validatedIndex = process.argv.indexOf("--validated-at");
const validatedAt = validatedIndex >= 0 ? process.argv[validatedIndex + 1] : null;
if (shouldWrite) assert(validatedAt && !Number.isNaN(Date.parse(validatedAt)), "--validated-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-15/source-preparation";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const VALIDATION = `${ROOT}/validation.json`;
const REQUIRED_ORDER = ["39", "48", "23", "162", "86", "159", "128", "98", "155", "178"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const preparationBytes = await readFile(PREPARATION);
const preparation = JSON.parse(preparationBytes);
const selection = JSON.parse(await readFile(preparation.inputs.selection));
assert.equal(preparation.status, "post-canary-batch-15-ten-complete-score-blind-source-packets-prepared-awaiting-validation");
assert.equal(preparation.productionContinuation, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.branch, "main");
assert.deepEqual(preparation.contexts.map((context) => context.debateNumber), REQUIRED_ORDER);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.sides, 20);
assert.equal(preparation.totals.sourceEvents, selection.totals.eventCount);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.activePolicy.modelAuthoredScoresAllowed, false);
assert.equal(preparation.activePolicy.automaticRerunAllowed, false);
assert.equal(preparation.activePolicy.roundedIntegerScoreTiesPermitted, true);
assert.equal(preparation.tokenLedgerCompatibility.minimumCandidateLexicalTokensChanged, false);
assert.equal(preparation.tokenLedgerCompatibility.sourceRowsInjected, 0);
assert.equal(preparation.tokenLedgerCompatibility.sourceRowsOmitted, 0);
assert.equal(preparation.tokenLedgerCompatibility.sourceRowsRewritten, 0);
assert.equal(
  preparation.tokenLedgerCompatibility.occurrences.length,
  preparation.totals.zeroLexicalTokenRowOccurrences,
);
assert.deepEqual(preparation.model, {
  ...V212_DISCOVERY_MODEL,
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  apiKeysRemovedForFutureExecution: true,
  roundedIntegerScoreTiesPermitted: true,
  modelContextsExecuted: 0,
  meteredApiCostUsdMaximum: 0,
});
assert.equal(preparation.isolation.passAAndPassBUseFreshIsolatedContexts, true);
assert.equal(preparation.isolation.passAAndPassBReceiveSameLockedScoreBlindPacket, true);
assert.equal(preparation.isolation.otherPassOutputsUnavailable, true);
assert.equal(preparation.isolation.otherDebateOutputsUnavailable, true);
assert.deepEqual(preparation.stageConcurrency, { discovery: 4, inventory: 2, judgments: 2, audio: 2, adjudication: 2, publication: 2 });
for (const group of Object.values(preparation.stopRules)) assert.equal(Object.values(group).every(Boolean), true);
for (const field of [
  "modelContextsExecuted",
  "retries",
  "timeoutExtensions",
  "semanticCorrections",
  "audioCalls",
  "judgmentPasses",
  "scoresDerived",
  "publicationContexts",
  "productionMutations",
  "meteredApiCostUsd",
  "transcriptionCostUsd",
]) assert.equal(preparation.totals[field], 0, `${field}: must be zero`);
assert.equal(preparation.authorization.sourcePacketPreparation, true);
assert.equal(preparation.authorization.deterministicValidation, true);
for (const [key, value] of Object.entries(preparation.authorization)) {
  if (!["sourcePacketPreparation", "deterministicValidation"].includes(key)) assert.equal(value, false, `${key}: must remain unauthorized`);
}
for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: frozen source drift`);

const prohibitedPacketKeys = new Set([
  "assessment",
  "assessmentRubric",
  "blunders",
  "critique",
  "logicalExtension",
  "overall",
  "overallCommentary",
  "score",
  "scores",
  "sections",
  "strengths",
  "tags",
  "winner",
]);
function assertNoProhibitedKeys(value, location = "packet") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoProhibitedKeys(item, `${location}[${index}]`));
  for (const [key, child] of Object.entries(value)) {
    assert(!prohibitedPacketKeys.has(key), `${location}.${key}: prohibited score or publication material`);
    assertNoProhibitedKeys(child, `${location}.${key}`);
  }
}
function assertNoPropertyNamed(value, prohibited, location = "schema") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.notEqual(key, prohibited, `${location}.${key}: prohibited`);
    assertNoPropertyNamed(child, prohibited, `${location}.${key}`);
  }
}

const selectedByNumber = new Map(selection.selected.map((debate) => [debate.debateNumber, debate]));
let replayedTokenRows = 0;
let replayedSourceEvents = 0;
for (const context of preparation.contexts) {
  const frozen = selectedByNumber.get(context.debateNumber);
  assert(frozen, `${context.debateNumber}: absent from frozen Batch 15 selection`);
  const [packetBytes, planBytes, fullLedgerBytes, transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([
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
  assert.equal(context.originalTranscriptSha256, frozen.sourceChain.transcriptSha256);
  assert.equal(context.originalEventsSha256, frozen.sourceChain.eventsSha256);
  assert.equal(context.originalManifestSha256, frozen.sourceChain.manifestSha256);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  assertNoProhibitedKeys(packet);
  assert.equal(packet.schemaVersion, "1.0-assessment-production-post-canary-batch-15-score-blind-source-packet");
  assert.equal(packet.protocolId, preparation.protocolId);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.eventCount, context.sourceEvents);
  assert.equal(packet.modelInputBoundary.scoreBlindDiscoveryOnly, true);
  assert.equal(packet.modelInputBoundary.postCanaryProductionBatch, true);
  assert.equal(packet.modelInputBoundary.productionCanary, false);
  assert.equal(packet.modelInputBoundary.developmentValidationOnly, false);
  assert.equal(packet.modelInputBoundary.minimumLexicalTokens, V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS);
  assert.equal(packet.modelInputBoundary.requestedLexicalTokensProhibited, true);
  assert.equal(packet.modelInputBoundary.legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable, true);
  assert.equal(validateV42219PartitionPlan(plan, fullLedgerBytes).status, "passed");
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
  replayedSourceEvents += context.sourceEvents;
  const expectedSpeakers = [...packet.sides.pro.speakers, ...packet.sides.con.speakers];
  assert.equal(expectedSpeakers.length, 2);
  assert.equal(new Set(expectedSpeakers).size, 2);
  for (const chunk of context.chunks) {
    const [chunkBytes, tokenBytes, schemaBytes] = await Promise.all([
      readFile(chunk.chunkLedgerPath),
      readFile(chunk.tokenCountedLedgerPath),
      readFile(chunk.schemaPath),
    ]);
    assert.equal(sha256(chunkBytes), chunk.chunkLedgerSha256);
    assert.equal(sha256(tokenBytes), chunk.tokenCountedLedgerSha256);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    assert.equal(validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).status, "passed");
    assert(buildV42219ChunkLedger(fullLedgerBytes, chunk).equals(chunkBytes));
    assert(buildBatch15TokenCountedChunkLedger(chunkBytes).equals(tokenBytes));
    assert.deepEqual(
      chunk.zeroLexicalTokenRows,
      findBatch15ZeroLexicalTokenRows(chunkBytes).map(({ eventIndex, startMs, durationMs, text }) => ({
        eventIndex,
        startMs,
        durationMs,
        textSha256: sha256(text),
      })),
    );
    replayedTokenRows += tokenBytes.toString("utf8").trim().split("\n").filter(Boolean).length;
    const schema = JSON.parse(schemaBytes);
    assert.deepEqual(schema, makeV212DiscoverySchema({ packet, chunk, candidatesMaximum: plan.limits.candidatesPerChunkMaximum }));
    assertNoPropertyNamed(schema, "requestedLexicalTokens");
    const candidate = schema.properties.candidates.items;
    const sourceWindow = candidate.properties.sourceWindow;
    assert.deepEqual(sourceWindow.required, ["startEvent", "endEvent"]);
    assert.equal(sourceWindow.properties.startEvent.minimum, chunk.coreStartEvent);
    assert.equal(sourceWindow.properties.startEvent.maximum, chunk.coreEndEvent);
    assert.equal(sourceWindow.properties.endEvent.maximum, chunk.contextEndEvent);
    assert.deepEqual(candidate.properties.speaker.enum, expectedSpeakers);
    assert.equal(schema.properties.assessmentModel.const, "5.6 Sol");
    assert.equal(schema.properties.calibrationOnly.const, true);
  }
}
assert.equal(replayedSourceEvents, preparation.totals.sourceEvents);
assert.equal(replayedTokenRows, preparation.totals.tokenCountedLedgerRows);
assert.equal(preparation.futureArtifactsExcludedFromSourceHashes.discoveryOutputs.length, preparation.totals.discoveryContexts);
for (const outputPath of preparation.futureArtifactsExcludedFromSourceHashes.discoveryOutputs) assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);

const validation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-source-preparation-validation",
  protocolId: preparation.protocolId,
  status: "post-canary-batch-15-score-blind-source-packet-validation-passed-frozen-under-standing-authorization",
  validatedAt: shouldWrite ? validatedAt : null,
  preparationManifest: {
    path: PREPARATION,
    bytes: preparationBytes.length,
    sha256: sha256(preparationBytes),
    status: preparation.status,
  },
  selectedDebates: REQUIRED_ORDER,
  checks: {
    frozenSelectionReplayed: true,
    allThirtyOriginalSourceHashesReplayed: true,
    allTenLocalManifestChainsReplayed: true,
    exactCanonicalEventProjectionReplayed: true,
    exactPartitionCoverageReplayed: true,
    exactChunkLedgersReplayed: true,
    exactTokenCountedLedgersReplayed: true,
    exactZeroLexicalTokenHandlingReplayed: true,
    exactSourceRowsInjectedOmittedOrRewritten: false,
    exactChunkSchemasReplayed: true,
    frozenDyadicSpeakerAllowlistsReplayed: true,
    scoreBlindPacketKeyAuditPassed: true,
    modelBoundaryPreserved: true,
    passIsolationPreserved: true,
    activeV22PolicyAndTieRulePreserved: true,
    allInheritedStopRulesPreserved: true,
  },
  totals: {
    debates: preparation.totals.debates,
    sourceFiles: preparation.totals.debates * 3,
    sourceEvents: preparation.totals.sourceEvents,
    discoveryContexts: preparation.totals.discoveryContexts,
    tokenCountedLedgerRows: preparation.totals.tokenCountedLedgerRows,
    modelContextsExecuted: 0,
    judgmentPasses: 0,
    scoresDerived: 0,
    paidServiceCalls: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  decision: {
    sourcePacketPreparationPassed: true,
    deterministicValidationPassed: true,
    packetsFrozen: true,
    modelExecutionAttempted: false,
    judgmentModelExecutionAttempted: false,
    paidServiceAttempted: false,
    scoreDerivationAttempted: false,
    publicationReconstructionAttempted: false,
    productionMutationAttempted: false,
  },
  authorization: {
    modelExecution: false,
    judgmentModelExecution: false,
    unexpectedPaidService: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-freeze-and-activate-batch-15-discovery-execution-under-standing-authorization",
};

if (shouldWrite) {
  assert.equal(await exists(VALIDATION), false, `${VALIDATION}: immutable validation artifact already exists`);
  await writeFile(VALIDATION, `${JSON.stringify(validation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: validation.status,
  selectedDebates: validation.selectedDebates,
  totals: validation.totals,
  exactSourceReplay: true,
  exactPartitionReplay: true,
  exactTokenLedgerReplay: true,
  exactSchemaReplay: true,
  scoreBlindPacketKeyAuditPassed: true,
  modelExecutionAuthorized: false,
  directCostUsd: 0,
  nextAuthorizedAction: validation.nextAuthorizedAction,
}, null, 2));

