#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, readJson } from "./lib/v41-lean-production.mjs";
import { V415_PASS_B_ROOT, buildV415PassBPacket, extractV415PassBOutput, makeV415PassBSchema, validateV415PassBOutput, validateV415PassBPacket } from "./lib/v415-triggered-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [primary, sourcePacket] = await Promise.all([readJson(`${V41_LEAN_ROOT}/schema-preflight/output.json`), readJson(`${V41_LEAN_ROOT}/schema-preflight/packet.json`)]);
const packet = buildV415PassBPacket(primary, sourcePacket);
const output = extractV415PassBOutput(primary);
const packetValidation = validateV415PassBPacket(packet);
const outputValidation = validateV415PassBOutput(output, packet, sourcePacket);
const wrongOrder = structuredClone(output);
[wrongOrder.moveJudgments[0], wrongOrder.moveJudgments[1]] = [wrongOrder.moveJudgments[1], wrongOrder.moveJudgments[0]];
let wrongOrderRejected = false;
try { validateV415PassBOutput(wrongOrder, packet, sourcePacket); } catch (error) { wrongOrderRejected = /move order or coverage mismatch/.test(error.message); }
const leakedPacket = structuredClone(packet);
leakedPacket.lockedSections[0].proMoves[0].ratings = primary.sections[0].proMoves[0].ratings;
let leakedPrimaryJudgmentRejected = false;
try { validateV415PassBPacket(leakedPacket); } catch (error) { leakedPrimaryJudgmentRejected = /leaked judgment fields/.test(error.message); }
if (!wrongOrderRejected || !leakedPrimaryJudgmentRejected) throw new Error("Pass B mutation fixture failed");
const fixture = { schemaVersion: "4.1.5-triggered-pass-b-tooling-fixture", status: "passed", packetValidation, outputValidation, mutationTests: { wrongOrderRejected, leakedPrimaryJudgmentRejected }, costs: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 } };
if (shouldWrite) {
  await mkdir(path.resolve(V415_PASS_B_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(V415_PASS_B_ROOT, "schemas/pass-b.schema.json"), `${JSON.stringify(makeV415PassBSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V415_PASS_B_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
