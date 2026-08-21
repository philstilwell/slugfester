#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEBATE_27_PUBLICATION_REPAIR_ROOT, mergeAndValidateDebate27Repairs } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const PREPARATION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-activation.json`;
const EXECUTION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/model-execution.json`;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([readFile(path.resolve(PREPARATION)), readFile(path.resolve(ACTIVATION)), readFile(path.resolve(EXECUTION))]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `Debate 27 repair analysis source hash mismatch: ${file}`);
assertV4(
  execution.contextsPlanned === 4 && execution.contextsAttempted >= 1 && execution.contextsAttempted <= 4 && execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 && execution.timeoutExtensions === 0 && execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0 && execution.originalFailedOutputPreserved === true,
  "the Debate 27 repair execution record changed"
);
if (shouldWrite) for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput, activation.artifacts.completeValidation, activation.artifacts.mergeAudit, activation.artifacts.cohortReplay]) assertV4(!(await exists(file)), `${file} already exists`);

let merge = null;
let failureMessage = null;
let baseOutputBytes = null;
let repairOutputBytes = [];
const rows = [];
if (execution.contextsAttempted === 4 && execution.validContexts === 4 && execution.invalidContexts === 0 && execution.results.every(({ gateAcceptancePassed }) => gateAcceptancePassed)) {
  try {
    const [baseBytes, publicationPacketBytes] = await Promise.all([readFile(path.resolve(preparation.inputs.immutableBaseOutput)), readFile(path.resolve(preparation.inputs.publicationPacket))]);
    baseOutputBytes = baseBytes;
    assertV4(sha256(baseBytes) === activation.sourceHashes[preparation.inputs.immutableBaseOutput], "the failed Debate 27 base output changed before merge");
    const repairPackets = await Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.packet), "utf8").then(JSON.parse)));
    repairOutputBytes = await Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.repairOutput))));
    for (let index = 0; index < 4; index += 1) assertV4(sha256(repairOutputBytes[index]) === execution.results[index].repairOutputSha256, `Debate 27 repair output ${index} hash changed`);
    merge = mergeAndValidateDebate27Repairs({ baseOutput: JSON.parse(baseBytes), repairOutputs: repairOutputBytes.map((bytes) => JSON.parse(bytes)), repairPackets, publicationPacket: JSON.parse(publicationPacketBytes) });
    for (const accepted of Object.values(activation.acceptedOutputs)) {
      const [outputBytes, packet] = await Promise.all([readFile(path.resolve(accepted.output)), readFile(path.resolve(accepted.packet), "utf8").then(JSON.parse)]);
      assertV4(sha256(outputBytes) === accepted.outputSha256, `accepted Debate ${accepted.debateNumber} output hash changed`);
      rows.push({ debateNumber: accepted.debateNumber, source: "accepted-prior-output", output: accepted.output, outputSha256: accepted.outputSha256, validation: validatePostCanaryBatch03PublicationOutput(JSON.parse(outputBytes), packet) });
    }
    rows.push({ debateNumber: "27", source: "merged-seven-field-repair-output", output: activation.artifacts.mergedOutput, outputSha256: null, validation: merge.fullValidation });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const cohort = rows.reduce((sum, row) => ({ debates: sum.debates + 1, moves: sum.moves + row.validation.moves, critiques: sum.critiques + row.validation.critiques, exactSourceQuotes: sum.exactSourceQuotes + row.validation.quoteExactSourceMatches, overallCommentarySides: sum.overallCommentarySides + row.validation.overallCommentarySides, aiExtensionSides: sum.aiExtensionSides + row.validation.aiExtensionSides, noveltyItems: sum.noveltyItems + row.validation.noveltyItems, newArguments: sum.newArguments + row.validation.newArguments, modelAuthoredScores: sum.modelAuthoredScores + row.validation.calculatedScoresAuthoredByModel, lockedScoresUnchanged: sum.lockedScoresUnchanged && row.validation.lockedScoresUnchanged }), { debates: 0, moves: 0, critiques: 0, exactSourceQuotes: 0, overallCommentarySides: 0, aiExtensionSides: 0, noveltyItems: 0, newArguments: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true });
const correctedFields = execution.results.flatMap((result) => result.validationSummary?.correctedFields ?? []);
const passed = execution.validContexts === 4 && merge?.fullValidation?.status === "passed" && merge?.transformations?.length === 7 && correctedFields.length === 7 && cohort.debates === 10 && cohort.moves === 200 && cohort.critiques === 200 && cohort.exactSourceQuotes === 20 && cohort.overallCommentarySides === 20 && cohort.aiExtensionSides === 20 && cohort.modelAuthoredScores === 0 && cohort.lockedScoresUnchanged === true;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed ? "batch-03-debate-27-repair-and-ten-debate-publication-cohort-passed" : "batch-03-debate-27-repair-or-cohort-validation-failed-stop-required",
  productionCanary: false, batchNumber: 3, stagingOnly: true,
  gate: { repairContextsPlanned: 4, repairContextsAttempted: execution.contextsAttempted, repairContextsPassed: execution.validContexts, repairContextsFailed: execution.invalidContexts, repairContextsUnattempted: execution.contextsUnattempted, completeDebate27ValidationPassed: passed, correctedFields, correctedFieldCount: correctedFields.length, authorizedFieldsChanged: merge?.transformations?.length ?? 0, immutableFieldsChanged: passed ? 0 : null, movesValidated: merge?.fullValidation?.moves ?? 0, critiquesValidated: merge?.fullValidation?.critiques ?? 0, completeTenDebateCohortReplayPassed: passed, cohort, attempts: execution.attempts, retries: 0, timeoutExtensions: 0, recursiveCorrectionContexts: 0, modelAuthoredScores: 0 },
  failureMessage,
  sourceHashes: { preparation: sha256(preparationBytes), activation: sha256(activationBytes), execution: sha256(executionBytes), originalFailedOutput: baseOutputBytes ? sha256(baseOutputBytes) : activation.sourceHashes[preparation.inputs.immutableBaseOutput], repairOutputs: repairOutputBytes.map((bytes, index) => ({ packetIndex: index, sha256: sha256(bytes) })) },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { deterministicCompilationPreparation: passed, retry: false, recursiveRepair: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed ? "prepare-validate-freeze-commit-and-push-one-deterministic-batch-03-publication-compilation-pass" : "stop-without-retry-or-recursive-repair"
};
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  rows[rows.length - 1].outputSha256 = sha256(mergedBytes);
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-complete-publication-validation", protocolId: activation.protocolId, status: "passed", debateNumber: "27", mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation, authorizedFieldsChanged: 7, immutableFieldsChanged: 0, lockedScoresUnchanged: true, modelAuthoredScores: 0 }, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-merge-audit", protocolId: activation.protocolId, status: "passed", debateNumber: "27", originalFailedOutput: preparation.inputs.immutableBaseOutput, originalFailedOutputSha256: sha256(baseOutputBytes), repairOutputs: activation.contexts.map((context, index) => ({ packetIndex: index, path: context.repairOutput, sha256: sha256(repairOutputBytes[index]) })), mergedOutput: activation.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes), authorizedTransformations: merge.transformations, authorizedFieldsChanged: 7, immutableFieldsChanged: 0, completeDebateValidation: merge.fullValidation, lockedScoresUnchanged: true, modelAuthoredScores: 0 }, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.cohortReplay), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-ten-debate-publication-cohort-replay", protocolId: activation.protocolId, status: "passed", rows, totals: cohort, mergedDebate27OutputSha256: sha256(mergedBytes) }, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, repairContextsAttempted: analysis.gate.repairContextsAttempted, repairContextsPassed: analysis.gate.repairContextsPassed, correctedFieldCount: analysis.gate.correctedFieldCount, completeDebate27ValidationPassed: analysis.gate.completeDebate27ValidationPassed, tenDebateCohortReplayPassed: analysis.gate.completeTenDebateCohortReplayPassed, movesValidated: analysis.gate.movesValidated, attempts: analysis.gate.attempts, retries: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
