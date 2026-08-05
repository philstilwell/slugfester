#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V4171_AUDIO_ADJ_PROTOCOL_ID, V4171_AUDIO_ADJ_ROOT } from "./lib/v4171-audio-adjudication.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V4171_AUDIO_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${V4171_AUDIO_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${V4171_AUDIO_ADJ_ROOT}/analysis.json`;
const assessmentPath = `${V4171_AUDIO_ADJ_ROOT}/assessment.md`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, executionPath, analysisPath, assessmentPath, `${V4171_AUDIO_ADJ_ROOT}/output.json`]) assertV4(!(await exists(future)), `${future} already exists`);
const [preparation, packet, failedAudio, blockedPostAudio] = await Promise.all([
  readJson(`${V4171_AUDIO_ADJ_ROOT}/preparation-manifest.json`),
  readJson(`${V4171_AUDIO_ADJ_ROOT}/packet.json`),
  readJson(`${V417_PASS_B_ROOT}/audio-verification.json`),
  readJson(`${V417_PASS_B_ROOT}/post-audio-analysis.json`)
]);
assertV4(preparation.status === "prepared-one-debate-two-disputed-attributions" && preparation.moves.length === 2, "audio adjudication preparation invalid");
assertV4(failedAudio.status === "failed-one-or-more-attributions-unresolved" && failedAudio.totals.unresolved === 2, "frozen audio failure unavailable");
assertV4(blockedPostAudio.status === "blocked-unresolved-audio-attribution" && !blockedPostAudio.authorization.disagreementExtraction, "blocked post-audio state unavailable");
const sourceFiles = [
  ...Object.values(preparation.inputs).flat(), `${V4171_AUDIO_ADJ_ROOT}/preparation-manifest.json`,
  `${V417_PASS_B_ROOT}/audio-verification-plan.json`, `${V417_PASS_B_ROOT}/audio-model-execution.json`, `${V417_PASS_B_ROOT}/audio-analysis-failure.json`, `${V417_PASS_B_ROOT}/audio-analysis-amendment.json`, `${V417_PASS_B_ROOT}/audio-verification.json`, `${V417_PASS_B_ROOT}/post-audio-analysis.json`,
  "scripts/lib/v4171-audio-adjudication.mjs", "scripts/build-v4171-audio-adjudication.mjs", "scripts/test-v4171-audio-adjudication.mjs", "scripts/validate-v4171-audio-adjudication-output.mjs", "scripts/preregister-v4171-audio-adjudication-execution.mjs", "scripts/run-v4171-audio-adjudication-execution.mjs", "scripts/analyze-v4171-audio-adjudication.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.7.1-audio-attribution-adjudication-execution-manifest",
  protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID,
  stage: "one-debate-two-field-audio-attribution-adjudication",
  status: "frozen-one-isolated-audio-adjudication-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: preparation.model,
  context: { debateNumber: packet.debateNumber, debateId: packet.debateId, packet: preparation.inputs.packet, schema: preparation.inputs.schema, workflow: preparation.inputs.workflow, manual: preparation.inputs.manual, rawDiarizedTranscripts: preparation.inputs.rawDiarizedTranscripts, output: preparation.output, disputedMoves: packet.moves.map((move) => move.moveId) },
  isolation: { freshTemporaryCodexHome: true, freshSourceDirectory: true, onlyDisputedAttributionFieldsVisible: true, ratingsUnavailable: true, scoresUnavailable: true, triggerReasonsUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, publicationProseUnavailable: true },
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, perInvocationTimeoutMs: 1800000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, paidTranscriptionCalls: 0, paidTranscriptionCostUsdMaximum: 0 },
  decisionPolicy: { expectedSpeakerAndPropositionLocked: true, rawDiarizedTranscriptHashesLocked: true, mixedSpeakerSpanMayVerify: true, verifiedRequiresHighConfidence: true, verifiedRequiresExpectedSpeakerEvidence: true, unresolvedBlocksDownstream: true, manualOverrideAuthorized: false, deterministicThresholdRelaxationAuthorized: false },
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false },
  authorization: { modelExecution: true, deterministicValidation: true, disagreementExtraction: false, ratingAdjudication: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidOutputBlocksDownstream: true, retryAuthorized: false, normalizationAuthorized: false, unresolvedDecisionBlocksDownstream: true },
  artifacts: { execution: executionPath, analysis: analysisPath, assessment: assessmentPath, output: preparation.output },
  futureOutputPathsExcludedFromSourceHashes: [preparation.output, executionPath, analysisPath, assessmentPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", contexts: 1, debateNumber: packet.debateNumber, disputedMoves: packet.moves.length, attempts: 1, retriesMaximum: 0, reasoningEffort: preparation.model.reasoningEffort, subscriptionCompute: true, meteredApiCostUsdMaximum: 0, paidTranscriptionCalls: 0, legacyAccessed: false }, null, 2));
