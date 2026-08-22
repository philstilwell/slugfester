#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_06_DISPUTE_ADJ_PROTOCOL_ID,
  POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT,
  buildPostCanaryBatch06DisputeAdjudicationPacket,
  makePostCanaryBatch06DisputeAdjudicationSchema
} from "./lib/assessment-production-post-canary-batch-06-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-06";
const DISAGREEMENT_ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const AUDIO_ROOT = `${COHORT_ROOT}/audio-verification`;
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const EXPECTED_DEBATES = [
  "73",
  "36",
  "38",
  "97",
  "141",
  "06",
  "168",
  "135",
  "143",
  "169"
];
const USER_AUTHORIZATION = Object.freeze({
  instruction:
    "The frozen Batch 6 standing authorization permits automatic preparation, validation, freezing, activation, execution, analysis, committing, and pushing of score-blind dispute-only adjudication checkpoints for exactly the ten selected debates while every frozen gate passes, with subscription-backed and local direct incremental cost capped at $0.",
  directIncrementalCostUsdMaximum: 0,
  adjudicationPacketPreparationAuthorized: true,
  executionPreparationManifestAuthorized: true,
  adjudicationModelExecutionAuthorized: false,
  judgmentModelExecutionAuthorized: false,
  paidServicesAuthorized: false,
  finalLedgerAssemblyAuthorized: false,
  scoreDerivationAuthorized: false,
  publicationReconstructionAuthorized: false,
  productionMutationAuthorized: false,
  nextBatchSelectionAuthorized: false
});
const inputPaths = {
  rubric: "docs/reassessment-rubric-v2.1.md",
  decomposedRubric: "docs/reassessment-rubric-v4.0.md",
  derivedFindingsRubric: "docs/reassessment-rubric-v4.0.1.md",
  boundedInventoryRubric: "docs/reassessment-rubric-v4.1.md",
  productionWorkflow: "docs/assessment-production-workflow.md",
  adjudicationWorkflow:
    "docs/assessment-production-checkpoint-v2.2-dispute-only-adjudication-workflow.md",
  manual:
    "docs/assessment-production/production-checkpoint-v2.2-1/dispute-only-adjudication/manual.md",
  schema: `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/adjudication.schema.json`
};
const TOOL_SOURCES = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-06-dispute-adjudication.mjs",
  "scripts/build-assessment-production-post-canary-batch-06-dispute-adjudication-packets.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-dispute-adjudication-packets.mjs",
  "scripts/validate-assessment-production-post-canary-batch-06-dispute-adjudication-output.mjs",
  "scripts/preregister-assessment-production-post-canary-batch-06-dispute-adjudication.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-dispute-adjudication-manifest.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

