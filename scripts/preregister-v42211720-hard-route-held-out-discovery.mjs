#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json";
const CANARY_MANIFEST = "docs/calibration/v4.2.21.17.17/transport-canary/canary-manifest.json";
const CANARY_EXECUTION = "docs/calibration/v4.2.21.17.17/transport-canary/model-execution.json";
const CANARY_RESULT = "docs/calibration/v4.2.21.17.17/transport-canary/result.json";
const ROOT = "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;

assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
if (shouldWrite) {
  for (const file of [MANIFEST, EXECUTION, ANALYSIS]) {
    await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
  }
}

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
const canaryManifest = JSON.parse(await readFile(CANARY_MANIFEST, "utf8"));
const canaryExecution = JSON.parse(await readFile(CANARY_EXECUTION, "utf8"));
assertV4(
  preparation.status === "five-hard-route-held-out-source-and-hardened-discovery-contexts-prepared"
    && preparation.contexts.length === 5
    && preparation.totals.discoveryContexts === 20
    && preparation.totals.ownershipBoundedSchemas === 20
    && preparation.totals.speakerAllowlistedSchemas === 20
    && preparation.schemaHardening.candidateStartOwnedCoreBounds
    && preparation.schemaHardening.candidateEndAvailableContextBounds
    && preparation.authorization.discoveryExecutionManifest
    && !preparation.sourceBoundary.transcriptContentSemanticallyInspectedByPreparation,
  "held-out source preparation is unavailable",
);
assertV4(
  canaryManifest.status === "frozen-one-retired-transport-canary-authorized"
    && canaryExecution.status === "retired-transport-canary-passed"
    && canaryExecution.accepted
    && canaryExecution.authorization.rampedHeldOutLaunch
    && Date.parse(canaryExecution.completedAt) < Date.parse(frozenAt)
    && Date.parse(frozenAt) - Date.parse(canaryExecution.completedAt) <= 24 * 60 * 60 * 1000,
  "a passed retired transport canary no more than 24 hours old is required",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = preparation.contexts.flatMap((debate) => debate.chunks.map((chunk) => ({
  debateNumber: debate.debateNumber,
  debateId: debate.debateId,
  frozenRoute: debate.frozenRoute,
  partitionSeverity: debate.partitionSeverity,
  packet: debate.packet,
  plan: debate.plan,
  fullLedger: debate.fullLedger,
  originalEvents: debate.originalEvents,
  chunkId: chunk.chunkId,
  coreStartEvent: chunk.coreStartEvent,
  coreEndEvent: chunk.coreEndEvent,
  contextStartEvent: chunk.contextStartEvent,
  contextEndEvent: chunk.contextEndEvent,
  chunkLedgerPath: chunk.chunkLedgerPath,
  chunkLedgerSha256: chunk.chunkLedgerSha256,
  schemaPath: chunk.schemaPath,
  schemaSha256: chunk.schemaSha256,
  copiedInputBytes: chunk.copiedInputBytes,
  rawOutput: chunk.rawOutput,
})));

const bundlePaths = preparation.contexts.flatMap((debate) => [
  `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`,
  `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`,
]);
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.19.md",
  "docs/assessment-workflow-v4.2.21.17.20.md",
  PREPARATION,
  preparation.inputs.sample,
  preparation.inputs.screening,
  preparation.inputs.discoveryManual,
  CANARY_MANIFEST,
  CANARY_EXECUTION,
  CANARY_RESULT,
  "docs/calibration/v4.2.21.17.16/discovery-transport-attribution-hardening/failure-analysis.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/validate-v422112-discovery.mjs",
  "scripts/preregister-v42211720-hard-route-held-out-discovery.mjs",
  "scripts/run-v42211720-hard-route-held-out-discovery.mjs",
  "scripts/analyze-v42211720-hard-route-held-out-discovery.mjs",
  "scripts/test-v42211720-hard-route-held-out-discovery.mjs",
  ...preparation.contexts.flatMap((debate) => [
    debate.packet,
    debate.plan,
    debate.fullLedger,
    debate.originalEvents,
    ...debate.chunks.flatMap((chunk) => [chunk.chunkLedgerPath, chunk.schemaPath]),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const futureOutputs = [
  ...contexts.map((context) => context.rawOutput),
  ...bundlePaths,
  EXECUTION,
  ANALYSIS,
];
const manifest = {
  schemaVersion: "4.2.21.17.20-hard-route-held-out-discovery-execution-manifest",
  protocolId: "v4.2.21.17.20-hard-route-held-out-discovery",
  status: "frozen-twenty-hard-route-held-out-discovery-contexts-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  heldOut: true,
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    expectedParallelWallMinutes: [7, 16],
    expectedSerialModelWorkMinutes: [25, 45],
    absoluteGateTimeoutMinutes: 90,
  },
  modelInputs: { manual: preparation.inputs.discoveryManual },
  preparation: PREPARATION,
  operationalCanary: {
    manifest: CANARY_MANIFEST,
    execution: CANARY_EXECUTION,
    result: CANARY_RESULT,
    status: canaryExecution.status,
    completedAt: canaryExecution.completedAt,
    ageAtFreezeMs: Date.parse(frozenAt) - Date.parse(canaryExecution.completedAt),
    consumedByProtocolId: "v4.2.21.17.20-hard-route-held-out-discovery",
  },
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneChunkPerContext: true,
    otherChunksUnavailable: true,
    otherOutputsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersUnavailable: true,
    publicationProseUnavailable: true,
  },
  executionPolicy: {
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    maximumParallelContexts: 4,
    schedulerRamp: [1, 2, 4],
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeNextRampPhaseOnFailure: true,
    deterministicInputOrder: true,
    continueIndependentContextsAfterFailure: true,
    timeoutMsPerContext: 300000,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
  },
  compilationPolicy: {
    allContextsMustValidate: true,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    repositoryDerivedMoveKindOnly: true,
    localTargetIdsAbsent: true,
    selectedTargetTopologyDeferredToIndependentJudgment: true,
    sparseContextFlankEvents: 12,
    sparseSourceRowsMayDeduplicate: true,
    candidateMinimumPerDebate: 8,
    candidateMinimumPerSide: 4,
    scoresDerived: false,
  },
  schemaHardening: {
    candidateStartOwnedCoreBounds: true,
    candidateEndAvailableContextBounds: true,
    frozenInterlocutorSpeakerAllowlist: true,
    deterministicValidatorRetained: true,
  },
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCandidateCompilation: true,
    analysis: true,
    retry: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
  artifacts: {
    execution: EXECUTION,
    analysis: ANALYSIS,
    candidateBundles: bundlePaths.filter((file) => file.includes("candidate-bundles")),
    sparseContexts: bundlePaths.filter((file) => file.includes("candidate-context")),
    rawOutputs: contexts.map((context) => context.rawOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  debates: preparation.contexts.map((debate) => debate.debateNumber),
  contexts: contexts.length,
  maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  operationalCanary: manifest.operationalCanary.status,
  attemptsMaximum: contexts.length,
  retriesMaximum: 0,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedSerialModelWorkMinutes: manifest.costEstimate.expectedSerialModelWorkMinutes,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0,
}, null, 2));
