#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { V42211_ROOT } from "./lib/v42211-charity-closure.mjs";

const preparation = JSON.parse(await readFile(`${V42211_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "prepared-one-fresh-debate-195-pass-b-recovery-context");
assert.equal(preparation.context.debateNumber, "195");
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "high");
assert.equal(preparation.isolation.failedOutputHidden, true);
assert.equal(preparation.acceptedOutputs.length, 2);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.authorization.recoveryModelExecution, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const accepted of preparation.acceptedOutputs) {
  assert.equal(sha256(await readFile(accepted.rawOutput)), accepted.rawOutputSha256);
  assert.equal(sha256(await readFile(accepted.reconstructedOutput)), accepted.reconstructedOutputSha256);
}
console.log(JSON.stringify({ status: "passed", debate: "195", contexts: 1, lockedMoves: preparation.totals.lockedMoves, acceptedOutputsHashLocked: 2, failedOutputHidden: true, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
