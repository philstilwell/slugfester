#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.14/replacement-held-out-source-preparation/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.15/replacement-held-out-discovery";
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
assertV4(
  preparation.status === "five-replacement-held-out-source-and-hardened-discovery-contexts-prepared"
    && preparation.contexts.length === 5
    && preparation.totals.discoveryContexts === 18
    && preparation.totals.ownershipBoundedSchemas === 18
    && preparation.schemaHardening.candidateStartOwnedCoreBounds
    && preparation.schemaHardening.candidateEndAvailableContextBounds
    && preparation.authorization.discoveryExecutionManifest
    && !preparation.sourceBoundary.transcriptContentSemanticallyInspectedByPreparation,
  "held-out source preparation is unavailable",
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
  "docs/assessment-workflow-v4.2.21.17.14.md",
  "docs/assessment-workflow-v4.2.21.17.15.md",
  PREPARATION,
  preparation.inputs.sample,
  preparation.inputs.screening,
  preparation.inputs.discoveryManual,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v41-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/validate-v422112-discovery.mjs",
  "scripts/preregister-v42211715-replacement-held-out-discovery.mjs",
  "scripts/run-v42211715-replacement-held-out-discovery.mjs",
  "scripts/analyze-v42211715-replacement-held-out-discovery.mjs",
  "scripts/test-v42211715-replacement-held-out-discovery.mjs",
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
  schemaVersion: "4.2.21.17.15-replacement-held-out-discovery-execution-manifest",
  protocolId: "v4.2.21.17.15-replacement-held-out-discovery",
  status: "frozen-eighteen-replacement-held-out-discovery-contexts-authorized",
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
    expectedParallelWallMinutes: [6, 14],
    expectedSerialModelWorkMinutes: [22, 40],
    absoluteGateTimeoutMinutes: 90,
  },
  modelInputs: { manual: preparation.inputs.discoveryManual },
  preparation: PREPARATION,
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
    deterministicInputOrder: true,
    continueIndependentContextsAfterFailure: true,
    timeoutMsPerContext: 600000,
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
  attemptsMaximum: contexts.length,
  retriesMaximum: 0,
  expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
  expectedSerialModelWorkMinutes: manifest.costEstimate.expectedSerialModelWorkMinutes,
  authentication: manifest.costEstimate.authentication,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  scoresDerived: 0,
}, null, 2));
