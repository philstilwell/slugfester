#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch04PublicationOutput } from "./lib/assessment-production-post-canary-batch-04-publication-validation.mjs";
import { POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT } from "./lib/assessment-production-post-canary-batch-04-publication-resumption-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT;
const paths = { preparation: `${ROOT}/execution-preparation-manifest.json`,
  activation: `${ROOT}/execution-activation.json`, execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json` };
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (shouldWrite) assertV4(!(await exists(paths.analysis)), `${paths.analysis} already exists`);
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(paths.preparation)), readFile(path.resolve(paths.activation)),
  readFile(path.resolve(paths.execution))]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(activation.status ===
  "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-authorized-under-standing-authorization" &&
  execution.contextsPlanned === 6 && execution.contextsAttempted >= 1 &&
  execution.contextsAttempted <= 6 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.correctionContexts === 0 && execution.modelAuthoredScores === 0 &&
  execution.paidServiceCallsThisStage === 0,
"the Batch 4 resumption-2 analysis boundary changed");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `resumption-2 analysis source hash mismatch: ${file}`);
}
const accepted = [];
for (const source of activation.acceptedCohort) {
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(source.output)), readFile(path.resolve(source.packet))]);
  assertV4(sha256(outputBytes) === source.outputSha256 &&
    sha256(packetBytes) === source.packetSha256,
  `accepted Debate ${source.debateNumber} hash changed`);
  accepted.push({ debateNumber: source.debateNumber,
    validation: validatePostCanaryBatch04PublicationOutput(
      JSON.parse(outputBytes), JSON.parse(packetBytes)) });
}
const replayed = [];
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  assertV4(context?.debateNumber === result.debateNumber &&
    context.originalContextIndex === result.originalContextIndex,
  `context ${result.contextIndex}: identity mismatch`);
  if (!result.gateAcceptancePassed) {
    replayed.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber,
      status: result.status, gateAcceptancePassed: false, validationReplayed: false });
    continue;
  }
  const [outputBytes, packetBytes, validationBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(context.rawOutput)), readFile(path.resolve(context.packet)),
    readFile(path.resolve(context.validation)), readFile(path.resolve(context.provenance))]);
  assertV4(sha256(outputBytes) === result.outputSha256 &&
    sha256(validationBytes) === result.validationSha256 &&
    sha256(provenanceBytes) === result.provenanceSha256,
  `Debate ${result.debateNumber}: artifact hash mismatch`);
  const validation = validatePostCanaryBatch04PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes));
  const validationRecord = JSON.parse(validationBytes);
  const provenance = JSON.parse(provenanceBytes);
  assertV4(validationRecord.status === "passed" &&
    provenance.outputSha256 === result.outputSha256 && provenance.attemptCount === 1 &&
    provenance.retryCount === 0 && provenance.timeoutExtensionCount === 0,
  `Debate ${result.debateNumber}: accepted audit mismatch`);
  replayed.push({ contextIndex: result.contextIndex, debateNumber: result.debateNumber,
    status: result.status, gateAcceptancePassed: true, validationReplayed: true,
    outputSha256: result.outputSha256, validation });
}
const valid = replayed.filter((row) => row.gateAcceptancePassed);
const sum = (rows, field) => rows.reduce((total, row) => total + row.validation[field], 0);
const resumptionPass = execution.status ===
  "six-post-canary-batch-04-publication-resumption-2-contexts-passed" &&
  execution.contextsAttempted === 6 && execution.contextsUnattempted === 0 &&
  execution.validContexts === 6 && execution.invalidContexts === 0 && valid.length === 6 &&
  sum(valid, "moves") === 118 && sum(valid, "critiques") === 118 &&
  sum(valid, "quoteExactSourceMatches") === 12 &&
  sum(valid, "overallCommentarySides") === 12 && sum(valid, "aiExtensionSides") === 12;
const cohort = [...accepted, ...valid];
const cohortPass = resumptionPass && cohort.length === 10 &&
  sum(cohort, "moves") === 203 && sum(cohort, "critiques") === 203 &&
  sum(cohort, "quoteExactSourceMatches") === 20 &&
  sum(cohort, "overallCommentarySides") === 20 && sum(cohort, "aiExtensionSides") === 20 &&
  cohort.every((row) => row.validation.minimumCritiqueCharacters >= 880 &&
    row.validation.lockedScoresUnchanged === true &&
    row.validation.calculatedScoresAuthoredByModel === 0);
const timingPass = execution.results.every((result) =>
  result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false) &&
  execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = cohortPass && timingPass;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-analysis",
  protocolId: activation.protocolId,
  status: passed ? "post-canary-batch-04-complete-ten-debate-publication-output-gate-passed" :
    cohortPass ? "post-canary-batch-04-publication-resumption-2-failed-timing" :
      "post-canary-batch-04-publication-resumption-2-failed-validation",
  productionCanary: false, batchNumber: 4, stagingOnly: true,
  sources: { preparation: paths.preparation, preparationSha256: sha256(preparationBytes),
    activation: paths.activation, activationSha256: sha256(activationBytes),
    execution: paths.execution, executionSha256: sha256(executionBytes) },
  acceptedCohortReplay: accepted,
  validationReplay: replayed,
  execution: { contextsPlanned: execution.contextsPlanned,
    contextsAttempted: execution.contextsAttempted, contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts, invalidContexts: execution.invalidContexts,
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
    correctionContexts: 0, schedulerRamp: execution.schedulerRamp,
    maximumObservedConcurrency: execution.maximumObservedConcurrency,
    wallElapsedMs: execution.wallElapsedMs,
    aggregateModelElapsedMs: execution.aggregateModelElapsedMs },
  gate: { resumptionPass, cohortPass, timingPass,
    resumptionValidContexts: valid.length, cohortValidDebates: cohort.length,
    cohortMoves: cohort.length ? sum(cohort, "moves") : 0,
    cohortCritiques: cohort.length ? sum(cohort, "critiques") : 0,
    cohortExactSourceQuotes: cohort.length ? sum(cohort, "quoteExactSourceMatches") : 0,
    cohortOverallCommentarySides: cohort.length ? sum(cohort, "overallCommentarySides") : 0,
    cohortAIExtensionSides: cohort.length ? sum(cohort, "aiExtensionSides") : 0,
    minimumCritiqueCharacters: cohort.length ? Math.min(...cohort.map((row) => row.validation.minimumCritiqueCharacters)) : null,
    retries: 0, timeoutExtensions: 0, correctionContexts: 0,
    modelAuthoredScores: 0 },
  totals: { acceptedDebatesBeforeResumption: 4,
    resumptionModelContexts: execution.contextsAttempted,
    cohortDebates: cohort.length, cohortMoves: cohort.length ? sum(cohort, "moves") : 0,
    modelAuthoredScores: 0, paidServiceCalls: 0,
    publicationCompilationPasses: 0, productionMutations: 0,
    directIncrementalCostUsd: 0 },
  integrity: { participantJudgmentWasScoreBlind: true, scoresRemainedImmutable: true,
    everyAcceptedOutputReplayedDeterministically:
      accepted.length === 4 && valid.every((row) => row.validationReplayed),
    retriesPerformed: false, timeoutExtensionsPerformed: false,
    publicationCompiled: false, productionMutated: false },
  authorization: { failureDiagnosis: !passed, repairPacketPreparation: !passed,
    publicationCompilationPreparation: passed, deterministicCompilation: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed ?
    "prepare-batch-04-publication-compilation-under-standing-authorization" :
    "diagnose-batch-04-publication-resumption-2-failure-under-standing-authorization"
};
if (shouldWrite) await writeFile(path.resolve(paths.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status,
  resumptionContextsAttempted: analysis.execution.contextsAttempted,
  validResumptionContexts: analysis.execution.validContexts,
  validCohortDebates: analysis.gate.cohortValidDebates,
  cohortMoves: analysis.gate.cohortMoves, cohortCritiques: analysis.gate.cohortCritiques,
  cohortExactSourceQuotes: analysis.gate.cohortExactSourceQuotes,
  retries: 0, timeoutExtensions: 0, publicationCompilationPasses: 0,
  paidServiceCalls: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
