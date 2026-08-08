#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const root = "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication";
const manifestPath = `${root}/execution-manifest.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(file)), `${file} already exists`);
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
const retiredExecution = JSON.parse(await readFile("docs/calibration/v4.2.21.17.5/dispute-only-adjudication/model-execution.json", "utf8"));
assertV4(preparation.status === "prepared-five-isolated-hard-route-dispute-only-adjudication-contexts" && preparation.authorization.executionManifest && preparation.totals.modelContextsExecuted === 0, "hard-route adjudication manifest unauthorized");
assertV4(retiredExecution.status === "three-isolated-dispute-only-adjudication-contexts-passed" && retiredExecution.validContexts === 3 && retiredExecution.retries === 0, "retired adjudication execution evidence unavailable");
assertV4(preparation.totals.maximumCopiedInputBytes <= 350000, "hard-route adjudication context exceeds preregistered transport budget");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.26.md",
  "docs/assessment-workflow-v4.2.21.17.27.md",
  "docs/assessment-workflow-v4.2.21.17.28.md",
  `${root}/preparation-manifest.json`,
  ...Object.values(preparation.inputs),
  "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/audio-verification.json",
  "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/analysis.json",
  "docs/calibration/v4.2.21.17.5/dispute-only-adjudication/model-execution.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/build-v42211728-hard-route-adjudication-packets.mjs",
  "scripts/test-v42211728-hard-route-adjudication-packets.mjs",
  "scripts/validate-v42211728-hard-route-adjudication-output.mjs",
  "scripts/preregister-v42211728-hard-route-adjudication.mjs",
  "scripts/run-v42211728-hard-route-adjudication.mjs",
  "scripts/analyze-v42211728-hard-route-adjudication.mjs",
  "scripts/test-v42211728-hard-route-adjudication-gate.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.provenance, context.disputeSource, context.lockedInventory, context.sourcePacket, context.originalEvents, ...context.audioTranscriptInputs.map((item) => item.sourcePath)]),
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const rampPhases = [
  { phase: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: 2, contextIndexes: [1, 2, 3, 4], expansionRequiresAllValid: false },
];
const manifest = {
  schemaVersion: "4.2.21.17.28-hard-route-dispute-only-adjudication-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-five-isolated-hard-route-dispute-only-adjudication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: structuredClone(preparation.model),
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [12, 22], expectedAggregateModelMinutes: [20, 35], absoluteGateTimeoutMinutes: 60, retiredThreeContextAggregateMinutes: Number((retiredExecution.totalElapsedMs / 60000).toFixed(2)) },
  modelInputs: preparation.inputs,
  contexts: preparation.contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, disputedFieldsOnly: true, lockedLocalEvidenceOnly: true, rawVerifiedAudioTranscriptAvailableOnlyWhereRequired: true, provenanceFilesUnavailable: true, passIdentitiesUnavailable: true, initialRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, calculatedScoresUnavailable: true, winnersUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: 5, attemptsPerContext: 1, retriesMaximum: 0, maximumConcurrency: 2, rampPhases, stopBeforeExpansionOnRampFailure: true, continueIndependentContextsAfterSteadyPhaseFailure: true, timeoutMsPerContext: 900000, maximumMinutesPerContext: 12, maximumMeanMinutes: 9.5, maximumCopiedInputBytes: 350000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  deterministicValidation: { exactCandidateSelectionOnly: true, dependencyPairsIndivisible: true, allDisputedFieldsDecidedOnce: true, importanceTreatedAsJudgmentField: true, nondisputedFieldsUntouched: true, candidateProvenanceRepositoryOnly: true, calculatedScores: 0 },
  authorization: { adjudicationModelContexts: true, deterministicValidation: true, deterministicAnalysis: true, retry: false, correctionModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, invalidOutputPreserved: true, laterIndependentContextsContinueDuringSteadyPhase: true, retryAuthorized: false, correctionAuthorized: false, candidateValueRepairAuthorized: false },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: preparation.contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes,
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: manifest.contexts.map((context) => context.debateNumber), contexts: 5, disputedMoves: preparation.totals.disputedMoves, candidateSelections: preparation.totals.candidateSelections, audioTranscriptInputs: preparation.totals.audioVerifiedMoves, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, rampPhases, attemptsMaximum: 5, retriesMaximum: 0, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, expectedAggregateModelMinutes: manifest.costEstimate.expectedAggregateModelMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
