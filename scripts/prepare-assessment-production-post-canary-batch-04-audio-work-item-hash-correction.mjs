#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/disagreement-extraction";
const preparationPath = `${root}/audio-work-item-preparation.json`;
const targetPath =
  "scripts/lib/assessment-production-post-canary-batch-04-audio-work-items.mjs";
const diagnosisPath = `${root}/audio-work-item-source-hash-failure-diagnosis.json`;
const planPath = `${root}/audio-work-item-source-hash-correction-plan.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const standingAuthorization =
  await loadAndValidatePostCanaryBatch04StandingAuthorization();
const [preparationBytes, targetBytes] = await Promise.all([
  readFile(preparationPath),
  readFile(targetPath)
]);
const preparation = JSON.parse(preparationBytes);
const recordedSha256 = preparation.sourceHashes?.[targetPath];
const actualSha256 = sha256(targetBytes);

assertV4(
  preparation.status ===
      "prepared-and-frozen-four-post-canary-batch-04-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    preparation.batchNumber === 4 &&
    preparation.totals?.moves === 4,
  "Batch 4 frozen audio work-item checkpoint changed"
);
assertV4(
  typeof recordedSha256 === "string" &&
    recordedSha256.length === 64 &&
    recordedSha256 !== actualSha256,
  "the preserved one-file source-hash mismatch was not reproduced"
);
assertV4(
  preparation.workArtifact?.sha256 ===
    sha256(await readFile(preparation.workArtifact.path)),
  "the frozen audio work-item artifact changed"
);
if (shouldWrite) {
  assertV4(
    !(await exists(diagnosisPath)) && !(await exists(planPath)),
    "Batch 4 audio work-item hash correction is already frozen"
  );
}

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-work-item-source-hash-failure-diagnosis",
  status: "diagnosed-preserved-one-byte-tool-source-hash-mismatch",
  batchNumber: 4,
  checkpointCommit,
  standingAuthorization: {
    path: POST_CANARY_BATCH_04_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256
  },
  preservedFailure: {
    validator:
      "scripts/prepare-assessment-production-post-canary-batch-04-audio-sources.mjs",
    message: `source hash mismatch: ${targetPath}`,
    mediaAccessOccurred: false,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  cause: {
    category: "deterministic-validation-source-hash-mismatch",
    targetPath,
    recordedSha256,
    actualCommittedSha256: actualSha256,
    semanticChange: false,
    exactDifference:
      "The frozen hash was captured before removal of one trailing blank line required by git diff --check."
  },
  protectedEvidence: {
    preparationPath,
    preparationSha256: sha256(preparationBytes),
    workArtifactPath: preparation.workArtifact.path,
    workArtifactSha256: preparation.workArtifact.sha256,
    moves: 4,
    packetOrSchemaChanges: 0
  }
};
const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-audio-work-item-source-hash-correction-plan",
  status: "frozen-bounded-source-hash-correction-ready-for-activation",
  batchNumber: 4,
  checkpointCommit,
  diagnosis: {
    path: diagnosisPath,
    sha256: sha256(diagnosisBytes)
  },
  authenticatedInput: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  exactMutation: {
    jsonPointer: `/sourceHashes/${targetPath.replaceAll("/", "~1")}`,
    targetPath,
    fromSha256: recordedSha256,
    toSha256: actualSha256,
    writableFields: 1
  },
  controls: {
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    mediaAccessAllowed: false,
    modelsAllowed: false,
    paidServicesAllowed: false,
    scoresAllowed: false,
    packetOrSchemaChangesAllowed: false,
    directIncrementalCostUsdMaximum: 0
  },
  requiredValidation: {
    audioWorkItemReplay: true,
    audioSourcePreparationPreview: true,
    preservedWorkArtifactHash: preparation.workArtifact.sha256
  }
};

if (shouldWrite) {
  await writeFile(diagnosisPath, diagnosisBytes);
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifacts: shouldWrite,
      targetPath,
      fromSha256: recordedSha256,
      toSha256: actualSha256,
      writableFields: 1,
      mediaAccessOccurred: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
