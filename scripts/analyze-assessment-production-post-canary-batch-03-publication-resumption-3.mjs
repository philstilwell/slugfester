#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_3_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)), readFile(path.resolve(ACTIVATION)), readFile(path.resolve(EXECUTION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `publication resumption analysis source hash mismatch: ${file}`);
assertV4(
  execution.contextsPlanned === 5 && execution.contextsAttempted >= 1 && execution.contextsAttempted <= 5 && execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 && execution.timeoutExtensions === 0 && execution.correctionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0 && execution.acceptedFiveDebateCohortUnavailableToModels === true,
  "the five-context publication execution record changed"
);
if (shouldWrite) for (const file of [activation.artifacts.analysis, activation.artifacts.cohortReplay]) assertV4(!(await exists(file)), `${file} already exists`);

const rows = [];
let failureMessage = null;
try {
  for (const accepted of Object.values(activation.acceptedOutputs)) {
    const [outputBytes, packet] = await Promise.all([
      readFile(path.resolve(accepted.output)), readFile(path.resolve(accepted.packet), "utf8").then(JSON.parse)
    ]);
    assertV4(sha256(outputBytes) === accepted.outputSha256, `accepted Debate ${accepted.debateNumber} output hash changed`);
    rows.push({ debateNumber: accepted.debateNumber, source: "accepted-prior-output", output: accepted.output, outputSha256: accepted.outputSha256, validation: validatePostCanaryBatch03PublicationOutput(JSON.parse(outputBytes), packet) });
  }
  for (const result of execution.results) {
    if (!result.gateAcceptancePassed) continue;
    const context = activation.contexts[result.contextIndex];
    const [outputBytes, packet] = await Promise.all([
      readFile(path.resolve(context.rawOutput)), readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
    ]);
    assertV4(sha256(outputBytes) === result.outputSha256, `Debate ${context.debateNumber} output hash changed`);
    rows.push({ debateNumber: context.debateNumber, source: "accepted-resumption-3-output", output: context.rawOutput, outputSha256: result.outputSha256, validation: validatePostCanaryBatch03PublicationOutput(JSON.parse(outputBytes), packet) });
  }
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
}
const totals = rows.reduce(
  (sum, row) => ({
    debates: sum.debates + 1,
    moves: sum.moves + row.validation.moves,
    critiques: sum.critiques + row.validation.critiques,
    exactSourceQuotes: sum.exactSourceQuotes + row.validation.quoteExactSourceMatches,
    overallCommentarySides: sum.overallCommentarySides + row.validation.overallCommentarySides,
    aiExtensionSides: sum.aiExtensionSides + row.validation.aiExtensionSides,
    noveltyItems: sum.noveltyItems + row.validation.noveltyItems,
    newArguments: sum.newArguments + row.validation.newArguments,
    modelAuthoredScores: sum.modelAuthoredScores + row.validation.calculatedScoresAuthoredByModel,
    lockedScoresUnchanged: sum.lockedScoresUnchanged && row.validation.lockedScoresUnchanged
  }),
  { debates: 0, moves: 0, critiques: 0, exactSourceQuotes: 0, overallCommentarySides: 0, aiExtensionSides: 0, noveltyItems: 0, newArguments: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true }
);
const passed =
  execution.contextsAttempted === 5 && execution.validContexts === 5 && execution.invalidContexts === 0 && rows.length === 10 &&
  totals.debates === 10 && totals.moves === 200 && totals.critiques === 200 && totals.exactSourceQuotes === 20 &&
  totals.overallCommentarySides === 20 && totals.aiExtensionSides === 20 && totals.modelAuthoredScores === 0 && totals.lockedScoresUnchanged === true;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-publication-resumption-3-analysis",
  protocolId: activation.protocolId,
  status: passed ? "batch-03-ten-debate-publication-output-cohort-complete-and-valid" : "batch-03-publication-resumption-3-failed-stop-required",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  gate: {
    contextsPlanned: 5, contextsAttempted: execution.contextsAttempted, contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts, contextsUnattempted: execution.contextsUnattempted,
    acceptedPriorDebates: 5, completeTenDebateCohortReplayPassed: passed, cohort: totals,
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0, correctionContexts: 0, modelAuthoredScores: 0
  },
  failureMessage,
  sourceHashes: { preparation: sha256(preparationBytes), activation: sha256(activationBytes), execution: sha256(executionBytes) },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { deterministicCompilationPreparation: passed, repairPreparation: false, retry: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-validate-freeze-commit-and-push-one-deterministic-batch-03-publication-compilation-pass" : "stop-without-repair-or-retry-after-failed-publication-model-output"
};
if (shouldWrite && passed) await writeFile(path.resolve(activation.artifacts.cohortReplay), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-ten-debate-publication-cohort-replay", protocolId: activation.protocolId, status: "passed", rows, totals }, null, 2)}\n`);
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: analysis.gate.contextsAttempted, contextsPassed: analysis.gate.contextsPassed, contextsFailed: analysis.gate.contextsFailed, completeTenDebateCohortReplayPassed: analysis.gate.completeTenDebateCohortReplayPassed, debatesValidated: totals.debates, movesValidated: totals.moves, attempts: analysis.gate.attempts, retries: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
