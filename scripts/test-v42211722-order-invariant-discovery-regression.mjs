#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const OUTPUT = "docs/calibration/v4.2.21.17.22/order-invariant-discovery-regression/regression.json";
if (!(await access(OUTPUT).then(() => true, () => false))) {
  console.log(JSON.stringify({ status: "passed-preregression", modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const regression = JSON.parse(await readFile(OUTPUT));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(regression.status === "order-invariant-discovery-validator-retired-regression-passed", "regression status drifted");
assertV4(regression.sourceSummaries.length === 4 && regression.rows.length === 63, "regression source coverage drifted");
assertV4(regression.totals.availableRawOutputs === 63 && regression.totals.strictAccepted === 60 && regression.totals.strictRejected === 3, "strict baseline drifted");
assertV4(regression.totals.hardenedAccepted === 61 && regression.totals.hardenedRejected === 2 && regression.totals.orderingOnlyRecoveries === 1, "hardened disposition drifted");
assertV4(regression.totals.preservedKnownNonOrderingRejections === 2, "known negative preservation drifted");
assertV4(regression.rows.filter((row) => row.canonicalOrderingAppliedForValidation).every((row) => row.debateNumber === "63" && row.chunkId === "chunk-001"), "ordering-only recovery identity drifted");
assertV4(regression.rows.filter((row) => !row.hardenedAccepted).every((row) => /source span violates|speaker\/side mismatch/.test(row.hardenedError)), "nonordering rejection class drifted");
assertV4(regression.positiveControl.reversedRawArrayStrictlyRejected && regression.positiveControl.reversedRawArrayHardenedAccepted && regression.positiveControl.compiledBundleCanonicallyIdentical, "positive control drifted");
assertV4(regression.negativeControls.length === 6 && regression.negativeControls.every((control) => control.rejected), "negative controls drifted");
assertV4(!regression.invariants.rawOutputsRewritten && !regression.invariants.candidateFieldsModified && regression.invariants.allNonOrderingValidationRulesRetained, "hardening invariant drifted");
for (const source of regression.sourceSummaries) {
  assertV4(sha256(await readFile(source.preparation)) === source.preparationSha256, `${source.label}: preparation hash drifted`);
  assertV4(sha256(await readFile(source.execution)) === source.executionSha256, `${source.label}: execution hash drifted`);
}
assertV4(regression.cost.modelContextsExecuted === 0 && regression.cost.scoresDerived === 0 && regression.authorization.freshHeldOutManifestPreparation && !regression.authorization.freshHeldOutModelExecution && !regression.authorization.all195Debates, "premature downstream authorization");
console.log(JSON.stringify({
  status: "passed",
  availableRawOutputs: regression.totals.availableRawOutputs,
  orderingOnlyRecoveries: regression.totals.orderingOnlyRecoveries,
  preservedKnownNonOrderingRejections: regression.totals.preservedKnownNonOrderingRejections,
  negativeControls: regression.negativeControls.length,
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
