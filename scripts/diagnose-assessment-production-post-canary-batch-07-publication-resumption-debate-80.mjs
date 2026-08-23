#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication.mjs";
import { validatePostCanaryBatch07PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-07-publication-validation.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const RESUMPTION_ROOT = POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_ROOT;
const ROOT = `${RESUMPTION_ROOT}/repair-1`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const PREPARATION = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-80.json`;
const VALIDATION = `${RESUMPTION_ROOT}/validations/debate-80.json`;
const PROVENANCE = `${RESUMPTION_ROOT}/provenance/debate-80.json`;
const PACKET = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/packets/debate-80.json`;
const ACCEPTED_193 = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/merged/debate-193.json`;
const ACCEPTED_193_VALIDATION = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/complete-debate-validation.json`;
const ACCEPTED_193_MERGE_AUDIT = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/repair-1/merge-audit.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const files = [PREPARATION, ACTIVATION, EXECUTION, OUTPUT, VALIDATION, PROVENANCE,
  PACKET, ACCEPTED_193, ACCEPTED_193_VALIDATION, ACCEPTED_193_MERGE_AUDIT];
const bytes = Object.fromEntries(await Promise.all(files.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION); const execution = parsed(EXECUTION);
const output = parsed(OUTPUT);
const validation = parsed(VALIDATION); const packet = parsed(PACKET);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: Debate 80 diagnosis source drifted`);
const result = execution.results.find((row) => row.debateNumber === "80");
assertV4(execution.status === "post-canary-batch-07-publication-resumption-complete-with-failure" &&
  execution.contextsPlanned === 9 && execution.contextsAttempted === 1 &&
  execution.contextsUnattempted === 8 && canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([1,2,3,4,5,6,7,8]) &&
  execution.validContexts === 0 && execution.invalidContexts === 1 &&
  execution.attempts === 1 && execution.retries === 0 && execution.timeoutExtensions === 0 &&
  result?.status === "output-validation-failed" && result.gateAcceptancePassed === false &&
  result.outputSha256 === sha256(bytes[OUTPUT]) && validation.status === "failed" &&
  validation.outputSha256 === result.outputSha256,
"the preserved Debate 80 failure boundary changed");

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const rows = packet.moves.map(({ moveId }) => {
  const critique = output.moveProse?.[moveId]?.critique;
  assertV4(typeof critique === "string", `${moveId}: critique missing`);
  const words = wordCount(critique); const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return { moveId, path: `moveProse.${moveId}.critique`, words,
    characters: critique.length, sentences: sentences.length,
    orderedLabelsPassed: sentences.length === 4 && labels.every((label, index) =>
      sentences[index].toLowerCase().startsWith(label)),
    terminalPunctuationPassed: sentences.length === 4 && sentences.every((sentence) =>
      /[.!?]["')\]]?$/.test(sentence.trim())),
    excessWordsAboveAcceptanceMaximum: Math.max(0, words - 130) };
});
const failedFields = rows.filter((row) => row.words > 130);
assertV4(failedFields.length === 5 && rows.filter((row) => row.words >= 105 && row.words <= 130).length === 14 &&
  failedFields.every((row) => row.characters >= 880 && row.sentences === 4 &&
    row.orderedLabelsPassed && row.terminalPunctuationPassed),
"the five-field Debate 80 critique boundary changed");
assertV4(canonicalJson(failedFields.map(({ moveId, words }) => ({ moveId, words }))) === canonicalJson([
  { moveId: "con-defeasible-explanatory-default", words: 131 },
  { moveId: "con-rival-causal-principle-symmetry", words: 131 },
  { moveId: "pro-symmetry-breaker-burden", words: 132 },
  { moveId: "pro-mentality-and-value-producing-power", words: 131 },
  { moveId: "con-arbitrariness-inheritance-scope", words: 132 }
]), "the exact Debate 80 failure inventory changed");
const diagnosticCopy = structuredClone(output); let wordsRemoved = 0;
for (const field of failedFields) {
  const sentences = diagnosticCopy.moveProse[field.moveId].critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const words = sentences[1].split(/\s+/); words.splice(words.length - 2, 1);
    sentences[1] = words.join(" "); wordsRemoved += 1;
  }
  diagnosticCopy.moveProse[field.moveId].critique = sentences.join(" ");
}
const diagnosticReplay = validatePostCanaryBatch07PublicationOutput(diagnosticCopy, packet);
assertV4(diagnosticReplay.status === "passed" && wordsRemoved === 7,
  "the five-field in-memory Debate 80 diagnostic replay failed");
const partition = [failedFields.slice(0, 2).map(({ path }) => path),
  failedFields.slice(2, 4).map(({ path }) => path),
  failedFields.slice(4).map(({ path }) => path)];
const diagnosis = { schemaVersion: "1.0-assessment-production-post-canary-batch-07-debate-80-publication-repair-diagnosis",
  status: "frozen-diagnosed-batch-07-debate-80-five-critique-word-overruns",
  frozenAt, productionCanary: false, batchNumber: 7, stagingOnly: true,
  classification: "five-critique-word-boundary-failures-in-complete-rejected-output",
  preservedFailure: { originalAttemptCount: 1, retries: 0, timeoutExtensions: 0,
    acceptedOutput: false, completeRejectedOutputPreserved: true,
    rejectedOutputSha256: sha256(bytes[OUTPUT]), validationMessage: validation.validationMessage },
  failedFields, failedFieldCount: 5,
  excessWordsTotal: failedFields.reduce((sum, row) => sum + row.excessWordsAboveAcceptanceMaximum, 0),
  preservedFields: { moveCount: 19, repairFields: 5, validMoveProseEntries: 14,
    everyOtherOutputFieldImmutable: true, acceptedDebate193Preserved: true,
    acceptedDebate193Sha256: sha256(bytes[ACCEPTED_193]), eightContextsUnattempted: true },
  diagnosticReplay: { originalOutputModified: false, persistedCorrectedOutput: false,
    hypotheticalWordsRemoved: wordsRemoved, result: diagnosticReplay },
  minimumBoundedRepair: { operation: "three-field-disjoint-publication-repair-packets-partitioned-two-two-one",
    reasonMinimum: "Five diagnosed writable fields with a maximum of two fields per packet require three packets.",
    packetCount: 3, partition, attemptsPerPacket: 1, retries: 0,
    timeoutExtensions: 0, recursiveRecoveryMaximum: 1,
    mergeRule: "Replace only the five authorized critiques in the complete rejected Debate 80 output, preserve every other field, then validate the complete debate output and resume exactly eight untouched contexts." },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  directIncrementalCostUsd: 0,
  userAuthorization: { instruction: "The Batch 7 standing authorization permits deterministic diagnosis and the minimum three field-disjoint repair packets for five Debate 80 critique overruns.",
    subscriptionModel: "5.6 Sol", reasoningEffort: "low", directIncrementalCostUsdMaximum: 0 },
  authorization: { repairPreparation: true, repairModelExecution: false,
    deterministicMergeAndValidation: false, eightContextResumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-three-field-disjoint-debate-80-publication-repair-packets" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`); }
console.log(JSON.stringify({ status: diagnosis.status, failedFieldCount: 5,
  excessWordsTotal: diagnosis.excessWordsTotal, validMoveProseEntries: 14,
  repairPacketCount: 3, diagnosticReplay: diagnosticReplay.status,
  eightContextsUnattempted: true, directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
