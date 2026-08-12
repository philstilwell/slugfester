#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/audio-verification";
const prepPath = `${stageRoot}/execution-preparation-manifest.json`;
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!(await exists(prepPath))) {
  const sourcePreparation = JSON.parse(
    await readFile(
      "docs/assessment-production/production-checkpoint-v2.2-1/disagreement-extraction/audio-source-preparation.json",
      "utf8"
    )
  );
  assert.equal(
    sourcePreparation.status,
    "prepared-two-production-checkpoint-v2.2-local-audio-clips"
  );
  assert.equal(sourcePreparation.clips.length, 2);
  assert.equal(
    sourcePreparation.authorization.audioVerificationManifestPreparation,
    true
  );
  assert.equal(sourcePreparation.authorization.paidTranscriptionExecution, false);
  console.log(
    JSON.stringify(
      {
        status: "passed-prefreeze",
        clips: 2,
        paidCalls: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const preparation = JSON.parse(await readFile(prepPath, "utf8"));
assert.equal(
  preparation.status,
  "prepared-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-pending-explicit-user-approval"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.calls.length, 2);
assert.equal(preparation.referenceContract.references.length, 4);
assert.equal(preparation.referenceContract.measuredBeforeExecution, true);
assert(
  preparation.referenceContract.references.every(
    (reference) =>
      reference.actualDurationSeconds >= 1.2 &&
      reference.actualDurationSeconds <= 10
  )
);
assert.equal(preparation.executionPolicy.attemptsPerCall, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.knownSpeakerReferencesPerCall, 2);
assert.equal(preparation.costEstimate.planningPricePerMinuteUsd, 0.006);
assert.equal(preparation.costEstimate.clipMinutes, 6.1577);
assert.equal(preparation.costEstimate.expectedCostUsd, 0.0369);
assert.equal(preparation.costEstimate.maximumAuthorizedCostUsd, 0.1);
assert.equal(preparation.costEstimate.ChatGPTSubscriptionApplicable, false);
assert.equal(preparation.costEstimate.OpenAIApiBillingRequired, true);
assert.equal(preparation.costEstimate.explicitUserApprovalRecorded, false);
assert.equal(preparation.judgmentModelBoundary.judgmentModel, "5.6 Sol");
assert.equal(preparation.judgmentModelBoundary.modelSlug, "gpt-5.6-sol");
assert.equal(preparation.judgmentModelBoundary.reasoningEffort, "low");
assert.equal(
  preparation.judgmentModelBoundary.authentication,
  "ChatGPT subscription"
);
assert.equal(preparation.judgmentModelBoundary.scoreBlind, true);
assert.equal(preparation.authorization.paidTranscriptionActivation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.policyPromotion, false);
assert.equal(preparation.authorization.productionMutation, false);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const reference of preparation.referenceContract.references) {
  assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
}

if (!(await exists(manifestPath))) {
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-prepared-pending-approval",
        calls: 2,
        references: 4,
        expectedCostUsd: preparation.costEstimate.expectedCostUsd,
        maximumAuthorizedCostUsd:
          preparation.costEstimate.maximumAuthorizedCostUsd,
        retries: 0,
        paidExecutionAuthorized: false,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(
  manifest.status,
  "frozen-two-production-checkpoint-v2.2-paid-known-speaker-diarizations-authorized"
);
assert.equal(manifest.costEstimate.explicitUserApprovalRecorded, true);
assert.equal(manifest.authorization.paidTranscriptionExecution, true);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
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
        calls: 2,
        expectedCostUsd: 0.0369,
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
assert.equal(execution.callsPlanned, 2);
assert.equal(execution.attempts, execution.callsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.scoresDerived, 0);
assert(
  execution.estimatedProcessingExposureUsd <=
    execution.maximumAuthorizedCostUsd
);
if (execution.commonRequestFailure) {
  const firstFailure = execution.results.findIndex(
    (result) => result.status === "request-failed"
  );
  assert(firstFailure >= 0);
  assert(
    execution.results.slice(firstFailure + 1).every(
      (result) => result.status === "skipped-after-request-failure"
    )
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
assert.equal(analysis.gate.requiredMoves, 2);
assert.equal(analysis.costs.retries, 0);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
assert.equal(audit.totals.scoresDerived, 0);
if (analysis.gate.passed) {
  assert.equal(
    analysis.status,
    "passed-both-production-checkpoint-v2.2-confidence-moves-audio-verified"
  );
  assert.equal(analysis.gate.verified, 2);
  assert.equal(analysis.gate.unresolved, 0);
  assert.equal(analysis.authorization.adjudicationPacketPreparation, true);
} else {
  assert.equal(
    analysis.status,
    "production-checkpoint-v2.2-audio-verification-unresolved"
  );
  assert.equal(analysis.authorization.audioFailureDiagnosis, true);
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
