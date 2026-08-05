#!/usr/bin/env node
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV426SourceLedger } from "./lib/v426-retired-completion.mjs";
import { V428_DEBATE_NUMBERS, V428_PROTOCOL_ID, V428_ROOT } from "./lib/v428-retired-continuation.mjs";

const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.6/conservative-excerpt-retired-completion";
const [priorPreparation, priorExecution, priorFailure, correctionAnalysis] = await Promise.all([
  readFile(`${priorRoot}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/failure-analysis.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.7/bounded-primary-correction/analysis.json", "utf8").then(JSON.parse)
]);

assertV4(priorPreparation.status === "prepared-five-untouched-retired-contexts", "v4.2.6 preparation unavailable");
assertV4(priorExecution.status === "five-context-execution-failed-fast" && priorExecution.contextsAttempted === 1, "v4.2.6 failed-first execution unavailable");
assertV4(priorFailure.disposition.boundedScoreBlindAICorrectionDevelopmentAuthorized, "v4.2.6 failure disposition unavailable");
assertV4(correctionAnalysis.status === "bounded-correction-passed-retired-completion-continuation-authorized" && correctionAnalysis.authorization.remainingRetiredCompletionPreparation, "v4.2.7 continuation authorization unavailable");

const originalContexts = new Map(priorPreparation.contexts.map((context) => [context.debateNumber, context]));
const contexts = [];
for (const debateNumber of V428_DEBATE_NUMBERS) {
  const original = originalContexts.get(debateNumber);
  assertV4(original, `missing retired context ${debateNumber}`);
  await access(original.rawOutput).then(
    () => { throw new Error(`retired context ${debateNumber} is no longer untouched`); },
    () => true
  );
  const [packet, eventsBytes, ledgerBytes] = await Promise.all([
    readFile(original.packet, "utf8").then(JSON.parse),
    readFile(original.originalEvents),
    readFile(original.sourceLedger)
  ]);
  validateV426SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
  contexts.push({
    ...original,
    rawOutput: `${V428_ROOT}/primary-outputs/debate-${debateNumber}.json`,
    compiledOutput: `${V428_ROOT}/primary-compiled/debate-${debateNumber}.json`
  });
}

const inputs = {
  rubricBase: "docs/reassessment-rubric-v4.0.md",
  rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md",
  rubricBounded: "docs/reassessment-rubric-v4.1.md",
  manual: `${V428_ROOT}/manual.md`,
  schema: `${priorRoot}/schema.json`
};
const sharedBytes = (await Promise.all(Object.values(inputs).map((file) => stat(file).then((entry) => entry.size)))).reduce((sum, bytes) => sum + bytes, 0);
for (const context of contexts) {
  context.compactCopiedInputBytes = sharedBytes + (await stat(context.packet)).size + (await stat(context.sourceLedger)).size;
}

const preparation = {
  schemaVersion: "4.2.8-retired-continuation-preparation",
  protocolId: V428_PROTOCOL_ID,
  status: shouldWrite ? "prepared-four-untouched-retired-primaries" : "preview",
  developmentOnly: true,
  AIOnly: true,
  model: priorPreparation.model,
  inheritedValidatedContexts: {
    anchor: priorPreparation.anchor,
    corrected: {
      debateNumber: "106",
      originalExecution: `${priorRoot}/model-execution.json`,
      originalRaw: `${priorRoot}/primary-outputs/debate-106.json`,
      correctionAnalysis: "docs/calibration/v4.2.7/bounded-primary-correction/analysis.json",
      correctedOutput: "docs/calibration/v4.2.7/bounded-primary-correction/corrected-output.json",
      correctedCompiledOutput: "docs/calibration/v4.2.7/bounded-primary-correction/corrected-compiled.json"
    }
  },
  contexts,
  inputs,
  executionPolicy: {
    sourceAndPreflightFailClosed: true,
    contextsIndependent: true,
    continueAfterLocalContextFailure: true,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMs: 1800000,
    sequentialExecution: true,
    automaticNormalizationAuthorized: false,
    automaticCorrectionAuthorized: false,
    scoreDerivationAuthorized: false
  },
  correctionPolicy: {
    preparationOnlyAfterDeterministicFailureExtraction: true,
    scoreBlind: true,
    oneCorrectionMaximumPerInvalidRaw: true,
    smallestViolationJustifiedFieldSet: true,
    secondCorrectionAuthorized: false
  },
  totals: {
    inheritedValidatedContexts: 2,
    untouchedContexts: contexts.length,
    modelContextsExecutedThisStage: 0,
    meanCompactCopiedInputBytes: Math.round(contexts.reduce((sum, context) => sum + context.compactCopiedInputBytes, 0) / contexts.length),
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: {
    executionManifest: false,
    fourPrimaryModelContexts: false,
    deterministicFailureAnalysis: false,
    correctionPreparation: false,
    freshGatePreparation: false,
    scoreDerivation: false,
    productionMutation: false
  }
};

if (shouldWrite) {
  await mkdir(V428_ROOT, { recursive: true });
  await writeFile(`${V428_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: preparation.status,
  inheritedDebates: ["131", "106"],
  untouchedDebates: contexts.map((context) => context.debateNumber),
  meanCompactCopiedInputKilobytes: Math.round(preparation.totals.meanCompactCopiedInputBytes / 1000),
  attemptsPerContext: 1,
  retries: 0,
  continueAfterLocalContextFailure: true,
  meteredApiCostUsdMaximum: 0
}, null, 2));
