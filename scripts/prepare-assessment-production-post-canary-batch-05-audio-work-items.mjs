#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildAssessmentProductionPostCanaryBatch05AudioWorkItems
} from "./lib/assessment-production-post-canary-batch-05-audio-work-items.mjs";
import {
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_05_DISAGREEMENT_PROTOCOL_ID,
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_05_DISAGREEMENT_ROOT
} from "./lib/assessment-production-post-canary-batch-05-disagreement.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const PLAN_ROOT =
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_05_DISAGREEMENT_ROOT;
const analysisPath = `${PLAN_ROOT}/analysis.json`;
const executionPreparationPath =
  `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const workPath = `${PLAN_ROOT}/audio-work-items.json`;
const preparationPath = `${PLAN_ROOT}/audio-work-item-preparation.json`;
const productionManifestPath = "docs/assessment-production/manifest-v1.json";
const activePolicyPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const EXPECTED_DEBATES = [
  "158",
  "46",
  "64",
  "132",
  "189",
  "109",
  "179",
  "05",
  "42",
  "59"
];
const EXPECTED_AUDIO = [
  "158:con-no-presented-extrabiblical-support",
  "158:con-unverified-resurrection-prior",
  "158:pro-case-specific-extraordinary-testimony-standard",
  "189:con-simple-laws-beneath-cell-complexity",
  "05:con-logical-grounding-burden",
  "05:pro-logic-reflects-gods-thinking"
];
const standingAuthorization =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();
const USER_AUTHORIZATION = Object.freeze({
  instruction: standingAuthorization.record.userAuthorization.instruction,
  standingAuthorizationPath: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  standingAuthorizationSha256: standingAuthorization.sha256,
  directIncrementalCostUsdMaximum: 0,
  conditionalPaidAudioMaximumUsd: 1,
  workItemsAuthorized: 6,
  audioAccessAuthorizedForNextStage: true,
  audioDownloadAuthorizedForNextStage: true,
  audioPlaybackAuthorized: false,
  modelExecutionAuthorized: false,
  paidServicesAuthorized: false,
  adjudicationAuthorized: false,
  scoreDerivationAuthorized: false,
  publicationReconstructionAuthorized: false,
  productionMutationAuthorized: false,
  nextBatchSelectionAuthorized: false
});
const TOOL_SOURCES = [
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-disagreement.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v4221173-decomposed-disagreement.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const queueKey = ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`;

if (shouldWrite) {
  assertV4(
    !(await exists(workPath)) && !(await exists(preparationPath)),
    "frozen Batch 5 audio work-item artifacts already exist"
  );
}

const [
  analysisBytes,
  executionPreparationBytes,
  productionManifestBytes,
  activePolicyBytes
] = await Promise.all([
  readFile(analysisPath),
  readFile(executionPreparationPath),
  readFile(productionManifestPath),
  readFile(activePolicyPath)
]);
const analysis = JSON.parse(analysisBytes);
const executionPreparation = JSON.parse(executionPreparationBytes);
const productionManifest = JSON.parse(productionManifestBytes);

