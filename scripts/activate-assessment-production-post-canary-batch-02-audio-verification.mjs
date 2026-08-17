#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const approvedIndex = process.argv.indexOf("--approved-at");
const approvedAt = approvedIndex >= 0 ? process.argv[approvedIndex + 1] : null;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
assert(approvedAt && !Number.isNaN(Date.parse(approvedAt)), "--approved-at requires an ISO timestamp");

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const productionManifestPath = "docs/assessment-production/manifest-v1.json";
const expectedDebates = ["83", "99", "93", "101"];
const exactInstruction = "I approve activation and execution of exactly the ten frozen Batch 2 audio-verification calls using gpt-4o-transcribe-diarize through the OpenAI Transcription API, with two frozen same-debate speaker references per call, sequential execution, one attempt per call, no retries, and a maximum direct incremental cost of $0.40. Apply returned-token usage at the frozen official rates and stop remaining calls after any request-level failure or usage-derived cap exceedance. Stop after deterministic audio-verification validation, cost analysis, committing, and pushing. Do not run judgment or adjudication models, derive scores, reconstruct publication, mutate production, or select the next batch.";
const executionTools = [
  "scripts/activate-assessment-production-post-canary-batch-02-audio-verification.mjs",
  "scripts/run-assessment-production-post-canary-batch-02-audio-verification.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-audio-verification.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-02-audio-cost-control.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-audio-verification.mjs",
  "scripts/lib/v416-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert(!(await exists(activationPath)), `${activationPath} already exists`);
const [preparationBytes, productionManifestBytes] = await Promise.all([
  readFile(preparationPath),
  readFile(productionManifestPath)
]);
const preparation = JSON.parse(preparationBytes);
const productionManifest = JSON.parse(productionManifestBytes);

assert(preparation.status === "prepared-ten-post-canary-batch-02-paid-known-speaker-diarizations-pending-separate-explicit-user-approval", "Batch 2 audio-verification preparation status changed");
assert(preparation.calls.length === 10, "exactly ten frozen calls required");
assert(preparation.model === "gpt-4o-transcribe-diarize", "transcription model changed");
assert(preparation.executionPolicy.sequentialExecution, "execution must remain sequential");
assert(preparation.executionPolicy.attemptsPerCall === 1, "one attempt per call required");
assert(preparation.executionPolicy.retriesMaximum === 0, "retries must remain disabled");
assert(preparation.executionPolicy.stopRemainingAfterRequestLevelFailure, "request failure stop changed");
assert(preparation.executionPolicy.stopRemainingAfterUsageDerivedCapExceedance, "cost stop changed");
assert(preparation.costEstimate.primaryExpectedFutureExecutionCostUsd === 0.273, "frozen usage-derived estimate changed");
assert(preparation.costEstimate.proposedFutureMaximumCostUsd === 0.4, "frozen proposed cap changed");
assert(preparation.costEstimate.officialPricePerMillionTokensUsd.input === 2.5, "input price changed");
assert(preparation.costEstimate.officialPricePerMillionTokensUsd.output === 10, "output price changed");
assert(!preparation.authorization.paidTranscriptionExecution && !preparation.authorization.audioVerificationExecution, "paid execution was already authorized");
assert(preparation.judgmentModelBoundary.judgmentModel === "5.6 Sol", "judgment-model boundary changed");
assert(preparation.judgmentModelBoundary.reasoningEffort === "low", "judgment reasoning changed");
assert(preparation.judgmentModelBoundary.authentication === "ChatGPT subscription", "judgment authentication changed");
assert(preparation.judgmentModelBoundary.scoreBlind, "score blindness changed");
assert(preparation.judgmentModelBoundary.roundedIntegerScoreTiesPermitted, "tie rule changed");
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const call of preparation.calls) {
  assert(sha256(await readFile(call.clipPath)) === call.clipSha256, `clip hash mismatch: ${call.moveId}`);
  assert(call.knownSpeakers.length === 2, `${call.moveId}: two known speakers required`);
  for (const reference of call.knownSpeakers) {
    assert(sha256(await readFile(reference.localPath)) === reference.sha256, `reference hash mismatch: ${reference.speaker}`);
  }
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert(!(await exists(future)), `future output already exists: ${future}`);
}

