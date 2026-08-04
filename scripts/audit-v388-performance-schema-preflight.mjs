#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, readJson, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const preflightRoot = `${V388_PERFORMANCE_ROOT}/schema-preflight`;
const [manifest, execution, output, packet] = await Promise.all([
  readJson(`${preflightRoot}/execution-manifest.json`),
  readJson(`${preflightRoot}/model-execution.json`),
  readJson(`${preflightRoot}/output.json`),
  readJson(`${preflightRoot}/synthetic-packet.json`)
]);
assertV388(execution.status === "endpoint-accepted-output-validation-failed" && execution.result.commandExitCode === 0 && execution.result.outputWritten === true && execution.result.packetAwareValidationPassed === false, "preflight record does not isolate endpoint acceptance from content validation");
assertV388(execution.exactSharedSchemaSha256 === manifest.input.schemaSha256, "preflight did not use exact shared schema");
assertV388(output.moveJudgments.length === 1 && output.moveJudgments[0].lockedBurdenContact === null && output.moveJudgments[0].ratings.relevanceBurden.value === 75, "unexpected synthetic output defect");
let validationError = null;
try { validateV388PerformanceOutput(output, packet, "A"); }
catch (error) { validationError = error.message; }
assertV388(/relevance\/burden outside locked tier band/.test(validationError ?? ""), "synthetic output failed for an unexpected reason");
const audit = {
  schemaVersion: "3.8.8-performance-schema-endpoint-preflight-audit",
  status: "endpoint-schema-accepted-content-prompt-defect",
  exactSharedSchemaSha256: manifest.input.schemaSha256,
  endpoint: { commandExitCode: 0, schemaAccepted: true, structuredOutputWritten: true, outputConformedToEndpointSchema: true },
  deterministicValidation: { passed: false, defectCount: 1, defect: "Synthetic prompt requested 75 for every rating although null burden contact permits relevance/burden only from 0 through 54.", observedValue: 75, permittedRange: [0, 54], allOtherKnownValidationDefects: 0 },
  scope: { syntheticMoves: 1, debateJudgments: 0, participantScores: 0, participantProse: 0 },
  financials: { attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { automaticRetry: false, correctedSyntheticPreflightRequiresSeparateLock: true, sixDebateContextsRemainBlocked: true, scoreDerivation: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, preflightRoot), { recursive: true });
  await writeFile(path.resolve(root, `${preflightRoot}/audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "audited", exactSharedSchemaAcceptedByEndpoint: true, deterministicValidationDefects: 1, defect: "synthetic-null-contact-band", debateJudgments: 0, correctedSyntheticPreflightRequiresSeparateLock: true }, null, 2));
