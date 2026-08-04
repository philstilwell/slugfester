#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256, wordCount } from "./lib/v388-reconstruction.mjs";

const root = process.cwd(), debateNumber = process.argv[2];
assertV388Recon(debateNumber, "debate number required");
const correctionRoot = `${V388_RECON_ROOT}/prose-correction/debate-${debateNumber}`;
const manifest = await readJson(root, `${correctionRoot}/execution-manifest.json`);
const execution = await readJson(root, manifest.artifacts.execution), packet = await readJson(root, manifest.packet), correction = await readJson(root, manifest.output);
assertV388Recon(execution.status === "passed" && execution.result.diagnosticAcceptancePassed, "correction execution not accepted");
const raw = await readJson(root, `${V388_RECON_ROOT}/outputs/debate-${debateNumber}.json`), merged = structuredClone(raw), changed = [];
for (const item of correction.corrections) {
  let matches = 0;
  for (const section of merged.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]?.moveId === item.moveId) {
    const before = exchange[side].critique; exchange[side].critique = item.critique; matches += 1;
    changed.push({ jsonPath: `scorecard.sections[${merged.scorecard.sections.indexOf(section)}].exchanges[${section.exchanges.indexOf(exchange)}].${side}.critique`, moveId: item.moveId, beforeSha256: sha256(before), afterSha256: sha256(item.critique), beforeWordCount: wordCount(before), afterWordCount: wordCount(item.critique) });
  }
  assertV388Recon(matches === 1, `${item.moveId}: merge target count ${matches}`);
}
assertV388Recon(changed.length === packet.defects.length, "unexpected merge field count");
const defectAudit = await readJson(root, `${correctionRoot}/defect-audit.json`);
if (defectAudit.displayContractNormalization) {
  const before = merged.aiExtension.disclaimer;
  const after = defectAudit.displayContractNormalization.replacement;
  merged.aiExtension.disclaimer = after;
  changed.push({ jsonPath: "aiExtension.disclaimer", category: "deterministic-display-contract-normalization", beforeSha256: sha256(before), afterSha256: sha256(after), beforeWordCount: wordCount(before), afterWordCount: wordCount(after) });
}
await mkdir(path.dirname(path.resolve(root, manifest.artifacts.mergedOutput)), { recursive: true });
await writeFile(path.resolve(root, manifest.artifacts.mergedOutput), `${JSON.stringify(merged, null, 2)}\n`);
const validation = JSON.parse(execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", manifest.artifacts.mergedOutput, `${V388_RECON_ROOT}/packets/debate-${debateNumber}.json`], { cwd: root, encoding: "utf8" }));
const deterministicNormalizationCount = defectAudit.displayContractNormalization ? 1 : 0;
const audit = { schemaVersion: "3.8.8-reconstruction-prose-correction-merge-audit", protocolId: manifest.protocolId, status: "passed-bounded-prose-recovery", debateNumber, rawOutputSha256: sha256(await readBytes(root, `${V388_RECON_ROOT}/outputs/debate-${debateNumber}.json`)), correctionOutputSha256: sha256(await readBytes(root, manifest.output)), mergedOutputSha256: sha256(await readBytes(root, manifest.artifacts.mergedOutput)), changedFields: changed, changedFieldCount: changed.length, modelCorrectedCritiqueFields: packet.defects.length, deterministicDisplayContractNormalizations: deterministicNormalizationCount, scoreFieldsChanged: 0, unauthorizedFieldsChanged: 0, validation };
await writeFile(path.resolve(root, manifest.artifacts.mergeAudit), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: "passed", debateNumber, changedCritiqueFields: packet.defects.length, deterministicDisplayContractNormalizations: deterministicNormalizationCount, scoreFieldsChanged: 0, unauthorizedFieldsChanged: 0, fullReconstructionValidationPassed: true, mergedOutput: manifest.artifacts.mergedOutput }, null, 2));
