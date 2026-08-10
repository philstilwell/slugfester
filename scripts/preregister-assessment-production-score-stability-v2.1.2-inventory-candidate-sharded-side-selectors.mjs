#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const SIDE_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const MANIFEST = `${ROOT}/side-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const EXECUTION = `${ROOT}/side-model-execution.json`;
const ANALYSIS = `${ROOT}/inventory-analysis.json`;
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.1.2-inventory-candidate-sharded-side-selectors.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.2-inventory-candidate-sharded-side-selector-manifest.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  for (const file of [MANIFEST, ACTIVATION, EXECUTION, ANALYSIS]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const sidePreparationBytes = await readFile(SIDE_PREPARATION);
const sidePreparation = JSON.parse(sidePreparationBytes);
assertV4(
  sidePreparation.status ===
      "twenty-exact-v2.1.2-side-selector-packets-frozen-not-authorized" &&
    sidePreparation.developmentValidationOnly === true &&
    sidePreparation.productionCanary === false &&
    sidePreparation.stagingOnly === true &&
    sidePreparation.contexts?.length === 20 &&
    sidePreparation.totals?.debates === 10 &&
    sidePreparation.totals?.exactSideSchemasFrozen === 20 &&
    sidePreparation.totals?.exactSidePacketsFrozen === 20 &&
    sidePreparation.totals?.candidatesTransported === 307 &&
    sidePreparation.totals?.modelContextsExecuted === 0 &&
    sidePreparation.failedGateDisposition?.v1CanaryPreservedFailed === true &&
    sidePreparation.failedGateDisposition?.v2ValidationPreservedFailed ===
      true &&
    sidePreparation.failedGateDisposition?.v21DiscoveryPreservedFailed ===
      true &&
    sidePreparation.failedGateDisposition?.v211DiscoveryPreservedFailed ===
      true &&
    sidePreparation.failedGateDisposition?.currentCanaryReclassified ===
      false &&
    sidePreparation.proposedPolicy?.everyIntegerRoundedTieAccepted === true &&
    sidePreparation.proposedPolicy?.promoted === false &&
    sidePreparation.authorization
      ?.sideSelectorExecutionManifestPreparation === true &&
    sidePreparation.authorization?.sideSelectorExecutionActivation ===
      false &&
    sidePreparation.authorization?.sideSelectorModelExecution === false &&
    sidePreparation.authorization?.independentJudgmentPacketPreparation ===
      false &&
    sidePreparation.authorization?.scoreDerivation === false &&
    sidePreparation.authorization?.productionMutation === false &&
    sidePreparation.nextAuthorizedAction ===
      "prepare-v2.1.2-side-selector-execution-manifest-model-free-only",
  "exact side-packet checkpoint does not authorize execution-manifest preparation"
);
assertV4(
  sidePreparation.model?.label === "5.6 Sol" &&
    sidePreparation.model?.slug === "gpt-5.6-sol" &&
    sidePreparation.model?.reasoningEffort === "low" &&
    sidePreparation.model?.authentication === "ChatGPT subscription" &&
    sidePreparation.model?.scoreBlind === true &&
    sidePreparation.model?.apiKeysRemovedForAnyLaterExecution === true &&
    sidePreparation.scheduling?.sideSelectorConcurrencyMaximum === 2 &&
    sidePreparation.scheduling?.oneAttemptPerContext === true &&
    sidePreparation.scheduling?.retries === 0 &&
    sidePreparation.scheduling?.timeoutExtensions === 0,
  "side-selector model or scheduling boundary drifted"
);
for (const [file, digest] of Object.entries(sidePreparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const contexts = [];
for (const prepared of sidePreparation.contexts) {
  const packetBytes = await readFile(prepared.packet);
  assertV4(
    sha256(packetBytes) === prepared.packetSha256 &&
      packetBytes.length === prepared.packetBytes,
    `${prepared.debateNumber}/${prepared.side}: packet drifted`
  );
  const packet = JSON.parse(packetBytes);
  assertV4(
    packet.schemaVersion ===
        "1.0-score-stability-v2.1.2-candidate-sharded-side-selector-packet" &&
      packet.protocolId === sidePreparation.protocolId &&
      packet.stage === prepared.stage &&
      packet.debateNumber === prepared.debateNumber &&
      packet.debateId === prepared.debateId &&
      packet.side === prepared.side &&
      packet.model?.label === "5.6 Sol" &&
      packet.model?.slug === "gpt-5.6-sol" &&
      packet.model?.reasoningEffort === "low" &&
      packet.model?.authentication === "ChatGPT subscription" &&
      packet.isolation?.freshContextRequired === true &&
      packet.isolation?.oneDebateOnly === true &&
      packet.isolation?.oneSideOnly === true &&
      packet.isolation?.scoreBlind === true &&
      packet.isolation?.routesAndSectionsImmutable === true &&
      packet.isolation?.otherSideCandidateEvidenceUnavailable === true &&
      packet.isolation?.otherSideSelectorOutputUnavailable === true &&
      packet.isolation?.plannerExecutionMetadataUnavailable === true &&
      packet.copiedInputs?.length === 6 &&
      packet.copiedInputBytes === prepared.copiedInputBytes &&
      packet.copiedInputBytes <= 115000 &&
      packet.output === prepared.output &&
      packet.attemptsMaximum === 1 &&
      packet.retries === 0 &&
      packet.timeoutExtensions === 0 &&
      packet.modelExecutionAuthorized === false,
    `${prepared.debateNumber}/${prepared.side}: packet boundary drifted`
  );
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assertV4(
      sha256(bytes) === input.sha256 && bytes.length === input.bytes,
      `${prepared.debateNumber}/${prepared.side}/${input.role}: input drifted`
    );
    copiedInputBytes += bytes.length;
  }
  assertV4(
    copiedInputBytes === packet.copiedInputBytes &&
      !(await exists(packet.output)),
    `${prepared.debateNumber}/${prepared.side}: input total or output state drifted`
  );
  contexts.push({
    contextIndex: contexts.length,
    stage: prepared.stage,
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    family: prepared.family,
    sourceComplexityBand: prepared.sourceComplexityBand,
    side: prepared.side,
    candidates: prepared.candidates,
    packet: prepared.packet,
    packetSha256: prepared.packetSha256,
    packetBytes: prepared.packetBytes,
    copiedInputs: structuredClone(packet.copiedInputs),
    copiedInputBytes: packet.copiedInputBytes,
    maximumCopiedInputBytes: packet.maximumCopiedInputBytes,
    writableDomains: structuredClone(packet.writableDomains),
    strictOutputSchema: prepared.exactSchema,
    strictOutputSchemaSha256: prepared.exactSchemaSha256,
    immutablePlanCanonicalSha256:
      prepared.immutablePlanCanonicalSha256,
    output: packet.output,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  });
}
assertV4(
  contexts.length === 20 &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 307,
  "side-selector execution context totals drifted"
);

const sourceFiles = [
  ...Object.keys(sidePreparation.sourceHashes),
  SIDE_PREPARATION,
  SCRIPT,
  TEST,
  ...contexts.flatMap((context) => [
    context.packet,
    ...context.copiedInputs.map((input) => input.path),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const futureOutputs = sidePreparation.futureOutputPathsExcludedFromSourceHashes.filter(
  (file) => file !== MANIFEST
);
assertV4(
  futureOutputs.length + 1 ===
    sidePreparation.futureOutputPathsExcludedFromSourceHashes.length,
  "side execution-preparation path was not uniquely reserved"
);
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
  encoding: "utf8",
}).trim();
const maximumCopiedInputBytes = Math.max(
  ...contexts.map((context) => context.copiedInputBytes)
);

const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.1.2-side-selector-execution-preparation-manifest",
  protocolId: sidePreparation.protocolId,
  status:
    "frozen-twenty-v2.1.2-side-selector-contexts-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(
    sidePreparation.failedGateDisposition
  ),
  proposedPolicy: structuredClone(sidePreparation.proposedPolicy),
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: contexts.length,
    expectedParallelWallMinutes: [15, 35],
    expectedAggregateModelMinutes: [25, 60],
    expectedAggregateComputeHours: [0.42, 1],
    absoluteStageTimeoutMinutes: 120,
    estimateBasis:
      "Twenty mutually isolated side-selector contexts at roughly 38-53 KB, scheduled two-wide. The immediately preceding ten-context 34-46 KB plan gate completed in 6.02 wall minutes and 10.81 aggregate model minutes; the selector schemas are larger and candidate mapping is denser. Subscription use has no direct incremental API charge.",
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
  },
  sidePacketPreparation: SIDE_PREPARATION,
  sidePacketPreparationSha256: sha256(sidePreparationBytes),
  contexts,
  isolation: structuredClone(sidePreparation.isolation),
  executionPolicy: {
    stage: "candidate-evidence-side-selection",
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteStageTimeoutMs: 7200000,
    copiedInputBytesMaximum: 115000,
    observedMaximumCopiedInputBytes: maximumCopiedInputBytes,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeStartingAdditionalContextOnAnyFailure: true,
    allowAlreadyRunningIndependentContextToFinish: true,
    allTwentySelectorsMustPassBeforeInventoryCompilation: true,
    deterministicInputOrder: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true,
  },
  acceptancePolicy: {
    exactContextCountRequired: 20,
    everyContextMustCompleteOnItsSingleAttempt: true,
    everyOutputMustValidateAgainstFrozenStrictSchema: true,
    everyOutputMustPassDeterministicSemanticValidation: true,
    writableDomainLimitedToCandidateSelections: true,
    immutablePlanAndSideTransportHashesRequired: true,
    missingSectionSideCoverageFailsClosed: true,
    partialSideSelectorGateAcceptance: false,
    automaticSemanticCorrection: false,
    inventoryCompilationDeferredUntilAllSelectorsAccepted: true,
    scoresDerived: false,
  },
  stopRules: {
    ...structuredClone(sidePreparation.stopRules),
    sideExecutionPreparationHashMismatchBlocks: true,
    activationHashMismatchBlocks: true,
    invalidSelectorOutputBlocksEntireInventoryGate: true,
    selectorTimeoutBlocksEntireInventoryGate: true,
    selectorContextFailureBlocksEntireInventoryGate: true,
    inventoryCompilationBeforeTwentyAcceptedSelectorsBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: 10,
    sideContextsPrepared: 20,
    sideContextsAuthorized: 0,
    sideContextsExecuted: 0,
    acceptedSideSelections: 0,
    candidatesTransported: 307,
    inventoryProposalsCompiled: 0,
    lockedInventoriesCompiled: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    executionActivationPreparation: true,
    sideSelectorModelContexts: false,
    deterministicSideValidation: false,
    inventoryCompilation: false,
    inventoryAnalysis: false,
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
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    sideSelections: contexts.map((context) => context.output),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-v2.1.2-side-selector-execution-activation-only",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      contexts: contexts.length,
      candidatesTransported: 307,
      copiedInputBytes: {
        minimum: Math.min(
          ...contexts.map((context) => context.copiedInputBytes)
        ),
        maximum: maximumCopiedInputBytes,
        ceiling: manifest.executionPolicy.copiedInputBytesMaximum,
      },
      maximumParallelContexts:
        manifest.executionPolicy.maximumParallelContexts,
      schedulerRamp: manifest.executionPolicy.schedulerRamp,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      directIncrementalCostUsdMaximum: 0,
      sideSelectorModelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
