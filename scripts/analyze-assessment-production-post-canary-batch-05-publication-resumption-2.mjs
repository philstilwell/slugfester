#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `cohort replay source mismatch: ${file}`);
assertV4(execution.contextsPlanned === 4 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.correctionContexts === 0 && execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0,
"the resumption-2 execution record changed");
if (shouldWrite) for (const file of [activation.artifacts.analysis, activation.artifacts.cohortValidation])
  assertV4(!(await exists(file)), `${file} already exists`);
let rows = []; let failureMessage = null;
if (execution.contextsAttempted === 4 && execution.validContexts === 4 &&
    execution.invalidContexts === 0 && execution.results.every((row) => row.gateAcceptancePassed)) {
  try {
    for (const accepted of activation.acceptedDebates) {
      const [outputBytes, packetBytes] = await Promise.all([
        readFile(path.resolve(accepted.output)), readFile(path.resolve(accepted.packet))]);
      assertV4(sha256(outputBytes) === accepted.outputSha256 &&
        sha256(packetBytes) === accepted.packetSha256,
      `Debate ${accepted.debateNumber}: accepted source changed`);
      rows.push({ debateNumber: accepted.debateNumber, source: "accepted-before-resumption-2",
        output: accepted.output, outputSha256: sha256(outputBytes),
        validation: validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes)) });
    }
    for (const context of activation.contexts) {
      const result = execution.results.find((row) => row.contextIndex === context.contextIndex);
      const [outputBytes, packetBytes] = await Promise.all([
        readFile(path.resolve(context.output)), readFile(path.resolve(context.packet))]);
      assertV4(result && result.outputSha256 === sha256(outputBytes),
        `Debate ${context.debateNumber}: new output changed`);
      rows.push({ debateNumber: context.debateNumber, source: "resumption-2",
        output: context.output, outputSha256: sha256(outputBytes),
        validation: validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes)) });
    }
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); rows = []; }
}
const sum = (field) => rows.reduce((total, row) => total + row.validation[field], 0);
const passed = rows.length === 10 &&
  canonicalJson(rows.map((row) => row.debateNumber)) ===
    canonicalJson(["158", "46", "64", "132", "189", "109", "179", "05", "42", "59"]) &&
  sum("moves") === 187 && sum("critiques") === 187 &&
  sum("quoteExactSourceMatches") === 20 && sum("overallCommentarySides") === 20 &&
  sum("aiExtensionSides") === 20 && rows.every((row) => row.validation.status === "passed" &&
    row.validation.lockedScoresUnchanged === true);
const cohortValidation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-ten-debate-cohort-validation",
  protocolId: activation.protocolId, status: passed ? "passed" : "failed",
  debateOrder: rows.map((row) => row.debateNumber), debates: rows.length,
  moves: rows.length ? sum("moves") : 0, critiques: rows.length ? sum("critiques") : 0,
  exactSourceQuotes: rows.length ? sum("quoteExactSourceMatches") : 0,
  overallCommentarySides: rows.length ? sum("overallCommentarySides") : 0,
  aiExtensionSides: rows.length ? sum("aiExtensionSides") : 0,
  lockedScoresUnchanged: passed, modelAuthoredScores: 0,
  outputs: rows.map(({ debateNumber, source, output, outputSha256 }) =>
    ({ debateNumber, source, output, outputSha256 })), failureMessage };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-2-analysis",
  protocolId: activation.protocolId, status: passed
    ? "batch-05-four-context-resumption-and-ten-debate-publication-replay-passed"
    : "batch-05-four-context-resumption-or-ten-debate-publication-replay-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: { contextsPlanned: 4, contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts,
    cohortValidationPassed: passed, cohortDebates: cohortValidation.debates,
    cohortMoves: cohortValidation.moves, cohortCritiques: cohortValidation.critiques,
    exactSourceQuotes: cohortValidation.exactSourceQuotes,
    overallCommentarySides: cohortValidation.overallCommentarySides,
    aiExtensionSides: cohortValidation.aiExtensionSides,
    lockedScoresUnchanged: cohortValidation.lockedScoresUnchanged,
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
    correctionContexts: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage,
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { publicationCompilationPreparation: passed,
    publicationCompilationExecution: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "resume-batch-05-standing-authorization-at-publication-compilation-preparation"
    : "stop-after-failed-resumption-2-or-cohort-replay" };
if (shouldWrite) {
  await writeFile(path.resolve(activation.artifacts.cohortValidation),
    `${JSON.stringify(cohortValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: execution.contextsAttempted,
  contextsPassed: execution.validContexts, cohortValidationPassed: passed,
  cohortDebates: cohortValidation.debates, cohortMoves: cohortValidation.moves,
  cohortCritiques: cohortValidation.critiques, exactSourceQuotes: cohortValidation.exactSourceQuotes,
  attempts: execution.attempts, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
