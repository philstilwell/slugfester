#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
} from "./lib/v4-lean-production.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  buildMaximumCandidateShardedPlanFixture,
  V212_CANDIDATE_SHARDED_INVENTORY,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";
import {
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  buildV222InventoryRouteSchema,
  buildV222InventorySectionSchema,
  composeV222CandidateCensusPlan,
  splitV222CandidateCensusPlan,
  v222InventoryRoutesSha256,
} from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";

const shouldWrite = process.argv.includes("--write");
const developedIndex = process.argv.indexOf("--developed-at");
const developedAt =
  developedIndex >= 0 ? process.argv[developedIndex + 1] : null;
assertV4(
  developedAt && !Number.isNaN(Date.parse(developedAt)),
  "--developed-at requires an ISO timestamp"
);

const V221_ROOT =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback";
const PREPARATION = `${V221_ROOT}/preparation-manifest.json`;
const EXECUTION = `${V221_ROOT}/plan-model-execution.json`;
const PRIOR_PRECEDENT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-route-section-selection-development/development-analysis.json";
const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-route-section-plan-successor-development";
const GUIDE = `${ROOT}/route-section-plan-guide.md`;
const ANALYSIS = `${ROOT}/development-analysis.json`;
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2.2.2-route-section-plan-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.2-route-section-plan-successor.mjs";
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalSha256 = (value) => sha256(canonicalJson(value));
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
}

const [preparationBytes, executionBytes, precedentBytes, guideBytes] =
  await Promise.all([
    readFile(PREPARATION),
    readFile(EXECUTION),
    readFile(PRIOR_PRECEDENT),
    readFile(GUIDE),
  ]);
const preparation = JSON.parse(preparationBytes);
const execution = JSON.parse(executionBytes);
const precedent = JSON.parse(precedentBytes);

assertV4(
  preparation.status ===
      "v2.2.1-chronology-fallback-inventory-source-assets-and-ten-planner-packets-frozen" &&
    preparation.contexts?.length === 10 &&
    preparation.totals?.candidates === 361 &&
    preparation.totals?.proCandidates === 181 &&
    preparation.totals?.conCandidates === 180 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.model?.scoreBlind === true &&
    preparation.failedGateDisposition?.sourceV22DiscoveryGatePreservedFailed ===
      true &&
    preparation.failedGateDisposition
      ?.sourceV22DiscoveryExecutionReclassified === false &&
    preparation.failedGateDisposition
      ?.predecessorV213ScoreGatePreservedFailed === true &&
    preparation.proposedPolicy?.promoted === false,
  "v2.2.1 frozen inventory preparation drifted"
);
assertV4(
  execution.status ===
      "v2.2.1-candidate-census-plan-gate-complete-with-failure" &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 10 &&
    execution.validContexts === 9 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 10 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.maximumParallelContextsObserved === 2 &&
    execution.meteredApiCostUsd === 0 &&
    execution.scoresDerived === 0 &&
    execution.authorization?.deterministicPlanAnalysis === false &&
    execution.authorization?.exactSidePacketPreparation === false &&
    execution.authorization?.retry === false &&
    execution.authorization?.timeoutExtension === false &&
    execution.nextRequiredAction ===
      "stop-preserve-failed-v2.2.1-candidate-census-plan-gate",
  "failed v2.2.1 planning gate is not frozen"
);
const failedResults = execution.results.filter((result) => !result.accepted);
assertV4(
  failedResults.length === 1 &&
    failedResults[0].debateNumber === "75" &&
    failedResults[0].status === "timed-out" &&
    failedResults[0].attemptCount === 1 &&
    failedResults[0].retryCount === 0 &&
    failedResults[0].timedOut === true &&
    failedResults[0].elapsedMs >= 600000 &&
    failedResults[0].planOutputWritten === false,
  "Debate 75 timeout disposition drifted"
);
assertV4(
  precedent.status ===
      "route-section-selection-retired-regression-passed-successor-preparation-not-authorized" &&
    precedent.design?.finalInventorySemanticsChanged === false &&
    precedent.design?.silentTimeoutCauseAddressedByInputReduction === false &&
    precedent.conclusion?.guaranteesModelCompletion === false &&
    precedent.conclusion?.sufficientEvidenceForFreshSuccessorGate === false,
  "route/section precedent drifted"
);

