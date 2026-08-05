#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V419_ROOT } from "./lib/v419-schema-bounded-source.mjs";

const shouldWrite = process.argv.includes("--write");
const [execution, manifest] = await Promise.all([
  readFile(path.resolve(V419_ROOT, "primary-model-execution.json"), "utf8").then(JSON.parse),
  readFile(path.resolve(V419_ROOT, "primary-execution-manifest.json"), "utf8").then(JSON.parse)
]);
assertV4(execution.status === "primary-execution-failed-fast" && execution.contextsAttempted === 1 && execution.contextsSkipped === 5, "expected v4.1.9 fail-fast execution unavailable");
const result = execution.results[0];
assertV4(result.debateNumber === "180" && result.status === "timed-out" && result.attemptCount === 1 && result.retryCount === 0 && !result.rawOutputWritten, "unexpected v4.1.9 failure context");
const context = manifest.contexts[0];
const instructionFiles = Object.values(manifest.modelInputs);
const [transcriptBytes, eventsBytes, instructionSizes] = await Promise.all([
  stat(context.transcript).then((item) => item.size),
  stat(context.events).then((item) => item.size),
  Promise.all(instructionFiles.map(async (file) => ({ file, bytes: (await stat(file)).size })))
]);
const instructionBytes = instructionSizes.reduce((sum, item) => sum + item.bytes, 0);
const failure = {
  schemaVersion: "4.1.9-primary-timeout-failure-analysis",
  protocolId: manifest.protocolId,
  status: "failed-long-context-timeout",
  execution: { contextsPlanned: 6, contextsAttempted: 1, contextsSkipped: 5, attempts: 1, retries: 0, elapsedMs: result.elapsedMs, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, recoverableStreamEvents: result.recoverableStreamEvents, transportClassification: result.transportClassification, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  failedContext: { debateNumber: result.debateNumber, debateId: result.debateId, durationSeconds: context.durationSeconds, rawOutputCreated: false, compiledOutputCreated: false },
  inputShape: { plainTranscriptBytes: transcriptBytes, timestampedEventsBytes: eventsBytes, duplicatedSourceTextBytes: transcriptBytes + eventsBytes, instructionAndSchemaBytes: instructionBytes, totalCopiedInputBytes: transcriptBytes + eventsBytes + instructionBytes, instructionFiles: instructionSizes.length, instructionSizes },
  diagnosis: { schemaRejected: false, deterministicValidatorReached: false, judgmentOutputCreated: false, sourceProvenanceResultAvailable: false, runtimeFailure: true, sourceTextDeliveredTwice: true, cumulativeWorkflowStackDelivered: true },
  disposition: { v419GatePassed: false, retryAuthorized: false, timeoutExtensionAuthorized: false, scoreDerivationAuthorized: false, legacyComparisonAuthorized: false, allSixV419DebatesBecomeDiagnosticExclusions: true, compactTransportDevelopmentAuthorized: true },
  nextTransportTest: { diagnosticDebateNumber: "180", originalTranscriptRemainsStoredAndHashedLocally: true, modelReceivesOneLosslessTimestampedSourceLedger: true, sourceLedgerMustReplayExactlyToOriginalEvents: true, plainTranscriptDuplicateRemovedFromModelContext: true, cumulativeWorkflowFilesReplacedByPrimaryRelevantInstructionsAndRubrics: true, judgmentRulesChanged: false, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs }
};
if (shouldWrite) await writeFile(path.resolve(V419_ROOT, "primary-failure-analysis.json"), `${JSON.stringify(failure, null, 2)}\n`);
console.log(JSON.stringify({ status: failure.status, ...failure.execution, ...failure.inputShape, scoreDerivationAuthorized: false, legacyComparisonAuthorized: false, compactTransportDevelopmentAuthorized: true }, null, 2));
