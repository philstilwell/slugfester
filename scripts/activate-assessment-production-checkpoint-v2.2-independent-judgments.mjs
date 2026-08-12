#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/independent-judgments";
const PREPARATION_MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const PACKET_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const SCRIPT =
  "scripts/activate-assessment-production-checkpoint-v2.2-independent-judgments.mjs";
const RUNNER =
  "scripts/run-assessment-production-checkpoint-v2.2-independent-judgments.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-checkpoint-v2.2-independent-judgments.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-checkpoint-v2.2-independent-judgment.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-independent-judgment-activation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
}
const [preparationBytes, packetPreparationBytes] = await Promise.all([
  readFile(PREPARATION_MANIFEST),
  readFile(PACKET_PREPARATION),
]);
const preparation = JSON.parse(preparationBytes);
const packetPreparation = JSON.parse(packetPreparationBytes);
assertV4(
  preparation.status ===
      "frozen-twenty-production-checkpoint-v2.2-independent-judgment-contexts-prepared-not-authorized" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 20 &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.executionPolicy.contexts === 20 &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy.separateActivationRequired === true &&
    preparation.authorization.executionActivationPreparation === true &&
    preparation.authorization.modelContexts === false &&
    preparation.authorization.independentJudgmentModelExecution === false &&
    preparation.authorization.retry === false &&
    preparation.authorization.timeoutExtension === false &&
    preparation.authorization.semanticCorrection === false &&
    preparation.authorization.disagreementExtraction === false &&
    preparation.authorization.paidTranscription === false &&
    preparation.authorization.audioVerification === false &&
    preparation.authorization.adjudicationExecution === false &&
    preparation.authorization.scoreDerivation === false &&
    preparation.authorization.policyPromotion === false &&
    preparation.authorization.productionMutation === false &&
    preparation.gateDisposition.failedProductionCanaryV1PreservedFailed ===
      true &&
    preparation.gateDisposition
      .failedProductionCanaryV1OutputsUsedAsModelInput === false &&
    preparation.gateDisposition.priorValidationCohortsReclassified === false &&
    preparation.activePolicy.version === "v2.2" &&
    preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    preparation.activePolicy.scorePassesMaximum === 1 &&
    preparation.validatedInventoryContract.planAndSideIsolationPreserved ===
      true &&
    preparation.validatedInventoryContract.scoreFieldsAvailable === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "prepare-separate-production-checkpoint-v2.2-independent-judgment-execution-activation-only",
  "production checkpoint v2.2 independent-judgment activation is not authorized"
);
assertV4(
  packetPreparation.status ===
      "twenty-production-checkpoint-v2.2-independent-judgment-contexts-prepared-and-frozen" &&
    packetPreparation.contexts.length === 20 &&
    sha256(packetPreparationBytes) ===
      sha256(await readFile(preparation.preparation)),
  "frozen judgment packet preparation drifted"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8",
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex CLI version changed"
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
  PACKET_PREPARATION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-independent-judgment-execution-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  preparation.activePolicy.promotion,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/reassessment-scoring.mjs",
  SCRIPT,
  RUNNER,
  ANALYZER,
  VALIDATOR,
  TEST,
  ...preparation.contexts.flatMap((context) => [
    context.lockedInventory,
    context.sourcePacket,
    context.originalTranscript,
    context.originalEvents,
    context.originalManifest,
    context.fullLedger,
    context.judgmentPacket,
    context.schema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputs = structuredClone(
  preparation.futureOutputPathsExcludedFromSourceHashes
);
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const activation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-independent-judgment-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-twenty-production-checkpoint-v2.2-independent-judgment-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "Proceed at your discretion.",
    directIncrementalCostEstimateUsd: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    independentJudgmentModelsAuthorized: true,
    audioModelsAuthorized: false,
    adjudicationModelsAuthorized: false,
    publicationModelsAuthorized: false,
  },
  preparationManifest: PREPARATION_MANIFEST,
  preparationManifestSha256: sha256(preparationBytes),
  packetPreparation: PACKET_PREPARATION,
  packetPreparationSha256: sha256(packetPreparationBytes),
  gateDisposition: structuredClone(preparation.gateDisposition),
  activePolicy: structuredClone(preparation.activePolicy),
  validatedInventoryContract: structuredClone(
    preparation.validatedInventoryContract
  ),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  modelInputs: structuredClone(preparation.modelInputs),
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicCompilation: structuredClone(
    preparation.deterministicCompilation
  ),
  canonicalEventProjection: structuredClone(
    preparation.canonicalEventProjection
  ),
  audioPolicy: structuredClone(preparation.audioPolicy),
  acceptanceContract: structuredClone(preparation.acceptanceContract),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  authorization: {
    modelContexts: true,
    independentJudgmentModelExecution: true,
    deterministicValidation: true,
    deterministicCompilation: true,
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    disagreementExtraction: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextRequiredAction:
    "execute-frozen-production-checkpoint-v2.2-independent-judgment-gate-once",
};
if (shouldWrite) {
  await writeFile(ACTIVATION, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      debates: 10,
      contexts: 20,
      model: activation.model,
      expectedParallelWallMinutes:
        activation.costBoundary.expectedParallelWallMinutes,
      directIncrementalCostEstimateUsd: 0,
      retriesMaximum: activation.executionPolicy.retriesMaximum,
      timeoutExtensionsMaximum:
        activation.executionPolicy.timeoutExtensionsMaximum,
      independentJudgmentModelContextsAuthorized: true,
      audioModelContextsAuthorized: false,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
