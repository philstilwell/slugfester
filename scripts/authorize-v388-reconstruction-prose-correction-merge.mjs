#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd(), debateNumber = process.argv[2];
assertV388Recon(debateNumber, "debate number required");
const correctionRoot = `${V388_RECON_ROOT}/prose-correction/debate-${debateNumber}`;
const manifestPath = `${correctionRoot}/execution-manifest.json`;
const manifest = await readJson(root, manifestPath);
const execution = await readJson(root, manifest.artifacts.execution);
const defectAudit = await readJson(root, `${correctionRoot}/defect-audit.json`);
assertV388Recon(manifest.authorization.correctionModelExecution && !manifest.authorization.deterministicMerge, "pre-execution authorization state mismatch");
assertV388Recon(execution.status === "passed" && execution.result.attemptCount === 1 && execution.result.retryCount === 0 && execution.result.diagnosticAcceptancePassed && execution.result.deterministicValidationPassed, "model correction did not pass exactly once");
assertV388Recon(defectAudit.fullValidatorPassesAfterShadowingAuthorizedDefects, "authorized-defect shadow validation did not pass");
const files = [manifestPath, manifest.packet, manifest.schema, manifest.artifacts.execution, manifest.output, `${correctionRoot}/defect-audit.json`, `${V388_RECON_ROOT}/outputs/debate-${debateNumber}.json`];
const sourceHashes = {};
for (const file of files) sourceHashes[file] = sha256(await readBytes(root, file));
const authorization = {
  schemaVersion: "3.8.8-reconstruction-prose-correction-merge-authorization",
  protocolId: manifest.protocolId,
  status: "deterministic-merge-authorized",
  debateNumber,
  authorizedAt: new Date().toISOString(),
  sourceHashes,
  boundaries: {
    modelCorrectedFields: manifest.correctionBoundary.modelMutableFields,
    deterministicNormalizationFields: manifest.correctionBoundary.deterministicNormalizationFields,
    otherFieldsMutable: false
  },
  authorization: { deterministicMerge: true, modelRetry: false, productionMutation: false }
};
const outputPath = `${correctionRoot}/merge-authorization.json`;
await writeFile(path.resolve(root, outputPath), `${JSON.stringify(authorization, null, 2)}\n`);
console.log(JSON.stringify({ status: "passed", debateNumber, modelCorrectedFields: authorization.boundaries.modelCorrectedFields.length, deterministicNormalizationFields: authorization.boundaries.deterministicNormalizationFields.length, deterministicMergeAuthorized: true }, null, 2));
