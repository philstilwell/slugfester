#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildAssessmentProductionScoreStabilityV213AudioWorkItems
} from "./lib/assessment-production-score-stability-v2.1.3-audio-work-items.mjs";
import {
  ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_PROTOCOL_ID,
  ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_ROOT
} from "./lib/assessment-production-score-stability-v2.1.3-disagreement.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const COHORT_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const PLAN_ROOT =
  ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_ROOT;
const analysisPath = `${PLAN_ROOT}/analysis.json`;
const executionPreparationPath =
  `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const workPath = `${PLAN_ROOT}/audio-work-items.json`;
const preparationPath = `${PLAN_ROOT}/audio-work-item-preparation.json`;
const EXPECTED_DEBATES = [
  "142",
  "181",
  "92",
  "172",
  "78",
  "20",
  "108",
  "29",
  "119",
  "28"
];
const TOOL_SOURCES = [
  "scripts/prepare-assessment-production-score-stability-v2.1.3-audio-work-items.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.3-audio-work-items.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.3-disagreement.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v4221173-decomposed-disagreement.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const queueKey = ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`;

if (shouldWrite) {
  assertV4(
    !(await exists(workPath)) && !(await exists(preparationPath)),
    "frozen v2.1.3 audio work-item artifacts already exist"
  );
}

const [analysisBytes, executionPreparationBytes] = await Promise.all([
  readFile(analysisPath),
  readFile(executionPreparationPath)
]);
const analysis = JSON.parse(analysisBytes);
const executionPreparation = JSON.parse(executionPreparationBytes);

assertV4(
  analysis.status ===
    "v2.1.3-deterministic-disagreements-extracted-audio-source-preparation-authorized" &&
    analysis.authorization.audioSourcePreparation &&
    analysis.nextAuthorizedAction ===
      "prepare-five-v2.1.3-local-audio-source-work-items-model-free-only",
  "v2.1.3 audio work-item preparation is not authorized"
);
assertV4(
  analysis.audioWorkload.moves === 5 &&
    analysis.audioWorkload.workItemsPrepared === false &&
    analysis.audioWorkload.audioAccessed === false,
  "v2.1.3 audio queue or preparation boundary changed"
);
assertV4(
  executionPreparation.contexts.length === 20 &&
    JSON.stringify(
      executionPreparation.contexts
        .filter((context) => context.reviewerPass === "A")
        .map((context) => context.debateNumber)
    ) === JSON.stringify(EXPECTED_DEBATES),
  "v2.1.3 execution-preparation population changed"
);

const sourceHashes = {
  [analysisPath]: sha256(analysisBytes),
  [executionPreparationPath]: sha256(executionPreparationBytes)
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
    events: context.originalEvents
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

  assertV4(
    sourceHashes[paths.primaryA] === analysis.sourceHashes[paths.primaryA] &&
      sourceHashes[paths.primaryB] === analysis.sourceHashes[paths.primaryB] &&
      sourceHashes[paths.lockedInventory] ===
        analysis.sourceHashes[paths.lockedInventory],
    `Debate ${debateNumber}: frozen judgment or inventory hash changed`
  );
  assertV4(
    sourceHashes[paths.lockedInventory] === context.lockedInventorySha256 &&
      sourceHashes[paths.sourcePacket] === context.sourcePacketSha256 &&
      sourceHashes[paths.events] === context.originalEventsSha256,
    `Debate ${debateNumber}: frozen source hash changed`
  );
  assertV4(
    paths.events === inputs.sourcePacket.sourceChain.eventsPath &&
      sourceHashes[paths.events] ===
        inputs.sourcePacket.sourceChain.eventsSha256,
    `Debate ${debateNumber}: source packet event chain changed`
  );

  const workItems =
    buildAssessmentProductionScoreStabilityV213AudioWorkItems(
      inputs.primaryA,
      inputs.primaryB,
      inputs.lockedInventory,
      inputs.events,
      inputs.sourcePacket
    );
  const disagreementPath =
    `${PLAN_ROOT}/disagreements/debate-${debateNumber}.json`;
  const disagreements = JSON.parse(await readFile(disagreementPath, "utf8"));
  assertV4(
    JSON.stringify(workItems.map((item) => item.moveId)) ===
      JSON.stringify(disagreements.audioVerificationMoveIds),
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
      `Debate ${debateNumber}: canonical local transcript chain changed`
    );
    assertV4(
      sourceHashes[sourceChain.transcriptPath] ===
        context.originalTranscriptSha256 &&
        sourceHashes[sourceChain.localManifestPath] ===
          context.originalManifestSha256,
      `Debate ${debateNumber}: execution source chain changed`
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
  JSON.stringify(actualQueue) === JSON.stringify(expectedQueue),
  "v2.1.3 five-move audio queue was not reproduced"
);
assertV4(
  audioWorkItems.every(
    (item) =>
      item.audioVerificationRequiredBeforeAdjudication &&
      (item.trigger.eitherPassAssessmentBelowHigh ||
        item.trigger.eitherPassAttributionBelowHigh) &&
      item.clipWindow.paddingMs === 2500 &&
      item.clipWindow.endMs > item.clipWindow.startMs
  ),
  "v2.1.3 audio work-item trigger or clip-window contract changed"
);

const workDocument = {
  schemaVersion: "1.0-score-stability-v2.1.3-audio-work-items",
  protocolId:
    ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_PROTOCOL_ID,
  status: "prepared-five-v2.1.3-local-audio-source-work-items",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  moves: audioWorkItems,
  mediaFilesAccessed: 0,
  sourceAudioPrepared: false,
  audioVerificationCompleted: false,
  modelOrApiCallsMade: 0,
  scoresDerived: 0,
  authorization: {
    localAudioSourcePreparation: true,
    paidTranscription: false,
    audioVerification: false,
    adjudication: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
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
    "1.0-score-stability-v2.1.3-audio-work-item-preparation",
  protocolId:
    ASSESSMENT_PRODUCTION_SCORE_STABILITY_V213_DISAGREEMENT_PROTOCOL_ID,
  status: "prepared-and-frozen-five-v2.1.3-local-audio-source-work-items",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  sourceDisagreementAnalysis: analysisPath,
  sourceJudgmentConfiguration: analysis.sourceJudgmentConfiguration,
  sourceHashes,
  workArtifact: {
    path: workPath,
    sha256: sha256(workBytes)
  },
  sources: sourceSummaries,
  validation: {
    independentGateQueueReproducedExactly: true,
    disagreementQueueReproducedExactly: true,
    canonicalLocalTranscriptChainsVerified: sourceSummaries.length,
    repositoryRenderedLockedExcerpts: audioWorkItems.length,
    repositoryRenderedTimestampWindows: audioWorkItems.length,
    expectedSpeakersLocked: audioWorkItems.length,
    mediaFilesAccessed: 0,
    audioClaimsMade: 0,
    modelOrApiCallsMade: 0,
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
    sourceDownloads: 0,
    sourceAudioFilesPrepared: 0,
    clipsPrepared: 0,
    audioCalls: 0,
    paidTranscriptionCalls: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    meteredModelApiCostUsd: 0,
    retries: 0,
    timeoutExtensions: 0,
    scoresDerived: 0
  },
  proposedPolicy: analysis.proposedPolicy,
  authorization: {
    localAudioSourcePreparation: true,
    paidTranscriptionExecution: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "prepare-five-v2.1.3-local-audio-sources-and-clips-model-free-only"
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
      modelOrApiCallsMade: 0,
      scoresDerived: 0,
      nextAuthorized: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
