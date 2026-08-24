#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_07_COMPATIBILITY_ROOT,
  serializedJson,
  validatePostCanaryBatch07SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-07-compatibility.mjs";
import {
  POST_CANARY_BATCH_07_COMPATIBILITY_ACTIVATION_STATUS,
  buildPostCanaryBatch07ValidatorSource,
  sha256,
  validatePostCanaryBatch07ValidatorSource
} from "./lib/assessment-production-post-canary-batch-07-compatibility-execution.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
assertV4(write, "Batch 7 compatibility runner requires --write");
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const fileSha256 = async (relativePath) =>
  sha256(await readFile(resolve(relativePath)));

const paths = {
  root: POST_CANARY_BATCH_07_COMPATIBILITY_ROOT,
  preparation: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/preparation-manifest.json`,
  activation: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/execution.json`,
  analysis: `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/analysis.json`,
  stagedLedgerRoot:
    `${POST_CANARY_BATCH_07_COMPATIBILITY_ROOT}/output-bundle/staged-ledgers`,
  validator: "scripts/validate-debates.mjs",
  productionLedgerRoot: "docs/assessment-ledgers"
};

assertV4(
  !(await exists(paths.execution)) && !(await exists(paths.stagedLedgerRoot)),
  "Batch 7 compatibility pass was already attempted; rerun forbidden"
);
const startedAt = new Date().toISOString();
const preparationBytes = await readFile(resolve(paths.preparation));
const preparation = JSON.parse(preparationBytes);
const activationBytes = await readFile(resolve(paths.activation));
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      POST_CANARY_BATCH_07_COMPATIBILITY_ACTIVATION_STATUS &&
    activation.preparation.sha256 === sha256(preparationBytes) &&
    activation.authorization.compatibilityExecution === true &&
    activation.authorization.validatorMigration === true &&
    activation.authorization.stagingLedgerWrite === true &&
    activation.authorization.compatibilityPasses === 1 &&
    activation.authorization.compatibilityRerun === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.productionLedgerPublication === false &&
    activation.authorization.productionMutation === false,
  "frozen Batch 7 compatibility activation is unavailable"
);
for (const [toolPath, expectedHash] of Object.entries(
  activation.executionToolHashes
)) {
  assertV4(
    (await fileSha256(toolPath)) === expectedHash,
    `execution tool changed after activation: ${toolPath}`
  );
}
for (const [sourcePath, expectedHash] of Object.entries(
  preparation.frozenSources
)) {
  assertV4(
    (await fileSha256(sourcePath)) === expectedHash,
    `frozen source changed before execution: ${sourcePath}`
  );
}

const baselineValidator = await readFile(resolve(paths.validator), "utf8");
assertV4(
  sha256(baselineValidator) === activation.validator.baselineSha256,
  "active validator differs from the activated baseline"
);
const proposedValidator = buildPostCanaryBatch07ValidatorSource(
  baselineValidator
);
const proposedValidation =
  validatePostCanaryBatch07ValidatorSource(proposedValidator);
assertV4(
  proposedValidation.sha256 === activation.validator.proposedSha256 &&
    proposedValidation.bytes === activation.validator.proposedBytes,
  "proposed validator differs from the activated output"
);

const staged = [];
for (const lock of activation.packetHashes) {
  const packetBytes = await readFile(resolve(lock.path));
  const packet = JSON.parse(packetBytes);
  assertV4(
    sha256(packetBytes) === lock.sha256 &&
      packet.debateNumber === lock.debateNumber &&
      packet.debateId === lock.debateId &&
      packet.proposedAdapterSha256 === lock.proposedAdapterSha256,
    `${lock.debateNumber}: activated packet changed`
  );
  const candidate = await readJson(packet.sources.candidate);
  const validation = validatePostCanaryBatch07SiteLedgerAdapter({
    adapter: packet.proposedAdapterExactOutput,
    candidate,
    expectedSourceLocks: packet.sourceLocks
  });
  const ledgerBytes = serializedJson(packet.proposedAdapterExactOutput);
  assertV4(
    sha256(ledgerBytes) === lock.stagedLedgerSha256 &&
      Buffer.byteLength(ledgerBytes) === lock.stagedLedgerBytes &&
      packet.futurePaths.stagedLedger === lock.stagedLedgerPath &&
      packet.futurePaths.productionLedger === lock.productionLedgerPath,
    `${lock.debateNumber}: activated staged output changed`
  );
  staged.push({ lock, packet, candidate, validation, ledgerBytes });
}

