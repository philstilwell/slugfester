#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, containsProhibitedCalculatedField } from "./lib/v41-lean-production.mjs";
import { V419_MODEL, V419_PROTOCOL_ID, V419_ROOT } from "./lib/v419-schema-bounded-source.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V419_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V419_ROOT}/primary-model-execution.json`;
const analysisPath = `${V419_ROOT}/primary-analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [preparation, sample] = await Promise.all([
  readFile(path.resolve(root, `${V419_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(root, `${V419_ROOT}/source-only-sample.json`), "utf8").then(JSON.parse)
]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.debates === 6 && preparation.authorization.deterministicFixtures && !preparation.authorization.primaryModelExecution, "v4.1.9 preparation invalid");
assertV4(sample.status === "frozen-before-legacy-score-access" && sample.audit.v417Overlap + sample.audit.v418Overlap === 0 && !sample.selectionBoundary.legacyScoresAccessed, "v4.1.9 sample blindness invalid");

const contexts = [];
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(path.resolve(root, item.packet), "utf8"));
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: source-only packet contains calculated fields`);
  contexts.push({ debateNumber: item.debateNumber, debateId: item.debateId, family: item.family, durationSeconds: item.durationSeconds, controlSampleSelected: item.controlSampleSelected, packet: item.packet, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, manifest: packet.sourceChain.localManifestPath, rawOutput: item.rawOutput, compiledOutput: item.compiledOutput });
}
const sourceFiles = [
  ...Object.values(preparation.inputs),
  `${V419_ROOT}/source-only-sample.json`,
  `${V419_ROOT}/preparation-manifest.json`,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v417-fresh-validation.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v419-schema-bounded-source.mjs",
  "scripts/validate-v419-primary-output.mjs",
  "scripts/test-v419-schema-bounded-source.mjs",
  "scripts/test-v419-primary-tooling.mjs",
  "scripts/build-v419-fresh-packets.mjs",
  "scripts/preregister-v419-primary-execution.mjs",
  "scripts/run-v419-primary-execution.mjs",
  "scripts/analyze-v419-primary.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.manifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.9-schema-bounded-primary-execution-manifest",
  protocolId: V419_PROTOCOL_ID,
  stage: "six-source-blind-schema-bounded-event-aware-primary-judgments",
  status: "frozen-six-context-primary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V419_MODEL.label, slug: V419_MODEL.slug, reasoningEffort: V419_MODEL.primaryReasoningEffort },
  modelInputs: preparation.inputs,
  comparatorBoundary: { legacyComparatorPathIncluded: false, legacyScoresUnavailable: true, legacyWinnersUnavailable: true, legacyAssessmentContentUnavailable: true, v417JudgmentsUnavailable: true, v418JudgmentsUnavailable: true, comparisonAuthorizedAfterFinalScoreLockOnly: true },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, priorPrimaryOutputsUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  judgmentPolicy: { completeTranscriptRequired: true, completeTimestampedEventsRequired: true, eventFileHashRequired: true, repositoryOwnedSourceTimes: true, modelSuppliedSourceMillisecondsProhibited: true, excerptTokensMinimum: 12, excerptTokensMaximum: 100, excerptCharactersMaximum: 600, minimumLexicalRecall: 0.8, minimumOrderedCoverage: 0.8, boundedMovesMinimum: 8, boundedMovesMaximum: 24, sectionsMinimum: 4, sectionsMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2, inventoryCompressionMayRaiseRating: false, chronologyDerivedFromSourceSpans: true, preSubmissionCrossFieldChecklistRequired: true, burdenTierCopiedFromReferencedBridge: true, allCalculatedTotalsProhibited: true, publicationProseProhibited: true, mediumOrLowAttributionRequiresAudioBeforePassB: true },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, deterministicTimeCompilationAfterValidation: true, provisionalTriggerCalculationAfterAllContexts: true, scoreArtifact: false, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, automaticRetryAuthorized: false, judgmentOutputNormalizationAuthorized: false, mechanicalTimeCompilationAuthorized: true, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, rawOutputs: contexts.map((context) => context.rawOutput), compiledOutputs: contexts.map((context) => context.compiledOutput) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.flatMap((context) => [context.rawOutput, context.compiledOutput]), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, timeoutMinutes: 30, primaryReasoningEffort: manifest.model.reasoningEffort, comparatorHidden: true, eventAwareValidationRequired: true, excerptMaximumCharacters: 600, excerptMaximumTokens: 100, repositoryOwnedSourceTimes: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
