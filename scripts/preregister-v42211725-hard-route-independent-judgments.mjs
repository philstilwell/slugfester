#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const RETIRED_SUCCESS = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery/model-execution.json";
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) for (const file of [MANIFEST, EXECUTION, ANALYSIS]) assertV4(!(await exists(file)), `${file} already exists`);

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
const retiredSuccess = JSON.parse(await readFile(RETIRED_SUCCESS, "utf8"));
assertV4(preparation.status === "ten-hard-route-independent-judgment-contexts-prepared" && preparation.contexts.length === 10, "ten-context preparation unavailable");
assertV4(preparation.totals.maximumCopiedInputBytes <= 115000 && preparation.isolation.twoIndependentPassesPerDebate && preparation.isolation.byteIdenticalLockedInventoryPerPair, "independent judgment boundary changed");
assertV4(retiredSuccess.status === "six-independent-judgment-contexts-passed" && retiredSuccess.validContexts === 6 && retiredSuccess.retries === 0, "retired operational evidence unavailable");
for (const debateNumber of ["51", "63", "90", "153", "165"]) {
  const pair = preparation.contexts.filter((context) => context.debateNumber === debateNumber);
  assertV4(pair.length === 2 && pair.map((context) => context.reviewerPass).sort().join("") === "AB", `${debateNumber}: A/B pair unavailable`);
  assertV4(pair[0].lockedInventoryCanonicalSha256 === pair[1].lockedInventoryCanonicalSha256, `${debateNumber}: canonical locked-inventory mismatch`);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.25.md",
  PREPARATION,
  preparation.sources.inventoryAnalysis,
  preparation.sources.sourcePreparation,
  RETIRED_SUCCESS,
  ...Object.values(preparation.inputs),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/validate-v42211725-hard-route-independent-judgment.mjs",
  "scripts/preregister-v42211725-hard-route-independent-judgments.mjs",
  "scripts/run-v42211725-hard-route-independent-judgments.mjs",
  "scripts/analyze-v42211725-hard-route-independent-judgments.mjs",
  "scripts/test-v42211725-hard-route-independent-judgment-gate.mjs",
  ...preparation.contexts.flatMap((context) => [context.lockedInventory, context.sourcePacket, context.originalEvents, context.fullLedger, context.judgmentPacket, context.schema]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [...preparation.contexts.flatMap((context) => [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]), EXECUTION, ANALYSIS];
const rampPhases = [
  { phase: 1, contextIndexes: [0], expansionRequiresAllValid: true },
  { phase: 2, contextIndexes: [1, 2], expansionRequiresAllValid: true },
  { phase: 3, contextIndexes: [3, 4, 5, 6, 7, 8, 9], expansionRequiresAllValid: false },
];
const retiredAggregateMinutes = retiredSuccess.totalElapsedMs / 60000;
const manifest = {
  schemaVersion: "4.2.21.17.25-hard-route-independent-judgment-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-ten-hard-route-independent-judgment-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedWallMinutesAtMaximumConcurrency: [30, 50],
    expectedAggregateModelMinutes: [55, 90],
    absoluteGateTimeoutMinutes: 120,
    basis: { retiredContexts: 6, retiredAggregateModelMinutes: Number(retiredAggregateMinutes.toFixed(2)), retiredMinimumContextMinutes: Number((Math.min(...retiredSuccess.results.map((result) => result.elapsedMs)) / 60000).toFixed(2)), retiredMaximumContextMinutes: Number((Math.max(...retiredSuccess.results.map((result) => result.elapsedMs)) / 60000).toFixed(2)) },
  },
  modelInputs: preparation.inputs,
  preparation: PREPARATION,
  contexts: preparation.contexts,
  isolation: { freshTemporaryWorkingDirectoryPerContext: true, freshTemporaryCodexHomePerContext: true, oneDebateAndOnePassPerContext: true, passAAndPassBShareOnlySourceAndByteIdenticalLockedInventory: true, otherPassOutputUnavailable: true, otherDebateOutputsUnavailable: true, candidateSelectionUnavailable: true, legacyAssessmentsScoresWinnersAndPublicationProseUnavailable: true },
  deterministicCompilation: preparation.deterministicDerivations,
  executionPolicy: { contexts: 10, attemptsPerContext: 1, retriesMaximum: 0, maximumConcurrency: 2, rampPhases, continueIndependentContextsAfterSteadyPhaseFailure: true, stopBeforeExpansionOnRampFailure: true, timeoutMsPerContext: 900000, copiedInputBytesMaximum: 115000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptance: { validContextsRequired: 10, sameLockedInventoryPerPair: true, unchangedV4220ValidatorPassesRequired: 10, semanticRepairs: 0, scores: 0 },
  authorization: { modelContexts: true, deterministicValidation: true, deterministicCompilation: true, deterministicAnalysis: true, retry: false, semanticCorrection: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  artifacts: { execution: EXECUTION, analysis: ANALYSIS, judgments: preparation.contexts.map((context) => context.judgmentOutput), rawOutputs: preparation.contexts.map((context) => context.rawOutput), validations: preparation.contexts.map((context) => context.validationOutput), provenance: preparation.contexts.map((context) => context.provenanceOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
};
if (shouldWrite) await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifestStatus: manifest.status, contexts: manifest.contexts.map((context) => `${context.debateNumber}-${context.reviewerPass}`), rampPhases, attemptsMaximum: 10, retriesMaximum: 0, expectedWallMinutes: manifest.costEstimate.expectedWallMinutesAtMaximumConcurrency, expectedAggregateModelMinutes: manifest.costEstimate.expectedAggregateModelMinutes, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
