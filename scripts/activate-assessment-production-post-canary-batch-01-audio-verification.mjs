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
assert(
  approvedAt && !Number.isNaN(Date.parse(approvedAt)),
  "--approved-at requires an ISO timestamp"
);

const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exactInstruction =
  "I approve activation and execution of exactly the three frozen Batch 1 audio-verification calls using gpt-4o-transcribe-diarize through the OpenAI Transcription API, with two frozen same-debate speaker references per call, sequential execution, one attempt per call, no retries, and a maximum direct incremental cost of $0.10. Stop after deterministic audio-verification validation, analysis, committing, and pushing. Do not run judgment or adjudication models, derive scores, reconstruct publication, mutate production, or select the next batch.";
const executionTools = [
  "scripts/activate-assessment-production-post-canary-batch-01-audio-verification.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-audio-verification.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-audio-verification.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py"
];

assert(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assert(
  preparation.status ===
    "prepared-three-post-canary-batch-01-paid-known-speaker-diarizations-pending-separate-explicit-user-approval",
  "Batch 1 audio-verification preparation status changed"
);
assert(preparation.calls.length === 3, "exactly three frozen calls required");
assert(preparation.model === "gpt-4o-transcribe-diarize", "transcription model changed");
assert(preparation.executionPolicy.sequentialExecution, "execution must remain sequential");
assert(preparation.executionPolicy.attemptsPerCall === 1, "one attempt per call required");
assert(preparation.executionPolicy.retriesMaximum === 0, "retries must remain disabled");
assert(
  preparation.costEstimate.expectedFutureExecutionCostUsd === 0.0351 &&
    preparation.costEstimate.proposedFutureMaximumCostUsd === 0.1,
  "frozen cost estimate changed"
);
assert(
  !preparation.authorization.paidTranscriptionExecution &&
    !preparation.authorization.audioVerificationExecution,
  "paid execution was already authorized"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert(!(await exists(future)), `future output already exists: ${future}`);
}

const executionToolHashes = {};
for (const file of executionTools) {
  executionToolHashes[file] = sha256(await readFile(file));
}

const activation = {
  ...preparation,
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-audio-verification-execution-manifest",
  status:
    "frozen-three-post-canary-batch-01-paid-known-speaker-diarizations-authorized",
  approvedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userExecutionAuthorization: {
    instruction: exactInstruction,
    maximumDirectIncrementalCostUsd: 0.1,
    verificationCallsAuthorized: 3,
    model: "gpt-4o-transcribe-diarize",
    provider: "OpenAI Transcription API",
    knownSpeakerReferencesPerCall: 2,
    sequentialExecution: true,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    deterministicValidationAndAnalysisAuthorized: true,
    judgmentModelExecutionAuthorized: false,
    adjudicationModelExecutionAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationReconstructionAuthorized: false,
    productionMutationAuthorized: false,
    nextBatchSelectionAuthorized: false
  },
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  executionToolHashes,
  costEstimate: {
    ...preparation.costEstimate,
    proposedFutureMaximumCostUsd: undefined,
    maximumAuthorizedCostUsd: 0.1,
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
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-exactly-three-post-canary-batch-01-paid-audio-verification-calls-once-sequentially"
};
delete activation.costEstimate.proposedFutureMaximumCostUsd;
assert(
  activation.costEstimate.expectedFutureExecutionCostUsd <=
    activation.costEstimate.maximumAuthorizedCostUsd,
  "expected cost exceeds approved cap"
);

if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  approvedAt,
  calls: activation.calls.length,
  model: activation.model,
  expectedCostUsd: activation.costEstimate.expectedFutureExecutionCostUsd,
  maximumAuthorizedCostUsd: activation.costEstimate.maximumAuthorizedCostUsd,
  sequentialExecution: activation.executionPolicy.sequentialExecution,
  attemptsPerCall: activation.executionPolicy.attemptsPerCall,
  retriesMaximum: activation.executionPolicy.retriesMaximum,
  paidTranscriptionExecution: shouldWrite,
  judgmentModelExecution: false,
  adjudicationModelExecution: false,
  scoreDerivation: false
}, null, 2));
