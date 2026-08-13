#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CHECKPOINT_V22_RESUMPTION_2_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication-resumption-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write"), frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/preparation-manifest.json`, activationPath = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/execution-activation.json`;
const preparation = JSON.parse(await readFile(path.resolve(preparationPath), "utf8"));
assertV4(preparation.status === "eight-untouched-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen" && preparation.contexts.length === 8 && preparation.totals.moves === 153 && preparation.acceptedDebates.length === 2 && preparation.policy.attemptsPerContext === 1 && preparation.policy.retriesMaximum === 0 && preparation.totals.modelAuthoredScores === 0, "resumption-2 preparation mismatch");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const sourceFiles = [
  preparationPath, ...Object.values(preparation.inputs), ...preparation.acceptedDebates.flatMap((debate) => [debate.output, debate.validation, debate.packet]),
  ...preparation.contexts.flatMap((context) => [context.packet, context.schema, context.sourcePacket, context.transcript, context.events, context.localManifest]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs", "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs", "scripts/lib/assessment-production-checkpoint-v2.2-publication-resumption-2.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-resumption-2.mjs", "scripts/preregister-assessment-production-checkpoint-v2.2-publication-resumption-2.mjs",
  "scripts/run-assessment-production-checkpoint-v2.2-publication-resumption-2.mjs", "scripts/analyze-assessment-production-checkpoint-v2.2-publication-resumption-2.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-resumption-2.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex"), sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const execution = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/model-execution.json`, analysis = `${CHECKPOINT_V22_RESUMPTION_2_ROOT}/analysis.json`;
const futureOutputPathsExcludedFromSourceHashes = [...preparation.contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance]), execution, analysis];
for (const file of futureOutputPathsExcludedFromSourceHashes) { assertV4(!sourceHashes[file], `future output included in source hashes: ${file}`); if (shouldWrite) assertV4(!(await exists(file)), `future output exists: ${file}`); }
const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex", codexCliVersion = execFileSync(codexPath, ["--version"], { encoding: "utf8" }).trim();
const activation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-resumption-2-execution-activation", protocolId: preparation.protocolId,
  status: "frozen-eight-untouched-production-checkpoint-v2.2-publication-contexts-authorized", frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), productionCanary: true, stagingOnly: true,
  model: preparation.model,
  modelInputs: { productionWorkflow: preparation.inputs.productionWorkflow, readinessWorkflow: preparation.inputs.readinessWorkflow, outputContract: preparation.inputs.outputContract, manual: preparation.inputs.manual, referenceCatalog: preparation.inputs.referenceCatalog },
  acceptedDebates: preparation.acceptedDebates, contexts: preparation.contexts, executionPolicy: preparation.policy, acceptanceContract: preparation.acceptanceContract,
  isolation: { oneDebatePerContext: true, freshContextPerDebate: true, participantJudgmentWasScoreBlind: true, participantJudgmentClosed: true, ownDebateScoresImmutable: true, legacyAssessmentsUnavailable: true, otherDebatesUnavailable: true, rankingsAndWinnerComparisonsUnavailable: true, retries: 0, correctionContexts: 0 },
  executionEnvironment: { codexPath, codexCliVersion, authentication: "ChatGPT subscription", APIKeysRemoved: true, isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [18, 42], maximumWallMinutes: 120 },
  authorization: { modelContexts: true, publicationModelExecution: true, deterministicValidation: true, deterministicAnalysis: true, retry: false, timeoutExtension: false, correctionModelExecution: false, deterministicCompilation: false, publicationFinalization: false, renderingVerification: false, productionMutation: false, remainingProductionBatches: false },
  artifacts: { execution, analysis }, futureOutputPathsExcludedFromSourceHashes, sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(activationPath), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 8, debates: activation.contexts.map(({ debateNumber }) => debateNumber), maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, model: activation.model, codexCliVersion, expectedWallMinutes: activation.costEstimate.expectedWallMinutes, meteredApiCostUsdMaximum: 0, productionMutation: false }, null, 2));
