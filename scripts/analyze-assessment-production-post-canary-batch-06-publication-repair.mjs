#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  mergeAndValidateBatch06PublicationRepairs,
  POST_CANARY_BATCH_06_PUBLICATION_REPAIR_ROOT
} from "./lib/assessment-production-post-canary-batch-06-publication-repair.mjs";
import {
  POST_CANARY_BATCH_06_PUBLICATION_DEBATES,
  POST_CANARY_BATCH_06_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-06-publication.mjs";
import {
  validatePostCanaryBatch06PublicationOutput
} from "./lib/assessment-production-post-canary-batch-06-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_06_PUBLICATION_REPAIR_ROOT;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`)),
  readFile(path.resolve(`${ROOT}/execution-activation.json`)),
  readFile(path.resolve(`${ROOT}/model-execution.json`))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `repair analysis source mismatch: ${file}`);
assertV4(execution.contextsPlanned === 25 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.recursiveCorrections === 0 && execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0,
"Batch 6 repair execution boundary changed");
if (shouldWrite) for (const file of [activation.artifacts.analysis,
  activation.artifacts.completeValidation, activation.artifacts.mergeAudit,
  activation.artifacts.cohortReplay,
  ...["141", "168", "135", "143"].map((debateNumber) =>
    `${activation.artifacts.mergedRoot}/debate-${debateNumber}.json`)])
  assertV4(!(await exists(file)), `${file} already exists`);

const canMerge = execution.contextsAttempted === 25 && execution.validContexts === 25 &&
  execution.invalidContexts === 0 && execution.results.every((row) => row.gateAcceptancePassed);
