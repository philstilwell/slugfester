#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V212_CANDIDATE_SHARDED_INVENTORY } from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/plan-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const EXECUTION = `${ROOT}/plan-model-execution.json`;
const ANALYSIS = `${ROOT}/plan-analysis.json`;
const SIDE_PACKET_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const SCRIPT =
  "scripts/preregister-assessment-production-score-stability-v2.2.1-inventory-candidate-census-plans.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.1-inventory-candidate-census-plan-manifest.mjs";
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
    SIDE_PACKET_PREPARATION,
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const preparationBytes = await readFile(PREPARATION);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.schemaVersion ===
      "1.0-score-stability-v2.2.1-chronology-fallback-inventory-preparation" &&
    preparation.protocolId ===
      "assessment-production-score-stability-v2.2.1-fresh-validation-chronology-fallback-inventory" &&
    preparation.status ===
      "v2.2.1-chronology-fallback-inventory-source-assets-and-ten-planner-packets-frozen" &&
    preparation.developmentValidationOnly === true &&
    preparation.productionCanary === false &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
    preparation.totals?.candidates === 361 &&
    preparation.totals?.proCandidates === 181 &&
    preparation.totals?.conCandidates === 180 &&
    preparation.totals?.exactPlannerPacketsFrozen === 10 &&
    preparation.totals?.exactSidePacketsFrozen === 0 &&
    preparation.totals?.modelContextsExecuted === 0 &&
    preparation.failedGateDisposition
      ?.currentV212InventoryGatePreservedFailed === true &&
    preparation.failedGateDisposition
      ?.v212FailedOutputsUsedAsFreshSuccessorModelInput === false &&
    preparation.failedGateDisposition
      ?.sourceV22DiscoveryGatePreservedFailed === true &&
    preparation.failedGateDisposition?.sourceV22DiscoveryGateRetried === false &&
    preparation.failedGateDisposition
      ?.sourceV22DiscoveryExecutionReclassified === false &&
    preparation.failedGateDisposition
      ?.v221MechanicalRecoveryChangedCandidateFields === false &&
    preparation.failedGateDisposition
      ?.predecessorV213ScoreGatePreservedFailed === true &&
    preparation.proposedPolicy
      ?.agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    preparation.proposedPolicy
      ?.agreedInitialTieImposesNoDirectionConstraint === true &&
    preparation.proposedPolicy?.numericalThresholdsChanged === false &&
    preparation.proposedPolicy?.promoted === false &&
    preparation.inventorySuccessorContract?.planAndSideIsolationPreserved ===
      true &&
    preparation.inventorySuccessorContract
      ?.fallbackAppliedOnlyToRetainedOrphanReply === true &&
    preparation.inventorySuccessorContract?.scoreFieldsAvailable === false &&
    preparation.authorization
      ?.candidateCensusPlanExecutionManifestPreparation === true &&
    preparation.authorization?.candidateCensusPlanExecutionActivation ===
      false &&
    preparation.authorization?.inventoryPlanModelExecution === false &&
    preparation.authorization?.exactSidePacketPreparation === false &&
    preparation.authorization?.independentJudgmentPacketPreparation ===
      false &&
    preparation.authorization?.scoreDerivation === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.nextAuthorizedAction ===
      "prepare-v2.2.1-candidate-census-plan-execution-manifest-model-free-only",
  "chronology-fallback preparation does not authorize plan-execution manifest preparation"
);
assertV4(
  preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.model?.scoreBlind === true &&
    preparation.model?.apiKeysRemovedForAnyLaterExecution === true &&
    preparation.model?.meteredApiCostUsdMaximum === 0,
  "model, authentication, score-blindness, or cost boundary drifted"
);
assertV4(
  preparation.scheduling?.inventoryConcurrencyMaximum === 2 &&
    preparation.scheduling?.oneAttemptPerContext === true &&
    preparation.scheduling?.retries === 0 &&
    preparation.scheduling?.timeoutExtensions === 0,
  "inventory scheduling boundary drifted"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const contexts = [];
for (const prepared of preparation.contexts) {
  const packetBytes = await readFile(prepared.planPacket);
  assertV4(
    sha256(packetBytes) === prepared.planPacketSha256 &&
      packetBytes.length === prepared.planPacketBytes,
    `${prepared.debateNumber}: frozen planner packet drifted`
  );
  const packet = JSON.parse(packetBytes);
  assertV4(
    packet.schemaVersion ===
        "1.0-score-stability-v2.2.1-candidate-census-plan-packet" &&
      packet.protocolId === preparation.protocolId &&
      packet.stage === "candidate-census-plan" &&
      packet.debateNumber === prepared.debateNumber &&
      packet.debateId === prepared.debateId &&
      packet.model?.label === "5.6 Sol" &&
      packet.model?.slug === "gpt-5.6-sol" &&
      packet.model?.reasoningEffort === "low" &&
      packet.model?.authentication === "ChatGPT subscription" &&
      packet.isolation?.freshContextRequired === true &&
      packet.isolation?.oneDebateOnly === true &&
      packet.isolation?.scoreBlind === true &&
      packet.isolation?.candidateEvidenceExcerptsUnavailable === true &&
      packet.isolation?.candidateSelectionUnavailable === true &&
      packet.isolation?.priorAndOtherJudgmentsUnavailable === true &&
      packet.isolation?.failedV212SelectorOutputsUnavailable === true &&
      packet.isolation?.failedV22DiscoveryExecutionMetadataUnavailable ===
        true &&
      packet.isolation?.v221MechanicalRecoveryMetadataUnavailable === true &&
      packet.isolation
        ?.legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable ===
        true &&
      packet.copiedInputs?.length === 5 &&
      packet.copiedInputBytes === prepared.planCopiedInputBytes &&
      packet.copiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes &&
      packet.output === prepared.planOutput &&
      packet.attemptsMaximum === 1 &&
      packet.retries === 0 &&
      packet.timeoutExtensions === 0 &&
      packet.modelExecutionAuthorized === false,
    `${prepared.debateNumber}: planner packet execution boundary drifted`
  );

  let copiedInputBytes = 0;
  for (const copiedInput of packet.copiedInputs) {
    const bytes = await readFile(copiedInput.path);
    assertV4(
      sha256(bytes) === copiedInput.sha256 &&
        bytes.length === copiedInput.bytes,
      `${prepared.debateNumber}/${copiedInput.role}: copied input drifted`
    );
    copiedInputBytes += bytes.length;
  }
  assertV4(
    copiedInputBytes === packet.copiedInputBytes,
    `${prepared.debateNumber}: copied input total drifted`
  );
  assertV4(
    !(await exists(packet.output)),
    `${prepared.debateNumber}: plan output already exists`
  );

  contexts.push({
    contextIndex: contexts.length,
    stage: "candidate-census-plan",
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    family: prepared.family,
    sourceComplexityBand: prepared.sourceComplexityBand,
    packet: prepared.planPacket,
    packetSha256: prepared.planPacketSha256,
    packetBytes: prepared.planPacketBytes,
    copiedInputs: structuredClone(packet.copiedInputs),
    copiedInputBytes: packet.copiedInputBytes,
    maximumCopiedInputBytes: packet.maximumCopiedInputBytes,
    writableDomains: structuredClone(packet.writableDomains),
    strictOutputSchema: prepared.planSchema,
    strictOutputSchemaSha256: prepared.planSchemaSha256,
    output: packet.output,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  });
}
assertV4(contexts.length === 10, "plan stage must contain exactly ten contexts");

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
  SIDE_PACKET_PREPARATION,
];
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
    "1.0-score-stability-v2.2.1-candidate-census-plan-execution-preparation-manifest",
  protocolId: preparation.protocolId,
  status:
    "frozen-ten-v2.2.1-candidate-census-plan-contexts-prepared-not-authorized",
  frozenAt,
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
  inventorySuccessorContract: structuredClone(
    preparation.inventorySuccessorContract
  ),
  model: {
    label: preparation.model.label,
    slug: preparation.model.slug,
    reasoningEffort: preparation.model.reasoningEffort,
    authentication: preparation.model.authentication,
    scoreBlind: true,
  },
  costEstimate: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    contexts: contexts.length,
    expectedParallelWallMinutes: [5, 15],
    expectedAggregateModelMinutes: [9, 25],
    expectedAggregateComputeHours: [0.15, 0.42],
    absoluteStageTimeoutMinutes: 60,
    estimateBasis:
      "The prior ten-context candidate-census plan stage completed in 6.02 wall minutes and 10.81 aggregate model minutes at concurrency two. These frozen v2.2.1 planner inputs use the same contract, with a 57,707-byte maximum. ChatGPT-subscription execution has no direct incremental API charge.",
  },
  executionEnvironment: {
    codexPath: CODEX_PATH,
    codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
  },
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  contexts,
  isolation: {
    freshTemporaryCodexHomePerContext: true,
    freshSourceDirectoryPerContext: true,
    oneDebatePerContext: true,
    onlyFivePacketDeclaredInputsCopied: true,
    candidateEvidenceExcerptsUnavailable: true,
    candidateSelectionUnavailable: true,
    failedV212SelectorOutputsUnavailable: true,
    failedV22DiscoveryExecutionMetadataUnavailable: true,
    v221MechanicalRecoveryMetadataUnavailable: true,
    otherContextsUnavailable: true,
    otherOutputsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersUnavailable: true,
    tagsAndPublicationProseUnavailable: true,
  },
  executionPolicy: {
    stage: "candidate-census-plan",
    contexts: contexts.length,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    absoluteStageTimeoutMs: 3600000,
    copiedInputBytesMaximum:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    observedMaximumCopiedInputBytes: maximumCopiedInputBytes,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampOneServesAsOperationalCanary: true,
    eachRampPhaseMustPassBeforeExpansion: true,
    abortBeforeStartingAdditionalContextOnAnyFailure: true,
    allowAlreadyRunningIndependentContextToFinish: true,
    allTenPlansMustPassBeforeSidePacketPreparation: true,
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
    everyOutputMustPassDeterministicSemanticValidation: true,
    writableDomainsLimitedToRoutesAndSections: true,
    immutablePlanCanonicalHashRequired: true,
    partialPlanGateAcceptance: false,
    automaticSemanticCorrection: false,
    exactSidePacketPreparationDeferredUntilAllPlansAccepted: true,
    scoresDerived: false,
  },
  stopRules: {
    ...structuredClone(preparation.stopRules),
    executionPreparationHashMismatchBlocks: true,
    activationHashMismatchBlocks: true,
    invalidPlannerOutputBlocksEntireInventoryGate: true,
    planTimeoutBlocksEntireInventoryGate: true,
    planContextFailureBlocksEntireInventoryGate: true,
    sidePacketFreezeBeforeTenAcceptedPlansBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
  },
  totals: {
    debates: contexts.length,
    planContextsPrepared: contexts.length,
    planContextsAuthorized: 0,
    planContextsExecuted: 0,
    acceptedPlans: 0,
    exactSidePacketsFrozen: 0,
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
    planModelContexts: false,
    deterministicPlanValidation: false,
    planAnalysis: false,
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
  artifacts: {
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    plans: contexts.map((context) => context.output),
    laterSidePacketPreparation: SIDE_PACKET_PREPARATION,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes,
  nextAuthorizedAction:
    "prepare-separate-v2.2.1-candidate-census-plan-execution-activation-only",
};

if (shouldWrite) {
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? manifest.status : "preview",
      debates: contexts.map((context) => context.debateNumber),
      contexts: contexts.length,
      copiedInputBytes: {
        minimum: Math.min(
          ...contexts.map((context) => context.copiedInputBytes)
        ),
        maximum: maximumCopiedInputBytes,
        ceiling:
          V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
      },
      maximumParallelContexts:
        manifest.executionPolicy.maximumParallelContexts,
      schedulerRamp: manifest.executionPolicy.schedulerRamp,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      planModelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
