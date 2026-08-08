#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";
import { V42211736_ROOT } from "./lib/v42211736-hard-route-publication-integrity.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V42211736_ROOT}/execution-manifest.json`;
const executionPath = `${V42211736_ROOT}/model-execution.json`;
const analysisPath = `${V42211736_ROOT}/analysis.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(file)), `${file} already exists`);
const preparation = JSON.parse(await readFile(path.resolve(`${V42211736_ROOT}/preparation-manifest.json`), "utf8"));
assertV4(preparation.status === "prepared-five-isolated-hard-route-publication-integrity-contexts" && preparation.authorization.executionManifest && preparation.totals.modelContextsExecuted === 0 && preparation.totals.modelAuthoredScores === 0, "publication integrity execution manifest is not authorized");
assertV4(preparation.totals.maximumCopiedInputBytes <= 400000, "publication context exceeds frozen transport budget");
assertV4(preparation.repair.priorFindingCount === 3 && preparation.repair.critiqueCharacterMinimum === 880 && preparation.repair.critiqueCharacterMaximum === null && preparation.repair.terminalPunctuationRequired && preparation.repair.unexpectedCJKAndHangulRejected && !preparation.repair.priorGateTreatedAsRetry, "publication integrity repair boundary mismatch");
for (const context of preparation.contexts) validateOpenAIStructuredOutputSubset(JSON.parse(await readFile(path.resolve(context.schema), "utf8")));
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.36.md",
  "docs/assessment-workflow-v4.2.21.17.35.md",
  "docs/assessment-workflow-v4.2.21.17.34.md",
  "docs/assessment-workflow-v4.2.21.17.33.md",
  "docs/assessment-workflow-v4.2.21.17.32.md",
  `${V42211736_ROOT}/preparation-manifest.json`,
  "docs/calibration/v4.2.21.17.32/hard-route-publication-reconstruction/model-execution.json",
  "docs/calibration/v4.2.21.17.32/hard-route-publication-reconstruction/analysis.json",
  "docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair/model-execution.json",
  "docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair/analysis.json",
  "docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair/outputs/debate-51.json",
  "docs/calibration/v4.2.21.17.34/hard-route-publication-prompt-alignment/model-execution.json",
  "docs/calibration/v4.2.21.17.34/hard-route-publication-prompt-alignment/analysis.json",
  ...["51", "63", "90", "153", "165"].map((debateNumber) => `docs/calibration/v4.2.21.17.34/hard-route-publication-prompt-alignment/outputs/debate-${debateNumber}.json`),
  "docs/calibration/v4.2.21.17.35/hard-route-publication-stability/model-execution.json",
  "docs/calibration/v4.2.21.17.35/hard-route-publication-stability/analysis.json",
  "docs/calibration/v4.2.21.17.35/hard-route-publication-stability/integrity-diagnosis.json",
  ...["51", "63", "90", "153", "165"].map((debateNumber) => `docs/calibration/v4.2.21.17.35/hard-route-publication-stability/outputs/debate-${debateNumber}.json`),
  ...Object.values(preparation.inputs),
  ...preparation.contexts.flatMap((context) => [context.packet, context.schema, context.sourcePacket, context.events]),
  "src/data/references.js",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v42211732-hard-route-publication.mjs",
  "scripts/lib/v42211733-hard-route-publication-transport.mjs",
  "scripts/lib/v42211734-hard-route-publication-prompt.mjs",
  "scripts/lib/v42211735-hard-route-publication-stability.mjs",
  "scripts/lib/v42211736-hard-route-publication-integrity.mjs",
  "scripts/prepare-v42211736-hard-route-publication-integrity.mjs",
  "scripts/preregister-v42211736-hard-route-publication-integrity.mjs",
  "scripts/run-v42211736-hard-route-publication-integrity.mjs",
  "scripts/analyze-v42211736-hard-route-publication-integrity.mjs",
  "scripts/test-v42211736-hard-route-publication-integrity-gate.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const rampPhases = [{ phase: 1, contextIndexes: [0], expansionRequiresAllValid: true }, { phase: 2, contextIndexes: [1, 2, 3, 4], expansionRequiresAllValid: false }];
const manifest = {
  schemaVersion: "4.2.21.17.36-hard-route-publication-integrity-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-five-isolated-hard-route-publication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: preparation.model,
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [17, 27], expectedAggregateModelMinutes: [24, 36], absoluteGateTimeoutMinutes: 60 },
  modelInputs: { workflow: preparation.inputs.workflow, outputContract: preparation.inputs.outputContract, manual: preparation.inputs.manual, referenceCatalog: preparation.inputs.referenceCatalog },
  contexts: preparation.contexts,
  isolation: preparation.isolation,
  executionPolicy: { contexts: 5, attemptsPerContext: 1, retriesMaximum: 0, correctionContextsMaximum: 0, maximumConcurrency: 2, rampPhases, stopBeforeExpansionOnRampFailure: true, continueIndependentContextsAfterSteadyPhaseFailure: true, timeoutMsPerContext: preparation.policy.timeoutMsPerDebate, maximumMinutesPerContext: preparation.policy.maximumMinutesPerDebate, maximumMeanMinutes: preparation.policy.maximumMeanMinutes, maximumCopiedInputBytes: 400000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  deterministicValidation: { modelCritiqueTargetWords: [112, 122], repositoryCritiqueAcceptanceWords: preparation.repair.repositoryCritiqueAcceptanceWords, structuredCritiqueCharacterMinimum: preparation.repair.critiqueCharacterMinimum, structuredCritiqueCharacterMaximum: null, terminalPunctuationRequired: true, unexpectedCJKAndHangulRejected: true, modelSummaryTargetWords: [18, 28], repositorySummaryAcceptanceWords: [8, 35], openAIStructuredOutputSubsetPreflight: true, repositoryUniquenessValidationRetained: true, everyLockedMoveAuthoredExactlyOnce: true, exactQuoteSubstringRequired: true, critiqueWordAndSentenceContract: true, localReferenceCatalogOnly: true, overallCommentaryMinimums: true, aiExtensionNoveltyMapComplete: true, introducedArgumentPerSideRequired: true, exactAccordionDisplayContract: true, prohibitedLanguageAbsent: true, modelAuthoredScores: 0 },
  priorGate: { protocolId: "v4.2.21.17.35-hard-route-publication-stability", status: "model-gate-passed-rendering-integrity-failed", treatedAsRetry: false },
  authorization: { publicationModelContexts: true, deterministicValidation: true, deterministicAnalysis: true, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, readinessPromotion: false, productionMutation: false, all195Debates: false },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: preparation.contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: preparation.contexts.map((context) => context.debateNumber), contexts: 5, moves: preparation.totals.moves, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, rampPhases, attemptsMaximum: 5, retriesMaximum: 0, correctionContextsMaximum: 0, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, expectedAggregateModelMinutes: manifest.costEstimate.expectedAggregateModelMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, modelAuthoredScores: 0 }, null, 2));
