#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";
import { V42211733_ROOT, validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";
import { V42211734_PROTOCOL_ID, V42211734_ROOT } from "./lib/v42211734-hard-route-publication-prompt.mjs";

const preparationPath = `${V42211734_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis] = await Promise.all([
  readFile(path.resolve(`${V42211733_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211733_ROOT}/model-execution.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211733_ROOT}/analysis.json`), "utf8").then(JSON.parse)
]);
const failed = oldExecution.results[0];
assertV4(oldExecution.status === "hard-route-publication-gate-complete-with-failure" && oldExecution.contextsAttempted === 1 && oldExecution.validContexts === 0 && failed?.status === "output-validation-failed" && failed.validationMessage?.includes("publication summary outside 8–35 words"), "v17.33 failure is not the preregistered summary-contract defect");
assertV4(oldAnalysis.status === "hard-route-publication-gate-failed-validation" && oldAnalysis.authorization.deterministicCompilation === false, "v17.33 failure analysis mismatch");
const failedContext = oldPreparation.contexts[0];
const failedOutput = JSON.parse(await readFile(path.resolve(failedContext.output), "utf8"));
const failedPacket = JSON.parse(await readFile(path.resolve(failedContext.packet), "utf8"));
const originalSummary = failedOutput.summary;
failedOutput.summary = "Lennox and Atkins dispute whether theism or naturalism better explains reality.";
const counterfactualValidation = validateV42211732PublicationOutput(failedOutput, failedPacket);
assertV4(counterfactualValidation.status === "passed" && counterfactualValidation.moves === failedContext.moves, "v17.33 output has a semantic defect beyond summary length");
failedOutput.summary = originalSummary;

const oldWorkflowBytes = (await stat(path.resolve(oldPreparation.inputs.workflow))).size;
const workflow = "docs/assessment-workflow-v4.2.21.17.34.md";
const newWorkflowBytes = (await stat(path.resolve(workflow))).size;
const contexts = [];
for (const oldContext of oldPreparation.contexts) {
  validateOpenAIStructuredOutputSubset(JSON.parse(await readFile(path.resolve(oldContext.schema), "utf8")));
  contexts.push({ ...oldContext, output: `${V42211734_ROOT}/outputs/debate-${oldContext.debateNumber}.json`, compiled: `${V42211734_ROOT}/compiled/debate-${oldContext.debateNumber}.json`, copiedInputBytes: oldContext.copiedInputBytes - oldWorkflowBytes + newWorkflowBytes });
}
const preparation = {
  schemaVersion: "4.2.21.17.34-hard-route-publication-prompt-preparation",
  protocolId: V42211734_PROTOCOL_ID,
  status: "prepared-five-isolated-hard-route-publication-prompt-contexts",
  preparedAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  model: oldPreparation.model,
  inheritedAuthoringProtocolId: oldPreparation.inheritedAuthoringProtocolId,
  inputs: { ...oldPreparation.inputs, workflow },
  contexts,
  isolation: oldPreparation.isolation,
  policy: oldPreparation.policy,
  repair: { defect: "model-facing instructions omitted the validator's 8–35-word summary bound", modelSummaryTargetWords: [18, 28], repositorySummaryAcceptanceWords: [8, 35], counterfactualOnlySummaryReplacementPassed: true, counterfactualValidatedMoves: counterfactualValidation.moves, structuredOutputRepairRetained: true, repositoryUniquenessValidationRetained: true, priorGateTreatedAsRetry: false },
  totals: { debates: contexts.length, moves: oldPreparation.totals.moves, sections: oldPreparation.totals.sections, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, productionMutation: false, all195Debates: false }
};
await mkdir(path.resolve(V42211734_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.length, moves: preparation.totals.moves, promptSummaryTargetWords: preparation.repair.modelSummaryTargetWords, counterfactualOnlySummaryReplacementPassed: true, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));

