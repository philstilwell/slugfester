#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_RESUMPTION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${CHECKPOINT_V22_RESUMPTION_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_RESUMPTION_ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_RESUMPTION_ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  activation.status === "frozen-nine-untouched-production-checkpoint-v2.2-publication-contexts-authorized" &&
    execution.schemaVersion === "1.0-production-checkpoint-v2.2-publication-resumption-model-execution" &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.correctionContexts === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    activation.authorization.deterministicAnalysis === true &&
    activation.authorization.retry === false &&
    activation.authorization.correctionModelExecution === false &&
    activation.authorization.productionMutation === false,
  "publication resumption analysis is unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `resumption analysis source hash mismatch: ${file}`);
}

async function replayContext(context, result) {
  if (!result) {
    return {
      contextIndex: context.contextIndex,
      originalContextIndex: context.originalContextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      status: "unattempted",
      accepted: false,
      validationReplayed: false,
      moves: null
    };
  }
  let replay = null;
  let replayMessage = null;
  if (result.outputWritten) {
    const [outputBytes, packet] = await Promise.all([
      readFile(path.resolve(context.rawOutput)),
      readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
    ]);
    assertV4(sha256(outputBytes) === result.outputSha256, `${context.debateNumber}: output hash mismatch`);
    try {
      replay = validateCheckpointV22PublicationOutput(JSON.parse(outputBytes), packet);
    } catch (error) {
      replayMessage = (error.stack ?? error.message).slice(-10000);
    }
    if (result.gateAcceptancePassed) assertV4(replay?.status === "passed", `${context.debateNumber}: accepted output replay failed`);
  }
  if (result.validationWritten) {
    assertV4(sha256(await readFile(path.resolve(context.validation))) === result.validationSha256, `${context.debateNumber}: validation hash mismatch`);
  }
  if (result.provenanceWritten) {
    assertV4(sha256(await readFile(path.resolve(context.provenance))) === result.provenanceSha256, `${context.debateNumber}: provenance hash mismatch`);
  }
  return {
    contextIndex: context.contextIndex,
    originalContextIndex: context.originalContextIndex,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    status: result.status,
    accepted: result.gateAcceptancePassed && replay?.status === "passed",
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    validationReplayed: replay?.status === "passed",
    replayMessage,
    moves: replay?.moves ?? null,
    critiques: replay?.critiques ?? null,
    minimumCritiqueCharacters: replay?.minimumCritiqueCharacters ?? null,
    tags: replay?.tags ?? null,
    quoteExactSourceMatches: replay?.quoteExactSourceMatches ?? null,
    overallCommentarySides: replay?.overallCommentarySides ?? null,
    noveltyItems: replay?.noveltyItems ?? null,
    introducedItems: replay?.introducedItems ?? null,
    newArguments: replay?.newArguments ?? null,
    aiExtensionSides: replay?.aiExtensionSides ?? null,
    modelAuthoredScores: replay?.calculatedScoresAuthoredByModel ?? null,
    lockedScoresUnchanged: replay?.lockedScoresUnchanged ?? null
  };
}

const resumptionContexts = [];
for (const context of activation.contexts) {
  resumptionContexts.push(await replayContext(
    context,
    execution.results.find((result) => result.contextIndex === context.contextIndex)
  ));
}
const [debate50Bytes, debate50Packet, debate50Validation] = await Promise.all([
  readFile(path.resolve(preparation.acceptedDebate50.output)),
  readFile(path.resolve(preparation.acceptedDebate50.packet), "utf8").then(JSON.parse),
  readFile(path.resolve(preparation.acceptedDebate50.validation), "utf8").then(JSON.parse)
]);
const debate50Replay = validateCheckpointV22PublicationOutput(JSON.parse(debate50Bytes), debate50Packet);
assertV4(
  debate50Validation.status === "passed" &&
    debate50Replay.status === "passed" &&
    debate50Replay.moves === 19 &&
    debate50Validation.mergedOutputSha256 === sha256(debate50Bytes),
  "accepted repaired Debate 50 replay failed"
);
const debate50 = {
  contextIndex: null,
  originalContextIndex: 0,
  debateNumber: "50",
  debateId: preparation.acceptedDebate50.debateId,
  status: "accepted-after-bounded-two-field-repair",
  accepted: true,
  elapsedMinutes: null,
  validationReplayed: true,
  moves: debate50Replay.moves,
  critiques: debate50Replay.critiques,
  minimumCritiqueCharacters: debate50Replay.minimumCritiqueCharacters,
  tags: debate50Replay.tags,
  quoteExactSourceMatches: debate50Replay.quoteExactSourceMatches,
  overallCommentarySides: debate50Replay.overallCommentarySides,
  noveltyItems: debate50Replay.noveltyItems,
  introducedItems: debate50Replay.introducedItems,
  newArguments: debate50Replay.newArguments,
  aiExtensionSides: debate50Replay.aiExtensionSides,
  modelAuthoredScores: 0,
  lockedScoresUnchanged: true
};
const validResumption = resumptionContexts.filter((context) => context.accepted);
const cohortContexts = [debate50, ...resumptionContexts];
const validCohort = cohortContexts.filter((context) => context.accepted);
const sum = (contexts, key) => contexts.reduce((total, context) => total + context[key], 0);
const contract = activation.acceptanceContract;
const resumptionSemanticPass =
  validResumption.length === contract.resumptionValidContextsRequired &&
  sum(validResumption, "moves") === contract.resumptionMovesRequired &&
  sum(validResumption, "critiques") === contract.resumptionCritiquesRequired &&
  sum(validResumption, "quoteExactSourceMatches") === contract.resumptionExactSourceQuotesRequired &&
  sum(validResumption, "overallCommentarySides") === contract.resumptionOverallCommentarySidesRequired &&
  sum(validResumption, "aiExtensionSides") === contract.resumptionAIExtensionSidesRequired &&
  validResumption.every((context) =>
    context.minimumCritiqueCharacters >= contract.minimumCritiqueCharacters &&
    context.newArguments >= 4 &&
    context.introducedItems >= 2 &&
    context.modelAuthoredScores === 0 &&
    context.lockedScoresUnchanged === true
  );
