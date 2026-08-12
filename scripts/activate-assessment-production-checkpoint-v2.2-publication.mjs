#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_PUBLICATION_ROOT } from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const PREPARATION_MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const PACKET_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const SCRIPT = "scripts/activate-assessment-production-checkpoint-v2.2-publication.mjs";
const RUNNER = "scripts/run-assessment-production-checkpoint-v2.2-publication.mjs";
const ANALYZER = "scripts/analyze-assessment-production-checkpoint-v2.2-publication.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-checkpoint-v2.2-publication-output.mjs";
const VALIDATION_LIBRARY =
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
const OUTPUT_TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-publication-output.mjs";
const TEST =
  "scripts/test-assessment-production-checkpoint-v2.2-publication-activation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const [preparationBytes, packetPreparationBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION_MANIFEST)),
  readFile(path.resolve(PACKET_PREPARATION))
]);
const preparation = JSON.parse(preparationBytes);
const packetPreparation = JSON.parse(packetPreparationBytes);

assertV4(
  preparation.status ===
      "frozen-ten-production-checkpoint-v2.2-publication-contexts-prepared-not-authorized" &&
    preparation.developmentValidationOnly === false &&
    preparation.productionCanary === true &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.contexts === 10 &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.correctionContextsMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy?.schedulerRamp) === JSON.stringify([1, 2]) &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.executionActivationPreparation === true &&
    preparation.authorization?.modelContexts === false &&
    preparation.authorization?.publicationModelExecution === false &&
    preparation.authorization?.deterministicValidation === false &&
    preparation.authorization?.deterministicAnalysis === false &&
    preparation.authorization?.retry === false &&
    preparation.authorization?.timeoutExtension === false &&
    preparation.authorization?.correctionModelExecution === false &&
    preparation.authorization?.deterministicCompilation === false &&
    preparation.authorization?.publicationFinalization === false &&
    preparation.authorization?.renderingVerification === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.authorization?.remainingProductionBatches === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "prepare-separate-production-checkpoint-v2.2-publication-execution-activation-only",
  "publication execution activation is not authorized"
);
assertV4(
  packetPreparation.status ===
      "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen" &&
    packetPreparation.contexts?.length === 10 &&
    packetPreparation.totals?.moves === 188 &&
    packetPreparation.totals?.modelContextsExecuted === 0 &&
    packetPreparation.totals?.modelAuthoredScores === 0 &&
    sha256(packetPreparationBytes) === preparation.packetPreparationSha256,
  "frozen publication packet preparation changed"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8"
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex CLI version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
}

const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  PREPARATION_MANIFEST,
  PACKET_PREPARATION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  preparation.modelInputs.outputContract,
  preparation.modelInputs.manual,
  preparation.modelInputs.referenceCatalog,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  VALIDATION_LIBRARY,
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-packets.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-preparation.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-manifest.mjs",
  SCRIPT,
  RUNNER,
  ANALYZER,
  VALIDATOR,
  OUTPUT_TEST,
  TEST,
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.schema,
    context.sourcePacket,
    context.transcript,
    context.events,
    context.localManifest
  ])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const futureOutputs = preparation.futureOutputPathsExcludedFromSourceHashes.filter(
  (file) => file !== ACTIVATION
);
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
  assertV4(!Object.hasOwn(sourceHashes, file), `future output hash included: ${file}`);
}

const activation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-execution-activation",
  protocolId: preparation.protocolId,
  status: "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  developmentValidationOnly: false,
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "Continue at your discretion.",
    directIncrementalCostEstimateUsd: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    publicationModelsAuthorized: true,
    scoreModelsAuthorized: false,
    audioModelsAuthorized: false,
    adjudicationModelsAuthorized: false,
    productionMutationAuthorized: false
  },
  preparationManifest: PREPARATION_MANIFEST,
  preparationManifestSha256: sha256(preparationBytes),
  packetPreparation: PACKET_PREPARATION,
  packetPreparationSha256: sha256(packetPreparationBytes),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  modelInputs: structuredClone(preparation.modelInputs),
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation),
  acceptanceContract: structuredClone(preparation.acceptanceContract),
  stopRules: structuredClone(preparation.stopRules),
  authorization: {
    modelContexts: true,
    publicationModelExecution: true,
    deterministicValidation: true,
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    correctionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextRequiredAction:
    "execute-frozen-production-checkpoint-v2.2-publication-gate-once"
};

if (shouldWrite) {
  await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      debates: activation.contexts.map((context) => context.debateNumber),
      contexts: activation.contexts.length,
      moves: activation.acceptanceContract.movesAuthoredRequired,
      model: activation.model,
      expectedParallelWallMinutes:
        activation.costBoundary.expectedParallelWallMinutes,
      directIncrementalCostUsdMaximum:
        activation.costBoundary.directIncrementalCostUsdMaximum,
      publicationModelContextsAuthorized: true,
      retriesMaximum: 0,
      correctionContextsMaximum: 0,
      productionMutationAuthorized: false,
      nextRequiredAction: activation.nextRequiredAction
    },
    null,
    2
  )
);
