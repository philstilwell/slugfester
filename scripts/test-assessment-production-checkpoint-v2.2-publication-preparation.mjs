#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  buildCheckpointV22PublicationSchema,
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_DEBATES,
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
  CHECKPOINT_V22_PUBLICATION_PACKET_VERSION,
  CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assert.equal(
  preparation.status,
  "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen"
);
assert.equal(
  preparation.schemaVersion,
  "1.0-production-checkpoint-v2.2-publication-preparation"
);
assert.equal(preparation.protocolId, CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.AIOnly, true);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);
assert.deepEqual(
  preparation.contexts.map((context) => context.debateNumber),
  [...CHECKPOINT_V22_PUBLICATION_DEBATES]
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.contexts, 10);
assert.equal(preparation.totals.moves, 188);
assert.equal(preparation.totals.audioVerifiedMoves, 2);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.modelAuthoredScores, 0);
assert.equal(preparation.totals.scorePassesExecutedThisStage, 0);
assert.equal(preparation.totals.audioCallsThisStage, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);

assert.equal(preparation.isolation.oneDebatePerFutureContext, true);
assert.equal(preparation.isolation.separateFreshModelContextPerDebateRequired, true);
assert.equal(
  preparation.isolation.onlyWorkflowOutputContractManualPacketCatalogAndSchemaAllowed,
  true
);
assert.equal(preparation.isolation.participantJudgmentClosed, true);
assert.equal(preparation.isolation.participantJudgmentWasScoreBlind, true);
assert.equal(
  preparation.isolation.lockedScoresAvailableOnlyAsImmutableOwnDebateInputs,
  true
);
assert.equal(preparation.isolation.legacyAssessmentsUnavailable, true);
assert.equal(preparation.isolation.otherDebatesUnavailable, true);
assert.equal(preparation.isolation.failedProductionCanaryOutputsUnavailable, true);
assert.equal(preparation.isolation.validationCohortOutputsUnavailable, true);
assert.equal(preparation.isolation.rankingsUnavailable, true);
assert.equal(preparation.isolation.winnerComparisonsUnavailable, true);
assert.equal(preparation.isolation.aiExtensionPostScoringOnly, true);

assert.deepEqual(preparation.publicationContract.summaryTargetWords, [18, 28]);
assert.deepEqual(preparation.publicationContract.summaryAcceptanceWords, [8, 35]);
assert.deepEqual(preparation.publicationContract.quotationTargetWords, [6, 14]);
assert.deepEqual(preparation.publicationContract.quotationAcceptanceWords, [3, 18]);
assert.equal(
  preparation.publicationContract.quotationExactSourceSubstringRequired,
  true
);
assert.deepEqual(preparation.publicationContract.critiqueTargetWords, [112, 118]);
assert.deepEqual(preparation.publicationContract.critiqueAcceptanceWords, [105, 130]);
assert.equal(preparation.publicationContract.critiqueMinimumCharacters, 880);
assert.equal(preparation.publicationContract.critiqueMaximumCharacters, null);
assert.equal(preparation.publicationContract.critiqueSentences, 4);
assert.deepEqual(preparation.publicationContract.critiqueOrderedLabels, [
  "Strongest feature:",
  "Principal limitation:",
  "Live burden:",
  "Locked score:"
]);
assert.equal(preparation.publicationContract.terminalPunctuationRequired, true);
assert.equal(
  preparation.publicationContract.unexpectedCJKHangulOrReplacementCharactersRejected,
  true
);
assert.equal(preparation.publicationContract.tagsOptionalAndMaterialOnly, true);
assert.equal(preparation.publicationContract.aiExtensionExcludedFromScores, true);
assert.equal(preparation.publicationContract.exactBylineRequired, true);

assert(
  preparation.transport.maximumCopiedInputBytes <= preparation.transport.provenCeilingBytes
);
assert.equal(preparation.transport.provenCeilingBytes, 400000);
assert.equal(preparation.transport.critiqueMaximumCharacterConstraintAbsent, true);
assert.equal(
  preparation.transport.runtimeWordSentenceQuotationAndNoveltyValidationRequired,
  true
);
assert.equal(preparation.executionPolicyToFreezeSeparately.maximumParallelContexts, 2);
assert.deepEqual(preparation.executionPolicyToFreezeSeparately.schedulerRamp, [1, 2]);
assert.equal(preparation.executionPolicyToFreezeSeparately.attemptsPerContextMaximum, 1);
assert.equal(preparation.executionPolicyToFreezeSeparately.retriesMaximum, 0);
assert.equal(preparation.executionPolicyToFreezeSeparately.correctionContextsMaximum, 0);
assert.equal(preparation.executionPolicyToFreezeSeparately.APIKeysRemoved, true);

assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(preparation.authorization.publicationExecutionManifestPreparation, true);
for (const key of [
  "publicationModelExecution",
  "retry",
  "correctionModelExecution",
  "deterministicCompilation",
  "publicationFinalization",
  "renderingVerification",
  "productionMutation",
  "remainingProductionBatches"
]) {
  assert.equal(preparation.authorization[key], false, `${key} must remain unauthorized`);
}

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
for (const [pathKey, hashKey] of [
  ["productionManifest", "productionManifestSha256"],
  ["cohortSelection", "cohortSelectionSha256"],
  ["finalLedger", "finalLedgerSha256"],
  ["finalLedgerManifest", "finalLedgerManifestSha256"],
  ["finalLedgerAnalysis", "finalLedgerAnalysisSha256"],
  ["calculatedScores", "calculatedScoresSha256"],
  ["scoreManifest", "scoreManifestSha256"],
  ["scorePreparation", "scorePreparationSha256"],
  ["scoreAnalysis", "scoreAnalysisSha256"],
  ["audioAudit", "audioAuditSha256"],
  ["outputContract", "outputContractSha256"],
  ["manual", "manualSha256"],
  ["referenceCatalog", "referenceCatalogSha256"]
]) {
  assert.equal(
    sha256(await readFile(preparation.inputs[pathKey])),
    preparation.inputs[hashKey],
    `${pathKey}: input hash changed`
  );
}

let moves = 0;
let audioVerifiedMoves = 0;
for (const context of preparation.contexts) {
  const [packetBytes, schemaBytes, sourcePacketBytes, transcriptBytes, eventsBytes, manifestBytes] =
    await Promise.all([
      readFile(context.packet),
      readFile(context.schema),
      readFile(context.sourcePacket),
      readFile(context.transcript),
      readFile(context.events),
      readFile(context.localManifest)
    ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(sha256(sourcePacketBytes), context.sourcePacketSha256);
  assert.equal(sha256(transcriptBytes), context.transcriptSha256);
  assert.equal(sha256(eventsBytes), context.eventsSha256);
  assert.equal(sha256(manifestBytes), context.localManifestSha256);
  assert.equal(
    preparation.transport.sharedCopiedInputBytes + packetBytes.length + schemaBytes.length,
    context.copiedInputBytes
  );
  assert(context.copiedInputBytes <= preparation.transport.provenCeilingBytes);

  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  const sourcePacket = JSON.parse(sourcePacketBytes);
  assert.equal(packet.schemaVersion, CHECKPOINT_V22_PUBLICATION_PACKET_VERSION);
  assert.equal(packet.protocolId, CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.equal(packet.productionCanary, true);
  assert.equal(packet.stagingOnly, true);
  assert.equal(packet.sourceChain.transcriptSha256, context.transcriptSha256);
  assert.equal(packet.sourceChain.eventsSha256, context.eventsSha256);
  assert.equal(packet.sourceChain.localManifestSha256, context.localManifestSha256);
  assert.equal(sourcePacket.debateId, context.debateId);
  assert.equal(packet.moves.length, context.moves);
  assert.equal(packet.sections.length, context.sections);
  assert.equal(
    packet.moves.filter((move) => move.quoteEligible).length,
    context.quoteEligibleMoves
  );
  assert.equal(
    packet.moves.filter((move) => move.audioVerified).length,
    context.audioVerifiedMoves
  );
  assert(packet.moves.every((move) => Number.isInteger(move.finalScore)));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.sourceExact === true));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.wholeWordBoundaries === true));
  assert.equal(packet.publicationBoundary.participantJudgmentClosed, true);
  assert.equal(packet.publicationBoundary.participantJudgmentWasScoreBlind, true);
  assert.equal(packet.publicationBoundary.scoresLocked, true);
  assert.equal(packet.publicationBoundary.legacyAssessmentUnavailable, true);
  assert.equal(packet.publicationBoundary.otherDebatesUnavailable, true);
  assert.equal(packet.publicationBoundary.aiExtensionNeverScored, true);
  assert.deepEqual(schema, buildCheckpointV22PublicationSchema(packet));
  assert.equal(schema.properties.moveProse.properties[packet.moves[0].moveId].properties.critique.minLength, 880);
  assert.equal(
    Object.hasOwn(
      schema.properties.moveProse.properties[packet.moves[0].moveId].properties.critique,
      "maxLength"
    ),
    false
  );
  assert.equal(schema.properties.displayContract.properties.byline.const, CHECKPOINT_V22_PUBLICATION_BYLINE);
  assert.equal(schema.properties.aiExtension.properties.disclaimer.const, CHECKPOINT_V22_PUBLICATION_DISCLOSURE);
  assert.equal(schema.properties.overallCommentary.properties.pro.properties.blunders.items.properties.tags.minItems, undefined);
  moves += context.moves;
  audioVerifiedMoves += context.audioVerifiedMoves;
}
assert.equal(moves, 188);
assert.equal(audioVerifiedMoves, 2);

for (const outputPath of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(preparation.sourceHashes, outputPath), false);
  assert.equal(await exists(outputPath), false, `${outputPath}: future output already exists`);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-production-checkpoint-v2.2-publication-execution-manifest-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.totals.debates,
      contexts: preparation.totals.contexts,
      moves: preparation.totals.moves,
      sections: preparation.totals.sections,
      quoteEligibleMoves: preparation.totals.quoteEligibleMoves,
      audioVerifiedMoves: preparation.totals.audioVerifiedMoves,
      maximumCopiedInputKilobytes: Math.round(
        preparation.totals.maximumCopiedInputBytes / 1000
      ),
      exactSourceAndSchemaReplay: true,
      modelContexts: 0,
      modelAuthoredScores: 0,
      nextAuthorized: "publication-execution-manifest-preparation"
    },
    null,
    2
  )
);