const manualBytes = await readFile(preparation.inputs.inventoryManual);
const chronologyGuideBytes = await readFile(
  preparation.inputs.chronologyFallbackGuide
);
const schemaRecords = [];
const replayRecords = [];
const pendingWrites = [];

for (const context of preparation.contexts) {
  const [
    planSchemaBytes,
    compilerSchema,
    candidateTransport,
    candidateCensus,
    sourcePacketBytes,
  ] = await Promise.all([
    readFile(context.planSchema),
    readFile(context.compilerSchema, "utf8").then(JSON.parse),
    readFile(context.fullCandidateTransport, "utf8").then(JSON.parse),
    readFile(context.candidateCensus, "utf8").then(JSON.parse),
    readFile(context.inventorySourcePacket),
  ]);
  assertV4(
    sha256(planSchemaBytes) === context.planSchemaSha256 &&
      sha256(await readFile(context.candidateCensus)) ===
        context.candidateCensusSha256 &&
      sha256(await readFile(context.fullCandidateTransport)) ===
        context.fullCandidateTransportSha256 &&
      sha256(sourcePacketBytes) === context.inventorySourcePacketSha256,
    `${context.debateNumber}: v2.2.1 preparation asset drifted`
  );
  const planSchema = JSON.parse(planSchemaBytes);
  const maximumPlan = buildMaximumCandidateShardedPlanFixture({
    legacySchema: compilerSchema,
    candidateTransport,
  });
  validateCandidateShardedInventoryPlan({
    plan: maximumPlan,
    legacySchema: compilerSchema,
    candidateTransport,
    candidateCensus,
  });
  const maximumSplit = splitV222CandidateCensusPlan(maximumPlan);
  const routeSchema = buildV222InventoryRouteSchema(planSchema);
  const sectionSchema = buildV222InventorySectionSchema(
    planSchema,
    maximumSplit.routes.routes
  );
  const routeSchemaBytes = compactJsonBytes(routeSchema);
  const sectionSchemaBytes = compactJsonBytes(sectionSchema);
  const routePath = `${ROOT}/schemas/routes/debate-${context.debateNumber}.schema.json`;
  const sectionPath = `${ROOT}/schemas/sections/debate-${context.debateNumber}.schema.json`;
  const routeAudit = auditDecomposedStrictSchema(routeSchema);
  const sectionAudit = auditDecomposedStrictSchema(sectionSchema);
  const maximumRouteOutputBytes = jsonBytes(maximumSplit.routes).length;
  const routeCopiedInputBytes =
    sourcePacketBytes.length +
    context.candidateCensusBytes +
    chronologyGuideBytes.length +
    manualBytes.length +
    guideBytes.length +
    routeSchemaBytes.length;
  const sectionMaximumCopiedInputBytes =
    sourcePacketBytes.length +
    context.candidateCensusBytes +
    chronologyGuideBytes.length +
    manualBytes.length +
    guideBytes.length +
    maximumRouteOutputBytes +
    sectionSchemaBytes.length;
  assertV4(
    !Object.hasOwn(routeSchema.properties, "sections") &&
      Object.hasOwn(routeSchema.properties, "routes") &&
      !Object.hasOwn(sectionSchema.properties, "routes") &&
      Object.hasOwn(sectionSchema.properties, "sections") &&
      Object.hasOwn(
        sectionSchema.properties,
        "inventoryRoutesSha256"
      ) &&
      routeCopiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes &&
      sectionMaximumCopiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    `${context.debateNumber}: v2.2.2 schema topology or size drifted`
  );
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    priorPlanCopiedInputBytes: context.planCopiedInputBytes,
    routeSchema: routePath,
    routeSchemaSha256: sha256(routeSchemaBytes),
    routeSchemaBytes: routeSchemaBytes.length,
    routeStrictObjectsAudited: routeAudit.objectsAudited,
    sectionSchemaPrototype: sectionPath,
    sectionSchemaPrototypeSha256: sha256(sectionSchemaBytes),
    sectionSchemaPrototypeBytes: sectionSchemaBytes.length,
    sectionStrictObjectsAudited: sectionAudit.objectsAudited,
    maximumRouteOutputBytes,
    routeCopiedInputBytes,
    sectionMaximumCopiedInputBytes,
    bothWithinCeiling: true,
  });
  pendingWrites.push(
    { file: routePath, bytes: routeSchemaBytes },
    { file: sectionPath, bytes: sectionSchemaBytes }
  );

  if (!(await exists(context.planOutput))) {
    assertV4(
      context.debateNumber === "75",
      `${context.debateNumber}: unexpected missing failed-gate plan`
    );
    continue;
  }
  const planBytes = await readFile(context.planOutput);
  const plan = JSON.parse(planBytes);
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema: compilerSchema,
    candidateTransport,
    candidateCensus,
  });
  const split = splitV222CandidateCensusPlan(plan);
  const recomposed = composeV222CandidateCensusPlan(
    split.routes,
    split.sections
  );
  validateCandidateShardedInventoryPlan({
    plan: recomposed,
    legacySchema: compilerSchema,
    candidateTransport,
    candidateCensus,
  });
  assertV4(
    isDeepStrictEqual(recomposed, plan) &&
      !containsProhibitedCalculatedField(split.routes) &&
      !containsProhibitedCalculatedField(split.sections),
    `${context.debateNumber}: split/recomposition drifted`
  );
  replayRecords.push({
    debateNumber: context.debateNumber,
    sourcePlan: context.planOutput,
    sourcePlanSha256: sha256(planBytes),
    evidenceOnlyNotReusableForSuccessorAcceptance: true,
    routeOutputBytes: jsonBytes(split.routes).length,
    sectionOutputBytes: jsonBytes(split.sections).length,
    planOutputBytes: planBytes.length,
    routesSha256: v222InventoryRoutesSha256(split.routes.routes),
    recomposedPlanCanonicalSha256: canonicalSha256(recomposed),
    recomposedPlanIdentical: true,
  });
}

