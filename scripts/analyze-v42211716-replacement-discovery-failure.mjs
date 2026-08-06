#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const EXECUTION = "docs/calibration/v4.2.21.17.15/replacement-held-out-discovery/model-execution.json";
const MANIFEST = "docs/calibration/v4.2.21.17.15/replacement-held-out-discovery/execution-manifest.json";
const OUTPUT = "docs/calibration/v4.2.21.17.16/discovery-transport-attribution-hardening/failure-analysis.json";
const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assertV4(execution.status === "replacement-held-out-discovery-complete-with-failure", "replacement discovery failure unavailable");
assertV4(execution.contextsAttempted === 18 && execution.validContexts === 13 && execution.invalidContexts === 5 && execution.retries === 0, "replacement failure count drifted");

const failed = execution.results.filter((result) => !result.accepted);
const timeouts = failed.filter((result) => result.status === "timed-out");
const validationFailures = failed.filter((result) => result.status === "output-validation-failed");
assertV4(timeouts.length === 4 && validationFailures.length === 1, "unexpected replacement failure classes");
const firstStartMs = Math.min(...execution.results.map((result) => Date.parse(result.startedAt)));
const openingBatch = execution.results.filter((result) => Date.parse(result.startedAt) - firstStartMs < 1000);
assertV4(openingBatch.length === 4 && openingBatch.every((result) => result.status === "timed-out"), "opening timeout batch is not exact");
const later = execution.results.filter((result) => !openingBatch.includes(result));
const laterValid = later.filter((result) => result.accepted);
assertV4(later.length === 14 && laterValid.length === 13, "later context evidence drifted");
const attributionFailure = validationFailures[0];
const attributionContext = manifest.contexts[attributionFailure.contextIndex];
const attributionOutput = JSON.parse(await readFile(attributionContext.rawOutput, "utf8"));
const packet = JSON.parse(await readFile(attributionContext.packet, "utf8"));
const allowedSpeakers = [...new Set([...packet.sides.pro.speakers, ...packet.sides.con.speakers])];
const invalidCandidates = attributionOutput.candidates.filter((candidate) => !allowedSpeakers.includes(candidate.speaker));
assertV4(invalidCandidates.length === 1, "expected one non-interlocutor candidate");

const analysis = {
  schemaVersion: "4.2.21.17.16-discovery-transport-attribution-failure-analysis",
  protocolId: "v4.2.21.17.16-discovery-transport-attribution-hardening",
  status: "replacement-held-out-discovery-failed-transport-startup-and-speaker-allowlist",
  calibrationOnly: true,
  AIOnly: true,
  inputs: { execution: EXECUTION, manifest: MANIFEST },
  observed: {
    contextsAttempted: 18,
    validContexts: 13,
    invalidContexts: 5,
    retries: 0,
    openingBatchContexts: openingBatch.length,
    openingBatchTimeouts: timeouts.length,
    laterContexts: later.length,
    laterValidContexts: laterValid.length,
    laterValidationFailures: validationFailures.length,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  transportDiagnosis: {
    class: "simultaneous-opening-batch-stall",
    confidence: "medium",
    evidence: {
      allFourInitialContextsStartedWithinOneSecond: true,
      allFourInitialContextsTimedOut: true,
      laterContextsMostlyValid: true,
      laterValidRate: laterValid.length / later.length,
      schemaSpecificFailureInferred: false,
    },
    correction: {
      retiredStructuredOutputCanaryRequiredBeforeHeldOutLaunch: true,
      canaryMustValidateBeforeHeldOutContextStarts: true,
      schedulerRamp: [1, 2, 4],
      fullConcurrencyOnlyAfterSuccessfulRampCompletions: true,
      contextTimeoutMs: 300000,
      failedStdoutAndStderrTailsStoredSeparately: true,
      heldOutRetryMaximum: 0,
    },
  },
  attributionDiagnosis: {
    class: "output-schema-speaker-underconstraint",
    debateNumber: attributionContext.debateNumber,
    chunkId: attributionContext.chunkId,
    allowedSpeakers,
    invalidCandidates: invalidCandidates.map((candidate) => ({ candidateId: candidate.candidateId, speaker: candidate.speaker, side: candidate.side })),
    deterministicValidatorRejected: true,
    semanticRepairAttempted: false,
    correction: {
      structuredOutputSpeakerEnumRequired: true,
      onlyFrozenInterlocutorsAllowed: true,
      deterministicSpeakerSideValidatorRetained: true,
      audienceMaterialMayRemainContextButCannotBecomeCandidate: true,
    },
  },
  evidenceDisposition: {
    discoveryQualityEvidence: "informative-but-failed",
    throughputEvidence: "opening-stall-distorted-retain-later-context-timing-only",
    cleanHeldOutPassEvidence: false,
    retiredDebateNumbers: [...new Set(manifest.contexts.map((context) => context.debateNumber))],
    reuseForCleanHeldOutGate: false,
  },
  authorization: {
    transportCanaryTooling: true,
    rampedSchedulerTooling: true,
    deterministicSpeakerAllowlistSchemaTest: true,
    freshHeldOutSelection: true,
    retryFailedContexts: false,
    reuseFailedSampleAsCleanHeldOut: false,
    independentJudgmentPacketPreparation: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  openingBatchTimeouts: analysis.observed.openingBatchTimeouts,
  laterValidContexts: analysis.observed.laterValidContexts,
  laterContexts: analysis.observed.laterContexts,
  attributionFailure: analysis.attributionDiagnosis.invalidCandidates,
  requiredSchedulerRamp: analysis.transportDiagnosis.correction.schedulerRamp,
  speakerAllowlistRequired: true,
  cleanHeldOutPassEvidence: false,
  retiredDebates: analysis.evidenceDisposition.retiredDebateNumbers,
}, null, 2));
