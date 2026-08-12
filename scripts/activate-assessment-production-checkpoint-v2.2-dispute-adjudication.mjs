#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { CHECKPOINT_V22_DISPUTE_ADJ_ROOT } from "./lib/assessment-production-checkpoint-v2.2-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedIndex >= 0 ? process.argv[authorizedIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires the separate user-authorization timestamp"
);
const preparationPath =
  `${CHECKPOINT_V22_DISPUTE_ADJ_ROOT}/execution-preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_DISPUTE_ADJ_ROOT}/execution-manifest.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-prepared-not-authorized" &&
    preparation.authorization.executionActivation &&
    !preparation.authorization.adjudicationModelContexts &&
    preparation.stopRules.separateActivationRequired,
  "production checkpoint v2.2 adjudication activation is not prepared"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const manifest = {
  ...preparation,
  schemaVersion:
    "1.0-production-checkpoint-v2.2-dispute-only-adjudication-execution-manifest",
  status:
    "frozen-ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts-authorized",
  activatedAt: authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  authorization: {
    ...preparation.authorization,
    executionActivation: false,
    adjudicationModelContexts: true,
    deterministicValidation: true,
    deterministicAnalysis: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-ramped-ten-production-checkpoint-v2.2-dispute-only-adjudication-contexts-once"
};
if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-authorized" : "preview-authorized",
      authorizedAt,
      contexts: manifest.contexts.length,
      maximumConcurrency: manifest.executionPolicy.maximumConcurrency,
      retries: 0,
      directIncrementalCostUsdMaximum: 0,
      modelExecutionAuthorized: shouldWrite,
      scoresDerived: 0
    },
    null,
    2
  )
);
