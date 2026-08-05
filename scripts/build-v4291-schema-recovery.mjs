#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4291_PROTOCOL_ID, V4291_ROOT, makeV4291ProposalSchema } from "./lib/v4291-schema-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.9/long-context-partition";
const [priorPreparation, priorExecution, priorAnalysis] = await Promise.all([
  readFile(`${priorRoot}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/analysis.json`, "utf8").then(JSON.parse)
]);
assertV4(priorExecution.status === "two-chunk-proposals-complete-with-failure" && priorExecution.results.every((result) => result.commandExitCode === 1 && result.rawOutputWritten === false && !result.timedOut), "v4.2.9 pre-inference failure record unavailable");
assertV4(priorAnalysis.status === "partition-source-discovery-failed" && priorAnalysis.candidates.total === 0, "v4.2.9 failed analysis unavailable");

const schemaPath = `${V4291_ROOT}/schema.json`;
if (shouldWrite) {
  await mkdir(V4291_ROOT, { recursive: true });
  await writeFile(schemaPath, `${JSON.stringify(makeV4291ProposalSchema(), null, 2)}\n`);
}
const chunks = priorPreparation.chunks.map((chunk) => ({ ...chunk, rawOutput: `${V4291_ROOT}/proposals/${chunk.chunkId}.json` }));
const preparation = {
  schemaVersion: "4.2.9.1-long-context-schema-recovery-preparation",
  protocolId: V4291_PROTOCOL_ID,
  proposalProtocolId: priorPreparation.protocolId,
  status: shouldWrite ? "prepared-two-schema-recovery-chunks" : "preview",
  developmentOnly: true,
  AIOnly: true,
  debateNumber: "99",
  diagnosis: {
    subscriptionProbePassed: true,
    structuredOutputProbeRejectedBeforeInference: true,
    exactApiError: "Invalid schema for response_format 'codex_output_schema': In context=('properties', 'schemaVersion'), schema must have a 'type' key.",
    originalRequestsRejectedBeforeInference: 2,
    originalModelOutputs: 0,
    schemaRepair: "Add explicit string or boolean types to every constant-valued property.",
    technicalProbeModelContexts: 1,
    technicalProbeMeteredApiCostUsd: 0
  },
  model: priorPreparation.model,
  source: { ...priorPreparation.source, priorPreparation: `${priorRoot}/preparation-manifest.json`, priorExecution: `${priorRoot}/model-execution.json`, priorAnalysis: `${priorRoot}/analysis.json`, priorRejectedSchema: `${priorRoot}/schema.json` },
  modelInputs: { ...priorPreparation.modelInputs, schema: schemaPath },
  chunks,
  coverage: priorPreparation.coverage,
  policy: { scoreBlindSourceDiscoveryOnly: true, contexts: 2, schemaRecoveryRequestsPerContext: 1, semanticRetries: 0, timeoutMs: 900000, scoresAuthorized: false },
  authorization: { executionManifest: false, twoSchemaRecoveryContexts: false, integratedPrimaryPreparation: false, scoreDerivation: false, productionMutation: false }
};
if (shouldWrite) await writeFile(`${V4291_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, exactDiagnosis: preparation.diagnosis.exactApiError, chunks: 2, priorRequestsRejectedBeforeInference: 2, semanticRetries: 0, completeCoverage: true, meteredApiCostUsdMaximum: 0 }, null, 2));
