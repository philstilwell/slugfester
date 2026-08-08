#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-inventory";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));

assertV4(
  preparation.contexts.length === 10 &&
    preparation.totals.candidates === 322 &&
    preparation.totals.maximumCopiedInputBytes <= 115000,
  "inventory preparation drifted"
);
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({
    status: "passed-prefreeze",
    contexts: 10,
    candidates: 322,
    modelContextsExecuted: 0,
    scoresDerived: 0
  }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assertV4(
  manifest.status === "frozen-ten-production-canary-score-blind-inventory-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.contexts.length === 10,
  "frozen inventory manifest drifted"
);
assertV4(
  JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify([1, 2]) &&
    manifest.executionPolicy.maximumParallelContexts === 2 &&
    manifest.executionPolicy.timeoutMsPerContext === 600000 &&
    manifest.executionPolicy.absoluteGateTimeoutMs === 3600000 &&
    manifest.executionPolicy.rampOneServesAsOperationalCanary === true,
  "inventory scheduler or timeout drifted"
);
assertV4(
  manifest.executionPolicy.retriesMaximum === 0 &&
    manifest.executionPolicy.attemptsPerContext === 1 &&
    manifest.authorization.modelContexts === true &&
    manifest.authorization.deterministicValidation === true &&
    manifest.authorization.deterministicCompilation === true &&
    !manifest.authorization.retry &&
    !manifest.authorization.semanticCorrection &&
    !manifest.authorization.independentJudgmentPacketPreparation &&
    !manifest.authorization.independentJudgmentModelExecution &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.productionMutation &&
    !manifest.authorization.remainingProductionBatches,
  "inventory execution authorization boundary drifted"
);
assertV4(
  manifest.model.label === "5.6 Sol" &&
    manifest.model.slug === "gpt-5.6-sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.executionEnvironment.authentication === "ChatGPT subscription" &&
    manifest.costEstimate.meteredApiCostUsdMaximum === 0 &&
    manifest.costEstimate.transcriptionCostUsdMaximum === 0,
  "model, authentication, or cost lock drifted"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

if (!(await exists(manifest.artifacts.execution))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output exists before inventory execution: ${future}`);
  }
  console.log(JSON.stringify({
    status: "passed-frozen",
    debates: 10,
    contexts: 10,
    candidates: 322,
    schedulerRamp: [1, 2],
    maximumParallelContexts: 2,
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
  execution.contextsPlanned === 10 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 10 &&
    execution.contextsUnattempted === 10 - execution.contextsAttempted &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0,
  "inventory attempt ledger drifted"
);
assertV4(
  execution.maximumParallelContextsObserved <= 2 &&
    JSON.stringify(execution.schedulerRamp) === JSON.stringify([1, 2]) &&
    execution.rampPhases.length >= 1 &&
    execution.rampPhases.length <= 3,
  "inventory scheduler execution drifted"
);
assertV4(
  execution.rampPhases[0].phase === "operational-canary-one" &&
    JSON.stringify(execution.rampPhases[0].contextIndexes) === JSON.stringify([0]),
  "inventory operational-canary phase drifted"
);
for (const result of execution.results) {
  assertV4(result.attemptCount === 1 && result.retryCount === 0, `${result.debateNumber}: retry ledger drifted`);
  if (result.proposalWritten) {
    assertV4(
      result.proposalSha256 === sha256(await readFile(manifest.contexts[result.contextIndex].proposalOutput)),
      `${result.debateNumber}: proposal hash drifted`
    );
  }
}

if (execution.status !== "ten-production-canary-score-blind-inventory-contexts-passed") {
  assertV4(execution.invalidContexts >= 1, "failed execution must record an invalid context");
  if (!execution.rampPhases[0].passed) {
    assertV4(execution.contextsAttempted === 1 && execution.contextsUnattempted === 9, "operational-canary failure did not abort expansion");
  }
  if (execution.rampPhases[0].passed && execution.rampPhases[1] && !execution.rampPhases[1].passed) {
    assertV4(execution.contextsAttempted === 3 && execution.contextsUnattempted === 7, "ramp-two failure did not abort expansion");
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

assertV4(
  execution.contextsAttempted === 10 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 10 &&
    execution.invalidContexts === 0 &&
    execution.results.every((result) => result.accepted),
  "passing inventory execution drifted"
);
assertV4(
  execution.rampPassed &&
    execution.rampPhases.length === 3 &&
    execution.rampPhases.every((phase) => phase.passed) &&
    execution.maximumParallelContextsObserved === 2,
  "passing inventory ramp drifted"
);
for (const result of execution.results) {
  const context = manifest.contexts[result.contextIndex];
  assertV4(
    result.lockedInventorySha256 === sha256(await readFile(context.lockedInventoryOutput)) &&
      result.validationSha256 === sha256(await readFile(context.validationOutput)) &&
      result.provenanceSha256 === sha256(await readFile(context.provenanceOutput)),
    `${result.debateNumber}: compiled inventory artifact hash drifted`
  );
}

if (!(await exists(manifest.artifacts.analysis))) {
  console.log(JSON.stringify({
    status: "passed-execution",
    validContexts: 10,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
    aggregateModelMinutes: Number((execution.modelWorkElapsedMs / 60000).toFixed(2)),
    retries: 0,
    scoresDerived: 0,
    productionMutation: false
  }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(manifest.artifacts.analysis, "utf8"));
assertV4(
  analysis.status === "ten-production-canary-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" &&
    analysis.debates.length === 10 &&
    analysis.acceptance.passed === true,
  "inventory analysis status drifted"
);
assertV4(
  analysis.debates.every((debate) =>
    debate.moves >= 8 &&
    debate.moves <= 24 &&
    debate.proMoves >= 4 &&
    debate.conMoves >= 4 &&
    debate.finalEvidenceSourceExact &&
    debate.ratingsAbsent &&
    debate.responseTopologyAbsent
  ),
  "inventory analysis acceptance drifted"
);
assertV4(
  analysis.totals.scoresDerived === 0 &&
    analysis.authorization.independentJudgmentPacketPreparation &&
    !analysis.authorization.independentJudgmentModelExecution &&
    !analysis.authorization.scoreDerivation &&
    !analysis.authorization.productionMutation &&
    !analysis.authorization.remainingProductionBatches,
  "premature downstream authorization"
);
console.log(JSON.stringify({
  status: "passed-complete",
  debates: analysis.totals.debates,
  candidatesAvailable: analysis.totals.candidatesAvailable,
  movesLocked: analysis.totals.movesLocked,
  pendingAudioVerificationMoves: analysis.totals.pendingAudioVerificationMoves,
  wallElapsedMinutes: Number((analysis.execution.wallElapsedMs / 60000).toFixed(2)),
  aggregateModelMinutes: Number((analysis.execution.modelWorkElapsedMs / 60000).toFixed(2)),
  retries: 0,
  scoresDerived: 0,
  productionMutation: false
}, null, 2));
