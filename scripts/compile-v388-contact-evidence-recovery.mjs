#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT, assert, canonicalJson, validateV388ContactOutput } from "./lib/v388-burden-contact.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const recoveryRoot = `${V388_CONTACT_ROOT}/evidence-recovery`;
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution, recovery, recoveryPacket, recoverySchema, defectAudit] = await Promise.all([readJson(`${recoveryRoot}/execution-manifest.json`), readJson(`${recoveryRoot}/model-execution.json`), readJson(`${recoveryRoot}/model-output.json`), readJson(`${recoveryRoot}/packet.json`), readJson(`${recoveryRoot}/schema.json`), readJson(`${recoveryRoot}/defect-audit.json`)]);
assert(execution.validOutputContexts === 1 && execution.totalAttempts === 1 && execution.totalRetries === 0 && execution.results[0].gateAcceptancePassed, "valid evidence recovery execution required");
validateSchemaValue(validateClosedSchema(recoverySchema), recovery, "v388ContactEvidenceRecovery");
assert(recovery.repairs.length === recoveryPacket.targets.length, "replacement evidence count invalid");
for (let index = 0; index < recoveryPacket.targets.length; index += 1) { const target = recoveryPacket.targets[index], repair = recovery.repairs[index]; assert(repair.bundleId === target.bundleId, `${target.bundleId}: repair order invalid`); const evidenceStart = target.atomicExcerpt.indexOf(repair.replacementEvidenceText); assert(evidenceStart >= 0 && target.atomicExcerpt.indexOf(repair.replacementEvidenceText, evidenceStart + 1) === -1, `${target.bundleId}: replacement evidence invalid`); }
const [original, packet, schema] = await Promise.all([readJson(defectAudit.originalOutput), readJson(defectAudit.packet), readJson(defectAudit.schema)]);
assert(sha256(await readBytes(defectAudit.originalOutput)) === defectAudit.originalOutputSha256, "original failed output hash mismatch");
const recovered = structuredClone(original);
const targetIndexes = [];
for (let repairIndex = 0; repairIndex < recovery.repairs.length; repairIndex += 1) { const repair = recovery.repairs[repairIndex], immutable = manifest.immutableFields.targets[repairIndex]; const targetIndex = recovered.bundles.findIndex((bundle) => bundle.bundleId === repair.bundleId); assert(targetIndex >= 0 && repair.bundleId === immutable.bundleId && recovered.bundles[targetIndex].optionId === immutable.optionId && sha256(recovered.bundles[targetIndex].rationale) === immutable.rationaleSha256, `${repair.bundleId}: immutable target fields changed`); recovered.bundles[targetIndex].evidenceText = repair.replacementEvidenceText; targetIndexes.push(targetIndex); }
const validation = validateV388ContactOutput(recovered, packet, schema);
const originalWithoutEvidence = structuredClone(original); const recoveredWithoutEvidence = structuredClone(recovered);
for (const targetIndex of targetIndexes) { delete originalWithoutEvidence.bundles[targetIndex].evidenceText; delete recoveredWithoutEvidence.bundles[targetIndex].evidenceText; }
assert(canonicalJson(originalWithoutEvidence) === canonicalJson(recoveredWithoutEvidence), "recovered output changed a non-evidence field");
const audit = { schemaVersion: "3.8.8-burden-contact-evidence-recovery-audit", status: "recovered-output-valid", recoveryId: recovery.recoveryId, originalOutput: defectAudit.originalOutput, originalOutputSha256: defectAudit.originalOutputSha256, recoveryOutput: manifest.context.output, recoveryOutputSha256: sha256(await readBytes(manifest.context.output)), recoveredOutput: manifest.artifacts.recoveredOutput, targets: defectAudit.targets, changedFields: targetIndexes.map((targetIndex) => `bundles[${targetIndex}].evidenceText`), changedFieldCount: 2, semanticChanges: 0, immutableTargets: manifest.immutableFields.targets, otherFieldsAndBundlesImmutable: true, recoveredValidation: validation, contexts: 1, attempts: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, disagreementExtractionAuthorized: true, scoringAuthorized: false };
if (shouldWrite) { await writeFile(path.resolve(root, manifest.artifacts.recoveredOutput), `${JSON.stringify(recovered)}\n`); await writeFile(path.resolve(root, manifest.artifacts.recoveryAudit), `${JSON.stringify(audit, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", recoveredOutputValid: true, changedFieldCount: 2, semanticChanges: 0, disagreementExtractionAuthorized: true, scoringAuthorized: false }, null, 2));
