#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const adj = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const root = `${adj}/failure-recovery/debate-27-correction`;
const prepPath = `${root}/execution-preparation-manifest.json`;
const diagnosisPath = `${root}/diagnosis.json`;
const resumptionActivationPath = `${adj}/failure-recovery/resumption/execution-activation.json`;
const invalidPath = `${adj}/outputs/debate-27.json`;
const preservedInvalidPath = `${root}/original-invalid-output.json`;
const packetPath = `${adj}/packets/debate-27.json`;
const outputPath = `${root}/corrected-output.json`;
const toolFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-debate-27-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-debate-27-adjudication-correction-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-debate-27-adjudication-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-debate-27-adjudication-correction.mjs",
  "scripts/merge-assessment-production-post-canary-batch-03-debate-27-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-debate-27-adjudication-correction-gate.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [diagnosisBytes, activationBytes, invalidBytes, packetBytes] = await Promise.all([
  readFile(diagnosisPath), readFile(resumptionActivationPath), readFile(invalidPath), readFile(packetPath)
]);
const diagnosis = JSON.parse(diagnosisBytes);
const activation = JSON.parse(activationBytes);
const sourceContext = activation.contexts.find((item) => item.debateNumber === "27");
assertV4(
  diagnosis.status === "frozen-diagnosed-batch-03-debate-27-missing-burden-adjustment-decisions" &&
    diagnosis.preservedFailure.invalidOutputSha256 === sha256(invalidBytes) &&
    diagnosis.preservedFailure.invalidOutputReusable === false &&
    diagnosis.boundedCorrection.contexts === 1 &&
    sourceContext.packetSha256 === sha256(packetBytes) &&
    sourceContext.candidateSelections === 70,
  "Debate 27 correction boundary changed"
);
const context = {
  ...structuredClone(sourceContext), contextIndex: 0, originalContextIndex: 8,
  correctionId: "fresh-full-packet-correction-1", output: outputPath
};
const sourceHashes = {
  [diagnosisPath]: sha256(diagnosisBytes),
  [resumptionActivationPath]: sha256(activationBytes),
  [invalidPath]: sha256(invalidBytes), [packetPath]: sha256(packetBytes)
};
for (const file of [...Object.values(activation.modelInputs), ...toolFiles])
  sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-adjudication-correction-preparation",
  protocolId: activation.protocolId,
  status: "frozen-one-batch-03-debate-27-full-packet-adjudication-correction-context-prepared",
  frozenAt, productionCanary: false, batchNumber: 3, stagingOnly: true,
  diagnosis: diagnosisPath,
  failedOutput: { path: invalidPath, sha256: sha256(invalidBytes), reusable: false,
    preservedCopy: preservedInvalidPath },
  model: structuredClone(activation.model),
  modelInputs: structuredClone(activation.modelInputs),
  contexts: [context],
  executionPolicy: {
    contexts: 1, schedulerRamp: [1], maximumParallelContexts: 1,
    rampPhases: [{ phase: 1, contextIndexes: [0], expansionRequiresAllValid: true }],
    attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    timeoutMsPerContext: activation.executionPolicy.timeoutMsPerContext,
    maximumMinutesPerContext: activation.executionPolicy.maximumMinutesPerContext,
    maximumMeanMinutes: activation.executionPolicy.maximumMeanMinutes,
    removedEnvironmentVariables: activation.executionPolicy.removedEnvironmentVariables,
    terminateIsolatedProcessGroupAtFrozenTimeout: true
  },
  requiredOutputShape: {
    moveDecisions: 19, burdenAdjustmentDecisions: 2,
    burdenAdjustmentSideOrder: ["pro", "con"], candidateSelections: 70
  },
  artifacts: {
    preparation: prepPath, activation: `${root}/execution-activation.json`,
    execution: `${root}/model-execution.json`, correctedOutput: outputPath,
    mergedOutput: invalidPath, analysis: `${root}/analysis.json`
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    `${root}/execution-activation.json`, `${root}/model-execution.json`, outputPath,
    preservedInvalidPath, `${root}/analysis.json`
  ],
  authorization: {
    executionActivation: true, adjudicationModelContexts: false,
    deterministicMergeAndCohortReplay: false, paidServices: false,
    scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "activate-one-fresh-debate-27-full-packet-adjudication-correction-context"
};
if (shouldWrite) {
  assertV4(!(await exists(prepPath)), "Debate 27 correction preparation already exists");
  await writeFile(preservedInvalidPath, invalidBytes);
  await writeFile(prepPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  contexts: 1, candidateSelections: 70, moveDecisions: 19,
  burdenAdjustmentDecisions: 2, attemptsPerContext: 1, retriesMaximum: 0,
  failedOutputReusable: false, directIncrementalCostUsdMaximum: 0 }, null, 2));
