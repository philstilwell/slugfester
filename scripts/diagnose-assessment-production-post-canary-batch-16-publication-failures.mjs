#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch16PublicationOutput } from "./lib/assessment-production-post-canary-batch-16-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-16/publication-reconstruction";
const files = {
  execution: `${root}/model-execution.json`,
  analysis: `${root}/analysis.json`,
  packet: `${root}/packets/debate-16.json`,
  output: `${root}/outputs/debate-16.json`,
  validation: `${root}/validations/debate-16.json`,
  provenance: `${root}/provenance/debate-16.json`,
  diagnosis: `${root}/failure-recovery/diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const loaded = Object.fromEntries(
  await Promise.all(
    Object.entries(files)
      .filter(([key]) => key !== "diagnosis")
      .map(async ([key, file]) => [key, await readFile(path.resolve(file))])
  )
);
const json = (key) => JSON.parse(loaded[key]);
const execution = json("execution");
const analysis = json("analysis");
const packet = json("packet");
const output = json("output");
const validation = json("validation");
const provenance = json("provenance");

assert.equal(execution.status, "post-canary-batch-16-publication-gate-complete-with-failure");
assert.equal(execution.contextsAttempted, 1);
assert.equal(execution.validContexts, 0);
assert.equal(execution.invalidContexts, 1);
assert.deepEqual(execution.unattemptedContextIndexes, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.correctionContexts, 0);
assert.equal(analysis.status, "post-canary-batch-16-publication-output-gate-failed");
assert.equal(validation.status, "failed");
assert.equal(provenance.attemptCount, 1);
assert.equal(provenance.retryCount, 0);
assert.equal(sha256(loaded.output), validation.outputSha256);
assert.equal(sha256(loaded.output), provenance.outputSha256);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const failedCritiques = [];
for (const [moveId, prose] of Object.entries(output.moveProse)) {
  const critique = String(prose.critique).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  const failures = [];
  if (words < 105 || words > 130) failures.push("word-count");
  if (critique.length < 880) failures.push("minimum-characters");
  if (sentences.length !== 4) failures.push("sentence-count");
  if (
    sentences.length === 4 &&
    sentences.some((sentence, index) => !sentence.toLowerCase().startsWith(labels[index]))
  ) {
    failures.push("label-order");
  }
  if (failures.length) {
    failedCritiques.push({
      moveId,
      field: `moveProse.${moveId}.critique`,
      failures,
      observedWords: words,
      observedCharacters: critique.length,
      observedSentences: sentences.length,
      rejectedPriorStringReusable: false
    });
  }
}
assert.deepEqual(
  failedCritiques.map((item) => item.moveId),
  [
    "con-personal-recovery-does-not-establish-christianity",
    "con-benefit-does-not-make-existential-claims-true",
    "con-abrahamic-similarity-and-christian-doctrinal-decline",
    "pro-scriptural-and-exemplar-distinction",
    "con-church-organization-does-not-establish-moral-fitness",
    "pro-criticism-requires-viable-replacement",
    "pro-affirmative-belief-against-islamist-recruitment",
    "pro-confident-inheritance-and-active-countermessage",
    "con-enlightened-rationality-against-ideological-virus"
  ]
);
assert(failedCritiques.every((item) => item.failures.join(",") === "word-count"));

const diagnosticFiller = "Strongest feature: This argument clearly identifies a relevant evidential connection and explains why the stated consideration matters to the participant’s position, giving the reader a concrete inferential path grounded in the preserved exchange. Principal limitation: Its force remains constrained because several necessary assumptions are asserted more confidently than the cited support warrants, and plausible alternatives are not sufficiently distinguished or eliminated within the available record. Live burden: To improve the case, the speaker would need to defend those assumptions directly, specify what evidence could count against the inference, and show why competing explanations fit the quoted material less well. Locked score: The assigned result therefore reflects meaningful argumentative value and clear relevance while reserving substantial credit for unresolved support, scope, and comparative-explanation burdens that remain visible in the locked findings.";
assert.equal(wordCount(diagnosticFiller), 130);
assert(diagnosticFiller.length >= 880);
const diagnosticReplay = structuredClone(output);
for (const item of failedCritiques) {
  diagnosticReplay.moveProse[item.moveId].critique = diagnosticFiller;
}
assert.equal(validatePostCanaryBatch16PublicationOutput(diagnosticReplay, packet).status, "passed");

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-failure-diagnosis",
  status: "batch-16-publication-canary-nine-critique-fields-failed",
  diagnosedAt: new Date().toISOString(),
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  batchNumber: 16,
  debateNumber: "16",
  sourceFailure: {
    status: "output-validation-failed",
    attemptedContexts: 1,
    unattemptedContextIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    priorAttemptPreserved: true,
    retries: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  failedCritiques,
  totals: {
    invalidFields: failedCritiques.length,
    validCompanionCritiques: Object.keys(output.moveProse).length - failedCritiques.length,
    otherTopLevelFieldsDeterministicallyValid: true
  },
  diagnosisMethod: {
    everyCritiqueContractChecked: true,
    nonCritiqueFieldsReplayedWithInMemoryDiagnosticSubstitution: true,
    diagnosticSubstitutionPersisted: false,
    originalOutputAltered: false
  },
  sourceHashes: Object.fromEntries(
    Object.entries(files)
      .filter(([key]) => key !== "diagnosis")
      .map(([key, file]) => [file, sha256(loaded[key])])
  ),
  authorization: {
    minimumFreshFieldDisjointRecoveryShards: true,
    recoveryLevel: 1,
    attemptsPerShard: 1,
    retries: false,
    continueUnattemptedInitialContextsAfterRecovery: false,
    scorePass: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-nine-fresh-one-field-batch-16-publication-recovery-shards"
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(files.diagnosis)), { recursive: true });
  await writeFile(path.resolve(files.diagnosis), pretty(diagnosis));
}
console.log(pretty({
  status: shouldWrite ? diagnosis.status : "preview",
  debateNumber: "16",
  invalidFields: failedCritiques.length,
  invalidMoveIds: failedCritiques.map((item) => item.moveId),
  otherTopLevelFieldsDeterministicallyValid: true,
  recoveryLevel: 1,
  attemptsMaximum: failedCritiques.length,
  retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction
}));
