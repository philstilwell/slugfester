#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_13_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_13_RENDERING_ROOT,
  hashFile,
  sha256,
  validatePostCanaryBatch13RenderingPacket
} from "./lib/assessment-production-post-canary-batch-13-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires ISO");
const PREPARATION = `${POST_CANARY_BATCH_13_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_13_RENDERING_ROOT}/execution-activation.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(preparation.status ===
  "frozen-post-canary-batch-13-rendering-verification-prepared" &&
  preparation.protocolId === POST_CANARY_BATCH_13_RENDERING_PROTOCOL_ID &&
  preparation.packets?.length === 10 &&
  preparation.authorization?.executionActivation === true &&
  preparation.authorization?.renderingVerification === false,
"Batch 13 rendering verification is not prepared");
execFileSync(process.execPath,
  ["scripts/test-assessment-production-post-canary-batch-13-rendering-verification-preparation.mjs"],
  { cwd: process.cwd(), stdio: "pipe" });
for (const row of preparation.packets) {
  validatePostCanaryBatch13RenderingPacket(
    JSON.parse(await readFile(path.resolve(row.path), "utf8")));
}
const activationCommit = execFileSync("git", ["rev-parse", "HEAD"],
  { encoding: "utf8" }).trim();
const preparationSha256 = sha256(preparationBytes);
const tokenInput = { protocolId: preparation.protocolId, authorizedAt,
  activationCommit, preparationSha256 };
const token = sha256(canonicalJson(tokenInput));
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-rendering-activation",
  protocolId: preparation.protocolId,
  status: "frozen-post-canary-batch-13-rendering-verification-authorized",
  authorizedAt,
  activationCommit,
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  preparation: { path: PREPARATION, sha256: preparationSha256 },
  executionNavigation: { algorithm: "sha256-utf8-canonical-json",
    input: tokenInput, token, tokenPattern: "^[a-f0-9]{64}$",
    queryKeys: { token: "renderingExecution", viewport: "renderingViewport" } },
  sourceHashes: preparation.sourceHashes,
  toolHashes: preparation.toolHashes,
  packetHashes: Object.fromEntries(preparation.packets.map((row) => [row.path, row.sha256])),
  browserPlan: preparation.browserPlan,
  viewports: preparation.viewports,
  explicitOrder: preparation.explicitOrder,
  requiredChecks: preparation.requiredChecks,
  gateExpectations: preparation.gateExpectations,
  failurePolicy: preparation.failurePolicy,
  artifacts: preparation.artifacts,
  authorization: {
    renderingVerification: true,
    attemptsPerViewport: 1,
    retry: false,
    timeoutExtension: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "execute-frozen-batch-13-rendering-verification"
};
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(await hashFile(file) === digest, `${file}: activation source changed`);
}
if (shouldWrite) await writeFile(path.resolve(ACTIVATION),
  `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, debates: 10,
  viewportResultsAuthorized: 20, screenshotsAuthorized: 40,
  attemptsPerViewport: 1, retriesMaximum: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));
