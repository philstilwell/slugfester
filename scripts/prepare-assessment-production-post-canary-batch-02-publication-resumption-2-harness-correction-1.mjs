#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const CORRECTION = `${ROOT}/execution-harness-correction-1.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ORIGINAL_HARNESS =
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
const CORRECTED_HARNESS =
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-2-correction-1.mjs";
const LAUNCHER =
  "scripts/execute-assessment-production-post-canary-batch-02-publication-resumption-2-harness-correction-1.mjs";
const PREPARER =
  "scripts/prepare-assessment-production-post-canary-batch-02-publication-resumption-2-harness-correction-1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [preparationBytes, activationBytes, originalBytes, correctedBytes] =
  await Promise.all([
    readFile(path.resolve(PREPARATION)),
    readFile(path.resolve(ACTIVATION)),
    readFile(path.resolve(ORIGINAL_HARNESS)),
    readFile(path.resolve(CORRECTED_HARNESS))
  ]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();

assertV4(
  preparation.status ===
      "frozen-eight-untouched-post-canary-batch-02-publication-resumption-2-contexts-prepared-under-standing-authorization" &&
    activation.status ===
      "frozen-eight-untouched-post-canary-batch-02-publication-resumption-2-contexts-authorized-under-standing-authorization" &&
    activation.contexts?.length === 8 &&
    activation.executionPolicy?.contexts === 8 &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.schedulerRamp?.join(",") === "1,2" &&
    activation.model?.label === "5.6 Sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription",
  "the frozen Batch 2 resumption-2 activation changed"
);
assertV4(
  activation.sourceHashes?.[ORIGINAL_HARNESS] === sha256(originalBytes),
  "the original execution harness hash changed"
);
const correctedAssertion =
  "    activation.executionPolicy?.contexts === 8 &&\n    activation.executionPolicy?.attemptsPerContext";
const originalAssertion =
  "    activation.executionPolicy?.contexts === 9 &&\n    activation.executionPolicy?.attemptsPerContext";
assertV4(
  String(correctedBytes).split(correctedAssertion).length === 2,
  "the corrected harness assertion is not unique"
);
const reconstructedOriginal = String(correctedBytes).replace(
  correctedAssertion,
  originalAssertion
);
assertV4(
  Buffer.from(reconstructedOriginal).equals(originalBytes),
  "the corrected harness differs outside the one context-count assertion"
);
const modelArtifactPaths = activation.contexts.flatMap((context) => [
  context.rawOutput,
  context.validation,
  context.provenance
]);
const modelArtifactsAbsent = (
  await Promise.all(modelArtifactPaths.map(async (file) => !(await exists(file))))
).every(Boolean);
assertV4(
  !(await exists(EXECUTION)) && modelArtifactsAbsent,
  "a resumption-2 model artifact exists before harness correction"
);
if (shouldWrite) {
  assertV4(!(await exists(CORRECTION)), `${CORRECTION} already exists`);
}

const sourceFiles = [
  PREPARATION,
  ACTIVATION,
  ORIGINAL_HARNESS,
  CORRECTED_HARNESS,
  LAUNCHER,
  PREPARER,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  "scripts/lib/assessment-production-post-canary-batch-02-publication-resumption-2.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs"
];
const sourceHashes = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (file) => [file, sha256(await readFile(path.resolve(file)))])
  )
);
const correction = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-resumption-2-execution-harness-correction",
  status:
    "frozen-batch-02-publication-resumption-2-execution-harness-correction-1",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
    standingAuthorization: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0
  },
  failure: {
    category: "pre-model-execution-harness-assertion-mismatch",
    message: "the Batch 2 publication resumption controls changed",
    modelContextsAttempted: 0,
    modelAttemptsConsumed: 0,
    outputsWritten: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  change: {
    category: "execution-policy-context-count-assertion",
    expression: "activation.executionPolicy?.contexts",
    originalValue: 9,
    correctedValue: 8,
    changedAssertions: 1,
    schedulerChanged: false,
    modelChanged: false,
    contextSetChanged: false,
    packetOrSchemaChanged: false,
    stopRuleChanged: false
  },
  activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
  originalHarness: { path: ORIGINAL_HARNESS, sha256: sha256(originalBytes) },
  correctedHarness: { path: CORRECTED_HARNESS, sha256: sha256(correctedBytes) },
  launcher: {
    path: LAUNCHER,
    sha256: sha256(await readFile(path.resolve(LAUNCHER)))
  },
  sourceHashes,
  modelContextsAttemptedBeforeCorrection: 0,
  attemptsPerContext: 1,
  retriesAuthorized: false,
  timeoutExtensionsAuthorized: false,
  recursiveRepairsAuthorized: false,
  paidServicesAuthorized: false,
  productionMutationAuthorized: false,
  nextAuthorizedAction:
    "execute-the-eight-frozen-resumption-2-contexts-once-through-the-hash-locked-corrected-harness"
};

const serializedCorrection = `${JSON.stringify(correction, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(CORRECTION), serializedCorrection);
} else if (await exists(CORRECTION)) {
  assertV4(
    String(await readFile(path.resolve(CORRECTION))) === serializedCorrection,
    "the frozen execution-harness correction changed"
  );
}
console.log(JSON.stringify({
  status: shouldWrite ? correction.status : "preview",
  changedAssertions: 1,
  originalValue: 9,
  correctedValue: 8,
  modelContextsAttemptedBeforeCorrection: 0,
  attemptsPerContext: 1,
  retriesAuthorized: false,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: correction.nextAuthorizedAction
}, null, 2));
