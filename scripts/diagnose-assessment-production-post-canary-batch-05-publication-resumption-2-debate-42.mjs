#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const RESUMPTION_ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT;
const ROOT = `${RESUMPTION_ROOT}/repair-1`;
const DIAGNOSIS = `${ROOT}/failure-diagnosis.json`;
const ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const OUTPUT = `${RESUMPTION_ROOT}/outputs/debate-42.json`;
const VALIDATION = `${RESUMPTION_ROOT}/validations/debate-42.json`;
const PROVENANCE = `${RESUMPTION_ROOT}/provenance/debate-42.json`;
const PACKET = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-42.json`;
const ACCEPTED_179 = `${RESUMPTION_ROOT}/outputs/debate-179.json`;
const ACCEPTED_05 = `${RESUMPTION_ROOT}/outputs/debate-05.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const files = [ACTIVATION, EXECUTION, ANALYSIS, OUTPUT, VALIDATION, PROVENANCE,
  PACKET, ACCEPTED_179, ACCEPTED_05,
  `${RESUMPTION_ROOT}/validations/debate-179.json`,
  `${RESUMPTION_ROOT}/provenance/debate-179.json`,
  `${RESUMPTION_ROOT}/validations/debate-05.json`,
  `${RESUMPTION_ROOT}/provenance/debate-05.json`];
