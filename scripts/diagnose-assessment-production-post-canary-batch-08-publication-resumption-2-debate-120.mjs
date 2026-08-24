#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_08_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-2.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");

const RESUMPTION_ROOT = POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT;
const ROOT = `${RESUMPTION_ROOT}/repair-1`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const PREPARATION = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-120.json`;
const VALIDATION = `${RESUMPTION_ROOT}/validations/debate-120.json`;
const PROVENANCE = `${RESUMPTION_ROOT}/provenance/debate-120.json`;
const PACKET = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-120.json`;
const ACCEPTED_88 = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/merged/debate-88.json`;
const ACCEPTED_194 = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/outputs/debate-194.json`;
const ACCEPTED_137 = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/outputs/debate-137.json`;
const ACCEPTED_08 = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-08.json`;
const ACCEPTED_65 = `${RESUMPTION_ROOT}/outputs/debate-65.json`;
const ACCEPTED_140 = `${RESUMPTION_ROOT}/outputs/debate-140.json`;
const ACCEPTED_156 = `${RESUMPTION_ROOT}/outputs/debate-156.json`;
const ACCEPTED_118 = `${RESUMPTION_ROOT}/outputs/debate-118.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const files = [PREPARATION, ACTIVATION, EXECUTION, ANALYSIS, OUTPUT, VALIDATION,
  PROVENANCE, PACKET, ACCEPTED_88, ACCEPTED_194, ACCEPTED_137, ACCEPTED_08,
  ACCEPTED_65, ACCEPTED_140, ACCEPTED_156, ACCEPTED_118];
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
    `${file}: Debate 120 diagnosis source drifted`);
}
const result = execution.results.find((row) => row.debateNumber === "120");
assertV4(
  execution.status === "post-canary-batch-08-publication-resumption-2-complete-with-failure" &&
  execution.contextsPlanned === 6 && execution.contextsAttempted === 5 &&
  execution.contextsUnattempted === 1 &&
  canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([5]) &&
  execution.validContexts === 4 && execution.invalidContexts === 1 &&
  execution.attempts === 5 && execution.retries === 0 && execution.timeoutExtensions === 0 &&
  result?.status === "output-validation-failed" && result.gateAcceptancePassed === false &&
  result.outputSha256 === sha256(bytes[OUTPUT]) && validation.status === "failed" &&
  validation.outputSha256 === result.outputSha256,
  "the preserved Debate 120 failure boundary changed"
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
const failedCritiques = rows.filter((row) => row.words > 130);
assertV4(
  failedCritiques.length === 2 &&
  rows.filter((row) => row.words >= 105 && row.words <= 130).length === 17 &&
  failedCritiques.every((row) => row.characters >= 880 && row.sentences === 4 &&
    row.orderedLabelsPassed && row.terminalPunctuationPassed),
  "the two-field Debate 120 critique boundary changed"
);
assertV4(canonicalJson(failedCritiques.map(({ moveId, words }) => ({ moveId, words }))) ===
  canonicalJson([
    { moveId: "con-gospels-mythic-literary-material", words: 132 },
    { moveId: "pro-exodus-injury-protection", words: 133 }
  ]), "the exact Debate 120 failure inventory changed");

const noveltyPath = "aiExtension.pro.premises[3].novelty.explanation";
const noveltyExplanation = output.aiExtension?.pro?.premises?.[3]?.novelty?.explanation;
assertV4(
  output.aiExtension.pro.premises[3].id === "ai120-pro-premise-4" &&
  noveltyExplanation === "Repairs the incomplete slavery and conquest reconciliations." &&
  wordCount(noveltyExplanation) === 7,
  "the Debate 120 novelty-explanation failure changed"
);
const failedFields = [
  ...failedCritiques.map((row) => ({ type: "critique-word-boundary", ...row })),
  {
    type: "novelty-explanation-minimum-words",
    path: noveltyPath,
    itemId: "ai120-pro-premise-4",
    words: 7,
    acceptanceMinimumWords: 8,
    originalText: noveltyExplanation
  }
];

const diagnosticCopy = structuredClone(output);
let wordsRemoved = 0;
for (const field of failedCritiques) {
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
diagnosticCopy.aiExtension.pro.premises[3].novelty.explanation =
  "Repairs the incomplete slavery and conquest reconciliations by identifying their unresolved burdens.";
const diagnosticReplay = validatePostCanaryBatch08PublicationOutput(diagnosticCopy, packet);
assertV4(diagnosticReplay.status === "passed" && wordsRemoved === 5,
  "the two-field in-memory Debate 120 diagnostic replay failed");

const partition = [
  failedCritiques.map(({ path: field }) => field),
  [noveltyPath]
];
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-debate-120-publication-repair-diagnosis",
  status: "frozen-diagnosed-batch-08-debate-120-three-field-publication-validation-failure",
  frozenAt,
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  classification: "two-critique-word-boundary-failures-and-one-short-novelty-explanation-in-complete-rejected-output",
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
  failedFieldCount: 3,
  excessWordsTotal: 5,
  preservedFields: {
    moveCount: 19,
    repairFields: 3,
    validMoveProseEntries: 17,
    everyOtherOutputFieldImmutable: true,
    acceptedDebate88Preserved: true,
    acceptedDebate194Preserved: true,
    acceptedDebate137Preserved: true,
    acceptedDebate08Preserved: true,
    acceptedDebate65Preserved: true,
    acceptedDebate140Preserved: true,
    acceptedDebate156Preserved: true,
    acceptedDebate118Preserved: true,
    oneContextUnattempted: true
  },
  diagnosticReplay: {
    originalOutputModified: false,
    persistedCorrectedOutput: false,
    hypotheticalWordsRemovedFromCritiques: wordsRemoved,
    hypotheticalNoveltyExplanationReplacement:
      diagnosticCopy.aiExtension.pro.premises[3].novelty.explanation,
    result: diagnosticReplay
  },
  minimumBoundedRepair: {
    operation: "two-field-disjoint-publication-repair-packets-partitioned-two-plus-one",
    reasonMinimum: "Three diagnosed writable fields under the two-field-per-packet ceiling require two packets.",
    packetCount: 2,
    partition,
    attemptsPerPacket: 1,
    retries: 0,
    timeoutExtensions: 0,
    recursiveRecoveryMaximum: 1,
    mergeRule: "Replace only the two authorized critiques and one authorized novelty explanation in the complete rejected Debate 120 output, preserve every other field, validate Debate 120, then resume only untouched Debate 145."
  },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  directIncrementalCostUsd: 0,
  authorization: {
    repairPreparation: true,
    repairModelExecution: false,
    oneContextResumption: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-two-field-disjoint-debate-120-publication-repair-packets"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: diagnosis.status,
  failedFieldCount: 3,
  excessWordsTotal: 5,
  validMoveProseEntries: 17,
  repairPacketCount: 2,
  diagnosticReplay: diagnosticReplay.status,
  oneContextUnattempted: true,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction
}, null, 2));
