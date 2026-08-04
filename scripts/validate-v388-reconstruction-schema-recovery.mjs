#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256 } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_RECON_ROOT}/schema-compatibility-recovery`;
const manifest = await readJson(root, `${recoveryRoot}/execution-manifest.json`);
const audit = await readJson(root, `${recoveryRoot}/audit.json`);
assertV388Recon(manifest.status === "frozen-schema-compatibility-recovery-authorized" && manifest.authorization.reconstructionModelExecution, "recovery not authorized");
assertV388Recon(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.retriesAuthorized === 0 && manifest.executionPolicy.compatibilityRecovery, "recovery policy mismatch");
assertV388Recon(audit.status === "passed-representation-only-schema-recovery" && audit.repair.occurrencesRemoved === 24 && audit.repair.semanticUniquenessRuleRetainedInDeterministicValidator, "recovery audit mismatch");
assertV388Recon(!audit.repair.allowedValuesChanged && !audit.repair.scoreDataChanged && !audit.repair.sourceDataChanged && !audit.repair.proseGeneratedBeforeRecovery, "semantic recovery boundary violated");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputs) { try { await access(path.resolve(root, future)); throw new Error(`${future}: future output already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
console.log(JSON.stringify({ status: "passed", recoveryContexts: 3, uniqueItemsKeywordsRemoved: 24, allowedValuesChanged: false, deterministicUniquenessValidationRetained: true, priorInferenceStarted: false, priorOutputWritten: false, meteredApiCostUsd: 0, reconstructionModelExecutionAuthorized: true }, null, 2));
