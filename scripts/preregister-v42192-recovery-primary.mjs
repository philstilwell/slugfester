#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4219_ROOT } from "./lib/v4219-primary-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO timestamp");
const manifestPath = `${V4219_ROOT}/execution-manifest.json`;
const executionPath = `${V4219_ROOT}/model-execution.json`;
const analysisPath = `${V4219_ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${V4219_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-three-recovery-direct-contexts" && preparation.contexts.length === 3 && preparation.totals.modelContextsExecuted === 0 && preparation.authorization.primaryExecutionManifest, "v4.2.19.1 preparation invalid");
assertV4(preparation.contexts.every((context) => context.route === "direct" && context.routeEvidence.durationUsedForRouting === false), "v4.2.19.2 non-direct context entered direct gate");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.19.md",
  "docs/assessment-workflow-v4.2.19.2.md",
  `${V4219_ROOT}/design-verification.json`,
  `${V4219_ROOT}/source-only-sample.json`,
  `${V4219_ROOT}/sample-screening.json`,
  `${V4219_ROOT}/sample-screening-v4.2.19.1.json`,
  `${V4219_ROOT}/preparation-manifest.json`,
  ...Object.values(preparation.inputs),
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
  "scripts/lib/v4218-fresh-direct-three.mjs",
  "scripts/lib/v42181-fresh-direct-three.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/validate-v4219-primary-output.mjs",
  "scripts/select-v4219-recovery-three.mjs",
  "scripts/screen-v4219-recovery-three.mjs",
  "scripts/screen-v42191-recovery-three.mjs",
  "scripts/build-v4219-recovery-three.mjs",
  "scripts/test-v4219-recovery-three.mjs",
  "scripts/preregister-v42192-recovery-primary.mjs",
  "scripts/run-v42192-recovery-primary.mjs",
  "scripts/analyze-v42192-recovery-primary.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.sourceLedger, context.originalTranscript, context.originalEvents, context.originalManifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.19.2-recovery-primary-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-three-recovery-primary-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  directLaneOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [18, 27], absoluteTimeoutMinutes: 45 },
  modelInputs: preparation.inputs,
  contexts: preparation.contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, hiddenControlUnavailable: true, duplicateTranscriptUnavailable: true, originalEventsUnavailable: true, compactLedgerAvailable: true, legacyUnavailable: true, priorJudgmentsUnavailable: true, scoresUnavailable: true, publicationProseUnavailable: true },
  deterministicCompilation: { exactCueValidation: true, repositoryOwnedBoundedExcerpt: true, repositoryOwnedChronology: true, replyEdgesValidatedAfterChronology: true, repositoryDerivedResponseClass: true, withinClassResponsivenessMapping: true, participantJudgmentsChanged: false },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 900000, maximumMinutesPerContext: 10, maximumMeanMinutes: 7.75, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  authorization: { primaryModelContexts: true, deterministicValidation: true, deterministicCompilation: true, analysis: true, correctionModelExecution: false, semanticNormalization: false, scoreDerivation: false, audioVerification: false, riskExtraction: false, productionMutation: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, invalidContextPreserved: true, laterIndependentContextsContinue: true, retryAuthorized: false, correctionAuthorized: false, semanticNormalizationAuthorized: false, excerptTruncationAuthorized: false },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutputs: preparation.contexts.map((context) => context.rawOutput), compiledOutputs: preparation.contexts.map((context) => context.compiledOutput) },
  futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.flatMap((context) => [context.rawOutput, context.compiledOutput]), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: preparation.contexts.map((context) => context.debateNumber), contexts: 3, attempts: 3, retries: 0, timeoutMinutesPerContext: 15, maximumMinutesPerContext: 10, maximumMeanMinutes: 7.75, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoreDerivationAuthorized: false }, null, 2));
