#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { V211_DISCOVERY_PROTOCOL_ID } from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";
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
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort/discovery";
const PREPARATION_MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const SCRIPT =
  "scripts/activate-assessment-production-score-stability-v2.1.1-discovery.mjs";
const RUNNER =
  "scripts/run-assessment-production-score-stability-v2.1.1-discovery.mjs";
const ANALYZER =
  "scripts/analyze-assessment-production-score-stability-v2.1.1-discovery.mjs";
const VALIDATOR = "scripts/validate-v211-discovery.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-discovery-activation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
}
const preparation = JSON.parse(
  await readFile(PREPARATION_MANIFEST, "utf8")
);
assertV4(
  preparation.status ===
      "frozen-forty-two-v2.1.1-validation-discovery-contexts-prepared-not-authorized" &&
    preparation.discoveryProtocolId === V211_DISCOVERY_PROTOCOL_ID &&
    preparation.contexts.length === 42 &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy.separateActivationRequired === true &&
    preparation.authorization.executionActivationPreparation === true &&
    preparation.authorization.modelContexts === false &&
    preparation.authorization.retry === false &&
    preparation.authorization.timeoutExtension === false &&
    preparation.authorization.semanticCorrection === false &&
    preparation.authorization.paidTranscription === false &&
    preparation.authorization.scoreDerivation === false &&
    preparation.authorization.productionMutation === false &&
    preparation.failedGateDisposition.v1CanaryPreservedFailed === true &&
    preparation.failedGateDisposition.v2ValidationPreservedFailed === true &&
    preparation.failedGateDisposition.v21DiscoveryPreservedFailed === true &&
    preparation.proposedPolicy.promoted === false,
  "successor discovery activation is not authorized by the frozen preparation manifest"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}

const sourceFiles = [
  PREPARATION_MANIFEST,
  preparation.preparation,
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
  VALIDATOR,
  SCRIPT,
  RUNNER,
  ANALYZER,
  TEST,
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.plan,
    context.fullLedger,
    context.originalEvents,
    context.validationChunkLedgerPath,
    context.modelTokenCountedLedgerPath,
    context.schemaPath,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const activation = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-discovery-execution-activation",
  protocolId: preparation.protocolId,
  discoveryProtocolId: V211_DISCOVERY_PROTOCOL_ID,
  status:
    "frozen-forty-two-v2.1.1-validation-discovery-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  userAuthorization: {
    instruction: "Continue at your discretion.",
    directIncrementalCostEstimateUsd: 0,
    expectedParallelWallMinutes: structuredClone(
      preparation.costEstimate.expectedParallelWallMinutes
    ),
    judgmentModelsAuthorized: false,
    discoveryModelsAuthorized: true,
  },
  preparationManifest: PREPARATION_MANIFEST,
  preparationManifestSha256: sha256(await readFile(PREPARATION_MANIFEST)),
  failedGateDisposition: structuredClone(preparation.failedGateDisposition),
  proposedPolicy: structuredClone(preparation.proposedPolicy),
  successorContract: structuredClone(preparation.successorContract),
  residualRisks: structuredClone(preparation.residualRisks),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  executionPolicy: structuredClone(preparation.executionPolicy),
  isolation: structuredClone(preparation.isolation),
  compilationPolicy: structuredClone(preparation.compilationPolicy),
  schemaHardening: structuredClone(preparation.schemaHardening),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: structuredClone(
    preparation.futureOutputPathsExcludedFromSourceHashes
  ),
  sourceHashes,
  authorization: {
    modelContexts: true,
    deterministicValidation: true,
    deterministicCandidateCompilation: true,
    analysis: true,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
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
  nextRequiredAction: "execute-frozen-v2.1.1-discovery-gate-once",
};

if (shouldWrite) {
  await writeFile(ACTIVATION, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      contexts: 42,
      model: activation.model,
      expectedParallelWallMinutes:
        activation.costBoundary.expectedParallelWallMinutes,
      directIncrementalCostEstimateUsd: 0,
      retriesMaximum: activation.executionPolicy.retriesMaximum,
      timeoutExtensionsMaximum:
        activation.executionPolicy.timeoutExtensionsMaximum,
      discoveryModelContextsAuthorized: true,
      judgmentModelContextsAuthorized: false,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
