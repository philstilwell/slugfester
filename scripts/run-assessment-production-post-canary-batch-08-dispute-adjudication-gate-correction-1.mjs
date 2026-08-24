#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-08/dispute-only-adjudication";
const planPath = `${ROOT}/gate-correction-1-plan.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const resultPath = `${ROOT}/gate-correction-1-execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const plan = JSON.parse(await readFile(planPath, "utf8"));
const activation = JSON.parse(await readFile(activationPath, "utf8"));
const correctedBytes = await readFile(plan.correction.file);
const correctedSource = correctedBytes.toString("utf8");
assert.equal(sha256(correctedBytes), plan.correction.proposedSha256);
assert.equal(
  correctedSource.includes(plan.correction.exactReplacement.to),
  true
);
assert.equal(
  correctedSource.includes(plan.correction.exactReplacement.from),
  false
);

const preimageSource = correctedSource.replace(
  plan.correction.exactReplacement.to,
  plan.correction.exactReplacement.from
);
assert.equal(sha256(preimageSource), plan.correction.preimageSha256);
assert.equal(
  activation.sourceHashes[plan.correction.file],
  plan.correction.preimageSha256
);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  if (file === plan.correction.file) {
    assert.equal(sha256(preimageSource), digest);
  } else {
    assert.equal(sha256(await readFile(file)), digest, file);
  }
}
for (const locked of Object.values(plan.lockedAcceptedEvidence)) {
  if (locked && typeof locked === "object" && locked.path && locked.sha256) {
    assert.equal(sha256(await readFile(locked.path)), locked.sha256, locked.path);
  }
}

const originalHashLoop = `for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, \`source hash mismatch: \${file}\`);
}`;
const overlayHashLoop = `for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  if (file === ${JSON.stringify(plan.correction.file)}) continue;
  assert.equal(sha256(await readFile(file)), digest, \`source hash mismatch: \${file}\`);
}`;
assert.equal(correctedSource.includes(originalHashLoop), true);
const overlaySource = correctedSource.replace(originalHashLoop, overlayHashLoop);
const temporaryDirectory = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-batch-08-adjudication-gate-")
);
const temporaryTest = path.join(temporaryDirectory, "gate-test.mjs");
let output;
try {
  await writeFile(temporaryTest, overlaySource);
  output = execFileSync(process.execPath, [temporaryTest], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

const parsedOutput = JSON.parse(output);
assert.equal(parsedOutput.status, "passed-analyzed");
assert.equal(parsedOutput.validContexts, 10);
assert.equal(parsedOutput.disputedMovesDecided, 174);
assert.equal(parsedOutput.candidateSelections, 533);
assert.equal(parsedOutput.scoresDerived, 0);

const result = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-08-adjudication-gate-correction-execution",
  protocolId: "assessment-production-post-canary-batch-08-dispute-only-adjudication",
  status: "passed-batch-08-adjudication-gate-correction-1-and-complete-cohort-replay",
  executedAt: "2026-08-24T12:52:00Z",
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  correctionLevel: 1,
  plan: {
    path: planPath,
    sha256: sha256(await readFile(planPath))
  },
  authentication: {
    frozenPreimageSha256: sha256(preimageSource),
    acceptedCorrectedTestSha256: sha256(correctedBytes),
    activationSourceHashesPassed: true,
    acceptedEvidenceHashesPassed: true
  },
  replay: {
    status: parsedOutput.status,
    contexts: 10,
    validContexts: 10,
    disputedMoves: 174,
    candidateSelections: 533,
    audioTranscriptInputs: 6,
    scoresDerived: 0
  },
  controls: {
    attempts: 1,
    retries: 0,
    reruns: 0,
    modelContextsExecuted: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    protectedEvidenceChanged: false,
    activationRecordChanged: false
  },
  nextAuthorizedAction:
    "standing-authorization-permits-batch-08-deterministic-final-ledger-assembly"
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(result, null, 2));
