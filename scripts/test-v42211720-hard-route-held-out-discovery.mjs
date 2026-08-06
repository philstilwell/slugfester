#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const expectedRamp = [1, 2, 4];

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assertV4(preparation.contexts.length === 5 && preparation.totals.discoveryContexts === 20, "held-out discovery source count drifted");
assertV4(preparation.totals.ownershipBoundedSchemas === 20, "hardened ownership schema count drifted");
assertV4(preparation.totals.speakerAllowlistedSchemas === 20, "speaker-allowlisted schema count drifted");
for (const debate of preparation.contexts) {
  const plan = JSON.parse(await readFile(debate.plan, "utf8"));
  validateV42219PartitionPlan(plan, await readFile(debate.fullLedger));
  assertV4(debate.chunks.length === plan.chunks.length, `${debate.debateNumber}: chunk count drifted`);
  assertV4(debate.chunks.every((chunk) => chunk.schemaOwnershipBoundsEnforced && chunk.schemaSpeakerAllowlistEnforced), `${debate.debateNumber}: schema hardening drifted`);
}

if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({
    status: "passed-prefreeze",
    debates: 5,
    contexts: 20,
    ownershipBoundedSchemas: 20,
    speakerAllowlistedSchemas: 20,
    modelContexts: 0,
    scoresDerived: 0,
  }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assertV4(manifest.contexts.length === 20, "frozen held-out context count drifted");
assertV4(
  manifest.schemaHardening.candidateStartOwnedCoreBounds
    && manifest.schemaHardening.candidateEndAvailableContextBounds
    && manifest.schemaHardening.frozenInterlocutorSpeakerAllowlist,
  "schema hardening drifted",
);
assertV4(manifest.operationalCanary.status === "retired-transport-canary-passed", "passed operational canary is required");
assertV4(manifest.operationalCanary.ageAtFreezeMs >= 0 && manifest.operationalCanary.ageAtFreezeMs <= 24 * 60 * 60 * 1000, "operational canary freshness drifted");
assertV4(manifest.executionPolicy.maximumParallelContexts === 4, "production scheduler ceiling drifted");
assertV4(JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify(expectedRamp), "scheduler ramp drifted");
assertV4(manifest.executionPolicy.eachRampPhaseMustPassBeforeExpansion && manifest.executionPolicy.abortBeforeNextRampPhaseOnFailure, "ramp stop rule drifted");
assertV4(manifest.executionPolicy.timeoutMsPerContext === 300000, "per-context timeout drifted");
assertV4(manifest.executionPolicy.retriesMaximum === 0 && !manifest.authorization.retry, "retry prohibition drifted");
assertV4(manifest.compilationPolicy.allDiscoveredCandidatesTransported, "all-candidate transport must be universal");
assertV4(!manifest.authorization.scoreDerivation && !manifest.authorization.all195Debates, "premature downstream authorization");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

if (!(await exists(manifest.artifacts.execution))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists before execution: ${future}`);
  console.log(JSON.stringify({
    status: "passed-frozen",
    debates: 5,
    contexts: 20,
    schedulerRamp: expectedRamp,
    maximumParallelContexts: 4,
    modelContexts: 0,
    scoresDerived: 0,
  }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsPlanned === 20 && execution.contextsAttempted <= 20 && execution.contextsAttempted >= 1, "execution attempt ledger drifted");
assertV4(execution.contextsUnattempted === 20 - execution.contextsAttempted, "unattempted context ledger drifted");
assertV4(execution.attempts === execution.contextsAttempted && execution.retries === 0, "attempt or retry ledger drifted");
assertV4(execution.maximumParallelContextsObserved <= 4, "scheduler exceeded frozen concurrency");
assertV4(JSON.stringify(execution.schedulerRamp) === JSON.stringify(expectedRamp), "executed scheduler ramp drifted");
assertV4(execution.rampPhases.length >= 1 && execution.rampPhases.length <= 3, "ramp phase count drifted");
assertV4(execution.rampPhases[0].phase === "ramp-one" && JSON.stringify(execution.rampPhases[0].contextIndexes) === JSON.stringify([0]), "one-context ramp phase drifted");
for (const result of execution.results) {
  assertV4(result.attemptCount === 1 && result.retryCount === 0, `${result.debateNumber}/${result.chunkId}: attempt ledger drifted`);
  if (result.rawOutputWritten) assertV4(result.rawOutputSha256 === sha256(await readFile(manifest.contexts[result.contextIndex].rawOutput)), `${result.debateNumber}/${result.chunkId}: output hash drifted`);
}

if (execution.status !== "twenty-hard-route-held-out-discovery-contexts-passed") {
  assertV4(execution.invalidContexts >= 1 && execution.validContexts + execution.invalidContexts === execution.contextsAttempted, "recorded failure totals drifted");
  if (!execution.rampPhases[0].passed) assertV4(execution.contextsAttempted === 1 && execution.contextsUnattempted === 19 && execution.rampPhases.length === 1, "ramp-one failure did not abort expansion");
  if (execution.rampPhases[0].passed && execution.rampPhases[1] && !execution.rampPhases[1].passed) {
    assertV4(execution.contextsAttempted === 3 && execution.contextsUnattempted === 17 && execution.rampPhases.length === 2, "ramp-two failure did not abort expansion");
  }
  console.log(JSON.stringify({
    status: "passed-recorded-failure",
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    rampPhases: execution.rampPhases.map(({ phase, passed }) => ({ phase, passed })),
    retries: 0,
    scoresDerived: 0,
  }, null, 2));
  process.exit(0);
}

assertV4(execution.contextsAttempted === 20 && execution.contextsUnattempted === 0, "passing execution coverage drifted");
assertV4(execution.validContexts === 20 && execution.invalidContexts === 0 && execution.results.every((result) => result.accepted), "valid context ledger drifted");
assertV4(execution.rampPassed && execution.rampPhases.length === 3 && execution.rampPhases.every((phase) => phase.passed), "passing ramp ledger drifted");
assertV4(execution.rampPhases[1].phase === "ramp-two" && execution.rampPhases[1].maximumParallelContexts === 2 && JSON.stringify(execution.rampPhases[1].contextIndexes) === JSON.stringify([1, 2]), "two-context ramp phase drifted");
assertV4(execution.rampPhases[2].phase === "steady-four" && execution.rampPhases[2].maximumParallelContexts === 4 && execution.rampPhases[2].contextIndexes.length === 17, "four-context steady phase drifted");
assertV4(execution.maximumParallelContextsObserved === 4, "passing scheduler did not exercise four-context concurrency");

if (!(await exists(manifest.artifacts.analysis))) {
  console.log(JSON.stringify({
    status: "passed-execution",
    validContexts: 20,
    retries: 0,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
    scoresDerived: 0,
  }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(manifest.artifacts.analysis, "utf8"));
assertV4(analysis.debates.length === 5 && analysis.audit.allDiscoveredCandidatesTransported, "held-out analysis coverage drifted");
assertV4(analysis.audit.operationalCanaryStatus === "retired-transport-canary-passed" && analysis.audit.rampPassed, "canary or ramp audit drifted");
assertV4(analysis.audit.frozenInterlocutorSpeakerAllowlist && analysis.audit.candidateStartOwnedCoreBounds && analysis.audit.candidateEndAvailableContextBounds, "analysis schema-hardening audit drifted");
assertV4(analysis.debates.every((debate) => debate.candidates >= 8 && debate.pro >= 4 && debate.con >= 4 && debate.candidateSpansIncluded), "held-out candidate sufficiency drifted");
assertV4(analysis.totals.scoresDerived === 0 && !analysis.authorization.independentJudgmentModelExecution, "premature judgment or score authorization");
console.log(JSON.stringify({
  status: "passed-complete",
  debates: analysis.totals.debates,
  contexts: analysis.totals.modelContextsExecuted,
  candidates: analysis.totals.candidates,
  schedulerRamp: analysis.audit.schedulerRamp,
  maximumParallelContextsObserved: analysis.audit.maximumParallelContextsObserved,
  wallElapsedMinutes: Number((analysis.totals.wallElapsedMs / 60000).toFixed(2)),
  modelWorkElapsedMinutes: Number((analysis.totals.modelWorkElapsedMs / 60000).toFixed(2)),
  retries: 0,
  scoresDerived: 0,
}, null, 2));
