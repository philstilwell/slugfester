#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, readJson } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/schema-preflight-recovery`;
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const manifest = await readJson(`${recoveryRoot}/execution-manifest.json`);
assertV388(manifest.schemaVersion === "3.8.8-performance-schema-corrected-preflight-manifest" && manifest.status === "frozen-one-corrected-synthetic-context-authorized", "corrected preflight manifest invalid");
assertV388(manifest.correction.exactSchemaAlreadyEndpointAccepted && manifest.correction.judgmentContractChanged === false && /50 instead of 75/.test(manifest.correction.onlyPromptChange), "corrected preflight boundary invalid");
assertV388(manifest.authorization.correctedSyntheticContexts === 1 && manifest.authorization.correctedSyntheticModelExecution && !manifest.authorization.debatePerformanceModelExecution && !manifest.authorization.scoreDerivation && !manifest.authorization.furtherAutomaticRetry, "corrected preflight authorization invalid");
assertV388(manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "corrected preflight execution policy invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await bytes(relativePath)) === digest, `${relativePath}: corrected preflight source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV388(!(await exists(future)), `${future}: corrected preflight output already exists`);
console.log(JSON.stringify({ status: "passed", correctedPreflightLockIntegrityPassed: true, contexts: 1, exactSharedSchema: true, nullContactRelevanceBurdenValue: 50, debateJudgmentsAuthorized: false, maximumMeteredCostUsd: 0 }, null, 2));
