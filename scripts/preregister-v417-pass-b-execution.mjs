#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_ROOT } from "./lib/v417-fresh-validation.mjs";
import { V417_PASS_B_PROTOCOL_ID, V417_PASS_B_ROOT, validateV417LockedEventLedger, validateV417PassBPacket } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V417_PASS_B_ROOT}/execution-manifest.json`;
const executionPath = `${V417_PASS_B_ROOT}/model-execution.json`;
const analysisPath = `${V417_PASS_B_ROOT}/analysis.json`;
const assessmentPath = `${V417_PASS_B_ROOT}/assessment.md`;
const disagreementPath = `${V417_PASS_B_ROOT}/disagreements.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath, assessmentPath, disagreementPath]) assertV4(!(await exists(future)), `${future} already exists`);

const [preparation, fixture, primaryAnalysis, primaryExecution, primaryManifest] = await Promise.all([
  readJson(`${V417_PASS_B_ROOT}/preparation-manifest.json`),
  readJson(`${V417_PASS_B_ROOT}/dry-fixture.json`),
  readJson(`${V417_ROOT}/primary-analysis.json`),
  readJson(`${V417_ROOT}/primary-model-execution.json`),
  readJson(`${V417_ROOT}/primary-execution-manifest.json`)
]);
assertV4(preparation.status === "prepared-five-score-blind-pass-b-contexts" && preparation.contexts.length === 5, "v4.1.7 Pass B preparation invalid");
assertV4(fixture.status === "passed" && fixture.contexts === 5 && fixture.inheritedExactOutputShapeValidated && fixture.alteredOriginalEventRejected && fixture.leakedPrimaryJudgmentRejected, "v4.1.7 Pass B fixture invalid");
assertV4(primaryAnalysis.status === "primary-passed-pass-b-preparation-authorized" && primaryAnalysis.totals.pendingAudioMoves === 0, "v4.1.7 primary analysis unavailable");
assertV4(primaryExecution.status === "primary-execution-passed" && primaryExecution.validContexts === 6, "v4.1.7 primary execution unavailable");
assertV4(primaryManifest.comparatorBoundary.legacyScoresUnavailable && primaryManifest.comparatorBoundary.legacyWinnersUnavailable, "v4.1.7 comparator boundary invalid");

const contexts = [];
for (const item of preparation.contexts) {
  const [packet, ledger, events] = await Promise.all([readJson(item.packet), readJson(item.lockedEvents), readJson(item.events)]);
  const packetValidation = validateV417PassBPacket(packet);
  const ledgerValidation = validateV417LockedEventLedger(ledger, packet, events);
  contexts.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    family: item.family,
    passBPacket: item.packet,
    lockedEvents: item.lockedEvents,
    sourcePacket: item.sourcePacket,
    transcript: item.transcript,
    originalEvents: item.events,
    localManifest: item.localManifest,
    primaryOutput: item.primaryOutput,
    output: item.output,
    lockedMoves: packetValidation.lockedMoves,
    lockedSections: packetValidation.lockedSections,
    deliveredEventRows: ledgerValidation.deliveredRows
  });
}
assertV4(contexts.map((item) => item.debateNumber).join(",") === "58,91,59,144,171", "v4.1.7 Pass B context order invalid");

const sourceFiles = [
  ...Object.values(preparation.inputs),
  `${V417_PASS_B_ROOT}/preparation-manifest.json`, `${V417_PASS_B_ROOT}/dry-fixture.json`,
  `${V417_ROOT}/primary-execution-manifest.json`, `${V417_ROOT}/primary-model-execution.json`, `${V417_ROOT}/primary-analysis.json`,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v415-triggered-consensus.mjs", "scripts/lib/v416-triggered-consensus.mjs", "scripts/lib/v417-fresh-validation.mjs", "scripts/lib/v417-triggered-consensus.mjs",
  "scripts/build-v417-pass-b-packets.mjs", "scripts/test-v417-pass-b-tooling.mjs", "scripts/validate-v417-pass-b-output.mjs", "scripts/preregister-v417-pass-b-execution.mjs", "scripts/run-v417-pass-b-execution.mjs",
  ...contexts.flatMap((context) => [context.passBPacket, context.lockedEvents, context.sourcePacket, context.transcript, context.originalEvents, context.localManifest, context.primaryOutput])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));

const manifest = {
  schemaVersion: "4.1.7-fresh-six-pass-b-execution-manifest",
  protocolId: V417_PASS_B_PROTOCOL_ID,
  stage: "five-triggered-source-blind-high-effort-pass-b-judgments",
  status: "frozen-five-context-pass-b-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: preparation.inputs,
  contexts,
  sourceAccess: { completeTranscriptVisibleToModel: true, completeTranscriptReadRequired: true, originalCompleteEventsHashLocked: true, originalCompleteEventsValidatorOnly: true, originalCompleteEventsVisibleToModel: false, deterministicLockedEventsVisibleToModel: true, lockedEventsReadRequired: true, contextRowsPerSide: 2 },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, primaryJudgmentsUnavailable: true, primaryRatingsUnavailable: true, primaryTotalsUnavailable: true, triggerReasonsUnavailable: true, controlSelectionUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, publicationProseUnavailable: true },
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, legacyReferencePathResolved: false, resolutionAuthorizedAfterFinalScoreLockOnly: true },
  hiddenPostRunReferences: { primaryOutputs: contexts.map((item) => item.primaryOutput), primaryAnalysis: `${V417_ROOT}/primary-analysis.json`, visibleToPassBModel: false },
  executionPolicy: { contexts: 5, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, recoveryOrNormalizationMayCountAsRetry: false },
  judgmentPolicy: { lockedInventoryAndWeightsRequired: true, lockedMoveOrderRequired: true, primaryJudgmentsProhibited: true, calculatedTotalsProhibited: true, publicationProseProhibited: true, responseConsistencyPassRequired: true, burdenReferenceResolutionRequired: true, partialAnswerRemainderRequired: true, charityConsistencyPassRequired: true, burdenAdjustmentDuplicateExclusionRequired: true, mediumOrLowAttributionRequiresAudioBeforeDisagreementExtraction: true },
  authorization: { passBModelExecution: true, deterministicValidationAfterEachContext: true, audioVerificationAfterPassBIfRequired: true, disagreementExtraction: false, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { hashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, retryAuthorized: false, normalizationAuthorized: false, mediumOrLowAttributionBlocksDisagreementExtractionPendingAudio: true },
  artifacts: { execution: executionPath, analysis: analysisPath, assessment: assessmentPath, disagreements: disagreementPath, outputs: contexts.map((item) => item.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((item) => item.output), executionPath, analysisPath, assessmentPath, disagreementPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 5, lockedMoves: contexts.reduce((sum, item) => sum + item.lockedMoves, 0), deliveredEventRows: contexts.reduce((sum, item) => sum + item.deliveredEventRows, 0), completeTranscriptsRequired: true, timeoutMinutes: 30, attemptsPerContext: 1, retriesMaximum: 0, reasoningEffort: "high", legacyAccessed: false, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
