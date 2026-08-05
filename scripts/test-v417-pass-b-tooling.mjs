#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson } from "./lib/v41-lean-production.mjs";
import { extractV415PassBOutput } from "./lib/v415-triggered-consensus.mjs";
import { V417_ROOT } from "./lib/v417-fresh-validation.mjs";
import {
  V417_PASS_B_OUTPUT_VERSION,
  V417_PASS_B_PROTOCOL_ID,
  buildV417LockedEventLedger,
  buildV417PassBPacket,
  evaluateV417PassBTiming,
  makeV417PassBSchema,
  validateV417LockedEventLedger,
  validateV417PassBOutput,
  validateV417PassBPacket
} from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const [preparation, analysis] = await Promise.all([readJson(`${V417_ROOT}/preparation-manifest.json`), readJson(`${V417_ROOT}/primary-analysis.json`)]);
let contexts = 0;
for (const debate of analysis.debates.filter((item) => item.escalation.requiresSecondPass)) {
  const prepared = preparation.debates.find((item) => item.debateNumber === debate.debateNumber);
  const [primary, packet] = await Promise.all([readJson(prepared.output), readJson(prepared.packet)]);
  const events = JSON.parse(await readFile(path.resolve(root, packet.sourceChain.eventsPath), "utf8"));
  const passBPacket = buildV417PassBPacket(primary, packet);
  assert.equal(validateV417PassBPacket(passBPacket).status, "passed");
  const inheritedOutput = extractV415PassBOutput(primary);
  const passBOutput = { ...inheritedOutput, schemaVersion: V417_PASS_B_OUTPUT_VERSION, protocolId: V417_PASS_B_PROTOCOL_ID };
  assert.equal(validateV417PassBOutput(passBOutput, passBPacket, packet).status, "passed");
  const ledger = buildV417LockedEventLedger(passBPacket, events);
  assert.equal(validateV417LockedEventLedger(ledger, passBPacket, events).status, "passed");
  const altered = structuredClone(events);
  altered[ledger.moves[0].lockedStartEvent] = { ...altered[ledger.moves[0].lockedStartEvent], text: `${altered[ledger.moves[0].lockedStartEvent].text} altered` };
  assert.throws(() => validateV417LockedEventLedger(ledger, passBPacket, altered));
  const leaked = structuredClone(passBPacket);
  leaked.lockedSections[0].proMoves[0].ratings = {};
  assert.throws(() => validateV417PassBPacket(leaked));
  contexts += 1;
}
assert.equal(contexts, 5);
assert.equal(makeV417PassBSchema().properties.assessmentModel.const, "5.6 Sol");
const timing = evaluateV417PassBTiming(["58", "91", "59", "144", "171"].map((debateNumber, index) => ({ debateNumber, gateAcceptancePassed: true, elapsedMs: (6 + index * 0.25) * 60000, recoverableStreamEvents: 0 })), analysis.runtime);
assert.equal(timing.runtimePassed, true);
assert.equal(timing.transportCleanContexts, 5);
const fixture = { schemaVersion: "4.1.7-pass-b-tooling-fixture", status: "passed", contexts, inheritedExactOutputShapeValidated: true, alteredOriginalEventRejected: true, leakedPrimaryJudgmentRejected: true, exactSchemaGenerated: true, runtimeProjectionValidated: true, modelContextsExecuted: 0 };
if (shouldWrite) await writeFile(path.resolve(root, "docs/calibration/v4.1.7/fresh-six-gate/pass-b/dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
