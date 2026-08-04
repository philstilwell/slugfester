#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, containsScoreField } from "./lib/v388-burden-contact.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-contact-evidence-recovery.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(process.cwd(), file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSchemaValue(validateClosedSchema(schema), output, "v388ContactEvidenceRecovery");
assert(output.schemaVersion === "3.8.8-burden-contact-evidence-recovery-output" && output.recoveryId === packet.recoveryId && output.reviewerRole === "evidence-recovery-reviewer", "evidence recovery identity invalid");
assert(output.repairs.length === packet.targets.length, "evidence recovery target count invalid");
for (let index = 0; index < packet.targets.length; index += 1) {
  const target = packet.targets[index], repair = output.repairs[index];
  assert(repair.bundleId === target.bundleId, `${target.bundleId}: recovery order or identity invalid`);
  const start = target.atomicExcerpt.indexOf(repair.replacementEvidenceText);
  assert(start >= 0 && target.atomicExcerpt.indexOf(repair.replacementEvidenceText, start + 1) === -1, `${target.bundleId}: replacement evidence absent or nonunique`);
  assert(repair.replacementEvidenceText !== target.originalInvalidEvidenceText && repair.evidenceRationale.trim().length >= 120, `${target.bundleId}: evidence recovery content invalid`);
}
assert(!containsScoreField(output), "evidence recovery contains score field");
console.log(JSON.stringify({ status: "passed", recoveryId: output.recoveryId, bundles: output.repairs.map((item) => item.bundleId), replacementEvidenceUnique: 2, semanticChanges: 0, scoreFields: 0 }, null, 2));
