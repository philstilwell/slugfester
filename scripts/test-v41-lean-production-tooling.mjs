#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { convertV4ReferenceToV41, deriveV41PrimaryScores, makeV41PrimarySchema, projectV41ComputeHours, projectV41ConservativeHours, readJson, validateV41PrimaryOutput, V41_LEAN_ROOT, V41_PACKET_VERSION, V41_PROTOCOL_ID } from "./lib/v41-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [reference, oldPacket] = await Promise.all([
  readJson("docs/calibration/v4.0.1/lean-retired-gate/schema-preflight/output.json"),
  readJson("docs/calibration/v4.0.1/lean-retired-gate/schema-preflight/packet.json")
]);
const packet = { ...oldPacket, schemaVersion: V41_PACKET_VERSION, protocolId: V41_PROTOCOL_ID };
const primary = convertV4ReferenceToV41(reference);
const validation = validateV41PrimaryOutput(primary, packet);
const scores = deriveV41PrimaryScores(primary);

const missingSubsidiary = structuredClone(primary);
missingSubsidiary.routes[0].subsidiaryBridges = [];
let missingSubsidiaryRejected = false;
try { validateV41PrimaryOutput(missingSubsidiary, packet); } catch (error) { missingSubsidiaryRejected = /subsidiary bridges invalid/.test(error.message); }

const missingSide = structuredClone(primary);
missingSide.sections[0].conMoves = [];
let missingSideRejected = false;
try { validateV41PrimaryOutput(missingSide, packet); } catch (error) { missingSideRejected = /requires one or two moves/.test(error.message); }

const badSequence = structuredClone(primary);
badSequence.sections[0].conMoves[0].sequence = 1;
let badSequenceRejected = false;
try { validateV41PrimaryOutput(badSequence, packet); } catch (error) { badSequenceRejected = /unique and consecutive/.test(error.message); }

if (![missingSubsidiaryRejected, missingSideRejected, badSequenceRejected].every(Boolean)) throw new Error("one or more v4.1 structural mutations escaped validation");
const central = projectV41ComputeHours();
const conservative = projectV41ConservativeHours();
if (!central.centralTargetPassed || !conservative.conservativeCeilingPassed) throw new Error("v4.1 planning projection exceeds a compute ceiling");

const fixture = {
  schemaVersion: "4.1-bounded-tooling-fixture",
  protocolId: V41_PROTOCOL_ID,
  status: "passed",
  validation,
  calculatedFixture: { pro: scores.overall.pro.score, con: scores.overall.con.score, winner: scores.winner },
  mutationTests: { missingSubsidiaryRejected, missingSideRejected, badSequenceRejected },
  computeProjection: { central, conservative },
  costs: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) {
  await mkdir(path.resolve(V41_LEAN_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(V41_LEAN_ROOT, "schemas/primary.schema.json"), `${JSON.stringify(makeV41PrimarySchema(), null, 2)}\n`);
  await writeFile(path.resolve(V41_LEAN_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
