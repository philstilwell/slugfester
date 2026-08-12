#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const PATH =
  "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json";
const manifest = JSON.parse(await readFile(PATH, "utf8"));
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
assert.equal(
  manifest.status,
  "frozen-production-checkpoint-v2.2-master-source-preparation-authorized"
);
for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    expected,
    `${file}: master-manifest source hash mismatch`
  );
}
assert.equal(manifest.productionCanary, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.cohort.exactDebateCount, 10);
assert.equal(manifest.cohort.exactSideCount, 20);
assert.deepEqual(
  manifest.cohort.debates.map((item) => item.debateNumber),
  ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"]
);
assert.equal(manifest.activeScoreStabilityPolicy.version, "v2.2");
assert.equal(manifest.activeScoreStabilityPolicy.scorePassesMaximum, 1);
assert.equal(
  manifest.activeScoreStabilityPolicy.modelAuthoredScoresAllowed,
  false
);
assert.equal(
  manifest.activeScoreStabilityPolicy.automaticRerunAllowed,
  false
);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.model.scoreBlind, true);
assert(Object.values(manifest.stopRules).every(Boolean));
assert.equal(manifest.recoveryBoundary.originalFailurePreserved, true);
assert.equal(manifest.recoveryBoundary.replacementDebatesUsed, 0);
assert.equal(manifest.recoveryBoundary.sourceChainOverlaysUsed, 1);
assert.equal(manifest.authorization.sourcePreparation, true);
assert.equal(manifest.authorization.discoveryModelExecution, false);
assert.equal(manifest.authorization.independentJudgmentModelExecution, false);
assert.equal(manifest.authorization.paidTranscription, false);
assert.equal(manifest.authorization.scoreDerivation, false);
assert.equal(manifest.authorization.publicationModelExecution, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.authorization.remainingProductionBatches, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.cohort.debates.map((item) => item.debateNumber),
      activePolicy: "v2.2",
      sourceChainOverlays: 1,
      scorePassesMaximum: 1,
      sourcePreparationAuthorized: true,
      modelExecutionAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
