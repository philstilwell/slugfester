#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const debateNumber = process.argv[2];
assertV388Recon(debateNumber, "debate number required");
const correctionRoot = `${V388_RECON_ROOT}/prose-correction/debate-${debateNumber}`;
const manifest = await readJson(root, `${correctionRoot}/execution-manifest.json`);
const audit = await readJson(root, `${correctionRoot}/defect-audit.json`);
assertV388Recon(manifest.status === "frozen-critique-only-correction-authorized" && manifest.authorization.correctionModelExecution && !manifest.authorization.deterministicMerge, "correction authorization mismatch");
assertV388Recon(["failed-only-critique-word-count", "failed-critique-word-count-and-disclosure-literal"].includes(audit.status) && audit.fullValidatorPassesAfterShadowingAuthorizedDefects && audit.defects.length === manifest.correctionBoundary.modelMutableFields.length, "defect audit mismatch");
assertV388Recon((audit.displayContractNormalization ? 1 : 0) === manifest.correctionBoundary.deterministicNormalizationFields.length, "deterministic normalization boundary mismatch");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of [manifest.output, manifest.artifacts.execution, manifest.artifacts.mergedOutput, manifest.artifacts.mergeAudit]) { try { await access(path.resolve(root, future)); throw new Error(`${future}: future artifact exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
console.log(JSON.stringify({ status: "passed", debateNumber, critiqueOnlyModelFields: manifest.correctionBoundary.modelMutableFields.length, deterministicNormalizationFields: manifest.correctionBoundary.deterministicNormalizationFields.length, allOtherFieldsLocked: true, retriesAuthorized: 0, meteredApiCostUsd: 0, correctionModelExecutionAuthorized: true }, null, 2));
