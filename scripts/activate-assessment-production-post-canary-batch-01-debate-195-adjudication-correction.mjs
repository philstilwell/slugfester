#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT } from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT;
const shouldWrite = process.argv.includes("--write");
const authorizedIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedIndex >= 0 ? process.argv[authorizedIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);

const preparationPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const expectedInstruction =
  "I approve activation and execution of exactly the one frozen Debate 195 score-blind burden-adjustment correction context using 5.6 Sol with low reasoning effort through my ChatGPT subscription, with a direct incremental cost cap of $0. Use one attempt, no retries, no timeout extensions, and no recursive correction. Stop after deterministic correction-output validation, analysis, committing, and pushing. Preserve the original output and eighteen move decisions unchanged. Do not merge the correction, run judgment models, use paid services, assemble final ledgers, derive scores, reconstruct publication, mutate production, or select the next batch.";
const executionTools = [
  "scripts/activate-assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/run-assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-gate.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-prepared-not-authorized" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 1 &&
    preparation.correctionNumber === 1 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 1 &&
    preparation.contexts[0].debateNumber === "195" &&
    preparation.contexts[0].burdenAdjustmentDisputes === 2 &&
    preparation.contexts[0].candidateSelections === 2 &&
    preparation.contexts[0].moveDecisions === 0 &&
    preparation.executionPolicy.contexts === 1 &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy.maximumParallelContexts === 1 &&
    preparation.executionPolicy.scheduler === "single-context" &&
    preparation.executionPolicy.separateActivationRequired === true,
  "Debate 195 correction activation is not prepared"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true,
  "Debate 195 correction model or score-blind boundary changed"
);
assertV4(
  preparation.preservedOriginal.moveDecisionCount === 18 &&
    preparation.preservedOriginal.immutable === true &&
    preparation.preservedOriginal.mutationAuthorized === false &&
    preparation.deterministicValidation.deterministicMergeAuthorized ===
      false,
  "Debate 195 preserved-output boundary changed"
);
assertV4(
  Object.values(preparation.authorization).every((value) => value === false),
  "correction execution-preparation authorization boundary changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const sourceHashes = structuredClone(preparation.sourceHashes);
const executionToolHashes = {};
for (const file of executionTools) {
  const digest = sha256(await readFile(file));
  executionToolHashes[file] = digest;
  sourceHashes[file] = digest;
}

const activation = {
  ...preparation,
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-execution-activation",
  status:
    "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  userExecutionAuthorization: {
    instruction: expectedInstruction,
    contexts: 1,
    debateNumber: "195",
    burdenAdjustmentDecisions: 2,
    preservedMoveDecisions: 18,
    model: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    scheduler: "single-context",
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    deterministicMergeAuthorized: false,
    judgmentModelsAuthorized: false,
    paidServicesAuthorized: false,
    finalLedgerAssemblyAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationReconstructionAuthorized: false,
    productionMutationAuthorized: false,
    nextBatchSelectionAuthorized: false
  },
  executionToolHashes,
  sourceHashes,
  authorization: {
    ...preparation.authorization,
    correctionModelContext: true,
    deterministicCorrectionValidation: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-exactly-one-score-blind-debate-195-burden-adjustment-correction-context-once"
};

assertV4(
  activation.authorization.executionActivation === false &&
    activation.authorization.correctionModelContext === true &&
    activation.authorization.adjudicationModelContext === false &&
    activation.authorization.judgmentModelContexts === false &&
    activation.authorization.deterministicCorrectionValidation === true &&
    activation.authorization.deterministicMerge === false &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.recursiveCorrection === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.finalLedgerAssembly === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationReconstruction === false &&
    activation.authorization.productionMutation === false &&
    activation.authorization.nextBatchSelection === false,
  "Debate 195 correction execution authorization expanded beyond the user instruction"
);

if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-authorized" : "preview-authorized",
      authorizedAt,
      debateNumber: "195",
      contexts: 1,
      burdenAdjustmentDecisions: 2,
      preservedMoveDecisions: 18,
      scheduler: "single-context",
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      recursiveCorrectionContextsMaximum: 0,
      authentication: activation.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      correctionModelExecutionAuthorized: shouldWrite,
      deterministicMergeAuthorized: false,
      judgmentModelExecutionAuthorized: false,
      scoresDerived: 0
    },
    null,
    2
  )
);
