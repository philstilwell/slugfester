#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const CORRECTION_ROOT = `${ROOT}/preparation-correction-1`;
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const ANALYSIS = `${CORRECTION_ROOT}/analysis.json`;
const ORIGINAL_TEST =
  "scripts/test-assessment-production-post-canary-batch-04-independent-judgment-preparation.mjs";
const CORRECTED_TEST =
  "scripts/test-assessment-production-post-canary-batch-04-independent-judgment-preparation-correction-1.mjs";
const SCRIPT =
  "scripts/validate-assessment-production-post-canary-batch-04-independent-judgment-preparation-correction-1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assert(frozenAt && !Number.isNaN(Date.parse(frozenAt)));

const [preparationBytes, originalTestBytes, correctedTestBytes] =
  await Promise.all([
    readFile(PREPARATION),
    readFile(ORIGINAL_TEST),
    readFile(CORRECTED_TEST),
  ]);
const preparation = JSON.parse(preparationBytes);
assert.equal(
  preparation.status,
  "twenty-post-canary-batch-04-independent-judgment-contexts-prepared-and-frozen"
);
assert.equal(preparation.totals.uniqueMoves, 203);
assert.equal(preparation.totals.movesJudgedAcrossPasses, 406);
assert.deepEqual(
  preparation.audioPolicy.pendingAttributionVerificationMoves,
  []
);
assert.equal(
  preparation.sourceHashes[ORIGINAL_TEST],
  sha256(originalTestBytes)
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drifted`);
}
const expectedCorrectedTest = originalTestBytes
  .toString()
  .replace(
    "preparation.audioPolicy.pendingAttributionVerificationMoves.length, 4",
    "preparation.audioPolicy.pendingAttributionVerificationMoves.length, 0"
  )
  .replace("assert.equal(movesAcrossPasses, 400);", "assert.equal(movesAcrossPasses, 406);");
assert.equal(correctedTestBytes.toString(), expectedCorrectedTest);

const validation = JSON.parse(
  execFileSync(process.execPath, [CORRECTED_TEST], { encoding: "utf8" })
);
assert.equal(validation.status, "passed");
assert.equal(validation.debates, 10);
assert.equal(validation.contexts, 20);
assert.equal(validation.uniqueMoves, 203);
assert.equal(validation.movesJudgedAcrossPasses, 406);
assert.equal(validation.modelContexts, 0);
assert.equal(validation.audioCalls, 0);
assert.equal(validation.scoresDerived, 0);

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-independent-judgment-preparation-validation-diagnosis",
  status:
    "preserved-preparation-validator-inherited-two-batch-03-count-expectations",
  frozenAt,
  checkpointCommit,
  branch: "main",
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  originalValidator: ORIGINAL_TEST,
  originalValidatorSha256: sha256(originalTestBytes),
  failureCategory: "deterministic-validation-expectation-mismatch",
  observedMismatches: [
    {
      field: "audioPolicy.pendingAttributionVerificationMoves.length",
      inheritedExpected: 4,
      frozenBatch04Value: 0,
    },
    {
      field: "movesAcrossPasses",
      inheritedExpected: 400,
      frozenBatch04Value: 406,
    },
  ],
  packetsChanged: false,
  schemasChanged: false,
  sourcesChanged: false,
  inventoriesChanged: false,
  modelSettingsChanged: false,
  modelContextsExecuted: 0,
  directIncrementalCostUsd: 0,
};
const diagnosisBytes = jsonBytes(diagnosis);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-independent-judgment-preparation-validation-correction-1-analysis",
  status:
    "bounded-deterministic-preparation-validation-overlay-passed",
  frozenAt,
  checkpointCommit,
  diagnosis: DIAGNOSIS,
  diagnosisSha256: sha256(diagnosisBytes),
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  originalValidator: ORIGINAL_TEST,
  originalValidatorSha256: sha256(originalTestBytes),
  correctedValidator: CORRECTED_TEST,
  correctedValidatorSha256: sha256(correctedTestBytes),
  correctionValidator: SCRIPT,
  correctionValidatorSha256: sha256(await readFile(SCRIPT)),
  exactCorrectedExpectations: {
    pendingAttributionVerificationMoves: 0,
    uniqueMoves: 203,
    movesJudgedAcrossPasses: 406,
  },
  validation,
  protectedPreparationSourceHashesReplayed: true,
  packetsChanged: false,
  schemasChanged: false,
  sourcesChanged: false,
  inventoriesChanged: false,
  modelSettingsChanged: false,
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction:
    "prepare-independent-judgment-execution-manifest-under-standing-authorization",
};
if (shouldWrite) {
  assert.equal(await exists(DIAGNOSIS), false);
  assert.equal(await exists(ANALYSIS), false);
  await mkdir(path.dirname(DIAGNOSIS), { recursive: true });
  await writeFile(DIAGNOSIS, diagnosisBytes);
  await writeFile(ANALYSIS, jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      correctedExpectations: analysis.exactCorrectedExpectations,
      contexts: 20,
      packetsChanged: false,
      modelContextsExecuted: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
