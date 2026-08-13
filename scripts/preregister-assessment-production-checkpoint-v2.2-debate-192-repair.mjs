#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT } from "./lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/execution-activation.json`;
const preparation = JSON.parse(await readFile(path.resolve(preparationPath), "utf8"));
assertV4(
  preparation.status === "four-isolated-seven-field-debate-192-publication-repair-packets-prepared-and-frozen" &&
    preparation.contexts.length === 4 &&
    preparation.totals.writableFields === 7 &&
    preparation.policy.attemptsPerContext === 1 &&
    preparation.policy.retriesMaximum === 0 &&
    preparation.totals.modelAuthoredScores === 0,
  "Debate 192 repair preparation mismatch"
);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const sourceFiles = [
  preparationPath,
  ...Object.values(preparation.inputs),
  ...preparation.contexts.flatMap((context) => [context.packet, context.schema]),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-resumption.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-debate-192-repair.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-debate-192-repair.mjs",
  "scripts/run-assessment-production-checkpoint-v2.2-debate-192-repair.mjs",
  "scripts/analyze-assessment-production-checkpoint-v2.2-debate-192-repair.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-debate-192-repair.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const execution = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/model-execution.json`;
const analysis = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/analysis.json`;
const futureOutputPathsExcludedFromSourceHashes = [
  ...preparation.contexts.flatMap((context) => [context.repairOutput, context.validation, context.provenance]),
  preparation.artifacts.mergedOutput,
  preparation.artifacts.completeValidation,
  preparation.artifacts.mergeAudit,
  execution,
  analysis
];
for (const file of futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!sourceHashes[file], `future output was included in source hashes: ${file}`);
  if (shouldWrite) assertV4(!(await exists(file)), `future output exists: ${file}`);
}
const codexPath = "/Applications/ChatGPT.app/Contents/Resources/codex";
const codexCliVersion = execFileSync(codexPath, ["--version"], { encoding: "utf8" }).trim();
const activation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-192-publication-repair-execution-activation",
  protocolId: preparation.protocolId,
  status: "frozen-four-isolated-seven-field-debate-192-publication-repair-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  model: preparation.model,
  modelInputs: {
    productionWorkflow: preparation.inputs.productionWorkflow,
    readinessWorkflow: preparation.inputs.readinessWorkflow,
    outputContract: preparation.inputs.outputContract,
    manual: preparation.inputs.manual
  },
  contexts: preparation.contexts,
  executionPolicy: {
    ...preparation.policy,
    removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"]
  },
  isolation: {
    oneRepairPacketPerContext: true,
    maximumWritableFieldsPerContext: 2,
    onlyDiagnosedCritiquesWritable: true,
    acceptedFieldsUnavailableAsOutputFields: true,
    scoresUnavailableAsOutputFields: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    participantJudgmentWasScoreBlind: true,
    retries: 0,
    furtherCorrectionContexts: 0
  },
  executionEnvironment: { codexPath, codexCliVersion, authentication: "ChatGPT subscription", APIKeysRemoved: true, isolatedTemporaryCodexHomes: true, isolatedTemporaryWorkingDirectories: true },
  costEstimate: { authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, expectedWallMinutes: [4, 16], maximumWallMinutes: 32 },
  authorization: {
    repairModelContexts: true,
    deterministicRepairValidation: true,
    deterministicMergeAndCompleteDebateValidationIfAllRepairsPass: true,
    retry: false,
    furtherCorrectionModelExecution: false,
    eightContextResumption: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: { execution, analysis, ...preparation.artifacts },
  futureOutputPathsExcludedFromSourceHashes,
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(activationPath), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 4, writableFields: 7, maximumParallelContexts: 2, attemptsPerContext: 1, retriesMaximum: 0, model: activation.model, codexCliVersion, expectedWallMinutes: activation.costEstimate.expectedWallMinutes, meteredApiCostUsdMaximum: 0, productionMutation: false }, null, 2));
