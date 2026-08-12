#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { CHECKPOINT_V22_PUBLICATION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [activation, execution, preparation] = await Promise.all(
  ["execution-activation.json", "model-execution.json", "preparation-manifest.json"].map(
    (file) => readFile(path.resolve(`${ROOT}/${file}`), "utf8").then(JSON.parse)
  )
);

assertV4(
  activation.status ===
      "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized" &&
    execution.schemaVersion ===
      "1.0-production-checkpoint-v2.2-publication-model-execution" &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.correctionContexts === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scorePassesExecutedThisStage === 0 &&
    activation.authorization?.deterministicAnalysis === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.correctionModelExecution === false &&
    activation.authorization?.productionMutation === false,
  "publication analysis is unavailable or crossed its boundary"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `publication analysis source hash mismatch: ${file}`
  );
}

const contexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find(
    (item) => item.contextIndex === context.contextIndex
  );
  if (!result) {
    contexts.push({
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      status: "unattempted",
      accepted: false,
      validationReplayed: false,
      moves: null
    });
    continue;
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
    if (result.gateAcceptancePassed) {
      assertV4(replay?.status === "passed", `${context.debateNumber}: accepted output replay failed`);
    }
  }
  if (result.validationWritten) {
    assertV4(
      sha256(await readFile(path.resolve(context.validation))) === result.validationSha256,
      `${context.debateNumber}: validation hash mismatch`
    );
  }
  if (result.provenanceWritten) {
    assertV4(
      sha256(await readFile(path.resolve(context.provenance))) === result.provenanceSha256,
      `${context.debateNumber}: provenance hash mismatch`
    );
  }
  contexts.push({
    contextIndex: context.contextIndex,
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
  });
}

const valid = contexts.filter((context) => context.accepted);
const sum = (key) => valid.reduce((total, context) => total + context[key], 0);
const wallElapsedMinutes = Number((execution.wallElapsedMs / 60000).toFixed(2));
const maximumElapsedMinutes = valid.length
  ? Math.max(...valid.map((context) => context.elapsedMinutes))
  : null;
const meanElapsedMinutes = valid.length
  ? Number(
      (valid.reduce((total, context) => total + context.elapsedMinutes, 0) /
        valid.length).toFixed(2)
    )
  : null;
const semanticPass =
  valid.length === activation.acceptanceContract.validContextsRequired &&
  sum("moves") === activation.acceptanceContract.movesAuthoredRequired &&
  sum("critiques") === activation.acceptanceContract.critiquesRequired &&
  sum("quoteExactSourceMatches") ===
    activation.acceptanceContract.exactSourceQuotesRequired &&
  sum("overallCommentarySides") ===
    activation.acceptanceContract.overallCommentarySidesRequired &&
  sum("aiExtensionSides") === activation.acceptanceContract.aiExtensionSidesRequired &&
  valid.every(
    (context) =>
      context.minimumCritiqueCharacters >= 880 &&
      context.newArguments >= 4 &&
      context.introducedItems >= 2 &&
      context.modelAuthoredScores === 0 &&
      context.lockedScoresUnchanged === true
  );
const timingPass =
  execution.results.every(
    (result) =>
      result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext &&
      result.timedOut === false
  ) &&
  execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = semanticPass && timingPass;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "production-checkpoint-v2.2-publication-model-gate-passed"
    : semanticPass
      ? "production-checkpoint-v2.2-publication-gate-failed-timing"
      : "production-checkpoint-v2.2-publication-gate-failed-validation",
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  contexts,
  gate: {
    semanticPass,
    timingPass,
    validContexts: valid.length,
    requiredValidContexts: activation.acceptanceContract.validContextsRequired,
    movesAuthored: sum("moves"),
    requiredMoves: activation.acceptanceContract.movesAuthoredRequired,
    critiques: sum("critiques"),
    requiredCritiques: activation.acceptanceContract.critiquesRequired,
    minimumCritiqueCharacters: valid.length
      ? Math.min(...valid.map((context) => context.minimumCritiqueCharacters))
      : null,
    exactSourceQuotes: sum("quoteExactSourceMatches"),
    requiredExactSourceQuotes:
      activation.acceptanceContract.exactSourceQuotesRequired,
    overallCommentarySides: sum("overallCommentarySides"),
    requiredOverallCommentarySides:
      activation.acceptanceContract.overallCommentarySidesRequired,
    aiExtensionSides: sum("aiExtensionSides"),
    requiredAiExtensionSides: activation.acceptanceContract.aiExtensionSidesRequired,
    noveltyItems: sum("noveltyItems"),
    introducedItems: sum("introducedItems"),
    newArguments: sum("newArguments"),
    wallElapsedMinutes,
    maximumElapsedMinutes,
    meanElapsedMinutes,
    absoluteGateTimeoutMinutes:
      activation.executionPolicy.absoluteGateTimeoutMs / 60000,
    retries: 0,
    correctionContexts: 0,
    timeoutExtensions: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  evidenceBoundary: {
    oneDebatePerContext: true,
    participantJudgmentWasScoreBlind: true,
    participantJudgmentClosed: true,
    ownDebateScoresImmutable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    everyLockedMoveAuthoredOnce: semanticPass,
    exactSourceQuoteMatching: semanticPass,
    localReferenceCatalogOnly: semanticPass,
    emptyReferenceTagsAllowed: true,
    completeAIExtensionNoveltyMapping: semanticPass,
    prohibitedLanguageHits: 0,
    unexpectedScriptHits: 0
  },
  totals: {
    modelContexts: execution.contextsAttempted,
    retries: 0,
    correctionContexts: 0,
    timeoutExtensions: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    deterministicCompilation: passed,
    repairPacketPreparation: false,
    correctionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-run-deterministic-production-checkpoint-v2.2-publication-compilation"
    : "diagnose-production-checkpoint-v2.2-publication-failure-only"
};

if (shouldWrite) {
  await writeFile(
    path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      validContexts: valid.length,
      movesAuthored: analysis.gate.movesAuthored,
      critiques: analysis.gate.critiques,
      minimumCritiqueCharacters: analysis.gate.minimumCritiqueCharacters,
      exactSourceQuotes: analysis.gate.exactSourceQuotes,
      overallCommentarySides: analysis.gate.overallCommentarySides,
      aiExtensionSides: analysis.gate.aiExtensionSides,
      noveltyItems: analysis.gate.noveltyItems,
      introducedItems: analysis.gate.introducedItems,
      timings: {
        byDebate: Object.fromEntries(
          contexts.map((context) => [context.debateNumber, context.elapsedMinutes ?? null])
        ),
        wallElapsedMinutes,
        maximumElapsedMinutes,
        meanElapsedMinutes,
        passed: timingPass
      },
      retries: 0,
      correctionContexts: 0,
      modelAuthoredScores: 0,
      productionMutationAuthorized: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