const ledgerInventory = async () => {
  const names = (await readdir(resolve(paths.productionLedgerRoot)))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const records = await Promise.all(
    names.map(async (name) => {
      const ledgerPath = `${paths.productionLedgerRoot}/${name}`;
      return { path: ledgerPath, sha256: await fileSha256(ledgerPath) };
    })
  );
  return {
    files: records.length,
    digest: sha256(serializedJson(records))
  };
};
assertV4(
  (await fileSha256(activation.protectedProduction.debates.path)) ===
      activation.protectedProduction.debates.sha256 &&
    (await fileSha256(activation.protectedProduction.references.path)) ===
      activation.protectedProduction.references.sha256,
  "protected production source changed before compatibility execution"
);
const beforeLedgerInventory = await ledgerInventory();
assertV4(
  beforeLedgerInventory.files ===
      activation.protectedProduction.productionLedgers.files &&
    beforeLedgerInventory.digest ===
      activation.protectedProduction.productionLedgers.digest,
  "production ledger inventory changed before compatibility execution"
);

await mkdir(resolve(paths.stagedLedgerRoot), { recursive: true });
await writeFile(resolve(paths.validator), proposedValidator);
for (const item of staged) {
  await writeFile(resolve(item.lock.stagedLedgerPath), item.ledgerBytes);
}

const runCommand = (name, command, commandArgs) => {
  const commandStartedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    env: process.env
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    name,
    command: [command, ...commandArgs].join(" "),
    startedAt: commandStartedAt,
    completedAt: new Date().toISOString(),
    exitCode: result.status,
    signal: result.signal,
    stdoutBytes: Buffer.byteLength(stdout),
    stdoutSha256: sha256(stdout),
    stdoutTail: stdout.slice(-2000),
    stderrBytes: Buffer.byteLength(stderr),
    stderrSha256: sha256(stderr),
    stderrTail: stderr.slice(-2000),
    passed: result.status === 0
  };
};

const tests = [];
tests.push(
  runCommand(
    "batch-07-route-positive-negative-controls",
    process.execPath,
    ["scripts/test-assessment-production-post-canary-batch-07-compatibility-execution.mjs"]
  )
);
if (tests.at(-1).passed) {
  tests.push(
    runCommand("checkpoint-batch-01-batch-02-batch-03-batch-04-batch-05-batch-06-legacy-reference-regression", process.execPath, [
      "scripts/validate-debates.mjs"
    ])
  );
}
if (tests.at(-1).passed) {
  tests.push(runCommand("full-repository-regression", "npm", ["run", "check"]));
}
if (tests.at(-1).passed) {
  tests.push(runCommand("repository-diff-integrity", "git", ["diff", "--check"]));
}

const afterLedgerInventory = await ledgerInventory();
const productionProtected =
  (await fileSha256(activation.protectedProduction.debates.path)) ===
    activation.protectedProduction.debates.sha256 &&
  (await fileSha256(activation.protectedProduction.references.path)) ===
    activation.protectedProduction.references.sha256 &&
  afterLedgerInventory.files ===
    activation.protectedProduction.productionLedgers.files &&
  afterLedgerInventory.digest ===
    activation.protectedProduction.productionLedgers.digest;
const changedTracked = spawnSync("git", ["diff", "--name-only"], {
  cwd: root,
  encoding: "utf8"
}).stdout
  .trim()
  .split("\n")
  .filter(Boolean);
