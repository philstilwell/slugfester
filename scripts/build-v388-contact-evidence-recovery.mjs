#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT, assert, containsScoreField, validateV388ContactOutput } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(`${V388_CONTACT_ROOT}/initial-execution-manifest.json`);
const execution = await readJson(`${V388_CONTACT_ROOT}/initial-model-execution.json`);
assert(execution.validOutputContexts === 5 && execution.totalAttempts === 6 && execution.totalRetries === 0, "initial execution is not the expected stopped phase");
const defects = [];
for (const context of manifest.contexts) {
  const [output, packet, schema] = await Promise.all([readJson(context.output), readJson(context.packet), readJson(context.schema)]);
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const actual = output.bundles[index];
    const expected = packet.bundles[index];
    const start = expected.atomicExcerpt.indexOf(actual.evidenceText);
    if (start < 0 || expected.atomicExcerpt.indexOf(actual.evidenceText, start + 1) !== -1) defects.push({ context, output, packet, schema, bundleIndex: index, actual, expected });
  }
}
assert(defects.length === 2, "exactly two evidence defects required for narrow recovery");
assert(defects.every((defect) => defect.context.debateNumber === "55" && defect.context.reviewerPass === "pass-a") && canonicalIds(defects) === "v388-contact-55-04,v388-contact-55-20", "unexpected recovery targets");
const defect = defects[0];
const proofOutput = structuredClone(defect.output);
for (const item of defects) proofOutput.bundles[item.bundleIndex].evidenceText = item.expected.atomicExcerpt;
validateV388ContactOutput(proofOutput, defect.packet, defect.schema);
const recoveryId = "v388-contact-evidence-recovery-55-pass-a-bundles-04-20";
const targets = defects.map((item) => ({ bundleId: item.actual.bundleId, moveId: item.expected.moveId, atomicExcerpt: item.expected.atomicExcerpt, originalInvalidEvidenceText: item.actual.evidenceText, immutableSelection: { optionId: item.actual.optionId, rationale: item.actual.rationale } }));
const packet = {
  schemaVersion: "3.8.8-burden-contact-evidence-recovery-packet",
  recoveryId,
  debateNumber: defect.context.debateNumber,
  debateId: defect.context.debateId,
  reviewerPass: defect.context.reviewerPass,
  targets,
  prohibitedChanges: ["bundleId", "optionId", "rationale", "semantic tuple", "any other field or bundle"]
};
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "slugfester-v388-contact-evidence-recovery",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "recoveryId", "reviewerRole", "repairs"],
  properties: {
    schemaVersion: { type: "string", const: "3.8.8-burden-contact-evidence-recovery-output" },
    recoveryId: { type: "string", const: recoveryId },
    reviewerRole: { type: "string", const: "evidence-recovery-reviewer" },
    repairs: { type: "array", minItems: 2, maxItems: 2, items: { type: "object", additionalProperties: false, required: ["bundleId", "replacementEvidenceText", "evidenceRationale"], properties: { bundleId: { type: "string", enum: targets.map((item) => item.bundleId) }, replacementEvidenceText: { type: "string", minLength: 1 }, evidenceRationale: { type: "string", minLength: 120 } } } }
  }
};
assert(!containsScoreField(packet) && !containsScoreField(schema), "recovery packet contains prohibited score field");
const auditTargets = defects.map((item) => ({ debateNumber: "55", reviewerPass: "pass-a", bundleId: item.actual.bundleId, moveId: item.expected.moveId, field: "evidenceText", originalOptionIdImmutable: item.actual.optionId, originalRationaleSha256: sha256(item.actual.rationale) }));
const audit = { schemaVersion: "3.8.8-burden-contact-evidence-defect-audit", status: "two-evidence-only-defects-confirmed", recoveryId, originalOutput: defect.context.output, originalOutputSha256: sha256(await readBytes(defect.context.output)), packet: defect.context.packet, schema: defect.context.schema, targets: auditTargets, proof: { replacingOnlyBothEvidenceFieldsWithFullAtomicExcerptsMakesOriginalOutputValid: true, otherFieldsAndBundlesImmutable: true }, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoringAuthorized: false };
if (shouldWrite) {
  const recoveryRoot = path.resolve(root, `${V388_CONTACT_ROOT}/evidence-recovery`);
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(path.join(recoveryRoot, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.join(recoveryRoot, "schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.join(recoveryRoot, "defect-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", recoveryId, defects: 2, targets: audit.targets.map((item) => item.bundleId), semanticChangesAuthorized: false, modelContextsExecuted: 0, scoringAuthorized: false }, null, 2));

function canonicalIds(items) { return items.map((item) => item.actual.bundleId).sort().join(","); }
