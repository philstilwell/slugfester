#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V3810_PERFORMANCE_DEBATES, V3810_PERFORMANCE_PASSES, V3810_PERFORMANCE_ROOT, assertV3810, containsProhibitedDerivedField, readJson } from "./lib/v3810-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const manifestPath = `${V3810_PERFORMANCE_ROOT}/initial-execution-manifest.json`;
if (shouldWrite) {
  try {
    await access(path.resolve(root, manifestPath));
    throw new Error(`${manifestPath} already exists`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = await readJson(`${V3810_PERFORMANCE_ROOT}/preparation-manifest.json`);
const fixture = await readJson(`${V3810_PERFORMANCE_ROOT}/dry-fixture.json`);
const preflight = await readJson(`${V3810_PERFORMANCE_ROOT}/schema-preflight/model-execution.json`);
assertV3810(preparation.status === "prepared-score-blind-no-model-execution" && preparation.totals.moves === 81 && preparation.totals.pendingAudioVerifications === 0, "performance preparation invalid");
assertV3810(fixture.status === "passed" && fixture.totals.contexts === 6 && fixture.totals.judgments === 162 && fixture.totals.calculatedTotals === 0, "performance dry fixture invalid");
assertV3810(preflight.status === "endpoint-preflight-passed" && preflight.validSyntheticContexts === 1 && preflight.syntheticMoves === 7 && preflight.responseClassesExercised === 7 && preflight.debateJudgments === 0 && preflight.retries === 0, "expanded exact-schema endpoint preflight did not pass cleanly");

const schemaPath = `${V3810_PERFORMANCE_ROOT}/performance-judgment-schema.json`;
const contexts = [];
for (const pass of V3810_PERFORMANCE_PASSES) for (const debateNumber of V3810_PERFORMANCE_DEBATES) {
  const packetPath = `${V3810_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const packet = await readJson(packetPath);
  assertV3810(packet.moves.length > 0 && !containsProhibitedDerivedField(packet), `${pass}.${debateNumber}: packet contains prohibited derived field`);
  contexts.push({
    pass,
    debateNumber,
    debateId: packet.debateId,
    moveCount: packet.moves.length,
    packet: packetPath,
    schema: schemaPath,
    transcript: packet.sourceChain.transcriptPath,
    events: packet.sourceChain.eventsPath,
    captionManifest: packet.sourceChain.localManifestPath,
    output: `${V3810_PERFORMANCE_ROOT}/initial-outputs/debate-${debateNumber}-pass-${pass.toLowerCase()}.json`
  });
}
const sourceFiles = [
  preparation.inputs.workflowPath,
  preparation.inputs.rubricPath,
  preparation.inputs.manualPath,
  preparation.inputs.preregistrationPath,
  `${V3810_PERFORMANCE_ROOT}/preparation-assessment.md`,
  `${V3810_PERFORMANCE_ROOT}/preparation-manifest.json`,
  `${V3810_PERFORMANCE_ROOT}/dry-fixture.json`,
  `${V3810_PERFORMANCE_ROOT}/schema-preflight/execution-manifest.json`,
  `${V3810_PERFORMANCE_ROOT}/schema-preflight/model-execution.json`,
  `${V3810_PERFORMANCE_ROOT}/schema-preflight/output.json`,
  schemaPath,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v3810-performance-judgment.mjs",
  "scripts/build-v3810-performance-judgment-packets.mjs",
  "scripts/test-v3810-performance-judgment-tooling.mjs",
  "scripts/validate-v3810-performance-judgment-preparation.mjs",
  "scripts/validate-v3810-performance-judgment-output.mjs",
  "scripts/preregister-v3810-performance-judgment-execution.mjs",
  "scripts/validate-v3810-performance-judgment-execution-lock.mjs",
  "scripts/run-v3810-performance-judgment-initial.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.captionManifest])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await bytes(file));
const executionOutput = `${V3810_PERFORMANCE_ROOT}/initial-model-execution.json`;
const manifest = {
  schemaVersion: "3.8.10-performance-judgment-initial-execution-manifest",
  protocolId: "v3.8.10-performance-judgment-consensus",
  stage: "two-independent-score-blind-performance-passes",
  status: "frozen-six-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: preparation.inputs.workflowPath, rubric: preparation.inputs.rubricPath, manual: preparation.inputs.manualPath, sharedSchema: schemaPath, fullTranscriptRequired: true, timestampedEventsRequired: true },
  population: { debates: 3, moves: 81, movesByDebate: Object.fromEntries(preparation.packets.map((packet) => [packet.debateNumber, packet.moveCount])), highConfidenceAttributions: 81, pendingAudioVerifications: 0 },
  contexts,
  authorization: { initialPerformanceContexts: 6, initialPerformanceModelExecution: true, deterministicDisagreementExtractionAfterPass: true, performanceAdjudicationModelExecution: false, scoreDerivation: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, exactSamePacketForBothPasses: true, exactSameClosedSchemaForAllContexts: true, otherPassUnavailable: true, otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true, calculatedTotalsUnavailable: true, winnerUnavailable: true, participantAssessmentProseUnavailable: true, overallCommentaryUnavailable: true, aiExtensionUnavailable: true },
  judgmentPolicy: { responseTupleCompound: true, responseTupleFields: ["class", "decisiveTargetIds", "contactedComponents", "totalComponents"], contactedAndMissedComponentsRequiredInRationale: true, redundantFreeTextComponentSummaryFieldsProhibited: true, lockedBurdenTupleCopied: true, responseBandsEnforced: true, burdenBandsEnforced: true, charityTestedExplicit: true, untestedCharityExactly75: true, duplicateBurdenAdjustmentCaptureForcesZero: true, modelCalculatedTotalsProhibited: true, modelAssessmentProseProhibited: true },
  disagreementPolicy: { deterministic: true, responseTupleMismatchAlwaysDisputed: true, charityTestedMismatchAlwaysDisputed: true, scalarDeltaGreaterThan: 5, diagnosticMoveDeltaGreaterThan: 4, burdenAdjustmentSemanticMismatchAlwaysDisputed: true, thirdPassDisputedFieldsOnly: true, thirdPassMayChooseOnlyTwoInitialCandidates: true, finalSemanticChoiceRequiresVotes: 2 },
  audioPolicy: { mediumConfidenceRequiresCompletedAudioVerification: true, highConfidenceAttributions: 81, pendingAudioVerifications: 0 },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoveryOrNormalizationMayCountTowardGate: false },
  acceptanceRule: { validContextsRequired: 6, validMoveJudgmentsRequiredAcrossPasses: 162, singleSharedSchemaRequired: true, invalidMoveJudgmentsMaximum: 0, modelCalculatedTotalsMaximum: 0, modelAssessmentProseFieldsMaximum: 0, disagreementCountDoesNotFailInitialPhase: true },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextBlocksDisagreementExtraction: true, pendingAudioBlocksExecution: true, furtherAutomaticRetryAuthorized: false, adjudicationRequiresSeparatePhaseLock: true, scoreDerivationRemainsBlocked: true, assessmentProseRemainsBlocked: true },
  artifacts: { execution: executionOutput, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionOutput],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 6, moves: 81, moveJudgmentsAcrossPasses: 162, sharedSchemas: 1, maximumMeteredCostUsd: 0, transcriptionCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
