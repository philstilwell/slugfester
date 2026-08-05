#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V421_ROOT } from "./lib/v421-compact-fresh.mjs";

const shouldWrite = process.argv.includes("--write");
const [execution, manifest] = await Promise.all([
  readFile(path.resolve(V421_ROOT, "primary-model-execution.json"), "utf8").then(JSON.parse),
  readFile(path.resolve(V421_ROOT, "primary-execution-manifest.json"), "utf8").then(JSON.parse)
]);
assertV4(execution.status === "primary-execution-failed-fast" && execution.contextsAttempted === 1 && execution.contextsSkipped === 5, "expected v4.2.1 fail-fast execution unavailable");
const result = execution.results[0];
assertV4(result.debateNumber === "07" && result.status === "output-validation-failed" && result.attemptCount === 1 && result.retryCount === 0 && result.rawOutputWritten && !result.compiledOutputWritten, "unexpected v4.2.1 failure context");
const context = manifest.contexts[0];
const raw = JSON.parse(await readFile(path.resolve(context.rawOutput), "utf8"));
const moves = raw.sections.flatMap((section) => [
  ...section.proMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "pro" })),
  ...section.conMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "con" }))
]).sort((a, b) => a.sourceSpan.startEvent - b.sourceSpan.startEvent || a.sourceSpan.endEvent - b.sourceSpan.endEvent || a.moveId.localeCompare(b.moveId));
const byId = new Map(moves.map((move, index) => [move.moveId, { move, index }]));
const invalidTargetEdges = [];
for (const [replyIndex, move] of moves.entries()) {
  for (const targetId of move.response.decisiveTargetIds) {
    const target = byId.get(targetId);
    if (!target || target.index >= replyIndex) invalidTargetEdges.push({ replyMoveId: move.moveId, replyStartEvent: move.sourceSpan.startEvent, targetMoveId: targetId, targetStartEvent: target?.move.sourceSpan.startEvent ?? null, targetSelected: Boolean(target), targetChronologicallyEarlier: Boolean(target && target.index < replyIndex) });
  }
}
assertV4(invalidTargetEdges.length === 1 && invalidTargetEdges[0].replyMoveId === "pro-trial-reply" && invalidTargetEdges[0].targetMoveId === "con-trial-presupposition", "unexpected v4.2.1 target failure shape");

const failure = {
  schemaVersion: "4.2.1-primary-validation-failure-analysis",
  protocolId: manifest.protocolId,
  status: "failed-chronology-cross-reference-validation",
  execution: { contextsPlanned: 6, contextsAttempted: 1, contextsSkipped: 5, attempts: 1, retries: 0, elapsedMs: result.elapsedMs, timeoutMs: manifest.executionPolicy.perInvocationTimeoutMs, completedInsideTimeout: result.elapsedMs <= manifest.executionPolicy.perInvocationTimeoutMs, recoverableStreamEvents: result.recoverableStreamEvents, transportClassification: result.transportClassification, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  failedContext: { debateNumber: result.debateNumber, debateId: result.debateId, durationSeconds: context.durationSeconds, compactCopiedInputBytes: context.compactCopiedInputBytes, rawOutputCreated: true, rawOutputSha256: result.rawOutputSha256, compiledOutputCreated: false },
  validation: { endpointSchemaOutputCreated: result.commandExitCode === 0, deterministicValidatorReached: true, firstSurfacedFailure: result.validationMessage.match(/Error: ([^\n]+)/)?.[1] ?? null, invalidTargetEdges, laterValidationResultsAvailable: false },
  diagnosis: { runtimeFailure: false, transportFailure: false, sourceHashFailure: false, compactLedgerPreflightFailure: false, chronologyCrossReferenceFailure: true, selectedReplyTargetsLaterRestatement: true, earlierPromptingMaterialSelectedAsMove: false, compactTransportImplicated: false, lowEffortSemanticLinkageReliabilityImplicated: true },
  disposition: { v421GatePassed: false, retryAuthorized: false, outputNormalizationAuthorized: false, remainingFiveContextsExecuted: false, scoreDerivationAuthorized: false, legacyComparisonAuthorized: false, allSixV421DebatesBecomeDiagnosticExclusions: true, chronologyFirstContractDevelopmentAuthorized: true },
  nextDevelopmentTest: { diagnosticDebateNumber: "07", compactTransportRetained: true, judgmentAnchorsChanged: false, nestedMoveArraysReplacedByOneChronologicalMoveInventory: true, selectedTargetMustAppearEarlierInEmittedInventory: true, deterministicCrossReferenceRejectionRetained: true, oneAttemptNoRetryRetained: true, scoreDerivationProhibited: true }
};
if (shouldWrite) await writeFile(path.resolve(V421_ROOT, "primary-failure-analysis.json"), `${JSON.stringify(failure, null, 2)}\n`);
console.log(JSON.stringify({ status: failure.status, ...failure.execution, invalidTargetEdges, compactTransportImplicated: false, retryAuthorized: false, chronologyFirstContractDevelopmentAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
