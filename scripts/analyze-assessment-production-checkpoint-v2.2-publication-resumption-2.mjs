#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_2_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all(["preparation-manifest.json", "execution-activation.json", "model-execution.json"].map((file) => readFile(path.resolve(`${CHECKPOINT_V22_RESUMPTION_2_ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(activation.status === "frozen-eight-untouched-production-checkpoint-v2.2-publication-contexts-authorized" && execution.schemaVersion === "1.0-production-checkpoint-v2.2-publication-resumption-2-model-execution" && execution.attempts === execution.contextsAttempted && execution.retries === 0 && execution.correctionContexts === 0 && execution.timeoutExtensions === 0 && execution.modelAuthoredScores === 0 && activation.authorization.deterministicAnalysis === true && activation.authorization.retry === false && activation.authorization.correctionModelExecution === false && activation.authorization.productionMutation === false, "resumption-2 analysis crossed its boundary");
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `resumption-2 analysis source hash mismatch: ${file}`);

async function replayPublication({ output, packet }, context = {}) {
  const [outputBytes, packetJson] = await Promise.all([readFile(path.resolve(output)), readFile(path.resolve(packet), "utf8").then(JSON.parse)]);
  const replay = validateCheckpointV22PublicationOutput(JSON.parse(outputBytes), packetJson);
  return { ...context, accepted: replay.status === "passed", validationReplayed: true, outputSha256: sha256(outputBytes), moves: replay.moves, critiques: replay.critiques, minimumCritiqueCharacters: replay.minimumCritiqueCharacters, tags: replay.tags, quoteExactSourceMatches: replay.quoteExactSourceMatches, overallCommentarySides: replay.overallCommentarySides, noveltyItems: replay.noveltyItems, introducedItems: replay.introducedItems, newArguments: replay.newArguments, aiExtensionSides: replay.aiExtensionSides, modelAuthoredScores: replay.calculatedScoresAuthoredByModel, lockedScoresUnchanged: replay.lockedScoresUnchanged };
}
const acceptedDebates = [];
for (const debate of preparation.acceptedDebates) {
  const validation = JSON.parse(await readFile(path.resolve(debate.validation), "utf8"));
  const replay = await replayPublication(debate, { contextIndex: null, originalContextIndex: debate.debateNumber === "50" ? 0 : 1, debateNumber: debate.debateNumber, status: "accepted-after-bounded-publication-repair", elapsedMinutes: null });
  assertV4(validation.status === "passed" && validation.mergedOutputSha256 === replay.outputSha256, `${debate.debateNumber}: accepted repaired debate replay failed`);
  acceptedDebates.push(replay);
}
const resumptionContexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find((item) => item.contextIndex === context.contextIndex);
  if (!result) {
    resumptionContexts.push({ contextIndex: context.contextIndex, originalContextIndex: context.originalContextIndex, debateNumber: context.debateNumber, debateId: context.debateId, status: "unattempted", accepted: false, validationReplayed: false, moves: null });
    continue;
  }
  let replay = null, replayMessage = null;
  if (result.outputWritten) {
    try { replay = await replayPublication({ output: context.rawOutput, packet: context.packet }); } catch (error) { replayMessage = (error.stack ?? error.message).slice(-10000); }
    assertV4(!result.gateAcceptancePassed || replay?.accepted, `${context.debateNumber}: accepted output replay failed`);
    assertV4(!replay || replay.outputSha256 === result.outputSha256, `${context.debateNumber}: output hash mismatch`);
  }
  if (result.validationWritten) assertV4(sha256(await readFile(path.resolve(context.validation))) === result.validationSha256, `${context.debateNumber}: validation hash mismatch`);
  if (result.provenanceWritten) assertV4(sha256(await readFile(path.resolve(context.provenance))) === result.provenanceSha256, `${context.debateNumber}: provenance hash mismatch`);
  resumptionContexts.push({ contextIndex: context.contextIndex, originalContextIndex: context.originalContextIndex, debateNumber: context.debateNumber, debateId: context.debateId, status: result.status, accepted: Boolean(result.gateAcceptancePassed && replay?.accepted), elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: Boolean(replay?.accepted), replayMessage, moves: replay?.moves ?? null, critiques: replay?.critiques ?? null, minimumCritiqueCharacters: replay?.minimumCritiqueCharacters ?? null, tags: replay?.tags ?? null, quoteExactSourceMatches: replay?.quoteExactSourceMatches ?? null, overallCommentarySides: replay?.overallCommentarySides ?? null, noveltyItems: replay?.noveltyItems ?? null, introducedItems: replay?.introducedItems ?? null, newArguments: replay?.newArguments ?? null, aiExtensionSides: replay?.aiExtensionSides ?? null, modelAuthoredScores: replay?.modelAuthoredScores ?? null, lockedScoresUnchanged: replay?.lockedScoresUnchanged ?? null });
}
const validResumption = resumptionContexts.filter((context) => context.accepted), cohortContexts = [...acceptedDebates, ...resumptionContexts], validCohort = cohortContexts.filter((context) => context.accepted), sum = (contexts, key) => contexts.reduce((total, context) => total + context[key], 0), contract = activation.acceptanceContract;
const resumptionSemanticPass = validResumption.length === contract.resumptionValidContextsRequired && sum(validResumption, "moves") === contract.resumptionMovesRequired && sum(validResumption, "critiques") === contract.resumptionCritiquesRequired && sum(validResumption, "quoteExactSourceMatches") === contract.resumptionExactSourceQuotesRequired && sum(validResumption, "overallCommentarySides") === contract.resumptionOverallCommentarySidesRequired && sum(validResumption, "aiExtensionSides") === contract.resumptionAIExtensionSidesRequired && validResumption.every((context) => context.minimumCritiqueCharacters >= contract.minimumCritiqueCharacters && context.newArguments >= 4 && context.introducedItems >= 2 && context.modelAuthoredScores === 0 && context.lockedScoresUnchanged === true);
const cohortSemanticPass = resumptionSemanticPass && validCohort.length === contract.cohortValidDebatesRequired && sum(validCohort, "moves") === contract.cohortMovesRequired && sum(validCohort, "critiques") === contract.cohortCritiquesRequired && sum(validCohort, "quoteExactSourceMatches") === contract.cohortExactSourceQuotesRequired && sum(validCohort, "overallCommentarySides") === contract.cohortOverallCommentarySidesRequired && sum(validCohort, "aiExtensionSides") === contract.cohortAIExtensionSidesRequired;
const timingPass = execution.results.every((result) => result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false) && execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs, passed = cohortSemanticPass && timingPass;
const wallElapsedMinutes = Number((execution.wallElapsedMs / 60000).toFixed(2)), maximumElapsedMinutes = validResumption.length ? Math.max(...validResumption.map((context) => context.elapsedMinutes)) : null, meanElapsedMinutes = validResumption.length ? Number((validResumption.reduce((total, context) => total + context.elapsedMinutes, 0) / validResumption.length).toFixed(2)) : null;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-2-analysis", protocolId: activation.protocolId,
  status: passed ? "production-checkpoint-v2.2-publication-resumed-model-gate-passed" : cohortSemanticPass ? "production-checkpoint-v2.2-publication-resumption-2-failed-timing" : "production-checkpoint-v2.2-publication-resumption-2-failed-validation",
  developmentValidationOnly: false, productionCanary: true, stagingOnly: true, AIOnly: true, acceptedDebates, resumptionContexts, cohortContexts,
  gate: { resumptionSemanticPass, cohortSemanticPass, timingPass, resumptionValidContexts: validResumption.length, requiredResumptionValidContexts: contract.resumptionValidContextsRequired, cohortValidDebates: validCohort.length, requiredCohortValidDebates: contract.cohortValidDebatesRequired, cohortMoves: sum(validCohort, "moves"), requiredCohortMoves: contract.cohortMovesRequired, cohortCritiques: sum(validCohort, "critiques"), requiredCohortCritiques: contract.cohortCritiquesRequired, minimumCritiqueCharacters: validCohort.length ? Math.min(...validCohort.map((context) => context.minimumCritiqueCharacters)) : null, cohortExactSourceQuotes: sum(validCohort, "quoteExactSourceMatches"), requiredCohortExactSourceQuotes: contract.cohortExactSourceQuotesRequired, cohortOverallCommentarySides: sum(validCohort, "overallCommentarySides"), requiredCohortOverallCommentarySides: contract.cohortOverallCommentarySidesRequired, cohortAIExtensionSides: sum(validCohort, "aiExtensionSides"), requiredCohortAIExtensionSides: contract.cohortAIExtensionSidesRequired, cohortNoveltyItems: sum(validCohort, "noveltyItems"), cohortIntroducedItems: sum(validCohort, "introducedItems"), cohortNewArguments: sum(validCohort, "newArguments"), wallElapsedMinutes, maximumElapsedMinutes, meanElapsedMinutes, absoluteGateTimeoutMinutes: activation.executionPolicy.absoluteGateTimeoutMs / 60000, retries: 0, correctionContexts: 0, timeoutExtensions: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  evidenceBoundary: activation.isolation,
  totals: { originalPublicationContexts: 2, repairContexts: 5, resumptionContexts: execution.contextsAttempted, cohortDebates: 10, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { deterministicCompilation: passed, failureDiagnosis: !passed, repairPacketPreparation: false, retry: false, correctionModelExecution: false, publicationFinalization: false, renderingVerification: false, productionMutation: false, remainingProductionBatches: false },
  nextAuthorizedAction: passed ? "prepare-and-run-deterministic-production-checkpoint-v2.2-publication-compilation" : "diagnose-production-checkpoint-v2.2-publication-resumption-2-failure-only"
};
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validResumptionContexts: validResumption.length, validCohortDebates: validCohort.length, cohortMoves: analysis.gate.cohortMoves, cohortCritiques: analysis.gate.cohortCritiques, minimumCritiqueCharacters: analysis.gate.minimumCritiqueCharacters, cohortExactSourceQuotes: analysis.gate.cohortExactSourceQuotes, cohortOverallCommentarySides: analysis.gate.cohortOverallCommentarySides, cohortAIExtensionSides: analysis.gate.cohortAIExtensionSides, timings: { wallElapsedMinutes, maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass }, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, productionMutationAuthorized: false, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
