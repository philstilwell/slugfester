#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction/resumption-4";
const files = {
  preparation: `${ROOT}/execution-preparation-manifest.json`,
  activation: `${ROOT}/execution-activation.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  originalAnalyzer:
    "scripts/analyze-assessment-production-post-canary-batch-02-publication-resumption-4.mjs",
  correctedAnalyzer:
    "scripts/analyze-assessment-production-post-canary-batch-02-publication-resumption-4-correction-1.mjs",
  correction: `${ROOT}/analysis-harness-correction-1.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const loaded = Object.fromEntries(
  await Promise.all(
    Object.entries(files)
      .filter(([name]) => !["analysis", "correction"].includes(name))
      .map(async ([name, file]) => [name, await readFile(path.resolve(file))])
  )
);
const preparation = JSON.parse(loaded.preparation);
const activation = JSON.parse(loaded.activation);
const execution = JSON.parse(loaded.execution);
assertV4(!(await exists(files.analysis)), "the failed analyzer wrote analysis");
assertV4(!(await exists(files.correction)), `${files.correction} already exists`);
assertV4(
  execution.status ===
      "two-post-canary-batch-02-publication-resumption-4-contexts-passed" &&
    execution.contextsPlanned === 2 &&
    execution.contextsAttempted === 2 &&
    execution.validContexts === 2 &&
    execution.invalidContexts === 0 &&
    execution.attempts === 2 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.correctionContexts === 0 &&
    execution.modelAuthoredScores === 0,
  "the accepted two-context execution changed"
);
const requiredAccepted = [
  "acceptedDebate103",
  "acceptedDebate172",
  "acceptedDebate04",
  "acceptedDebate136",
  "acceptedDebate83",
  "acceptedDebate66",
  "acceptedDebate126",
  "acceptedDebate99"
];
assertV4(
  requiredAccepted.every((key) => preparation[key]?.output) &&
    requiredAccepted.slice(0, 5).every((key) => activation[key]?.output) &&
    requiredAccepted.slice(5).every((key) => activation[key] === undefined),
  "the diagnosed accepted-debate source mismatch changed"
);
const original = String(loaded.originalAnalyzer);
const corrected = String(loaded.correctedAnalyzer);
let expected = original.replace(
  "const accepted = activation[key];",
  "const accepted = activation[key] ?? preparation[key];"
);
for (const key of requiredAccepted.slice(5)) {
  expected = expected.replace(
    `${key}: activation.${key}.output`,
    `${key}: preparation.${key}.output`
  );
}
assertV4(
  corrected === expected,
  "the corrected analyzer contains changes outside the frozen candidate-source fallback"
);

const correction = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-4-analysis-harness-correction-1",
  protocolId:
    "assessment-production-post-canary-batch-02-publication-resumption-4-analysis-harness-correction-1",
  status:
    "frozen-batch-02-publication-resumption-4-analysis-harness-candidate-source-correction-1",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  batchNumber: 2,
  stagingOnly: true,
  diagnosis: {
    category: "deterministic-analysis-harness-candidate-source-mismatch",
    failedExpression: "activation.acceptedDebate66.output",
    missingActivationKeys: requiredAccepted.slice(5),
    preparationContainsAllAcceptedDebates: true,
    acceptedModelOutputsValid: 2,
    modelContextsRerun: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  correctionBoundary: {
    originalAnalyzer: files.originalAnalyzer,
    correctedAnalyzer: files.correctedAnalyzer,
    exactChange:
      "fall back from the activation record to the authenticated preparation manifest for accepted-debate records omitted by the activation serializer",
    validatorChanged: false,
    modelOutputsChanged: false,
    scoresChanged: false,
    sourcesChanged: false,
    acceptedPublicationFieldsChanged: false
  },
  lockedInputs: Object.fromEntries(
    Object.entries(loaded).map(([name, bytes]) => [
      name,
      { path: files[name], sha256: sha256(bytes) }
    ])
  ),
  executionPolicy: {
    correctedAnalyzerPasses: 1,
    modelContexts: 0,
    modelRetries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    directIncrementalCostUsdMaximum: 0
  },
  authorization: {
    correctedDeterministicAnalysis: true,
    modelExecution: false,
    repairPacketPreparation: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  futureOutput: files.analysis,
  nextRequiredAction:
    "execute-exactly-one-corrected-batch-02-publication-resumption-4-analysis-pass"
};
if (shouldWrite) {
  await writeFile(
    path.resolve(files.correction),
    `${JSON.stringify(correction, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: shouldWrite ? correction.status : "preview",
  category: correction.diagnosis.category,
  acceptedModelOutputsValid: 2,
  correctedAnalyzerPassesAuthorized: 1,
  modelContextsAuthorized: 0,
  directIncrementalCostUsd: 0,
  nextRequiredAction: correction.nextRequiredAction
}, null, 2));
