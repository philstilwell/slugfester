#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(PREPARATION));
assertV4(preparation.contexts.length === 5 && preparation.totals.candidates === 189 && preparation.totals.maximumCopiedInputBytes <= 115000, "inventory preparation drifted");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "passed-prefreeze", contexts: 5, candidates: 189, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(MANIFEST));
assertV4(manifest.status === "frozen-five-hard-route-score-blind-inventory-contexts-authorized" && manifest.contexts.length === 5, "frozen inventory manifest drifted");
assertV4(JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify([1, 2]) && manifest.executionPolicy.maximumParallelContexts === 2 && manifest.executionPolicy.timeoutMsPerContext === 600000, "inventory scheduler drifted");
assertV4(manifest.executionPolicy.retriesMaximum === 0 && !manifest.authorization.retry && !manifest.authorization.scoreDerivation, "inventory execution boundary drifted");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
if (!(await exists(manifest.artifacts.execution))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists before execution: ${future}`);
  console.log(JSON.stringify({ status: "passed-frozen", contexts: 5, schedulerRamp: [1, 2], modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const execution = JSON.parse(await readFile(manifest.artifacts.execution));
assertV4(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 5 && execution.contextsUnattempted === 5 - execution.contextsAttempted && execution.retries === 0, "inventory attempt ledger drifted");
assertV4(execution.maximumParallelContextsObserved <= 2 && execution.rampPhases.length >= 1 && execution.rampPhases.length <= 3, "inventory scheduler execution drifted");
if (execution.status !== "five-hard-route-score-blind-inventory-contexts-passed") {
  assertV4(execution.invalidContexts >= 1 && execution.validContexts + execution.invalidContexts === execution.contextsAttempted, "recorded inventory failure totals drifted");
  if (!execution.rampPhases[0].passed) assertV4(execution.contextsAttempted === 1 && execution.rampPhases.length === 1, "ramp-one failure did not abort expansion");
  if (execution.rampPhases[0].passed && execution.rampPhases[1] && !execution.rampPhases[1].passed) assertV4(execution.contextsAttempted === 3 && execution.rampPhases.length === 2, "ramp-two failure did not abort expansion");
  console.log(JSON.stringify({ status: "passed-recorded-failure", contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
assertV4(execution.contextsAttempted === 5 && execution.contextsUnattempted === 0 && execution.validContexts === 5 && execution.invalidContexts === 0 && execution.results.every((result) => result.accepted), "passing inventory execution drifted");
assertV4(execution.rampPassed && execution.rampPhases.length === 3 && execution.rampPhases.every((phase) => phase.passed) && execution.maximumParallelContextsObserved === 2, "passing inventory ramp drifted");
for (const result of execution.results) {
  const context = manifest.contexts[result.contextIndex];
  assertV4(result.proposalSha256 === sha256(await readFile(context.proposalOutput)) && result.lockedInventorySha256 === sha256(await readFile(context.lockedInventoryOutput)), `${result.debateNumber}: inventory output hash drifted`);
}
if (!(await exists(manifest.artifacts.analysis))) {
  console.log(JSON.stringify({ status: "passed-execution", validContexts: 5, wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(manifest.artifacts.analysis));
assertV4(analysis.status === "five-hard-route-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized" && analysis.debates.length === 5, "inventory analysis status drifted");
assertV4(analysis.debates.every((debate) => debate.moves >= 8 && debate.moves <= 24 && debate.proMoves >= 4 && debate.conMoves >= 4 && debate.finalEvidenceSourceExact && debate.ratingsAbsent && debate.responseTopologyAbsent), "inventory analysis acceptance drifted");
assertV4(analysis.totals.scoresDerived === 0 && analysis.authorization.independentJudgmentPacketPreparation && !analysis.authorization.independentJudgmentModelExecution && !analysis.authorization.all195Debates, "premature downstream authorization");
console.log(JSON.stringify({
  status: "passed-complete",
  debates: analysis.totals.debates,
  candidatesAvailable: analysis.totals.candidatesAvailable,
  movesLocked: analysis.totals.movesLocked,
  wallElapsedMinutes: Number((analysis.execution.wallElapsedMs / 60000).toFixed(2)),
  modelWorkElapsedMinutes: Number((analysis.execution.modelWorkElapsedMs / 60000).toFixed(2)),
  retries: 0,
  scoresDerived: 0,
}, null, 2));
