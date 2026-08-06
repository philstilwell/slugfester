#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422110_ROOT } from "./lib/v422110-structural-partition-primary.mjs";
import { V42219_ROOT } from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${V42219_ROOT}/preparation-manifest.json`;
const structuralDesignPath = `${V422110_ROOT}/design-manifest.json`;
const executionPath = `${V42219_ROOT}/discovery-execution-manifest.json`;
const resultPath = `${V42219_ROOT}/discovery-model-execution.json`;
const analysisPath = `${V42219_ROOT}/discovery-analysis.json`;
if (shouldWrite) for (const file of [executionPath, resultPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const [preparation, structuralDesign] = await Promise.all([preparationPath, structuralDesignPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
assertV4(preparation.status === "three-partition-contexts-prepared-structural-primary-design-required" && preparation.totals.discoveryContexts === 12, "v4.2.21.9 partition preparation unavailable");
assertV4(structuralDesign.status === "structural-partition-primary-design-frozen-discovery-manifest-authorized" && structuralDesign.authorization.discoveryExecutionManifest, "v4.2.21.10 discovery manifest authorization unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.11.md",
  preparationPath,
  structuralDesignPath,
  preparation.inputs.discoveryManual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/validate-v42219-discovery.mjs",
  "scripts/preregister-v422111-partition-discovery.mjs",
  "scripts/run-v422111-partition-discovery.mjs",
  "scripts/analyze-v422111-partition-discovery.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.plan, context.fullLedger, context.originalEvents, ...context.chunks.flatMap((chunk) => [chunk.chunkLedgerPath, chunk.schemaPath])])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const discoveryContexts = preparation.contexts.flatMap((context) => context.chunks.map((chunk) => ({ debateNumber: context.debateNumber, debateId: context.debateId, packet: context.packet, plan: context.plan, fullLedger: context.fullLedger, originalEvents: context.originalEvents, chunkId: chunk.chunkId, coreStartEvent: chunk.coreStartEvent, coreEndEvent: chunk.coreEndEvent, contextStartEvent: chunk.contextStartEvent, contextEndEvent: chunk.contextEndEvent, chunkLedgerPath: chunk.chunkLedgerPath, chunkLedgerSha256: chunk.chunkLedgerSha256, schemaPath: chunk.schemaPath, schemaSha256: chunk.schemaSha256, copiedInputBytes: chunk.copiedInputBytes, rawOutput: chunk.rawOutput })));
const bundlePaths = preparation.contexts.flatMap((context) => [`${V42219_ROOT}/candidate-bundles/debate-${context.debateNumber}.json`, `${V42219_ROOT}/candidate-context/debate-${context.debateNumber}.jsonl`]);
const futureOutputs = [...discoveryContexts.map((context) => context.rawOutput), ...bundlePaths, resultPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.21.11-partition-discovery-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-twelve-score-blind-discovery-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedSequentialWallMinutes: [20, 40], absoluteTimeoutMinutes: 120 },
  modelInputs: { manual: preparation.inputs.discoveryManual },
  preparation: preparationPath,
  contexts: discoveryContexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneChunkPerContext: true, otherChunksUnavailable: true, otherDiscoveryOutputsUnavailable: true, legacyUnavailable: true, priorJudgmentsUnavailable: true, ratingsScoresWinnersUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: discoveryContexts.length, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  compilationPolicy: { allContextsMustValidate: true, silentSemanticDeduplication: false, repositoryDerivedMoveKindOnly: true, qualifiedCandidateIds: true, qualifiedLocalTargets: true, sparseContextFlankEvents: 12, sparseSourceRowsMayDeduplicate: true, candidateMinimumPerDebate: 8, candidateMinimumPerSide: 4, scoresDerived: false },
  authorization: { discoveryModelContexts: true, deterministicValidation: true, deterministicCandidateCompilation: true, analysis: true, retry: false, semanticCorrection: false, primaryPacketPreparation: false, primaryModelExecution: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: resultPath, analysis: analysisPath, candidateBundles: bundlePaths.filter((file) => file.includes("candidate-bundles")), sparseContexts: bundlePaths.filter((file) => file.includes("candidate-context")), rawOutputs: discoveryContexts.map((context) => context.rawOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(executionPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: manifest.contexts.length, debates: preparation.contexts.map((context) => context.debateNumber), attempts: manifest.contexts.length, retries: 0, expectedSequentialWallMinutes: manifest.costEstimate.expectedSequentialWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
