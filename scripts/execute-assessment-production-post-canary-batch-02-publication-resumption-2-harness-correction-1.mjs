#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const CORRECTION = `${ROOT}/execution-harness-correction-1.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ORIGINAL_HARNESS =
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
const CORRECTED_HARNESS =
  "scripts/run-assessment-production-post-canary-batch-02-publication-resumption-2-correction-1.mjs";
const LAUNCHER =
  "scripts/execute-assessment-production-post-canary-batch-02-publication-resumption-2-harness-correction-1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [correctionBytes, activationBytes, originalBytes, correctedBytes, launcherBytes] =
  await Promise.all([
    readFile(path.resolve(CORRECTION)),
    readFile(path.resolve(ACTIVATION)),
    readFile(path.resolve(ORIGINAL_HARNESS)),
    readFile(path.resolve(CORRECTED_HARNESS)),
    readFile(path.resolve(LAUNCHER))
  ]);
const correction = JSON.parse(correctionBytes);
const activation = JSON.parse(activationBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();
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
  correction.status ===
      "frozen-batch-02-publication-resumption-2-execution-harness-correction-1" &&
    correction.activation?.path === ACTIVATION &&
    correction.activation?.sha256 === sha256(activationBytes) &&
    correction.originalHarness?.path === ORIGINAL_HARNESS &&
    correction.originalHarness?.sha256 === sha256(originalBytes) &&
    correction.correctedHarness?.path === CORRECTED_HARNESS &&
    correction.correctedHarness?.sha256 === sha256(correctedBytes) &&
    correction.launcher?.path === LAUNCHER &&
    correction.launcher?.sha256 === sha256(launcherBytes) &&
    correction.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_02_STANDING_AUTHORIZATION &&
    correction.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256 &&
    Buffer.from(reconstructedOriginal).equals(originalBytes) &&
    activation.sourceHashes?.[ORIGINAL_HARNESS] === sha256(originalBytes) &&
    activation.contexts?.length === 8 &&
    activation.executionPolicy?.contexts === 8 &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    correction.modelContextsAttemptedBeforeCorrection === 0 &&
    correction.retriesAuthorized === false &&
    correction.timeoutExtensionsAuthorized === false &&
    correction.recursiveRepairsAuthorized === false &&
    correction.paidServicesAuthorized === false &&
    !(await exists(EXECUTION)),
  "the frozen resumption-2 execution-harness correction failed authentication"
);

await import("./run-assessment-production-post-canary-batch-02-publication-resumption-2-correction-1.mjs");
