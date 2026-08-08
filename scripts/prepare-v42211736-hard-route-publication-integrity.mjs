#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";
import { V42211735_ROOT } from "./lib/v42211735-hard-route-publication-stability.mjs";
import { V42211736_PROTOCOL_ID, V42211736_ROOT } from "./lib/v42211736-hard-route-publication-integrity.mjs";

const preparationPath = `${V42211736_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis, diagnosis] = await Promise.all([
  readFile(path.resolve(`${V42211735_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211735_ROOT}/model-execution.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211735_ROOT}/analysis.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${V42211735_ROOT}/integrity-diagnosis.json`), "utf8").then(JSON.parse)
]);
assertV4(oldExecution.status === "five-hard-route-publication-contexts-passed" && oldAnalysis.status === "hard-route-publication-model-gate-passed", "v17.35 stability evidence unavailable");
assertV4(diagnosis.status === "failed-publication-prose-integrity" && diagnosis.deterministicReplay.findingCount === 3 && diagnosis.requiredRepair.removeCritiqueMaxLength && diagnosis.requiredRepair.rerunFreshFiveDebateGate, "v17.35 integrity diagnosis mismatch");

const workflow = "docs/assessment-workflow-v4.2.21.17.36.md";
const oldWorkflowBytes = (await stat(path.resolve(oldPreparation.inputs.workflow))).size;
const newWorkflowBytes = (await stat(path.resolve(workflow))).size;
const contexts = [];
for (const oldContext of oldPreparation.contexts) {
  const schema = JSON.parse(await readFile(path.resolve(oldContext.schema), "utf8"));
  for (const moveSchema of Object.values(schema.properties.moveProse.properties)) {
    moveSchema.properties.critique.minLength = 880;
    delete moveSchema.properties.critique.maxLength;
  }
  validateOpenAIStructuredOutputSubset(schema);
  const schemaPath = `${V42211736_ROOT}/schemas/debate-${oldContext.debateNumber}.schema.json`;
  const schemaDocument = `${JSON.stringify(schema, null, 2)}\n`;
  await mkdir(path.resolve(path.dirname(schemaPath)), { recursive: true });
  await writeFile(path.resolve(schemaPath), schemaDocument);
  const oldSchemaBytes = (await stat(path.resolve(oldContext.schema))).size;
  const schemaBytes = Buffer.byteLength(schemaDocument);
  contexts.push({ ...oldContext, schema: schemaPath, schemaBytes, output: `${V42211736_ROOT}/outputs/debate-${oldContext.debateNumber}.json`, compiled: `${V42211736_ROOT}/compiled/debate-${oldContext.debateNumber}.json`, copiedInputBytes: oldContext.copiedInputBytes - oldWorkflowBytes + newWorkflowBytes - oldSchemaBytes + schemaBytes, critiqueCharacterMinimum: 880 });
  delete contexts.at(-1).critiqueCharacterEnvelope;
}
const preparation = {
  schemaVersion: "4.2.21.17.36-hard-route-publication-integrity-preparation",
  protocolId: V42211736_PROTOCOL_ID,
  status: "prepared-five-isolated-hard-route-publication-integrity-contexts",
  preparedAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  model: oldPreparation.model,
  inheritedAuthoringProtocolId: oldPreparation.inheritedAuthoringProtocolId,
  inputs: { ...oldPreparation.inputs, workflow },
  contexts,
  isolation: oldPreparation.isolation,
  policy: oldPreparation.policy,
  repair: { defect: "structured maximum length caused exact-bound truncation accepted as a fourth sentence fragment", priorFindingCount: diagnosis.deterministicReplay.findingCount, priorAffectedDebates: diagnosis.deterministicReplay.affectedDebates, critiqueCharacterMinimum: 880, critiqueCharacterMaximum: null, terminalPunctuationRequired: true, unexpectedCJKAndHangulRejected: true, repositoryCritiqueAcceptanceWords: [105, 130], priorGateTreatedAsRetry: false },
  totals: { debates: contexts.length, moves: oldPreparation.totals.moves, sections: oldPreparation.totals.sections, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, correctionModelExecution: false, deterministicCompilation: false, renderingVerification: false, productionMutation: false, all195Debates: false }
};
await mkdir(path.resolve(V42211736_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.length, moves: preparation.totals.moves, critiqueCharacterMinimum: 880, critiqueCharacterMaximum: null, terminalPunctuationRequired: true, unexpectedCJKAndHangulRejected: true, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));