assertV4(
  schemaRecords.length === 10 &&
    replayRecords.length === 9 &&
    !replayRecords.some((record) => record.debateNumber === "75") &&
    schemaRecords.every((record) => record.bothWithinCeiling),
  "v2.2.2 development cardinality drifted"
);

const firstReplay = replayRecords[0];
const firstPlan = JSON.parse(await readFile(firstReplay.sourcePlan));
const firstSplit = splitV222CandidateCensusPlan(firstPlan);
const tamperedRouteBinding = structuredClone(firstSplit);
tamperedRouteBinding.sections.inventoryRoutesSha256 = "0".repeat(64);
let routeBindingTamperRejected = false;
try {
  composeV222CandidateCensusPlan(
    tamperedRouteBinding.routes,
    tamperedRouteBinding.sections
  );
} catch {
  routeBindingTamperRejected = true;
}
const crossDebate = structuredClone(firstSplit);
crossDebate.sections.debateNumber = "75";
let crossDebateTamperRejected = false;
try {
  composeV222CandidateCensusPlan(crossDebate.routes, crossDebate.sections);
} catch {
  crossDebateTamperRejected = true;
}
const unknownField = structuredClone(firstSplit);
unknownField.routes.score = 99;
let unknownFieldRejected = false;
try {
  composeV222CandidateCensusPlan(unknownField.routes, unknownField.sections);
} catch {
  unknownFieldRejected = true;
}
assertV4(
  routeBindingTamperRejected && crossDebateTamperRejected && unknownFieldRejected,
  "v2.2.2 negative control accepted"
);

