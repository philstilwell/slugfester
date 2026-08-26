#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID as PROTOCOL_ID,
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT
} from "./lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp");
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), "recovery activation already exists");
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === PROTOCOL_ID &&
  preparation.status ===
    "frozen-two-context-batch-10-debate-21-publication-timeout-recovery-prepared-not-activated" &&
  preparation.contexts?.length === 2 &&
  preparation.batchNumber === 10,
  "recovery is not prepared"
);
assertV4(
  preparation.model?.slug === "gpt-5.6-sol" &&
  preparation.model?.reasoningEffort === "low" &&
  preparation.model?.authentication === "ChatGPT subscription",
  "model controls changed"
);
assertV4(
  preparation.executionPolicy?.attemptsPerContext === 1 &&
  preparation.executionPolicy?.retriesMaximum === 0 &&
  preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  preparation.executionPolicy?.recursiveCorrectionsMaximum === 0 &&
  canonicalJson(preparation.executionPolicy?.schedulerRamp) ===
    canonicalJson([1, 2]),
  "execution policy changed"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8"
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "Codex command-line version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) {
    assertV4(!(await exists(future)), `future output exists: ${future}`);
  }
}
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-publication-timeout-recovery-activation",
  protocolId: PROTOCOL_ID,
  status:
    "frozen-two-context-batch-10-debate-21-publication-timeout-recovery-activated",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: preparation.userAuthorization,
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: preparation.model,
  contexts: preparation.contexts,
  modelInputs: preparation.modelInputs,
  isolation: preparation.isolation,
  recoveryContract: preparation.recoveryContract,
  executionEnvironment: preparation.executionEnvironment,
  executionPolicy: preparation.executionPolicy,
  stopRules: preparation.stopRules,
  sourceHashes: {
    ...preparation.sourceHashes,
    [PREPARATION]: sha256(preparationBytes)
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== ACTIVATION
    ),
  artifacts: preparation.artifacts,
  authorization: {
    exactTwoRecoveryContexts: true,
    modelExecution: true,
    deterministicValidation: true,
    deterministicMerge: true,
    unattemptedContextResumption: false,
    retries: false,
    timeoutExtensions: false,
    recursiveCorrections: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "execute-exactly-two-frozen-debate-21-publication-timeout-recovery-contexts"
};
if (shouldWrite) {
  await writeFile(path.resolve(ACTIVATION),
    `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "preview",
  contextsAuthorized: 2,
  debate: "21",
  model: activation.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  hostAwakeGuard: activation.executionEnvironment.hostAwakeGuard,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
