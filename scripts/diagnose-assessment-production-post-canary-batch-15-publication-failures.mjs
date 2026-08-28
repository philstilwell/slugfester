#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch15PublicationOutput } from "./lib/assessment-production-post-canary-batch-15-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-15/publication-reconstruction";
const outputPath = `${root}/failure-recovery/diagnosis.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
const diagnosedAtIndex = process.argv.indexOf("--diagnosed-at");
const diagnosedAt = diagnosedAtIndex >= 0 ? process.argv[diagnosedAtIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
assert(diagnosedAt && !Number.isNaN(Date.parse(diagnosedAt)), "--diagnosed-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const critiqueDiagnostic = (moveId, value) => {
  const critique = String(value).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  const violations = [];
  if (words < 105 || words > 130) violations.push("word-count");
  if (critique.length < 880) violations.push("minimum-characters");
  if (sentences.length !== 4) violations.push("sentence-count");
  labels.forEach((label, index) => {
    if (!sentences[index]?.toLowerCase().startsWith(label)) violations.push(`ordered-label-${index + 1}`);
    if (sentences[index] && !/[.!?]["')\]]?$/.test(sentences[index].trim())) violations.push(`terminal-punctuation-${index + 1}`);
  });
  return { moveId, words, characters: critique.length, sentences: sentences.length, violations };
};
const noveltyItems = (output) => ["pro", "con"].flatMap((side) => {
  const extension = output.aiExtension[side];
  return [extension.thesis, ...extension.premises, extension.conclusion, ...extension.newArguments];
});

const [executionBytes, analysisBytes] = await Promise.all([executionPath, analysisPath].map((file) => readFile(path.resolve(file))));
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
assert.equal(execution.status, "post-canary-batch-15-publication-gate-complete-with-failure");
assert.equal(execution.contextsAttempted, 10);
assert.equal(execution.validContexts, 6);
assert.equal(execution.invalidContexts, 4);
assert.deepEqual(execution.results.filter((item) => !item.gateAcceptancePassed).map((item) => [item.debateNumber, item.status]), [
  ["128", "timed-out"],
  ["98", "output-validation-failed"],
  ["155", "output-validation-failed"],
  ["178", "output-validation-failed"]
]);
assert.equal(analysis.status, "post-canary-batch-15-publication-output-gate-failed");

const expectedCritiqueCounts = { "98": 13, "155": 4, "178": 10 };
const validationFailures = [];
const preservedEvidence = {
  [executionPath]: sha256(executionBytes),
  [analysisPath]: sha256(analysisBytes)
};
for (const debateNumber of ["98", "155", "178"]) {
  const files = {
    packet: `${root}/packets/debate-${debateNumber}.json`,
    output: `${root}/outputs/debate-${debateNumber}.json`,
    validation: `${root}/validations/debate-${debateNumber}.json`,
    provenance: `${root}/provenance/debate-${debateNumber}.json`
  };
  const entries = await Promise.all(Object.entries(files).map(async ([key, file]) => [key, file, await readFile(path.resolve(file))]));
  const bytes = Object.fromEntries(entries.map(([key, , value]) => [key, value]));
  const packet = JSON.parse(bytes.packet);
  const output = JSON.parse(bytes.output);
  const validation = JSON.parse(bytes.validation);
  assert.equal(validation.status, "failed");
  assert.equal(validation.outputSha256, sha256(bytes.output));
  for (const [, file, value] of entries) preservedEvidence[file] = sha256(value);

  const diagnostics = packet.moves.map((move) => critiqueDiagnostic(move.moveId, output.moveProse[move.moveId].critique));
  const invalidCritiques = diagnostics.filter((item) => item.violations.length > 0);
  assert.equal(invalidCritiques.length, expectedCritiqueCounts[debateNumber]);
  assert(invalidCritiques.every((item) => item.violations.length === 1 && item.violations[0] === "word-count" && item.words > 130));
  const invalidNoveltyExplanations = noveltyItems(output)
    .filter((item) => wordCount(item.novelty.explanation) < 8)
    .map((item) => ({ itemId: item.id, words: wordCount(item.novelty.explanation), valueSha256: sha256(item.novelty.explanation) }));
  if (debateNumber === "98") assert.deepEqual(invalidNoveltyExplanations.map((item) => [item.itemId, item.words]), [["d98-ai-con-p5", 7]]);
  else assert.equal(invalidNoveltyExplanations.length, 0);

  const replay = structuredClone(output);
  const acceptedCritique = diagnostics.find((item) => item.violations.length === 0);
  for (const item of invalidCritiques) replay.moveProse[item.moveId].critique = output.moveProse[acceptedCritique.moveId].critique;
  for (const item of invalidNoveltyExplanations) {
    const target = noveltyItems(replay).find((candidate) => candidate.id === item.itemId);
    target.novelty.explanation = replay.aiExtension.con.premises[3].novelty.explanation;
  }
  assert.equal(validatePostCanaryBatch15PublicationOutput(replay, packet).status, "passed");
  validationFailures.push({
    debateNumber,
    status: `${invalidCritiques.length}-critique-fields${invalidNoveltyExplanations.length ? "-and-one-novelty-explanation" : ""}-failed-all-other-fields-valid`,
    invalidCritiques,
    invalidNoveltyExplanations,
    invalidFieldCount: invalidCritiques.length + invalidNoveltyExplanations.length,
    allOtherFieldsStructurallyValid: true,
    surrogateValidationWasInMemoryOnly: true
  });
}

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-failure-diagnosis",
  status: "batch-15-publication-three-bounded-field-failures-and-one-timeout-diagnosed",
  diagnosedAt,
  batchNumber: 15,
  recoveryLevel: 1,
  ordinaryRecoveryLevelsMaximum: 2,
  preservedEvidence,
  timeoutFailure: {
    debateNumber: "128",
    status: "timed-out",
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensions: 0,
    outputWritten: false,
    partialOutputReusable: false,
    recoveryPlan: { freshIsolatedTopLevelFieldDisjointShards: 3, attemptsPerShard: 1, retriesMaximum: 0 }
  },
  validationFailures,
  totals: {
    invalidCritiques: validationFailures.reduce((sum, item) => sum + item.invalidCritiques.length, 0),
    invalidNoveltyExplanations: validationFailures.reduce((sum, item) => sum + item.invalidNoveltyExplanations.length, 0),
    invalidFields: validationFailures.reduce((sum, item) => sum + item.invalidFieldCount, 0),
    freshFieldDisjointRepairShards: 14,
    freshTimeoutRecoveryShards: 3,
    acceptedFieldsChanged: 0,
    scoresChanged: 0,
    scorePassReruns: 0
  },
  authorization: {
    levelOneRecoveryPreparation: true,
    modelExecution: false,
    retries: false,
    scorePass: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-minimum-batch-15-level-one-field-disjoint-publication-recovery-shards"
};
assert.equal(diagnosis.totals.invalidCritiques, 27);
assert.equal(diagnosis.totals.invalidNoveltyExplanations, 1);
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(path.resolve(outputPath), `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify(diagnosis, null, 2));
