#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_DEBATES as DEBATES, POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT, mergeAndValidatePublicationTimeoutRecoveryDebate } from "./lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { POST_CANARY_BATCH_09_PUBLICATION_ROOT as PUBLICATION_ROOT } from "./lib/assessment-production-post-canary-batch-09-publication.mjs";
import { validatePostCanaryBatch09PublicationOutput } from "./lib/assessment-production-post-canary-batch-09-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all(["execution-preparation-manifest.json", "execution-activation.json", "model-execution.json"].map((name) => readFile(path.resolve(`${ROOT}/${name}`)).then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `analysis source hash mismatch: ${file}`);
assertV4(execution.contextsPlanned === 8 && execution.attempts === execution.contextsAttempted && execution.retries === 0 && execution.timeoutExtensions === 0 && execution.recursiveCorrectionContexts === 0 && execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0, "recovery execution record changed");

let merges = new Map(); let cohortRows = []; let failureMessage = null;
if (execution.validContexts === 8 && execution.invalidContexts === 0 && execution.contextsAttempted === 8 && execution.results.every((row) => row.gateAcceptancePassed)) {
  try {
    for (const debateNumber of DEBATES) {
      const contexts = activation.contexts.filter((row) => row.debateNumber === debateNumber);
      const packetBytes = await readFile(path.resolve(`${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`));
      const publicationPacket = JSON.parse(packetBytes);
      const shardPackets = await Promise.all(contexts.map((row) => readFile(path.resolve(row.packet)).then(JSON.parse)));
      const shardOutputBytes = await Promise.all(contexts.map((row) => readFile(path.resolve(row.output))));
      for (let index = 0; index < contexts.length; index += 1) {
        const result = execution.results.find((row) => row.contextIndex === contexts[index].contextIndex);
        assertV4(result && sha256(shardOutputBytes[index]) === result.outputSha256, `context ${contexts[index].contextIndex}: output hash changed`);
      }
      const merge = mergeAndValidatePublicationTimeoutRecoveryDebate({ shardOutputs: shardOutputBytes.map(JSON.parse), shardPackets, publicationPacket });
      assertV4(merge.validation.status === "passed", `Debate ${debateNumber}: complete validation failed`);
      merges.set(debateNumber, { ...merge, publicationPacket, packetBytes, shardOutputBytes, contexts });
    }
    const acceptedPaths = new Map([
      ["170", `${PUBLICATION_ROOT}/repair-1/merged/debate-170.json`],
      ...["134", "19", "114", "89", "176"].map((number) => [number, `${PUBLICATION_ROOT}/resumption-1/outputs/debate-${number}.json`]),
      ...DEBATES.map((number) => [number, `${ROOT}/merged/debate-${number}.json`])
    ]);
    const order = ["170", "134", "19", "114", "166", "89", "176", "183", "112", "17"];
    for (const debateNumber of order) {
      const publicationPacket = JSON.parse(await readFile(path.resolve(`${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`)));
      const output = merges.has(debateNumber) ? merges.get(debateNumber).merged : JSON.parse(await readFile(path.resolve(acceptedPaths.get(debateNumber))));
      const validation = validatePostCanaryBatch09PublicationOutput(output, publicationPacket);
      assertV4(validation.status === "passed", `Debate ${debateNumber}: cohort replay failed`);
      cohortRows.push({ debateNumber, outputPath: acceptedPaths.get(debateNumber), moves: validation.moves, critiques: validation.critiques, exactSourceQuotes: validation.exactSourceQuotes, overallCommentarySides: validation.overallCommentarySides, aiExtensionSides: validation.aiExtensionSides, modelAuthoredScores: validation.modelAuthoredScores, status: validation.status });
    }
    assertV4(cohortRows.length === 10 && cohortRows.reduce((sum, row) => sum + row.moves, 0) === 180 && cohortRows.reduce((sum, row) => sum + row.critiques, 0) === 180 && cohortRows.reduce((sum, row) => sum + row.exactSourceQuotes, 0) === 20 && cohortRows.reduce((sum, row) => sum + row.overallCommentarySides, 0) === 20 && cohortRows.reduce((sum, row) => sum + row.aiExtensionSides, 0) === 20 && cohortRows.every((row) => row.modelAuthoredScores === 0), "ten-debate cohort totals changed");
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = merges.size === 4 && cohortRows.length === 10 && !failureMessage;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-analysis",
  protocolId: activation.protocolId,
  status: passed ? "batch-09-four-debate-sharded-publication-recovery-and-ten-debate-cohort-replay-passed" : "batch-09-publication-timeout-recovery-failed",
  productionCanary: false, batchNumber: 9, stagingOnly: true,
  gate: { contextsPlanned: 8, contextsAttempted: execution.contextsAttempted, contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts, recoveredDebates: merges.size, shardsPerDebate: 2, completeDebatesValidated: [...merges.values()].filter((row) => row.validation.status === "passed").length, cohortDebatesValidated: cohortRows.length, cohortMovesValidated: cohortRows.reduce((sum, row) => sum + row.moves, 0), cohortCritiquesValidated: cohortRows.reduce((sum, row) => sum + row.critiques, 0), failedPartialOutputsReused: 0, originalContentFieldsAcceptedExactlyOnce: passed, fixedFieldsReconstructedDeterministically: passed, hostAwakeGuardAppliedToEveryContext: execution.results.every((row) => row.hostAwakeGuardApplied), attempts: execution.attempts, retries: 0, timeoutExtensions: 0, recursiveCorrections: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage,
  preservedAcceptedOutputs: ["170", "134", "19", "114", "89", "176"],
  recoveredDebates: DEBATES,
  cohortReplay: passed ? activation.artifacts.cohortReplay : null,
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  nextAuthorizedAction: passed ? "prepare-batch-09-deterministic-publication-compilation" : "stop-on-further-publication-recovery-failure"
};
if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), "analysis already exists");
  if (passed) {
    for (const debateNumber of DEBATES) {
      const row = merges.get(debateNumber); const mergedPath = activation.artifacts.merged[debateNumber];
      const mergedBytes = Buffer.from(`${JSON.stringify(row.merged, null, 2)}\n`);
      const validationPath = `${ROOT}/complete-validation-debate-${debateNumber}.json`; const auditPath = `${ROOT}/merge-audit-debate-${debateNumber}.json`;
      for (const file of [mergedPath, validationPath, auditPath]) assertV4(!(await exists(file)), `${file} already exists`);
      await mkdir(path.dirname(path.resolve(mergedPath)), { recursive: true });
      await writeFile(path.resolve(mergedPath), mergedBytes);
      await writeFile(path.resolve(validationPath), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-complete-validation", protocolId: activation.protocolId, status: "passed", debateNumber, mergedOutputSha256: sha256(mergedBytes), validationSummary: row.validation, acceptedOriginalContentFields: row.acceptedContentFields.length, acceptedExactlyOnce: true, failedPartialOutputReused: false, fixedFieldsReconstructedDeterministically: true, modelAuthoredScores: 0, lockedScoresUnchanged: true }, null, 2)}\n`);
      await writeFile(path.resolve(auditPath), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-merge-audit", protocolId: activation.protocolId, status: "passed", debateNumber, originalFailedPartialOutputReused: false, acceptedShardOutputs: row.contexts.map((context, index) => ({ shardId: context.shardId, side: context.side, path: context.output, sha256: sha256(row.shardOutputBytes[index]), writableFields: context.writableFields })), acceptedOriginalContentFields: row.acceptedContentFields, acceptedExactlyOnce: true, fixedFieldsReconstructedDeterministically: true, mergedOutput: mergedPath, mergedOutputSha256: sha256(mergedBytes), completeValidation: row.validation, modelAuthoredScores: 0, lockedScoresUnchanged: true }, null, 2)}\n`);
    }
    const cohortReplay = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-cohort-replay", protocolId: activation.protocolId, status: "passed-complete-ten-debate-publication-cohort", batchNumber: 9, debateOrder: ["170", "134", "19", "114", "166", "89", "176", "183", "112", "17"], debates: cohortRows, totals: { debates: 10, moves: 180, critiques: 180, exactSourceQuotes: 20, overallCommentarySides: 20, aiExtensionSides: 20, modelAuthoredScores: 0 }, scoresUnchanged: true, sourcesUnchanged: true, acceptedFieldsUnchanged: true };
    await writeFile(path.resolve(activation.artifacts.cohortReplay), `${JSON.stringify(cohortReplay, null, 2)}\n`);
  }
  await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, contextsAttempted: analysis.gate.contextsAttempted, contextsPassed: analysis.gate.contextsPassed, recoveredDebates: analysis.gate.recoveredDebates, cohortDebates: analysis.gate.cohortDebatesValidated, cohortMoves: analysis.gate.cohortMovesValidated, attempts: analysis.gate.attempts, retries: 0, costUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 2;
