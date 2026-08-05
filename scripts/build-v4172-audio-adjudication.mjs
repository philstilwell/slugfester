#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V4172_AUDIO_ADJ_OUTPUT_VERSION, V4172_AUDIO_ADJ_PACKET_VERSION, V4172_AUDIO_ADJ_PROTOCOL_ID, V4172_AUDIO_ADJ_ROOT, makeV4172AudioAdjudicationSchema } from "./lib/v4172-audio-adjudication.mjs";

const root = process.cwd(); const shouldWrite = process.argv.includes("--write");
const [oldPacket, oldPreparation, failure] = await Promise.all([
  readJson("docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/packet.json"),
  readJson("docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/preparation-manifest.json"),
  readJson("docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/model-execution.json")
]);
assertV4(failure.status === "audio-adjudication-execution-failed" && failure.result.commandExitCode === 1 && failure.result.elapsedMs < 10000 && failure.result.outputWritten === false && failure.authorization.furtherRetry === false, "v4.1.7.1 endpoint failure unavailable");
const packet = { ...oldPacket, schemaVersion: V4172_AUDIO_ADJ_PACKET_VERSION, protocolId: V4172_AUDIO_ADJ_PROTOCOL_ID, outputIdentity: { schemaVersion: V4172_AUDIO_ADJ_OUTPUT_VERSION, protocolId: V4172_AUDIO_ADJ_PROTOCOL_ID } };
const schema = makeV4172AudioAdjudicationSchema();
assertV4(schema.properties.adjudications.items.properties.evidenceSegmentIndexes.uniqueItems === undefined, "unsupported uniqueItems keyword remains");
const packetPath = `${V4172_AUDIO_ADJ_ROOT}/packet.json`; const schemaPath = `${V4172_AUDIO_ADJ_ROOT}/schema.json`; const outputPath = `${V4172_AUDIO_ADJ_ROOT}/output.json`;
const preparation = { ...oldPreparation, schemaVersion: "4.1.7.2-audio-adjudication-preparation", protocolId: V4172_AUDIO_ADJ_PROTOCOL_ID, status: shouldWrite ? "prepared-endpoint-compatible-one-debate-two-fields" : "preview", inputs: { ...oldPreparation.inputs, workflow: "docs/assessment-workflow-v4.1.7.2.md", manual: "docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/manual.md", schema: schemaPath, packet: packetPath }, output: outputPath, inheritedFailure: "docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/model-execution.json", endpointSchemaCorrection: { removedKeyword: "uniqueItems", deterministicUniquenessEnforcementRetained: true, otherSchemaConstraintsChanged: false }, authorization: { ...oldPreparation.authorization, modelExecution: false } };
if (shouldWrite) { await mkdir(path.resolve(root, V4172_AUDIO_ADJ_ROOT), { recursive: true }); await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`); await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`); await writeFile(path.resolve(root, V4172_AUDIO_ADJ_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparation, null, 2)}\n`); }
console.log(JSON.stringify({ status: preparation.status, disputedMoves: packet.moves.length, removedUnsupportedKeyword: "uniqueItems", deterministicUniquenessEnforcementRetained: true, otherSchemaConstraintsChanged: false, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
