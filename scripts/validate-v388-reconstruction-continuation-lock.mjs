#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const manifestPath = `${V388_RECON_ROOT}/post-debate-55-continuation/execution-manifest.json`;
const manifest = await readJson(root, manifestPath);
assertV388Recon(manifest.status === "frozen-two-context-post-debate-55-continuation-authorized" && manifest.authorization.reconstructionModelExecution && !manifest.authorization.calibrationPreview && !manifest.authorization.productionMutation, "continuation authorization mismatch");
assertV388Recon(manifest.contexts.length === 2 && manifest.executionPolicy.contexts === 2 && manifest.executionPolicy.retriesAuthorized === 0 && manifest.executionPolicy.freshContextsNotRetries, "continuation execution policy mismatch");
assertV388Recon(manifest.contexts.map((context) => context.debateNumber).join(",") === "103,161", "continuation context identity/order mismatch");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of [...manifest.futureOutputs, manifest.artifacts.execution]) {
  try { await access(path.resolve(root, future)); throw new Error(`${future}: future artifact exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
console.log(JSON.stringify({ status: "passed", contexts: manifest.contexts.map((context) => context.debateNumber), sourceHashes: Object.keys(manifest.sourceHashes).length, outputsAbsent: manifest.futureOutputs.length, retriesAuthorized: 0, meteredApiCostUsd: 0, continuationAuthorized: true }, null, 2));
