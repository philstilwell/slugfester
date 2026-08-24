#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_08_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const RESUMPTION_ROOT = POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT;
const ROOT = `${RESUMPTION_ROOT}/repair-1`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const PREPARATION = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-08.json`;
const VALIDATION = `${RESUMPTION_ROOT}/validations/debate-08.json`;
const PROVENANCE = `${RESUMPTION_ROOT}/provenance/debate-08.json`;
const PACKET = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-08.json`;
const ACCEPTED_88 = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/merged/debate-88.json`;
const ACCEPTED_194 = `${RESUMPTION_ROOT}/outputs/debate-194.json`;
const ACCEPTED_137 = `${RESUMPTION_ROOT}/outputs/debate-137.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const files = [PREPARATION, ACTIVATION, EXECUTION, ANALYSIS, OUTPUT, VALIDATION,
  PROVENANCE, PACKET, ACCEPTED_88, ACCEPTED_194, ACCEPTED_137];
const bytes = Object.fromEntries(await Promise.all(files.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION);
const execution = parsed(EXECUTION);
const output = parsed(OUTPUT);
const validation = parsed(VALIDATION);
const packet = parsed(PACKET);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: Debate 08 diagnosis source drifted`);
}
const result = execution.results.find((row) => row.debateNumber === "08");
assertV4(
  execution.status === "post-canary-batch-08-publication-resumption-complete-with-failure" &&
  execution.contextsPlanned === 9 && execution.contextsAttempted === 3 &&
  execution.contextsUnattempted === 6 &&
  canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3, 4, 5, 6, 7, 8]) &&
  execution.validContexts === 2 && execution.invalidContexts === 1 &&
  execution.attempts === 3 && execution.retries === 0 && execution.timeoutExtensions === 0 &&
  result?.status === "output-validation-failed" && result.gateAcceptancePassed === false &&
  result.outputSha256 === sha256(bytes[OUTPUT]) && validation.status === "failed" &&
  validation.outputSha256 === result.outputSha256,
  "the preserved Debate 08 failure boundary changed"
);

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const rows = packet.moves.map(({ moveId }) => {
  const critique = output.moveProse?.[moveId]?.critique;
  assertV4(typeof critique === "string", `${moveId}: critique missing`);
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    moveId,
    path: `moveProse.${moveId}.critique`,
    words,
    characters: critique.length,
    sentences: sentences.length,
    orderedLabelsPassed: sentences.length === 4 && labels.every((label, index) =>
      sentences[index].toLowerCase().startsWith(label)),
    terminalPunctuationPassed: sentences.length === 4 && sentences.every((sentence) =>
      /[.!?]["')\]]?$/.test(sentence.trim())),
    excessWordsAboveAcceptanceMaximum: Math.max(0, words - 130)
  };
});
const failedFields = rows.filter((row) => row.words > 130);
assertV4(
  failedFields.length === 2 &&
  rows.filter((row) => row.words >= 105 && row.words <= 130).length === 18 &&
  failedFields.every((row) => row.characters >= 880 && row.sentences === 4 &&
    row.orderedLabelsPassed && row.terminalPunctuationPassed),
  "the two-field Debate 08 critique boundary changed"
);
assertV4(canonicalJson(failedFields.map(({ moveId, words }) => ({ moveId, words }))) ===
  canonicalJson([
    { moveId: "con-morality-flourishing-reciprocity", words: 133 },
    { moveId: "pro-morality-divine-image-status", words: 132 }
  ]), "the exact Debate 08 failure inventory changed");

const diagnosticCopy = structuredClone(output);
let wordsRemoved = 0;
for (const field of failedFields) {
  const sentences = diagnosticCopy.moveProse[field.moveId].critique
    .split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const words = sentences[1].split(/\s+/);
    words.splice(words.length - 2, 1);
    sentences[1] = words.join(" ");
    wordsRemoved += 1;
  }
  diagnosticCopy.moveProse[field.moveId].critique = sentences.join(" ");
}
const diagnosticReplay = validatePostCanaryBatch08PublicationOutput(diagnosticCopy, packet);
assertV4(diagnosticReplay.status === "passed" && wordsRemoved === 5,
  "the two-field in-memory Debate 08 diagnostic replay failed");

const partition = [failedFields.map(({ path: field }) => field)];
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-08-publication-repair-diagnosis",
  status: "frozen-diagnosed-batch-08-debate-08-two-critique-word-overruns",
  frozenAt,
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  classification: "two-critique-word-boundary-failures-in-complete-rejected-output",
  preservedFailure: {
    originalAttemptCount: 1,
    retries: 0,
    timeoutExtensions: 0,
    acceptedOutput: false,
    completeRejectedOutputPreserved: true,
    rejectedOutputSha256: sha256(bytes[OUTPUT]),
    validationMessage: validation.validationMessage
  },
  failedFields,
  failedFieldCount: 2,
  excessWordsTotal: 5,
  preservedFields: {
    moveCount: 20,
    repairFields: 2,
    validMoveProseEntries: 18,
    everyOtherOutputFieldImmutable: true,
    acceptedDebate88Preserved: true,
    acceptedDebate194Preserved: true,
    acceptedDebate137Preserved: true,
    sixContextsUnattempted: true
  },
  diagnosticReplay: {
    originalOutputModified: false,
    persistedCorrectedOutput: false,
    hypotheticalWordsRemoved: wordsRemoved,
    result: diagnosticReplay
  },
  minimumBoundedRepair: {
    operation: "one-field-disjoint-publication-repair-packet-with-two-writable-fields",
    reasonMinimum: "Two diagnosed writable fields fit the two-field-per-packet ceiling.",
    packetCount: 1,
    partition,
    attemptsPerPacket: 1,
    retries: 0,
    timeoutExtensions: 0,
    recursiveRecoveryMaximum: 1,
    mergeRule: "Replace only the two authorized critiques in the complete rejected Debate 08 output, preserve every other field, validate Debate 08, then resume exactly six untouched contexts."
  },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  directIncrementalCostUsd: 0,
  authorization: {
    repairPreparation: true,
    repairModelExecution: false,
    sixContextResumption: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-one-two-field-debate-08-publication-repair-packet"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: diagnosis.status,
  failedFieldCount: 2,
  excessWordsTotal: 5,
  validMoveProseEntries: 18,
  repairPacketCount: 1,
  diagnosticReplay: diagnosticReplay.status,
  sixContextsUnattempted: true,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction
}, null, 2));