const mergedByDebate = {};
const mergeDetails = [];
let failureMessage = null;
if (canMerge) {
  try {
    for (const debateNumber of ["141", "168", "135", "143"]) {
      const contexts = activation.contexts.filter((row) => row.debateNumber === debateNumber);
      const basePath = `${POST_CANARY_BATCH_06_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
      const packetPath = `${POST_CANARY_BATCH_06_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
      const baseBytes = await readFile(path.resolve(basePath));
      const publicationPacket = JSON.parse(await readFile(path.resolve(packetPath), "utf8"));
      const repairPackets = [];
      const repairOutputs = [];
      for (const context of contexts) {
        const result = execution.results.find((row) => row.contextIndex === context.contextIndex);
        const [packetBytes, outputBytes, validationBytes, provenanceBytes] = await Promise.all([
          readFile(path.resolve(context.packet)), readFile(path.resolve(context.output)),
          readFile(path.resolve(context.validation)), readFile(path.resolve(context.provenance))
        ]);
        assertV4(result && sha256(outputBytes) === result.outputSha256 &&
          sha256(validationBytes) === result.validationSha256 &&
          sha256(provenanceBytes) === result.provenanceSha256,
        `${context.packetId}: accepted repair audit changed`);
        repairPackets.push(JSON.parse(packetBytes));
        repairOutputs.push(JSON.parse(outputBytes));
      }
      const merge = mergeAndValidateBatch06PublicationRepairs({ baseOutput: JSON.parse(baseBytes),
        repairOutputs, repairPackets, publicationPacket });
      mergedByDebate[debateNumber] = merge.merged;
      mergeDetails.push({ debateNumber, immutableRejectedOutput: basePath,
        immutableRejectedOutputSha256: sha256(baseBytes), contexts: contexts.map((context) => ({
          contextIndex: context.contextIndex, packetId: context.packetId,
          output: context.output, outputSha256: execution.results.find((row) =>
            row.contextIndex === context.contextIndex).outputSha256,
          writableFields: context.writableFields })),
        authorizedTransformations: merge.transformations,
        authorizedFieldsChanged: merge.transformations.length,
        immutableFieldsChanged: 0, validation: merge.fullValidation });
    }
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const cohort = [];
if (mergeDetails.length === 4 && !failureMessage) {
  try {
    for (const debateNumber of POST_CANARY_BATCH_06_PUBLICATION_DEBATES) {
      const output = mergedByDebate[debateNumber] ?? JSON.parse(await readFile(path.resolve(
        `${POST_CANARY_BATCH_06_PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`), "utf8"));
      const packet = JSON.parse(await readFile(path.resolve(
        `${POST_CANARY_BATCH_06_PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`), "utf8"));
      const validation = validatePostCanaryBatch06PublicationOutput(output, packet);
      cohort.push({ debateNumber, source: mergedByDebate[debateNumber] ? "merged-repair" : "accepted-original",
        outputSha256: sha256(Buffer.from(`${JSON.stringify(output, null, 2)}\n`)), validation });
    }
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const totals = cohort.reduce((result, row) => ({
  moves: result.moves + row.validation.moves,
  critiques: result.critiques + row.validation.critiques,
  quotes: result.quotes + row.validation.quoteExactSourceMatches,
  commentarySides: result.commentarySides + row.validation.overallCommentarySides,
  extensionSides: result.extensionSides + row.validation.aiExtensionSides
}), { moves: 0, critiques: 0, quotes: 0, commentarySides: 0, extensionSides: 0 });
const passed = cohort.length === 10 && totals.moves === 200 && totals.critiques === 200 &&
  totals.quotes === 20 && totals.commentarySides === 20 && totals.extensionSides === 20 &&
  mergeDetails.reduce((sum, row) => sum + row.authorizedFieldsChanged, 0) === 49 && !failureMessage;

const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed ? "batch-06-publication-repair-and-ten-debate-cohort-replay-passed"
    : "batch-06-publication-repair-or-cohort-replay-failed",
  productionCanary: false, batchNumber: 6, stagingOnly: true,
  sources: { preparationSha256: sha256(preparationBytes),
    activationSha256: sha256(activationBytes), executionSha256: sha256(executionBytes) },
  gate: { contextsPlanned: 25, contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts,
    contextsUnattempted: execution.contextsUnattempted,
    correctedFields: passed ? 49 : 0, repairedDebates: passed ? 4 : 0,
    completeTenDebateCohortReplayPassed: passed, attempts: execution.attempts,
    retries: 0, timeoutExtensions: 0, recursiveCorrections: 0,
    immutableFieldsChanged: passed ? 0 : null, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0 },
  cohortTotals: totals, failureMessage,
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { publicationCompilationPreparation: passed,
    publicationCompilationExecution: false, retry: false, timeoutExtension: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "prepare-batch-06-deterministic-publication-compilation-pass"
    : "diagnose-first-failed-batch-06-publication-repair-or-replay-category"
};

if (shouldWrite && passed) {
  await mkdir(path.resolve(activation.artifacts.mergedRoot), { recursive: true });
  for (const [debateNumber, output] of Object.entries(mergedByDebate))
    await writeFile(path.resolve(`${activation.artifacts.mergedRoot}/debate-${debateNumber}.json`),
      `${JSON.stringify(output, null, 2)}\n`);
  const completeValidation = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-repair-complete-validation",
    protocolId: activation.protocolId, status: "passed", repairedDebates: mergeDetails.map((row) => ({
      debateNumber: row.debateNumber, authorizedFieldsChanged: row.authorizedFieldsChanged,
      immutableFieldsChanged: 0, validation: row.validation })),
    repairedDebateCount: 4, authorizedFieldsChanged: 49,
    immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const mergeAudit = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-repair-merge-audit",
    protocolId: activation.protocolId, status: "passed", repairs: mergeDetails,
    authorizedFieldsChanged: 49, immutableFieldsChanged: 0,
    acceptedOriginalDebatesPreserved: 6, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const cohortReplay = { schemaVersion: "1.0-assessment-production-post-canary-batch-06-publication-repair-cohort-replay",
    protocolId: activation.protocolId, status: "passed", debates: cohort, totals,
    acceptedOriginalDebates: 6, repairedDebates: 4, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0, lockedScoresUnchanged: true };
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.cohortReplay), `${JSON.stringify(cohortReplay, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: execution.contextsAttempted,
  contextsPassed: execution.validContexts, repairedDebates: analysis.gate.repairedDebates,
  correctedFields: analysis.gate.correctedFields,
  tenDebateCohortReplayPassed: analysis.gate.completeTenDebateCohortReplayPassed,
  movesValidated: totals.moves, critiquesValidated: totals.critiques,
  exactQuotesValidated: totals.quotes, attempts: execution.attempts,
  retries: 0, meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