assertV4(
  analysis.status ===
      "post-canary-batch-05-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work" &&
    analysis.authorization.audioWorkPreparation === true &&
    analysis.nextAuthorizedAction ===
      "prepare-freeze-and-analyze-batch-05-local-audio-source-work-items-under-standing-authorization",
  "Batch 5 disagreement gate or prior audio-work stop rule changed"
);
assertV4(
  analysis.audioWorkload.moves === 6 &&
    analysis.audioWorkload.workItemsPrepared === false &&
    analysis.audioWorkload.sourceAudioPrepared === false &&
    analysis.audioWorkload.audioAccessed === false,
  "Batch 5 six-move audio queue or preparation boundary changed"
);
assertV4(
  analysis.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    analysis.sourceCompatibility.sourceRowsInjected === 0 &&
    analysis.sourceCompatibility.sourceRowsOmitted === 0 &&
    analysis.sourceCompatibility.sourceRowsRewritten === 0 &&
    analysis.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
      false &&
    analysis.sourceCompatibility.occurrences?.length === 0,
  "Batch 5 source-compatibility evidence changed"
);
assertV4(
  executionPreparation.contexts.length === 20 &&
    JSON.stringify(
      executionPreparation.contexts
        .filter((context) => context.reviewerPass === "A")
        .map((context) => context.debateNumber)
    ) === JSON.stringify(EXPECTED_DEBATES),
  "Batch 5 execution-preparation population changed"
);
assertV4(
  productionManifest.schemaVersion ===
      "1.0-adjudicated-consensus-production-manifest" &&
    productionManifest.model.slug === "gpt-5.6-sol" &&
    productionManifest.model.reasoningEffort === "low" &&
    productionManifest.model.authentication === "ChatGPT subscription" &&
    productionManifest.boundaries.mediumConfidenceAudioRequired === true &&
    productionManifest.boundaries.scoresAfterAdjudicationOnly === true,
  "production manifest identity or audio/score boundary changed"
);
assertV4(
  sha256(activePolicyBytes) === analysis.activePolicy.promotionSha256 &&
    analysis.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    analysis.validatedInventoryContract.scoreFieldsAvailable === false,
  "active score-blind v2.2 policy changed"
);

const sourceHashes = {
  [analysisPath]: sha256(analysisBytes),
  [executionPreparationPath]: sha256(executionPreparationBytes),
  [productionManifestPath]: sha256(productionManifestBytes),
  [activePolicyPath]: sha256(activePolicyBytes),
  [POST_CANARY_BATCH_05_STANDING_AUTHORIZATION]: standingAuthorization.sha256
};
for (const file of TOOL_SOURCES) sourceHashes[file] = sha256(await readFile(file));

const audioWorkItems = [];
const sourceSummaries = [];

for (const debateNumber of EXPECTED_DEBATES) {
  const context = executionPreparation.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  assertV4(context, `Debate ${debateNumber}: Pass A context missing`);
  const paths = {
    primaryA: `${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debateNumber}.json`,
    primaryB: `${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debateNumber}.json`,
    lockedInventory: context.lockedInventory,
    sourcePacket: context.sourcePacket,
    events: context.originalEvents,
    disagreements: `${PLAN_ROOT}/disagreements/debate-${debateNumber}.json`
  };
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [
      key,
      file,
      await readFile(file)
    ])
  );
  const inputs = Object.fromEntries(
    entries.map(([key, , bytes]) => [key, JSON.parse(bytes)])
  );
  for (const [, file, bytes] of entries) sourceHashes[file] = sha256(bytes);

  const debateAnalysis = analysis.debates.find(
    (debate) => debate.debateNumber === debateNumber
  );
  assertV4(
    sourceHashes[paths.primaryA] === analysis.sourceHashes[paths.primaryA] &&
      sourceHashes[paths.primaryB] === analysis.sourceHashes[paths.primaryB] &&
      sourceHashes[paths.lockedInventory] ===
        analysis.sourceHashes[paths.lockedInventory] &&
      sourceHashes[paths.disagreements] ===
        debateAnalysis?.disagreementSha256,
    `Debate ${debateNumber}: frozen judgment, inventory, or disagreement hash changed`
  );
  assertV4(
    sourceHashes[paths.lockedInventory] === context.lockedInventorySha256 &&
      sourceHashes[paths.sourcePacket] === context.sourcePacketSha256 &&
      sourceHashes[paths.events] === context.originalEventsSha256,
    `Debate ${debateNumber}: frozen metadata source hash changed`
  );
  assertV4(
    paths.events === inputs.sourcePacket.sourceChain.eventsPath &&
      sourceHashes[paths.events] ===
        inputs.sourcePacket.sourceChain.eventsSha256,
    `Debate ${debateNumber}: source-packet event chain changed`
  );

  const workItems =
    buildAssessmentProductionPostCanaryBatch05AudioWorkItems(
      inputs.primaryA,
      inputs.primaryB,
      inputs.lockedInventory,
      inputs.events,
      inputs.sourcePacket
    );
  assertV4(
    JSON.stringify(workItems.map((item) => item.moveId)) ===
      JSON.stringify(inputs.disagreements.audioVerificationMoveIds),
    `Debate ${debateNumber}: disagreement audio population changed`
  );

  if (workItems.length > 0) {
    const sourceChain = inputs.sourcePacket.sourceChain;
    const [transcriptBytes, manifestBytes] = await Promise.all([
      readFile(sourceChain.transcriptPath),
      readFile(sourceChain.localManifestPath)
    ]);
    sourceHashes[sourceChain.transcriptPath] = sha256(transcriptBytes);
    sourceHashes[sourceChain.localManifestPath] = sha256(manifestBytes);
    assertV4(
      sourceHashes[sourceChain.transcriptPath] === sourceChain.transcriptSha256 &&
        sourceHashes[sourceChain.localManifestPath] ===
          sourceChain.localManifestSha256,
      `Debate ${debateNumber}: canonical local text/metadata chain changed`
    );
    assertV4(
      sourceHashes[sourceChain.transcriptPath] ===
          context.originalTranscriptSha256 &&
        sourceHashes[sourceChain.localManifestPath] ===
          context.originalManifestSha256,
      `Debate ${debateNumber}: execution text/metadata chain changed`
    );
    sourceSummaries.push({
      debateNumber,
      debateId: inputs.primaryA.debateId,
      sourceVideoId: workItems[0].sourceVideoId,
      transcriptPath: sourceChain.transcriptPath,
      eventsPath: sourceChain.eventsPath,
      localManifestPath: sourceChain.localManifestPath,
      eventCount: inputs.events.length,
      queuedMoves: workItems.length
    });
  }
  audioWorkItems.push(...workItems);
}

