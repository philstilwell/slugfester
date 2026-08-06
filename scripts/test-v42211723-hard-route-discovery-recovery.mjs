#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.23/mechanical-discovery-recovery";
const ANALYSIS = `${ROOT}/recovery-analysis.json`;
if (!(await access(ANALYSIS).then(() => true, () => false))) {
  console.log(JSON.stringify({ status: "passed-prerecovery", modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(ANALYSIS));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(analysis.status === "hard-route-discovery-mechanically-recovered-independent-judgment-packet-preparation-authorized", "recovery status drifted");
assertV4(analysis.sourceDiscoveryGateDisposition === "v4.2.21.17.20-failed-and-not-retried" && analysis.independentJudgmentEvidenceHeldOut, "source gate disposition drifted");
assertV4(analysis.outputAudits.length === 20 && analysis.audit.sourceExecutionValid === 19 && analysis.audit.sourceExecutionInvalid === 1 && analysis.audit.recoveryValid === 20, "recovery output ledger drifted");
assertV4(analysis.audit.orderingCanonicalizations === 1 && !analysis.audit.rawOutputsRewritten && !analysis.audit.candidateFieldsModified && !analysis.audit.semanticCorrectionPerformed && !analysis.audit.retryPerformed, "mechanical-only recovery invariant drifted");
assertV4(analysis.outputAudits.filter((output) => output.canonicalOrderingAppliedForValidation).every((output) => output.debateNumber === "63" && output.chunkId === "chunk-001"), "ordering recovery identity drifted");
assertV4(analysis.debates.length === 5 && analysis.debates.every((debate) => debate.candidates >= 8 && debate.pro >= 4 && debate.con >= 4 && debate.candidateSpansIncluded && debate.rawAndOrderedCompilationCanonicallyIdentical), "candidate inventory sufficiency drifted");
for (const debate of analysis.debates) {
  assertV4(sha256(await readFile(debate.bundlePath)) === debate.bundleSha256, `${debate.debateNumber}: bundle hash drifted`);
  assertV4(sha256(await readFile(debate.sparsePath)) === debate.sparseSha256, `${debate.debateNumber}: sparse context hash drifted`);
}
for (const [pathKey, hashKey] of [["manifest", "manifestSha256"], ["execution", "executionSha256"], ["preparation", "preparationSha256"], ["failureAnalysis", "failureAnalysisSha256"], ["retiredRegression", "retiredRegressionSha256"]]) {
  assertV4(sha256(await readFile(analysis.inputs[pathKey])) === analysis.inputs[hashKey], `${pathKey}: recovery input hash drifted`);
}
assertV4(analysis.totals.modelContextsExecutedByRecovery === 0 && analysis.totals.scoresDerived === 0 && analysis.authorization.independentJudgmentPacketPreparation && !analysis.authorization.independentJudgmentModelExecution && !analysis.authorization.all195Debates, "premature judgment authorization");
console.log(JSON.stringify({
  status: "passed",
  sourceDiscoveryGateDisposition: analysis.sourceDiscoveryGateDisposition,
  debates: analysis.totals.debates,
  contextsRecovered: analysis.audit.recoveryValid,
  orderingCanonicalizations: analysis.audit.orderingCanonicalizations,
  candidates: analysis.totals.candidates,
  pro: analysis.totals.pro,
  con: analysis.totals.con,
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