const cohortSemanticPass =
  resumptionSemanticPass &&
  validCohort.length === contract.cohortValidDebatesRequired &&
  sum(validCohort, "moves") === contract.cohortMovesRequired &&
  sum(validCohort, "critiques") === contract.cohortCritiquesRequired &&
  sum(validCohort, "quoteExactSourceMatches") === contract.cohortExactSourceQuotesRequired &&
  sum(validCohort, "overallCommentarySides") === contract.cohortOverallCommentarySidesRequired &&
  sum(validCohort, "aiExtensionSides") === contract.cohortAIExtensionSidesRequired;
const timingPass =
  execution.results.every((result) => result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false) &&
  execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = cohortSemanticPass && timingPass;
const wallElapsedMinutes = Number((execution.wallElapsedMs / 60000).toFixed(2));
const maximumElapsedMinutes = validResumption.length ? Math.max(...validResumption.map((context) => context.elapsedMinutes)) : null;
const meanElapsedMinutes = validResumption.length
  ? Number((validResumption.reduce((total, context) => total + context.elapsedMinutes, 0) / validResumption.length).toFixed(2))
  : null;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "production-checkpoint-v2.2-publication-resumed-model-gate-passed"
    : cohortSemanticPass
      ? "production-checkpoint-v2.2-publication-resumption-failed-timing"
      : "production-checkpoint-v2.2-publication-resumption-failed-validation",
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  debate50,
  resumptionContexts,
  cohortContexts,
  gate: {
    resumptionSemanticPass,
    cohortSemanticPass,
    timingPass,
    resumptionValidContexts: validResumption.length,
    requiredResumptionValidContexts: contract.resumptionValidContextsRequired,
    cohortValidDebates: validCohort.length,
    requiredCohortValidDebates: contract.cohortValidDebatesRequired,
    cohortMoves: sum(validCohort, "moves"),
    requiredCohortMoves: contract.cohortMovesRequired,
    cohortCritiques: sum(validCohort, "critiques"),
    requiredCohortCritiques: contract.cohortCritiquesRequired,
    minimumCritiqueCharacters: validCohort.length ? Math.min(...validCohort.map((context) => context.minimumCritiqueCharacters)) : null,
    cohortExactSourceQuotes: sum(validCohort, "quoteExactSourceMatches"),
    requiredCohortExactSourceQuotes: contract.cohortExactSourceQuotesRequired,
    cohortOverallCommentarySides: sum(validCohort, "overallCommentarySides"),
    requiredCohortOverallCommentarySides: contract.cohortOverallCommentarySidesRequired,
    cohortAIExtensionSides: sum(validCohort, "aiExtensionSides"),
    requiredCohortAIExtensionSides: contract.cohortAIExtensionSidesRequired,
    cohortNoveltyItems: sum(validCohort, "noveltyItems"),
    cohortIntroducedItems: sum(validCohort, "introducedItems"),
    cohortNewArguments: sum(validCohort, "newArguments"),
    wallElapsedMinutes,
    maximumElapsedMinutes,
    meanElapsedMinutes,
    absoluteGateTimeoutMinutes: activation.executionPolicy.absoluteGateTimeoutMs / 60000,
    retries: 0,
    correctionContexts: 0,
    timeoutExtensions: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  evidenceBoundary: activation.isolation,
  totals: {
    originalPublicationContexts: 1,
    repairContexts: 1,
    resumptionContexts: execution.contextsAttempted,
    cohortDebates: 10,
    retries: 0,
    correctionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    deterministicCompilation: passed,
    failureDiagnosis: !passed,
    repairPacketPreparation: false,
    retry: false,
    correctionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-run-deterministic-production-checkpoint-v2.2-publication-compilation"
    : "diagnose-production-checkpoint-v2.2-publication-resumption-failure-only"
};
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  validResumptionContexts: validResumption.length,
  validCohortDebates: validCohort.length,
  cohortMoves: analysis.gate.cohortMoves,
  cohortCritiques: analysis.gate.cohortCritiques,
  minimumCritiqueCharacters: analysis.gate.minimumCritiqueCharacters,
  cohortExactSourceQuotes: analysis.gate.cohortExactSourceQuotes,
  cohortOverallCommentarySides: analysis.gate.cohortOverallCommentarySides,
  cohortAIExtensionSides: analysis.gate.cohortAIExtensionSides,
  timings: { wallElapsedMinutes, maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass },
  retries: 0,
  correctionContexts: 0,
  modelAuthoredScores: 0,
  productionMutationAuthorized: false,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
