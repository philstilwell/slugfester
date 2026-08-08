#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows
} from "./lib/v42219-generalized-partition.mjs";
import {
  compileV422112CandidateBundle,
  validateV422112Discovery
} from "./lib/v422112-simplified-discovery.mjs";

const ROOT = "docs/assessment-production/canary-v1-discovery";
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(
  execution.status === "thirty-six-production-canary-discovery-contexts-passed" &&
    execution.validContexts === manifest.contexts.length &&
    execution.invalidContexts === 0 &&
    execution.retries === 0 &&
    execution.rampPassed === true &&
    execution.maximumParallelContextsObserved <= manifest.executionPolicy.maximumParallelContexts,
  "all production canary discovery contexts must pass without retry before analysis"
);

const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
const debates = [];
for (const debate of preparation.contexts) {
  const [packetBytes, planBytes, eventsBytes, fullLedgerBytes] = await Promise.all([
    readFile(debate.packet),
    readFile(debate.plan),
    readFile(debate.originalEvents),
    readFile(debate.fullLedger)
  ]);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const outputs = [];
  for (const chunk of debate.chunks) {
    const [outputBytes, chunkBytes] = await Promise.all([
      readFile(chunk.rawOutput),
      readFile(chunk.chunkLedgerPath)
    ]);
    const output = JSON.parse(outputBytes);
    validateV422112Discovery(output, {
      packet,
      chunk,
      plan,
      eventsDocument,
      eventsBytes,
      chunkBytes,
      fullLedgerBytes
    });
    outputs.push(output);
  }

  const bundle = compileV422112CandidateBundle({ packet, plan, outputs });
  const pro = bundle.candidates.filter((candidate) => candidate.side === "pro").length;
  const con = bundle.candidates.filter((candidate) => candidate.side === "con").length;
  assertV4(
    bundle.candidateCount >= manifest.compilationPolicy.candidateMinimumPerDebate &&
      pro >= manifest.compilationPolicy.candidateMinimumPerSide &&
      con >= manifest.compilationPolicy.candidateMinimumPerSide,
    `${debate.debateNumber}: discovery inventory is insufficient for the inventory-locking stage`
  );

  const rows = parseV42219Ledger(fullLedgerBytes);
  const included = new Set();
  for (const candidate of bundle.candidates) {
    for (
      let event = Math.max(
        0,
        candidate.sourceSpan.startEvent - manifest.compilationPolicy.sparseContextFlankEvents
      );
      event <= Math.min(
        rows.length - 1,
        candidate.sourceSpan.endEvent + manifest.compilationPolicy.sparseContextFlankEvents
      );
      event += 1
    ) included.add(event);
  }
  const sparseRows = [...included]
    .sort((left, right) => left - right)
    .map((event) => rows[event]);
  const sparseBytes = serializeV42219Rows(sparseRows);
  const bundlePath = `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`;
  const sparsePath = `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`;
  const bundleBytes = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`);
  if (shouldWrite) {
    await mkdir(path.dirname(bundlePath), { recursive: true });
    await mkdir(path.dirname(sparsePath), { recursive: true });
    await writeFile(bundlePath, bundleBytes);
    await writeFile(sparsePath, sparseBytes);
  }

  const executionRows = execution.results.filter(
    (result) => result.debateNumber === debate.debateNumber
  );
  const mediumAttributionCandidates = bundle.candidates.filter(
    (candidate) => candidate.attributionConfidence === "medium"
  ).length;
  const lowAttributionCandidates = bundle.candidates.filter(
    (candidate) => candidate.attributionConfidence === "low"
  ).length;
  debates.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    family: debate.family,
    sourceComplexityBand: debate.sourceComplexityBand,
    chunks: debate.chunks.length,
    candidates: bundle.candidateCount,
    pro,
    con,
    constructive: bundle.candidates.filter((candidate) => candidate.moveKind === "constructive").length,
    reply: bundle.candidates.filter((candidate) => candidate.moveKind === "reply").length,
    mediumAttributionCandidates,
    lowAttributionCandidates,
    belowHighAttributionCandidates: mediumAttributionCandidates + lowAttributionCandidates,
    selectedBelowHighCandidatesRequireLaterAudioVerification: true,
    bundlePath,
    bundleSha256: sha256(bundleBytes),
    sparsePath,
    sparseEvents: sparseRows.length,
    sparseBytes: sparseBytes.length,
    sparseSha256: sha256(sparseBytes),
    candidateSpansIncluded: bundle.candidates.every((candidate) => {
      for (
        let event = candidate.sourceSpan.startEvent;
        event <= candidate.sourceSpan.endEvent;
        event += 1
      ) if (!included.has(event)) return false;
      return true;
    }),
    allDiscoveredCandidatesTransported: true,
    localTargetIdsModelAuthored: false,
    semanticDeduplicationPerformed: false,
    modelWorkElapsedMs: executionRows.reduce((sum, result) => sum + result.elapsedMs, 0)
  });
}

const analysis = {
  schemaVersion: "1.0-production-canary-discovery-analysis",
  protocolId: manifest.protocolId,
  status: "production-canary-discovery-passed-inventory-packet-preparation-authorized",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  debates,
  audit: {
    frozenContexts: manifest.contexts.length,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: execution.retries,
    rampOneServedAsOperationalCanary: true,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    rampPassed: execution.rampPassed,
    maximumParallelContextsAllowed: manifest.executionPolicy.maximumParallelContexts,
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    candidateStartOwnedCoreBounds: manifest.schemaHardening.candidateStartOwnedCoreBounds,
    candidateEndAvailableContextBounds: manifest.schemaHardening.candidateEndAvailableContextBounds,
    frozenDyadicSpeakerAllowlist: manifest.schemaHardening.frozenDyadicSpeakerAllowlist,
    everySourceEventOwnedExactlyOnce: true,
    exactChunkReplay: true,
    localTargetIdsModelAuthored: false,
    targetTopologyDeferredToInventoryLock: true,
    repositoryDerivedMoveKind: true,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    candidateBundlesInventoryFeasible: true,
    scoresDerived: 0
  },
  totals: {
    debates: debates.length,
    candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
    pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
    con: debates.reduce((sum, debate) => sum + debate.con, 0),
    belowHighAttributionCandidates: debates.reduce(
      (sum, debate) => sum + debate.belowHighAttributionCandidates,
      0
    ),
    sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0),
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    modelContextsExecuted: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    inventoryPacketPreparation: true,
    inventoryExecutionManifest: false,
    inventoryModelExecution: false,
    independentJudgmentExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
if (shouldWrite) {
  await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  debates,
  totals: analysis.totals,
  inventoryPacketPreparationAuthorized: true,
  inventoryModelExecutionAuthorized: false,
  scoresDerived: 0,
  productionMutationAuthorized: false
}, null, 2));
