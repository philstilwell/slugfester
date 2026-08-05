#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, V41_MODEL, V41_PROTOCOL_ID, assertV4, containsProhibitedCalculatedField, readJson } from "./lib/v41-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V41_LEAN_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V41_LEAN_ROOT}/primary-model-execution.json`;
const analysisPath = `${V41_LEAN_ROOT}/primary-analysis.json`;
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const [preparation, fixture, preflight] = await Promise.all([readJson(`${V41_LEAN_ROOT}/preparation-manifest.json`), readJson(`${V41_LEAN_ROOT}/dry-fixture.json`), readJson(`${V41_LEAN_ROOT}/schema-preflight/model-execution.json`)]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.debates === 3, "preparation invalid");
assertV4(fixture.status === "passed" && fixture.computeProjection.central.centralTargetPassed && fixture.computeProjection.conservative.conservativeCeilingPassed, "fixture or compute projection invalid");
assertV4(preflight.status === "endpoint-preflight-passed" && preflight.validSyntheticContexts === 1 && preflight.attempts === 1 && preflight.retries === 0, "exact-schema preflight did not pass cleanly");
const contexts = [];
for (const item of preparation.debates) {
  const packet = await readJson(item.packet);
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: source-only packet contains calculated fields`);
  contexts.push({ debateNumber: item.debateNumber, debateId: item.debateId, controlSampleSelected: item.controlSampleSelected, packet: item.packet, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, manifest: packet.sourceChain.localManifestPath, output: item.output });
}
const comparator = "docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json";
const sourceFiles = [
  ...Object.values(preparation.inputs),
  `${V41_LEAN_ROOT}/preparation-manifest.json`, `${V41_LEAN_ROOT}/dry-fixture.json`, `${V41_LEAN_ROOT}/schema-preflight/execution-manifest.json`, `${V41_LEAN_ROOT}/schema-preflight/model-execution.json`, `${V41_LEAN_ROOT}/schema-preflight/output.json`, comparator,
  "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v41-lean-production.mjs", "scripts/validate-v41-lean-primary-output.mjs", "scripts/preregister-v411-lean-primary-execution.mjs", "scripts/run-v411-lean-primary-execution.mjs", "scripts/analyze-v411-lean-primary.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.manifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.2-bounded-primary-execution-manifest",
  protocolId: V41_PROTOCOL_ID,
  stage: "one-bounded-score-blind-primary-per-debate",
  status: "frozen-three-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: V41_MODEL.label, slug: V41_MODEL.slug, reasoningEffort: V41_MODEL.primaryReasoningEffort },
  modelInputs: preparation.inputs,
  comparator: { path: comparator, visibleToModel: false, requiredWinnerPreservation: true, maximumAbsoluteSideDelta: 5 },
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, comparatorUnavailable: true, highEffortReferencesUnavailable: true, legacyAssessmentsUnavailable: true, priorScoresAndWinnersUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, failFastAfterFirstInvalidContext: true, perInvocationTimeoutMs: 1200000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoveryOrNormalizationMayCountTowardGate: false },
  judgmentPolicy: { completeTranscriptRequired: true, boundedMovesMinimum: 8, boundedMovesMaximum: 24, sectionsMinimum: 4, sectionsMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2, modelSequenceProhibited: true, chronologyDerivedFromSourceSpans: true, modelPrecisionScalarProhibited: true, modelCalibrationScalarProhibited: true, allCalculatedTotalsProhibited: true, publicationProseProhibited: true, mediumOrLowAttributionRequiresAudioBeforePassB: true },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, provisionalScoreDerivationAfterAllContexts: true, passBModelExecution: false, adjudicationModelExecution: false, reconstruction: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  stopRules: { hashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextStopsRemainingContexts: true, retryAuthorized: false, normalizationAuthorized: false, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, failFast: true, primaryReasoningEffort: manifest.model.reasoningEffort, comparatorHidden: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
