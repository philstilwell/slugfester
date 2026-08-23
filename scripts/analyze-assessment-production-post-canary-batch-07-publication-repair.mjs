#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  mergeAndValidateBatch07PublicationRepairs,
  POST_CANARY_BATCH_07_PUBLICATION_REPAIR_ROOT
} from "./lib/assessment-production-post-canary-batch-07-publication-repair.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_ROOT } from "./lib/assessment-production-post-canary-batch-07-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_07_PUBLICATION_REPAIR_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)),
  readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(EXECUTION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source mismatch: ${file}`
  );
}
assertV4(
  execution.contextsPlanned === 1 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrections === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "Batch 7 repair execution boundary changed"
);

const mergedPath = `${activation.artifacts.mergedRoot}/debate-193.json`;
if (shouldWrite) {
  for (const file of [
    activation.artifacts.analysis,
    activation.artifacts.completeValidation,
    activation.artifacts.mergeAudit,
    mergedPath
  ]) assertV4(!(await exists(file)), `${file} already exists`);
}

const context = activation.contexts[0];
const result = execution.results[0];
let merge = null;
let failureMessage = null;
if (
  execution.contextsAttempted === 1 &&
  execution.validContexts === 1 &&
  execution.invalidContexts === 0 &&
  result?.gateAcceptancePassed
) {
  try {
    const basePath = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/outputs/debate-193.json`;
    const publicationPacketPath = `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/packets/debate-193.json`;
    const [baseBytes, publicationPacket, repairPacket, repairOutputBytes,
      validationBytes, provenanceBytes] = await Promise.all([
      readFile(path.resolve(basePath)),
      readFile(path.resolve(publicationPacketPath), "utf8").then(JSON.parse),
      readFile(path.resolve(context.packet), "utf8").then(JSON.parse),
      readFile(path.resolve(context.output)),
      readFile(path.resolve(context.validation)),
      readFile(path.resolve(context.provenance))
    ]);
    assertV4(
      sha256(repairOutputBytes) === result.outputSha256 &&
        sha256(validationBytes) === result.validationSha256 &&
        sha256(provenanceBytes) === result.provenanceSha256,
      "accepted repair audit changed"
    );
    merge = mergeAndValidateBatch07PublicationRepairs({
      baseOutput: JSON.parse(baseBytes),
      repairOutputs: [JSON.parse(repairOutputBytes)],
      repairPackets: [repairPacket],
      publicationPacket
    });
    assertV4(merge.fullValidation.status === "passed", "merged Debate 193 did not validate");
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const passed =
  merge?.fullValidation.status === "passed" &&
  merge.transformations.length === 2 &&
  !failureMessage;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-07-debate-193-publication-repair-and-validation-passed-awaiting-nine-context-resumption"
    : "batch-07-debate-193-publication-repair-or-validation-failed",
  productionCanary: false,
  batchNumber: 7,
  stagingOnly: true,
  sources: {
    preparationSha256: sha256(preparationBytes),
    activationSha256: sha256(activationBytes),
    executionSha256: sha256(executionBytes)
  },
  gate: {
    contextsPlanned: 1,
    contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts,
    contextsFailed: execution.invalidContexts,
    contextsUnattempted: execution.contextsUnattempted,
    correctedFields: passed ? 2 : 0,
    repairedDebates: passed ? 1 : 0,
    completeDebate193ValidationPassed: passed,
    completeTenDebateCohortReplayPassed: false,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    immutableFieldsChanged: passed ? 0 : null,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  validation: merge?.fullValidation ?? null,
  authorizedTransformations: merge?.transformations ?? [],
  failureMessage,
  totals: {
    modelContexts: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    nineContextResumptionPreparation: passed,
    nineContextResumptionExecution: false,
    publicationCompilationPreparation: false,
    retry: false,
    timeoutExtension: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-freeze-nine-unattempted-batch-07-publication-resumption-contexts"
    : "stop-on-failed-bounded-batch-07-publication-repair"
};

if (shouldWrite && passed) {
  await mkdir(path.resolve(activation.artifacts.mergedRoot), { recursive: true });
  await writeFile(path.resolve(mergedPath), `${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-publication-repair-complete-validation",
    protocolId: activation.protocolId,
    status: "passed",
    repairedDebates: [{
      debateNumber: "193",
      authorizedFieldsChanged: 2,
      immutableFieldsChanged: 0,
      validation: merge.fullValidation
    }],
    repairedDebateCount: 1,
    authorizedFieldsChanged: 2,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-07-publication-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    immutableRejectedOutput:
      `${POST_CANARY_BATCH_07_PUBLICATION_ROOT}/outputs/debate-193.json`,
    repairContext: {
      contextIndex: 0,
      packetId: context.packetId,
      output: context.output,
      outputSha256: result.outputSha256,
      writableFields: context.writableFields
    },
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: 2,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  await writeFile(
    path.resolve(activation.artifacts.completeValidation),
    `${JSON.stringify(completeValidation, null, 2)}\n`
  );
  await writeFile(
    path.resolve(activation.artifacts.mergeAudit),
    `${JSON.stringify(mergeAudit, null, 2)}\n`
  );
}
if (shouldWrite) {
  await writeFile(
    path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: execution.contextsAttempted,
  contextsPassed: execution.validContexts,
  repairedDebates: analysis.gate.repairedDebates,
  correctedFields: analysis.gate.correctedFields,
  completeDebate193ValidationPassed: analysis.gate.completeDebate193ValidationPassed,
  attempts: execution.attempts,
  retries: 0,
  meteredApiCostUsd: 0,
  paidServiceCalls: 0,
  modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
