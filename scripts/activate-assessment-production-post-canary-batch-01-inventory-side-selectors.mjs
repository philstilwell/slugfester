#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/inventory-candidate-sharded";
const PREPARATION = `${ROOT}/side-execution-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const SIDE_PACKET_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const SCRIPT =
  "scripts/activate-assessment-production-post-canary-batch-01-inventory-side-selectors.mjs";
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-01-inventory-side-selectors.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-post-canary-batch-01-inventory-side-selectors.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
}
const [preparationBytes, sourcePreparationBytes, sidePacketPreparationBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(SOURCE_PREPARATION),
  readFile(SIDE_PACKET_PREPARATION),
]);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const sidePacketPreparation = JSON.parse(sidePacketPreparationBytes);
assertV4(
  preparation.status ===
      "frozen-twenty-post-canary-batch-01-side-selector-contexts-prepared-not-authorized" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === false &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 20 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.model?.scoreBlind === true &&
    preparation.costEstimate?.directIncrementalCostUsdMaximum === 0 &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.executionPolicy
      ?.allTwentySelectorsMustPassBeforeInventoryCompilation === true &&
    preparation.authorization?.executionActivationPreparation === false &&
    preparation.authorization?.sideSelectorModelContexts === false &&
    preparation.authorization?.retry === false &&
    preparation.authorization?.timeoutExtension === false &&
    preparation.authorization?.semanticCorrection === false &&
    preparation.authorization?.independentJudgmentModelExecution === false &&
    preparation.authorization?.scoreDerivation === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.activePolicy?.version === "v2.2" &&
    preparation.activePolicy
      ?.agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    preparation.activePolicy?.scorePassesMaximum === 1 &&
    preparation.validatedInventoryContract?.planAndSideIsolationPreserved ===
      true &&
    preparation.validatedInventoryContract
      ?.fallbackAppliedOnlyToRetainedOrphanReply === true &&
    preparation.validatedInventoryContract?.scoreFieldsAvailable === false &&
    preparation.nextAuthorizedAction ===
      "user-approval-required-before-batch-01-side-selector-execution-activation-or-any-side-selector-model-execution",
  "side-selector execution activation is not authorized"
);
assertV4(
  sourcePreparation.status ===
      "post-canary-batch-01-candidate-sharded-source-assets-and-ten-planner-packets-frozen" &&
    sourcePreparation.contexts?.length === 10,
  "Batch 1 source preparation drifted"
);
assertV4(
  sidePacketPreparation.status ===
      "twenty-exact-post-canary-batch-01-side-selector-packets-frozen-not-authorized" &&
    sidePacketPreparation.contexts?.length === 20 &&
    preparation.sidePacketPreparation === SIDE_PACKET_PREPARATION,
  "Batch 1 side-packet preparation drifted"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}

const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  PREPARATION,
  SOURCE_PREPARATION,
  SIDE_PACKET_PREPARATION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs",
  SCRIPT,
  RUNNER,
  ANALYZER,
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    ...context.copiedInputs.map((input) => input.path),
  ]),
  ...sourcePreparation.contexts.flatMap((context) => [
    context.fullCandidateTransport,
    context.candidateCensus,
    context.compilerSchema,
    context.validatorCandidateEvidenceBundle,
    context.originalEvents,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const futureOutputs = preparation.futureOutputPathsExcludedFromSourceHashes.filter(
  (file) => file !== ACTIVATION
);
assertV4(
  futureOutputs.length + 1 ===
      preparation.futureOutputPathsExcludedFromSourceHashes.length &&
    preparation.artifacts?.activation === ACTIVATION,
  "activation path was not uniquely reserved"
);
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-side-selector-execution-activation",
  protocolId: preparation.protocolId,
  sideSelectionProtocolId: preparation.sideSelectionProtocolId,
  status:
    "frozen-twenty-post-canary-batch-01-side-selector-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  userAuthorization: {
    instruction:
      "I approve activation and execution of exactly the twenty frozen Batch 1 score-blind side-selector contexts using 5.6 Sol with low reasoning effort through my ChatGPT subscription, with a direct incremental cost cap of $0. Use the frozen 1→2 scheduler and one attempt per context, then stop after deterministic side validation, inventory compilation, analysis, commit, and push. Do not run judgment models, paid services, audio work, score derivation, publication reconstruction, or production mutation.",
    directIncrementalCostEstimateUsd: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    judgmentModelsAuthorized: false,
    sideSelectorModelsAuthorized: true,
  },
  preparationManifest: PREPARATION,
  preparationManifestSha256: sha256(preparationBytes),
  sourcePreparation: SOURCE_PREPARATION,
  sourcePreparationSha256: sha256(sourcePreparationBytes),
  sidePacketPreparation: SIDE_PACKET_PREPARATION,
  sidePacketPreparationSha256: sha256(sidePacketPreparationBytes),
  activePolicy: structuredClone(preparation.activePolicy),
  validatedInventoryContract: structuredClone(
    preparation.validatedInventoryContract
  ),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  executionPolicy: structuredClone(preparation.executionPolicy),
  isolation: structuredClone(preparation.isolation),
  acceptancePolicy: structuredClone(preparation.acceptancePolicy),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  authorization: {
    sideSelectorModelContexts: true,
    deterministicSideValidation: true,
    inventoryCompilation: true,
    inventoryAnalysis: true,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  nextRequiredAction:
    "execute-exactly-twenty-frozen-post-canary-batch-01-side-selector-contexts-once",
};

if (shouldWrite) {
  await writeFile(ACTIVATION, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      contexts: preparation.contexts.length,
      model: activation.model,
      expectedParallelWallMinutes:
        activation.costBoundary.expectedParallelWallMinutes,
      directIncrementalCostEstimateUsd: 0,
      sideSelectorModelContextsAuthorized: true,
      judgmentModelContextsAuthorized: false,
      retriesMaximum: activation.executionPolicy.retriesMaximum,
      timeoutExtensionsMaximum:
        activation.executionPolicy.timeoutExtensionsMaximum,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
