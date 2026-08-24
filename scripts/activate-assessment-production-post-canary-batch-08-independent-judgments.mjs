#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch08StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-08-standing-authorization.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-08/independent-judgments";
const PREPARATION_MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const PACKET_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const SCRIPT =
  "scripts/activate-assessment-production-post-canary-batch-08-independent-judgments.mjs";
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-08-independent-judgments.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-post-canary-batch-08-independent-judgments.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-08-independent-judgment.mjs";
const TEST =
  "scripts/test-assessment-production-post-canary-batch-08-independent-judgment-activation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const allBooleanLeavesTrue = (value) => {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
};

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
}
const [preparationBytes, packetPreparationBytes] = await Promise.all([
  readFile(PREPARATION_MANIFEST),
  readFile(PACKET_PREPARATION),
]);
const preparation = JSON.parse(preparationBytes);
const packetPreparation = JSON.parse(packetPreparationBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch08StandingAuthorization();
assertV4(
  preparation.status ===
      "frozen-twenty-post-canary-batch-08-independent-judgment-contexts-prepared-not-authorized" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 5 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 20 &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true &&
    preparation.executionPolicy.contexts === 20 &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy.separateActivationRequired === true &&
    Object.values(preparation.authorization).every((value) => value === false) &&
    preparation.activePolicy.version === "v2.2" &&
    preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    preparation.activePolicy.agreedInitialTieImposesNoDirectionConstraint ===
      true &&
    preparation.activePolicy.scorePassesMaximum === 1 &&
    preparation.validatedInventoryContract.planAndSideIsolationPreserved ===
      true &&
    preparation.validatedInventoryContract.scoreFieldsAvailable === false &&
    preparation.transport.maximumCopiedInputBytes <= 115000 &&
    preparation.transport.validationKeywordsRemoved === 0 &&
    preparation.transport.validationKeywordsRelaxed === 0 &&
    preparation.transport.targetEnumsChanged === 0 &&
    preparation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    preparation.sourceCompatibility?.sourceRowsInjected === 0 &&
    preparation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    preparation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    preparation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    preparation.sourceCompatibility?.occurrences?.length === 0 &&
    preparation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_08_STANDING_AUTHORIZATION &&
    preparation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256 &&
    allBooleanLeavesTrue(preparation.stopRules) &&
    preparation.nextAuthorizedAction ===
      "freeze-and-activate-batch-08-independent-judgment-execution-under-standing-authorization",
  "Batch 8 independent-judgment activation prerequisites drifted"
);
assertV4(
  packetPreparation.status ===
      "twenty-post-canary-batch-08-independent-judgment-contexts-prepared-and-frozen" &&
    packetPreparation.contexts.length === 20 &&
    JSON.stringify(packetPreparation.sourceCompatibility) ===
      JSON.stringify(preparation.sourceCompatibility) &&
    sha256(packetPreparationBytes) ===
      sha256(await readFile(preparation.preparation)),
  "frozen Batch 8 judgment packet preparation drifted"
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
assertV4(
  preparation.futureOutputPathsExcludedFromSourceHashes.includes(ACTIVATION),
  "the frozen activation output reservation is missing"
);
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
  "scripts/lib/assessment-production-score-stability-v2.2.3-compact-judgment-schema.mjs",
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
const futureOutputs = preparation.futureOutputPathsExcludedFromSourceHashes.filter(
  (file) => file !== ACTIVATION
);
assertV4(futureOutputs.length === 82, "expected 82 post-activation future outputs");
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-08-independent-judgment-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-twenty-post-canary-batch-08-independent-judgment-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    scope:
      "activate and execute exactly the twenty frozen Batch 8 score-blind independent-judgment contexts under the frozen standing authorization",
    standingAuthorization: POST_CANARY_BATCH_08_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    independentJudgmentModelsAuthorized: true,
    disagreementExtractionAuthorized: false,
    audioModelsAuthorized: false,
    adjudicationModelsAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationModelsAuthorized: false,
    productionMutationAuthorized: false,
  },
  preparationManifest: PREPARATION_MANIFEST,
  preparationManifestSha256: sha256(preparationBytes),
  packetPreparation: PACKET_PREPARATION,
  packetPreparationSha256: sha256(packetPreparationBytes),
  activePolicy: structuredClone(preparation.activePolicy),
  sourceCompatibility: structuredClone(preparation.sourceCompatibility),
  validatedInventoryContract: structuredClone(
    preparation.validatedInventoryContract
  ),
  model: structuredClone(preparation.model),
  transport: structuredClone(preparation.transport),
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
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  nextRequiredAction:
    "execute-frozen-post-canary-batch-08-independent-judgment-gate-once",
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
      directIncrementalCostUsdMaximum: 0,
      retriesMaximum: activation.executionPolicy.retriesMaximum,
      timeoutExtensionsMaximum:
        activation.executionPolicy.timeoutExtensionsMaximum,
      independentJudgmentModelContextsAuthorized: true,
      disagreementExtractionAuthorized: false,
      audioModelContextsAuthorized: false,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
