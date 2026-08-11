#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const SECTION_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const MANIFEST = `${ROOT}/section-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/section-execution-activation.json`;
const EXECUTION = `${ROOT}/section-model-execution.json`;
const ANALYSIS = `${ROOT}/plan-analysis.json`;
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.2.2-inventory-sections.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-inventory-section-manifest.mjs";
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

const sectionPreparationBytes = await readFile(SECTION_PREPARATION);
const sectionPreparation = JSON.parse(sectionPreparationBytes);
assertV4(
  sectionPreparation.status ===
      "ten-exact-v2.2.2-section-packets-frozen-not-authorized" &&
    sectionPreparation.contexts?.length === 10 &&
    sectionPreparation.totals?.acceptedRoutes === 10 &&
    sectionPreparation.totals?.exactSectionSchemasFrozen === 10 &&
    sectionPreparation.totals?.exactSectionPacketsFrozen === 10 &&
    sectionPreparation.totals?.sectionModelContextsExecuted === 0 &&
    sectionPreparation.totals?.retries === 0 &&
    sectionPreparation.totals?.timeoutExtensions === 0 &&
    sectionPreparation.totals?.scoresDerived === 0 &&
    sectionPreparation.model?.label === "5.6 Sol" &&
    sectionPreparation.model?.slug === "gpt-5.6-sol" &&
    sectionPreparation.model?.reasoningEffort === "low" &&
    sectionPreparation.model?.authentication === "ChatGPT subscription" &&
    sectionPreparation.model?.scoreBlind === true &&
    sectionPreparation.failedGateDisposition?.v221PlanningGatePreservedFailed ===
      true &&
    sectionPreparation.failedGateDisposition
      ?.v221ValidPartialPlansReusableForSuccessorAcceptance === false &&
    sectionPreparation.failedGateDisposition?.v221Debate75Retried === false &&
    sectionPreparation.failedGateDisposition?.v221TimeoutExtended === false &&
    sectionPreparation.proposedPolicy?.promoted === false &&
    sectionPreparation.authorization?.sectionExecutionManifestPreparation ===
      true &&
    sectionPreparation.authorization?.sectionExecutionActivation === false &&
    sectionPreparation.authorization?.sectionModelExecution === false &&
    sectionPreparation.authorization?.planComposition === false &&
    sectionPreparation.authorization?.retry === false &&
    sectionPreparation.authorization?.timeoutExtension === false &&
    sectionPreparation.authorization?.scoreDerivation === false &&
    sectionPreparation.authorization?.productionMutation === false &&
    sectionPreparation.nextAuthorizedAction ===
      "prepare-v2.2.2-section-execution-manifest-model-free-only",
  "exact section packet freeze does not authorize manifest preparation"
);
for (const [file, digest] of Object.entries(sectionPreparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const contexts = [];
for (const prepared of sectionPreparation.contexts) {
  const [packetBytes, schemaBytes, routeBytes] = await Promise.all([
    readFile(prepared.sectionPacket),
    readFile(prepared.sectionSchema),
    readFile(prepared.routeOutput),
  ]);
  assertV4(
    sha256(packetBytes) === prepared.sectionPacketSha256 &&
      packetBytes.length === prepared.sectionPacketBytes &&
      sha256(schemaBytes) === prepared.sectionSchemaSha256 &&
      sha256(routeBytes) === prepared.routeOutputSha256,
    `${prepared.debateNumber}: section context drifted`
  );
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assertV4(
    packet.stage === "inventory-sections" &&
      packet.debateNumber === prepared.debateNumber &&
      packet.debateId === prepared.debateId &&
      packet.model?.label === "5.6 Sol" &&
      packet.model?.slug === "gpt-5.6-sol" &&
      packet.model?.reasoningEffort === "low" &&
      packet.model?.authentication === "ChatGPT subscription" &&
      packet.isolation?.scoreBlind === true &&
      packet.isolation?.inventoryRoutesImmutable === true &&
      packet.isolation?.routeExecutionMetadataUnavailable === true &&
      packet.isolation?.candidateSelectionUnavailable === true &&
      packet.inventoryRoutesSha256 === prepared.inventoryRoutesSha256 &&
      schema.properties?.inventoryRoutesSha256?.const ===
        prepared.inventoryRoutesSha256 &&
      packet.copiedInputs?.length === 7 &&
      packet.output === prepared.sectionOutput &&
      packet.attemptsMaximum === 1 &&
      packet.retries === 0 &&
      packet.timeoutExtensions === 0 &&
      packet.modelExecutionAuthorized === false,
    `${prepared.debateNumber}: section packet boundary drifted`
  );
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assertV4(
      sha256(bytes) === input.sha256 && bytes.length === input.bytes,
      `${prepared.debateNumber}/${input.role}: copied input drifted`
    );
    copiedInputBytes += bytes.length;
  }
  assertV4(
    copiedInputBytes === packet.copiedInputBytes &&
      copiedInputBytes === prepared.sectionCopiedInputBytes &&
      copiedInputBytes <= packet.maximumCopiedInputBytes &&
      !(await exists(packet.output)) &&
      !(await exists(prepared.composedPlanOutput)),
    `${prepared.debateNumber}: section input or output state drifted`
  );
  contexts.push({
    contextIndex: contexts.length,
    stage: "inventory-sections",
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    packet: prepared.sectionPacket,
    packetSha256: prepared.sectionPacketSha256,
    packetBytes: prepared.sectionPacketBytes,
    copiedInputs: structuredClone(packet.copiedInputs),
    copiedInputBytes: packet.copiedInputBytes,
    maximumCopiedInputBytes: packet.maximumCopiedInputBytes,
    inventoryRoutesSha256: prepared.inventoryRoutesSha256,
    immutableRouteOutput: prepared.routeOutput,
    immutableRouteOutputSha256: prepared.routeOutputSha256,
    writableDomains: ["sections"],
    strictOutputSchema: prepared.sectionSchema,
    strictOutputSchemaSha256: prepared.sectionSchemaSha256,
    output: prepared.sectionOutput,
    composedPlanOutput: prepared.composedPlanOutput,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  });
}
assertV4(contexts.length === 10, "exactly ten section contexts required");

const sourceFiles = [
  ...Object.keys(sectionPreparation.sourceHashes),
  SECTION_PREPARATION,
  SCRIPT,
  TEST,
  ...contexts.flatMap((context) => [
    context.packet,
    context.strictOutputSchema,
    context.immutableRouteOutput,
    ...context.copiedInputs.map((input) => input.path),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputs = [
  ...contexts.flatMap((context) => [context.output, context.composedPlanOutput]),
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const maximumCopiedInputBytes = Math.max(
  ...contexts.map((context) => context.copiedInputBytes)
);
const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-section-execution-preparation-manifest",
  protocolId: sectionPreparation.protocolId,
  status: shouldWrite
    ? "frozen-ten-v2.2.2-section-contexts-prepared-not-authorized"
    : "preview",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(
    sectionPreparation.failedGateDisposition
  ),
  proposedPolicy: {
    ...structuredClone(sectionPreparation.proposedPolicy),
    promoted: false,
  },
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
    contexts: 10,
    expectedParallelWallMinutes: [5, 20],
    expectedAggregateModelMinutes: [10, 30],
    expectedAggregateComputeHours: [0.17, 0.5],
    absoluteStageTimeoutMinutes: 60,
    estimateBasis:
      "The route gate completed in 5.25 wall minutes and 9.50 aggregate model minutes. Section output is more detailed than route output but each exact packet is smaller than the frozen 115,000-byte ceiling. Completion is not guaranteed. ChatGPT-subscription execution has no direct incremental API charge.",
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], {
      encoding: "utf8",
    }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
  },
  sectionPacketPreparation: SECTION_PREPARATION,
  sectionPacketPreparationSha256: sha256(sectionPreparationBytes),
  contexts,
  executionPolicy: {
    stage: "inventory-sections",
    contexts: 10,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteStageTimeoutMs: 3600000,
    copiedInputBytesMaximum: 115000,
    observedMaximumCopiedInputBytes: maximumCopiedInputBytes,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeStartingAdditionalContextOnAnyFailure: true,
    allowAlreadyRunningIndependentContextToFinish: true,
    allTenSectionsMustPassBeforePlanComposition: true,
    deterministicInputOrder: true,
    immutableRouteHashRequired: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    separateActivationRequired: true,
  },
  acceptancePolicy: {
    exactContextCountRequired: 10,
    everyContextMustCompleteOnItsSingleAttempt: true,
    everyOutputMustValidateAgainstFrozenStrictSchema: true,
    everyComposedPlanMustPassUnchangedDeterministicSemanticValidation: true,
    inventoryRoutesMustMatchFrozenCanonicalHash: true,
    writableDomainsLimitedToSections: true,
    partialSectionGateAcceptance: false,
    automaticSemanticCorrection: false,
    planCompositionDeferredUntilAllSectionsAccepted: true,
    scoresDerived: false,
  },
  stopRules: {
    executionPreparationHashMismatchBlocks: true,
    activationHashMismatchBlocks: true,
    invalidSectionOutputBlocksEntireGate: true,
    sectionTimeoutBlocksEntireGate: true,
    sectionContextFailureBlocksEntireGate: true,
    routeHashMismatchBlocksEntireGate: true,
    planCompositionBeforeTenAcceptedSectionsBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: 10,
    acceptedRoutes: 10,
    sectionContextsPrepared: 10,
    sectionContextsAuthorized: 0,
    sectionContextsExecuted: 0,
    acceptedSections: 0,
    composedPlans: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    executionActivationPreparation: true,
    sectionModelContexts: false,
    deterministicSectionValidation: false,
    planComposition: false,
    planAnalysis: false,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
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
    sections: contexts.map((context) => context.output),
    composedPlans: contexts.map((context) => context.composedPlanOutput),
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-v2.2.2-section-execution-activation-only",
};

if (shouldWrite) {
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: manifest.status,
      debates: contexts.map((context) => context.debateNumber),
      contexts: 10,
      maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
      directIncrementalCostUsdMaximum: 0,
      sectionModelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