const bytes = Object.fromEntries(await Promise.all(files.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const parsed = (file) => JSON.parse(bytes[file]);
const activation = parsed(ACTIVATION); const execution = parsed(EXECUTION);
const analysis = parsed(ANALYSIS); const output = parsed(OUTPUT);
const validation = parsed(VALIDATION); const packet = parsed(PACKET);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: Debate 42 diagnosis source drifted`);
const result = execution.results.find((row) => row.debateNumber === "42");
const accepted179 = execution.results.find((row) => row.debateNumber === "179");
const accepted05 = execution.results.find((row) => row.debateNumber === "05");
assertV4(execution.status === "batch-05-publication-resumption-2-complete-with-failure" &&
  execution.contextsPlanned === 4 && execution.contextsAttempted === 3 &&
  execution.contextsUnattempted === 1 && canonicalJson(execution.unattemptedContextIndexes) === canonicalJson([3]) &&
  execution.validContexts === 2 && execution.invalidContexts === 1 &&
  execution.attempts === 3 && execution.retries === 0 && execution.timeoutExtensions === 0 &&
  result?.status === "output-validation-failed" && result.gateAcceptancePassed === false &&
  result.outputSha256 === sha256(bytes[OUTPUT]) && validation.status === "failed" &&
  validation.outputSha256 === result.outputSha256 &&
  accepted179?.gateAcceptancePassed === true && accepted179.outputSha256 === sha256(bytes[ACCEPTED_179]) &&
  accepted05?.gateAcceptancePassed === true && accepted05.outputSha256 === sha256(bytes[ACCEPTED_05]) &&
  analysis.status === "batch-05-four-context-resumption-or-ten-debate-publication-replay-failed",
"the preserved Debate 42 failure boundary changed");

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
assertV4(failedFields.length === 4 && rows.filter((row) => row.words >= 105 && row.words <= 130).length === 11 &&
  failedFields.every((row) => row.characters >= 880 && row.sentences === 4 &&
    row.orderedLabelsPassed && row.terminalPunctuationPassed),
"the four-field Debate 42 critique boundary changed");
assertV4(canonicalJson(failedFields.map(({ moveId, words }) => ({ moveId, words }))) === canonicalJson([
  { moveId: "pro-analogy-distinguishes-divine-attributes", words: 131 },
  { moveId: "pro-unity-grounding-aseity-reply", words: 135 },
  { moveId: "con-begotten-son-godhead-distinction", words: 131 },
  { moveId: "con-changing-reality-epistemic-change", words: 131 }
]), "the exact Debate 42 failure inventory changed");
const diagnosticCopy = structuredClone(output); let wordsRemoved = 0;
for (const field of failedFields) {
  const sentences = diagnosticCopy.moveProse[field.moveId].critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  while (wordCount(sentences.join(" ")) > 130) {
    const words = sentences[1].split(/\s+/); words.splice(words.length - 2, 1);
    sentences[1] = words.join(" "); wordsRemoved += 1;
  }
  diagnosticCopy.moveProse[field.moveId].critique = sentences.join(" ");
}
const diagnosticReplay = validatePostCanaryBatch05PublicationOutput(diagnosticCopy, packet);
assertV4(diagnosticReplay.status === "passed" && wordsRemoved === 8,
  "the four-field in-memory Debate 42 diagnostic replay failed");
const partition = [failedFields.slice(0, 2).map(({ path }) => path),
  failedFields.slice(2).map(({ path }) => path)];
const diagnosis = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-42-publication-repair-diagnosis",
  status: "frozen-diagnosed-batch-05-debate-42-four-critique-word-overruns",
  frozenAt, productionCanary: false, batchNumber: 5, stagingOnly: true,
  classification: "four-critique-word-boundary-failures-in-complete-rejected-output",
  preservedFailure: { originalAttemptCount: 1, retries: 0, timeoutExtensions: 0,
    acceptedOutput: false, completeRejectedOutputPreserved: true,
    rejectedOutputSha256: sha256(bytes[OUTPUT]), validationMessage: validation.validationMessage },
  failedFields, failedFieldCount: 4,
  excessWordsTotal: failedFields.reduce((sum, row) => sum + row.excessWordsAboveAcceptanceMaximum, 0),
  preservedFields: { moveCount: 15, repairFields: 4, validMoveProseEntries: 11,
    everyOtherOutputFieldImmutable: true, acceptedDebate179Preserved: true,
    acceptedDebate179Sha256: sha256(bytes[ACCEPTED_179]), acceptedDebate05Preserved: true,
    acceptedDebate05Sha256: sha256(bytes[ACCEPTED_05]), debate59Unattempted: true },
  diagnosticReplay: { originalOutputModified: false, persistedCorrectedOutput: false,
    hypotheticalWordsRemoved: wordsRemoved, result: diagnosticReplay },
  minimumBoundedRepair: { operation: "two-isolated-two-field-publication-repair-packets",
    reasonMinimum: "Four diagnosed writable fields with a maximum of two fields per packet require two packets.",
    packetCount: 2, partition, attemptsPerPacket: 1, retries: 0,
    timeoutExtensions: 0, recursiveRecoveryMaximum: 0,
    mergeRule: "Replace only the four authorized critiques in the complete rejected Debate 42 output, preserve every other field, then validate the complete debate output." },
  sourceHashes: Object.fromEntries(files.sort().map((file) => [file, sha256(bytes[file])])),
  directIncrementalCostUsd: 0,
  userAuthorization: { instruction: "Authorize deterministic diagnosis and two field-disjoint repair packets for the four Debate 42 critique overruns.",
    subscriptionModel: "5.6 Sol", reasoningEffort: "low", directIncrementalCostUsdMaximum: 0 },
  authorization: { repairPreparation: true, repairModelExecution: false,
    deterministicMergeAndValidation: false, debate59Resumption: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-two-field-disjoint-debate-42-publication-repair-packets" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(DIAGNOSIS)), { recursive: true });
  await writeFile(path.resolve(DIAGNOSIS), `${JSON.stringify(diagnosis, null, 2)}\n`); }
console.log(JSON.stringify({ status: diagnosis.status, failedFieldCount: 4,
  excessWordsTotal: diagnosis.excessWordsTotal, validMoveProseEntries: 11,
  repairPacketCount: 2, diagnosticReplay: diagnosticReplay.status,
  debate59Unattempted: true, directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
