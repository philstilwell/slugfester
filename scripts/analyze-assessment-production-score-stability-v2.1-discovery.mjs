#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows,
} from "./lib/v42219-generalized-partition.mjs";
import {
  compileV422112CandidateBundle,
  validateV422112Discovery,
} from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/discovery";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
const preparationManifest = JSON.parse(
  await readFile(activation.preparationManifest, "utf8")
);
const sourcePreparation = JSON.parse(
  await readFile(preparationManifest.preparation, "utf8")
);
const execution = JSON.parse(
  await readFile(activation.artifacts.execution, "utf8")
);
assertV4(
  activation.authorization.analysis === true &&
    execution.status === "forty-v2.1-validation-discovery-contexts-passed" &&
    execution.contextsAttempted === 40 &&
    execution.validContexts === 40 &&
    execution.invalidContexts === 0 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.rampPassed === true &&
    execution.rampPhases.length === 3 &&
    execution.rampPhases.every((phase) => phase.passed) &&
    execution.maximumParallelContextsObserved <=
      activation.executionPolicy.maximumParallelContexts,
  "all discovery contexts must pass without retry before analysis"
);
if (shouldWrite) {
  assertV4(
    !(await exists(activation.artifacts.analysis)),
    `${activation.artifacts.analysis} already exists`
  );
  for (const file of [
    ...activation.artifacts.candidateBundles,
    ...activation.artifacts.sparseContexts,
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const debates = [];
for (const debate of sourcePreparation.contexts) {
  const [packetBytes, planBytes, eventsBytes, fullLedgerBytes] =
    await Promise.all([
      readFile(debate.packet),
      readFile(debate.plan),
      readFile(debate.originalEvents),
      readFile(debate.fullLedger),
    ]);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const outputs = [];
  for (const chunk of debate.chunks) {
    const [outputBytes, chunkBytes] = await Promise.all([
      readFile(chunk.rawOutput),
      readFile(chunk.chunkLedgerPath),
    ]);
    const output = JSON.parse(outputBytes);
    validateV422112Discovery(output, {
      packet,
      chunk,
      plan,
      eventsDocument,
      eventsBytes,
      chunkBytes,
      fullLedgerBytes,
    });
    outputs.push(output);
  }
  const bundle = compileV422112CandidateBundle({ packet, plan, outputs });
  const pro = bundle.candidates.filter((candidate) => candidate.side === "pro")
    .length;
  const con = bundle.candidates.filter((candidate) => candidate.side === "con")
    .length;
  assertV4(
    bundle.candidateCount >=
        activation.compilationPolicy.candidateMinimumPerDebate &&
      pro >= activation.compilationPolicy.candidateMinimumPerSide &&
      con >= activation.compilationPolicy.candidateMinimumPerSide,
    `${debate.debateNumber}: discovery candidate bundle is insufficient`
  );
  const rows = parseV42219Ledger(fullLedgerBytes);
  const included = new Set();
  for (const candidate of bundle.candidates) {
    for (
      let event = Math.max(
        0,
        candidate.sourceSpan.startEvent -
          activation.compilationPolicy.sparseContextFlankEvents
      );
      event <=
      Math.min(
        rows.length - 1,
        candidate.sourceSpan.endEvent +
          activation.compilationPolicy.sparseContextFlankEvents
      );
      event += 1
    ) {
      included.add(event);
    }
  }
  const sparseRows = [...included]
    .sort((left, right) => left - right)
    .map((event) => rows[event]);
  const sparseBytes = serializeV42219Rows(sparseRows);
  const bundlePath =
    `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`;
  const sparsePath =
    `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`;
  const bundleBytes = jsonBytes(bundle);
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
    constructive: bundle.candidates.filter(
      (candidate) => candidate.moveKind === "constructive"
    ).length,
    reply: bundle.candidates.filter(
      (candidate) => candidate.moveKind === "reply"
    ).length,
    mediumAttributionCandidates,
    lowAttributionCandidates,
    belowHighAttributionCandidates:
      mediumAttributionCandidates + lowAttributionCandidates,
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
      ) {
        if (!included.has(event)) return false;
      }
      return true;
    }),
    allDiscoveredCandidatesTransported: true,
    localTargetIdsModelAuthored: false,
    semanticDeduplicationPerformed: false,
    modelWorkElapsedMs: executionRows.reduce(
      (sum, result) => sum + result.elapsedMs,
      0
    ),
  });
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.1-fresh-validation-discovery-analysis",
  protocolId: activation.protocolId,
  status:
    "v2.1-validation-discovery-passed-candidate-sharded-inventory-preparation-authorized",
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  currentCanaryDisposition: { reclassified: false },
  priorV2ValidationDisposition: { passed: false },
  proposedPolicy: {
    version: "v2.1-proposal",
    everyIntegerRoundedTieAccepted: true,
    promoted: false,
  },
  debates,
  audit: {
    frozenContexts: 40,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    timeoutExtensions: 0,
    rampOneServedAsOperationalCanary: true,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    rampPassed: execution.rampPassed,
    maximumParallelContextsAllowed:
      activation.executionPolicy.maximumParallelContexts,
    maximumParallelContextsObserved:
      execution.maximumParallelContextsObserved,
    candidateStartOwnedCoreBounds:
      activation.schemaHardening.candidateStartOwnedCoreBounds,
    candidateEndAvailableContextBounds:
      activation.schemaHardening.candidateEndAvailableContextBounds,
    frozenDyadicSpeakerAllowlist:
      activation.schemaHardening.frozenDyadicSpeakerAllowlist,
    everySourceEventOwnedExactlyOnce: true,
    exactChunkReplay: true,
    localTargetIdsModelAuthored: false,
    targetTopologyDeferredToCandidateShardedInventory: true,
    repositoryDerivedMoveKind: true,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    candidateBundlesInventoryFeasible: true,
    currentCanaryReclassified: false,
    priorV2ValidationPassed: false,
    proposedPolicyPromoted: false,
    scoresDerived: 0,
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
    sparseEvents: debates.reduce(
      (sum, debate) => sum + debate.sparseEvents,
      0
    ),
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    modelContextsExecuted: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  authorization: {
    candidateShardedInventoryPreparation: true,
    inventoryExecutionActivation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
};
if (shouldWrite) {
  await writeFile(activation.artifacts.analysis, jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      debates,
      totals: analysis.totals,
      candidateShardedInventoryPreparationAuthorized: true,
      inventoryModelExecutionAuthorized: false,
      judgmentModelExecutionAuthorized: false,
      currentCanaryStillFailed: true,
      priorV2ValidationPassed: false,
      proposedPolicyPromoted: false,
      scoresDerived: 0,
    },
    null,
    2
  )
);
