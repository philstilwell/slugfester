#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17/independent-judgment-three";
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${ROOT}/preparation-manifest.json`;
const manifestPath = `${ROOT}/execution-manifest.json`;
const executionPath = `${ROOT}/model-execution.json`;
const analysisPath = `${ROOT}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.status === "retired-partition-three-independent-judgments-prepared" && preparation.authorization.executionManifest && preparation.contexts.length === 6, "independent judgment preparation unavailable");
assertV4(preparation.totals.maximumCopiedInputBytes <= 115000 && preparation.isolation.twoIndependentPassesPerDebate && preparation.isolation.byteIdenticalLockedInventoryPerPair, "independent judgment boundary changed");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.md",
  preparationPath,
  ...Object.values(preparation.inputs),
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
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/validate-v422117-independent-judgment.mjs",
  "scripts/preregister-v4221171-independent-judgments.mjs",
  "scripts/run-v4221171-independent-judgments.mjs",
  "scripts/analyze-v4221171-independent-judgments.mjs",
  ...preparation.contexts.flatMap((context) => [context.lockedInventory, context.sourcePacket, context.originalEvents, context.fullLedger, context.judgmentPacket, context.schema])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputs = [...preparation.contexts.flatMap((context) => [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]), executionPath, analysisPath];
const manifest = {
  schemaVersion: "4.2.21.17.1-independent-judgment-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-six-independent-judgment-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.reasoningEffort },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedSequentialWallMinutes: [20, 45], absoluteTimeoutMinutes: 90 },
  modelInputs: preparation.inputs,
  preparation: preparationPath,
  contexts: preparation.contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, oneDebateAndOnePassPerContext: true, passAAndPassBShareOnlyLockedInventory: true, otherPassOutputUnavailable: true, otherDebateOutputsUnavailable: true, candidateSelectionUnavailable: true, legacyAssessmentsScoresWinnersAndProseUnavailable: true },
  deterministicCompilation: preparation.deterministicDerivations,
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 900000, copiedInputBytesMaximum: 115000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptance: { validContextsRequired: 6, sameLockedInventoryPerPair: true, unchangedV4220ValidatorPassesRequired: 6, semanticRepairs: 0, scores: 0 },
  authorization: { modelContexts: true, deterministicValidation: true, deterministicCompilation: true, analysis: true, retry: false, semanticCorrection: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false },
  artifacts: { execution: executionPath, analysis: analysisPath, judgments: preparation.contexts.map((context) => context.judgmentOutput), rawOutputs: preparation.contexts.map((context) => context.rawOutput), validations: preparation.contexts.map((context) => context.validationOutput), provenance: preparation.contexts.map((context) => context.provenanceOutput) },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: manifest.contexts.map((context) => `${context.debateNumber}-${context.reviewerPass}`), attempts: 6, retries: 0, expectedSequentialWallMinutes: manifest.costEstimate.expectedSequentialWallMinutes, maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
