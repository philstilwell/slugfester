#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_SCORE_ROOT } from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";

const preparationPath =
  `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`;
const scoresPath = `${CHECKPOINT_V22_SCORE_ROOT}/calculated-scores.json`;
const analysisPath = `${CHECKPOINT_V22_SCORE_ROOT}/analysis.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (!(await exists(preparationPath))) {
  assert.equal(await exists(activationPath), false);
  assert.equal(await exists(scoresPath), false);
  assert.equal(await exists(analysisPath), false);
  console.log(
    JSON.stringify(
      {
        status: "passed-prefreeze",
        scorePassesMaximum: 1,
        realScoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assert.equal(
  preparation.status,
  "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-prepared-not-authorized"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.activePolicyControl.version, "v2.2");
assert.equal(preparation.authorization.scorePassActivation, true);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.scorePassesMaximum, 1);
assert.equal(preparation.authorization.scoreRerun, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(
  preparation.acceptanceRule.agreedInitialProOrConMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  preparation.acceptanceRule.agreedInitialTieDirectionConstraint,
  "none"
);
assert.equal(
  preparation.acceptanceRule.disagreedInitialWinnerDirectionConstraint,
  "none"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(
    sha256(await readFile(path.resolve(file))),
    digest,
    `source hash mismatch: ${file}`
  );
}
if (!(await exists(activationPath))) {
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-not-authorized",
        activePolicy: "v2.2",
        scorePassesMaximum: 1,
        integerRoundedTiesAllowed: true,
        scoreDerivationAuthorized: false,
        scoreRerunAuthorized: false,
        realScoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const manifest = JSON.parse(await readFile(path.resolve(activationPath), "utf8"));
assert.equal(
  manifest.status,
  "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-authorized"
);
assert.equal(manifest.authorization.scorePassActivation, false);
assert.equal(manifest.authorization.scoreDerivation, true);
assert.equal(manifest.authorization.scorePassesMaximum, 1);
assert.equal(manifest.authorization.scoreRerun, false);
assert.equal(manifest.preparationManifest.sha256, sha256(preparationBytes));
if (!(await exists(scoresPath))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-activated",
        activePolicy: "v2.2",
        scorePassesMaximum: 1,
        scoreDerivationAuthorized: true,
        scoreRerunAuthorized: false,
        realScoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const scores = JSON.parse(await readFile(path.resolve(scoresPath), "utf8"));
assert.equal(scores.totals.scoringPasses, 1);
assert.equal(scores.totals.debates, 10);
assert.equal(scores.totals.finalSides, 20);
assert.equal(scores.authorization.scoreRerun, false);
if (!(await exists(analysisPath))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-scored-not-analyzed",
        scoreStatus: scores.status,
        scoringPasses: 1,
        scoreRerunAuthorized: false
      },
      null,
      2
    )
  );
  process.exit(0);
}
const analysis = JSON.parse(await readFile(path.resolve(analysisPath), "utf8"));
assert.equal(analysis.totals.scoringPasses, 1);
assert.equal(analysis.authorization.scoreRerun, false);
assert.equal(analysis.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      analysisStatus: analysis.status,
      scoringPasses: 1,
      scoreRerunAuthorized: false
    },
    null,
    2
  )
);
