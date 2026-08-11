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
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const PREPARATION_MANIFEST = `${ROOT}/route-execution-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/route-execution-activation.json`;
const SCRIPT =
  "scripts/activate-assessment-production-score-stability-v2.2.2-inventory-routes.mjs";
const RUNNER =
  "scripts/run-assessment-production-score-stability-v2.2.2-inventory-routes.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-score-stability-v2.2.2-inventory-routes.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-inventory-route-activation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
}

const [preparationBytes, sourcePreparationBytes] = await Promise.all([
  readFile(PREPARATION_MANIFEST),
  readFile(SOURCE_PREPARATION),
]);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
assertV4(
  preparation.schemaVersion ===
      "1.0-score-stability-v2.2.2-route-execution-preparation-manifest" &&
    preparation.status ===
      "frozen-ten-v2.2.2-route-contexts-prepared-not-authorized" &&
    preparation.developmentValidationOnly === true &&
    preparation.productionCanary === false &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
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
      ?.allTenRoutesMustPassBeforeSectionPacketPreparation === true &&
    preparation.authorization?.executionActivationPreparation === true &&
    preparation.authorization?.routeModelContexts === false &&
    preparation.authorization?.retry === false &&
    preparation.authorization?.timeoutExtension === false &&
    preparation.authorization?.semanticCorrection === false &&
    preparation.authorization?.independentJudgmentModelExecution === false &&
    preparation.authorization?.paidTranscription === false &&
    preparation.authorization?.scoreDerivation === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.failedGateDisposition?.v221PlanningGatePreservedFailed ===
      true &&
    preparation.failedGateDisposition
      ?.v221ValidPartialPlansReusableForSuccessorAcceptance === false &&
    preparation.failedGateDisposition?.v221Debate75Retried === false &&
    preparation.failedGateDisposition?.v221TimeoutExtended === false &&
    preparation.failedGateDisposition?.v221ExecutionReclassified === false &&
    preparation.failedGateDisposition?.v22DiscoveryGatePreservedFailed ===
      true &&
    preparation.failedGateDisposition?.v213ScoreGatePreservedFailed === true &&
    preparation.proposedPolicy?.promoted === false &&
    preparation.nextAuthorizedAction ===
      "prepare-separate-v2.2.2-route-execution-activation-only",
  "route execution activation is not authorized"
);
assertV4(
  sourcePreparation.status ===
      "ten-v2.2.2-exact-route-packets-and-section-prototypes-frozen" &&
    sourcePreparation.contexts?.length === 10 &&
    sha256(sourcePreparationBytes) === preparation.preparationSha256,
  "route source preparation drifted"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}

const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  PREPARATION_MANIFEST,
  SOURCE_PREPARATION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs",
  SCRIPT,
  RUNNER,
  ANALYZER,
  TEST,
  ...sourcePreparation.contexts.flatMap((context) => [
    context.routePacket,
    context.routeSchema,
    context.sectionSchemaPrototype,
    context.sourceContext.inventorySourcePacket,
    context.sourceContext.candidateCensus,
    context.sourceContext.fullCandidateTransport,
    context.sourceContext.compilerSchema,
    context.sourceContext.planSchema,
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
  "activation path was not uniquely reserved by preparation"
);
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const activation = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-v2.2.2-route-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  userAuthorization: {
    instruction: "Authorized. Continue.",
    directIncrementalCostEstimateUsd: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    judgmentModelsAuthorized: false,
    routeModelsAuthorized: true,
  },
  preparationManifest: PREPARATION_MANIFEST,
  preparationManifestSha256: sha256(preparationBytes),
  sourcePreparation: SOURCE_PREPARATION,
  sourcePreparationSha256: sha256(sourcePreparationBytes),
  failedGateDisposition: structuredClone(preparation.failedGateDisposition),
  proposedPolicy: structuredClone(preparation.proposedPolicy),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  executionPolicy: structuredClone(preparation.executionPolicy),
  acceptancePolicy: structuredClone(preparation.acceptancePolicy),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  authorization: {
    routeModelContexts: true,
    deterministicRouteValidation: true,
    routeAnalysis: true,
    exactSectionPacketPreparation: false,
    sectionModelExecution: false,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
    inventoryModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextRequiredAction:
    "execute-frozen-v2.2.2-route-gate-once",
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
      retriesMaximum: activation.executionPolicy.retriesMaximum,
      timeoutExtensionsMaximum:
        activation.executionPolicy.timeoutExtensionsMaximum,
      routeModelContextsAuthorized: true,
      judgmentModelContextsAuthorized: false,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
