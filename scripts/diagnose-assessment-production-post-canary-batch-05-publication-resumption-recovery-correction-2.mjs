#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  validateDebate109ShardOutput
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");

const RECOVERY_ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const ROOT = `${RECOVERY_ROOT}/correction-2`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const ACTIVATION = `${RECOVERY_ROOT}/execution-activation.json`;
const EXECUTION = `${RECOVERY_ROOT}/model-execution.json`;
const ANALYSIS = `${RECOVERY_ROOT}/analysis.json`;
const FAILED_OUTPUT = `${RECOVERY_ROOT}/outputs/context-4.json`;
const FAILED_VALIDATION = `${RECOVERY_ROOT}/validations/context-4.json`;
const FAILED_PROVENANCE = `${RECOVERY_ROOT}/provenance/context-4.json`;
const FAILED_PACKET = `${RECOVERY_ROOT}/packets/context-4.json`;
const ACCEPTED_CON_OUTPUT = `${RECOVERY_ROOT}/outputs/context-5.json`;
const ACCEPTED_CON_VALIDATION = `${RECOVERY_ROOT}/validations/context-5.json`;
const ACCEPTED_CON_PROVENANCE = `${RECOVERY_ROOT}/provenance/context-5.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);

const files = [ACTIVATION, EXECUTION, ANALYSIS, FAILED_OUTPUT, FAILED_VALIDATION,
  FAILED_PROVENANCE, FAILED_PACKET, ACCEPTED_CON_OUTPUT,
  ACCEPTED_CON_VALIDATION, ACCEPTED_CON_PROVENANCE];
const bytes = Object.fromEntries(await Promise.all(
  files.map(async (file) => [file, await readFile(path.resolve(file))])
));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION);
const execution = parsed(EXECUTION);
const analysis = parsed(ANALYSIS);
const output = parsed(FAILED_OUTPUT);
const validation = parsed(FAILED_VALIDATION);
const packet = parsed(FAILED_PACKET);
const acceptedConValidation = parsed(ACCEPTED_CON_VALIDATION);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: correction-2 diagnosis source drifted`);
}
const result = execution.results.find((row) => row.contextIndex === 4);
const conResult = execution.results.find((row) => row.contextIndex === 5);
assertV4(
  execution.status === "batch-05-publication-resumption-recovery-gate-complete-with-failure" &&
    execution.contextsPlanned === 6 && execution.contextsAttempted === 6 &&
    execution.validContexts === 5 && execution.invalidContexts === 1 &&
    execution.attempts === 6 && execution.retries === 0 &&
    execution.timeoutExtensions === 0 && execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    result?.status === "output-validation-failed" &&
    result.gateAcceptancePassed === false && result.attemptCount === 1 &&
    result.retryCount === 0 && result.timeoutExtensionCount === 0 &&
    result.outputSha256 === sha256(bytes[FAILED_OUTPUT]) &&
    conResult?.status === "completed-valid" && conResult.gateAcceptancePassed === true &&
    conResult.outputSha256 === sha256(bytes[ACCEPTED_CON_OUTPUT]) &&
    validation.status === "failed" && validation.outputSha256 === result.outputSha256 &&
    acceptedConValidation.status === "passed" &&
    analysis.status === "batch-05-publication-resumption-recovery-or-complete-validation-failed",
  "the preserved six-context recovery failure changed"
);
assertV4(packet.shardId === "shard-01-pro-shared" && packet.side === "pro" &&
  packet.writableFieldCount === 13 && packet.moveIds.length === 9,
"the failed pro/shared shard packet changed");

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const rows = packet.moveIds.map((moveId) => {
  const critique = output.content.moveProse?.[moveId]?.critique;
  assertV4(typeof critique === "string", `${moveId}: preserved critique missing`);
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    moveId, path: `content.moveProse.${moveId}.critique`, words,
    characters: critique.length, sentences: sentences.length,
    orderedLabelsPassed: sentences.length === 4 && labels.every((label, index) =>
      sentences[index].toLowerCase().startsWith(label)),
    terminalPunctuationPassed: sentences.length === 4 &&
      sentences.every((sentence) => /[.!?]["')\]]?$/.test(sentence.trim())),
    excessWordsAboveAcceptanceMaximum: Math.max(0, words - 130)
  };
});
const failedFields = rows.filter((row) => row.words > 130);
const acceptedCritique = rows.filter((row) => row.words <= 130);
assertV4(failedFields.length === 8 && acceptedCritique.length === 1 &&
  acceptedCritique[0].moveId === "pro-genetic-code-optimization-design" &&
  acceptedCritique[0].words === 130 && failedFields.every((row) =>
    row.characters >= 880 && row.sentences === 4 && row.orderedLabelsPassed &&
    row.terminalPunctuationPassed),
"the diagnosed eight-field critique boundary changed");
assertV4(canonicalJson(failedFields.map(({ moveId, words }) => ({ moveId, words }))) ===
  canonicalJson([
    { moveId: "pro-dna-rna-information-design-inference", words: 135 },
    { moveId: "pro-resurrection-fabrication-improbable", words: 131 },
    { moveId: "pro-resurrection-mistake-improbable", words: 133 },
    { moveId: "pro-hiddenness-adequate-evidence", words: 141 },
    { moveId: "pro-suffering-evidential-limits", words: 138 },
    { moveId: "pro-regular-world-occasional-harm", words: 140 },
    { moveId: "pro-hiddenness-moral-probation", words: 138 },
    { moveId: "pro-supernatural-justification-without-mechanism", words: 136 }
  ]), "the exact eight-field failure inventory changed");

const diagnosticCopy = structuredClone(output);
let wordsRemoved = 0;
for (const field of failedFields) {
  const critique = diagnosticCopy.content.moveProse[field.moveId].critique;
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const sentenceWords = sentences[1].split(/\s+/);
    assertV4(sentenceWords.length > 8, `${field.moveId}: diagnostic shortening failed`);
    sentenceWords.splice(sentenceWords.length - 2, 1);
    sentences[1] = sentenceWords.join(" ");
    wordsRemoved += 1;
  }
  diagnosticCopy.content.moveProse[field.moveId].critique = sentences.join(" ");
}
const diagnosticReplay = validateDebate109ShardOutput(diagnosticCopy, packet);
assertV4(diagnosticReplay.status === "passed" && wordsRemoved === 52,
  "the in-memory eight-field diagnostic replay failed");

