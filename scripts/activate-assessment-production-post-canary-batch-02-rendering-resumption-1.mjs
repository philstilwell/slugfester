#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_ACTIVATION,
  POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_DOCUMENTATION,
  POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PREPARATION,
  POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  loadPostCanaryBatch02RenderingResumption1Packets,
  sha256Batch02RenderingResumption1,
  validatePostCanaryBatch02RenderingResumption1Plan
} from "./lib/assessment-production-post-canary-batch-02-rendering-resumption-1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedAtIndex >= 0
    ? process.argv[authorizedAtIndex + 1]
    : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(authorizedAt)), "--authorized-at must be ISO time");

const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const sha256 = sha256Batch02RenderingResumption1;
assertV4(
  !(await exists(POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_ACTIVATION)),
  "Batch 2 rendering resumption-1 activation already exists"
);
const preparationBytes = await readFile(
  path.resolve(POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PREPARATION)
);
const preparation = JSON.parse(preparationBytes);

assertV4(
  preparation.protocolId ===
      POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PROTOCOL_ID &&
    preparation.status ===
      "frozen-batch-02-rendering-resumption-1-prepared-under-continuation-authorization" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 2 &&
    preparation.stagingOnly === true &&
    preparation.userAuthorization.instruction === "Continue." &&
    preparation.userAuthorization.directIncrementalCostUsdMaximum === 0 &&
    preparation.authorization.executionActivation === false &&
    preparation.authorization.replacementViewportAttempt === false &&
    preparation.authorization.remainingViewportAttempts === false &&
    preparation.executionPolicy.replacementAttemptsMaximum === 1 &&
    preparation.executionPolicy.firstAttempts === 19 &&
    preparation.executionPolicy.retriesAfterResumptionMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    canonicalJson(preparation.requiredDocumentationBeforeAnyBrowserTab) ===
      canonicalJson(POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_DOCUMENTATION) &&
    Object.values(preparation.stopRules).every(Boolean),
  "valid frozen Batch 2 rendering resumption-1 preparation required"
);
execFileSync(
  process.execPath,
  [
    "scripts/test-assessment-production-post-canary-batch-02-rendering-resumption-1-preparation.mjs"
  ],
  { cwd: process.cwd(), stdio: "pipe" }
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: resumption source changed`);
}
for (const [file, digest] of Object.entries(preparation.inheritedSourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: inherited source changed`);
}
for (const [file, digest] of Object.entries(preparation.toolHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: rendering tool changed`);
}
await loadPostCanaryBatch02RenderingResumption1Packets(preparation);
validatePostCanaryBatch02RenderingResumption1Plan(preparation.viewportPlan);
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (output !== POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_ACTIVATION) {
    assertV4(!(await exists(output)), `future resumption output exists: ${output}`);
  }
}

const activationCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const preparationSha256 = sha256(preparationBytes);
const tokenInput = {
  protocolId: POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  authorizedAt,
  activationCommit,
  preparationSha256
};
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-rendering-transport-readiness-resumption-1-activation",
  protocolId: POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  status: "frozen-batch-02-rendering-resumption-1-authorized",
  authorizedAt,
  activationCommit,
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  userAuthorization: structuredClone(preparation.userAuthorization),
  preparation: {
    path: POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_PREPARATION,
    sha256: preparationSha256
  },
  executionNavigation: {
    algorithm: "sha256-utf8-canonical-json",
    input: tokenInput,
    token: sha256(canonicalJson(tokenInput)),
    tokenPattern: "^[a-f0-9]{64}$",
    priorActivationTokenReusePermitted: false
  },
  requiredDocumentationBeforeAnyBrowserTab: structuredClone(
    preparation.requiredDocumentationBeforeAnyBrowserTab
  ),
  documentationLoadMustPrecedeLocalServerAndBrowserTabs: true,
  viewportPlan: structuredClone(preparation.viewportPlan),
  packets: structuredClone(preparation.packets),
  packetHashes: Object.fromEntries(
    preparation.packets.map((row) => [row.path, row.sha256])
  ),
  sourceHashes: structuredClone(preparation.sourceHashes),
  inheritedSourceHashes: structuredClone(preparation.inheritedSourceHashes),
  toolHashes: structuredClone(preparation.toolHashes),
  gateExpectations: structuredClone(preparation.gateExpectations),
  browserPlan: structuredClone(preparation.browserPlan),
  compatibilityBoundary: structuredClone(preparation.compatibilityBoundary),
  executionPolicy: structuredClone(preparation.executionPolicy),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  authorization: {
    executionActivation: true,
    documentationPreload: true,
    replacementViewportAttempt: true,
    remainingViewportAttempts: true,
    totalViewportAttemptsMaximum: 20,
    retryAfterResumption: false,
    timeoutExtension: false,
    adaptiveTransportChange: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction:
    "load-frozen-documentation-then-execute-exactly-twenty-batch-02-rendering-resumption-viewports"
};

if (shouldWrite) {
  await writeFile(
    path.resolve(POST_CANARY_BATCH_02_RENDERING_RESUMPTION_1_ACTIVATION),
    `${JSON.stringify(activation, null, 2)}\n`
  );
}
console.log(JSON.stringify(activation, null, 2));
