#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V3811_PERFORMANCE_ROOT, assertV3811, readJson } from "./lib/v3811-performance-judgment.mjs";

const root = process.cwd();
const preflightRoot = `${V3811_PERFORMANCE_ROOT}/schema-preflight`;
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const manifest = await readJson(`${preflightRoot}/execution-manifest.json`);
const packet = await readJson(manifest.input.packet);
assertV3811(manifest.schemaVersion === "3.8.11-performance-schema-endpoint-preflight-manifest" && manifest.status === "frozen-one-synthetic-context-authorized" && manifest.syntheticOnly, "preflight manifest invalid");
assertV3811(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "low", "preflight model invalid");
assertV3811(manifest.authorization.syntheticSchemaPreflightContexts === 1 && manifest.authorization.syntheticSchemaPreflightModelExecution && !manifest.authorization.debatePerformanceModelExecution && !manifest.authorization.scoreDerivation && !manifest.authorization.furtherAutomaticRetry, "preflight authorization invalid");
assertV3811(manifest.executionPolicy.contexts === 1 && manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "preflight execution policy invalid");
assertV3811(packet.moves.length === 7 && packet.debateNumber === "schema-preflight" && packet.moves[0].moveKind === "constructive" && packet.moves.slice(1).every((move) => move.moveKind === "reply"), "synthetic packet invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV3811(sha256(await bytes(relativePath)) === digest, `${relativePath}: preflight source hash mismatch`);
assertV3811(sha256(await bytes(manifest.input.schema)) === manifest.input.schemaSha256, "preflight schema hash mismatch");
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV3811(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `${future}: preflight output present or hashed`);
console.log(JSON.stringify({ status: "passed", preflightLockIntegrityPassed: true, contexts: 1, syntheticMoves: 7, responseClasses: 7, exactSharedSchema: true, debateJudgmentsAuthorized: false, maximumMeteredCostUsd: 0, scoreDerivationAuthorized: false }, null, 2));
