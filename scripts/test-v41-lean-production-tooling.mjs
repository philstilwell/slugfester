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
const routeBurden = structuredClone(primary);
routeBurden.burdenCompletionAdjustment.pro.eligibility.affectedBurdenIds = [routeBurden.routes[0].routeId];
validateV41PrimaryOutput(routeBurden, packet);

const missingSubsidiary = structuredClone(primary);
missingSubsidiary.routes[0].subsidiaryBridges = [];
let missingSubsidiaryRejected = false;
try { validateV41PrimaryOutput(missingSubsidiary, packet); } catch (error) { missingSubsidiaryRejected = /subsidiary bridges invalid/.test(error.message); }

const missingSide = structuredClone(primary);
missingSide.sections[0].conMoves = [];
let missingSideRejected = false;
try { validateV41PrimaryOutput(missingSide, packet); } catch (error) { missingSideRejected = /requires one or two moves/.test(error.message); }

const futureTarget = structuredClone(primary);
const firstReply = futureTarget.sections[0].conMoves[0];
const futureMoveId = futureTarget.sections.at(-1).conMoves.at(-1).moveId;
firstReply.response.decisiveTargetIds = [futureMoveId];
firstReply.response.components = firstReply.response.components.map((component) => ({ ...component, targetMoveId: futureMoveId }));
let futureTargetRejected = false;
try { validateV41PrimaryOutput(futureTarget, packet); } catch (error) { futureTargetRejected = /response target must be an earlier move/.test(error.message); }

const inconsistentPartial = structuredClone(primary);
const allContactedReply = inconsistentPartial.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).find((move) => move.moveKind === "reply" && move.response.components.length > 0);
allContactedReply.response.class = "partial-answer";
allContactedReply.response.components = allContactedReply.response.components.map((component) => ({ ...component, contacted: true }));
allContactedReply.ratings.responsiveness.value = 70;
let inconsistentPartialRejected = false;
try { validateV41PrimaryOutput(inconsistentPartial, packet); } catch (error) { inconsistentPartialRejected = /partial answer must contact some but not all components/.test(error.message); }

const burdenTierMismatch = structuredClone(primary);
const burdenMove = burdenTierMismatch.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).find((move) => move.burdenContact?.tier === "central");
burdenMove.burdenContact.tier = "subsidiary";
let burdenTierMismatchRejected = false;
try { validateV41PrimaryOutput(burdenTierMismatch, packet); } catch (error) { burdenTierMismatchRejected = /burden tier does not match bridge/.test(error.message); }

if (![missingSubsidiaryRejected, missingSideRejected, futureTargetRejected, inconsistentPartialRejected, burdenTierMismatchRejected].every(Boolean)) throw new Error("one or more v4.1.4 structural mutations escaped validation");
const central = projectV41ComputeHours();
const conservative = projectV41ConservativeHours();
if (!central.centralTargetPassed || !conservative.conservativeCeilingPassed) throw new Error("v4.1 planning projection exceeds a compute ceiling");

const fixture = {
  schemaVersion: "4.1.4-bounded-tooling-fixture",
  protocolId: V41_PROTOCOL_ID,
  status: "passed",
  validation,
  calculatedFixture: { pro: scores.overall.pro.score, con: scores.overall.con.score, winner: scores.winner },
  mutationTests: { routeBurdenIdAccepted: true, missingSubsidiaryRejected, missingSideRejected, futureTargetRejected, inconsistentPartialRejected, burdenTierMismatchRejected },
  computeProjection: { central, conservative },
  costs: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) {
  await mkdir(path.resolve(V41_LEAN_ROOT, "schemas"), { recursive: true });
  await writeFile(path.resolve(V41_LEAN_ROOT, "schemas/primary.schema.json"), `${JSON.stringify(makeV41PrimarySchema(), null, 2)}\n`);
  await writeFile(path.resolve(V41_LEAN_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
