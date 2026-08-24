#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_ROOT,
  compilePostCanaryBatch08PublicationStagingRecord,
  validatePostCanaryBatch08CompiledStagingRecord
} from "./lib/assessment-production-post-canary-batch-08-publication-compilation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_ROOT;
const COHORT = `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-3/analysis.json`;
const IDENTITY = `${ROOT}/production-identity-snapshot.json`;
const MANIFEST = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const AUDIT = `${ROOT}/compilation-audit.json`;
const ACCEPTED_OUTPUTS = Object.freeze({
  "88": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1/merged/debate-88.json`,
  "194": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/outputs/debate-194.json`,
  "137": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/outputs/debate-137.json`,
  "08": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-1/repair-1/merged/debate-08.json`,
  "65": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-2/outputs/debate-65.json`,
  "140": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-2/outputs/debate-140.json`,
  "156": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-2/outputs/debate-156.json`,
  "120": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-2/repair-1/merged/debate-120.json`,
  "118": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-2/outputs/debate-118.json`,
  "145": `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/resumption-3/outputs/debate-145.json`
});
const acceptedOutput = (debateNumber) => ACCEPTED_OUTPUTS[debateNumber];
const packetPath = (debateNumber) =>
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const standing = await loadAndValidatePostCanaryBatch08StandingAuthorization();
if (shouldWrite) for (const file of [IDENTITY, MANIFEST]) assertV4(!(await exists(file)), `${file} exists`);
const cohort = JSON.parse(await readFile(path.resolve(COHORT), "utf8"));
assertV4(cohort.status === "batch-08-complete-ten-debate-publication-reconstruction-cohort-passed" &&
  cohort.cohortValidation?.status === "passed" && cohort.cohortValidation?.debates === 10 &&
  cohort.cohortValidation?.moves === 182 && cohort.cohortValidation?.critiques === 182 &&
  cohort.cohortValidation?.exactSourceQuotes === 20,
"the accepted Batch 8 publication cohort changed");

const productionByNumber = new Map(debates.map((debate) => [debate.number, debate]));
const identities = [];
const contexts = [];
for (const debateNumber of POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_ORDER) {
  const publicationOutput = acceptedOutput(debateNumber);
  const publicationPacket = packetPath(debateNumber);
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(publicationOutput)), readFile(path.resolve(publicationPacket))]);
  const output = JSON.parse(outputBytes);
  const packet = JSON.parse(packetBytes);
  const validation = validatePostCanaryBatch08PublicationOutput(output, packet);
  const production = productionByNumber.get(debateNumber);
  assertV4(validation.status === "passed" && output.debateId === packet.debateId &&
    production?.id === packet.debateId, `${debateNumber}: compilation input failed`);
  const identity = { id: production.id, number: production.number };
  if (production.topicCategory) identity.topicCategory = production.topicCategory;
  identities.push(identity);
  const compiled = compilePostCanaryBatch08PublicationStagingRecord({ output, packet, identity });
  const compiledValidation = validatePostCanaryBatch08CompiledStagingRecord({ compiled, output, packet, identity });
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
assertV4(contexts.length === 10 && contexts.reduce((sum, row) => sum + row.expectedMoves, 0) === 182,
"the Batch 8 compilation cohort changed");
const identitySnapshot = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-publication-compilation-identity-snapshot",
  protocolId: POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-minimal-production-identity-only", frozenAt,
  allowedFields: ["id", "number", "topicCategory"], legacyScoresIncluded: false,
  legacyProseIncluded: false, legacyTagsIncluded: false, legacyWinnerIncluded: false,
  rows: identities };
const identityBytes = Buffer.from(`${JSON.stringify(identitySnapshot, null, 2)}\n`);
const sources = [COHORT, POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  "docs/assessment-production/post-canary-continuation-v1/batch-08/final-ledger/final-ledger.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-08/score-pass/calculated-scores.json",
  "src/data/debates.js", "src/data/references.js",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-08-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-08-publication-compilation.mjs",
  "scripts/test-assessment-production-post-canary-batch-08-publication-compilation-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-08-publication-compilation.mjs",
  "scripts/run-assessment-production-post-canary-batch-08-publication-compilation.mjs",
  ...contexts.flatMap((row) => [row.publicationOutput, row.publicationPacket])];
const sourceHashes = {};
for (const file of [...new Set(sources)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[IDENTITY] = sha256(identityBytes);
const futureOutputPathsExcludedFromSourceHashes = [ACTIVATION, EXECUTION, ANALYSIS, AUDIT,
  ...contexts.map((row) => row.plannedCompiledOutput)];
for (const file of futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-08-deterministic-publication-compilation-preparation",
  protocolId: POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "frozen-post-canary-batch-08-deterministic-publication-compilation-prepared",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true,
  userAuthorization: { standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0 },
  inputs: { cohortReplay: COHORT, identitySnapshot: IDENTITY },
  explicitOrder: POST_CANARY_BATCH_08_PUBLICATION_COMPILATION_ORDER, contexts,
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
  nextAuthorizedAction: "activate-one-batch-08-deterministic-publication-compilation-pass" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(IDENTITY)), { recursive: true });
  await writeFile(path.resolve(IDENTITY), identityBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, debates: 10, moves: 182,
  deterministicCompilationPassesMaximum: 1, rerunsMaximum: 0, modelContexts: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
