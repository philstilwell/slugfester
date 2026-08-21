#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_157_CORRECTION_2_FIELDS,
  DEBATE_157_CORRECTION_2_PROTOCOL_ID,
  DEBATE_157_CORRECTION_2_ROOT,
  buildDebate157Correction2Schema
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const MANIFEST = `${DEBATE_157_CORRECTION_2_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assertV4(
  manifest.protocolId === DEBATE_157_CORRECTION_2_PROTOCOL_ID &&
    manifest.status === "frozen-one-context-two-field-debate-157-publication-repair-correction-2-prepared" &&
    manifest.model?.label === "5.6 Sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.userAuthorization?.oneTimeRecursiveRecoveryException === true &&
    manifest.executionPolicy?.contexts === 1 &&
    manifest.executionPolicy?.attemptsPerContext === 1 &&
    manifest.executionPolicy?.retriesMaximum === 0 &&
    manifest.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    manifest.executionPolicy?.recursiveRecoveryContextsMaximum === 1 &&
    manifest.authorization?.correctionModelExecution === false &&
    Object.values(manifest.stopRules).every(Boolean),
  "the frozen correction-2 preparation controls changed"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen source drifted`);
}
const packetBytes = await readFile(path.resolve(manifest.context.packet));
const schemaBytes = await readFile(path.resolve(manifest.context.schema));
const packet = JSON.parse(packetBytes);
const schema = JSON.parse(schemaBytes);
assertV4(sha256(packetBytes) === manifest.context.packetSha256, "replacement packet hash changed");
assertV4(sha256(schemaBytes) === manifest.context.schemaSha256, "response schema hash changed");
assertV4(canonicalJson(schema) === canonicalJson(buildDebate157Correction2Schema(packet)), "response schema no longer reproduces");
assertV4(canonicalJson(packet.constraints?.writableFields) === canonicalJson(DEBATE_157_CORRECTION_2_FIELDS), "replacement field set changed");
assertV4(
  packet.substantiveInputSources?.originalPublicationOutput === manifest.inputs.originalPublicationOutput &&
    packet.substantiveInputSources?.originalPublicationPacket === manifest.inputs.originalPublicationPacket &&
    packet.constraints?.failedRepairOutputUnavailableAndUnaccepted === true &&
    !JSON.stringify(packet).includes(manifest.inputs.failedRepairOutputForDeterministicExclusionCheckOnly),
  "the correction packet substantive-input boundary changed"
);
assertV4(
  manifest.hashLocks?.diagnosis.sha256 === manifest.sourceHashes[manifest.hashLocks.diagnosis.path] &&
    manifest.hashLocks?.replacementPacket.sha256 === manifest.context.packetSha256 &&
    manifest.hashLocks?.responseSchema.sha256 === manifest.context.schemaSha256 &&
    manifest.hashLocks?.validator.sha256 === manifest.sourceHashes[manifest.hashLocks.validator.path] &&
    manifest.hashLocks?.mergeRule.sha256 === manifest.hashLocks.validator.sha256,
  "one or more required correction-2 hash locks changed"
);
console.log(JSON.stringify({
  status: "passed",
  contexts: 1,
  writableFields: DEBATE_157_CORRECTION_2_FIELDS,
  requiredHashLocks: 5,
  failedRepairOutputAvailableToModel: false,
  directIncrementalCostUsd: 0
}, null, 2));
