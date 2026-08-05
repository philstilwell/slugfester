#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_PASS_B_PROTOCOL_ID, V416_PASS_B_ROOT, validateV416LockedEventLedger, validateV416PassBPacket } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V416_PASS_B_ROOT}/execution-manifest.json`;
const executionPath = `${V416_PASS_B_ROOT}/model-execution.json`;
const analysisPath = `${V416_PASS_B_ROOT}/analysis.json`;
const assessmentPath = `${V416_PASS_B_ROOT}/assessment.md`;
const disagreementPath = `${V416_PASS_B_ROOT}/disagreements.json`;
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath, assessmentPath, disagreementPath]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

const [preparation, fixture, inheritedPreflight, primaryAnalysis, failedV415] = await Promise.all([
  readJson(`${V416_PASS_B_ROOT}/preparation-manifest.json`),
  readJson(`${V416_PASS_B_ROOT}/dry-fixture.json`),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/model-execution.json"),
  readJson(`${V41_LEAN_ROOT}/primary-analysis.json`),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/pass-b/model-execution.json")
]);
assertV4(preparation.status === "prepared-nonredundant-score-blind-pass-b" && preparation.contexts.length === 3, "v4.1.6 preparation invalid");
assertV4(fixture.status === "passed" && fixture.mutationTests.alteredOriginalEventRejected && fixture.timingPolicyTests.clean.runtimePassed && fixture.timingPolicyTests.oneRecovered.runtimePassed, "v4.1.6 fixture invalid");
assertV4(inheritedPreflight.status === "endpoint-preflight-passed" && inheritedPreflight.validSyntheticContexts === 1, "inherited exact-schema preflight unavailable");
assertV4(primaryAnalysis.status === "primary-passed-ready-to-freeze-triggered-pass-b" && primaryAnalysis.totals.pendingAudioMoves === 0, "primary gate unavailable");
assertV4(failedV415.status === "pass-b-execution-failed-fast" && failedV415.authorization.furtherAutomaticRetry === false, "frozen v4.1.5 failure unavailable");

const contexts = [];
for (const item of preparation.contexts) {
  const [packet, ledger, events] = await Promise.all([readJson(item.packet), readJson(item.lockedEvents), readJson(item.events)]);
  const packetValidation = validateV416PassBPacket(packet);
  const ledgerValidation = validateV416LockedEventLedger(ledger, packet, events);
  contexts.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
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
assertV4(contexts.map((item) => item.debateNumber).join(",") === "55,103,161", "v4.1.6 context order invalid");

const hiddenComparator = "docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json";
const sourceFiles = [
  ...Object.values(preparation.inputs),
  `${V416_PASS_B_ROOT}/preparation-manifest.json`, `${V416_PASS_B_ROOT}/dry-fixture.json`,
  "docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/execution-manifest.json",
  "docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/model-execution.json",
  "docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/output.json",
  "docs/calibration/v4.1.5/lean-retired-gate/pass-b/model-execution.json",
  "docs/calibration/v4.1.5/lean-retired-gate/pass-b/assessment.md",
  `${V41_LEAN_ROOT}/primary-execution-manifest.json`, `${V41_LEAN_ROOT}/primary-model-execution.json`, `${V41_LEAN_ROOT}/primary-analysis.json`,
  hiddenComparator,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v415-triggered-consensus.mjs", "scripts/lib/v416-triggered-consensus.mjs",
  "scripts/validate-v416-pass-b-output.mjs", "scripts/preregister-v416-pass-b-execution.mjs", "scripts/run-v416-pass-b-execution.mjs", "scripts/analyze-v416-pass-b.mjs",
  ...contexts.flatMap((context) => [context.passBPacket, context.lockedEvents, context.sourcePacket, context.transcript, context.originalEvents, context.localManifest, context.primaryOutput])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));

const manifest = {
  schemaVersion: "4.1.6-triggered-pass-b-execution-manifest",
  protocolId: V416_PASS_B_PROTOCOL_ID,
  stage: "nonredundant-score-blind-high-effort-pass-b-retired-gate",
  status: "frozen-three-v416-pass-b-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: preparation.inputs,
  contexts,
  sourceAccess: {
    completeTranscriptVisibleToModel: true,
    completeTranscriptReadRequired: true,
    originalCompleteEventsHashLocked: true,
    originalCompleteEventsValidatorOnly: true,
    originalCompleteEventsVisibleToModel: false,
    deterministicLockedEventsVisibleToModel: true,
    lockedEventsReadRequired: true,
    contextRowsPerSide: 2
  },
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    otherDebatesUnavailable: true,
    primaryJudgmentsUnavailable: true,
    primaryRatingsUnavailable: true,
    primaryTotalsUnavailable: true,
    triggerReasonsUnavailable: true,
    controlSelectionUnavailable: true,
    comparatorUnavailable: true,
    legacyAssessmentsUnavailable: true,
    priorScoresAndWinnersUnavailable: true,
    publicationProseUnavailable: true
  },
  hiddenPostRunReferences: { primaryOutputs: contexts.map((item) => item.primaryOutput), primaryAnalysis: `${V41_LEAN_ROOT}/primary-analysis.json`, comparator: hiddenComparator, visibleToPassBModel: false },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoveryOrNormalizationMayCountAsRetry: false },
  judgmentPolicy: { lockedInventoryAndWeightsRequired: true, lockedMoveOrderRequired: true, primaryJudgmentsProhibited: true, calculatedTotalsProhibited: true, publicationProseProhibited: true, responseConsistencyPassRequired: true, burdenReferenceResolutionRequired: true, charityConsistencyPassRequired: true, burdenAdjustmentDuplicateExclusionRequired: true, mediumOrLowAttributionRequiresAudioBeforeDisagreementExtraction: true },
  authorization: { passBModelExecution: true, deterministicValidationAfterEachContext: true, passBAnalysisAfterAllValid: true, audioVerificationAfterPassBIfRequired: true, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { hashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, retryAuthorized: false, normalizationAuthorized: false, mediumOrLowAttributionBlocksDisagreementExtractionPendingAudio: true },
  artifacts: { execution: executionPath, analysis: analysisPath, assessment: assessmentPath, disagreements: disagreementPath, outputs: contexts.map((item) => item.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((item) => item.output), executionPath, analysisPath, assessmentPath, disagreementPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 3, lockedMoves: contexts.reduce((sum, item) => sum + item.lockedMoves, 0), deliveredEventRows: contexts.reduce((sum, item) => sum + item.deliveredEventRows, 0), completeTranscriptsRequired: true, originalEventsHashLocked: true, timeoutMinutes: 30, attemptsPerContext: 1, retriesMaximum: 0, reasoningEffort: "high", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
