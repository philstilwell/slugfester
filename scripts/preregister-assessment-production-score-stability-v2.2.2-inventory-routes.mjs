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
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/route-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/route-execution-activation.json`;
const EXECUTION = `${ROOT}/route-model-execution.json`;
const ANALYSIS = `${ROOT}/route-analysis.json`;
const SECTION_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.2.2-inventory-routes.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-inventory-route-manifest.mjs";
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
  for (const file of [
    MANIFEST,
    ACTIVATION,
    EXECUTION,
    ANALYSIS,
    SECTION_PREPARATION,
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const preparationBytes = await readFile(PREPARATION);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "ten-v2.2.2-exact-route-packets-and-section-prototypes-frozen" &&
    preparation.contexts?.length === 10 &&
    preparation.totals?.routePacketsFrozen === 10 &&
    preparation.totals?.exactSectionPacketsFrozen === 0 &&
    preparation.totals?.modelContextsExecuted === 0 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.model?.scoreBlind === true &&
    preparation.scheduling?.inventoryConcurrencyMaximum === 2 &&
    preparation.scheduling?.oneAttemptPerContext === true &&
    preparation.scheduling?.retries === 0 &&
    preparation.scheduling?.timeoutExtensions === 0 &&
    preparation.failedGateDisposition?.v221PlanningGatePreservedFailed ===
      true &&
    preparation.failedGateDisposition
      ?.v221ValidPartialPlansReusableForSuccessorAcceptance === false &&
    preparation.failedGateDisposition?.v221Debate75Retried === false &&
    preparation.failedGateDisposition?.v221TimeoutExtended === false &&
    preparation.proposedPolicy?.promoted === false &&
    preparation.authorization?.routeExecutionManifestPreparation === true &&
    preparation.authorization?.routeExecutionActivation === false &&
    preparation.authorization?.routeModelExecution === false &&
    preparation.authorization?.exactSectionPacketPreparation === false &&
    preparation.authorization?.independentJudgmentPacketPreparation === false &&
    preparation.authorization?.scoreDerivation === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.nextAuthorizedAction ===
      "prepare-v2.2.2-route-plan-execution-manifest-model-free-only",
  "v2.2.2 preparation does not authorize route manifest preparation"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const contexts = [];
for (const prepared of preparation.contexts) {
  const packetBytes = await readFile(prepared.routePacket);
  assertV4(
    sha256(packetBytes) === prepared.routePacketSha256 &&
      packetBytes.length === prepared.routePacketBytes,
    `${prepared.debateNumber}: route packet drifted`
  );
  const packet = JSON.parse(packetBytes);
  assertV4(
    packet.stage === "inventory-routes" &&
      packet.debateNumber === prepared.debateNumber &&
      packet.debateId === prepared.debateId &&
      packet.model?.label === "5.6 Sol" &&
      packet.model?.slug === "gpt-5.6-sol" &&
      packet.model?.reasoningEffort === "low" &&
      packet.model?.authentication === "ChatGPT subscription" &&
      packet.isolation?.scoreBlind === true &&
      packet.isolation?.sectionsUnavailable === true &&
      packet.isolation?.candidateSelectionUnavailable === true &&
      packet.isolation?.failedV221PlanOutputsUnavailable === true &&
      packet.isolation?.failedV221ExecutionMetadataUnavailable === true &&
      packet.copiedInputs?.length === 6 &&
      packet.output === prepared.routeOutput &&
      packet.attemptsMaximum === 1 &&
      packet.retries === 0 &&
      packet.timeoutExtensions === 0 &&
      packet.modelExecutionAuthorized === false,
    `${prepared.debateNumber}: route packet boundary drifted`
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
      copiedInputBytes === prepared.routeCopiedInputBytes &&
      !(await exists(packet.output)),
    `${prepared.debateNumber}: route input or output state drifted`
  );
  contexts.push({
    contextIndex: contexts.length,
    stage: "inventory-routes",
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    family: prepared.family,
    sourceComplexityBand: prepared.sourceComplexityBand,
    packet: prepared.routePacket,
    packetSha256: prepared.routePacketSha256,
    packetBytes: prepared.routePacketBytes,
    copiedInputs: structuredClone(packet.copiedInputs),
    copiedInputBytes: packet.copiedInputBytes,
    maximumCopiedInputBytes: packet.maximumCopiedInputBytes,
    writableDomains: ["routes"],
    strictOutputSchema: prepared.routeSchema,
    strictOutputSchemaSha256: prepared.routeSchemaSha256,
    output: packet.output,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  });
}
assertV4(contexts.length === 10, "exactly ten route contexts required");

const sourceFiles = [
  ...Object.keys(preparation.sourceHashes),
  PREPARATION,
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
const futureOutputs = [
  ...contexts.map((context) => context.output),
  ACTIVATION,
  EXECUTION,
  ANALYSIS,
  SECTION_PREPARATION,
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output already exists: ${file}`);
}

const maximumCopiedInputBytes = Math.max(
  ...contexts.map((context) => context.copiedInputBytes)
);
const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-execution-preparation-manifest",
  protocolId: preparation.protocolId,
  status: shouldWrite
    ? "frozen-ten-v2.2.2-route-contexts-prepared-not-authorized"
    : "preview",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(preparation.failedGateDisposition),
  proposedPolicy: {
    ...structuredClone(preparation.proposedPolicy),
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
    expectedParallelWallMinutes: [5, 15],
    expectedAggregateModelMinutes: [8, 22],
    expectedAggregateComputeHours: [0.13, 0.37],
    absoluteStageTimeoutMinutes: 60,
    estimateBasis:
      "The failed combined-plan gate used 11.47 wall minutes and 18.42 aggregate model minutes, with nine valid contexts and one ten-minute timeout. Route-only writable output is narrower but completion is not guaranteed. ChatGPT-subscription execution has no direct incremental API charge.",
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
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  contexts,
  executionPolicy: {
    stage: "inventory-routes",
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
    allTenRoutesMustPassBeforeSectionPacketPreparation: true,
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
    exactContextCountRequired: 10,
    everyContextMustCompleteOnItsSingleAttempt: true,
    everyOutputMustValidateAgainstFrozenStrictSchema: true,
    everyOutputMustPassDeterministicSemanticValidationAfterComposition: true,
    writableDomainsLimitedToRoutes: true,
    partialRouteGateAcceptance: false,
    automaticSemanticCorrection: false,
    exactSectionPacketPreparationDeferredUntilAllRoutesAccepted: true,
    scoresDerived: false,
  },
  stopRules: {
    ...structuredClone(preparation.stopRules),
    executionPreparationHashMismatchBlocks: true,
    activationHashMismatchBlocks: true,
    invalidRouteOutputBlocksEntireGate: true,
    routeTimeoutBlocksEntireGate: true,
    routeContextFailureBlocksEntireGate: true,
    sectionPacketFreezeBeforeTenAcceptedRoutesBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: 10,
    routeContextsPrepared: 10,
    routeContextsAuthorized: 0,
    routeContextsExecuted: 0,
    acceptedRoutes: 0,
    exactSectionPacketsFrozen: 0,
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
    routeModelContexts: false,
    deterministicRouteValidation: false,
    routeAnalysis: false,
    exactSectionPacketPreparation: false,
    sectionModelExecution: false,
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
    routes: contexts.map((context) => context.output),
    laterSectionPacketPreparation: SECTION_PREPARATION,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-v2.2.2-route-execution-activation-only",
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
      routeModelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
