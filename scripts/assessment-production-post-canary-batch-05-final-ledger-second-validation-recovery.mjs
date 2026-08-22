#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

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
const recoveryRoot = `${root}/source-hash-recovery/correction-2`;
const paths = {
  manifest: `${root}/final-ledger-manifest.json`,
  ledger: `${root}/final-ledger.json`,
  analysis: `${root}/analysis.json`,
  diagnosis: `${root}/source-hash-recovery/second-validation-failure-diagnosis.json`,
  plan: `${recoveryRoot}/correction-plan.json`,
  activation: `${recoveryRoot}/execution-activation.json`,
  execution: `${recoveryRoot}/execution.json`
};
const testPath =
  "scripts/test-assessment-production-post-canary-batch-05-final-ledger.mjs";
const toolPath =
  "scripts/assessment-production-post-canary-batch-05-final-ledger-second-validation-recovery.mjs";
const oldTestSha256 =
  "00e00ceacc4e894669e95eaf4fcd762544bc3df40fa88910799b6c2387a2a2e1";
const ledgerSha256 =
  "82133511e09ca1bc7e637795c7f072633f3ca2a88a32ffeb1d12a15e0741993f";
const analysisSha256 =
  "87e15bc5d1509655a5e989607e09a83732278267101d55fdfcafc14ae7774a4c";
const oldSnippet = `  storedLedger.debates.filter(
    (debate) => debate.mergeAudit.adjudicationOutputAcceptedWithoutCorrection
  ).length,
  9
);`;
const newSnippet = `  storedLedger.debates.filter(
    (debate) => debate.mergeAudit.adjudicationOutputAcceptedWithoutCorrection
  ).length,
  10
);`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;

function correctedTestBytes(originalBytes) {
  const original = originalBytes.toString("utf8");
  assert.equal(original.split(oldSnippet).length - 1, 1, "stale expectation occurrence changed");
  assert.equal(original.includes(newSnippet), false, "corrected expectation already present");
  return Buffer.from(original.replace(oldSnippet, newSnippet));
}

async function validateProtectedArtifacts() {
  assert.equal(sha256(await readFile(paths.ledger)), ledgerSha256, "ledger changed");
  assert.equal(sha256(await readFile(paths.analysis)), analysisSha256, "analysis changed");
}

async function manifestMismatches(manifest) {
  const result = [];
  for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
    const actual = sha256(await readFile(file));
    if (actual !== expected) result.push({ file, expected, actual });
  }
  return result;
}

