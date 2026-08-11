#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  bagOfWordsRecall,
  lexicalTokens
} from "./lib/v416-audio-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/audio-verification";
const analysisPath = `${stageRoot}/analysis.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const workPath =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/disagreement-extraction/audio-work-items.json";
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
  analysis.status === "v2.1.3-audio-verification-unresolved" &&
    analysis.gate.verified === 4 &&
    analysis.gate.unresolved === 1 &&
    analysis.authorization.audioFailureDiagnosis &&
    !analysis.authorization.adjudicationPacketPreparation,
  "v2.1.3 audio failure is unavailable for diagnosis"
);

const unresolved = audit.debates
  .flatMap((debate) => debate.moves)
  .filter((move) => move.status === "unresolved");
assertV4(
  unresolved.length === 1 &&
    unresolved[0].debateNumber === "78" &&
    unresolved[0].moveId === "con-uncertain-single-catholic-lineage",
  "unexpected v2.1.3 audio failure population"
);
const move = unresolved[0];
const evidence = move.deterministicEvidence;
const checks = evidence.checks;
assertV4(
  checks.fullClipExcerptRecovered &&
    !checks.expectedSpeakerExcerptRecovered &&
    checks.expectedSpeakerRecallDistinct &&
    checks.expectedSpeakerDurationSufficient,
  "unresolved move is not an isolated expected-speaker excerpt-recall failure"
);
assertV4(
  evidence.expectedSpeakerExcerptRecall <
    audit.thresholds.minimumExpectedSpeakerExcerptRecall &&
    evidence.expectedSpeakerRecallMargin >=
      audit.thresholds.minimumExpectedSpeakerRecallMargin,
  "frozen expected-speaker recall failure is inconsistent"
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
  namedSpeakers.includes(move.expectedSpeaker) && namedSpeakers.length === 2,
  "unresolved clip is not a two-speaker transcript"
);

const embeddedOtherSpeakerSegments = transcript.segments
  .filter((segment) => segment.speaker !== move.expectedSpeaker)
  .map((segment) => ({
    speaker: segment.speaker,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
    tokenCount: lexicalTokens(segment.text).length,
    lockedExcerptRecall: bagOfWordsRecall(segment.text, workItem.verificationExcerpt)
  }))
  .filter(
    (segment) => segment.tokenCount >= 3 && segment.lockedExcerptRecall >= 0.8
  );
const lockedExcerptTokenCount = lexicalTokens(workItem.verificationExcerpt).length;
const fullClipMatchedTokens = Math.round(
  evidence.fullClipExcerptRecall * lockedExcerptTokenCount
);
const expectedSpeakerMatchedTokens = Math.round(
  evidence.expectedSpeakerExcerptRecall * lockedExcerptTokenCount
);
const expectedSpeakerRecallDeficitTokens =
  fullClipMatchedTokens - expectedSpeakerMatchedTokens;
const embeddedOtherSpeakerTokens = embeddedOtherSpeakerSegments.reduce(
  (total, segment) => total + segment.tokenCount,
  0
);
assertV4(
  embeddedOtherSpeakerSegments.length === 2 &&
    embeddedOtherSpeakerSegments.every(
      (segment) =>
        segment.speaker === evidence.highestOtherSpeaker &&
        segment.lockedExcerptRecall === 1
    ) &&
    embeddedOtherSpeakerTokens === expectedSpeakerRecallDeficitTokens,
  "embedded interlocutor turns do not exactly explain the speaker-recall deficit"
);

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2.1.3-audio-verification-failure-diagnosis",
  protocolId:
    "assessment-production-score-stability-v2.1.3-audio-verification-failure-diagnosis",
  status:
    "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  preservedDeterministicGate: {
    path: analysisPath,
    status: analysis.status,
    verified: 4,
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
    verificationExcerpt: workItem.verificationExcerpt,
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
    expectedSpeakerExcerptRecovered: false,
    expectedSpeakerRecallDistinct: true,
    expectedSpeakerDurationSufficient: true,
    failureClass: "mixed-speaker-locked-excerpt-contamination",
    lockedExcerptTokenCount,
    fullClipMatchedTokens,
    expectedSpeakerMatchedTokens,
    expectedSpeakerRecallDeficitTokens,
    embeddedOtherSpeakerTokens,
    embeddedOtherSpeakerSegments,
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
  },
  nextAuthorizedAction:
    "prepare-one-v2.1.3-score-blind-audio-attribution-adjudication-packet"
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
      lockedExcerptTokenCount,
      fullClipMatchedTokens,
      expectedSpeakerMatchedTokens,
      embeddedOtherSpeakerTokens,
      thresholdRelaxed: false,
      retries: 0,
      additionalPaidCostUsd: 0,
      nextAuthorized: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