const sourceFiles = [
  PREPARATION,
  EXECUTION,
  PRIOR_PRECEDENT,
  GUIDE,
  SCRIPT,
  TEST,
  LIBRARY,
  preparation.inputs.chronologyFallbackGuide,
  preparation.inputs.inventoryManual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs",
  ...preparation.contexts.flatMap((context) => [
    context.inventorySourcePacket,
    context.candidateCensus,
    context.fullCandidateTransport,
    context.compilerSchema,
    context.planSchema,
  ]),
  ...replayRecords.map((record) => record.sourcePlan),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-section-plan-successor-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2.2.2-route-section-plan-successor-development",
  status: shouldWrite
    ? "v2.2.2-route-section-plan-successor-model-free-regression-passed-preparation-authorized"
    : "preview",
  developedAt: shouldWrite ? developedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "Authorized. Continue.",
    prospectiveSuccessorOnly: true,
  },
  failedGateDisposition: {
    v221PlanningGatePreservedFailed: true,
    v221ValidPartialPlansReusableForSuccessorAcceptance: false,
    v221Debate75Retried: false,
    v221TimeoutExtended: false,
    v221ExecutionReclassified: false,
    v22DiscoveryGatePreservedFailed: true,
    v213ScoreGatePreservedFailed: true,
    proposedV22ScorePolicyPromoted: false,
    retriesPerformed: 0,
    timeoutExtensionsPerformed: 0,
    semanticCorrectionsPerformed: 0,
  },
  design: {
    successorVersion: "v2.2.2",
    stages: ["inventory-routes", "inventory-sections", "side-candidate-selection"],
    routeStageWritableDomains: ["routes"],
    sectionStageWritableDomains: ["sections"],
    freshIsolatedContextPerDebateAndStage: true,
    sameCompleteCandidateCensusForRouteAndSectionStages: true,
    candidateEvidenceExcerptsStillDeferredToSideSelectors: true,
    canonicalRouteHashBoundInSectionSchema: true,
    deterministicCompositionRequired: true,
    unchangedCandidateCensusPlanValidatorReplayed: true,
    finalInventorySemanticsChanged: false,
    scoreFieldsAvailable: false,
  },
  schemas: schemaRecords,
  regression: {
    failedGateValidPlansReplayedAsEvidenceOnly: replayRecords.length,
    failedGateMissingPlans: ["75"],
    replayRecords,
    recomposedPlansIdentical: replayRecords.length,
    routeBindingTamperRejected,
    crossDebateTamperRejected,
    unknownFieldRejected,
    freshModelEvidenceUsed: false,
  },
  sizing: {
    provenCeilingBytes:
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    priorMaximumPlanCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.priorPlanCopiedInputBytes)
    ),
    routeMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.routeCopiedInputBytes)
    ),
    sectionMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.sectionMaximumCopiedInputBytes)
    ),
    everyStageWithinCeiling: true,
    inputSizeCauseEstablished: false,
    outputComplexityCauseEstablished: false,
  },
  conclusion: {
    exactCurrentPlanSemanticsPreservedInRegression: true,
    reducesWritableDomainsPerPlanningContext: true,
    guaranteesModelCompletion: false,
    packetSizeCauseEstablished: false,
    sufficientForModelFreeSuccessorPreparationWithExplicitUserAuthorization:
      true,
    reason:
      "Nine current valid-but-failed-gate plans split and recompose identically, all ten schema pairs remain within the frozen ceiling, and explicit user authorization permits prospective preparation. The evidence does not establish the timeout cause or guarantee completion.",
  },
  sourceHashes,
  totals: {
    debates: 10,
    failedGatePlansReplayedAsEvidenceOnly: replayRecords.length,
    schemaPairsBuilt: schemaRecords.length,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    successorPacketPreparation: true,
    successorExecutionManifestPreparation: false,
    successorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    exactSidePacketPreparation: false,
    sideSelectorModelExecution: false,
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
    "prepare-v2.2.2-route-section-plan-successor-packets-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(ANALYSIS, jsonBytes(analysis));
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: 10,
      failedGatePlansReplayedAsEvidenceOnly: replayRecords.length,
      schemaPairsBuilt: schemaRecords.length,
      maximumCopiedInputBytes: {
        priorCombinedPlan: analysis.sizing.priorMaximumPlanCopiedInputBytes,
        routes: analysis.sizing.routeMaximumCopiedInputBytes,
        sections: analysis.sizing.sectionMaximumCopiedInputBytes,
        ceiling: analysis.sizing.provenCeilingBytes,
      },
      modelContextsExecuted: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
