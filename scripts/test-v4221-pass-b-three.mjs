#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { V4221_ROOT, validateV4221PassBPacket } from "./lib/v4221-pass-b-consensus.mjs";

const preparation = JSON.parse(await readFile(`${V4221_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "prepared-three-isolated-source-span-pass-b-contexts");
assert.deepEqual(preparation.contexts.map((context) => context.debateNumber), ["27", "188", "195"]);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "high");
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.authorization.passBModelExecution, false);
for (const context of preparation.contexts) {
  const packet = JSON.parse(await readFile(context.passBPacket, "utf8"));
  assert.equal(validateV4221PassBPacket(packet).status, "passed");
  assert.equal(packet.lockedMoves.some((move) => Object.hasOwn(move, "ratings") || Object.hasOwn(move, "response") || Object.hasOwn(move, "evidenceBasis")), false);
}
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.map((context) => context.debateNumber), contexts: 3, lockedMoves: preparation.totals.lockedMoves, primaryJudgmentFieldsVisible: 0, modelAuthoredEvidenceTextVisible: 0, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
