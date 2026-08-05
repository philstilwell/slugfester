#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V415_PASS_B_PROTOCOL_ID, V415_PASS_B_ROOT, validateV415PassBPacket } from "./lib/v415-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const manifestPath = `${V415_PASS_B_ROOT}/execution-manifest.json`;
const executionPath = `${V415_PASS_B_ROOT}/model-execution.json`;
const assessmentPath = `${V415_PASS_B_ROOT}/assessment.md`;
const disagreementPath = `${V415_PASS_B_ROOT}/disagreements.json`;
const futurePaths = [manifestPath, executionPath, assessmentPath, disagreementPath];
if (shouldWrite) for (const future of futurePaths) {
  try {
    await access(path.resolve(root, future));
    throw new Error(`${future} already exists`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const [preparation, preflight, primaryPreparation, primaryAnalysis] = await Promise.all([
  readJson(`${V415_PASS_B_ROOT}/preparation-manifest.json`),
  readJson(`${V415_PASS_B_ROOT}/schema-preflight/model-execution.json`),
  readJson(`${V41_LEAN_ROOT}/preparation-manifest.json`),
  readJson(`${V41_LEAN_ROOT}/primary-analysis.json`)
]);
assertV4(preparation.status === "prepared-score-blind-pass-b-packets" && preparation.contexts.length === 3, "Pass B preparation invalid");
assertV4(preflight.status === "endpoint-preflight-passed" && preflight.validSyntheticContexts === 1 && preflight.attempts === 1 && preflight.retries === 0, "Pass B exact-schema preflight did not pass");
assertV4(primaryAnalysis.status === "primary-passed-ready-to-freeze-triggered-pass-b" && primaryAnalysis.totals.pendingAudioMoves === 0, "primary gate did not authorize Pass B");

const contexts = [];
for (const item of preparation.contexts) {
  const [packet, sourcePacket] = await Promise.all([readJson(item.packet), readJson(item.sourcePacket)]);
  const validation = validateV415PassBPacket(packet);
  assertV4(packet.debateNumber === item.debateNumber && sourcePacket.debateNumber === item.debateNumber, `${item.debateNumber}: packet identity mismatch`);
  contexts.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    passBPacket: item.packet,
    sourcePacket: item.sourcePacket,
    transcript: item.transcript,
    events: item.events,
    localManifest: item.localManifest,
    primaryOutput: `${V41_LEAN_ROOT}/primary-outputs/debate-${item.debateNumber}.json`,
    output: item.output,
    lockedMoves: validation.lockedMoves,
    lockedSections: validation.lockedSections
  });
}
assertV4(contexts.map((item) => item.debateNumber).join(",") === "55,103,161", "Pass B context order must remain 55,103,161");

const hiddenComparator = "docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json";
const inputFiles = [
  ...Object.values(preparation.inputs),
  `${V415_PASS_B_ROOT}/preparation-manifest.json`,
  `${V415_PASS_B_ROOT}/dry-fixture.json`,
  `${V415_PASS_B_ROOT}/schema-preflight/execution-manifest.json`,
  `${V415_PASS_B_ROOT}/schema-preflight/model-execution.json`,
  `${V415_PASS_B_ROOT}/schema-preflight/output.json`,
  `${V415_PASS_B_ROOT}/schema-preflight/assessment.md`,
  `${V41_LEAN_ROOT}/preparation-manifest.json`,
  `${V41_LEAN_ROOT}/primary-execution-manifest.json`,
  `${V41_LEAN_ROOT}/primary-model-execution.json`,
  `${V41_LEAN_ROOT}/primary-analysis.json`,
  hiddenComparator,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v415-triggered-consensus.mjs",
  "scripts/validate-v415-pass-b-output.mjs",
  "scripts/preregister-v415-pass-b-execution.mjs",
  "scripts/run-v415-pass-b-execution.mjs",
  ...contexts.flatMap((context) => [context.passBPacket, context.sourcePacket, context.transcript, context.events, context.localManifest, context.primaryOutput])
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(inputFiles)]) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));

const manifest = {
  schemaVersion: "4.1.5-triggered-pass-b-execution-manifest",
  protocolId: V415_PASS_B_PROTOCOL_ID,
  stage: "one-score-blind-high-effort-pass-b-per-triggered-debate",
  status: "frozen-three-pass-b-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: preparation.inputs,
  contexts,
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
  hiddenPostRunReferences: {
    primaryOutputs: contexts.map((context) => context.primaryOutput),
    primaryAnalysis: `${V41_LEAN_ROOT}/primary-analysis.json`,
    comparator: hiddenComparator,
    visibleToPassBModel: false
  },
  executionPolicy: {
    contexts: 3,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    failFastAfterFirstInvalidContext: true,
    perInvocationTimeoutMs: 1200000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    recoveryOrNormalizationMayCountAsRetry: false
  },
  judgmentPolicy: {
    completeTranscriptRequired: true,
    lockedInventoryAndWeightsRequired: true,
    lockedMoveOrderRequired: true,
    primaryJudgmentsProhibited: true,
    calculatedTotalsProhibited: true,
    publicationProseProhibited: true,
    responseConsistencyPassRequired: true,
    burdenReferenceResolutionRequired: true,
    charityConsistencyPassRequired: true,
    burdenAdjustmentDuplicateExclusionRequired: true,
    mediumOrLowAttributionRequiresAudioBeforeDisagreementExtraction: true
  },
  authorization: {
    passBModelExecution: true,
    deterministicValidationAfterEachContext: true,
    audioVerificationAfterPassBIfRequired: true,
    disagreementExtraction: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    heldOutGate: false,
    all195Debates: false
  },
  stopRules: {
    hashMismatchBlocksExecution: true,
    preexistingOutputBlocksExecution: true,
    invalidContextStopsRemainingContexts: true,
    retryAuthorized: false,
    normalizationAuthorized: false,
    mediumOrLowAttributionBlocksDisagreementExtractionPendingAudio: true
  },
  artifacts: { execution: executionPath, assessment: assessmentPath, disagreements: disagreementPath, outputs: contexts.map((context) => context.output) },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionPath, assessmentPath, disagreementPath],
  sourceHashes
};

if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  manifest: manifestPath,
  contexts: manifest.executionPolicy.contexts,
  lockedMoves: contexts.reduce((sum, item) => sum + item.lockedMoves, 0),
  attemptsPerContext: 1,
  retriesMaximum: 0,
  failFast: true,
  reasoningEffort: manifest.model.reasoningEffort,
  primaryJudgmentsHidden: true,
  comparatorHidden: true,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0
}, null, 2));
