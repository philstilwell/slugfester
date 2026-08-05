#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { lexicalTokens } from "./lib/v418-source-integrity.mjs";
import { V424_ROOT, validateV424SourceLedger } from "./lib/v424-screened-chronology-fresh.mjs";

const shouldWrite = process.argv.includes("--write");
const [execution, manifest] = await Promise.all([readFile(path.resolve(V424_ROOT, "primary-model-execution.json"), "utf8").then(JSON.parse), readFile(path.resolve(V424_ROOT, "primary-execution-manifest.json"), "utf8").then(JSON.parse)]);
assertV4(execution.status === "primary-execution-failed-fast" && execution.contextsAttempted === 1 && execution.contextsSkipped === 5, "expected v4.2.4 fail-fast execution unavailable");
const result = execution.results[0];
assertV4(result.debateNumber === "131" && result.status === "output-validation-failed" && result.attemptCount === 1 && result.retryCount === 0 && result.rawOutputWritten && !result.compiledOutputWritten, "unexpected v4.2.4 failure context");
const context = manifest.contexts[0];
const [raw, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
const ledgerValidation = validateV424SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
const excerptDiagnostics = raw.moves.map((move) => ({ moveId: move.moveId, characterCount: move.sourceSpan.excerpt.length, tokenCount: lexicalTokens(move.sourceSpan.excerpt).length, withinSchemaCharacterCeiling: move.sourceSpan.excerpt.length <= 600, withinTokenCeiling: lexicalTokens(move.sourceSpan.excerpt).length <= 100 }));
const overTokenCeiling = excerptDiagnostics.filter((item) => !item.withinTokenCeiling);
assertV4(overTokenCeiling.length === 6 && overTokenCeiling.some((item) => item.moveId === "m01-pro-paul" && item.tokenCount === 114), "unexpected v4.2.4 excerpt failure shape");
const moves = raw.moves;
const moveIndex = new Map(moves.map((move, index) => [move.moveId, index]));
const chronologyAndTargetsPassed = moves.every((move, index) => (index === 0 || moves[index - 1].sourceSpan.startEvent <= move.sourceSpan.startEvent) && move.response.decisiveTargetIds.every((id) => moveIndex.has(id) && moveIndex.get(id) < index));
const failure = {
  schemaVersion: "4.2.4-primary-excerpt-failure-analysis", protocolId: manifest.protocolId, status: "failed-token-ceiling-despite-character-schema-compliance",
  execution: { contextsPlanned: 6, contextsAttempted: 1, contextsSkipped: 5, attempts: 1, retries: 0, elapsedMs: result.elapsedMs, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, completedInsideTimeout: result.elapsedMs <= manifest.executionPolicy.perInvocationTimeoutMs, recoverableStreamEvents: result.recoverableStreamEvents, transportClassification: result.transportClassification, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  failedContext: { debateNumber: result.debateNumber, debateId: result.debateId, durationSeconds: context.durationSeconds, compactCopiedInputBytes: context.compactCopiedInputBytes, rawOutputCreated: true, rawOutputSha256: result.rawOutputSha256, compiledOutputCreated: false },
  validation: { compactLedgerReplayExact: ledgerValidation.replayExact, chronologyAndEarlierTargetPrecheckPassed: chronologyAndTargetsPassed, endpointCharacterSchemaPassed: excerptDiagnostics.every((item) => item.withinSchemaCharacterCeiling), firstSurfacedFailure: result.validationMessage.match(/Error: ([^\n]+)/)?.[1] ?? null, excerptDiagnostics, movesOverTokenCeiling: overTokenCeiling.length, laterInheritedValidationResultsAvailable: false },
  diagnosis: { runtimeFailure: false, transportFailure: false, sourceHashFailure: false, compactLedgerFailure: false, chronologyFailure: false, endpointCharacterCeilingFilledByModel: true, tokenCeilingFailure: true, characterCeilingTooLooseForReliableTokenCompliance: true, argumentRatingsEvaluatedForAcceptance: false },
  disposition: { v424GatePassed: false, retryAuthorized: false, outputNormalizationAuthorized: false, remainingFiveContextsExecuted: false, scoreDerivationAuthorized: false, legacyComparisonAuthorized: false, allSixV424DebatesBecomeDiagnosticExclusions: true, tighterEndpointCharacterCeilingDevelopmentAuthorized: true },
  nextDevelopmentTest: { diagnosticDebateNumber: "131", compactTransportRetained: true, chronologyFirstTopologyRetained: true, judgmentAnchorsChanged: false, excerptTokenRangeRetained: [12, 100], endpointExcerptCharacterMaximum: 450, deterministicTokenValidationRetained: true, oneAttemptNoRetryRetained: true, automaticTruncationAuthorized: false, scoreDerivationProhibited: true }
};
if (shouldWrite) await writeFile(path.resolve(V424_ROOT, "primary-failure-analysis.json"), `${JSON.stringify(failure, null, 2)}\n`);
console.log(JSON.stringify({ status: failure.status, ...failure.execution, compactLedgerReplayExact: true, chronologyAndEarlierTargetPrecheckPassed: chronologyAndTargetsPassed, movesOverTokenCeiling: overTokenCeiling.length, tokenCounts: overTokenCeiling.map((item) => item.tokenCount), retryAuthorized: false, tighterEndpointCharacterCeilingDevelopmentAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
