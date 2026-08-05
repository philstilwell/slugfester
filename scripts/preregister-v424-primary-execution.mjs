#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, containsProhibitedCalculatedField } from "./lib/v41-lean-production.mjs";
import { V424_PROTOCOL_ID, V424_ROOT } from "./lib/v424-screened-chronology-fresh.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V424_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V424_ROOT}/primary-model-execution.json`;
const analysisPath = `${V424_ROOT}/primary-analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [preparation, sample, screening] = await Promise.all(["preparation-manifest.json", "source-only-sample.json", "sample-screening.json"].map((file) => readFile(path.resolve(root, V424_ROOT, file), "utf8").then(JSON.parse)));
assertV4(preparation.status === "prepared-six-screened-chronology-compact-contexts" && preparation.totals.debates === 6 && preparation.authorization.deterministicFixtures && !preparation.authorization.primaryModelExecution, "v4.2.4 preparation invalid");
assertV4(sample.status === "frozen-pending-source-only-semantic-screening" && sample.audit.priorFreshGateOverlap === 0 && !sample.selectionBoundary.legacyAssessmentContentAccessed, "v4.2.4 sample blindness invalid");
assertV4(screening.status === "sample-screened-packet-preparation-authorized" && screening.audit.substantiveFamilies === 6, "v4.2.4 source-only screening invalid");

const contexts = [];
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(path.resolve(root, item.packet), "utf8"));
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: compact source packet contains calculated fields`);
  assertV4(packet.modelInputBoundary.oneChronologicalMoveInventoryRequired && packet.modelInputBoundary.plainTranscriptDeliveredToModel === false && packet.modelInputBoundary.originalEventsFileDeliveredToModel === false && packet.transportChain.replayExactToOriginalEvents, `${item.debateNumber}: compact chronology boundary invalid`);
  contexts.push({ debateNumber: item.debateNumber, debateId: item.debateId, family: item.family, durationSeconds: item.durationSeconds, controlSampleSelected: item.controlSampleSelected, compactCopiedInputBytes: item.compactCopiedInputBytes, packet: item.packet, sourceLedger: item.sourceLedger, originalTranscript: packet.sourceChain.transcriptPath, originalEvents: packet.sourceChain.eventsPath, originalManifest: packet.sourceChain.localManifestPath, rawOutput: item.rawOutput, compiledOutput: item.compiledOutput });
}
const sourceFiles = [
  "docs/assessment-workflow-v4.2.4.md",
  ...Object.values(preparation.inputs),
  `${V424_ROOT}/source-only-sample.json`, `${V424_ROOT}/sample-screening.json`, `${V424_ROOT}/preparation-manifest.json`,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v417-fresh-validation.mjs", "scripts/lib/v418-source-integrity.mjs", "scripts/lib/v419-schema-bounded-source.mjs", "scripts/lib/v42-compact-transport.mjs", "scripts/lib/v421-compact-fresh.mjs", "scripts/lib/v422-chronology-first.mjs", "scripts/lib/v423-chronology-fresh.mjs", "scripts/lib/v424-source-classification.mjs", "scripts/lib/v424-screened-chronology-fresh.mjs",
  "scripts/build-v424-fresh-packets.mjs", "scripts/test-v424-screened-chronology.mjs", "scripts/test-v424-primary-tooling.mjs", "scripts/validate-v424-primary-output.mjs", "scripts/preregister-v424-primary-execution.mjs", "scripts/run-v424-primary-execution.mjs", "scripts/analyze-v424-primary.mjs",
  ...contexts.flatMap((context) => [context.packet, context.sourceLedger, context.originalTranscript, context.originalEvents, context.originalManifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.2.4-screened-chronology-primary-execution-manifest",
  protocolId: V424_PROTOCOL_ID,
  stage: "six-source-blind-screened-chronology-compact-primary-judgments",
  status: "frozen-six-screened-chronology-context-primary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true, AIOnly: true, dyadicOnly: true,
  model: { label: preparation.model.label, slug: preparation.model.slug, reasoningEffort: preparation.model.primaryReasoningEffort },
  modelInputs: preparation.inputs,
  comparatorBoundary: { legacyComparatorPathIncluded: false, legacyScoresUnavailable: true, legacyWinnersUnavailable: true, legacyAssessmentContentUnavailable: true, earlierFreshGateJudgmentsUnavailable: true, comparisonAuthorizedAfterFinalScoreLockOnly: true },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, duplicatePlainTranscriptUnavailable: true, originalEventsUnavailable: true, completeLosslessSourceLedgerAvailable: true, historicalWorkflowStackUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, priorPrimaryOutputsUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  judgmentPolicy: { completeTimestampedSourceLedgerRequired: true, compactLedgerReplayExactRequired: true, originalEventFileHashRequired: true, repositoryOwnedSourceTimes: true, modelSuppliedSourceMillisecondsProhibited: true, excerptTokensMinimum: 12, excerptTokensMaximum: 100, excerptCharactersMaximum: 600, minimumLexicalRecall: 0.8, minimumOrderedCoverage: 0.8, chronologicalTopLevelMoveInventoryRequired: true, replyTargetsMustAlreadyAppear: true, boundedMovesMinimum: 8, boundedMovesMaximum: 24, sectionsMinimum: 4, sectionsMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2, inventoryCompressionMayRaiseRating: false, preSubmissionCrossFieldChecklistRequired: true, burdenTierCopiedFromReferencedBridge: true, allCalculatedTotalsProhibited: true, publicationProseProhibited: true, mediumOrLowAttributionRequiresAudioBeforePassB: true },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, deterministicTimeCompilationAfterValidation: true, provisionalTriggerCalculationAfterAllContexts: true, scoreArtifact: false, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, sourceLedgerHashOrReplayMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, automaticRetryAuthorized: false, judgmentOutputNormalizationAuthorized: false, automaticRetargetingAuthorized: false, mechanicalTimeCompilationAuthorized: true, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutputs: contexts.map((context) => context.rawOutput), compiledOutputs: contexts.map((context) => context.compiledOutput) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.flatMap((context) => [context.rawOutput, context.compiledOutput]), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, timeoutMinutesPerContext: 30, primaryReasoningEffort: manifest.model.reasoningEffort, comparatorHidden: true, compactLedgerOnly: true, chronologyFirst: true, originalTranscriptCopiedToModel: false, originalEventsCopiedToModel: false, meanCompactCopiedInputBytes: preparation.totals.meanCompactCopiedInputBytes, maximumCompactCopiedInputBytes: preparation.totals.maximumCompactCopiedInputBytes, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
