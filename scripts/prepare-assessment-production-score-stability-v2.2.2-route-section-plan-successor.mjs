#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V212_CANDIDATE_SHARDED_INVENTORY } from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const V221_ROOT =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback";
const SOURCE_PREPARATION = `${V221_ROOT}/preparation-manifest.json`;
const FAILED_EXECUTION = `${V221_ROOT}/plan-model-execution.json`;
const DEVELOPMENT_ROOT =
  "docs/assessment-production/score-stability-v2.2.2-route-section-plan-successor-development";
const DEVELOPMENT = `${DEVELOPMENT_ROOT}/development-analysis.json`;
const GUIDE = `${DEVELOPMENT_ROOT}/route-section-plan-guide.md`;
const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2.2.2-route-section-plan-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-route-section-plan-successor-preparation.mjs";
const PROTOCOL_ID =
  "assessment-production-score-stability-v2.2.2-fresh-validation-route-section-plan-successor";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(PREPARATION)), `${PREPARATION} already exists`);
}

const [sourceBytes, executionBytes, developmentBytes, guideBytes] =
  await Promise.all([
    readFile(SOURCE_PREPARATION),
    readFile(FAILED_EXECUTION),
    readFile(DEVELOPMENT),
    readFile(GUIDE),
  ]);
const source = JSON.parse(sourceBytes);
const execution = JSON.parse(executionBytes);
const development = JSON.parse(developmentBytes);
assertV4(
  source.status ===
      "v2.2.1-chronology-fallback-inventory-source-assets-and-ten-planner-packets-frozen" &&
    source.contexts?.length === 10 &&
    source.model?.label === "5.6 Sol" &&
    source.model?.slug === "gpt-5.6-sol" &&
    source.model?.reasoningEffort === "low" &&
    source.model?.authentication === "ChatGPT subscription" &&
    source.model?.scoreBlind === true &&
    execution.status ===
      "v2.2.1-candidate-census-plan-gate-complete-with-failure" &&
    execution.validContexts === 9 &&
    execution.invalidContexts === 1 &&
    execution.results.find((result) => result.debateNumber === "75")?.status ===
      "timed-out" &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0,
  "failed v2.2.1 source gate drifted"
);
assertV4(
  development.status ===
      "v2.2.2-route-section-plan-successor-model-free-regression-passed-preparation-authorized" &&
    development.authorization?.successorPacketPreparation === true &&
    development.authorization?.successorExecutionManifestPreparation ===
      false &&
    development.authorization?.successorModelExecution === false &&
    development.regression?.failedGateValidPlansReplayedAsEvidenceOnly === 9 &&
    development.regression?.freshModelEvidenceUsed === false &&
    development.design?.finalInventorySemanticsChanged === false &&
    development.conclusion?.guaranteesModelCompletion === false &&
    development.nextAuthorizedAction ===
      "prepare-v2.2.2-route-section-plan-successor-packets-model-free-only",
  "v2.2.2 development does not authorize packet preparation"
);
for (const [file, digest] of Object.entries(development.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const manualBytes = await readFile(source.inputs.inventoryManual);
const chronologyGuideBytes = await readFile(
  source.inputs.chronologyFallbackGuide
);
const schemaByDebate = new Map(
  development.schemas.map((record) => [record.debateNumber, record])
);
const contexts = [];
const pendingWrites = [];

for (const context of source.contexts) {
  const schemaRecord = schemaByDebate.get(context.debateNumber);
  assertV4(schemaRecord, `${context.debateNumber}: development schema missing`);
  const [
    sourcePacketBytes,
    censusBytes,
    routeSchemaBytes,
    sectionPrototypeBytes,
  ] = await Promise.all([
    readFile(context.inventorySourcePacket),
    readFile(context.candidateCensus),
    readFile(schemaRecord.routeSchema),
    readFile(schemaRecord.sectionSchemaPrototype),
  ]);
  assertV4(
    sha256(sourcePacketBytes) === context.inventorySourcePacketSha256 &&
      sha256(censusBytes) === context.candidateCensusSha256 &&
      sha256(routeSchemaBytes) === schemaRecord.routeSchemaSha256 &&
      sha256(sectionPrototypeBytes) ===
        schemaRecord.sectionSchemaPrototypeSha256,
    `${context.debateNumber}: packet source drifted`
  );
  const routeOutput = `${ROOT}/routes/debate-${context.debateNumber}.json`;
  const sectionSchemaOutput =
    `${ROOT}/schemas/sections/debate-${context.debateNumber}.schema.json`;
  const sectionPacketOutput =
    `${ROOT}/packets/sections/debate-${context.debateNumber}.json`;
  const sectionOutput = `${ROOT}/sections/debate-${context.debateNumber}.json`;
  const composedPlanOutput = `${ROOT}/plans/debate-${context.debateNumber}.json`;
  const routePacketPath =
    `${ROOT}/packets/routes/debate-${context.debateNumber}.json`;
  const copiedInputs = [
    {
      role: "inventory-source-packet",
      path: context.inventorySourcePacket,
      sha256: sha256(sourcePacketBytes),
      bytes: sourcePacketBytes.length,
    },
    {
      role: "complete-candidate-census",
      path: context.candidateCensus,
      sha256: sha256(censusBytes),
      bytes: censusBytes.length,
    },
    {
      role: "chronology-fallback-inventory-guide",
      path: source.inputs.chronologyFallbackGuide,
      sha256: sha256(chronologyGuideBytes),
      bytes: chronologyGuideBytes.length,
    },
    {
      role: "inventory-manual",
      path: source.inputs.inventoryManual,
      sha256: sha256(manualBytes),
      bytes: manualBytes.length,
    },
    {
      role: "route-section-plan-guide",
      path: GUIDE,
      sha256: sha256(guideBytes),
      bytes: guideBytes.length,
    },
    {
      role: "strict-route-output-schema",
      path: schemaRecord.routeSchema,
      sha256: sha256(routeSchemaBytes),
      bytes: routeSchemaBytes.length,
    },
  ];
  const copiedInputBytes = copiedInputs.reduce(
    (sum, input) => sum + input.bytes,
    0
  );
  assertV4(
    copiedInputBytes === schemaRecord.routeCopiedInputBytes &&
      copiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    `${context.debateNumber}: route packet bound drifted`
  );
  const routePacket = {
    schemaVersion:
      "1.0-score-stability-v2.2.2-candidate-census-route-packet",
    protocolId: PROTOCOL_ID,
    stage: "inventory-routes",
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
    },
    isolation: {
      freshContextRequired: true,
      oneDebateOnly: true,
      scoreBlind: true,
      sectionsUnavailable: true,
      candidateEvidenceExcerptsUnavailable: true,
      candidateSelectionUnavailable: true,
      priorAndOtherJudgmentsUnavailable: true,
      failedV221PlanOutputsUnavailable: true,
      failedV221ExecutionMetadataUnavailable: true,
      failedV22DiscoveryExecutionMetadataUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    copiedInputs,
    copiedInputBytes,
    maximumCopiedInputBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    writableDomains: ["routes"],
    output: routeOutput,
    attemptsMaximum: 1,
    retries: 0,
    timeoutExtensions: 0,
    modelExecutionAuthorized: false,
  };
  const routePacketBytes = jsonBytes(routePacket);
  pendingWrites.push({ file: routePacketPath, bytes: routePacketBytes });
  contexts.push({
    contextIndex: contexts.length,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    family: context.family,
    sourceComplexityBand: context.sourceComplexityBand,
    candidates: context.candidates,
    routePacket: routePacketPath,
    routePacketSha256: sha256(routePacketBytes),
    routePacketBytes: routePacketBytes.length,
    routeCopiedInputBytes: copiedInputBytes,
    routeSchema: schemaRecord.routeSchema,
    routeSchemaSha256: schemaRecord.routeSchemaSha256,
    routeOutput,
    exactRoutePacketFrozen: true,
    sectionSchemaPrototype: schemaRecord.sectionSchemaPrototype,
    sectionSchemaPrototypeSha256:
      schemaRecord.sectionSchemaPrototypeSha256,
    sectionMaximumCopiedInputBytes:
      schemaRecord.sectionMaximumCopiedInputBytes,
    exactSectionSchema: sectionSchemaOutput,
    exactSectionPacket: sectionPacketOutput,
    sectionOutput,
    composedPlanOutput,
    exactSectionSchemaFrozen: false,
    exactSectionPacketFrozen: false,
    sourceContext: structuredClone(context),
  });
}

assertV4(
  contexts.length === 10 &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 361 &&
    contexts.every(
      (context) =>
        context.exactRoutePacketFrozen === true &&
        context.exactSectionPacketFrozen === false &&
        context.sectionMaximumCopiedInputBytes <=
          V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes
    ),
  "v2.2.2 packet preparation totals drifted"
);

const futureOutputs = [
  `${ROOT}/route-execution-preparation-manifest.json`,
  `${ROOT}/route-execution-activation.json`,
  `${ROOT}/route-model-execution.json`,
  `${ROOT}/route-analysis.json`,
  `${ROOT}/section-packet-preparation-manifest.json`,
  `${ROOT}/section-execution-preparation-manifest.json`,
  `${ROOT}/section-execution-activation.json`,
  `${ROOT}/section-model-execution.json`,
  `${ROOT}/plan-analysis.json`,
  ...contexts.flatMap((context) => [
    context.routeOutput,
    context.exactSectionSchema,
    context.exactSectionPacket,
    context.sectionOutput,
    context.composedPlanOutput,
  ]),
];
for (const output of futureOutputs) {
  assertV4(!(await exists(output)), `future output already exists: ${output}`);
}

const sourceFiles = [
  SOURCE_PREPARATION,
  FAILED_EXECUTION,
  DEVELOPMENT,
  GUIDE,
  SCRIPT,
  TEST,
  source.inputs.chronologyFallbackGuide,
  source.inputs.inventoryManual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs",
  ...contexts.flatMap((context) => [
    context.sourceContext.inventorySourcePacket,
    context.sourceContext.candidateCensus,
    context.sourceContext.fullCandidateTransport,
    context.sourceContext.compilerSchema,
    context.sourceContext.planSchema,
    context.routeSchema,
    context.sectionSchemaPrototype,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const preparation = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-section-plan-successor-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-v2.2.2-exact-route-packets-and-section-prototypes-frozen"
    : "preview",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(development.failedGateDisposition),
  proposedPolicy: {
    ...structuredClone(source.proposedPolicy),
    promoted: false,
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    apiKeysRemovedForAnyLaterExecution: true,
    meteredApiCostUsdMaximum: 0,
  },
  scheduling: {
    inventoryConcurrencyMaximum: 2,
    oneAttemptPerContext: true,
    retries: 0,
    timeoutExtensions: 0,
  },
  inputs: {
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourceBytes),
    failedExecution: FAILED_EXECUTION,
    failedExecutionSha256: sha256(executionBytes),
    development: DEVELOPMENT,
    developmentSha256: sha256(developmentBytes),
    guide: GUIDE,
    guideSha256: sha256(guideBytes),
  },
  sourceHashes,
  contexts,
  stageDesign: {
    planningStages: ["inventory-routes", "inventory-sections"],
    contextsPerDebateBeforeSideSelection: 2,
    routeContextsPlanned: 10,
    sectionContextsPlanned: 10,
    exactRoutePacketsFrozen: 10,
    maximumRouteBoundSectionSchemaPrototypesFrozen: 10,
    exactSectionSchemasFrozen: 0,
    exactSectionPacketsFrozen: 0,
    exactSectionFreezeRequiresAcceptedImmutableRoute: true,
    prototypeSchemasExecutable: false,
    failedV221PlanOutputsAvailableToModels: false,
  },
  totals: {
    debates: 10,
    candidates: 361,
    routePacketsFrozen: 10,
    exactSectionPacketsFrozen: 0,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  authorization: {
    routeExecutionManifestPreparation: true,
    routeExecutionActivation: false,
    routeModelExecution: false,
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
  nextAuthorizedAction:
    "prepare-v2.2.2-route-plan-execution-manifest-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await mkdir(path.dirname(PREPARATION), { recursive: true });
  await writeFile(PREPARATION, jsonBytes(preparation));
}

console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => context.debateNumber),
      exactRoutePacketsFrozen: 10,
      sectionSchemaPrototypesFrozen: 10,
      exactSectionPacketsFrozen: 0,
      maximumRouteCopiedInputBytes: Math.max(
        ...contexts.map((context) => context.routeCopiedInputBytes)
      ),
      maximumSectionPrototypeCopiedInputBytes: Math.max(
        ...contexts.map((context) => context.sectionMaximumCopiedInputBytes)
      ),
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