async function prepare() {
  for (const file of [paths.plan, paths.activation, paths.execution]) {
    assert.equal(await exists(file), false, `${file} already exists`);
  }
  await validateProtectedArtifacts();
  const [diagnosisBytes, manifestBytes, testBytes, toolBytes] = await Promise.all([
    readFile(paths.diagnosis),
    readFile(paths.manifest),
    readFile(testPath),
    readFile(toolPath)
  ]);
  const diagnosis = JSON.parse(diagnosisBytes);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(
    diagnosis.status,
    "frozen-second-final-ledger-stage-validation-failure-diagnosed-new-approval-required"
  );
  assert.equal(sha256(testBytes), oldTestSha256);
  assert.equal(manifest.sourceHashes[testPath], oldTestSha256);
  assert.deepEqual(await manifestMismatches(manifest), []);
  const proposedTestBytes = correctedTestBytes(testBytes);
  const proposedTestSha256 = sha256(proposedTestBytes);
  const proposedManifest = structuredClone(manifest);
  proposedManifest.sourceHashes[testPath] = proposedTestSha256;
  const proposedManifestBytes = Buffer.from(pretty(proposedManifest));
  const plan = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-second-validation-correction-plan",
    protocolId: manifest.protocolId,
    status: "frozen-one-time-recursive-test-expectation-and-authenticated-hash-correction-ready",
    preparedAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    productionCanary: false,
    batchNumber: 5,
    userAuthorization: {
      instruction:
        "I approve/authorize the next step, interpreted as the exact one-time recursive Batch 5 final-ledger test-harness recovery quoted in the preceding assistant response.",
      directIncrementalCostUsdMaximum: 0,
      correctedGateExecutionsAuthorized: 1,
      retriesMaximum: 0,
      ledgerAssemblyRerunsMaximum: 0,
      modelContextsMaximum: 0,
      paidServiceCallsMaximum: 0,
      scorePassesMaximum: 0
    },
    diagnosis: { path: paths.diagnosis, sha256: sha256(diagnosisBytes) },
    correctionTool: { path: toolPath, sha256: sha256(toolBytes) },
    testCorrection: {
      path: testPath,
      preimageSha256: oldTestSha256,
      proposedSha256: proposedTestSha256,
      exactOldValue: 9,
      exactNewValue: 10,
      semanticField:
        "accepted-adjudication-outputs-without-correction expected population",
      changedLinesMaximum: 1
    },
    manifestCorrection: {
      path: paths.manifest,
      preimageSha256: sha256(manifestBytes),
      proposedSha256: sha256(proposedManifestBytes),
      jsonPointer:
        "/sourceHashes/scripts~1test-assessment-production-post-canary-batch-05-final-ledger.mjs",
      exactOldValue: oldTestSha256,
      exactNewValue: proposedTestSha256,
      changedFieldsMaximum: 1
    },
    protectedArtifacts: {
      finalLedger: { path: paths.ledger, sha256: ledgerSha256 },
      analysis: { path: paths.analysis, sha256: analysisSha256 }
    },
    executionPolicy: {
      attempts: 1,
      retries: 0,
      reruns: 0,
      timeoutExtensions: 0,
      recursiveCorrectionsAfterThis: 0,
      correctedFinalLedgerTests: 1,
      fullCohortReplayInsideCorrectedTest: true,
      ledgerAssemblyReruns: 0
    },
    mutations: {
      files: [testPath, paths.manifest],
      testExpectationLines: 1,
      manifestHashFields: 1,
      ledgerFiles: 0,
      analysisFiles: 0,
      evidenceFiles: 0,
      adjudicationFiles: 0,
      scoreFiles: 0
    },
    outputs: { activation: paths.activation, execution: paths.execution },
    nextAction: "freeze-activation-before-single-correction-and-corrected-test-gate"
  };
  if (write) {
    await mkdir(recoveryRoot, { recursive: true });
    await writeFile(paths.plan, pretty(plan));
  }
  console.log(JSON.stringify({
    status: plan.status,
    wrote: write,
    testPreimageSha256: oldTestSha256,
    proposedTestSha256,
    proposedManifestSha256: plan.manifestCorrection.proposedSha256,
    correctedGateExecutionsAuthorized: 1,
    ledgerAssemblyRerunsAuthorized: 0,
    modelContextsAuthorized: 0,
    paidServiceCallsAuthorized: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
}

async function validatePlan(plan) {
  assert.equal(
    plan.status,
    "frozen-one-time-recursive-test-expectation-and-authenticated-hash-correction-ready"
  );
  assert.equal(sha256(await readFile(plan.diagnosis.path)), plan.diagnosis.sha256);
  assert.equal(sha256(await readFile(plan.correctionTool.path)), plan.correctionTool.sha256);
  assert.equal(plan.testCorrection.preimageSha256, oldTestSha256);
  assert.equal(plan.testCorrection.exactOldValue, 9);
  assert.equal(plan.testCorrection.exactNewValue, 10);
  assert.equal(plan.executionPolicy.attempts, 1);
  assert.equal(plan.executionPolicy.retries, 0);
  assert.equal(plan.executionPolicy.correctedFinalLedgerTests, 1);
  assert.equal(plan.executionPolicy.ledgerAssemblyReruns, 0);
  await validateProtectedArtifacts();
}

async function activate() {
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const planBytes = await readFile(paths.plan);
  const plan = JSON.parse(planBytes);
  await validatePlan(plan);
  assert.equal(sha256(await readFile(testPath)), plan.testCorrection.preimageSha256);
  assert.equal(sha256(await readFile(paths.manifest)), plan.manifestCorrection.preimageSha256);
  const activation = {
    ...plan,
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-second-validation-correction-activation",
    status: "frozen-active-for-one-test-expectation-and-manifest-hash-correction",
    activatedAt: at,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    plan: { path: paths.plan, sha256: sha256(planBytes) },
    authorization: {
      testCorrection: true,
      manifestHashCorrection: true,
      correctedFinalLedgerTest: true,
      fullCohortReplay: true,
      ledgerAssemblyRerun: false,
      modelExecution: false,
      paidServices: false,
      scoreDerivation: false
    },
    nextAction: "execute-one-correction-and-one-corrected-final-ledger-test"
  };
  if (write) await writeFile(paths.activation, pretty(activation));
  console.log(JSON.stringify({
    status: activation.status,
    wrote: write,
    attempts: 1,
    retries: 0,
    correctedGateExecutions: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
}

async function run() {
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const activation = await readJson(paths.activation);
  assert.equal(
    activation.status,
    "frozen-active-for-one-test-expectation-and-manifest-hash-correction"
  );
  await validatePlan(await readJson(paths.plan));
  assert.equal(sha256(await readFile(activation.plan.path)), activation.plan.sha256);
  const [testBytes, manifestBytes] = await Promise.all([
    readFile(testPath),
    readFile(paths.manifest)
  ]);
  assert.equal(sha256(testBytes), activation.testCorrection.preimageSha256);
  assert.equal(sha256(manifestBytes), activation.manifestCorrection.preimageSha256);
  const proposedTestBytes = correctedTestBytes(testBytes);
  assert.equal(sha256(proposedTestBytes), activation.testCorrection.proposedSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.sourceHashes[testPath], oldTestSha256);
  const manifestBefore = structuredClone(manifest);
  manifest.sourceHashes[testPath] = activation.testCorrection.proposedSha256;
  const proposedManifestBytes = Buffer.from(pretty(manifest));
  assert.equal(sha256(proposedManifestBytes), activation.manifestCorrection.proposedSha256);
  const reconstructed = structuredClone(manifest);
  reconstructed.sourceHashes[testPath] = oldTestSha256;
  assert.deepEqual(reconstructed, manifestBefore, "manifest correction exceeded one field");
  await writeFile(testPath, proposedTestBytes);
  await writeFile(paths.manifest, proposedManifestBytes);
  await validateProtectedArtifacts();
  assert.deepEqual(await manifestMismatches(manifest), []);

  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = spawnSync(process.execPath, [testPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024
  });
  const gatePassed = result.status === 0 && result.signal === null && result.error === undefined;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-final-ledger-second-validation-correction-execution",
    protocolId: activation.protocolId,
    status: gatePassed
      ? "passed-one-test-expectation-correction-and-complete-final-ledger-cohort-replay"
      : "failed-corrected-final-ledger-test-new-approval-required",
    executedAt: at,
    gateStartedAt: startedAt,
    gateCompletedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    attempts: 1,
    retries: 0,
    reruns: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    correctedFinalLedgerTests: 1,
    ledgerAssemblyReruns: 0,
    testPath,
    testSha256: sha256(await readFile(testPath)),
    manifestPath: paths.manifest,
    manifestSha256: sha256(await readFile(paths.manifest)),
    ledgerSha256: sha256(await readFile(paths.ledger)),
    analysisSha256: sha256(await readFile(paths.analysis)),
    manifestSourceHashMismatches: (await manifestMismatches(manifest)).length,
    commandExitCode: result.status,
    terminationSignal: result.signal,
    commandError: result.error ? String(result.error) : null,
    stdoutSha256: sha256(result.stdout ?? ""),
    stderrSha256: sha256(result.stderr ?? ""),
    stdout: (result.stdout ?? "").slice(-10000),
    stderr: (result.stderr ?? "").slice(-10000),
    gatePassed,
    debatesValidated: gatePassed ? 10 : null,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
    standingAuthorizationResumed: gatePassed,
    nextAction: gatePassed
      ? "resume-batch-05-standing-authorization-at-single-score-pass-preparation"
      : "stop-new-user-approval-required-after-failed-recursive-recovery"
  };
  await writeFile(paths.execution, pretty(execution));
  console.log(JSON.stringify({
    status: execution.status,
    attempts: 1,
    retries: 0,
    correctedFinalLedgerTests: 1,
    ledgerAssemblyReruns: 0,
    gatePassed,
    debatesValidated: execution.debatesValidated,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
    standingAuthorizationResumed: execution.standingAuthorizationResumed,
    nextAction: execution.nextAction
  }, null, 2));
  if (!gatePassed) process.exitCode = 1;
}

async function test() {
  const plan = await readJson(paths.plan);
  await validatePlan(plan);
  if (!(await exists(paths.activation))) {
    assert.equal(sha256(await readFile(testPath)), plan.testCorrection.preimageSha256);
    assert.equal(sha256(await readFile(paths.manifest)), plan.manifestCorrection.preimageSha256);
    console.log(JSON.stringify({ status: "passed-preactivation", correctedGateExecutions: 0 }, null, 2));
    return;
  }
  const activation = await readJson(paths.activation);
  assert.equal(sha256(await readFile(activation.plan.path)), activation.plan.sha256);
  if (!(await exists(paths.execution))) {
    assert.equal(sha256(await readFile(testPath)), plan.testCorrection.preimageSha256);
    assert.equal(sha256(await readFile(paths.manifest)), plan.manifestCorrection.preimageSha256);
    console.log(JSON.stringify({ status: "passed-activated", correctedGateExecutions: 0 }, null, 2));
    return;
  }
  const execution = await readJson(paths.execution);
  assert.equal(
    execution.status,
    "passed-one-test-expectation-correction-and-complete-final-ledger-cohort-replay"
  );
  assert.equal(execution.attempts, 1);
  assert.equal(execution.retries, 0);
  assert.equal(execution.correctedFinalLedgerTests, 1);
  assert.equal(execution.ledgerAssemblyReruns, 0);
  assert.equal(execution.gatePassed, true);
  assert.equal(execution.debatesValidated, 10);
  assert.equal(execution.standingAuthorizationResumed, true);
  assert.equal(sha256(await readFile(testPath)), plan.testCorrection.proposedSha256);
  assert.equal(sha256(await readFile(paths.manifest)), plan.manifestCorrection.proposedSha256);
  await validateProtectedArtifacts();
  assert.deepEqual(await manifestMismatches(await readJson(paths.manifest)), []);
  console.log(JSON.stringify({
    status: "passed-complete",
    correctedFinalLedgerTests: 1,
    ledgerAssemblyReruns: 0,
    debatesValidated: 10,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
    standingAuthorizationResumed: true
  }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "test") await test();
