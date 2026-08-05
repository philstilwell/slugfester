#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import {
  V416_PASS_B_OUTPUT_VERSION,
  V416_PASS_B_PROTOCOL_ID,
  V416_PASS_B_ROOT,
  buildV416LockedEventLedger,
  buildV416PassBPacket,
  evaluateV416PassBTiming,
  validateV416LockedEventLedger,
  validateV416PassBOutput
} from "./lib/v416-triggered-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [primary, rawSource, inheritedOutput, primaryAnalysis] = await Promise.all([
  readJson("docs/calibration/v4.1.5/lean-retired-gate/schema-preflight/output.json"),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/schema-preflight/packet.json"),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/pass-b/schema-preflight/output.json"),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/primary-analysis.json")
]);
const eventsPath = "docs/calibration/v4.0/lean-retired-gate/schema-preflight/events.json";
const eventsBytes = await readFile(eventsPath);
const events = JSON.parse(eventsBytes);
const source = {
  ...rawSource,
  eventCount: events.length,
  sourceChain: { ...rawSource.sourceChain, eventsPath, eventsSha256: createHash("sha256").update(eventsBytes).digest("hex") }
};
const packet = buildV416PassBPacket(primary, source);
const ledger = buildV416LockedEventLedger(packet, events);
const ledgerValidation = validateV416LockedEventLedger(ledger, packet, events);
const output = { ...inheritedOutput, schemaVersion: V416_PASS_B_OUTPUT_VERSION, protocolId: V416_PASS_B_PROTOCOL_ID };
const outputValidation = validateV416PassBOutput(output, packet, source);

const mutatedLedger = structuredClone(ledger);
mutatedLedger.moves[0].events[0].text += " altered";
let alteredEventRejected = false;
try { validateV416LockedEventLedger(mutatedLedger, packet, events); } catch { alteredEventRejected = true; }

const timingClean = evaluateV416PassBTiming([
  { debateNumber: "55", elapsedMs: 600000, recoverableStreamEvents: 0, gateAcceptancePassed: true },
  { debateNumber: "103", elapsedMs: 540000, recoverableStreamEvents: 0, gateAcceptancePassed: true },
  { debateNumber: "161", elapsedMs: 720000, recoverableStreamEvents: 0, gateAcceptancePassed: true }
], primaryAnalysis.runtime);
const timingRecovered = evaluateV416PassBTiming([
  { debateNumber: "55", elapsedMs: 600000, recoverableStreamEvents: 0, gateAcceptancePassed: true },
  { debateNumber: "103", elapsedMs: 540000, recoverableStreamEvents: 0, gateAcceptancePassed: true },
  { debateNumber: "161", elapsedMs: 1200000, recoverableStreamEvents: 1, gateAcceptancePassed: true }
], primaryAnalysis.runtime);
assertV4(alteredEventRejected && ledgerValidation.originalEventsHashLocked && outputValidation.calculatedFields === 0, "v4.1.6 mutation fixture failed");
assertV4(timingClean.runtimePassed && timingRecovered.runtimePassed && timingRecovered.recoveredTransportContexts === 1, "v4.1.6 timing fixture failed");

const fixture = {
  schemaVersion: "4.1.6-triggered-pass-b-tooling-fixture",
  protocolId: V416_PASS_B_PROTOCOL_ID,
  status: "passed",
  inheritedExactSchemaPreflight: true,
  ledgerValidation,
  outputValidation,
  mutationTests: { alteredOriginalEventRejected: alteredEventRejected },
  timingPolicyTests: { clean: timingClean, oneRecovered: timingRecovered },
  costs: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) await writeFile(path.resolve(V416_PASS_B_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
