#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17/independent-judgment-three";
const shouldWrite = process.argv.includes("--write");
const execution = JSON.parse(await readFile(`${ROOT}/model-execution.json`, "utf8"));
assertV4(execution.contextsAttempted === 6 && execution.validContexts === 0 && execution.retries === 0 && execution.scoresDerived === 0, "expected six-context pre-generation schema failure");
assertV4(execution.results.every((result) => result.commandExitCode === 1 && result.timedOut === false && result.judgmentWritten === false && result.elapsedMs < 5000), "failure was not uniformly pre-generation");
const diagnostic = "Invalid schema for response_format 'codex_output_schema': In context=('properties', 'burdenCompletionAdjustment', 'properties', 'pro', 'properties', 'eligibility', 'properties', 'affectedBurdenIds'), 'uniqueItems' is not permitted.";
const analysis = {
  schemaVersion: "4.2.21.17.1-independent-judgment-schema-failure-analysis",
  protocolId: execution.protocolId,
  status: "pre-generation-schema-transport-failure-successor-correction-authorized",
  calibrationOnly: true,
  AIOnly: true,
  execution: { contextsAttempted: 6, validContexts: 0, invalidContexts: 6, retries: 0, totalElapsedMs: execution.totalElapsedMs, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  diagnosis: { class: "unsupported-response-schema-keyword", unsupportedKeyword: "uniqueItems", diagnostic, modelGenerationBegan: false, judgmentOutputsProduced: 0, debateSemanticsImplicated: false, sharedSchemaDefect: true },
  correction: { removeUniqueItemsFromModelOutputSchema: true, retainRuntimeUniquenessValidation: true, changeSemanticContract: false, schemaOnlyPreflightRequiredBeforeExecution: true, successorProtocolRequired: true, retry: false, sameProtocolRerun: false },
  authorization: { schemaTransportCorrectionDesign: true, successorPreparation: false, successorExecutionManifest: false, modelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${ROOT}/schema-failure-analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify(analysis, null, 2));