const sourceAnalysisPath = `${DISAGREEMENT_ROOT}/analysis.json`;
const acceptedAudioRoot = AUDIO_ROOT;
const audioAuditPath = `${acceptedAudioRoot}/audio-verification.json`;
const audioAnalysisPath = `${acceptedAudioRoot}/analysis.json`;
const audioCostPath = `${acceptedAudioRoot}/cost-control-analysis.json`;
const audioExecutionManifestPath = `${AUDIO_ROOT}/execution-manifest.json`;
const judgmentPreparationPath = `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const judgmentExecutionPath = `${JUDGMENT_ROOT}/model-execution.json`;
const judgmentAnalysisPath = `${JUDGMENT_ROOT}/analysis.json`;
const standingAuthorizationPath = `${COHORT_ROOT}/standing-authorization.json`;
const sourcePaths = [
  sourceAnalysisPath,
  audioAuditPath,
  audioAnalysisPath,
  audioCostPath,
  audioExecutionManifestPath,
  judgmentPreparationPath,
  judgmentExecutionPath,
  judgmentAnalysisPath,
  standingAuthorizationPath
];
const sourceBytes = await Promise.all(sourcePaths.map((file) => readFile(file)));
const [
  sourceAnalysis,
  audioAudit,
  audioAnalysis,
  audioCost,
  audioExecutionManifest,
  judgmentPreparation,
  judgmentExecution,
  judgmentAnalysis,
  standingAuthorization
] = sourceBytes.map((bytes) => JSON.parse(bytes));

assertV4(
  sourceAnalysis.status ===
      "post-canary-batch-06-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work" &&
    JSON.stringify(sourceAnalysis.debates.map((item) => item.debateNumber)) ===
      JSON.stringify(EXPECTED_DEBATES) &&
    sourceAnalysis.adjudicationWorkload.disputedMoves === 197 &&
    sourceAnalysis.adjudicationWorkload.candidateSelections === 609 &&
    sourceAnalysis.adjudicationWorkload.packetsPrepared === false &&
    sourceAnalysis.adjudicationWorkload.modelContextsExecuted === 0,
  "Batch 6 deterministic disagreement workload changed"
);
assertV4(
  judgmentExecution.status ===
      "twenty-post-canary-batch-06-independent-judgment-contexts-passed" &&
    judgmentExecution.validContexts === 20 &&
    judgmentExecution.invalidContexts === 0 &&
    judgmentExecution.attempts === 20 &&
    judgmentExecution.retries === 0 &&
    judgmentExecution.timeoutExtensions === 0 &&
    judgmentAnalysis.status ===
      "twenty-post-canary-batch-06-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction" &&
    judgmentAnalysis.totals.contexts === 20,
  "Batch 6 accepted independent-judgment boundary changed"
);
assertV4(
  judgmentPreparation.contexts.length === 20 &&
    judgmentPreparation.model.slug === "gpt-5.6-sol" &&
    judgmentPreparation.model.reasoningEffort === "low" &&
    judgmentPreparation.model.authentication === "ChatGPT subscription" &&
    judgmentPreparation.model.scoreBlind === true &&
    judgmentPreparation.model.roundedIntegerScoreTiesPermitted === true,
  "Batch 6 independent-judgment configuration changed"
);
for (const [file, digest] of Object.entries(sourceAnalysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `accepted judgment source drifted: ${file}`);
}
assertV4(
  standingAuthorization.status ===
      "frozen-active-batch-06-complete-remaining-workflow-standing-authorization" &&
    JSON.stringify(standingAuthorization.selectedDebates) ===
      JSON.stringify(EXPECTED_DEBATES) &&
    standingAuthorization.model.slug === "gpt-5.6-sol" &&
    standingAuthorization.model.reasoningEffort === "low" &&
    standingAuthorization.model.authentication === "ChatGPT subscription",
  "Batch 6 standing authorization changed"
);
assertV4(
  audioAudit.status ===
      "passed-all-two-batch-06-audio-attributions-after-empty-segment-overlay" &&
    audioAudit.totals.requiredMoves === 2 &&
    audioAudit.totals.verified === 2 &&
    audioAudit.totals.unresolved === 0 &&
    audioAnalysis.status === audioAudit.status &&
    audioAnalysis.gate.passed === true &&
    audioAnalysis.gate.verified === 2 &&
    audioAnalysis.gate.unresolved === 0 &&
    audioAnalysis.gate.originalTranscriptsPreserved === true &&
    audioCost.status ===
      "audio-attribution-passed-usage-derived-cost-within-approved-cap" &&
    audioCost.costControl.usageDerivedEstimatedCostUsd === 0.1127375 &&
    audioCost.costControl.approvedMaximumCostUsd === 1 &&
    audioCost.costControl.approvedCapExceeded === false &&
    audioExecutionManifest.status ===
      "frozen-two-post-canary-batch-06-paid-known-speaker-diarizations-authorized-under-standing-authorization" &&
    audioExecutionManifest.calls.length === 2,
  "Batch 6 accepted audio-verification boundary changed"
);
assertV4(
  USER_AUTHORIZATION.directIncrementalCostUsdMaximum === 0 &&
    USER_AUTHORIZATION.adjudicationPacketPreparationAuthorized &&
    USER_AUTHORIZATION.executionPreparationManifestAuthorized &&
    !USER_AUTHORIZATION.adjudicationModelExecutionAuthorized &&
    !USER_AUTHORIZATION.judgmentModelExecutionAuthorized &&
    !USER_AUTHORIZATION.paidServicesAuthorized,
  "Batch 6 packet-preparation authorization changed"
);

const audioByDebateMove = new Map();
for (const debate of audioAudit.debates) {
  for (const move of debate.moves) {
    const frozenCall = audioExecutionManifest.calls.find(
      (call) =>
        call.debateNumber === move.debateNumber &&
        call.moveId === move.moveId
    );
    assertV4(
      frozenCall &&
        frozenCall.expectedSpeaker === move.expectedSpeaker &&
        frozenCall.clipSha256 &&
        frozenCall.model === "gpt-4o-transcribe-diarize" &&
        frozenCall.responseFormat === "diarized_json",
      `${move.debateNumber}:${move.moveId}: frozen audio call metadata unavailable`
    );
    assertV4(
      move.status === "verified" &&
        move.resolvedSpeaker === move.expectedSpeaker &&
        move.deterministicEvidence.status === "verified" &&
        Object.values(move.deterministicEvidence.checks).every(Boolean),
      `${move.debateNumber}:${move.moveId}: verified audio evidence unavailable`
    );
    const transcriptBytes = await readFile(move.transcript.path);
    assertV4(
      sha256(transcriptBytes) === move.transcript.sha256,
      `${move.debateNumber}:${move.moveId}: transcript hash changed`
    );
    audioByDebateMove.set(`${move.debateNumber}:${move.moveId}`, {
      ...move,
      executionStatus: "completed",
      clip: {
        path: frozenCall.clipPath,
        sha256: frozenCall.clipSha256,
        durationSeconds: frozenCall.durationSeconds
      },
      transcript: {
        ...move.transcript,
        model: frozenCall.model,
        responseFormat: frozenCall.responseFormat
      }
    });
  }
}
assertV4(audioByDebateMove.size === 2, "Batch 6 verified audio population changed");

const schema = makePostCanaryBatch06DisputeAdjudicationSchema();
const schemaBytes = pretty(schema);
const sharedInputBytes =
  (
    await Promise.all(
      Object.entries(inputPaths)
        .filter(([key]) => key !== "schema")
        .map(([, file]) => readFile(file))
    )
  ).reduce((sum, bytes) => sum + bytes.length, 0) + schemaBytes.length;

if (shouldWrite) {
  const immutableOutputs = [
    inputPaths.schema,
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/execution-preparation-manifest.json`,
    ...EXPECTED_DEBATES.flatMap((debateNumber) => [
      `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`,
      `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`
    ])
  ];
  for (const file of immutableOutputs) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}

