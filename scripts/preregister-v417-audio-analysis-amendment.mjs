#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_EMPTY_SEGMENT_POLICY } from "./lib/v417-audio-verification.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const amendmentPath = `${V417_PASS_B_ROOT}/audio-analysis-amendment.json`;
const auditPath = `${V417_PASS_B_ROOT}/audio-verification.json`;
const postAudioPath = `${V417_PASS_B_ROOT}/post-audio-analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [amendmentPath, auditPath, postAudioPath]) assertV4(!(await exists(future)), `${future} already exists`);

const [plan, execution, failure] = await Promise.all([
  readJson(`${V417_PASS_B_ROOT}/audio-verification-plan.json`),
  readJson(`${V417_PASS_B_ROOT}/audio-model-execution.json`),
  readJson(`${V417_PASS_B_ROOT}/audio-analysis-failure.json`)
]);
assertV4(plan.status === "frozen-twelve-move-known-speaker-diarization-plan", "frozen audio plan unavailable");
assertV4(execution.status === "passed-twelve-one-attempt-diarization-calls" && execution.successfulCalls === 12 && execution.retries === 0, "valid raw audio execution unavailable");
assertV4(failure.status === "deterministic-analysis-stopped-before-attribution-acceptance" && failure.rawOutputMutationPerformed === false && failure.recallThresholdsEvaluatedCompletely === false, "frozen analysis failure unavailable");

const transcriptFiles = plan.debates.flatMap((debate) => debate.moves.map((move) => move.transcriptPath));
const observations = [];
for (const file of transcriptFiles) {
  const transcript = await readJson(file);
  assertV4(Array.isArray(transcript.segments) && transcript.segments.length > 0, `${file}: transcript segments unavailable`);
  const empty = transcript.segments.map((segment, index) => ({ segment, index })).filter(({ segment }) => typeof segment?.text === "string" && !segment.text.trim());
  const durations = empty.map(({ segment }) => segment.end - segment.start);
  assertV4(empty.length <= V417_EMPTY_SEGMENT_POLICY.maximumEmptySegmentsPerTranscript, `${file}: empty segment count exceeds proposed structural allowance`);
  assertV4(durations.every((duration) => Number.isFinite(duration) && duration >= 0 && duration <= V417_EMPTY_SEGMENT_POLICY.maximumSingleEmptySegmentDurationSeconds + 1e-9), `${file}: empty segment duration exceeds proposed structural allowance`);
  assertV4(durations.reduce((sum, duration) => sum + duration, 0) <= V417_EMPTY_SEGMENT_POLICY.maximumTotalEmptySegmentDurationSeconds + 1e-9, `${file}: total empty duration exceeds proposed structural allowance`);
  assertV4(transcript.segments.every((segment) => Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.start >= 0 && segment.end >= segment.start), `${file}: invalid segment timing`);
  observations.push({ transcriptPath: file, segments: transcript.segments.length, emptySegmentCount: empty.length, emptySegmentIndexes: empty.map(({ index }) => index), emptySegmentDurationsSeconds: durations });
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  `${V417_PASS_B_ROOT}/audio-verification-plan.json`, `${V417_PASS_B_ROOT}/audio-model-execution.json`, `${V417_PASS_B_ROOT}/audio-analysis-failure.json`,
  "scripts/lib/v416-audio-verification.mjs", "scripts/lib/v417-audio-verification.mjs", "scripts/test-v417-audio-verification.mjs", "scripts/preregister-v417-audio-analysis-amendment.mjs", "scripts/analyze-v417-audio-verification.mjs",
  ...transcriptFiles
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const emptySegments = observations.reduce((sum, item) => sum + item.emptySegmentCount, 0);
const amendment = {
  schemaVersion: "4.1.7-audio-analysis-empty-segment-amendment",
  protocolId: "v4.1.7-fresh-six-triggered-pass-b",
  status: "frozen-analysis-only-empty-boundary-elision",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  reason: failure.cause,
  scope: { rawTranscriptMutationAuthorized: false, paidRetryAuthorized: false, nonemptyTextAlterationAuthorized: false, speakerLabelAlterationAuthorized: false, timingAlterationAuthorized: false, thresholdAlterationAuthorized: false, ignoreOnlyZeroTextSegmentsWithinPolicy: true },
  policy: V417_EMPTY_SEGMENT_POLICY,
  observedStructure: { transcripts: observations.length, transcriptsWithEmptySegments: observations.filter((item) => item.emptySegmentCount > 0).length, emptySegments, invalidTimingSegments: 0, observations },
  originalThresholdsUnchanged: plan.verificationPolicy,
  sourceHashes,
  authorization: { deterministicAudioAnalysis: true, additionalPaidCalls: false, disagreementExtraction: false, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(root, amendmentPath), `${JSON.stringify(amendment, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", transcripts: observations.length, transcriptsWithEmptySegments: amendment.observedStructure.transcriptsWithEmptySegments, emptySegments, maximumObservedEmptyDurationSeconds: Math.max(0, ...observations.flatMap((item) => item.emptySegmentDurationsSeconds)), rawTranscriptMutationAuthorized: false, paidRetryAuthorized: false, deterministicAudioAnalysisAuthorized: true }, null, 2));
