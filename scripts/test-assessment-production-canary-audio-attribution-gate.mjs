#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const root = "docs/assessment-production/canary-v1-audio-attribution-adjudication";
const manifestPath = `${root}/execution-manifest.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(manifestPath))) {
  const preparation = JSON.parse(
    await readFile(`${root}/preparation-manifest.json`, "utf8")
  );
  assert.equal(
    preparation.status,
    "prepared-one-production-canary-disputed-audio-attribution"
  );
  assert.equal(preparation.authorization.modelExecution, false);
  console.log(
    JSON.stringify(
      { status: "passed-prefreeze", contexts: 0, scoresDerived: 0 },
      null,
      2
    )
  );
  process.exit(0);
}
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(
  manifest.status,
  "frozen-one-production-canary-audio-attribution-context-authorized"
);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.context.copiedInputBytes <= 115000, true);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.authorization.modelExecution, true);
assert.equal(manifest.authorization.retry, false);
assert.equal(manifest.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
if (!(await exists(executionPath))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen",
        contexts: 1,
        copiedInputBytes: manifest.context.copiedInputBytes,
        attempts: 1,
        retries: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}
const execution = JSON.parse(await readFile(executionPath, "utf8"));
assert.equal(execution.contexts, 1);
assert.equal(execution.attempts, 1);
assert.equal(execution.retries, 0);
assert.equal(execution.meteredApiCostUsd, 0);
assert.equal(execution.paidTranscriptionCalls, 0);
assert.equal(execution.scoresDerived, 0);
if (!(await exists(analysisPath))) {
  console.log(
    JSON.stringify(
      { status: "passed-executed", executionStatus: execution.status },
      null,
      2
    )
  );
  process.exit(0);
}
const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
assert.equal(analysis.preservedDeterministicGate.verified, 3);
assert.equal(analysis.preservedDeterministicGate.unresolved, 1);
assert.equal(analysis.preservedDeterministicGate.erasedOrReclassified, false);
assert.equal(analysis.costs.additionalPaidTranscriptionCalls, 0);
assert.equal(analysis.costs.meteredModelApiCostUsd, 0);
assert.equal(analysis.scoreBlindness.scoresAccessed, false);
assert.equal(analysis.authorization.scoreDerivation, false);
if (analysis.status === "production-canary-audio-attribution-adjudication-passed") {
  assert.equal(analysis.adjudication.validation.verified, 1);
  assert.equal(analysis.adjudication.validation.unresolved, 0);
  assert.equal(analysis.combinedAudioResult.verificationRate, 1);
  assert.equal(analysis.authorization.disputeAdjudicationPacketPreparation, true);
} else {
  assert.equal(
    analysis.status,
    "production-canary-audio-attribution-adjudication-unresolved"
  );
  assert.equal(analysis.authorization.disputeAdjudicationPacketPreparation, false);
}
console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      audioAttributionStatus: analysis.status,
      combinedAudioVerified:
        analysis.combinedAudioResult.deterministicallyVerified +
        analysis.combinedAudioResult.adjudicatedVerified,
      combinedAudioRequired: analysis.combinedAudioResult.requiredMoves,
      retries: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
