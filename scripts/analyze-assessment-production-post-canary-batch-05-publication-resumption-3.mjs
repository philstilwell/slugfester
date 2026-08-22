#!/usr/bin/env node
import { createHash } from "node:crypto"; import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write"); const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT;
const [p, a, e] = await Promise.all(["execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"]
  .map((file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(a.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `cohort source mismatch: ${file}`);
assertV4(e.contextsPlanned === 1 && e.contextsAttempted === 1 && e.attempts === 1 &&
  e.retries === 0 && e.timeoutExtensions === 0 && e.correctionContexts === 0 &&
  e.meteredApiCostUsd === 0 && e.paidServiceCallsThisStage === 0 && e.modelAuthoredScores === 0,
"Debate 59 execution changed");
if (shouldWrite) for (const file of [a.artifacts.analysis, a.artifacts.cohortValidation])
  assertV4(!(await exists(file)), `${file} exists`);
let rows = []; let failureMessage = null;
if (e.validContexts === 1 && e.invalidContexts === 0 && e.results[0].gateAcceptancePassed) {
  try { for (const accepted of a.acceptedDebates) { const [outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(accepted.output)), readFile(path.resolve(accepted.packet))]);
    assertV4(sha256(outputBytes) === accepted.outputSha256 && sha256(packetBytes) === accepted.packetSha256,
      `Debate ${accepted.debateNumber}: accepted artifact changed`);
    rows.push({ debateNumber: accepted.debateNumber, source: "accepted-before-debate-59",
      output: accepted.output, outputSha256: sha256(outputBytes),
      validation: validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes)) }); }
    const context = a.contexts[0]; const outputBytes = await readFile(path.resolve(context.output));
    const packetBytes = await readFile(path.resolve(context.packet));
    assertV4(sha256(outputBytes) === e.results[0].outputSha256, "Debate 59 output changed");
    rows.push({ debateNumber: "59", source: "resumption-3", output: context.output,
      outputSha256: sha256(outputBytes),
      validation: validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes)) });
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); rows = []; }
}
const sum = (field) => rows.reduce((total, row) => total + row.validation[field], 0);
const expectedOrder = ["158", "46", "64", "132", "189", "109", "179", "05", "42", "59"];
const passed = rows.length === 10 && canonicalJson(rows.map((row) => row.debateNumber)) === canonicalJson(expectedOrder) &&
  sum("moves") === 187 && sum("critiques") === 187 && sum("quoteExactSourceMatches") === 20 &&
  sum("overallCommentarySides") === 20 && sum("aiExtensionSides") === 20 &&
  rows.every((row) => row.validation.status === "passed" && row.validation.lockedScoresUnchanged === true);
const cohort = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-ten-debate-cohort-validation",
  protocolId: a.protocolId, status: passed ? "passed" : "failed",
  debateOrder: rows.map((row) => row.debateNumber), debates: rows.length,
  moves: rows.length ? sum("moves") : 0, critiques: rows.length ? sum("critiques") : 0,
  exactSourceQuotes: rows.length ? sum("quoteExactSourceMatches") : 0,
  overallCommentarySides: rows.length ? sum("overallCommentarySides") : 0,
  aiExtensionSides: rows.length ? sum("aiExtensionSides") : 0,
  lockedScoresUnchanged: passed, modelAuthoredScores: 0,
  outputs: rows.map(({ debateNumber, source, output, outputSha256 }) =>
    ({ debateNumber, source, output, outputSha256 })), failureMessage };
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-3-analysis",
  protocolId: a.protocolId, status: passed
    ? "batch-05-debate-59-and-ten-debate-publication-cohort-replay-passed"
    : "batch-05-debate-59-or-ten-debate-publication-cohort-replay-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: { contextsPlanned: 1, contextsAttempted: 1, contextsPassed: e.validContexts,
    contextsFailed: e.invalidContexts, cohortValidationPassed: passed,
    cohortDebates: cohort.debates, cohortMoves: cohort.moves,
    cohortCritiques: cohort.critiques, exactSourceQuotes: cohort.exactSourceQuotes,
    overallCommentarySides: cohort.overallCommentarySides,
    aiExtensionSides: cohort.aiExtensionSides, lockedScoresUnchanged: cohort.lockedScoresUnchanged,
    attempts: 1, retries: 0, timeoutExtensions: 0,
    correctionContexts: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage, totals: { modelContexts: 1, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { publicationCompilationPreparation: passed,
    publicationCompilationExecution: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "resume-batch-05-standing-authorization-at-publication-compilation-preparation"
    : "stop-after-failed-debate-59-or-cohort-replay" };
if (shouldWrite) { await writeFile(path.resolve(a.artifacts.cohortValidation), `${JSON.stringify(cohort, null, 2)}\n`);
  await writeFile(path.resolve(a.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`); }
console.log(JSON.stringify({ status: analysis.status, debate59Passed: e.validContexts === 1,
  cohortValidationPassed: passed, cohortDebates: cohort.debates, cohortMoves: cohort.moves,
  cohortCritiques: cohort.critiques, exactSourceQuotes: cohort.exactSourceQuotes,
  attempts: 1, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
