#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  V223_AUDIO_ADJ_OUTPUT_VERSION,
  V223_AUDIO_ADJ_PACKET_VERSION,
  V223_AUDIO_ADJ_PROTOCOL_ID,
  V223_AUDIO_ADJ_ROOT,
  makeV223AudioAttributionAdjudicationSchema
} from "./lib/assessment-production-score-stability-v2.2.3-audio-attribution-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const diagnosisPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-verification/failure-diagnosis.json";
const productionManifestPath = "docs/assessment-production/manifest-v1.json";
const [diagnosisBytes, productionManifestBytes] = await Promise.all([
  readFile(diagnosisPath),
  readFile(productionManifestPath)
]);
const diagnosis = JSON.parse(diagnosisBytes);
const productionManifest = JSON.parse(productionManifestBytes);
assertV4(
  diagnosis.status ===
    "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized" &&
    diagnosis.authorization.audioAttributionAdjudicationPacketPreparation &&
    !diagnosis.authorization.audioAttributionAdjudicationModelExecution,
  "v2.2.3 audio-attribution packet preparation is unauthorized"
);
const source = productionManifest.items.find(
  (item) => item.debateNumber === diagnosis.unresolvedMove.debateNumber
);
assertV4(
  source && source.debateId === diagnosis.unresolvedMove.debateId,
  "production manifest identity mismatch"
);
const transcriptBytes = await readFile(diagnosis.unresolvedMove.transcriptPath);
const transcript = JSON.parse(transcriptBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  sha256(transcriptBytes) === diagnosis.unresolvedMove.transcriptSha256,
  "diagnosed transcript hash mismatch"
);

const moves = [
  {
    moveId: diagnosis.unresolvedMove.moveId,
    expectedSpeaker: diagnosis.unresolvedMove.expectedSpeaker,
    proposition: diagnosis.unresolvedMove.proposition,
    sourceSpan: diagnosis.unresolvedMove.sourceSpan,
    deterministicFailure: diagnosis.unresolvedMove.deterministicEvidence,
    diagnosedFailureClass: diagnosis.diagnosis.failureClass,
    embeddedOtherSpeakerSegments:
      diagnosis.diagnosis.embeddedOtherSpeakerSegments,
    diarizedTranscriptPath: diagnosis.unresolvedMove.transcriptPath,
    diarizedTranscriptSha256: diagnosis.unresolvedMove.transcriptSha256,
    diarizedTranscriptDurationSeconds: transcript.duration,
    diarizedSegmentCount: transcript.segments.length
  }
];
const packet = {
  schemaVersion: V223_AUDIO_ADJ_PACKET_VERSION,
  protocolId: V223_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: source.debateNumber,
  debateId: source.debateId,
  motion: source.motion,
  sides: source.sides,
  moves,
  evidenceBoundary: {
    rawAudioDerivedDiarizedTranscriptRequired: true,
    knownSpeakerReferencesAlreadyApplied: true,
    preservedFailedDeterministicGateVisible: true,
    lockedPropositionAndSpanVisible: true,
    ratingsUnavailable: true,
    scoresUnavailable: true,
    legacyUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  },
  decisionRule: {
    decideOnlyExpectedSpeakerAuthorshipOfCoreProposition: true,
    mixedSpeakerSpanMayStillVerify: true,
    verifiedRequiresHighConfidence: true,
    verifiedRequiresExpectedSpeakerSegmentEvidence: true,
    unresolvedBlocksDownstream: true,
    thresholdRelaxationAuthorized: false,
    speakerRelabelingAuthorized: false,
    manualOverrideAuthorized: false
  },
  outputIdentity: {
    schemaVersion: V223_AUDIO_ADJ_OUTPUT_VERSION,
    protocolId: V223_AUDIO_ADJ_PROTOCOL_ID
  }
};
const packetPath = `${V223_AUDIO_ADJ_ROOT}/packet.json`;
const schemaPath = `${V223_AUDIO_ADJ_ROOT}/schema.json`;
const preparationPath = `${V223_AUDIO_ADJ_ROOT}/preparation-manifest.json`;
const outputPath = `${V223_AUDIO_ADJ_ROOT}/output.json`;
const executionManifestPath = `${V223_AUDIO_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${V223_AUDIO_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${V223_AUDIO_ADJ_ROOT}/analysis.json`;
const preparation = {
  schemaVersion:
    "1.0-score-stability-v2.2.3-audio-attribution-adjudication-preparation",
  protocolId: V223_AUDIO_ADJ_PROTOCOL_ID,
  status: shouldWrite
    ? "prepared-one-v2.2.3-disputed-audio-attribution"
    : "preview",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  AIOnly: true,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0
  },
  inputs: {
    workflow:
      "docs/assessment-production-score-stability-v2.2.3-audio-attribution-adjudication-workflow.md",
    manual: `${V223_AUDIO_ADJ_ROOT}/manual.md`,
    schema: schemaPath,
    packet: packetPath,
    rawDiarizedTranscripts: moves.map((move) => move.diarizedTranscriptPath),
    diagnosis: diagnosisPath
  },
  sourceHashes: {
    [diagnosisPath]: sha256(diagnosisBytes),
    [productionManifestPath]: sha256(productionManifestBytes),
    [diagnosis.unresolvedMove.transcriptPath]: sha256(transcriptBytes)
  },
  output: outputPath,
  moves: moves.map((move) => ({
    moveId: move.moveId,
    expectedSpeaker: move.expectedSpeaker,
    transcriptSha256: move.diarizedTranscriptSha256,
    segments: move.diarizedSegmentCount
  })),
  futureOutputPathsExcludedFromSourceHashes: [
    executionManifestPath,
    executionPath,
    outputPath,
    analysisPath
  ],
  authorization: {
    executionManifestPreparation: true,
    modelExecution: false,
    deterministicValidation: true,
    paidTranscription: false,
    retry: false,
    disputeAdjudicationPacketPreparation: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "freeze-one-v2.2.3-audio-attribution-adjudication-execution-manifest"
};
if (shouldWrite) {
  await mkdir(V223_AUDIO_ADJ_ROOT, { recursive: true });
  await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(
    schemaPath,
    `${JSON.stringify(makeV223AudioAttributionAdjudicationSchema(), null, 2)}\n`
  );
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debateNumber: packet.debateNumber,
      disputedMoves: moves.length,
      diarizedSegments: transcript.segments.length,
      model: preparation.model,
      modelContextsExecuted: 0,
      meteredApiCostUsd: 0,
      paidTranscriptionCostUsd: 0,
      scoresDerived: 0,
      nextAuthorized: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
