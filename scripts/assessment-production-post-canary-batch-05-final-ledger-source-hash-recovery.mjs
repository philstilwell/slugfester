#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const write = process.argv.includes("--write");
const timeIndex = process.argv.indexOf("--at");
const at = timeIndex >= 0 ? process.argv[timeIndex + 1] : null;
assert(["prepare", "activate", "run", "test"].includes(mode), "--mode is required");
if (["prepare", "activate", "run"].includes(mode)) {
  assert(at && !Number.isNaN(Date.parse(at)), "--at requires an ISO timestamp");
}

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/final-ledger";
const recoveryRoot = `${root}/source-hash-recovery`;
const paths = {
  manifest: `${root}/final-ledger-manifest.json`,
  ledger: `${root}/final-ledger.json`,
  diagnosis: `${recoveryRoot}/failure-diagnosis.json`,
  plan: `${recoveryRoot}/correction-plan.json`,
  activation: `${recoveryRoot}/execution-activation.json`,
  execution: `${recoveryRoot}/execution.json`
};
const validator =
  "scripts/validate-assessment-production-post-canary-batch-05-final-ledger.mjs";
const tool =
  "scripts/assessment-production-post-canary-batch-05-final-ledger-source-hash-recovery.mjs";
const expectedOld =
  "8cc2459db9643bbcfb9c6318bbbd27770ffd27e8712387e613d70a8bf0361e9d";
const expectedNew =
  "9d019a6f7918608c19160122a82c3836691ce8046db9c18bbd41e5de3778c7b0";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function mismatches(manifest) {
  const result = [];
  for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
    const actual = sha256(await readFile(file));
    if (actual !== expected) result.push({ file, expected, actual });
  }
  return result;
}

