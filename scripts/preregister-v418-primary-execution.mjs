#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, containsProhibitedCalculatedField } from "./lib/v41-lean-production.mjs";
import { V418_MODEL, V418_PROTOCOL_ID, V418_ROOT } from "./lib/v418-source-integrity.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V418_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V418_ROOT}/primary-model-execution.json`;
const analysisPath = `${V418_ROOT}/primary-analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(future)), `${future} already exists`);

const [preparation, sample] = await Promise.all([
  readFile(path.resolve(root, `${V418_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(root, `${V418_ROOT}/source-only-sample.json`), "utf8").then(JSON.parse)
]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.debates === 6 && preparation.authorization.deterministicFixtures && !preparation.authorization.primaryModelExecution, "v4.1.8 preparation invalid");
assertV4(sample.status === "frozen-before-legacy-score-access" && sample.audit.v417Overlap === 0 && !sample.selectionBoundary.legacyScoresAccessed, "v4.1.8 sample blindness invalid");

const contexts = [];
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(path.resolve(root, item.packet), "utf8"));
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: source-only packet contains calculated fields`);
  contexts.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    family: item.family,
    durationSeconds: item.durationSeconds,
    controlSampleSelected: item.controlSampleSelected,
    packet: item.packet,
    transcript: packet.sourceChain.transcriptPath,
    events: packet.sourceChain.eventsPath,
    manifest: packet.sourceChain.localManifestPath,
    rawOutput: item.rawOutput,
    compiledOutput: item.compiledOutput
  });
}

const sourceFiles = [
  ...Object.values(preparation.inputs),
  `${V418_ROOT}/source-only-sample.json`,
  `${V418_ROOT}/preparation-manifest.json`,
  `${V418_ROOT}/source-integrity-threshold-diagnostic.json`,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v417-fresh-validation.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/validate-v418-primary-output.mjs",
  "scripts/test-v418-source-integrity.mjs",
  "scripts/test-v418-primary-tooling.mjs",
  "scripts/build-v418-fresh-packets.mjs",
  "scripts/preregister-v418-primary-execution.mjs",
  "scripts/run-v418-primary-execution.mjs",
  "scripts/analyze-v418-primary.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.manifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));

const manifest = {
  schemaVersion: "4.1.8-source-integrity-primary-execution-manifest",
  protocolId: V418_PROTOCOL_ID,
  stage: "six-source-blind-event-aware-primary-judgments",
  status: "frozen-six-context-primary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V418_MODEL.label, slug: V418_MODEL.slug, reasoningEffort: V418_MODEL.primaryReasoningEffort },
  modelInputs: preparation.inputs,
  comparatorBoundary: { legacyComparatorPathIncluded: false, legacyScoresUnavailable: true, legacyWinnersUnavailable: true, legacyAssessmentContentUnavailable: true, v417JudgmentsUnavailable: true, comparisonAuthorizedAfterFinalScoreLockOnly: true },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, priorPrimaryOutputsUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: {
    contexts: 6,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    failFastAfterFirstInvalidContext: true,
    perInvocationTimeoutMs: 1800000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionApiCalls: 0,
    transcriptionCostUsdMaximum: 0,
    recoverableStreamEventsNormalMaximum: 2,
    recoverableStreamEventsHardMaximum: 8
  },
  judgmentPolicy: {
    completeTranscriptRequired: true,
    completeTimestampedEventsRequired: true,
    eventFileHashRequired: true,
    repositoryOwnedSourceTimes: true,
    modelSuppliedSourceMillisecondsProhibited: true,
    excerptTokensMinimum: 12,
    excerptTokensMaximum: 90,
    minimumLexicalRecall: 0.8,
    minimumOrderedCoverage: 0.8,
    boundedMovesMinimum: 8,
    boundedMovesMaximum: 24,
    sectionsMinimum: 4,
    sectionsMaximum: 6,
    movesPerSidePerSectionMinimum: 1,
    movesPerSidePerSectionMaximum: 2,
    inventoryCompressionMayRaiseRating: false,
    chronologyDerivedFromSourceSpans: true,
    preSubmissionCrossFieldChecklistRequired: true,
    burdenTierCopiedFromReferencedBridge: true,
    allCalculatedTotalsProhibited: true,
    publicationProseProhibited: true,
    mediumOrLowAttributionRequiresAudioBeforePassB: true
  },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, deterministicTimeCompilationAfterValidation: true, provisionalTriggerCalculationAfterAllContexts: true, scoreArtifact: false, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, automaticRetryAuthorized: false, judgmentOutputNormalizationAuthorized: false, mechanicalTimeCompilationAuthorized: true, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutputs: contexts.map((context) => context.rawOutput), compiledOutputs: contexts.map((context) => context.compiledOutput) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.flatMap((context) => [context.rawOutput, context.compiledOutput]), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  contexts: 6,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutMinutes: 30,
  primaryReasoningEffort: manifest.model.reasoningEffort,
  comparatorHidden: true,
  eventAwareValidationRequired: true,
  repositoryOwnedSourceTimes: true,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
