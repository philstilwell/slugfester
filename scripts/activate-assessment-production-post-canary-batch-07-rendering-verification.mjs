#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_RENDERING_PROTOCOL_ID, POST_CANARY_BATCH_07_RENDERING_ROOT,
  validatePostCanaryBatch07RenderingPacket } from
  "./lib/assessment-production-post-canary-batch-07-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "--authorized-at requires ISO");
const PREPARATION = `${POST_CANARY_BATCH_07_RENDERING_ROOT}/preparation-manifest.json`;
const ACTIVATION = `${POST_CANARY_BATCH_07_RENDERING_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION)); const p = JSON.parse(preparationBytes);
assertV4(p.status === "frozen-post-canary-batch-07-rendering-verification-prepared" &&
  p.protocolId === POST_CANARY_BATCH_07_RENDERING_PROTOCOL_ID && p.packets?.length === 10 &&
  p.authorization?.executionActivation === true && p.authorization?.renderingVerification === false,
"Batch 7 rendering verification is not prepared");
execFileSync(process.execPath, ["scripts/test-assessment-production-post-canary-batch-07-rendering-verification-preparation.mjs"],
  { cwd: process.cwd(), stdio: "pipe" });
for (const row of p.packets) validatePostCanaryBatch07RenderingPacket(
  JSON.parse(await readFile(path.resolve(row.path), "utf8")));
const activationCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const preparationSha256 = sha256(preparationBytes);
const tokenInput = { protocolId: p.protocolId, authorizedAt, activationCommit, preparationSha256 };
const token = sha256(canonicalJson(tokenInput));
const activation = { schemaVersion: "1.0-assessment-production-post-canary-batch-07-rendering-verification-activation",
  protocolId: p.protocolId, status: "frozen-post-canary-batch-07-rendering-verification-authorized",
  authorizedAt, activationCommit, productionCanary: false, batchNumber: 7, stagingOnly: true,
  preparation: { path: PREPARATION, sha256: preparationSha256 },
  executionNavigation: { algorithm: "sha256-utf8-canonical-json", input: tokenInput, token,
    tokenPattern: "^[a-f0-9]{64}$", queryKeys: { token: "renderingExecution",
      viewport: "renderingViewport", phase: "renderingPhase", stage: "renderingStage" },
    keyboardBootstrapMethod: "Page.navigate-once-per-fresh-keyboard-tab",
    keyboardMeasuredMethod: "Runtime.evaluate-location.assign-with-exact-url-readyState-poll",
    keyboardMeasuredDeadlineMilliseconds: 15000, adaptiveRegenerationPermitted: false },
  sourceHashes: p.sourceHashes, toolHashes: p.toolHashes,
  packetHashes: Object.fromEntries(p.packets.map((row) => [row.path, row.sha256])),
  browserPlan: p.browserPlan, viewports: p.viewports, explicitOrder: p.explicitOrder,
  requiredBooleanChecks: p.requiredBooleanChecks, gateExpectations: p.gateExpectations,
  failurePolicy: p.failurePolicy, model: p.model, artifacts: p.artifacts,
  authorization: { renderingVerification: true, oneAttemptPerViewport: true,
    retry: false, timeoutExtension: false, adaptiveTransportChange: false,
    modelExecution: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "execute-frozen-batch-07-rendering-verification" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, debates: 10, viewportResultsAuthorized: 20,
  screenshotsAuthorized: 40, attemptsPerViewport: 1, retriesMaximum: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));