const untracked = spawnSync(
  "git",
  ["ls-files", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" }
).stdout
  .trim()
  .split("\n")
  .filter(Boolean);
const unexpectedTracked = changedTracked.filter(
  (file) => file !== paths.validator && file !== paths.analysis
);
const unexpectedUntracked = untracked.filter(
  (file) =>
    file !== paths.execution &&
    !file.startsWith(`${paths.stagedLedgerRoot}/`)
);
const allowedWritesOnly =
  unexpectedTracked.length === 0 && unexpectedUntracked.length === 0;
const testsPassed = tests.length === 4 && tests.every((test) => test.passed);
const compatibilityAcceptancePassed =
  testsPassed && productionProtected && allowedWritesOnly;
const completedAt = new Date().toISOString();

const stagedArtifacts = await Promise.all(
  staged.map(async (item) => ({
    debateNumber: item.lock.debateNumber,
    debateId: item.lock.debateId,
    path: item.lock.stagedLedgerPath,
    bytes: item.lock.stagedLedgerBytes,
    sha256: await fileSha256(item.lock.stagedLedgerPath),
    sections: item.validation.sections,
    moves: item.validation.moves
  }))
);
const totals = {
  debates: stagedArtifacts.length,
  sections: stagedArtifacts.reduce((sum, item) => sum + item.sections, 0),
  moves: stagedArtifacts.reduce((sum, item) => sum + item.moves, 0),
  overallScores: stagedArtifacts.length * 2,
  stagedAdapters: stagedArtifacts.length,
  stagedAdapterBytes: stagedArtifacts.reduce((sum, item) => sum + item.bytes, 0),
  compatibilityPassesAttempted: 1,
  compatibilityPassesCompleted: compatibilityAcceptancePassed ? 1 : 0,
  reruns: 0,
  retries: 0,
  automaticRepairs: 0,
  modelContexts: 0,
  modelAuthoredScores: 0,
  scoreChanges: 0,
  proseChanges: 0,
  attributionChanges: 0,
  optionalReferenceBehaviorChanges: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  productionLedgerPublications: 0,
  productionMutations: 0,
  compatibilityAcceptancePassed
};
const nextAuthorizedAction = compatibilityAcceptancePassed
  ? "prepare-batch-07-production-publication-mutation-manifest-under-standing-authorization"
  : "diagnose-batch-07-compatibility-failure-under-failure-recovery-standing-authorization";
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-compatibility-execution",
  protocolId: preparation.protocolId,
  status: compatibilityAcceptancePassed
    ? "batch-07-route-score-checkpoint-batch-01-batch-02-batch-03-batch-04-batch-05-batch-06-legacy-reference-validation-passed"
    : "failed-closed-batch-07-compatibility-staging-pass",
  startedAt,
  completedAt,
  activation: {
    path: paths.activation,
    sha256: sha256(activationBytes)
  },
  validator: {
    path: paths.validator,
    baselineSha256: activation.validator.baselineSha256,
    appliedSha256: await fileSha256(paths.validator),
    expectedSha256: activation.validator.proposedSha256,
    exactActivatedOutput: true
  },
  stagedArtifacts,
  tests,
  writeAudit: {
    changedTracked,
    untrackedBeforeExecutionRecords: untracked,
    unexpectedTracked,
    unexpectedUntracked,
    allowedWritesOnly,
    productionProtected
  },
  regressions: {
    batch07RouteControlsPassed: tests[0]?.passed === true,
    checkpointBatch01Batch02Batch03LegacyReferencePassed:
      tests[1]?.passed === true,
    fullRepositoryPassed: tests[2]?.passed === true,
    diffIntegrityPassed: tests[3]?.passed === true
  },
  totals,
  authorization: {
    compatibilityExecution: true,
    compatibilityRerun: false,
    validatorRewrite: false,
    packetRewrite: false,
    stagedAdapterRewrite: false,
    modelExecution: false,
    paidServices: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction
};
const executionBytes = serializedJson(execution);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-compatibility-execution-analysis",
  protocolId: preparation.protocolId,
  status: compatibilityAcceptancePassed
    ? "batch-07-production-compatibility-passed"
    : "batch-07-production-compatibility-failed-closed",
  analyzedAt: completedAt,
  execution: {
    path: paths.execution,
    sha256: sha256(executionBytes)
  },
  decision: {
    compatibilityGatePassed: compatibilityAcceptancePassed,
    singleAuthorizedPassAttempted: true,
    singleAuthorizedPassCompleted: compatibilityAcceptancePassed,
    failedClosed: !compatibilityAcceptancePassed,
    rerunPerformed: false,
    retryPerformed: false,
    automaticRepairPerformed: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    productionMutationPerformed: false
  },
  checks: {
    exactActivatedValidatorApplied:
      execution.validator.appliedSha256 === execution.validator.expectedSha256,
    exactStagedAdaptersWritten: stagedArtifacts.length,
    routeAndScoreControlsPassed: execution.regressions.batch07RouteControlsPassed,
    checkpointBatch01Batch02Batch03LegacyReferencePassed:
      execution.regressions.checkpointBatch01Batch02Batch03LegacyReferencePassed,
    fullRepositoryPassed: execution.regressions.fullRepositoryPassed,
    diffIntegrityPassed: execution.regressions.diffIntegrityPassed,
    allowedWritesOnly,
    productionProtected
  },
  totals,
  authorization: execution.authorization,
  nextAuthorizedAction
};

await writeFile(resolve(paths.execution), executionBytes);
await writeFile(resolve(paths.analysis), serializedJson(analysis));

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: totals.debates,
      sections: totals.sections,
      moves: totals.moves,
      stagedAdapters: totals.stagedAdapters,
      tests: tests.map((test) => ({
        name: test.name,
        exitCode: test.exitCode,
        passed: test.passed
      })),
      compatibilityPassesAttempted: 1,
      compatibilityPassesCompleted: totals.compatibilityPassesCompleted,
      reruns: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false,
      nextAuthorizedAction
    },
    null,
    2
  )
);

if (!compatibilityAcceptancePassed) process.exit(1);
