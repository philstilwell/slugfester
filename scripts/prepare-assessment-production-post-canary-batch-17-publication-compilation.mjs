#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ROOT,
  compilePostCanaryBatch17PublicationStagingRecord,
  validatePostCanaryBatch17CompiledStagingRecord
} from "./lib/assessment-production-post-canary-batch-17-publication-compilation.mjs";
import { POST_CANARY_BATCH_17_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-17-publication.mjs";
import { validatePostCanaryBatch17PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-17-publication-validation.mjs";
import { POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch17StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-17-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ROOT;
const COHORT = `${POST_CANARY_BATCH_17_PUBLICATION_ROOT}/failure-recovery/finalized/complete-publication-overlay.json`;
const IDENTITY = `${ROOT}/production-identity-snapshot.json`;
const MANIFEST = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const AUDIT = `${ROOT}/compilation-audit.json`;
const ACCEPTED_OUTPUTS = Object.freeze(Object.fromEntries(
  POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ORDER.map((debateNumber) => [
    debateNumber,
    `${POST_CANARY_BATCH_17_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`
  ])
));
const acceptedOutput = (debateNumber) => ACCEPTED_OUTPUTS[debateNumber];
const packetPath = (debateNumber) =>
  `${POST_CANARY_BATCH_17_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const standing = await loadAndValidatePostCanaryBatch17StandingAuthorization();
if (shouldWrite) for (const file of [IDENTITY, MANIFEST]) assertV4(!(await exists(file)), `${file} exists`);
const cohort = JSON.parse(await readFile(path.resolve(COHORT), "utf8"));
assertV4(
  cohort.status ===
    "complete-four-debate-batch-17-publication-cohort-valid-after-bounded-recovery" &&
  cohort.debates?.length === 4 &&
  cohort.debates.reduce((sum, row) => sum + row.validation.moves, 0) === 79 &&
  cohort.debates.reduce((sum, row) => sum + row.validation.critiques, 0) === 79 &&
  cohort.debates.reduce((sum, row) => sum + row.validation.quoteExactSourceMatches, 0) === 20 &&
  cohort.debates.every((row) => row.validation?.status === "passed") &&
  cohort.integrity?.scoresChanged === false && cohort.integrity?.scorePassRerun === false,
"the accepted Batch 17 publication cohort changed");

const productionByNumber = new Map(debates.map((debate) => [debate.number, debate]));
const identities = [];
const contexts = [];
for (const debateNumber of POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ORDER) {
  const publicationOutput = acceptedOutput(debateNumber);
  const publicationPacket = packetPath(debateNumber);
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(publicationOutput)), readFile(path.resolve(publicationPacket))]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = validatePostCanaryBatch17PublicationOutput(output, packet);
  const production = productionByNumber.get(debateNumber);
  assertV4(validation.status === "passed" && output.debateId === packet.debateId &&
    production?.id === packet.debateId, `${debateNumber}: compilation input failed`);
  const identity = { id: production.id, number: production.number };
  if (production.topicCategory) identity.topicCategory = production.topicCategory;
  identities.push(identity);
  const compiled = compilePostCanaryBatch17PublicationStagingRecord({ output, packet, identity });
  const compiledValidation = validatePostCanaryBatch17CompiledStagingRecord({ compiled, output, packet, identity });
  contexts.push({ debateNumber, debateId: packet.debateId, publicationOutput,
    publicationOutputSha256: sha256(outputBytes), publicationPacket,
    publicationPacketSha256: sha256(packetBytes), plannedCompiledOutput: `${ROOT}/compiled/debate-${debateNumber}.json`,
    expectedSections: packet.sections.length, expectedMoves: packet.moves.length,
    expectedOverallScores: { pro: packet.calculatedScores.overall.pro.score,
      con: packet.calculatedScores.overall.con.score },
    expectedWinner: packet.calculatedScores.winner,
    expectedWinningMargin: packet.calculatedScores.winningMargin,
    completePublicationValidation: validation, syntheticCompilationValidation: compiledValidation });
}
assertV4(contexts.length === 4 && contexts.reduce((sum, row) => sum + row.expectedMoves, 0) === 79,
"the Batch 17 compilation cohort changed");
const identitySnapshot = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-publication-compilation-identity-snapshot",
  protocolId: POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-minimal-production-identity-only", frozenAt,
  allowedFields: ["id", "number", "topicCategory"], legacyScoresIncluded: false,
  legacyProseIncluded: false, legacyTagsIncluded: false, legacyWinnerIncluded: false,
  rows: identities };
const identityBytes = Buffer.from(`${JSON.stringify(identitySnapshot, null, 2)}\n`);
const sources = [COHORT, POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
  "docs/assessment-production/post-canary-continuation-v1/batch-17/final-ledger/final-ledger.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-17/score-pass/calculated-scores.json",
  "src/data/debates.js", "src/data/references.js",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-17-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-17-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-17-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-17-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-17-publication-compilation.mjs",
  "scripts/test-assessment-production-post-canary-batch-17-publication-compilation-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-17-publication-compilation.mjs",
  "scripts/run-assessment-production-post-canary-batch-17-publication-compilation.mjs",
  ...contexts.flatMap((row) => [row.publicationOutput, row.publicationPacket])];
const sourceHashes = {};
for (const file of [...new Set(sources)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[IDENTITY] = sha256(identityBytes);
const futureOutputPathsExcludedFromSourceHashes = [ACTIVATION, EXECUTION, ANALYSIS, AUDIT,
  ...contexts.map((row) => row.plannedCompiledOutput)];
for (const file of futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-17-deterministic-publication-compilation-preparation",
  protocolId: POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-post-canary-batch-17-deterministic-publication-compilation-prepared",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 17, stagingOnly: true,
  userAuthorization: { standingAuthorization: POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0 },
  inputs: { cohortReplay: COHORT, identitySnapshot: IDENTITY },
  explicitOrder: POST_CANARY_BATCH_17_PUBLICATION_COMPILATION_ORDER, contexts,
  executionPolicy: { deterministicRepositoryCompilationPassesMaximum: 1,
    rerunsMaximum: 0, modelContexts: 0, paidServiceCalls: 0, separateActivationRequired: true },
  compilationPolicy: { explicitOrderRequired: true, validateInputsBeforeCompilation: true,
    validateAllCandidatesBeforeWrite: true, currentProductionInputLimitedToIdentitySnapshot: true,
    scoresRecalculated: false, scorePassesMaximum: 0, modelAuthoredScores: 0,
    productionFilesWritable: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingFutureOutputBlocks: true,
    partialCompiledOutputWriteProhibited: true, separateActivationRequired: true,
    rerunBlocks: true, modelExecutionBlocks: true, scoreRecalculationBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes,
  artifacts: { identitySnapshot: IDENTITY, execution: EXECUTION, analysis: ANALYSIS,
    compilationAudit: AUDIT, compiledRoot: `${ROOT}/compiled` },
  authorization: { deterministicCompilationActivation: true, deterministicCompilation: false,
    modelExecution: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-one-batch-17-deterministic-publication-compilation-pass" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(IDENTITY)), { recursive: true });
  await writeFile(path.resolve(IDENTITY), identityBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, debates: 4, moves: 79,
  deterministicCompilationPassesMaximum: 1, rerunsMaximum: 0, modelContexts: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
