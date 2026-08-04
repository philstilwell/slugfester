#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  V388_RECON_MODEL, V388_RECON_PROTOCOL, V388_RECON_ROOT,
  assertV388Recon, readBytes, readJson, sha256, wordCount
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const debateNumber = process.argv[process.argv.indexOf("--debate") + 1];
assertV388Recon(debateNumber, "--debate is required");
const correctionRoot = `${V388_RECON_ROOT}/prose-correction/debate-${debateNumber}`;
const rawOutputPath = `${V388_RECON_ROOT}/outputs/debate-${debateNumber}.json`;
const reconstructionPacketPath = `${V388_RECON_ROOT}/packets/debate-${debateNumber}.json`;
const performancePacketPath = `docs/calibration/v3.8.8/performance-judgment-consensus/packets/debate-${debateNumber}.json`;
const failedExecutionPath = `${V388_RECON_ROOT}/schema-compatibility-recovery/model-execution.json`;
const raw = await readJson(root, rawOutputPath);
const reconstructionPacket = await readJson(root, reconstructionPacketPath);
const performancePacket = await readJson(root, performancePacketPath);
const failedExecution = await readJson(root, failedExecutionPath);
assertV388Recon(failedExecution.status === "failed-closed" && failedExecution.validContexts === 0, "expected failed reconstruction execution");

const requiredDisclosure = "This section is an AI-generated contribution, not transcript content. Its wording is not attributable to either participant and it does not affect any participant score.";
const disclosureNeedsNormalization = !(raw.aiExtension?.aiGenerated === true && /AI-generated/i.test(raw.aiExtension?.disclaimer ?? "") && /not transcript/i.test(raw.aiExtension?.disclaimer ?? ""));

const defects = [];
for (const section of raw.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) {
  const argument = exchange[side];
  if (!argument) continue;
  const count = wordCount(argument.critique);
  if (count < 105 || count > 130) defects.push({ sectionId: section.sectionId, side, moveId: argument.moveId, score: argument.score, originalCritique: argument.critique, originalWordCount: count });
}
assertV388Recon(defects.length > 0, "no critique word-count defects found");

