#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  validateV42219ChunkLedger,
  validateV42219PartitionPlan
} from "./lib/v42219-generalized-partition.mjs";

const PREPARATION = "docs/assessment-production/canary-v1-source-preparation/preparation-manifest.json";
const ROOT = "docs/assessment-production/canary-v1-discovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const expectedRamp = [1, 2, 4];

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assertV4(preparation.productionCanary && preparation.stagingOnly, "production canary staging lock drifted");
assertV4(preparation.contexts.length === 10, "production canary debate count drifted");
assertV4(preparation.totals.discoveryContexts === 36, "production canary discovery context count drifted");
assertV4(preparation.totals.ownershipBoundedSchemas === 36, "ownership-bounded schema count drifted");
assertV4(preparation.totals.speakerAllowlistedSchemas === 36, "speaker-allowlisted schema count drifted");
for (const debate of preparation.contexts) {
  const [planBytes, fullLedgerBytes] = await Promise.all([
    readFile(debate.plan),
    readFile(debate.fullLedger)
  ]);
  const plan = JSON.parse(planBytes);
  validateV42219PartitionPlan(plan, fullLedgerBytes);
  assertV4(debate.chunks.length === plan.chunks.length, `${debate.debateNumber}: chunk count drifted`);
  for (const chunk of debate.chunks) {
    assertV4(
      chunk.schemaOwnershipBoundsEnforced && chunk.schemaSpeakerAllowlistEnforced,
      `${debate.debateNumber}/${chunk.chunkId}: schema hardening drifted`
    );
    validateV42219ChunkLedger(await readFile(chunk.chunkLedgerPath), fullLedgerBytes, chunk);
  }
}

