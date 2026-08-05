#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, containsProhibitedCalculatedField, readJson } from "./lib/v41-lean-production.mjs";
import { V417_MODEL, V417_PROTOCOL_ID, V417_ROOT } from "./lib/v417-fresh-validation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V417_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V417_ROOT}/primary-model-execution.json`;
const analysisPath = `${V417_ROOT}/primary-analysis.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [preparation, sample] = await Promise.all([readJson(`${V417_ROOT}/preparation-manifest.json`), readJson(`${V417_ROOT}/source-only-sample.json`)]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.debates === 6 && preparation.authorization.deterministicFixtures && !preparation.authorization.primaryModelExecution, "preparation invalid");
assertV4(sample.status === "frozen-before-legacy-score-access" && !sample.selectionBoundary.legacyScoresAccessed, "sample blindness invalid");
const contexts = [];
for (const item of preparation.debates) {
  const packet = await readJson(item.packet);
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: source-only packet contains calculated fields`);
  contexts.push({ debateNumber: item.debateNumber, debateId: item.debateId, family: item.family, durationSeconds: item.durationSeconds, controlSampleSelected: item.controlSampleSelected, packet: item.packet, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, manifest: packet.sourceChain.localManifestPath, output: item.output });
}
const sourceFiles = [
  ...Object.values(preparation.inputs), `${V417_ROOT}/source-only-sample.json`, `${V417_ROOT}/preparation-manifest.json`, "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/lib/v417-fresh-validation.mjs", "scripts/validate-v417-primary-output.mjs", "scripts/test-v417-primary-tooling.mjs", "scripts/preregister-v417-primary-execution.mjs", "scripts/run-v417-primary-execution.mjs", "scripts/analyze-v417-primary.mjs", ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.manifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.7-fresh-six-primary-execution-manifest",
  protocolId: V417_PROTOCOL_ID,
  stage: "six-source-blind-bounded-primary-judgments",
  status: "frozen-six-context-primary-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V417_MODEL.label, slug: V417_MODEL.slug, reasoningEffort: V417_MODEL.primaryReasoningEffort },
  modelInputs: preparation.inputs,
  comparatorBoundary: { legacyComparatorPathIncluded: false, legacyScoresUnavailable: true, legacyWinnersUnavailable: true, legacyAssessmentContentUnavailable: true, comparisonAuthorizedAfterFinalScoreLockOnly: true },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, oneDebatePerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionApiCalls: 0, transcriptionCostUsdMaximum: 0, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8 },
  judgmentPolicy: { completeTranscriptRequired: true, completeTimestampedEventsRequired: true, boundedMovesMinimum: 8, boundedMovesMaximum: 24, sectionsMinimum: 4, sectionsMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2, inventoryCompressionMayRaiseRating: false, chronologyDerivedFromSourceSpans: true, preSubmissionCrossFieldChecklistRequired: true, burdenTierCopiedFromReferencedBridge: true, allCalculatedTotalsProhibited: true, publicationProseProhibited: true, mediumOrLowAttributionRequiresAudioBeforePassB: true },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, provisionalTriggerCalculationAfterAllContexts: true, scoreArtifact: false, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, automaticRetryAuthorized: false, outputNormalizationAuthorized: false, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, timeoutMinutes: 30, primaryReasoningEffort: manifest.model.reasoningEffort, comparatorHidden: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
