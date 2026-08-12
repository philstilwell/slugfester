#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_SCORE_ROOT } from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";
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
  `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-prepared-not-authorized" &&
    preparation.authorization.scorePassActivation &&
    !preparation.authorization.scoreDerivation &&
    preparation.stopRules.separateActivationRequired,
  "production-checkpoint v2.2 score-pass activation is not prepared"
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
    "1.0-production-checkpoint-v2.2-single-score-pass-execution-manifest",
  status:
    "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-authorized",
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
    scorePassActivation: false,
    scoreDerivation: true,
    scoreAnalysis: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-single-deterministic-production-checkpoint-v2.2-score-pass-once"
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
