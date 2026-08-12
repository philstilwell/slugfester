#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const approvedIndex = process.argv.indexOf("--approved-at");
const approvedAt = approvedIndex >= 0 ? process.argv[approvedIndex + 1] : null;
assertV4(
  approvedAt && !Number.isNaN(Date.parse(approvedAt)),
  "--approved-at requires the explicit user-approval timestamp"
);
const stageRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "prepared-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-pending-explicit-user-approval" &&
    preparation.authorization.paidTranscriptionActivation &&
    !preparation.authorization.paidTranscriptionExecution &&
    preparation.costEstimate.explicitUserApprovalRequired &&
    !preparation.costEstimate.explicitUserApprovalRecorded,
  "production checkpoint v2.2 paid audio activation is not prepared"
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
    "1.0-production-checkpoint-v2.2-audio-verification-execution-manifest",
  status:
    "frozen-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-authorized",
  approvedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  costEstimate: {
    ...preparation.costEstimate,
    explicitUserApprovalRecorded: true
  },
  authorization: {
    ...preparation.authorization,
    paidTranscriptionActivation: false,
    paidTranscriptionExecution: true,
    deterministicAudioAnalysis: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-once"
};
if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview-approved-activation",
      approvedAt,
      callsMaximum: manifest.executionPolicy.callsMaximum,
      expectedCostUsd: manifest.costEstimate.expectedCostUsd,
      maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd,
      retries: 0,
      paidTranscriptionExecution: shouldWrite,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
