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
const recoveryRoot = `${root}/final-seven-failure-recovery`;
const files = {
  execution: `${root}/model-execution-final-seven.json`,
  analysis: `${root}/final-seven-analysis.json`,
  packet: `${root}/packets/debate-92.json`,
  output: `${root}/outputs/debate-92.json`,
  validation: `${root}/validations/debate-92.json`,
  provenance: `${root}/provenance/debate-92.json`,
  diagnosis: `${recoveryRoot}/diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const loaded = Object.fromEntries(await Promise.all(Object.entries(files).filter(([key]) => key !== "diagnosis").map(async ([key, file]) => [key, await readFile(path.resolve(file))])));
const json = (key) => JSON.parse(loaded[key]);
const execution = json("execution");
const analysis = json("analysis");
const packet = json("packet");
const output = json("output");
const validation = json("validation");
const provenance = json("provenance");
assert.equal(execution.status, "batch-16-publication-final-seven-complete-with-failure");
assert.equal(execution.contextsAttempted, 7);
assert.equal(execution.validContexts, 6);
assert.equal(execution.invalidContexts, 1);
assert.deepEqual(execution.unattemptedContextIndexes, []);
assert.equal(execution.retries, 0);
assert.equal(analysis.status, "batch-16-publication-final-seven-gate-failed");
assert.equal(validation.status, "failed");
assert.equal(provenance.attemptCount, 1);
assert.equal(provenance.retryCount, 0);
assert.equal(validation.outputSha256, sha256(loaded.output));

const failures = [];
for (const side of ["pro", "con"]) {
  const quote = output.representativeQuotes[side];
  const words = wordCount(quote.context);
  if (words < 12 || words > 55) failures.push({ debateNumber: "92", kind: "representative-quote-context", field: `representativeQuotes.${side}.context`, side, sourceMoveId: quote.sourceMoveId, observedWords: words, failure: "context-outside-12-55-words", rejectedPriorStringReusable: false });
}
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
for (const [moveId, prose] of Object.entries(output.moveProse)) {
  const critique = String(prose.critique).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  const defects = [];
  if (words < 105 || words > 130) defects.push("word-count");
  if (critique.length < 880) defects.push("minimum-characters");
  if (sentences.length !== 4) defects.push("sentence-count");
  if (sentences.length === 4 && sentences.some((sentence, index) => !sentence.toLowerCase().startsWith(labels[index]))) defects.push("label-order");
  if (defects.length) failures.push({ debateNumber: "92", kind: "critique", field: `moveProse.${moveId}.critique`, moveId, defects, observedWords: words, observedCharacters: critique.length, observedSentences: sentences.length, rejectedPriorStringReusable: false });
}
assert.deepEqual(failures.map((item) => item.field), [
  "representativeQuotes.pro.context",
  "representativeQuotes.con.context",
  "moveProse.con-mirror-past-against-future.critique",
  "moveProse.con-every-all-case-specific.critique",
  "moveProse.pro-potential-cannot-become-actual.critique",
  "moveProse.pro-eternal-countdown-earlier-completion.critique",
  "moveProse.con-countdown-necessity-not-sufficiency.critique",
  "moveProse.con-local-countdown-explanation.critique",
  "moveProse.pro-member-whole-quantifier-warning.critique"
]);
const filler = "Strongest feature: This argument clearly identifies a relevant evidential connection and explains why the stated consideration matters to the participant’s position, giving the reader a concrete inferential path grounded in the preserved exchange. Principal limitation: Its force remains constrained because several necessary assumptions are asserted more confidently than the cited support warrants, and plausible alternatives are not sufficiently distinguished or eliminated within the available record. Live burden: To improve the case, the speaker would need to defend those assumptions directly, specify what evidence could count against the inference, and show why competing explanations fit the quoted material less well. Locked score: The assigned result therefore reflects meaningful argumentative value and clear relevance while reserving substantial credit for unresolved support, scope, and comparative-explanation burdens that remain visible in the locked findings.";
const replay = structuredClone(output);
for (const failure of failures) {
  if (failure.kind === "critique") replay.moveProse[failure.moveId].critique = filler;
  else replay.representativeQuotes[failure.side].context = "This quotation states the participant’s central claim in its immediate argumentative setting and preserves the exact source wording without adding a new inference.";
}
assert.equal(validatePostCanaryBatch16PublicationOutput(replay, packet).status, "passed");
const diagnosis = { schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-final-seven-failure-diagnosis", status: "batch-16-publication-final-seven-debate-92-nine-field-failure-diagnosed", diagnosedAt: new Date().toISOString(), checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), batchNumber: 16, failedDebates: ["92"], failures, totals: { failedDebates: 1, invalidFields: 9, invalidCritiques: 7, invalidQuoteContexts: 2, otherFieldsDeterministicallyValid: true }, diagnosisMethod: { everyCritiqueContractChecked: true, bothQuoteContextContractsChecked: true, nonTargetFieldsReplayedWithInMemoryDiagnosticSubstitution: true, diagnosticSubstitutionPersisted: false, originalOutputAltered: false }, sourceHashes: Object.fromEntries(Object.entries(files).filter(([key]) => key !== "diagnosis").map(([key, file]) => [file, sha256(loaded[key])])), authorization: { recoveryLevel1Preparation: true, minimumFreshFieldDisjointShards: true, attemptsPerShard: 1, retries: false, scorePass: false, productionMutation: false, nextBatchSelection: false }, nextAuthorizedAction: "prepare-nine-fresh-one-field-batch-16-publication-final-seven-recovery-level-1-shards" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(files.diagnosis)), { recursive: true }); await writeFile(path.resolve(files.diagnosis), pretty(diagnosis)); }
console.log(pretty({ status: shouldWrite ? diagnosis.status : "preview", failedDebate: "92", invalidFields: failures.length, fields: failures.map((item) => item.field), otherFieldsDeterministicallyValid: true, recoveryLevel: 1, attemptsMaximum: 9, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0 }));