const items = expectedDebates.map((debateNumber) => productionManifest.items.find((item) => item.debateNumber === debateNumber));
assert(items.length === 4, "four canonical production-manifest entries required");
assert(items.every(Boolean), "canonical production-manifest entry missing");
assert(JSON.stringify(items.map((item) => item.debateNumber)) === JSON.stringify(expectedDebates), "canonical debate order changed");
const canonicalSources = [];
for (const item of items) {
  assert(item.speakerCount === 2, `Debate ${item.debateNumber}: dyadic source gate changed`);
  assert(item.sides.pro.speakers.length === 1 && item.sides.con.speakers.length === 1, `Debate ${item.debateNumber}: substantive speaker count changed`);
  for (const key of ["transcript", "events", "manifest"]) {
    const file = item.sourceChain[key];
    const digest = item.sourceChain[`${key}Sha256`];
    assert(sha256(await readFile(file)) === digest, `Debate ${item.debateNumber}: canonical ${key} hash mismatch`);
  }
  canonicalSources.push({
    debateNumber: item.debateNumber,
    debateId: item.debateId,
    speakerCount: item.speakerCount,
    sides: item.sides,
    sourceChain: item.sourceChain
  });
}

const executionToolHashes = {};
for (const file of executionTools) executionToolHashes[file] = sha256(await readFile(file));

const activation = {
  ...preparation,
  schemaVersion: "1.0-assessment-production-post-canary-batch-02-audio-verification-execution-manifest",
  status: "frozen-ten-post-canary-batch-02-paid-known-speaker-diarizations-authorized",
  approvedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  userExecutionAuthorization: {
    instruction: exactInstruction,
    maximumDirectIncrementalCostUsd: 0.4,
    verificationCallsAuthorized: 10,
    model: "gpt-4o-transcribe-diarize",
    provider: "OpenAI Transcription API",
    knownSpeakerReferencesPerCall: 2,
    sequentialExecution: true,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    returnedTokenUsageCostControlRequired: true,
    stopRemainingAfterRequestLevelFailure: true,
    stopRemainingAfterUsageDerivedCapExceedance: true,
    deterministicValidationAndCostAnalysisAuthorized: true,
    judgmentModelExecutionAuthorized: false,
    adjudicationModelExecutionAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationReconstructionAuthorized: false,
    productionMutationAuthorized: false,
    nextBatchSelectionAuthorized: false
  },
  preparationManifest: { path: preparationPath, sha256: sha256(preparationBytes) },
  canonicalSourceGate: {
    productionManifest: productionManifestPath,
    productionManifestSha256: sha256(productionManifestBytes),
    debates: canonicalSources,
    transcriptHashesVerified: 4,
    eventHashesVerified: 4,
    manifestHashesVerified: 4,
    dyadicDebatesVerified: 4
  },
  executionToolHashes,
  costEstimate: {
    ...preparation.costEstimate,
    proposedFutureMaximumCostUsd: undefined,
    maximumAuthorizedCostUsd: 0.4,
    futureCostCapAuthorized: true,
    explicitPaidExecutionApprovalRecorded: true
  },
  authorization: {
    ...preparation.authorization,
    paidTranscriptionActivation: false,
    paidTranscriptionExecution: true,
    audioVerificationExecution: true,
    deterministicAudioAnalysis: true,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  futureOutputPathsExcludedFromSourceHashes: preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== activationPath),
  nextAuthorizedAction: "execute-exactly-ten-post-canary-batch-02-paid-audio-verification-calls-once-sequentially"
};
delete activation.costEstimate.proposedFutureMaximumCostUsd;
assert(activation.costEstimate.primaryExpectedFutureExecutionCostUsd <= activation.costEstimate.maximumAuthorizedCostUsd, "expected cost exceeds approved cap");

if (shouldWrite) await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  approvedAt,
  calls: activation.calls.length,
  model: activation.model,
  canonicalSourceHashesVerified: 12,
  expectedCostUsd: activation.costEstimate.primaryExpectedFutureExecutionCostUsd,
  maximumAuthorizedCostUsd: activation.costEstimate.maximumAuthorizedCostUsd,
  sequentialExecution: activation.executionPolicy.sequentialExecution,
  attemptsPerCall: activation.executionPolicy.attemptsPerCall,
  retriesMaximum: activation.executionPolicy.retriesMaximum,
  returnedTokenUsageCostControl: true,
  paidTranscriptionExecution: shouldWrite,
  judgmentModelExecution: false,
  adjudicationModelExecution: false,
  scoreDerivation: false
}, null, 2));