async function prepare() {
  for (const file of [paths.diagnosis, paths.plan, paths.activation, paths.execution]) {
    assert.equal(await exists(file), false, `${file} already exists`);
  }
  assert.equal(await exists(paths.ledger), false, "final ledger must not exist");
  const manifestBytes = await readFile(paths.manifest);
  const manifest = JSON.parse(manifestBytes);
  const found = await mismatches(manifest);
  assert.deepEqual(found, [{ file: validator, expected: expectedOld, actual: expectedNew }]);
  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-source-hash-failure-diagnosis",
    protocolId: manifest.protocolId,
    status: "frozen-single-validator-format-only-source-hash-mismatch-diagnosed",
    diagnosedAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    batchNumber: 5,
    failedPass: "deterministic-final-ledger-assembly-prewrite-authentication",
    ledgerWritten: false,
    sourceHashMismatches: found,
    cause:
      "The validator's single trailing blank line was removed after the manifest preview and before the manifest checkpoint commit; executable meaning and every substantive input remained unchanged.",
    protectedEvidenceChanged: false,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0
  };
  const plan = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-source-hash-correction-plan",
    protocolId: manifest.protocolId,
    status: "frozen-one-field-final-ledger-manifest-source-hash-correction-ready",
    preparedAt: at,
    checkpointCommit: diagnosis.checkpointCommit,
    standingAuthorizationRecovery: "bounded-first-deterministic-validation-recovery",
    diagnosis: { path: paths.diagnosis, sha256: sha256(Buffer.from(pretty(diagnosis))) },
    target: {
      path: paths.manifest,
      preimageSha256: sha256(manifestBytes),
      jsonPointer:
        "/sourceHashes/scripts~1validate-assessment-production-post-canary-batch-05-final-ledger.mjs",
      oldValue: expectedOld,
      newValue: expectedNew
    },
    validator: { path: validator, sha256: expectedNew },
    correctionTool: { path: tool, sha256: sha256(await readFile(tool)) },
    mutation: {
      filesMaximum: 1,
      fieldsMaximum: 1,
      manifestHashFieldOnly: true,
      validatorWrite: false,
      sourceEvidenceWrite: false,
      ledgerWrite: false,
      modelExecution: false,
      paidServiceUse: false,
      scoreDerivation: false
    },
    executionPolicy: {
      attempts: 1,
      retries: 0,
      reruns: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
      completePreviewReplayRequired: true
    },
    outputs: { activation: paths.activation, execution: paths.execution },
    nextAction: "freeze-activation-before-one-field-manifest-hash-correction"
  };
  if (write) {
    await mkdir(recoveryRoot, { recursive: true });
    await writeFile(paths.diagnosis, pretty(diagnosis));
    await writeFile(paths.plan, pretty(plan));
  }
  console.log(JSON.stringify({
    status: plan.status,
    wrote: write,
    mismatches: found.length,
    filesToWriteDuringCorrection: 1,
    fieldsToWriteDuringCorrection: 1,
    ledgerWritten: false,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
}

async function validatePlan(plan) {
  assert.equal(plan.status, "frozen-one-field-final-ledger-manifest-source-hash-correction-ready");
  assert.equal(sha256(await readFile(plan.diagnosis.path)), plan.diagnosis.sha256);
  assert.equal(sha256(await readFile(plan.correctionTool.path)), plan.correctionTool.sha256);
  assert.equal(sha256(await readFile(plan.validator.path)), plan.validator.sha256);
  assert.equal(plan.target.oldValue, expectedOld);
  assert.equal(plan.target.newValue, expectedNew);
  assert.equal(plan.mutation.filesMaximum, 1);
  assert.equal(plan.mutation.fieldsMaximum, 1);
  assert.equal(plan.executionPolicy.attempts, 1);
  assert.equal(plan.executionPolicy.retries, 0);
}

async function activate() {
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  assert.equal(await exists(paths.ledger), false, "final ledger must not exist");
  const planBytes = await readFile(paths.plan);
  const plan = JSON.parse(planBytes);
  await validatePlan(plan);
  assert.equal(sha256(await readFile(paths.manifest)), plan.target.preimageSha256);
  const activation = {
    ...plan,
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-source-hash-correction-activation",
    status: "frozen-active-for-one-field-final-ledger-manifest-source-hash-correction",
    activatedAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    plan: { path: paths.plan, sha256: sha256(planBytes) },
    authorization: {
      deterministicManifestHashCorrection: true,
      correctedPreviewReplay: true,
      modelExecution: false,
      paidServices: false,
      ledgerAssembly: false,
      scoreDerivation: false
    },
    nextAction: "execute-one-field-manifest-hash-correction-once"
  };
  if (write) await writeFile(paths.activation, pretty(activation));
  console.log(JSON.stringify({
    status: activation.status,
    wrote: write,
    attempts: 1,
    retries: 0,
    ledgerWritten: false,
    directIncrementalCostUsd: 0
  }, null, 2));
}

async function run() {
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  assert.equal(await exists(paths.ledger), false, "final ledger must not exist");
  const activation = await readJson(paths.activation);
  assert.equal(activation.status, "frozen-active-for-one-field-final-ledger-manifest-source-hash-correction");
  await validatePlan(await readJson(paths.plan));
  assert.equal(sha256(await readFile(activation.plan.path)), activation.plan.sha256);
  const manifestBytes = await readFile(paths.manifest);
  assert.equal(sha256(manifestBytes), activation.target.preimageSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.sourceHashes[validator], expectedOld);
  const before = structuredClone(manifest);
  manifest.sourceHashes[validator] = expectedNew;
  const correctedBytes = Buffer.from(pretty(manifest));
  const replay = structuredClone(manifest);
  replay.sourceHashes[validator] = expectedOld;
  assert.deepEqual(replay, before, "correction changed more than the frozen field");
  await writeFile(paths.manifest, correctedBytes);
  assert.deepEqual(await mismatches(manifest), []);
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-source-hash-correction-execution",
    protocolId: manifest.protocolId,
    status: "passed-one-field-final-ledger-manifest-source-hash-correction",
    executedAt: at,
    attempts: 1,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    filesWritten: [paths.manifest],
    fieldsWritten: [activation.target.jsonPointer],
    manifestPreimageSha256: activation.target.preimageSha256,
    manifestCorrectedSha256: sha256(correctedBytes),
    validatorSha256: sha256(await readFile(validator)),
    remainingSourceHashMismatches: 0,
    ledgerWritten: false,
    protectedEvidenceChanged: false,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
    nextAction: "perform-one-corrected-final-ledger-preview-validation"
  };
  await writeFile(paths.execution, pretty(execution));
  console.log(JSON.stringify(execution, null, 2));
}

async function test() {
  const plan = await readJson(paths.plan);
  await validatePlan(plan);
  if (!(await exists(paths.activation))) {
    assert.equal(sha256(await readFile(paths.manifest)), plan.target.preimageSha256);
    console.log(JSON.stringify({ status: "passed-preactivation", ledgerWritten: false }, null, 2));
    return;
  }
  const activation = await readJson(paths.activation);
  assert.equal(sha256(await readFile(activation.plan.path)), activation.plan.sha256);
  if (!(await exists(paths.execution))) {
    assert.equal(sha256(await readFile(paths.manifest)), plan.target.preimageSha256);
    console.log(JSON.stringify({ status: "passed-activated", ledgerWritten: false }, null, 2));
    return;
  }
  const execution = await readJson(paths.execution);
  assert.equal(execution.status, "passed-one-field-final-ledger-manifest-source-hash-correction");
  assert.equal(execution.attempts, 1);
  assert.equal(execution.retries, 0);
  assert.equal(sha256(await readFile(paths.manifest)), execution.manifestCorrectedSha256);
  assert.deepEqual(await mismatches(await readJson(paths.manifest)), []);
  assert.equal(await exists(paths.ledger), false);
  console.log(JSON.stringify({
    status: "passed-corrected",
    sourceHashMismatches: 0,
    ledgerWritten: false,
    attempts: 1,
    retries: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "test") await test();
