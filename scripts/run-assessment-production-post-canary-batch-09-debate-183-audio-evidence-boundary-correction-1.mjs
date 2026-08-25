#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { evaluateAttributionTranscript } from "./lib/v416-audio-verification.mjs";

const root = resolve(new URL("../", import.meta.url).pathname);
const rel = (path) => resolve(root, path);
const parent = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-debate-183-21";
const stage = `${parent}/evidence-boundary-correction-1`;
const planPath = `${stage}/correction-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const cohortPath = `${stage}/cohort-replay.json`;
const analysisPath = `${stage}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => sha256(await read(path));
const exists = async (path) => stat(rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => { await mkdir(dirname(rel(path)), { recursive: true }); await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`); };

function tokensWithSpans(value) {
  const normalized = String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const regex = /[a-z0-9]+(?:'[a-z0-9]+)?/g;
  const tokens = [];
  let match;
  while ((match = regex.exec(normalized))) tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  return tokens;
}

function longestCommonSubsequencePairs(left, right) {
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i].value === right[j].value ? 1 + table[i + 1][j + 1] : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i].value === right[j].value) { pairs.push([i, j]); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

function contiguousSpeakerBlocks(segments) {
  const blocks = [];
  for (const segment of segments) {
    const previous = blocks.at(-1);
    if (previous?.speaker === segment.speaker) {
      previous.segmentIds.push(segment.id);
      previous.text += ` ${segment.text}`;
      previous.endSeconds = segment.end;
    } else {
      blocks.push({ speaker: segment.speaker, segmentIds: [segment.id], text: segment.text, startSeconds: segment.start, endSeconds: segment.end });
    }
  }
  return blocks;
}

const plan = await readJson(planPath);
const activation = await readJson(activationPath);
assert.equal(activation.plan.sha256, await fileHash(planPath));
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await fileHash(path), expected, `${path}: hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path}: source hash mismatch`);
for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path}: activation source hash mismatch`);
for (const path of [executionPath, cohortPath, analysisPath]) assert.equal(await exists(path), false, `${path} already exists`);

const originalActivation = await readJson(plan.inputs.audioVerificationActivationPath);
const originalAudit = await readJson(plan.inputs.audioVerificationAuditPath);
const priorAudit = await readJson(plan.inputs.priorAcceptedAuditPath);
const call = originalActivation.calls.find((item) => item.moveId === plan.correction.moveId);
assert(call, "target call missing");
assert.equal(call.expectedSpeaker, plan.correction.expectedSpeaker);
assert.equal(call.verificationExcerpt, plan.correction.originalVerificationExcerpt);
assert.equal(sha256(call.verificationExcerpt), plan.correction.originalVerificationExcerptSha256);
const transcript = await readJson(call.transcriptPath);
assert.equal(await fileHash(call.transcriptPath), plan.inputs.transcriptSha256);

const originalTokens = tokensWithSpans(call.verificationExcerpt);
const candidates = contiguousSpeakerBlocks(transcript.segments)
  .filter((block) => block.speaker === call.expectedSpeaker)
  .map((block) => {
    const pairs = longestCommonSubsequencePairs(originalTokens, tokensWithSpans(block.text));
    if (pairs.length === 0) return { ...block, matchCount: 0, firstOriginalTokenIndex: null, lastOriginalTokenIndex: null, derivedExcerpt: "" };
    const firstOriginalTokenIndex = pairs[0][0];
    const lastOriginalTokenIndex = pairs.at(-1)[0];
    return {
      ...block,
      matchCount: pairs.length,
      firstOriginalTokenIndex,
      lastOriginalTokenIndex,
      derivedExcerpt: call.verificationExcerpt.slice(originalTokens[firstOriginalTokenIndex].start, originalTokens[lastOriginalTokenIndex].end)
    };
  })
  .sort((left, right) => right.matchCount - left.matchCount || left.startSeconds - right.startSeconds || left.segmentIds.join(",").localeCompare(right.segmentIds.join(",")));
const selected = candidates[0];
assert(selected, "expected-speaker block unavailable");
assert.deepEqual(selected.segmentIds, plan.correction.selectedSegmentIds);
assert.equal(selected.matchCount, plan.correction.selectedOrderedTokenMatchCount);
assert.equal(selected.firstOriginalTokenIndex, plan.correction.selectedOriginalTokenSpan[0]);
assert.equal(selected.lastOriginalTokenIndex, plan.correction.selectedOriginalTokenSpan[1]);
assert.equal(selected.derivedExcerpt, plan.correction.correctedVerificationExcerpt);
assert.equal(sha256(selected.derivedExcerpt), plan.correction.correctedVerificationExcerptSha256);