if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({
    status: "passed-prefreeze",
    debates: 10,
    contexts: 36,
    ownershipBoundedSchemas: 36,
    speakerAllowlistedSchemas: 36,
    modelContexts: 0,
    scoresDerived: 0,
    productionMutation: false
  }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assertV4(
  manifest.status === "frozen-thirty-six-production-canary-discovery-contexts-authorized",
  "unexpected production canary discovery manifest status"
);
assertV4(manifest.productionCanary && manifest.stagingOnly, "frozen staging boundary drifted");
assertV4(manifest.contexts.length === 36, "frozen discovery context count drifted");
assertV4(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol", "frozen model identity drifted");
assertV4(manifest.model.reasoningEffort === "low", "frozen reasoning effort drifted");
assertV4(manifest.costEstimate.authentication === "ChatGPT subscription", "subscription authentication drifted");
assertV4(manifest.costEstimate.meteredApiCostUsdMaximum === 0, "metered API cost boundary drifted");
assertV4(manifest.costEstimate.transcriptionCostUsdMaximum === 0, "transcription cost boundary drifted");
assertV4(manifest.executionPolicy.maximumParallelContexts === 4, "scheduler ceiling drifted");
assertV4(JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify(expectedRamp), "scheduler ramp drifted");
assertV4(manifest.executionPolicy.rampOneServesAsOperationalCanary, "operational canary ramp drifted");
assertV4(
  manifest.executionPolicy.eachRampPhaseMustPassBeforeExpansion &&
    manifest.executionPolicy.abortBeforeNextRampPhaseOnFailure,
  "ramp stop rule drifted"
);
assertV4(manifest.executionPolicy.timeoutMsPerContext === 300000, "per-context timeout drifted");
assertV4(manifest.executionPolicy.absoluteGateTimeoutMs === 7200000, "absolute timeout drifted");
assertV4(manifest.executionPolicy.retriesMaximum === 0 && !manifest.authorization.retry, "retry prohibition drifted");
assertV4(manifest.compilationPolicy.allDiscoveredCandidatesTransported, "all-candidate transport drifted");
assertV4(!manifest.compilationPolicy.silentSemanticDeduplication, "semantic deduplication must remain prohibited");
assertV4(manifest.compilationPolicy.selectedTargetTopologyDeferredToInventoryLock, "target-topology ownership drifted");
assertV4(
  manifest.schemaHardening.candidateStartOwnedCoreBounds &&
    manifest.schemaHardening.candidateEndAvailableContextBounds &&
    manifest.schemaHardening.frozenDyadicSpeakerAllowlist &&
    manifest.schemaHardening.stagingOnlyCalibrationFlagRequired,
  "schema-hardening boundary drifted"
);
assertV4(
  !manifest.authorization.inventoryModelExecution &&
    !manifest.authorization.independentJudgmentExecution &&
    !manifest.authorization.audioVerification &&
    !manifest.authorization.adjudicationExecution &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.publicationFinalization &&
    !manifest.authorization.productionMutation &&
    !manifest.authorization.remainingProductionBatches,
  "premature downstream authorization"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

if (!(await exists(manifest.artifacts.execution))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output exists before discovery execution: ${future}`);
  }
  console.log(JSON.stringify({
    status: "passed-frozen",
    debates: 10,
    contexts: 36,
    schedulerRamp: expectedRamp,
    maximumParallelContexts: 4,
    operationalCanary: "first-real-context",
    expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
    expectedAggregateComputeHours: manifest.costEstimate.expectedAggregateComputeHours,
    authentication: manifest.costEstimate.authentication,
    modelContextsExecuted: 0,
    scoresDerived: 0,
    productionMutation: false
  }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(
  execution.contextsPlanned === 36 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 36,
  "execution attempt coverage drifted"
);
assertV4(execution.contextsUnattempted === 36 - execution.contextsAttempted, "unattempted count drifted");
assertV4(execution.attempts === execution.contextsAttempted && execution.retries === 0, "attempt ledger drifted");
assertV4(execution.maximumParallelContextsObserved <= 4, "execution exceeded concurrency ceiling");
assertV4(JSON.stringify(execution.schedulerRamp) === JSON.stringify(expectedRamp), "executed ramp drifted");
assertV4(execution.rampPhases.length >= 1 && execution.rampPhases.length <= 3, "ramp phase count drifted");
assertV4(
  execution.rampPhases[0].phase === "operational-canary-one" &&
    JSON.stringify(execution.rampPhases[0].contextIndexes) === JSON.stringify([0]),
  "operational canary phase drifted"
);
for (const result of execution.results) {
  assertV4(result.attemptCount === 1 && result.retryCount === 0, `${result.debateNumber}/${result.chunkId}: retry ledger drifted`);
  if (result.rawOutputWritten) {
    assertV4(
      result.rawOutputSha256 === sha256(await readFile(manifest.contexts[result.contextIndex].rawOutput)),
      `${result.debateNumber}/${result.chunkId}: raw output hash drifted`
    );
  }
}

if (execution.status !== "thirty-six-production-canary-discovery-contexts-passed") {
  assertV4(execution.invalidContexts >= 1, "failed execution must record an invalid context");
  if (!execution.rampPhases[0].passed) {
    assertV4(execution.contextsAttempted === 1 && execution.contextsUnattempted === 35, "operational-canary failure did not abort expansion");
  }
  if (execution.rampPhases[0].passed && execution.rampPhases[1] && !execution.rampPhases[1].passed) {
    assertV4(execution.contextsAttempted === 3 && execution.contextsUnattempted === 33, "ramp-two failure did not abort expansion");
  }
  console.log(JSON.stringify({
    status: "passed-recorded-failure",
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    scoresDerived: 0,
    productionMutation: false
  }, null, 2));
  process.exit(0);
}

assertV4(execution.contextsAttempted === 36 && execution.contextsUnattempted === 0, "passing execution coverage drifted");
assertV4(execution.validContexts === 36 && execution.invalidContexts === 0, "valid context ledger drifted");
assertV4(execution.rampPassed && execution.rampPhases.length === 3, "passing ramp ledger drifted");
assertV4(execution.rampPhases.every((phase) => phase.passed), "a passing execution contains a failed ramp phase");
assertV4(execution.maximumParallelContextsObserved === 4, "passing execution did not exercise concurrency four");

if (!(await exists(manifest.artifacts.analysis))) {
  console.log(JSON.stringify({
    status: "passed-execution",
    validContexts: 36,
    retries: 0,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
    aggregateModelMinutes: Number((execution.modelWorkElapsedMs / 60000).toFixed(2)),
    scoresDerived: 0,
    productionMutation: false
  }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(manifest.artifacts.analysis, "utf8"));
assertV4(analysis.debates.length === 10, "discovery analysis debate count drifted");
assertV4(analysis.audit.allDiscoveredCandidatesTransported, "candidate transport audit drifted");
assertV4(analysis.audit.rampPassed && analysis.audit.rampOneServedAsOperationalCanary, "ramp audit drifted");
assertV4(
  analysis.debates.every((debate) =>
    debate.candidates >= 8 &&
    debate.pro >= 4 &&
    debate.con >= 4 &&
    debate.candidateSpansIncluded
  ),
  "candidate sufficiency drifted"
);
assertV4(
  analysis.authorization.inventoryPacketPreparation &&
    !analysis.authorization.inventoryModelExecution &&
    !analysis.authorization.scoreDerivation &&
    !analysis.authorization.productionMutation,
  "analysis authorization drifted"
);
console.log(JSON.stringify({
  status: "passed-complete",
  debates: analysis.totals.debates,
  contexts: analysis.totals.modelContextsExecuted,
  candidates: analysis.totals.candidates,
  belowHighAttributionCandidates: analysis.totals.belowHighAttributionCandidates,
  wallElapsedMinutes: Number((analysis.totals.wallElapsedMs / 60000).toFixed(2)),
  aggregateModelMinutes: Number((analysis.totals.modelWorkElapsedMs / 60000).toFixed(2)),
  retries: 0,
  scoresDerived: 0,
  productionMutation: false
}, null, 2));
