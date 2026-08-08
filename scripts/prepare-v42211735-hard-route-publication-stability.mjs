#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";
import { validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";
import { V42211734_ROOT } from "./lib/v42211734-hard-route-publication-prompt.mjs";
import { V42211735_PROTOCOL_ID, V42211735_ROOT } from "./lib/v42211735-hard-route-publication-stability.mjs";

const preparationPath = `${V42211735_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis] = await Promise.all([
  readFile(path.resolve(`${V42211734_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211734_ROOT}/model-execution.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211734_ROOT}/analysis.json`), "utf8").then(JSON.parse)
]);
assertV4(oldExecution.status === "hard-route-publication-gate-complete-with-failure" && oldExecution.contextsAttempted === 5 && oldExecution.validContexts === 4 && oldExecution.results.filter((result) => result.status === "output-validation-failed").length === 1, "v17.34 is not the preregistered 4/5 publication gate");
const failed = oldExecution.results.find((result) => result.status === "output-validation-failed");
assertV4(failed.debateNumber === "63" && failed.validationMessage?.includes("critique outside 105–130 words"), "v17.34 failure is not the critique-length defect");
assertV4(oldAnalysis.gate.validContexts === 4 && oldAnalysis.gate.maximumElapsedMinutes === 9.23 && oldExecution.aggregateModelElapsedMs / 60000 < 28, "v17.34 timing evidence mismatch");
const failedContext = oldPreparation.contexts.find((context) => context.debateNumber === "63");
const failedOutput = JSON.parse(await readFile(path.resolve(failedContext.output), "utf8"));
const failedPacket = JSON.parse(await readFile(path.resolve(failedContext.packet), "utf8"));
const replacement = "Strongest feature: This move presents its central claim with enough clarity to expose the intended argumentative role and the evidence on which it relies. Principal limitation: Its stated support does not fully resolve the strongest competing explanation, so the inference remains materially contestable despite its initial plausibility. Live burden: The speaker still must connect this move directly to the governing motion, answer the most relevant counterpressure, and justify the inferential step without shifting standards or assuming the disputed conclusion. Locked score: The assessment therefore preserves the adjudicated ledger judgment, crediting the move's useful contribution while retaining the limitations identified through responsiveness, burden relevance, completeness, and charity under the preregistered standards for argumentative construction, engagement, precision, and support.";
assertV4(wordCount(replacement) >= 105 && wordCount(replacement) <= 130 && replacement.length >= 880 && replacement.length <= 1020, "diagnostic replacement is outside the preregistered envelope");
for (const prose of Object.values(failedOutput.moveProse)) if (wordCount(prose.critique) < 105 || wordCount(prose.critique) > 130) prose.critique = replacement;
const counterfactualValidation = validateV42211732PublicationOutput(failedOutput, failedPacket);
assertV4(counterfactualValidation.status === "passed" && counterfactualValidation.moves === failedContext.moves, "v17.34 output has a semantic defect beyond critique length");

const workflow = "docs/assessment-workflow-v4.2.21.17.35.md";
const oldWorkflowBytes = (await stat(path.resolve(oldPreparation.inputs.workflow))).size;
const newWorkflowBytes = (await stat(path.resolve(workflow))).size;
const contexts = [];
for (const oldContext of oldPreparation.contexts) {
  const schema = JSON.parse(await readFile(path.resolve(oldContext.schema), "utf8"));
  for (const moveSchema of Object.values(schema.properties.moveProse.properties)) {
    moveSchema.properties.critique.minLength = 880;
    moveSchema.properties.critique.maxLength = 1020;
  }
  validateOpenAIStructuredOutputSubset(schema);
  const schemaPath = `${V42211735_ROOT}/schemas/debate-${oldContext.debateNumber}.schema.json`;
  const schemaDocument = `${JSON.stringify(schema, null, 2)}\n`;
  await mkdir(path.resolve(path.dirname(schemaPath)), { recursive: true });
  await writeFile(path.resolve(schemaPath), schemaDocument);
  const oldSchemaBytes = (await stat(path.resolve(oldContext.schema))).size;
  const schemaBytes = Buffer.byteLength(schemaDocument);
  contexts.push({ ...oldContext, schema: schemaPath, schemaBytes, output: `${V42211735_ROOT}/outputs/debate-${oldContext.debateNumber}.json`, compiled: `${V42211735_ROOT}/compiled/debate-${oldContext.debateNumber}.json`, copiedInputBytes: oldContext.copiedInputBytes - oldWorkflowBytes + newWorkflowBytes - oldSchemaBytes + schemaBytes, critiqueCharacterEnvelope: [880, 1020] });
}
const preparation = {
  schemaVersion: "4.2.21.17.35-hard-route-publication-stability-preparation",
  protocolId: V42211735_PROTOCOL_ID,
  status: "prepared-five-isolated-hard-route-publication-stability-contexts",
  preparedAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  model: oldPreparation.model,
  inheritedAuthoringProtocolId: oldPreparation.inheritedAuthoringProtocolId,
  inputs: { ...oldPreparation.inputs, workflow },
  contexts,
  isolation: oldPreparation.isolation,
  policy: { ...oldPreparation.policy, timeoutMsPerDebate: 720000, maximumMinutesPerDebate: 10, maximumMeanMinutes: 6.5 },
  repair: { defect: "one debate produced four-sentence critiques systematically below the repository word-count floor", modelCritiqueTargetWords: [112, 122], repositoryCritiqueAcceptanceWords: [105, 130], structuredCritiqueCharacters: [880, 1020], counterfactualOnlyCritiqueReplacementPassed: true, counterfactualValidatedMoves: counterfactualValidation.moves, priorObservedWallMinutes: 18.71, priorObservedAggregateModelMinutes: 27.35, priorObservedAllContextMeanMinutes: 5.47, maximumMinutesPerDebate: 10, maximumMeanMinutes: 6.5, priorGateTreatedAsRetry: false },
  totals: { debates: contexts.length, moves: oldPreparation.totals.moves, sections: oldPreparation.totals.sections, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, productionMutation: false, all195Debates: false }
};
await mkdir(path.resolve(V42211735_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.length, moves: preparation.totals.moves, structuredCritiqueCharacters: preparation.repair.structuredCritiqueCharacters, timingLimitsMinutes: { perDebate: preparation.policy.maximumMinutesPerDebate, mean: preparation.policy.maximumMeanMinutes }, counterfactualOnlyCritiqueReplacementPassed: true, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));
