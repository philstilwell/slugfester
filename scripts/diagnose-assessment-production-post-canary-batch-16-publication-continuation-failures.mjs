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
const recoveryRoot = `${root}/continuation-failure-recovery`;
const files = {
  execution: `${root}/model-execution-continuation.json`,
  analysis: `${root}/continuation-analysis.json`,
  diagnosis: `${recoveryRoot}/diagnosis.json`
};
const debates = ["108", "164"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const executionBytes = await readFile(path.resolve(files.execution));
const analysisBytes = await readFile(path.resolve(files.analysis));
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
assert.equal(execution.status, "batch-16-publication-continuation-complete-with-failure");
assert.equal(execution.contextsAttempted, 2);
assert.equal(execution.invalidContexts, 2);
assert.deepEqual(execution.unattemptedContextIndexes, [3, 4, 5, 6, 7, 8, 9]);
assert.equal(execution.retries, 0);
assert.equal(analysis.status, "batch-16-publication-continuation-gate-failed");

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const diagnosticFiller = "Strongest feature: This argument clearly identifies a relevant evidential connection and explains why the stated consideration matters to the participant’s position, giving the reader a concrete inferential path grounded in the preserved exchange. Principal limitation: Its force remains constrained because several necessary assumptions are asserted more confidently than the cited support warrants, and plausible alternatives are not sufficiently distinguished or eliminated within the available record. Live burden: To improve the case, the speaker would need to defend those assumptions directly, specify what evidence could count against the inference, and show why competing explanations fit the quoted material less well. Locked score: The assigned result therefore reflects meaningful argumentative value and clear relevance while reserving substantial credit for unresolved support, scope, and comparative-explanation burdens that remain visible in the locked findings.";
const failures = [];
const sourceHashes = { [files.execution]: sha256(executionBytes), [files.analysis]: sha256(analysisBytes) };
for (const debateNumber of debates) {
  const debateFiles = {
    packet: `${root}/packets/debate-${debateNumber}.json`,
    output: `${root}/outputs/debate-${debateNumber}.json`,
    validation: `${root}/validations/debate-${debateNumber}.json`,
    provenance: `${root}/provenance/debate-${debateNumber}.json`
  };
  const loaded = Object.fromEntries(await Promise.all(Object.entries(debateFiles).map(async ([key, file]) => [key, await readFile(path.resolve(file))])));
  for (const [key, file] of Object.entries(debateFiles)) sourceHashes[file] = sha256(loaded[key]);
  const packet = JSON.parse(loaded.packet);
  const output = JSON.parse(loaded.output);
  const validation = JSON.parse(loaded.validation);
  const provenance = JSON.parse(loaded.provenance);
  assert.equal(validation.status, "failed");
  assert.equal(provenance.attemptCount, 1);
  assert.equal(provenance.retryCount, 0);
  assert.equal(validation.outputSha256, sha256(loaded.output));
  const moveById = new Map(packet.moves.map((move) => [move.moveId, move]));
  const debateFailures = [];
  for (const side of ["pro", "con"]) {
    const quote = output.representativeQuotes[side];
    const move = moveById.get(quote.sourceMoveId);
    if (!move?.sourceExcerpt.includes(quote.text)) {
      debateFailures.push({
        debateNumber,
        kind: "representative-quote-text",
        field: `representativeQuotes.${side}.text`,
        side,
        sourceMoveId: quote.sourceMoveId,
        failure: "not-an-exact-source-substring",
        rejectedPriorStringReusable: false
      });
    }
  }
  for (const [moveId, prose] of Object.entries(output.moveProse)) {
    const critique = String(prose.critique).trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    const defects = [];
    if (words < 105 || words > 130) defects.push("word-count");
    if (critique.length < 880) defects.push("minimum-characters");
    if (sentences.length !== 4) defects.push("sentence-count");
    if (sentences.length === 4 && sentences.some((sentence, index) => !sentence.toLowerCase().startsWith(labels[index]))) defects.push("label-order");
    if (defects.length) debateFailures.push({ debateNumber, kind: "critique", field: `moveProse.${moveId}.critique`, moveId, defects, observedWords: words, observedCharacters: critique.length, observedSentences: sentences.length, rejectedPriorStringReusable: false });
  }
  const replay = structuredClone(output);
  for (const failure of debateFailures) {
    if (failure.kind === "critique") replay.moveProse[failure.moveId].critique = diagnosticFiller;
    else {
      const source = moveById.get(failure.sourceMoveId).sourceExcerpt;
      const tokens = [...source.matchAll(/\S+/g)];
      replay.representativeQuotes[failure.side].text = source.slice(tokens[0].index, tokens[Math.min(5, tokens.length - 1)].index + tokens[Math.min(5, tokens.length - 1)][0].length);
    }
  }
  assert.equal(validatePostCanaryBatch16PublicationOutput(replay, packet).status, "passed");
  failures.push(...debateFailures);
}
assert.deepEqual(failures.map((item) => item.field), [
  "representativeQuotes.con.text",
  "moveProse.pro-abstract-ontology-objection.critique",
  "moveProse.con-irreducible-intrinsic-value.critique",
  "moveProse.con-explanatory-parity.critique",
  "moveProse.con-mental-causation-under-closure.critique",
  "moveProse.con-supererogation-permission.critique"
]);
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-continuation-failure-diagnosis",
  status: "batch-16-publication-continuation-six-field-failures-diagnosed",
  diagnosedAt: new Date().toISOString(),
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  batchNumber: 16,
  failedDebates: debates,
  failures,
  unattemptedContextIndexes: [3, 4, 5, 6, 7, 8, 9],
  totals: { failedDebates: 2, invalidFields: 6, invalidCritiques: 5, invalidQuoteTexts: 1, otherFieldsDeterministicallyValid: true },
  diagnosisMethod: { everyCritiqueContractChecked: true, bothQuoteContractsChecked: true, nonTargetFieldsReplayedWithInMemoryDiagnosticSubstitution: true, diagnosticSubstitutionPersisted: false, originalOutputsAltered: false },
  sourceHashes,
  authorization: { recoveryLevel1Preparation: true, minimumFreshFieldDisjointShards: true, attemptsPerShard: 1, retries: false, continueUnattemptedContextsAfterRecovery: false, scorePass: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "prepare-six-fresh-one-field-batch-16-publication-continuation-recovery-level-1-shards"
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(files.diagnosis)), { recursive: true });
  await writeFile(path.resolve(files.diagnosis), pretty(diagnosis));
}
console.log(pretty({ status: shouldWrite ? diagnosis.status : "preview", failedDebates: debates, invalidFields: failures.length, fields: failures.map((item) => `${item.debateNumber}:${item.field}`), otherFieldsDeterministicallyValid: true, recoveryLevel: 1, attemptsMaximum: failures.length, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0 }));
