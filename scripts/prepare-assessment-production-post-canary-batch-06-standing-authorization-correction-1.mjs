#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const write = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const root = "docs/assessment-production/post-canary-continuation-v1/batch-06";
const correctionRoot = `${root}/standing-authorization-preparation-correction-1`;
const paths = {
  diagnosis: `${correctionRoot}/diagnosis.json`,
  plan: `${correctionRoot}/correction-plan.json`,
  preparationAnalysis: `${correctionRoot}/preparation-analysis.json`,
  activation: `${correctionRoot}/execution-activation.json`,
  execution: `${correctionRoot}/execution.json`,
  analysis: `${correctionRoot}/analysis.json`,
  proposedLibrary: `${correctionRoot}/proposed-library.mjs`,
  proposedPreparation: `${correctionRoot}/proposed-preparation.mjs`,
  proposedTest: `${correctionRoot}/proposed-test.mjs`,
  library: "scripts/lib/assessment-production-post-canary-batch-06-standing-authorization.mjs",
  preparation: "scripts/prepare-assessment-production-post-canary-batch-06-standing-authorization.mjs",
  test: "scripts/test-assessment-production-post-canary-batch-06-standing-authorization.mjs",
  prepareCorrection: "scripts/prepare-assessment-production-post-canary-batch-06-standing-authorization-correction-1.mjs",
  activateCorrection: "scripts/activate-assessment-production-post-canary-batch-06-standing-authorization-correction-1.mjs",
  runCorrection: "scripts/run-assessment-production-post-canary-batch-06-standing-authorization-correction-1.mjs"
};
const sourcePacketCommit = "75c9b395c045518f064988c76987e0e2b5a72493";
const standingAuthorizedAt = "2026-08-22T19:59:46.000Z";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const lock = async (file) => {
  const bytes = await readFile(path.resolve(file));
  return { path: file, sha256: sha256(bytes), bytes: bytes.length };
};
const replaceOnce = (source, before, after, label) => {
  assertV4(source.includes(before), `${label}: correction preimage missing`);
  assertV4(source.indexOf(before) === source.lastIndexOf(before), `${label}: correction preimage is not unique`);
  return source.replace(before, after);
};

const diagnosis = JSON.parse(await readFile(paths.diagnosis));
assertV4(
  diagnosis.status === "frozen-batch-06-standing-authorization-preparation-stale-selection-metadata-and-checkpoint-harness-diagnosed" &&
    diagnosis.correctionBoundary.level === 1 &&
    diagnosis.correctionBoundary.writableFiles.length === 3,
  "accepted standing-authorization failure diagnosis required"
);
const [librarySource, preparationSource, testSource] = await Promise.all([
  readFile(paths.library, "utf8"),
  readFile(paths.preparation, "utf8"),
  readFile(paths.test, "utf8")
]);

const proposedLibrary = replaceOnce(
  librarySource,
  "      record.batchNumber === 6 &&\n      record.stagingOnly === true &&",
  `      record.batchNumber === 6 &&\n      record.sourcePacketCommit === "${sourcePacketCommit}" &&\n      record.stagingOnly === true &&`,
  "library source-packet commit validation"
);
let proposedPreparation = replaceOnce(
  preparationSource,
  'const SELECTION_FREEZE_COMMIT = "a09beb90ca7f4fde3931eb39f973994cbfb6ac1a";',
  `const SELECTION_FREEZE_COMMIT = "a09beb90ca7f4fde3931eb39f973994cbfb6ac1a";\nconst SOURCE_PACKET_COMMIT = "${sourcePacketCommit}";`,
  "preparation source-packet commit constant"
);
proposedPreparation = replaceOnce(
  proposedPreparation,
  "    selection.batchNumber === 6 &&",
  "    selection.batchNumber === 5 &&",
  "preparation immutable selection metadata overlay"
);
proposedPreparation = replaceOnce(
  proposedPreparation,
  'execFileSync("git", ["merge-base", "--is-ancestor", SELECTION_FREEZE_COMMIT, "HEAD"]);',
  'execFileSync("git", ["merge-base", "--is-ancestor", SELECTION_FREEZE_COMMIT, "HEAD"]);\nexecFileSync("git", ["merge-base", "--is-ancestor", SOURCE_PACKET_COMMIT, "HEAD"]);',
  "preparation source-packet ancestry authentication"
);
proposedPreparation = replaceOnce(
  proposedPreparation,
  `    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===\n      "${sourcePacketCommit}" &&\n    execFileSync("git", ["rev-parse", "origin/main"], {\n      encoding: "utf8"\n    }).trim() === "${sourcePacketCommit}",`,
  '    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===\n      execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim(),',
  "preparation synchronized recovery checkpoint authentication"
);
proposedPreparation = replaceOnce(
  proposedPreparation,
  "  checkpointCommit: execFileSync(\"git\", [\"rev-parse\", \"HEAD\"], {",
  "  sourcePacketCommit: SOURCE_PACKET_COMMIT,\n  checkpointCommit: execFileSync(\"git\", [\"rev-parse\", \"HEAD\"], {",
  "preparation standing record source-packet commit"
);
let proposedTest = replaceOnce(
  testSource,
  'import { createHash } from "node:crypto";',
  'import { createHash } from "node:crypto";\nimport { execFileSync } from "node:child_process";',
  "test git authentication import"
);
proposedTest = replaceOnce(
  proposedTest,
  `assert.equal(record.checkpointCommit, "${sourcePacketCommit}");`,
  `const SOURCE_PACKET_COMMIT = "${sourcePacketCommit}";\nassert.equal(record.sourcePacketCommit, SOURCE_PACKET_COMMIT);\nexecFileSync("git", ["merge-base", "--is-ancestor", SOURCE_PACKET_COMMIT, "HEAD"]);\nexecFileSync("git", ["merge-base", "--is-ancestor", record.checkpointCommit, "HEAD"]);`,
  "test recovery checkpoint authentication"
);

