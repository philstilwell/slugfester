#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch17PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-17-publication-validation.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-17/publication-reconstruction";
const finalizedRoot = `${root}/failure-recovery/finalized`;
const overlayPath = `${finalizedRoot}/complete-publication-overlay.json`;
const analysisPath = `${finalizedRoot}/analysis.json`;
const selected = Object.freeze(["77", "44", "171", "62"]);
const shouldWrite = process.argv.includes("--write");
const finalizedAtIndex = process.argv.indexOf("--finalized-at");
const finalizedAt = finalizedAtIndex >= 0 ? process.argv[finalizedAtIndex + 1] : null;
assert(finalizedAt && !Number.isNaN(Date.parse(finalizedAt)),
  "--finalized-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

assert(!(await exists(overlayPath)), `${overlayPath} already exists`);
assert(!(await exists(analysisPath)), `${analysisPath} already exists`);

const gateFiles = Object.freeze([
  `${root}/analysis.json`,
  `${root}/continuation-analysis.json`,
  `${root}/failure-recovery/level-1/analysis.json`
]);
const expectedStatuses = Object.freeze([
  "post-canary-batch-17-publication-output-gate-failed",
  "batch-17-publication-continuation-gate-passed",
  "batch-17-publication-level-1-one-field-recovery-passed"
]);
const gates = [];
for (let index = 0; index < gateFiles.length; index += 1) {
  const bytes = await readFile(path.resolve(gateFiles[index]));
  const value = JSON.parse(bytes);
  assert.equal(value.status, expectedStatuses[index], `${gateFiles[index]} status changed`);
  gates.push({ path: gateFiles[index], sha256: sha256(bytes), status: value.status });
}

const finalLedgerPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/final-ledger/final-ledger.json";
const scorePath =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/score-pass/calculated-scores.json";
const authorizationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-17/standing-authorization.json";
const immutableSources = [];
for (const source of [authorizationPath, finalLedgerPath, scorePath]) {
  const bytes = await readFile(path.resolve(source));
  immutableSources.push({ path: source, sha256: sha256(bytes) });
}
const authorization = await readJson(authorizationPath);
assert.deepEqual(authorization.selectedDebates, selected);
assert.equal(authorization.executionControls.scorePassesMaximum, 1);
assert.equal(authorization.authorization.nextBatchSelection, false);

const debates = [];
const provenance = [];
for (const debateNumber of selected) {
  const outputPath = `${root}/outputs/debate-${debateNumber}.json`;
  const packetPath = `${root}/packets/debate-${debateNumber}.json`;
  const validationPath = `${root}/validations/debate-${debateNumber}.json`;
  const provenancePath = `${root}/provenance/debate-${debateNumber}.json`;
  const [outputBytes, packetBytes, validationBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(outputPath)), readFile(path.resolve(packetPath)),
    readFile(path.resolve(validationPath)), readFile(path.resolve(provenancePath))
  ]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const recordedValidation = JSON.parse(validationBytes);
  const replay = validatePostCanaryBatch17PublicationOutput(output, packet);
  assert.equal(replay.status, "passed", `Debate ${debateNumber}: replay failed`);
  assert.equal(recordedValidation.status, "passed",
    `Debate ${debateNumber}: recorded validation failed`);
  assert.equal(recordedValidation.outputSha256, sha256(outputBytes),
    `Debate ${debateNumber}: output hash changed`);
  assert.deepEqual(recordedValidation.validationSummary, replay,
    `Debate ${debateNumber}: validation replay changed`);
  assert.equal(replay.calculatedScoresAuthoredByModel, 0);
  assert.equal(replay.lockedScoresUnchanged, true);
  debates.push({ debateNumber, outputSha256: sha256(outputBytes),
    packetSha256: sha256(packetBytes), validationSha256: sha256(validationBytes),
    provenanceSha256: sha256(provenanceBytes), validation: replay });
  provenance.push({ debateNumber, path: provenancePath, sha256: sha256(provenanceBytes) });
}

const totals = {
  debates: debates.length,
  moves: debates.reduce((sum, row) => sum + row.validation.moves, 0),
  critiques: debates.reduce((sum, row) => sum + row.validation.critiques, 0),
  exactSourceQuotes: debates.reduce((sum, row) => sum + row.validation.quoteExactSourceMatches, 0),
  overallCommentarySides: debates.reduce((sum, row) => sum + row.validation.overallCommentarySides, 0),
  aiExtensionSides: debates.reduce((sum, row) => sum + row.validation.aiExtensionSides, 0)
};
assert.deepEqual(totals, { debates: 4, moves: 79, critiques: 79,
  exactSourceQuotes: 8, overallCommentarySides: 8, aiExtensionSides: 8 });

const recoveryUse = {
  initialContextsAttempted: 3,
  continuationContextsAttempted: 1,
  initialAndContinuationModelContexts: 4,
  levelOneContexts: 1,
  levelOneValidContexts: 1,
  levelOneInvalidContexts: 0,
  levelTwoContexts: 0,
  exceptionalThirdLevelContexts: 0,
  totalModelContexts: 5,
  retries: 0,
  timeoutExtensions: 0
};
const recoverySummaries = [{
  debateNumber: "171",
  sourceFailure: "output-validation-failed",
  defect: "one-critique-word-count-one-word-short",
  levelOneContexts: 1,
  repairedFields: 1,
  finalValidation: "passed"
}];

const overlay = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-17-complete-publication-recovery-overlay",
  protocolId: "assessment-production-post-canary-batch-17-publication-reconstruction",
  status: "complete-four-debate-batch-17-publication-cohort-valid-after-bounded-recovery",
  finalizedAt,
  debateOrder: selected,
  debates,
  recoverySummaries,
  recoveryUse,
  gateEvidence: gates,
  provenance,
  immutableSources,
  integrity: {
    originalFailuresPreserved: true,
    acceptedCompanionFieldsChanged: false,
    rejectedProseReused: false,
    scoresChanged: false,
    scorePassRerun: false,
    modelAuthoredScores: 0
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-batch-17-deterministic-publication-compilation"
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-17-publication-recovery-finalization-analysis",
  protocolId: overlay.protocolId,
  status: "batch-17-publication-recovery-complete-four-debate-gate-passed",
  finalizedAt,
  ...totals,
  recoveryUse,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  modelAuthoredScores: 0,
  scoresChanged: false,
  scorePassRerun: false,
  authorization: { deterministicCompilationPreparation: true,
    furtherPublicationRecovery: false, scorePass: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: overlay.nextAuthorizedAction
};
if (shouldWrite) {
  await mkdir(path.resolve(finalizedRoot), { recursive: true });
  await writeFile(path.resolve(overlayPath), pretty(overlay));
  await writeFile(path.resolve(analysisPath), pretty(analysis));
}
console.log(pretty({ status: analysis.status, ...totals, recoveryUse,
  scoresChanged: false, scorePassRerun: false, directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }));
