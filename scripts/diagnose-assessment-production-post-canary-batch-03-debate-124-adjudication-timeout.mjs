#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ROOT,
  loadAndValidateRecoveryAuthorization
} from "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const adj = `${ROOT}/dispute-only-adjudication`;
const outputPath = `${adj}/failure-recovery/debate-124-timeout-diagnosis.json`;
const paths = {
  recoveryAuthorization: `${ROOT}/failure-recovery-standing-authorization.json`,
  activation: `${adj}/execution-activation.json`,
  execution: `${adj}/model-execution.json`,
  analysis: `${adj}/analysis.json`,
  packet: `${adj}/packets/debate-124.json`,
  schema: `${adj}/adjudication.schema.json`,
  runner: "scripts/run-assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  diagnostic: "scripts/diagnose-assessment-production-post-canary-batch-03-debate-124-adjudication-timeout.mjs",
  test: "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-timeout-diagnosis.mjs"
};
const { record: recovery } = await loadAndValidateRecoveryAuthorization();
const bytes = Object.fromEntries(
  await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)]))
);
const activation = JSON.parse(bytes.activation);
const execution = JSON.parse(bytes.execution);
const analysis = JSON.parse(bytes.analysis);
const packet = JSON.parse(bytes.packet);
const context = activation.contexts[0];
const result = execution.results[0];
assertV4(
  recovery.authorization.diagnosis === true &&
    context.debateNumber === "124" && context.contextIndex === 0 &&
    context.packetSha256 === sha256(bytes.packet) &&
    execution.contextsAttempted === 1 && execution.validContexts === 0 &&
    execution.unattemptedContextIndexes.join(",") === "1,2,3,4,5,6,7,8,9" &&
    result.status === "timed-out" && result.timedOut === true &&
    result.terminationSignal === "SIGTERM" && result.attemptCount === 1 &&
    result.retryCount === 0 && result.timeoutExtensionCount === 0 &&
    result.outputWritten === false && result.gateAcceptancePassed === false &&
    result.stdoutSha256 === sha256(Buffer.alloc(0)) &&
    analysis.status === "post-canary-batch-03-dispute-only-adjudication-gate-failed-validation",
  "preserved Debate 124 timeout changed"
);
const moveDecisionCounts = packet.disputedMoves.map((move) =>
  [move.candidates.importancePair, move.candidates.attributionPair,
    move.candidates.responsePair, move.candidates.charityPair,
    move.candidates.assessmentConfidencePair].filter(Boolean).length +
  Object.keys(move.candidates.scoringFields).length
);
const firstShardMoveCount = 12;
const firstMoveDecisions = moveDecisionCounts.slice(0, firstShardMoveCount)
  .reduce((sum, value) => sum + value, 0);
const secondMoveDecisions = moveDecisionCounts.slice(firstShardMoveCount)
  .reduce((sum, value) => sum + value, 0);
assertV4(firstMoveDecisions === 34 && secondMoveDecisions === 31,
  "Debate 124 decision partition changed");
const failureTail = result.failureMessage ?? "";
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-timeout-diagnosis",
  status: "frozen-diagnosed-batch-03-debate-124-timeout-before-schema-result",
  frozenAt,
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  debateNumber: "124",
  preservedFailure: {
    originalContextIndex: 0,
    originalAttemptCount: 1,
    acceptedOutputs: 0,
    failedPartialOutputReusable: false,
    outputWritten: false,
    stdoutEmpty: true,
    timedOut: true,
    terminationSignal: "SIGTERM",
    frozenTimeoutMs: activation.executionPolicy.timeoutMsPerContext,
    recordedElapsedMs: result.elapsedMs,
    elapsedBeyondFrozenTimeoutMs:
      result.elapsedMs - activation.executionPolicy.timeoutMsPerContext,
    retryCount: 0,
    timeoutExtensionCount: 0,
    directIncrementalCostUsd: 0,
    unattemptedContextIndexes: execution.unattemptedContextIndexes
  },
  workload: {
    packetBytes: context.packetBytes,
    copiedInputBytes: context.copiedInputBytes,
    disputedMoves: context.disputedMoves,
    burdenAdjustmentDisputes: packet.burdenAdjustmentDisputes.length,
    candidateSelections: context.candidateSelections,
    audioTranscriptInputs: context.audioTranscriptInputs.length
  },
  preservedErrorRecord: {
    stdoutSha256: result.stdoutSha256,
    stderrSha256: result.stderrSha256,
    failureTailSha256: sha256(failureTail),
    failureTailCharacters: failureTail.length,
    failureTailContainsPacketFragments: failureTail.includes("candidate1") &&
      failureTail.includes("candidate2"),
    explicitSchemaValidationErrorPreserved: false,
    explicitTransportErrorPreserved: false,
    schemaResultPreserved: false
  },
  finding: {
    classification: "timeout-before-schema-result",
    evidence: "The frozen context produced no result file or stdout, reached the timeout path, and preserved only packet fragments in the bounded stderr tail.",
    inference: "The combined 350419-byte, 67-decision workload exceeded the successful runtime envelope; preserved evidence does not establish a semantic or schema defect.",
    timingTransportObservation: "The recorded process closure occurred after the 900000-ms timer and ended with SIGTERM, without any authorized timeout extension.",
    prohibitedConclusions: [
      "no model decision is recoverable from the failed partial transport",
      "no packet evidence, candidate, schema, validator, or threshold is diagnosed as defective"
    ]
  },
  minimumBoundedCorrection: {
    operation: "partition-original-context-into-two-field-disjoint-score-blind-shards",
    reasonMinimum: "One context would repeat the failed workload; two is the smallest nontrivial partition.",
    shardCount: 2,
    shard01: {
      moveIds: packet.disputedMoves.slice(0, 12).map((move) => move.moveId),
      burdenAdjustmentSides: ["pro"],
      candidateSelections: firstMoveDecisions + 1
    },
    shard02: {
      moveIds: packet.disputedMoves.slice(12).map((move) => move.moveId),
      burdenAdjustmentSides: ["con"],
      candidateSelections: secondMoveDecisions + 1
    },
    combinedCandidateSelections: firstMoveDecisions + secondMoveDecisions + 2,
    mergeRule: "Restore original packet move and burden order; require each original candidate-selection field exactly once; validate the merged output against the original packet.",
    originalPacketPreserved: true,
    originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true,
    originalFailedPartialOutputIgnored: true,
    recoveryAttemptsPerShard: 1,
    ordinaryRetries: 0,
    timeoutExtensions: 0
  },
  sourceHashes: Object.fromEntries(Object.entries(paths).map(([key, file]) => [file, sha256(bytes[key])])),
  authorization: {
    correctionPreparation: true,
    correctionExecution: false,
    paidServices: false,
    scoreDerivation: false,
    downstreamWork: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-freeze-two-debate-124-field-disjoint-adjudication-correction-shards"
};
assertV4(diagnosis.minimumBoundedCorrection.combinedCandidateSelections === 67,
  "Debate 124 correction does not cover every selection exactly once");
if (shouldWrite) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? diagnosis.status : "preview",
  classification: diagnosis.finding.classification,
  shardCount: 2,
  candidateSelections: [35, 32],
  originalAcceptedOutputs: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