const contexts = [];
const sourceHashes = Object.fromEntries(
  sourcePaths.map((file, index) => [file, sha256(sourceBytes[index])])
);
for (const file of [
  ...Object.values(inputPaths).filter((file) => file !== inputPaths.schema),
  ...TOOL_SOURCES
]) {
  sourceHashes[file] = sha256(await readFile(file));
}

let disputedMoves = 0;
let candidateSelections = 0;
let audioVerifiedMoves = 0;
for (const debateNumber of EXPECTED_DEBATES) {
  const judgmentContext = judgmentPreparation.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  assertV4(judgmentContext, `Debate ${debateNumber}: judgment context missing`);
  const disagreementPath =
    `${DISAGREEMENT_ROOT}/disagreements/debate-${debateNumber}.json`;
  const [disagreementBytes, lockedInventoryBytes, sourcePacketBytes, eventsBytes] =
    await Promise.all([
      readFile(disagreementPath),
      readFile(judgmentContext.lockedInventory),
      readFile(judgmentContext.sourcePacket),
      readFile(judgmentContext.originalEvents)
    ]);
  for (const [file, bytes] of [
    [disagreementPath, disagreementBytes],
    [judgmentContext.lockedInventory, lockedInventoryBytes],
    [judgmentContext.sourcePacket, sourcePacketBytes],
    [judgmentContext.originalEvents, eventsBytes]
  ]) sourceHashes[file] = sha256(bytes);
  const disagreementRecord = sourceAnalysis.debates.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(
    sourceHashes[disagreementPath] === disagreementRecord.disagreementSha256,
    `Debate ${debateNumber}: disagreement hash changed`
  );
  assertV4(
    sourceHashes[judgmentContext.lockedInventory] ===
      sourceAnalysis.sourceHashes[judgmentContext.lockedInventory],
    `Debate ${debateNumber}: accepted inventory hash changed`
  );

  const audioByMoveId = new Map(
    [...audioByDebateMove]
      .filter(([key]) => key.startsWith(`${debateNumber}:`))
      .map(([key, value]) => [key.slice(debateNumber.length + 1), value])
  );
  const built = buildPostCanaryBatch06DisputeAdjudicationPacket(
    JSON.parse(disagreementBytes),
    JSON.parse(lockedInventoryBytes),
    JSON.parse(eventsBytes),
    audioByMoveId
  );
  const packetPath =
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath =
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath =
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetBytes = pretty(built.packet);
  const provenanceBytes = pretty({
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-06-adjudication-candidate-provenance",
    protocolId: built.packet.protocolId,
    debateNumber,
    modelInput: false,
    mappings: built.provenance
  });
  const selections = built.packet.disputedMoves.reduce(
    (sum, move) =>
      sum +
      [
        move.candidates.importancePair,
        move.candidates.attributionPair,
        move.candidates.responsePair,
        move.candidates.charityPair,
        move.candidates.assessmentConfidencePair
      ].filter(Boolean).length +
      Object.keys(move.candidates.scoringFields).length,
    built.packet.burdenAdjustmentDisputes.length
  );
  const audioCount = built.packet.disputedMoves.filter(
    (move) => move.evidence.audioVerification !== null
  ).length;
  let audioTranscriptBytes = 0;
  for (const input of built.audioTranscriptInputs) {
    const bytes = await readFile(input.sourcePath);
    assertV4(sha256(bytes) === input.sha256, `${input.moveId}: transcript drifted`);
    sourceHashes[input.sourcePath] = input.sha256;
    audioTranscriptBytes += bytes.length;
  }
  if (shouldWrite) {
    await mkdir(path.dirname(packetPath), { recursive: true });
    await mkdir(path.dirname(provenancePath), { recursive: true });
    await writeFile(packetPath, packetBytes);
    await writeFile(provenancePath, provenanceBytes);
  }
  contexts.push({
    contextIndex: contexts.length,
    debateNumber,
    debateId: built.packet.debateId,
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    provenance: provenancePath,
    provenanceSha256: sha256(provenanceBytes),
    output: outputPath,
    disputeSource: disagreementPath,
    lockedInventory: judgmentContext.lockedInventory,
    sourcePacket: judgmentContext.sourcePacket,
    originalEvents: judgmentContext.originalEvents,
    disputedMoves: built.packet.disputedMoves.length,
    candidateSelections: selections,
    audioVerifiedMoves: audioCount,
    audioTranscriptInputs: built.audioTranscriptInputs,
    packetBytes: packetBytes.length,
    copiedInputBytes: sharedInputBytes + packetBytes.length + audioTranscriptBytes
  });
  disputedMoves += built.packet.disputedMoves.length;
  candidateSelections += selections;
  audioVerifiedMoves += audioCount;
}

