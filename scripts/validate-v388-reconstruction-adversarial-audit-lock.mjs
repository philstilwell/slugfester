#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const manifestPath = "docs/calibration/v3.8.8/reconstruction/adversarial-audit/execution-manifest.json";
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
if (manifest.status !== "frozen-supplemental-audit-authorized" || !manifest.authorization.supplementalAuditModelExecution || manifest.authorization.reconstructionMutation || manifest.authorization.productionMutation || manifest.executionPolicy.retriesAuthorized !== 0) throw new Error("adversarial-audit authorization boundary invalid");
for (const [relativePath, expected] of Object.entries(manifest.sourceHashes)) {
  const observed = sha256(await readFile(path.resolve(root, relativePath)));
  if (observed !== expected) throw new Error(`${relativePath}: source hash mismatch`);
}
for (const relativePath of [...manifest.futureOutputs, manifest.artifacts.execution, manifest.artifacts.summary]) {
  try { await access(path.resolve(root, relativePath)); throw new Error(`${relativePath}: future artifact already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
console.log(JSON.stringify({ status: "passed", manifestPath, contexts: manifest.contexts.length, sourceHashes: Object.keys(manifest.sourceHashes).length, modelExecutionAuthorized: true, meteredModelApiCostUsd: 0 }, null, 2));
