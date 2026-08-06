#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.10/held-out-source-preparation/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.11/held-out-discovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assertV4(preparation.contexts.length === 5 && preparation.totals.discoveryContexts === 17, "held-out discovery source count drifted");
for (const debate of preparation.contexts) {
  const plan = JSON.parse(await readFile(debate.plan, "utf8"));
  validateV42219PartitionPlan(plan, await readFile(debate.fullLedger));
  assertV4(debate.chunks.length === plan.chunks.length, `${debate.debateNumber}: chunk count drifted`);
}

if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "passed-prefreeze", debates: 5, contexts: 17, modelContexts: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assertV4(manifest.contexts.length === 17, "frozen held-out context count drifted");
assertV4(manifest.executionPolicy.maximumParallelContexts === 4, "production scheduler ceiling drifted");
assertV4(manifest.executionPolicy.retriesMaximum === 0 && !manifest.authorization.retry, "retry prohibition drifted");
assertV4(manifest.compilationPolicy.allDiscoveredCandidatesTransported, "all-candidate transport must be universal");
assertV4(!manifest.authorization.scoreDerivation && !manifest.authorization.all195Debates, "premature downstream authorization");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}

if (!(await exists(manifest.artifacts.execution))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists before execution: ${future}`);
  console.log(JSON.stringify({ status: "passed-frozen", debates: 5, contexts: 17, maximumParallelContexts: 4, modelContexts: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.contextsAttempted === 17 && execution.retries === 0, "execution attempt ledger drifted");
assertV4(execution.maximumParallelContextsObserved <= 4, "scheduler exceeded frozen concurrency");
if (execution.status !== "seventeen-held-out-discovery-contexts-passed") {
  console.log(JSON.stringify({ status: "passed-recorded-failure", validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
assertV4(execution.validContexts === 17 && execution.results.every((result) => result.accepted), "valid context ledger drifted");
for (const result of execution.results) assertV4(result.rawOutputSha256 === sha256(await readFile(manifest.contexts[result.contextIndex].rawOutput)), `${result.debateNumber}/${result.chunkId}: output hash drifted`);

if (!(await exists(manifest.artifacts.analysis))) {
  console.log(JSON.stringify({ status: "passed-execution", validContexts: 17, retries: 0, wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(manifest.artifacts.analysis, "utf8"));
assertV4(analysis.debates.length === 5 && analysis.audit.allDiscoveredCandidatesTransported, "held-out analysis coverage drifted");
assertV4(analysis.debates.every((debate) => debate.candidates >= 8 && debate.pro >= 4 && debate.con >= 4 && debate.candidateSpansIncluded), "held-out candidate sufficiency drifted");
assertV4(analysis.totals.scoresDerived === 0 && !analysis.authorization.independentJudgmentModelExecution, "premature judgment or score authorization");
console.log(JSON.stringify({
  status: "passed-complete",
  debates: analysis.totals.debates,
  contexts: analysis.totals.modelContextsExecuted,
  candidates: analysis.totals.candidates,
  maximumParallelContextsObserved: analysis.audit.maximumParallelContextsObserved,
  wallElapsedMinutes: Number((analysis.totals.wallElapsedMs / 60000).toFixed(2)),
  modelWorkElapsedMinutes: Number((analysis.totals.modelWorkElapsedMs / 60000).toFixed(2)),
  retries: 0,
  scoresDerived: 0,
}, null, 2));
