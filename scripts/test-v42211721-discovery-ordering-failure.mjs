#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const OUTPUT = "docs/calibration/v4.2.21.17.21/discovery-ordering-failure/failure-analysis.json";
const exists = await access(OUTPUT).then(() => true, () => false);
if (!exists) {
  console.log(JSON.stringify({ status: "passed-preanalysis", modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(OUTPUT));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(analysis.status === "ordering-only-failure-confirmed-order-invariant-validator-development-authorized", "failure analysis status drifted");
assertV4(analysis.heldOutGateDisposition === "failed-and-not-retried" && !analysis.recommendation.acceptV42211720AsPassed && !analysis.recommendation.retryV42211720, "failed gate disposition drifted");
assertV4(analysis.failure.contextIndex === 5 && analysis.failure.debateNumber === "63" && analysis.failure.chunkId === "chunk-001", "failed context identity drifted");
assertV4(analysis.failure.transportPassed && analysis.failure.rawOutputPreserved && !analysis.failure.semanticCorrectionPerformed && !analysis.failure.retryPerformed, "failure classification drifted");
assertV4(analysis.replay.contexts.length === 20 && analysis.replay.contextsReordered === 1, "ordering replay coverage drifted");
assertV4(analysis.replay.allTwentyValidateUnderCanonicalOrdering && analysis.replay.allCandidateFieldsPreservedExactly && analysis.replay.rawAndOrderedCompilationCanonicallyIdenticalForAllDebates, "order-only proof drifted");
assertV4(analysis.replay.contexts.filter((context) => !context.rawChronologyCanonical).every((context) => context.contextIndex === 5), "ordering defect isolation drifted");
assertV4(analysis.replay.debateBundles.length === 5 && analysis.replay.debateBundles.every((debate) => debate.rawAndOrderedCompilationCanonicallyIdentical), "bundle equivalence drifted");
assertV4(analysis.designFinding.simplifiedDiscoveryModelAuthorsLocalTargetIds === false && analysis.designFinding.compilerAlreadyCanonicalizesCandidateChronology && !analysis.designFinding.rawArrayOrderAffectsCompiledCandidateSemantics, "design finding drifted");
for (const [pathKey, hashKey] of [["manifest", "manifestSha256"], ["execution", "executionSha256"], ["preparation", "preparationSha256"]]) {
  assertV4(sha256(await readFile(analysis.inputs[pathKey])) === analysis.inputs[hashKey], `${pathKey} input hash drifted`);
}
assertV4(analysis.cost.modelContextsExecuted === 0 && analysis.cost.scoresDerived === 0 && !analysis.authorization.freshHeldOutModelExecution && !analysis.authorization.all195Debates, "premature execution authorization");
console.log(JSON.stringify({
  status: "passed",
  heldOutGateDisposition: analysis.heldOutGateDisposition,
  contextsAudited: analysis.replay.contexts.length,
  contextsReordered: analysis.replay.contextsReordered,
  compiledBundlesIdentical: true,
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
