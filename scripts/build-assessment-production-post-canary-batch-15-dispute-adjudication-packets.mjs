#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_15_DISPUTE_ADJ_PROTOCOL_ID,
  POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT,
  buildPostCanaryBatch15DisputeAdjudicationPacket,
  makePostCanaryBatch15DisputeAdjudicationSchema
} from "./lib/assessment-production-post-canary-batch-15-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-15";
const DISAGREEMENT_ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const EXPECTED_DEBATES = [
  "39",
  "48",
  "23",
  "162",
  "86",
  "159",
  "128",
  "98",
  "155",
  "178"
];
const USER_AUTHORIZATION = Object.freeze({
  instruction:
    "The frozen Batch 15 standing authorization permits automatic preparation, validation, freezing, activation, execution, analysis, committing, and pushing of score-blind dispute-only adjudication checkpoints for exactly the ten selected debates while every frozen gate passes, with subscription-backed and local direct incremental cost capped at $0.",
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
  schema: `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/adjudication.schema.json`
};
const TOOL_SOURCES = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-15-dispute-adjudication.mjs",
  "scripts/build-assessment-production-post-canary-batch-15-dispute-adjudication-packets.mjs",
  "scripts/test-assessment-production-post-canary-batch-15-dispute-adjudication-packets.mjs",
  "scripts/validate-assessment-production-post-canary-batch-15-dispute-adjudication-output.mjs",
  "scripts/preregister-assessment-production-post-canary-batch-15-dispute-adjudication.mjs",
  "scripts/test-assessment-production-post-canary-batch-15-dispute-adjudication-manifest.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

const sourceAnalysisPath = `${DISAGREEMENT_ROOT}/analysis.json`;
const audioRoot = `${COHORT_ROOT}/audio-verification`;
const audioAuditPath = `${audioRoot}/audio-verification.json`;
const audioAnalysisPath = `${audioRoot}/analysis.json`;
const audioCostPath = `${audioRoot}/cost-control-analysis.json`;
const audioExecutionManifestPath = `${audioRoot}/execution-manifest.json`;
const audioModelExecutionPath = `${audioRoot}/model-execution.json`;
const audioRecoveryRoot = `${audioRoot}/audio-attribution-recovery`;
const audioRecoveryCombinedPath = `${audioRecoveryRoot}/combined-audio-verification.json`;
const audioRecoveryAnalysisPath = `${audioRecoveryRoot}/analysis.json`;
const audioRecoveryDebate39Path = `${audioRecoveryRoot}/outputs/debate-39.json`;
const audioRecoveryDebate98Path = `${audioRecoveryRoot}/outputs/debate-98.json`;
const judgmentPreparationPath = `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const judgmentExecutionPath =
  `${JUDGMENT_ROOT}/resumption-1/complete-cohort-execution-overlay.json`;
const judgmentAnalysisPath = `${JUDGMENT_ROOT}/analysis.json`;
const standingAuthorizationPath = `${COHORT_ROOT}/standing-authorization.json`;
const sourcePaths = [
  sourceAnalysisPath,
  audioAuditPath,
  audioAnalysisPath,
  audioCostPath,
  audioExecutionManifestPath,
  audioModelExecutionPath,
  audioRecoveryCombinedPath,
  audioRecoveryAnalysisPath,
  audioRecoveryDebate39Path,
  audioRecoveryDebate98Path,
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
  audioModelExecution,
  audioRecoveryCombined,
  audioRecoveryAnalysis,
  audioRecoveryDebate39,
  audioRecoveryDebate98,
  judgmentPreparation,
  judgmentExecution,
  judgmentAnalysis,
  standingAuthorization
] = sourceBytes.map((bytes) => JSON.parse(bytes));

assertV4(
  sourceAnalysis.status ===
      "post-canary-batch-15-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work" &&
    JSON.stringify(sourceAnalysis.debates.map((item) => item.debateNumber)) ===
      JSON.stringify(EXPECTED_DEBATES) &&
    sourceAnalysis.adjudicationWorkload.disputedMoves === 186 &&
    sourceAnalysis.adjudicationWorkload.candidateSelections === 561 &&
    sourceAnalysis.adjudicationWorkload.packetsPrepared === false &&
    sourceAnalysis.adjudicationWorkload.modelContextsExecuted === 0,
  "Batch 15 deterministic disagreement workload changed"
);
assertV4(
  judgmentExecution.status ===
      "twenty-post-canary-batch-15-independent-judgment-contexts-passed-after-bounded-field-disjoint-recovery-and-resumption" &&
    judgmentExecution.validContexts === 20 &&
    judgmentExecution.invalidContexts === 0 &&
    judgmentExecution.attempts === 20 &&
    judgmentExecution.retries === 0 &&
    judgmentExecution.timeoutExtensions === 0 &&
    judgmentAnalysis.status ===
      "twenty-post-canary-batch-15-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction" &&
    judgmentAnalysis.totals.contexts === 20,
  "Batch 15 accepted independent-judgment boundary changed"
);
assertV4(
  judgmentPreparation.contexts.length === 20 &&
    judgmentPreparation.model.slug === "gpt-5.6-sol" &&
    judgmentPreparation.model.reasoningEffort === "low" &&
    judgmentPreparation.model.authentication === "ChatGPT subscription" &&
    judgmentPreparation.model.scoreBlind === true &&
    judgmentPreparation.model.roundedIntegerScoreTiesPermitted === true,
  "Batch 15 independent-judgment configuration changed"
);
for (const [file, digest] of Object.entries(sourceAnalysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `accepted judgment source drifted: ${file}`);
}
assertV4(
  standingAuthorization.status ===
      "frozen-active-batch-15-complete-remaining-workflow-standing-authorization" &&
    JSON.stringify(standingAuthorization.selectedDebates) ===
      JSON.stringify(EXPECTED_DEBATES) &&
    standingAuthorization.model.slug === "gpt-5.6-sol" &&
    standingAuthorization.model.reasoningEffort === "low" &&
    standingAuthorization.model.authentication === "ChatGPT subscription" &&
    standingAuthorization.authorization.adjudicationPreparationAndModelExecution === true &&
    standingAuthorization.costBoundary
      .subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0,
  "Batch 15 standing authorization changed"
);
assertV4(
  audioAudit.status ===
      "post-canary-batch-15-audio-verification-unresolved" &&
    audioAudit.totals.requiredMoves === 3 &&
    audioAudit.totals.verified === 1 &&
    audioAudit.totals.unresolved === 2 &&
    audioAudit.totals.retries === 0 &&
    audioAudit.totals.corrections === 0 &&
    audioAnalysis.status ===
      "post-canary-batch-15-audio-verification-unresolved" &&
    audioAnalysis.gate.passed === false &&
    audioAnalysis.gate.executionComplete === true &&
    audioCost.status ===
      "audio-attribution-unresolved-usage-derived-cost-within-approved-cap" &&
    audioCost.costControl.usageDerivedEstimatedCostUsd === 0.1002925 &&
    audioCost.costControl.approvedMaximumCostUsd === 1 &&
    audioCost.costControl.directIncrementalCostCapControlPassed === true &&
    audioExecutionManifest.calls.length === 3 &&
    audioModelExecution.callsAttempted === 3 &&
    audioModelExecution.callsCompleted === 3 &&
    audioModelExecution.retries === 0 &&
    audioRecoveryCombined.status === "post-canary-batch-15-combined-audio-verification-passed" &&
    audioRecoveryCombined.totals.requiredMoves === 3 &&
    audioRecoveryCombined.totals.verified === 3 &&
    audioRecoveryCombined.totals.unresolved === 0 &&
    audioRecoveryAnalysis.status === "batch-15-audio-attribution-recovery-passed" &&
    audioRecoveryAnalysis.validation.verified === 2 &&
    audioRecoveryAnalysis.validation.unresolved === 0,
  "Batch 15 accepted audio-verification boundary changed"
);
assertV4(
  USER_AUTHORIZATION.directIncrementalCostUsdMaximum === 0 &&
    USER_AUTHORIZATION.adjudicationPacketPreparationAuthorized &&
    USER_AUTHORIZATION.executionPreparationManifestAuthorized &&
    !USER_AUTHORIZATION.adjudicationModelExecutionAuthorized &&
    !USER_AUTHORIZATION.judgmentModelExecutionAuthorized &&
    !USER_AUTHORIZATION.paidServicesAuthorized,
  "Batch 15 packet-preparation authorization changed"
);

const frozenAudioCalls = audioExecutionManifest.calls;
const acceptedAudioResults = audioAudit.debates.flatMap((item) => item.moves);
const recoveredDecisionByKey = new Map(
  [audioRecoveryDebate39, audioRecoveryDebate98]
    .flatMap((output) => output.adjudications.map((decision) => [`${output.debateNumber}:${decision.moveId}`, decision]))
);
const audioByDebateMove = new Map();
for (const move of acceptedAudioResults) {
    const recoveredDecision = recoveredDecisionByKey.get(`${move.debateNumber}:${move.moveId}`) ?? null;
    const frozenCall = frozenAudioCalls.find(
      (call) => call.debateNumber === move.debateNumber && call.moveId === move.moveId
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
      (move.status === "verified" ||
        (recoveredDecision?.status === "verified" &&
          recoveredDecision.authoringSpeaker === move.expectedSpeaker &&
          recoveredDecision.corePropositionAuthoredByExpectedSpeaker === true &&
          recoveredDecision.confidence === "high")),
      `${move.debateNumber}:${move.moveId}: verified audio evidence unavailable`
    );
    const transcriptBytes = await readFile(move.transcript.path);
    assertV4(
      sha256(transcriptBytes) === move.transcript.sha256,
      `${move.debateNumber}:${move.moveId}: transcript hash changed`
    );
    audioByDebateMove.set(`${move.debateNumber}:${move.moveId}`, {
      debateNumber: move.debateNumber,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      resolvedSpeaker: move.expectedSpeaker,
      status: "verified",
      deterministicEvidence: {
        ...move.deterministicEvidence,
        status: "verified",
        deterministicGateOriginallyPassed: move.status === "verified",
        attributionAdjudication: recoveredDecision,
      },
      executionStatus: "completed",
      clip: {
        path: frozenCall.clipPath,
        sha256: frozenCall.clipSha256,
        durationSeconds: frozenCall.durationSeconds
      },
      transcript: {
        path: move.transcript.path,
        sha256: move.transcript.sha256,
        model: frozenCall.model,
        responseFormat: frozenCall.responseFormat,
        persistentMutation: false
      }
    });
}
assertV4(audioByDebateMove.size === 3, "Batch 15 verified audio population changed");

const schema = makePostCanaryBatch15DisputeAdjudicationSchema();
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
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/execution-preparation-manifest.json`,
    ...EXPECTED_DEBATES.flatMap((debateNumber) => [
      `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`,
      `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`
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
  const built = buildPostCanaryBatch15DisputeAdjudicationPacket(
    JSON.parse(disagreementBytes),
    JSON.parse(lockedInventoryBytes),
    JSON.parse(eventsBytes),
    audioByMoveId
  );
  const packetPath =
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath =
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath =
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetBytes = pretty(built.packet);
  const provenanceBytes = pretty({
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-adjudication-candidate-provenance",
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
    "1.0-assessment-production-post-canary-batch-15-dispute-only-adjudication-preparation",
  protocolId: POST_CANARY_BATCH_15_DISPUTE_ADJ_PROTOCOL_ID,
  status: shouldWrite
    ? "prepared-ten-isolated-post-canary-batch-15-dispute-only-adjudication-contexts"
    : "preview",
  frozenAt,
  productionCanary: false,
  batchNumber: 15,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: USER_AUTHORIZATION,
  acceptedSourceBoundary: {
    independentJudgments: judgmentAnalysisPath,
    frozenDisagreements: sourceAnalysisPath,
    audioVerification: audioRecoveryCombinedPath,
    allTwentyJudgmentsAccepted: true,
    allThreeAudioMovesVerified: true,
    audioValidationOverlaysPreserved: 0,
    audioAttributionRecoveryContextsPreserved: 2,
    audioCorrectionCallsPreserved: 0,
    audioUsageDerivedEstimatedCostUsd: 0.1002925,
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
    "freeze-post-canary-batch-15-dispute-only-adjudication-execution-preparation-manifest-model-free-only"
};
assertV4(
  contexts.length === 10 &&
    disputedMoves === 186 &&
    disputedMoves === sourceAnalysis.adjudicationWorkload.disputedMoves &&
    candidateSelections === 561 &&
    candidateSelections === sourceAnalysis.adjudicationWorkload.candidateSelections &&
    audioVerifiedMoves === 3,
  `Batch 15 adjudication packet workload differs from frozen inputs: ${JSON.stringify({ contexts: contexts.length, disputedMoves, candidateSelections, audioVerifiedMoves, sourceDisputedMoves: sourceAnalysis.adjudicationWorkload.disputedMoves, sourceCandidateSelections: sourceAnalysis.adjudicationWorkload.candidateSelections })}`
);
assertV4(
  preparation.totals.maximumCopiedInputBytes <= 400000,
  `Batch 15 context ${preparation.totals.maximumCopiedInputBytes} bytes exceeds the frozen 400 KB correction ceiling`
);
if (shouldWrite) {
  await mkdir(POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT, { recursive: true });
  await writeFile(inputPaths.schema, schemaBytes);
  await writeFile(
    `${POST_CANARY_BATCH_15_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
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
