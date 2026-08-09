#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor";
const diagnosis = JSON.parse(await readFile(`${ROOT}/failure-diagnosis.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert.equal(
  diagnosis.status,
  "decomposed-plan-selection-successor-gate-failed-plan-timeouts-debates-93-137-no-further-action-authorized"
);
assert.deepEqual(diagnosis.failure.failedDebates, ["93", "137"]);
assert.equal(diagnosis.failure.validPlans, 8);
assert.equal(diagnosis.failure.invalidPlans, 2);
assert.equal(diagnosis.failure.selectorContextsExecuted, 0);
assert.equal(diagnosis.failure.dynamicallyGeneratedSelectionSchemas, 8);
assert.equal(diagnosis.failure.composedInventories, 0);
assert.equal(diagnosis.gateDisposition.decomposedPlanSelectionSuccessorGatePreservedFailed, true);
assert.equal(diagnosis.gateDisposition.priorValidPlansReusableForAcceptance, false);
assert.equal(diagnosis.repeatedTimeoutEvidence.debate137Occurrences, 3);
assert.equal(diagnosis.repeatedTimeoutEvidence.allThreeStdoutEmpty, true);
assert.equal(diagnosis.designFinding.debate93FirstObservedTimeout, true);
assert.equal(diagnosis.designFinding.selectionContractFreshExecutionEvaluated, false);
assert.equal(diagnosis.designFinding.retryPermitted, false);
assert.equal(diagnosis.designFinding.timeoutExtensionPermitted, false);
assert.equal(diagnosis.cohortDiagnostics.exactCause, "indeterminate-no-result-or-progress-output-before-timeout");
assert.equal(diagnosis.possibleFutureProtocolDirection.authorized, false);
assert.equal(diagnosis.totals.meteredApiCostUsd, 0);
assert.equal(diagnosis.totals.scoresDerived, 0);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const file of [
  `${ROOT}/selection-model-execution.json`,
  `${ROOT}/analysis.json`,
]) assert.equal(await exists(file), false, `${file}: must remain absent`);
for (const key of Object.keys(diagnosis.authorization)) {
  assert.equal(diagnosis.authorization[key], false, `${key}: must be false`);
}
assert.equal(diagnosis.nextAuthorizedAction, "none-without-explicit-user-authorization");
console.log(JSON.stringify({
  status: "passed",
  failedDebates: diagnosis.failure.failedDebates,
  validPlans: diagnosis.failure.validPlans,
  selectorContextsExecuted: 0,
  debate137TimeoutOccurrences: 3,
  exactCause: diagnosis.cohortDiagnostics.exactCause,
  retries: 0,
  meteredApiCostUsd: 0,
  nextAuthorized: diagnosis.nextAuthorizedAction,
}, null, 2));
