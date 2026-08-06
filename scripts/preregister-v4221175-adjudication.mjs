#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const root = "docs/calibration/v4.2.21.17.5/dispute-only-adjudication";
const manifestPath = `${root}/execution-manifest.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-three-isolated-dispute-only-adjudication-contexts" && preparation.authorization.executionManifest && preparation.totals.modelContextsExecuted === 0, "adjudication execution manifest is not authorized");
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.3.md",
  "docs/assessment-workflow-v4.2.21.17.4.md",
  "docs/assessment-workflow-v4.2.21.17.5.md",
  `${root}/preparation-manifest.json`,
  ...Object.values(preparation.inputs),
  "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification/audio-verification.json",
  "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification/analysis.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/build-v4221175-adjudication-packets.mjs",
  "scripts/test-v4221175-adjudication-packets.mjs",
  "scripts/validate-v4221175-adjudication-output.mjs",
  "scripts/preregister-v4221175-adjudication.mjs",
  "scripts/run-v4221175-adjudication.mjs",
  "scripts/analyze-v4221175-adjudication.mjs",
  ...preparation.contexts.flatMap((context) => [context.packet, context.provenance, context.disputeSource, context.lockedInventory, context.sourcePacket, context.originalEvents, ...context.audioTranscriptInputs.map((item) => item.sourcePath)])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.17.5-dispute-only-adjudication-execution-manifest",
  protocolId: preparation.protocolId,
  status: "frozen-three-isolated-dispute-only-adjudication-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: structuredClone(preparation.model),
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [12, 25], absoluteTimeoutMinutes: 45 },
  modelInputs: preparation.inputs,
  contexts: preparation.contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, disputedFieldsOnly: true, lockedLocalEvidenceOnly: true, verifiedAudioTranscriptAvailableOnlyWhereRequired: true, provenanceFilesUnavailable: true, passIdentitiesUnavailable: true, initialRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, calculatedScoresUnavailable: true, winnersUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, continueIndependentContextsAfterFailure: true, timeoutMs: 900000, maximumMinutesPerContext: 12, maximumMeanMinutes: 9.5, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  deterministicValidation: { exactCandidateSelectionOnly: true, dependencyPairsIndivisible: true, allDisputedFieldsDecidedOnce: true, importanceTreatedAsJudgmentField: true, nondisputedFieldsUntouched: true, candidateProvenanceRepositoryOnly: true, calculatedScores: 0 },
  authorization: { adjudicationModelContexts: true, deterministicValidation: true, analysis: true, retry: false, correctionModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingOutputBlocks: true, invalidOutputPreserved: true, laterIndependentContextsContinue: true, retryAuthorized: false, correctionAuthorized: false, candidateValueRepairAuthorized: false },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: preparation.contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...preparation.contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", debates: manifest.contexts.map((context) => context.debateNumber), contexts: 3, disputedMoves: preparation.totals.disputedMoves, candidateSelections: preparation.totals.candidateSelections, audioTranscriptInputs: preparation.totals.audioVerifiedMoves, attempts: 3, retries: 0, expectedWallMinutes: manifest.costEstimate.expectedWallMinutes, authentication: manifest.costEstimate.authentication, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