const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-06-dispute-only-adjudication-preparation",
  protocolId: POST_CANARY_BATCH_06_DISPUTE_ADJ_PROTOCOL_ID,
  status: shouldWrite
    ? "prepared-ten-isolated-post-canary-batch-06-dispute-only-adjudication-contexts"
    : "preview",
  frozenAt,
  productionCanary: false,
  batchNumber: 6,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: USER_AUTHORIZATION,
  acceptedSourceBoundary: {
    independentJudgments: judgmentAnalysisPath,
    frozenDisagreements: sourceAnalysisPath,
    audioVerification: audioAuditPath,
    allTwentyJudgmentsAccepted: true,
    allTwoAudioMovesVerified: true,
    audioValidationOverlaysPreserved: 1,
    audioCorrectionCallsPreserved: 0,
    audioUsageDerivedEstimatedCostUsd:
      audioCost.costControl.usageDerivedEstimatedCostUsd,
    additionalPaidCallsThisStage: 0
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    meteredApiCostUsdMaximum: 0
  },
  inputs: inputPaths,
  contexts,
  evidenceBoundary: {
    disputedFieldsOnly: true,
    candidateOrderingAnonymizedPerPair: true,
    provenanceFilesNeverModelInputs: true,
    initialPassIdentitiesUnavailable: true,
    initialPassRationalesUnavailable: true,
    nondisputedFieldsUnavailable: true,
    fullInitialOutputsUnavailable: true,
    calculatedScoresUnavailable: true,
    winnersUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    rawVerifiedDiarizedTranscriptsSuppliedOnlyWhereRequired: true
  },
  activePolicy: {
    version: "v2.2",
    agreedWinningSideMayCollapseToIntegerRoundedTie: true,
    scorePassesMaximum: 1,
    appliedAtThisStage: false
  },
  totals: {
    contexts: contexts.length,
    disputedMoves,
    candidateSelections,
    audioVerifiedMoves,
    maximumCopiedInputBytes: Math.max(...contexts.map((item) => item.copiedInputBytes)),
    meanCopiedInputBytes: Math.round(
      contexts.reduce((sum, item) => sum + item.copiedInputBytes, 0) /
        contexts.length
    ),
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    finalLedgersAssembled: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    executionPreparationManifest: true,
    executionActivation: false,
    adjudicationModelExecution: false,
    judgmentModelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  sourceHashes,
  nextAuthorizedAction:
    "freeze-post-canary-batch-06-dispute-only-adjudication-execution-preparation-manifest-model-free-only"
};
assertV4(
  contexts.length === 10 &&
    disputedMoves === 197 &&
    disputedMoves === sourceAnalysis.adjudicationWorkload.disputedMoves &&
    candidateSelections === 609 &&
    candidateSelections === sourceAnalysis.adjudicationWorkload.candidateSelections &&
    audioVerifiedMoves === 2,
  "Batch 6 adjudication packet workload differs from frozen inputs"
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 360000,
  `Batch 6 context ${preparation.totals.maximumCopiedInputBytes} bytes exceeds the 360 KB ceiling`
);
if (shouldWrite) {
  await mkdir(POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT, { recursive: true });
  await writeFile(inputPaths.schema, schemaBytes);
  await writeFile(
    `${POST_CANARY_BATCH_06_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
    pretty(preparation)
  );
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      contexts: contexts.map((item) => ({
        debateNumber: item.debateNumber,
        disputedMoves: item.disputedMoves,
        candidateSelections: item.candidateSelections,
        audioVerifiedMoves: item.audioVerifiedMoves,
        copiedInputBytes: item.copiedInputBytes
      })),
      totals: preparation.totals,
      modelExecutionAuthorized: false,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
