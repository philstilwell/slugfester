#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221_ROOT } from "./lib/v4221-pass-b-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V4221_ROOT}/execution-manifest.json`;
const executionPath = `${V4221_ROOT}/model-execution.json`;
const analysisPath = `${V4221_ROOT}/pass-b-analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${V4221_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-three-isolated-source-span-pass-b-contexts" && preparation.contexts.length === 3 && preparation.authorization.executionManifest && preparation.totals.modelContextsExecuted === 0, "v4.2.21 Pass B preparation invalid");

const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.md",
  `${V4221_ROOT}/design-verification.json`,
  `${V4221_ROOT}/preparation-manifest.json`,
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
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/build-v4221-pass-b-three.mjs",
  "scripts/validate-v4221-pass-b-output.mjs",
  "scripts/test-v4221-pass-b-consensus.mjs",
  "scripts/test-v4221-pass-b-three.mjs",
  "scripts/preregister-v4221-pass-b-three.mjs",
  "scripts/run-v4221-pass-b-three.mjs",
  "scripts/analyze-v4221-pass-b-three.mjs",
  ...preparation.contexts.flatMap((context) => [context.sourcePrimary, context.sourcePacket, context.passBPacket, context.sourceLedger, context.originalTranscript, context.originalEvents, context.originalManifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21-isolated-pass-b-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-three-isolated-source-span-pass-b-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: cloneModel(preparation.model),
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [18, 30], absoluteTimeoutMinutes: 45 },
  modelInputs: preparation.inputs,
  contexts: preparation.contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, completeSourceLedgerAvailable: true, lockedInventoryAvailable: true, sourcePrimaryUnavailable: true, sourcePacketUnavailable: true, primaryJudgmentsUnavailable: true, primaryRatingsUnavailable: true, primaryTotalsUnavailable: true, triggerReasonsUnavailable: true, otherDebatesUnavailable: true, scoresUnavailable: true, winnersUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 900000, maximumMinutesPerContext: 12, maximumMeanMinutes: 9.5, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  deterministicValidation: { reconstructThroughFullV4220Validator: true, lockedSourceSpansImmutable: true, modelAuthoredEvidenceText: false, repositoryOwnedEvidenceRendering: true, repositoryDerivedResponseClass: true, modelAuthoredAbsoluteResponsiveness: false, futureTargetHardFailure: true, automaticTargetRepair: false, calculatedScores: 0 },
  authorization: { passBModelContexts: true, deterministicValidation: true, deterministicReconstruction: true, analysis: true, retry: false, correctionModelExecution: false, audioExecution: false, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, invalidContextPreserved: true, laterIndependentContextsContinue: true, retryAuthorized: false, correctionAuthorized: false, sourceSpanRepairAuthorized: false, responseTargetRepairAuthorized: false },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutputs: preparation.contexts.map((context) => context.rawOutput), reconstructedOutputs: preparation.contexts.map((context) => context.reconstructedOutput) },
  futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.flatMap((context) => [context.rawOutput, context.reconstructedOutput]), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: manifest.contexts.map((context) => context.debateNumber), contexts: 3, attempts: 3, retries: 0, reasoningEffort: manifest.model.reasoningEffort, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, absoluteTimeoutMinutes: manifest.costEstimate.absoluteTimeoutMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoreDerivationAuthorized: false }, null, 2));

function cloneModel(model) {
  return structuredClone(model);
}
