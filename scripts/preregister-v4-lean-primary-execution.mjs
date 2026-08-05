#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V4_LEAN_ROOT, assertV4, containsProhibitedCalculatedField, readJson } from "./lib/v4-lean-production.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V4_LEAN_ROOT}/primary-execution-manifest.json`;
const executionPath = `${V4_LEAN_ROOT}/primary-model-execution.json`;
const analysisPath = `${V4_LEAN_ROOT}/primary-analysis.json`;
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const [preparation, fixture, preflight] = await Promise.all([
  readJson(`${V4_LEAN_ROOT}/preparation-manifest.json`),
  readJson(`${V4_LEAN_ROOT}/dry-fixture.json`),
  readJson(`${V4_LEAN_ROOT}/schema-preflight/model-execution.json`)
]);
assertV4(preparation.status === "prepared-source-only-no-model-execution" && preparation.totals.debates === 3, "preparation invalid");
assertV4(fixture.status === "passed" && fixture.computeProjection.centralTargetPassed, "fixture or compute projection invalid");
assertV4(preflight.status === "endpoint-preflight-passed" && preflight.validSyntheticContexts === 1 && preflight.attempts === 1 && preflight.retries === 0, "exact-schema preflight did not pass cleanly");
const contexts = [];
for (const item of preparation.debates) {
  const packet = await readJson(item.packet);
  assertV4(!containsProhibitedCalculatedField(packet), `${item.debateNumber}: source-only packet contains calculated fields`);
  contexts.push({ debateNumber: item.debateNumber, debateId: item.debateId, controlSampleSelected: item.controlSampleSelected, packet: item.packet, transcript: packet.sourceChain.transcriptPath, events: packet.sourceChain.eventsPath, manifest: packet.sourceChain.localManifestPath, output: item.output });
}
const sourceFiles = [
  preparation.inputs.workflowBase,
  preparation.inputs.workflow,
  preparation.inputs.rubricBase,
  preparation.inputs.rubric,
  preparation.inputs.manual,
  preparation.inputs.schema,
  `${V4_LEAN_ROOT}/preregistration.md`,
  `${V4_LEAN_ROOT}/gate-manifest.json`,
  `${V4_LEAN_ROOT}/preparation-manifest.json`,
  `${V4_LEAN_ROOT}/dry-fixture.json`,
  `${V4_LEAN_ROOT}/schema-preflight/execution-manifest.json`,
  `${V4_LEAN_ROOT}/schema-preflight/model-execution.json`,
  `${V4_LEAN_ROOT}/schema-preflight/output.json`,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/validate-v4-lean-primary-output.mjs",
  "scripts/preregister-v4-lean-primary-execution.mjs",
  "scripts/run-v4-lean-primary-execution.mjs",
  "scripts/analyze-v4-lean-primary.mjs",
  ...contexts.flatMap((context) => [context.packet, context.transcript, context.events, context.manifest])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.0.1-lean-primary-execution-manifest",
  protocolId: "v4.0.1-lean-risk-triggered-consensus",
  stage: "one-integrated-score-blind-primary-per-debate",
  status: "frozen-three-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: preparation.inputs,
  contexts,
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, otherDebatesUnavailable: true, controlSelectionUnavailable: true, legacyAssessmentsUnavailable: true, priorStructuralLocksUnavailable: true, priorScoresAndWinnersUnavailable: true, participantAssessmentProseUnavailable: true },
  executionPolicy: { contexts: 3, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0, recoveryOrNormalizationMayCountTowardGate: false },
  judgmentPolicy: { completeTranscriptRequired: true, integratedRoutesSectionsMovesAndRatings: true, modelPrecisionScalarProhibited: true, modelCalibrationScalarProhibited: true, allCalculatedTotalsProhibited: true, publicationProseProhibited: true, mediumOrLowAttributionRequiresAudioBeforePassB: true },
  authorization: { primaryModelExecution: true, deterministicValidationAfterEachContext: true, provisionalScoreDerivationAfterAllContexts: true, passBModelExecution: false, adjudicationModelExecution: false, reconstruction: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  stopRules: { hashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextFailsGate: true, retryAuthorized: false, normalizationAuthorized: false, pendingRequiredAudioBlocksPassB: true },
  artifacts: { execution: executionPath, analysis: analysisPath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionPath, analysisPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: contexts.length, attemptsPerContext: 1, retriesMaximum: 0, controlSelectionHidden: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 }, null, 2));
