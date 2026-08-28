#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { POST_CANARY_BATCH_17_SCORE_ROOT } from "./lib/assessment-production-post-canary-batch-17-score-gate.mjs";
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
  `${POST_CANARY_BATCH_17_SCORE_ROOT}/score-pass-preparation-manifest.json`;
const activationPath =
  `${POST_CANARY_BATCH_17_SCORE_ROOT}/score-pass-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-post-canary-batch-17-single-deterministic-score-pass-prepared-not-activated" &&
    preparation.authorization.scorePassActivation &&
    !preparation.authorization.scoreDerivation &&
    preparation.authorization.scorePassesMaximum === 1 &&
    preparation.stopRules.separateActivationRequired,
  "post-canary Batch 17 score-pass activation is not prepared"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const manifest = {
  ...preparation,
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-17-single-score-pass-execution-manifest",
  status:
    "frozen-post-canary-batch-17-single-deterministic-score-pass-authorized",
  activatedAt: authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userExecutionAuthorization: {
    instruction:
      "The frozen Batch 17 standing authorization permits activation and execution of exactly one repository score pass, with no rerun and direct incremental cost capped at $0.",
    directIncrementalCostUsdMaximum: 0,
    scorePasses: 1,
    scoreRerunsMaximum: 0,
    modelExecution: false,
    paidServices: false,
    publicationPacketPreparation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  authorization: {
    ...preparation.authorization,
    scorePassActivation: false,
    scoreDerivation: true,
    scoreAnalysis: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-single-deterministic-post-canary-batch-17-score-pass-once"
};
if (shouldWrite) {
  await writeFile(
    path.resolve(activationPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-authorized" : "preview-authorized",
      authorizedAt,
      scorePassesMaximum: 1,
      activePolicy: manifest.activePolicyControl.version,
      scoreDerivationAuthorized: shouldWrite,
      scoreRerunAuthorized: false,
      calculatedScores: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
