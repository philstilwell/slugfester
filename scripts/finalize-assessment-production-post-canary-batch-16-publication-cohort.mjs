#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch16PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-16-publication-validation.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-16/publication-reconstruction";
const finalizedRoot = `${root}/failure-recovery/finalized`;
const overlayPath = `${finalizedRoot}/complete-publication-overlay.json`;
const analysisPath = `${finalizedRoot}/analysis.json`;
const selected = Object.freeze(["16", "108", "164", "144", "76", "41", "92", "139", "163", "161"]);
const shouldWrite = process.argv.includes("--write");
const finalizedAtIndex = process.argv.indexOf("--finalized-at");
const finalizedAt = finalizedAtIndex >= 0 ? process.argv[finalizedAtIndex + 1] : null;
assert(finalizedAt && !Number.isNaN(Date.parse(finalizedAt)), "--finalized-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);

assert(!(await exists(overlayPath)), `${overlayPath} already exists`);
assert(!(await exists(analysisPath)), `${analysisPath} already exists`);

const gateFiles = Object.freeze([
  `${root}/analysis.json`,
  `${root}/failure-recovery/level-1/analysis.json`,
  `${root}/failure-recovery/level-2/analysis.json`,
  `${root}/continuation-analysis.json`,
  `${root}/continuation-failure-recovery/level-1/analysis.json`,
  `${root}/final-seven-analysis.json`,
  `${root}/final-seven-failure-recovery/level-1/analysis.json`,
  `${root}/final-seven-failure-recovery/level-2/analysis.json`
]);
const expectedStatuses = Object.freeze([
  "post-canary-batch-16-publication-output-gate-failed",
  "batch-16-publication-level-1-recovery-gate-failed",
  "batch-16-publication-two-level-one-field-recovery-passed",
  "batch-16-publication-continuation-gate-failed",
  "batch-16-publication-continuation-level-1-one-field-recovery-passed",
  "batch-16-publication-final-seven-gate-failed",
  "batch-16-publication-final-seven-recovery-level-1-gate-failed",
  "batch-16-publication-final-seven-two-level-one-field-recovery-passed"
]);
const gates = [];
for (let index = 0; index < gateFiles.length; index += 1) {
  const bytes = await readFile(path.resolve(gateFiles[index]));
  const value = JSON.parse(bytes);
  assert.equal(value.status, expectedStatuses[index], `${gateFiles[index]} status changed`);
  gates.push({ path: gateFiles[index], sha256: sha256(bytes), status: value.status });
}

const exceptionPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-16/score-pass/exceptional-publication-authorization.json";
const finalLedgerPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-16/final-ledger/final-ledger.json";
const scorePath =
  "docs/assessment-production/post-canary-continuation-v1/batch-16/score-pass/calculated-scores.json";
const immutableSources = [];
for (const source of [exceptionPath, finalLedgerPath, scorePath]) {
  const bytes = await readFile(path.resolve(source));
  immutableSources.push({ path: source, sha256: sha256(bytes) });
}
const exception = await readJson(exceptionPath);
assert.deepEqual(exception.exception?.debates, ["144"]);
assert.equal(exception.exception?.productionPublication, true);
assert.equal(exception.immutableBoundaries?.scoreRerunAllowed, false);

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
  const replay = validatePostCanaryBatch16PublicationOutput(output, packet);
  assert.equal(replay.status, "passed", `Debate ${debateNumber}: replay failed`);
  assert.equal(recordedValidation.status, "passed", `Debate ${debateNumber}: recorded validation failed`);
  assert.equal(recordedValidation.outputSha256, sha256(outputBytes), `Debate ${debateNumber}: output hash changed`);
  assert.deepEqual(recordedValidation.validationSummary, replay,
    `Debate ${debateNumber}: validation replay changed`);
  assert.equal(replay.calculatedScoresAuthoredByModel, 0);
  assert.equal(replay.lockedScoresUnchanged, true);
  debates.push({ debateNumber, outputSha256: sha256(outputBytes), packetSha256: sha256(packetBytes),
    validationSha256: sha256(validationBytes), provenanceSha256: sha256(provenanceBytes), validation: replay });
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
assert.deepEqual(totals, { debates: 10, moves: 194, critiques: 194, exactSourceQuotes: 20,
  overallCommentarySides: 20, aiExtensionSides: 20 });

const recoveryUse = {
  initialContexts: 10,
  recoveryContexts: 27,
  totalModelContexts: 37,
  levelOneContexts: 24,
  levelOneValidContexts: 21,
  levelOneInvalidContexts: 3,
  levelTwoContexts: 3,
  levelTwoValidContexts: 3,
  exceptionalThirdLevelContexts: 0,
  retries: 0,
  timeoutExtensions: 0,
  controllerStartupFailuresBeforeModelCall: 2
};
const recoverySummaries = [
  { debateNumber: "16", sourceFailure: "output-validation-failed", levelOneContexts: 9,
    levelOneValidContexts: 7, levelTwoContexts: 2, repairedFields: 9, finalValidation: "passed" },
  { debateNumber: "108", sourceFailure: "output-validation-failed", levelOneContexts: 1,
    levelOneValidContexts: 1, levelTwoContexts: 0, repairedFields: 1, finalValidation: "passed" },
  { debateNumber: "164", sourceFailure: "output-validation-failed", levelOneContexts: 5,
    levelOneValidContexts: 5, levelTwoContexts: 0, repairedFields: 5, finalValidation: "passed" },
  { debateNumber: "92", sourceFailure: "output-validation-failed", levelOneContexts: 9,
    levelOneValidContexts: 8, levelTwoContexts: 1, repairedFields: 9, finalValidation: "passed" }
];

const overlay = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-16-complete-publication-recovery-overlay",
  protocolId: "assessment-production-post-canary-batch-16-publication-reconstruction",
  status: "complete-ten-debate-batch-16-publication-cohort-valid-after-bounded-recovery",
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
    levelOneRejectedStringsUnavailableForTwoDebate16Fields: true,
    preservationLimitationRecorded: true,
    controllerStartupFailuresPreserved: true,
    acceptedCompanionFieldsChanged: false,
    rejectedProseReused: false,
    scoresChanged: false,
    scorePassRerun: false,
    modelAuthoredScores: 0,
    debate144NarrowPublicationExceptionPreserved: true
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-batch-16-deterministic-publication-compilation"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-16-publication-recovery-finalization-analysis",
  protocolId: overlay.protocolId,
  status: "batch-16-publication-recovery-complete-ten-debate-gate-passed",
  finalizedAt,
  ...totals,
  recoveryUse,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  modelAuthoredScores: 0,
  scoresChanged: false,
  scorePassRerun: false,
  debate144NarrowPublicationExceptionApplied: true,
  authorization: { deterministicCompilationPreparation: true, furtherPublicationRecovery: false,
    scorePass: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: overlay.nextAuthorizedAction
};
if (shouldWrite) {
  await mkdir(path.resolve(finalizedRoot), { recursive: true });
  await writeFile(path.resolve(overlayPath), pretty(overlay));
  await writeFile(path.resolve(analysisPath), pretty(analysis));
}
console.log(pretty({ status: analysis.status, ...totals, recoveryUse, scoresChanged: false,
  scorePassRerun: false, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }));
