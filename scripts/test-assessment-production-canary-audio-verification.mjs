#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/canary-v1-audio-verification";
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (!(await exists(manifestPath))) {
  const prep = JSON.parse(
    await readFile(
      "docs/assessment-production/canary-v1-disagreement-audio-prep/audio-source-preparation.json",
      "utf8"
    )
  );
  assert.equal(
    prep.status,
    "prepared-four-local-production-canary-audio-clips"
  );
  assert.equal(prep.clips.length, 4);
  assert.equal(prep.authorization.audioVerificationManifest, true);
  assert.equal(prep.authorization.paidTranscriptionExecution, false);
  console.log(
    JSON.stringify(
      { status: "passed-prefreeze", clips: 4, paidCalls: 0, scoresDerived: 0 },
      null,
      2
    )
  );
  process.exit(0);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(
  manifest.status,
  "frozen-four-paid-known-speaker-diarizations-authorized"
);
assert.equal(manifest.calls.length, 4);
assert.equal(manifest.executionPolicy.attemptsPerCall, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.knownSpeakerReferencesPerCall, 2);
assert.equal(manifest.costEstimate.ChatGPTSubscriptionApplicable, false);
assert.equal(manifest.costEstimate.explicitUserApprovalRecorded, true);
assert(manifest.costEstimate.expectedCostUsd <= 0.065);
assert.equal(manifest.costEstimate.maximumAuthorizedCostUsd, 0.15);
assert(
  manifest.referenceContract.references.every(
    (reference) =>
      reference.actualDurationSeconds >= 1.2 &&
      reference.actualDurationSeconds <= 10
  )
);
assert.equal(manifest.referenceContract.references.length, 6);
assert.equal(manifest.judgmentModelBoundary.judgmentModel, "5.6 Sol");
assert.equal(manifest.judgmentModelBoundary.reasoningEffort, "low");
assert.equal(
  manifest.judgmentModelBoundary.authentication,
  "ChatGPT subscription"
);
assert.equal(manifest.authorization.adjudicationPacketPreparation, false);
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
        calls: 4,
        expectedCostUsd: manifest.costEstimate.expectedCostUsd,
        maximumAuthorizedCostUsd: 0.15,
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
assert.equal(execution.callsPlanned, 4);
assert.equal(execution.attempts, execution.callsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.scoresDerived, 0);
assert(
  execution.estimatedProcessingExposureUsd <= execution.maximumAuthorizedCostUsd
);
if (execution.commonRequestFailure) {
  const firstFailure = execution.results.findIndex(
    (result) => result.status === "request-failed"
  );
  assert(firstFailure >= 0);
  assert(
    execution.results
      .slice(firstFailure + 1)
      .every((result) => result.status === "skipped-after-request-failure")
  );
}

if (!(await exists(analysisPath))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-executed",
        executionStatus: execution.status,
        callsAttempted: execution.callsAttempted,
        callsCompleted: execution.callsCompleted,
        retries: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
const audit = JSON.parse(
  await readFile(`${stageRoot}/audio-verification.json`, "utf8")
);
assert.equal(analysis.gate.requiredMoves, 4);
assert.equal(analysis.costs.retries, 0);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
assert.equal(audit.totals.scoresDerived, 0);
if (analysis.gate.passed) {
  assert.equal(
    analysis.status,
    "passed-all-four-production-canary-confidence-moves-audio-verified"
  );
  assert.equal(analysis.gate.verified, 4);
  assert.equal(analysis.gate.unresolved, 0);
  assert.equal(analysis.authorization.adjudicationPacketPreparation, true);
  for (const debate of audit.debates) {
    for (const move of debate.moves) {
      assert.equal(move.status, "verified");
      assert(Object.values(move.deterministicEvidence.checks).every(Boolean));
      assert.equal(
        sha256(await readFile(move.transcript.path)),
        move.transcript.sha256
      );
    }
  }
} else {
  assert.equal(
    analysis.status,
    "production-canary-audio-verification-unresolved"
  );
  assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
}
console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      audioStatus: analysis.status,
      verified: analysis.gate.verified,
      unresolved: analysis.gate.unresolved,
      estimatedProcessingExposureUsd:
        analysis.costs.estimatedProcessingExposureUsd,
      retries: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