const expectedQueue = analysis.audioWorkload.queue.map(queueKey).sort();
const actualQueue = audioWorkItems.map(queueKey).sort();
assertV4(
  JSON.stringify(expectedQueue) === JSON.stringify([...EXPECTED_AUDIO].sort()) &&
    JSON.stringify(actualQueue) === JSON.stringify(expectedQueue),
  "Batch 5 exact six-move audio queue was not reproduced"
);
assertV4(
  audioWorkItems.length === 6 &&
    sourceSummaries.length === 3 &&
    audioWorkItems.every(
      (item) =>
        item.audioVerificationRequiredBeforeAdjudication &&
        (item.trigger.eitherPassAssessmentBelowHigh ||
          item.trigger.eitherPassAttributionBelowHigh) &&
        item.clipWindow.paddingMs === 2500 &&
        item.clipWindow.endMs > item.clipWindow.startMs &&
        !("sourceAudio" in item) &&
        !("clipPath" in item) &&
        !("audioVerificationResult" in item)
    ),
  "Batch 5 work-item trigger, count, or metadata-only boundary changed"
);

const workDocument = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-work-items",
  protocolId:
    ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_05_DISAGREEMENT_PROTOCOL_ID,
  status:
    "prepared-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  userAuthorization: USER_AUTHORIZATION,
  moves: audioWorkItems,
  mediaFilesAccessed: 0,
  audioFilesDownloaded: 0,
  audioFilesPlayed: 0,
  sourceAudioPrepared: false,
  audioVerificationCompleted: false,
  modelOrApiCallsMade: 0,
  paidServiceCallsMade: 0,
  scoresDerived: 0,
  authorization: {
    localAudioSourcePreparation: true,
    audioAccess: true,
    audioDownload: true,
    audioPlayback: false,
    paidTranscription: false,
    audioVerification: false,
    adjudication: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
const workBytes = Buffer.from(`${JSON.stringify(workDocument, null, 2)}\n`);
const totalClipSeconds = audioWorkItems.reduce(
  (sum, item) =>
    sum + (item.clipWindow.endMs - item.clipWindow.startMs) / 1000,
  0
);
const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-work-item-preparation",
  protocolId:
    ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_05_DISAGREEMENT_PROTOCOL_ID,
  status:
    "prepared-and-frozen-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: USER_AUTHORIZATION,
  inputBoundary: {
    frozenJudgmentsInventoriesAndDisagreementsReplayed: true,
    localTranscriptTextHashesVerifiedForQueuedDebates: true,
    localEventMetadataReadForTimestampWindows: true,
    localManifestHashesVerifiedForQueuedDebates: true,
    mediaFilesAccessed: 0,
    networkAccessUsed: false,
    audioDownloaded: false,
    audioPlayed: false,
    audioClaimsMade: 0
  },
  sourceDisagreementAnalysis: analysisPath,
  sourceJudgmentConfiguration: analysis.sourceJudgmentConfiguration,
  sourceCompatibility: structuredClone(analysis.sourceCompatibility),
  sourceHashes,
  workArtifact: {
    path: workPath,
    sha256: sha256(workBytes)
  },
  sources: sourceSummaries,
  validation: {
    independentGateQueueReproducedExactly: true,
    disagreementQueueReproducedExactly: true,
    exactAuthorizedMoveCount: 6,
    canonicalLocalTextAndMetadataChainsVerified: sourceSummaries.length,
    repositoryRenderedLockedExcerpts: audioWorkItems.length,
    repositoryRenderedTimestampWindows: audioWorkItems.length,
    expectedSpeakersLocked: audioWorkItems.length,
    mediaFilesAccessed: 0,
    audioClaimsMade: 0,
    modelOrApiCallsMade: 0,
    paidServiceCallsMade: 0,
    scoresDerived: 0
  },
  totals: {
    debates: sourceSummaries.length,
    sourceVideoIds: new Set(
      sourceSummaries.map((source) => source.sourceVideoId)
    ).size,
    moves: audioWorkItems.length,
    plannedClipSeconds: Number(totalClipSeconds.toFixed(3)),
    plannedClipMinutes: Number((totalClipSeconds / 60).toFixed(4)),
    mediaFilesAccessed: 0,
    sourceDownloads: 0,
    sourceAudioFilesPrepared: 0,
    clipsPrepared: 0,
    audioFilesPlayed: 0,
    audioCalls: 0,
    paidServiceCalls: 0,
    paidTranscriptionCalls: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    meteredModelApiCostUsd: 0,
    directIncrementalCostUsd: 0,
    retries: 0,
    timeoutExtensions: 0,
    adjudicationContexts: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  activePolicy: structuredClone(analysis.activePolicy),
  validatedInventoryContract: structuredClone(
    analysis.validatedInventoryContract
  ),
  authorization: {
    localAudioSourcePreparation: true,
    audioAccess: true,
    audioDownload: true,
    audioPlayback: false,
    paidTranscriptionExecution: false,
    unexpectedPaidService: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-local-batch-05-source-audio-and-six-frozen-clips-under-standing-authorization"
};

if (shouldWrite) {
  await mkdir(PLAN_ROOT, { recursive: true });
  await writeFile(workPath, workBytes);
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: preparation.status,
      wroteArtifacts: shouldWrite,
      checkpointCommit: preparation.checkpointCommit,
      sources: sourceSummaries,
      moves: audioWorkItems.map((item) => ({
        debateNumber: item.debateNumber,
        moveId: item.moveId,
        sourceVideoId: item.sourceVideoId,
        expectedSpeaker: item.expectedSpeaker,
        clipWindow: item.clipWindow,
        trigger: item.trigger
      })),
      sourceHashes: Object.keys(sourceHashes).length,
      plannedClipMinutes: preparation.totals.plannedClipMinutes,
      mediaFilesAccessed: 0,
      audioFilesDownloaded: 0,
      audioFilesPlayed: 0,
      modelOrApiCallsMade: 0,
      paidServiceCallsMade: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
