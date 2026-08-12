#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { lexicalTokens } from "./lib/v416-audio-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-verification";
const analysisPath = `${stageRoot}/analysis.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const workPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/disagreement-extraction/audio-work-items.json";
const outputPath = `${stageRoot}/failure-diagnosis.json`;
const diagnosisToolPath =
  "scripts/diagnose-assessment-production-score-stability-v2.2.3-audio-failure.mjs";
const testToolPath =
  "scripts/test-assessment-production-score-stability-v2.2.3-audio-failure-diagnosis.mjs";
const verificationLibraryPath = "scripts/lib/v416-audio-verification.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const tokenCounts = (tokens) => {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
};
const matchedTokenCount = (referenceCounts, candidateCounts) =>
  [...referenceCounts].reduce(
    (total, [token, count]) =>
      total + Math.min(count, candidateCounts.get(token) ?? 0),
    0
  );

const [
  analysisBytes,
  auditBytes,
  workBytes,
  diagnosisToolBytes,
  testToolBytes,
  verificationLibraryBytes
] = await Promise.all([
  readFile(analysisPath),
  readFile(auditPath),
  readFile(workPath),
  readFile(diagnosisToolPath),
  readFile(testToolPath),
  readFile(verificationLibraryPath)
]);
const analysis = JSON.parse(analysisBytes);
const audit = JSON.parse(auditBytes);
const work = JSON.parse(workBytes);
assertV4(
  analysis.status === "v2.2.3-audio-verification-unresolved" &&
    analysis.gate.verified === 3 &&
    analysis.gate.unresolved === 1 &&
    analysis.authorization.audioFailureDiagnosis &&
    !analysis.authorization.adjudicationPacketPreparation,
  "v2.2.3 audio failure is unavailable for diagnosis"
);

const unresolved = audit.debates
  .flatMap((debate) => debate.moves)
  .filter((move) => move.status === "unresolved");
assertV4(
  unresolved.length === 1 &&
    unresolved[0].debateNumber === "17" &&
    unresolved[0].moveId === "pro-cumulative-moral-christian-case",
  "unexpected v2.2.3 audio failure population"
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
  ...new Set(transcript.segments.map((segment) => segment.speaker))
];
assertV4(
  namedSpeakers.includes(move.expectedSpeaker) && namedSpeakers.length === 2,
  "unresolved clip is not a two-speaker transcript"
);

const referenceTokens = lexicalTokens(workItem.verificationExcerpt);
const referenceCounts = tokenCounts(referenceTokens);
const fullClipCounts = tokenCounts(lexicalTokens(transcript.text));
const expectedSpeakerText = transcript.segments
  .filter((segment) => segment.speaker === move.expectedSpeaker)
  .map((segment) => segment.text)
  .join(" ");
const expectedSpeakerCounts = tokenCounts(lexicalTokens(expectedSpeakerText));
const otherSpeakerText = transcript.segments
  .filter((segment) => segment.speaker !== move.expectedSpeaker)
  .map((segment) => segment.text)
  .join(" ");
const otherSpeakerCounts = tokenCounts(lexicalTokens(otherSpeakerText));
const lockedExcerptTokenCount = referenceTokens.length;
const fullClipMatchedTokens = matchedTokenCount(referenceCounts, fullClipCounts);
const expectedSpeakerMatchedTokens = matchedTokenCount(
  referenceCounts,
  expectedSpeakerCounts
);
const expectedSpeakerRecallDeficitTokens =
  fullClipMatchedTokens - expectedSpeakerMatchedTokens;
const deficitTokenCoverage = [...referenceCounts]
  .map(([token, referenceCount]) => {
    const fullClipCount = Math.min(
      referenceCount,
      fullClipCounts.get(token) ?? 0
    );
    const expectedSpeakerCount = Math.min(
      referenceCount,
      expectedSpeakerCounts.get(token) ?? 0
    );
    const deficitCount = Math.max(0, fullClipCount - expectedSpeakerCount);
    const otherSpeakerCount = otherSpeakerCounts.get(token) ?? 0;
    return {
      token,
      deficitCount,
      otherSpeakerCount,
      coveredCount: Math.min(deficitCount, otherSpeakerCount)
    };
  })
  .filter((entry) => entry.deficitCount > 0);
const otherSpeakerCoveredDeficitTokens = deficitTokenCoverage.reduce(
  (total, entry) => total + entry.coveredCount,
  0
);
const remainingDeficitCounts = new Map(
  deficitTokenCoverage.map((entry) => [entry.token, entry.deficitCount])
);
const embeddedOtherSpeakerSegments = transcript.segments
  .filter((segment) => segment.speaker !== move.expectedSpeaker)
  .map((segment) => {
    const matchedDeficitTokens = [];
    for (const token of lexicalTokens(segment.text)) {
      const remaining = remainingDeficitCounts.get(token) ?? 0;
      if (remaining <= 0) continue;
      matchedDeficitTokens.push(token);
      remainingDeficitCounts.set(token, remaining - 1);
    }
    return {
      speaker: segment.speaker,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
      matchedDeficitTokens
    };
  })
  .filter((segment) => segment.matchedDeficitTokens.length > 0);
assertV4(
  fullClipMatchedTokens / lockedExcerptTokenCount ===
      evidence.fullClipExcerptRecall &&
    expectedSpeakerMatchedTokens / lockedExcerptTokenCount ===
      evidence.expectedSpeakerExcerptRecall &&
    expectedSpeakerRecallDeficitTokens > 0 &&
    otherSpeakerCoveredDeficitTokens === expectedSpeakerRecallDeficitTokens &&
    embeddedOtherSpeakerSegments.every(
      (segment) => segment.speaker === evidence.highestOtherSpeaker
    ) &&
    embeddedOtherSpeakerSegments.reduce(
      (total, segment) => total + segment.matchedDeficitTokens.length,
      0
    ) === expectedSpeakerRecallDeficitTokens &&
    [...remainingDeficitCounts.values()].every((count) => count === 0),
  "embedded interlocutor turns do not exactly explain the speaker-recall deficit"
);

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2.2.3-audio-verification-failure-diagnosis",
  protocolId:
    "assessment-production-score-stability-v2.2.3-audio-verification-failure-diagnosis",
  status:
    "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
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
    embeddedOtherSpeakerTokens: otherSpeakerCoveredDeficitTokens,
    otherSpeakerCoveredDeficitTokens,
    deficitTokenCoverage,
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
    [move.transcript.path]: sha256(transcriptBytes),
    [diagnosisToolPath]: sha256(diagnosisToolBytes),
    [testToolPath]: sha256(testToolBytes),
    [verificationLibraryPath]: sha256(verificationLibraryBytes)
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
    "prepare-one-v2.2.3-score-blind-audio-attribution-adjudication-packet"
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
      expectedSpeakerRecallDeficitTokens,
      otherSpeakerCoveredDeficitTokens,
      contributingOtherSpeakerSegments: embeddedOtherSpeakerSegments.length,
      thresholdRelaxed: false,
      retries: 0,
      additionalPaidCostUsd: 0,
      nextAuthorized: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
