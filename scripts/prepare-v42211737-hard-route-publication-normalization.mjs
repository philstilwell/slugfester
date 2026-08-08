#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211736_ROOT } from "./lib/v42211736-hard-route-publication-integrity.mjs";
import { V42211737_PROTOCOL_ID, V42211737_ROOT, normalizeAndValidateV42211737PublicationOutput } from "./lib/v42211737-hard-route-publication-normalization.mjs";

const preparationPath = `${V42211737_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis] = await Promise.all([
  readFile(path.resolve(`${V42211736_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211736_ROOT}/model-execution.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211736_ROOT}/analysis.json`), "utf8").then(JSON.parse)
]);
const failed = oldExecution.results[0];
assertV4(oldExecution.status === "hard-route-publication-gate-complete-with-failure" && oldExecution.contextsAttempted === 1 && failed?.debateNumber === "51" && failed.validationMessage?.includes("con: quote outside 3–18 words"), "v17.36 failure is not the preregistered quote-boundary defect");
assertV4(oldAnalysis.authorization.deterministicCompilation === false, "v17.36 failure analysis mismatch");
const failedContext = oldPreparation.contexts[0];
const [failedOutput, failedPacket] = await Promise.all([failedContext.output, failedContext.packet].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
const normalizationReplay = normalizeAndValidateV42211737PublicationOutput(failedOutput, failedPacket);
assertV4(normalizationReplay.validation.status === "passed" && normalizationReplay.transformations.length === 1 && normalizationReplay.transformations[0].field === "representativeQuotes.con.text", "deterministic quote normalization does not isolate the v17.36 defect");

const workflow = "docs/assessment-workflow-v4.2.21.17.37.md";
const oldWorkflowBytes = (await stat(path.resolve(oldPreparation.inputs.workflow))).size;
const newWorkflowBytes = (await stat(path.resolve(workflow))).size;
const contexts = oldPreparation.contexts.map((oldContext) => ({ ...oldContext, rawOutput: `${V42211737_ROOT}/raw-outputs/debate-${oldContext.debateNumber}.json`, output: `${V42211737_ROOT}/outputs/debate-${oldContext.debateNumber}.json`, compiled: `${V42211737_ROOT}/compiled/debate-${oldContext.debateNumber}.json`, copiedInputBytes: oldContext.copiedInputBytes - oldWorkflowBytes + newWorkflowBytes }));
const preparation = {
  schemaVersion: "4.2.21.17.37-hard-route-publication-normalization-preparation",
  protocolId: V42211737_PROTOCOL_ID,
  status: "prepared-five-isolated-hard-route-publication-normalization-contexts",
  preparedAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  model: oldPreparation.model,
  inheritedAuthoringProtocolId: oldPreparation.inheritedAuthoringProtocolId,
  inputs: { ...oldPreparation.inputs, workflow },
  contexts,
  isolation: oldPreparation.isolation,
  policy: oldPreparation.policy,
  normalization: { representativeQuoteGenerationTargetWords: [6, 14], repositoryQuoteAcceptanceWords: [3, 18], overlongExactQuoteOperation: "retain-final-18-contiguous-words", rawAndNormalizedOutputsSeparated: true, nonExactQuotesFail: true, underlengthQuotesFail: true, allOtherFieldsImmutable: true, v17_36ReplayPassed: true, v17_36ReplayTransformations: normalizationReplay.transformations.length, priorGateTreatedAsRetry: false },
  totals: { debates: contexts.length, moves: oldPreparation.totals.moves, sections: oldPreparation.totals.sections, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, productionMutation: false, all195Debates: false }
};
await mkdir(path.resolve(V42211737_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.length, moves: preparation.totals.moves, quoteGenerationTargetWords: preparation.normalization.representativeQuoteGenerationTargetWords, quoteAcceptanceWords: preparation.normalization.repositoryQuoteAcceptanceWords, v17_36ReplayPassed: true, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));

