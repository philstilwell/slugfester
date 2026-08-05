#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V428_PROTOCOL_ID, V428_ROOT } from "./lib/v428-retired-continuation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const manifestPath = `${V428_ROOT}/execution-manifest.json`;
const executionPath = `${V428_ROOT}/model-execution.json`;
const analysisPath = `${V428_ROOT}/primary-analysis.json`;
if (shouldWrite) {
  for (const future of [manifestPath, executionPath, analysisPath]) {
    await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
  }
}

const preparation = JSON.parse(await readFile(`${V428_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-four-untouched-retired-primaries" && preparation.contexts.length === 4, "v4.2.8 preparation invalid");

const inheritedFiles = [
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/analysis.json",
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/model-execution.json",
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/packet.json",
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/primary-output.json",
  "docs/calibration/v4.2.5/conservative-excerpt-smoke/primary-compiled.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/preparation-manifest.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/execution-manifest.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/model-execution.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/failure-analysis.json",
  "docs/calibration/v4.2.6/conservative-excerpt-retired-completion/primary-outputs/debate-106.json",
  "docs/calibration/v4.2.7/bounded-primary-correction/analysis.json",
  "docs/calibration/v4.2.7/bounded-primary-correction/execution-manifest.json",
  "docs/calibration/v4.2.7/bounded-primary-correction/model-execution.json",
  "docs/calibration/v4.2.7/bounded-primary-correction/corrected-output.json",
  "docs/calibration/v4.2.7/bounded-primary-correction/corrected-compiled.json"
];
const sourceFiles = [
  "docs/assessment-workflow-v4.2.8.md",
  ...Object.values(preparation.inputs),
  `${V428_ROOT}/preparation-manifest.json`,
  ...inheritedFiles,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v417-fresh-validation.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v419-schema-bounded-source.mjs",
  "scripts/lib/v42-compact-transport.mjs",
  "scripts/lib/v421-compact-fresh.mjs",
  "scripts/lib/v422-chronology-first.mjs",
  "scripts/lib/v423-chronology-fresh.mjs",
  "scripts/lib/v424-screened-chronology-fresh.mjs",
  "scripts/lib/v425-conservative-excerpt.mjs",
  "scripts/lib/v426-retired-completion.mjs",
  "scripts/lib/v427-bounded-correction.mjs",
  "scripts/lib/v428-retired-continuation.mjs",
  "scripts/build-v428-retired-continuation.mjs",
  "scripts/test-v428-retired-continuation.mjs",
  "scripts/preregister-v428-retired-continuation.mjs",
  "scripts/run-v428-retired-continuation.mjs",
  "scripts/analyze-v428-retired-continuation.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.sourceLedger, context.originalTranscript, context.originalEvents, context.originalManifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
}

const futureOutputPaths = [
  ...preparation.contexts.flatMap((context) => [context.rawOutput, context.compiledOutput]),
  executionPath,
  analysisPath
];
const manifest = {
  schemaVersion: "4.2.8-retired-continuation-execution-manifest",
  protocolId: V428_PROTOCOL_ID,
  status: "frozen-four-independent-retired-primaries-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  developmentOnly: true,
  AIOnly: true,
  model: preparation.model,
  modelInputs: preparation.inputs,
  inheritedValidatedContexts: preparation.inheritedValidatedContexts,
  contexts: preparation.contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneDebatePerContext: true,
    otherDebatesUnavailable: true,
    earlierResultsUnavailable: true,
    failureInformationUnavailable: true,
    duplicateTranscriptUnavailable: true,
    originalEventsUnavailable: true,
    compactLedgerAvailable: true,
    legacyUnavailable: true,
    scoresUnavailable: true
  },
  executionPolicy: {
    contexts: 4,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    preflightFailClosed: true,
    continueAfterLocalContextFailure: true,
    timeoutMs: 1800000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    recoverableStreamEventsNormalMaximum: 2,
    recoverableStreamEventsHardMaximum: 8
  },
  authorization: {
    fourPrimaryModelContexts: true,
    deterministicValidation: true,
    timeCompilationForValidOutputs: true,
    deterministicFailureExtraction: true,
    correctionModelExecution: false,
    scoreDerivation: false,
    legacyComparison: false,
    productionMutation: false
  },
  stopRules: {
    sourceHashMismatchBlocksBeforeExecution: true,
    preexistingOutputBlocksBeforeExecution: true,
    localContextFailureDoesNotSuppressLaterContexts: true,
    retryAuthorized: false,
    normalizationAuthorized: false,
    correctionAuthorized: false,
    truncationAuthorized: false
  },
  artifacts: {
    execution: executionPath,
    primaryAnalysis: analysisPath,
    rawOutputs: preparation.contexts.map((context) => context.rawOutput),
    compiledOutputs: preparation.contexts.map((context) => context.compiledOutput)
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes
};

if (shouldWrite) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  contexts: manifest.executionPolicy.contexts,
  debateNumbers: manifest.contexts.map((context) => context.debateNumber),
  attemptsPerContext: 1,
  retries: 0,
  timeoutMinutes: 30,
  continueAfterLocalContextFailure: true,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