const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-v388-reconstruction-shadow-${debateNumber}-`));
let otherFieldsPass = false;
try {
  const shadow = structuredClone(raw);
  const placeholder = Array.from({ length: 115 }, (_, index) => `auditword${index + 1}`).join(" ");
  for (const defect of defects) {
    for (const section of shadow.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]?.moveId === defect.moveId) exchange[side].critique = placeholder;
  }
  if (disclosureNeedsNormalization) shadow.aiExtension.disclaimer = requiredDisclosure;
  const shadowPath = path.join(temporary, "shadow.json");
  await writeFile(shadowPath, `${JSON.stringify(shadow, null, 2)}\n`);
  execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", shadowPath, reconstructionPacketPath], { cwd: root, stdio: "pipe" });
  otherFieldsPass = true;
} finally { await rm(temporary, { recursive: true, force: true }); }
assertV388Recon(otherFieldsPass, "non-critique fields did not pass full validator");

const packetDefects = defects.map((defect) => {
  const finalMove = reconstructionPacket.moves.find((move) => move.moveId === defect.moveId);
  const sourceMove = performancePacket.moves.find((move) => move.moveId === defect.moveId);
  assertV388Recon(finalMove && sourceMove, `${defect.moveId}: source move missing`);
  return { ...defect, speaker: finalMove.speaker, proposition: finalMove.proposition, response: finalMove.response, ratings: finalMove.ratings, atomicExcerpt: sourceMove.atomicExcerpt, contextWindow: sourceMove.contextWindow, requiredMinimumWords: 105, requiredMaximumWords: 130, targetWords: "115-125" };
});
const packet = { schemaVersion: "3.8.8-reconstruction-prose-correction-packet", protocolId: V388_RECON_PROTOCOL, debateNumber, debateId: raw.debateId, correctionBoundary: "critique-text-only", defects: packetDefects };
const correctedCritique = { type: "object", additionalProperties: false, required: ["moveId", "critique"], properties: { moveId: { type: "string" }, critique: { type: "string" } } };
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema", title: `v3.8.8 reconstruction critique correction Debate ${debateNumber}`,
  type: "object", additionalProperties: false, required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "assessmentModel", "calibrationOnly", "corrections"],
  properties: {
    schemaVersion: { type: "string", const: "3.8.8-reconstruction-prose-correction" },
    protocolId: { type: "string", const: V388_RECON_PROTOCOL }, debateNumber: { type: "string", const: debateNumber }, debateId: { type: "string", const: raw.debateId },
    assessmentModel: { type: "string", const: V388_RECON_MODEL.label }, calibrationOnly: { type: "boolean", const: true },
    corrections: { type: "array", minItems: defects.length, maxItems: defects.length, items: correctedCritique }
  }
};
const audit = {
  schemaVersion: "3.8.8-reconstruction-prose-defect-audit", protocolId: V388_RECON_PROTOCOL,
  status: disclosureNeedsNormalization ? "failed-critique-word-count-and-disclosure-literal" : "failed-only-critique-word-count", debateNumber, debateId: raw.debateId,
  rawOutputPath, rawOutputSha256: sha256(await readBytes(root, rawOutputPath)), endpointSchemaPassed: true,
  fullValidatorPassesAfterShadowingAuthorizedDefects: otherFieldsPass,
  defects: defects.map(({ originalCritique, ...defect }) => defect),
  displayContractNormalization: disclosureNeedsNormalization ? { jsonPath: "aiExtension.disclaimer", reason: "validator requires the literal phrase 'not transcript'", replacement: requiredDisclosure, modelInferenceRequired: false } : null,
  authorization: { automaticRetry: false, critiqueOnlyCorrectionPreparation: true, correctionModelExecution: false, productionMutation: false }
};
if (write) {
  await mkdir(path.resolve(root, correctionRoot), { recursive: true });
  await writeFile(path.resolve(root, `${correctionRoot}/packet.json`), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.resolve(root, `${correctionRoot}/schema.json`), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(root, `${correctionRoot}/defect-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
}
const sourceHashes = {};
for (const relativePath of [
  `${V388_RECON_ROOT}/prose-correction/manual.md`, rawOutputPath, reconstructionPacketPath, performancePacketPath, failedExecutionPath,
  `${correctionRoot}/packet.json`, `${correctionRoot}/schema.json`, `${correctionRoot}/defect-audit.json`,
  "docs/reassessment-rubric-v3.8.4.md", "scripts/validate-v388-reconstruction-output.mjs"
]) sourceHashes[relativePath] = sha256(await readBytes(root, relativePath));
const manifest = {
  schemaVersion: "3.8.8-reconstruction-prose-correction-execution-manifest", protocolId: V388_RECON_PROTOCOL,
  status: "frozen-critique-only-correction-authorized", createdAt: new Date().toISOString(), debateNumber, debateId: raw.debateId,
  model: V388_RECON_MODEL, correctionBoundary: { modelMutableFields: defects.map((defect) => `${defect.moveId}.critique`), deterministicNormalizationFields: disclosureNeedsNormalization ? ["aiExtension.disclaimer"] : [], otherFieldsMutable: false },
  executionPolicy: { contexts: 1, perInvocationTimeoutMs: 600000, retriesAuthorized: 0, apiKeysRemoved: true, meteredApiCostUsd: 0 },
  sourceHashes, packet: `${correctionRoot}/packet.json`, schema: `${correctionRoot}/schema.json`, output: `${correctionRoot}/model-output.json`,
  artifacts: { execution: `${correctionRoot}/model-execution.json`, mergedOutput: `${V388_RECON_ROOT}/validated-outputs/debate-${debateNumber}.json`, mergeAudit: `${correctionRoot}/merge-audit.json` },
  authorization: { correctionModelExecution: true, deterministicMerge: false, continuationContexts: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) await writeFile(path.resolve(root, `${correctionRoot}/execution-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "passed-prose-correction-preparation", debateNumber, critiqueDefects: defects.length, defectWordCounts: defects.map((d) => d.originalWordCount), deterministicDisclosureNormalization: disclosureNeedsNormalization, allOtherFieldsPassAfterAuthorizedShadowing: otherFieldsPass, correctionContextsAuthorized: 1, meteredApiCostUsd: 0, written: write }, null, 2));
