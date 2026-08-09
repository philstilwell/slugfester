#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot = "docs/assessment-production/canary-v1-audio-verification";
const analysisPath = `${stageRoot}/analysis.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const workPath =
  "docs/assessment-production/canary-v1-disagreement-audio-prep/audio-work-items.json";
const outputPath = `${stageRoot}/failure-diagnosis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [analysisBytes, auditBytes, workBytes] = await Promise.all([
  readFile(analysisPath),
  readFile(auditPath),
  readFile(workPath)
]);
const analysis = JSON.parse(analysisBytes);
const audit = JSON.parse(auditBytes);
const work = JSON.parse(workBytes);
assertV4(
  analysis.status === "production-canary-audio-verification-unresolved" &&
    analysis.gate.verified === 3 &&
    analysis.gate.unresolved === 1 &&
    !analysis.authorization.adjudicationPacketPreparation,
  "production-canary audio failure is unavailable for diagnosis"
);
const unresolved = audit.debates
  .flatMap((debate) => debate.moves)
  .filter((move) => move.status === "unresolved");
assertV4(
  unresolved.length === 1 &&
    unresolved[0].debateNumber === "05" &&
    unresolved[0].moveId === "pro-move-07",
  "unexpected production-canary audio failure population"
);
const move = unresolved[0];
const evidence = move.deterministicEvidence;
const checks = evidence.checks;
assertV4(
  checks.fullClipExcerptRecovered &&
    checks.expectedSpeakerExcerptRecovered &&
    checks.expectedSpeakerDurationSufficient &&
    !checks.expectedSpeakerRecallDistinct,
  "unresolved move is not an isolated recall-margin failure"
);
assertV4(
  evidence.expectedSpeakerRecallMargin < audit.thresholds.minimumExpectedSpeakerRecallMargin,
  "frozen recall-margin threshold unexpectedly passed"
);
const workItem = work.moves.find(
  (item) => item.debateNumber === move.debateNumber && item.moveId === move.moveId
);
assertV4(workItem, "unresolved move work item missing");
const transcriptBytes = await readFile(move.transcript.path);
assertV4(
  sha256(transcriptBytes) === move.transcript.sha256,
  "unresolved diarized transcript hash mismatch"
);
const transcript = JSON.parse(transcriptBytes);
const namedSpeakers = [
  ...new Set(
    transcript.segments
      .map((segment) => segment.speaker)
      .filter((speaker) => speaker !== "A")
  )
];
assertV4(
  namedSpeakers.includes(move.expectedSpeaker) && namedSpeakers.length >= 2,
  "unresolved clip is not a mixed-speaker transcript"
);

const diagnosis = {
  schemaVersion: "1.0-production-canary-audio-failure-diagnosis",
  protocolId: "assessment-production-canary-v1-audio-failure-diagnosis",
  status:
    "mixed-speaker-lexical-collision-confirmed-audio-attribution-packet-preparation-authorized",
  productionCanary: true,
  stagingOnly: true,
  preservedDeterministicGate: {
    path: analysisPath,
    status: analysis.status,
    verified: 3,
    unresolved: 1,
    erasedOrReclassified: false
  },
  unresolvedMove: {
    debateNumber: move.debateNumber,
    debateId: move.debateId,
    moveId: move.moveId,
    expectedSpeaker: move.expectedSpeaker,
    proposition: workItem.proposition,
    sourceSpan: workItem.sourceSpan,
    transcriptPath: move.transcript.path,
    transcriptSha256: move.transcript.sha256,
    diarizedSegmentCount: transcript.segments.length,
    namedSpeakers,
    deterministicEvidence: evidence
  },
  diagnosis: {
    requestCompleted: true,
    rawTranscriptAvailable: true,
    fullClipExcerptRecovered: true,
    expectedSpeakerExcerptRecovered: true,
    expectedSpeakerDurationSufficient: true,
    expectedSpeakerRecallDistinct: false,
    failureClass: "mixed-speaker-lexical-collision",
    thresholdRelaxationApplied: false,
    speakerRelabelingApplied: false,
    manualAttributionOverrideApplied: false,
    paidTranscriptionRetryApplied: false
  },
  futureModelBoundary: {
    model: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    disputedAudioAttributionFieldsOnly: true,
    ratingsUnavailable: true,
    scoresUnavailable: true,
    legacyUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  },
  sourceHashes: {
    [analysisPath]: sha256(analysisBytes),
    [auditPath]: sha256(auditBytes),
    [workPath]: sha256(workBytes),
    [move.transcript.path]: sha256(transcriptBytes)
  },
  costs: {
    additionalPaidTranscriptionCalls: 0,
    additionalTranscriptionCostUsd: 0,
    modelContexts: 0,
    meteredModelApiCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    audioAttributionAdjudicationPacketPreparation: true,
    audioAttributionAdjudicationModelExecution: false,
    paidTranscription: false,
    retry: false,
    correctionCall: false,
    disputeAdjudicationPacketPreparation: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
if (shouldWrite) {
  await writeFile(outputPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      move: `${move.debateNumber}:${move.moveId}`,
      failureClass: diagnosis.diagnosis.failureClass,
      fullClipExcerptRecall: evidence.fullClipExcerptRecall,
      expectedSpeakerExcerptRecall: evidence.expectedSpeakerExcerptRecall,
      highestOtherSpeakerExcerptRecall: evidence.highestOtherSpeakerExcerptRecall,
      recallMargin: evidence.expectedSpeakerRecallMargin,
      thresholdRelaxed: false,
      retries: 0,
      additionalPaidCostUsd: 0,
      nextAuthorized: "audio-attribution-adjudication-packet-preparation"
    },
    null,
    2
  )
);