const proposals = [
  { target: paths.library, proposedPath: paths.proposedLibrary, bytes: Buffer.from(proposedLibrary) },
  { target: paths.preparation, proposedPath: paths.proposedPreparation, bytes: Buffer.from(proposedPreparation) },
  { target: paths.test, proposedPath: paths.proposedTest, bytes: Buffer.from(proposedTest) }
];
for (const proposal of proposals) assertV4(sha256(proposal.bytes) !== sha256(await readFile(proposal.target)), `${proposal.target}: proposal must change source`);

const toolLocks = await Promise.all([paths.prepareCorrection, paths.activateCorrection, paths.runCorrection].map(lock));
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1-plan",
  protocolId: diagnosis.protocolId,
  status: "frozen-batch-06-standing-authorization-preparation-correction-1-plan-prepared",
  frozenAt,
  directIncrementalCostUsd: 0,
  diagnosis: await lock(paths.diagnosis),
  sourcePacketCommit,
  standingAuthorizationAuthorizedAt: standingAuthorizedAt,
  originalSources: await Promise.all([paths.library, paths.preparation, paths.test].map(lock)),
  proposedSources: proposals.map((proposal) => ({
    target: proposal.target,
    path: proposal.proposedPath,
    sha256: sha256(proposal.bytes),
    bytes: proposal.bytes.length
  })),
  correction: {
    level: 1,
    immutableSelectionBatchNumberAcceptedAsFrozenValue: 5,
    authenticatedBatchIdentity: 6,
    sourcePacketCommitMustRemainAncestor: true,
    executionHeadMustEqualOriginMain: true,
    standingRecordAddsSourcePacketCommit: true,
    writableFiles: proposals.map((proposal) => proposal.target)
  },
  executionContract: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    rollback: false,
    models: 0,
    paidServices: 0,
    exactPreparationPasses: 1,
    exactValidationReplays: 1
  },
  toolLocks,
  outputPaths: { activation: paths.activation, execution: paths.execution, analysis: paths.analysis },
  nextAuthorizedAction: "activate-and-execute-batch-06-standing-authorization-preparation-correction-1-once"
};
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-standing-authorization-preparation-correction-1-analysis",
  protocolId: diagnosis.protocolId,
  status: "batch-06-standing-authorization-preparation-correction-1-plan-freeze-passed",
  analyzedAt: frozenAt,
  plan: { path: paths.plan, sha256: sha256(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)) },
  checks: { diagnosisAuthenticated: true, proposedSources: 3, selectionEvidencePreserved: true, sourcePacketsPreserved: true, modelsExecuted: 0, paidServicesUsed: 0 },
  nextAuthorizedAction: plan.nextAuthorizedAction
};

if (write) {
  for (const target of [paths.plan, paths.preparationAnalysis, ...proposals.map((proposal) => proposal.proposedPath)]) {
    assertV4(!(await exists(target)), `${target}: correction preparation target already exists`);
  }
  await mkdir(path.resolve(correctionRoot), { recursive: true });
  for (const proposal of proposals) await writeFile(path.resolve(proposal.proposedPath), proposal.bytes);
  await writeFile(path.resolve(paths.plan), `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(path.resolve(paths.preparationAnalysis), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, write, proposedSources: 3, attemptsMaximum: 1, directIncrementalCostUsd: 0 }, null, 2));
