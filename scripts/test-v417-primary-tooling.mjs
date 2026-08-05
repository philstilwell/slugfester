#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readJson } from "./lib/v41-lean-production.mjs";
import { makeV417PrimarySchema, validateV417PrimaryOutput, V417_OUTPUT_VERSION, V417_PACKET_VERSION, V417_PROTOCOL_ID } from "./lib/v417-fresh-validation.mjs";

const [oldPacket, oldOutput] = await Promise.all([
  readJson("docs/calibration/v4.1.5/lean-retired-gate/schema-preflight/packet.json"),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/schema-preflight/output.json")
]);
const packet = { ...oldPacket, schemaVersion: V417_PACKET_VERSION, protocolId: V417_PROTOCOL_ID };
const output = { ...oldOutput, schemaVersion: V417_OUTPUT_VERSION, protocolId: V417_PROTOCOL_ID };
assert.equal(makeV417PrimarySchema().properties.schemaVersion.const, V417_OUTPUT_VERSION);
assert.equal(validateV417PrimaryOutput(output, packet).status, "passed");
const mutation = structuredClone(output);
mutation.sections[0].proMoves[0].ratings.responsiveness.value = 101;
assert.throws(() => validateV417PrimaryOutput(mutation, packet));
console.log(JSON.stringify({ status: "passed", inheritedEndpointShape: true, protocolTranslationValidated: true, mutationRejected: true, modelContextsExecuted: 0 }, null, 2));