const partition = Array.from({ length: 4 }, (_, index) =>
  failedFields.slice(index * 2, index * 2 + 2).map(({ path: field }) => field));
const sourceHashes = Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])]));
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-pro-shard-correction-2-diagnosis",
  status: "frozen-diagnosed-batch-05-debate-109-pro-shared-eight-critique-word-overruns",
  frozenAt, productionCanary: false, batchNumber: 5, stagingOnly: true,
  classification: "eight-critique-word-boundary-failures-in-complete-rejected-pro-shared-shard",
  preservedFailure: { contextIndex: 4, shardId: packet.shardId,
    originalAttemptCount: 1, retries: 0, timeoutExtensions: 0,
    acceptedOutput: false, completeRejectedOutputPreserved: true,
    rejectedOutputSha256: sha256(bytes[FAILED_OUTPUT]),
    validationMessage: validation.validationMessage },
  failedFields, failedFieldCount: failedFields.length,
  excessWordsTotal: failedFields.reduce((sum, row) => sum + row.excessWordsAboveAcceptanceMaximum, 0),
  preservedFields: { originalContentFieldCount: 13, repairFields: 8,
    immutableContentFields: 5,
    immutableFields: ["summary", "representativeQuote",
      "moveProse.pro-genetic-code-optimization-design", "overallCommentary", "aiExtension"],
    acceptedConShardPreserved: true, acceptedConShardSha256: sha256(bytes[ACCEPTED_CON_OUTPUT]) },
  diagnosticReplay: { originalOutputModified: false, persistedCorrectedOutput: false,
    hypotheticalWordsRemoved: wordsRemoved, result: diagnosticReplay },
  minimumBoundedRecursiveRecovery: {
    explicitlyAuthorizedOneTimeException: true,
    operation: "four-isolated-two-field-publication-repair-packets",
    reasonMinimum: "Eight diagnosed writable fields with a maximum of two fields per packet require four packets.",
    packetCount: 4, partition, attemptsPerPacket: 1, retries: 0,
    timeoutExtensions: 0, furtherRecursiveRecoveryMaximum: 0,
    rejectedOutputReuseBoundary: "immutable base only; only eight diagnosed critiques may be replaced",
    mergeRule: "Replace only the eight authorized critiques, preserve the five other pro/shared content fields and accepted con shard, validate the repaired pro/shared shard, then restore and validate the complete Debate 109 publication output."
  },
  sourceHashes,
  directIncrementalCostUsd: 0,
  userAuthorization: {
    instruction: "Authorize deterministic diagnosis and one-time recursive recovery of the rejected Batch 5 Debate 109 pro/shared shard through four two-field repair packets.",
    subscriptionModel: "5.6 Sol", reasoningEffort: "low",
    directIncrementalCostUsdMaximum: 0
  },
  authorization: { correctionPreparation: true, correctionModelExecution: false,
    deterministicMergeAndValidation: false, fourContextResumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-four-field-disjoint-two-field-debate-109-pro-shared-repair-packets"
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: diagnosis.status, failedFieldCount: 8,
  excessWordsTotal: diagnosis.excessWordsTotal, immutableContentFields: 5,
  acceptedConShardPreserved: true, repairPacketCount: 4,
  diagnosticReplay: diagnosticReplay.status, directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
