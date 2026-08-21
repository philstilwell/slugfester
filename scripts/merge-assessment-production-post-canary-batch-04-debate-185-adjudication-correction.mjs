#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch04DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-04-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/failure-recovery/debate-185-correction";
const activation = JSON.parse(await readFile(`${root}/execution-activation.json`));
const execution = JSON.parse(await readFile(`${root}/model-execution.json`));
const context = activation.contexts[0];
const [outputBytes, packetBytes, invalidBytes] = await Promise.all([
  readFile(context.output), readFile(context.packet), readFile(activation.failedOutput.preservedCopy)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(execution.status ===
  "one-batch-04-debate-185-full-packet-adjudication-correction-context-passed" &&
  execution.validContexts === 1 && execution.retries === 0 &&
  sha256(invalidBytes) === activation.failedOutput.sha256,
  "Debate 185 correction did not pass or invalid output changed");
const output = JSON.parse(outputBytes);
const validation = validatePostCanaryBatch04DisputeAdjudicationOutput(output, JSON.parse(packetBytes));
assertV4(validation.status === "passed" && validation.disputedMoves === 18 &&
  validation.candidateSelections === 60 && output.burdenAdjustmentDecisions.length === 2 &&
  output.burdenAdjustmentDecisions.map((item) => item.side).join(",") === "pro,con",
  "Debate 185 correction validation failed");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-debate-185-adjudication-correction-analysis",
  status: "passed-batch-04-debate-185-full-packet-adjudication-correction",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 4,
  stagingOnly: true, debateNumber: "185",
  failedOutput: { preservedPath: activation.failedOutput.preservedCopy,
    sha256: activation.failedOutput.sha256, reused: false },
  correction: { contexts: 1, attempts: 1, validContexts: 1, retries: 0,
    timeoutExtensions: 0, disputedMoves: 18, candidateSelections: 60,
    burdenAdjustmentDecisions: 2, correctedOutputSha256: sha256(outputBytes), validation },
  protectedBoundary: { originalPacketPreserved: true, originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true, scoresDerived: 0, paidServices: 0 },
  authorization: { completeCohortReplay: true, finalLedgerAssembly: false,
    modelExecution: false, scoreDerivation: false, paidServices: false },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "replay-complete-ten-debate-batch-04-adjudication-cohort"
};
await writeFile(activation.artifacts.mergedOutput, outputBytes);
await writeFile(activation.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: 1,
  disputedMoves: 18, candidateSelections: 60, burdenAdjustmentDecisions: 2,
  failedOutputReused: false, retries: 0, scoresDerived: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