const originalResult = originalAudit.results.find((item) => item.moveId === call.moveId);
assert.equal(originalResult.status, "unresolved");
const correctedCall = { ...call, verificationExcerpt: selected.derivedExcerpt };
const correctedVerification = evaluateAttributionTranscript(transcript, correctedCall, originalActivation.thresholds);
assert.equal(correctedVerification.status, "verified");
assert.deepEqual(originalActivation.thresholds, plan.correction.thresholdsPreserved);

const currentOther = originalAudit.results.find((item) => item.moveId === "con-foundational-anomaly-significance");
assert.equal(currentOther.status, "verified");
assert.equal(priorAudit.results.length, 2);
assert(priorAudit.results.every((item) => item.status === "verified"));
const cohortItems = [
  ...priorAudit.results.map((item) => ({ debateNumber: item.debateNumber, moveId: item.moveId, expectedSpeaker: item.expectedSpeaker, status: item.status, transcriptSha256: item.transcriptSha256, resultSource: "accepted-prior-audio-verification" })),
  { debateNumber: currentOther.debateNumber, moveId: currentOther.moveId, expectedSpeaker: currentOther.expectedSpeaker, status: currentOther.status, transcriptSha256: currentOther.transcriptSha256, resultSource: "accepted-original-debate-183-audio-verification" },
  { debateNumber: "183", moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, status: correctedVerification.status, transcriptSha256: plan.inputs.transcriptSha256, resultSource: "accepted-deterministic-evidence-boundary-correction-1" }
];
assert.equal(cohortItems.length, 4);
assert(cohortItems.every((item) => item.status === "verified"));

const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-evidence-boundary-correction-1-execution",
  status: "completed-one-batch-09-debate-183-deterministic-audio-evidence-boundary-correction",
  batchNumber: 9,
  planSha256: await fileHash(planPath),
  activationSha256: await fileHash(activationPath),
  attempts: 1,
  correction: {
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    selectedBlock: { speaker: selected.speaker, segmentIds: selected.segmentIds, startSeconds: selected.startSeconds, endSeconds: selected.endSeconds, orderedTokenMatchCount: selected.matchCount, originalTokenSpan: [selected.firstOriginalTokenIndex, selected.lastOriginalTokenIndex] },
    originalVerificationExcerpt: call.verificationExcerpt,
    originalVerificationExcerptSha256: sha256(call.verificationExcerpt),
    correctedVerificationExcerpt: selected.derivedExcerpt,
    correctedVerificationExcerptSha256: sha256(selected.derivedExcerpt),
    originalVerification: originalResult.verification,
    correctedVerification
  },
  preservedControls: { audioFilesRead: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluations: 0, modelContexts: 0, transcriptionCalls: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0, transcriptChanged: false, thresholdsChanged: false, validatorChanged: false, otherVerificationResultsChanged: false, judgmentsChanged: false, scoresChanged: false, productionChanged: false }
};
const cohort = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-audio-verification-cohort-replay-after-evidence-boundary-correction-1",
  status: "batch-09-complete-four-work-item-audio-verification-cohort-passed",
  batchNumber: 9,
  executionSha256: null,
  requiredItems: 4,
  verifiedItems: 4,
  unresolvedItems: 0,
  items: cohortItems
};
await writeJson(executionPath, execution);
cohort.executionSha256 = await fileHash(executionPath);
await writeJson(cohortPath, cohort);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-evidence-boundary-correction-1-analysis",
  status: "batch-09-audio-verification-complete-after-bounded-evidence-boundary-correction",
  batchNumber: 9,
  result: { correctedFields: 1, correctedMoveId: call.moveId, completeFourWorkItemCohortPassed: true, unresolvedAudioWorkItems: 0, acceptedAudioVerificationResults: 4 },
  cost: { correctionDirectIncrementalCostUsd: 0, priorPaidAudioUsageDerivedCostUsdPreserved: plan.cost.priorPaidAudioUsageDerivedCostUsd },
  preservedControls: execution.preservedControls,
  nextAuthorizedAction: "resume-standing-authorized-batch-09-dispute-only-adjudication-preparation"
};
await writeJson(analysisPath, analysis);
console.log(JSON.stringify({ status: analysis.status, correctedMoveId: call.moveId, originalExpectedSpeakerRecall: originalResult.verification.expectedSpeakerExcerptRecall, correctedExpectedSpeakerRecall: correctedVerification.expectedSpeakerExcerptRecall, cohortVerified: 4 }));
