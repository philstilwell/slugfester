#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  auditDecomposedStrictSchema,
  inventoryPlanSha256,
  splitSidePartitionedInventoryProposal,
  validateDecomposedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  convertLegacyProposalToSidePartitionedSelectionMap,
  convertUniqueSelectionMapToSidePartitionedSelectionMap,
} from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";

const shouldWrite = process.argv.includes("--write");
const developedIndex = process.argv.indexOf("--developed-at");
const developedAt = developedIndex >= 0 ? process.argv[developedIndex + 1] : null;
assertV4(
  !shouldWrite || (developedAt && !Number.isNaN(Date.parse(developedAt))),
  "--write requires --developed-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const PRIOR_DEVELOPMENT =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-development/development-analysis.json`;
const FAILURE_DIAGNOSIS =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-successor/failure-diagnosis.json`;
const PREPARATION =
  `${VALIDATION_ROOT}/inventory-decomposed-plan-selection-successor/preparation-manifest.json`;
const ROOT = `${VALIDATION_ROOT}/inventory-route-section-selection-development`;
const GUIDE = `${ROOT}/route-section-selection-guide.md`;
const ANALYSIS = `${ROOT}/development-analysis.json`;
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2-inventory-route-section-selection.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-route-section-selection-development.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalSha256 = (value) => sha256(canonicalJson(value));
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
}

const [priorDevelopment, failureDiagnosis, preparation, guideBytes] =
  await Promise.all([
    readFile(PRIOR_DEVELOPMENT, "utf8").then(JSON.parse),
    readFile(FAILURE_DIAGNOSIS, "utf8").then(JSON.parse),
    readFile(PREPARATION, "utf8").then(JSON.parse),
    readFile(GUIDE),
  ]);
assertV4(
  priorDevelopment.status ===
      "decomposed-plan-selection-retired-regression-passed-successor-preparation-authorized" &&
    failureDiagnosis.status ===
      "decomposed-plan-selection-successor-gate-failed-plan-timeouts-debates-93-137-no-further-action-authorized" &&
    failureDiagnosis.failure.validPlans === 8 &&
    failureDiagnosis.failure.selectorContextsExecuted === 0 &&
    failureDiagnosis.authorization.successorProtocolDevelopment === false &&
    preparation.failedGateDisposition.sidePartitionedSelectionSuccessorGatePreservedFailed ===
      true,
  "five failed gates are not preserved"
);

const ROUTE_KEYS = [
  "schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole",
  "assessmentModel", "calibrationOnly", "candidateTransportCanonicalSha256",
  "isolation", "routes", "audit",
];
const SECTION_KEYS = [
  "schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole",
  "assessmentModel", "calibrationOnly", "candidateTransportCanonicalSha256",
  "inventoryRoutesSha256", "isolation", "sections", "audit",
];
const ROUTE_AUDIT = [
  "completeCandidateEvidenceBundleReviewed", "sectionsDeferred",
  "candidateSelectionDeferred", "ratingsUnavailable", "responseTopologyUnavailable",
  "otherJudgmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable",
];
const SECTION_AUDIT = [
  "inventoryRoutesImmutable", "completeCandidateEvidenceBundleReviewed",
  "candidateSelectionDeferred", "ratingsUnavailable", "responseTopologyUnavailable",
  "otherJudgmentsUnavailable", "calculatedTotalsUnavailable", "winnerLabelsUnavailable",
];
function constAudit(keys) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...keys],
    properties: Object.fromEntries(
      keys.map((key) => [key, { type: "boolean", const: true }])
    ),
  };
}
function buildRouteSchema(planSchema) {
  const schema = structuredClone(planSchema);
  schema.$id = "slugfester-v4221164-score-blind-inventory-routes";
  schema.title = "Slugfester v4.2.21.16.4 score-blind inventory routes";
  delete schema.properties.sections;
  schema.properties.schemaVersion.const =
    "4.2.21.16.4-score-blind-inventory-routes";
  schema.properties.protocolId.const =
    "v4.2.21.16.4-inventory-route-contract";
  schema.properties.reviewerRole.const = "score-blind-inventory-route-planner";
  schema.properties.audit = constAudit(ROUTE_AUDIT);
  schema.required = [...ROUTE_KEYS];
  return schema;
}
function buildSectionSchema(planSchema, routes) {
  const schema = structuredClone(planSchema);
  schema.$id = "slugfester-v4221164-score-blind-inventory-sections";
  schema.title = "Slugfester v4.2.21.16.4 score-blind inventory sections";
  delete schema.properties.routes;
  schema.properties.schemaVersion.const =
    "4.2.21.16.4-score-blind-inventory-sections";
  schema.properties.protocolId.const =
    "v4.2.21.16.4-inventory-section-contract";
  schema.properties.reviewerRole.const = "score-blind-inventory-section-planner";
  schema.properties.inventoryRoutesSha256 = {
    type: "string",
    const: canonicalSha256(routes),
  };
  schema.properties.audit = constAudit(SECTION_AUDIT);
  schema.required = [...SECTION_KEYS];
  return schema;
}
function splitPlan(plan) {
  const routes = {
    schemaVersion: "4.2.21.16.4-score-blind-inventory-routes",
    protocolId: "v4.2.21.16.4-inventory-route-contract",
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: "score-blind-inventory-route-planner",
    assessmentModel: plan.assessmentModel,
    calibrationOnly: plan.calibrationOnly,
    candidateTransportCanonicalSha256: plan.candidateTransportCanonicalSha256,
    isolation: structuredClone(plan.isolation),
    routes: structuredClone(plan.routes),
    audit: {
      completeCandidateEvidenceBundleReviewed: true,
      sectionsDeferred: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
  const sections = {
    schemaVersion: "4.2.21.16.4-score-blind-inventory-sections",
    protocolId: "v4.2.21.16.4-inventory-section-contract",
    debateNumber: plan.debateNumber,
    debateId: plan.debateId,
    reviewerRole: "score-blind-inventory-section-planner",
    assessmentModel: plan.assessmentModel,
    calibrationOnly: plan.calibrationOnly,
    candidateTransportCanonicalSha256: plan.candidateTransportCanonicalSha256,
    inventoryRoutesSha256: canonicalSha256(routes.routes),
    isolation: structuredClone(plan.isolation),
    sections: structuredClone(plan.sections),
    audit: {
      inventoryRoutesImmutable: true,
      completeCandidateEvidenceBundleReviewed: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
  return { routes, sections };
}
function composePlan(routeOutput, sectionOutput) {
  assertV4(
    routeOutput.schemaVersion ===
      "4.2.21.16.4-score-blind-inventory-routes" &&
      routeOutput.protocolId === "v4.2.21.16.4-inventory-route-contract" &&
      routeOutput.reviewerRole === "score-blind-inventory-route-planner" &&
      sectionOutput.schemaVersion ===
        "4.2.21.16.4-score-blind-inventory-sections" &&
      sectionOutput.protocolId ===
        "v4.2.21.16.4-inventory-section-contract" &&
      sectionOutput.reviewerRole ===
        "score-blind-inventory-section-planner" &&
    sectionOutput.inventoryRoutesSha256 === canonicalSha256(routeOutput.routes) &&
      routeOutput.debateNumber === sectionOutput.debateNumber &&
      routeOutput.debateId === sectionOutput.debateId &&
      routeOutput.assessmentModel === sectionOutput.assessmentModel &&
      routeOutput.calibrationOnly === sectionOutput.calibrationOnly &&
      routeOutput.candidateTransportCanonicalSha256 ===
        sectionOutput.candidateTransportCanonicalSha256 &&
      isDeepStrictEqual(routeOutput.isolation, sectionOutput.isolation),
    "route/section binding mismatch"
  );
  return {
    schemaVersion: "4.2.21.16.3-score-blind-inventory-plan",
    protocolId: "v4.2.21.16.3-decomposed-inventory-plan-contract",
    debateNumber: routeOutput.debateNumber,
    debateId: routeOutput.debateId,
    reviewerRole: "score-blind-inventory-planner",
    assessmentModel: routeOutput.assessmentModel,
    calibrationOnly: routeOutput.calibrationOnly,
    candidateTransportCanonicalSha256:
      routeOutput.candidateTransportCanonicalSha256,
    isolation: structuredClone(routeOutput.isolation),
    routes: structuredClone(routeOutput.routes),
    sections: structuredClone(sectionOutput.sections),
    audit: {
      completeCandidateEvidenceBundleReviewed: true,
      candidateSelectionDeferred: true,
      ratingsUnavailable: true,
      responseTopologyUnavailable: true,
      otherJudgmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
    },
  };
}
const proposalKindByDataset = new Map([
  ["predecessor-timeout-gate", "legacy"],
  ["columnar-recovery-gate", "legacy"],
  ["unique-selection-successor-gate", "unique-map"],
  ["side-partitioned-successor-gate", "side-map"],
]);
function normalizeSideProposal({ proposal, candidateTransport, dataset }) {
  const kind = proposalKindByDataset.get(dataset);
  assertV4(kind, `${dataset}: unknown retired proposal kind`);
  if (kind === "legacy") {
    return convertLegacyProposalToSidePartitionedSelectionMap({
      legacyProposal: proposal,
      candidateTransport,
    });
  }
  if (kind === "unique-map") {
    return convertUniqueSelectionMapToSidePartitionedSelectionMap({
      uniqueProposal: proposal,
      candidateTransport,
    });
  }
  return proposal;
}

const schemaRecordByDebate = new Map(
  priorDevelopment.schemas.map((record) => [record.debateNumber, record])
);
const contextByDebate = new Map(
  preparation.contexts.map((context) => [context.debateNumber, context])
);
const manualBytes = await readFile(preparation.inputs.manual);
const columnarGuideBytes = await readFile(preparation.inputs.columnarTransportGuide);
const schemaRecords = [];
for (const context of preparation.contexts) {
  const prior = schemaRecordByDebate.get(context.debateNumber);
  const [planSchema, packetBytes, transportBytes] = await Promise.all([
    readFile(context.planSchema, "utf8").then(JSON.parse),
    readFile(context.packet),
    readFile(context.modelCandidateTransport),
  ]);
  const maximumRoutes = [{
    side: "pro", routeId: "p", description: "d", successCriteria: "s",
    motionBridge: { bridgeId: "pm", tier: "motion", description: "d" },
    centralBridges: [], subsidiaryBridges: [],
  }, {
    side: "con", routeId: "c", description: "d", successCriteria: "s",
    motionBridge: { bridgeId: "cm", tier: "motion", description: "d" },
    centralBridges: [], subsidiaryBridges: [],
  }];
  const routeSchema = buildRouteSchema(planSchema);
  const sectionSchema = buildSectionSchema(planSchema, maximumRoutes);
  const routeSchemaPath = `${ROOT}/schemas/routes/debate-${context.debateNumber}.schema.json`;
  const sectionSchemaPath = `${ROOT}/schemas/sections/debate-${context.debateNumber}.schema.json`;
  const routeSchemaBytes = compactJsonBytes(routeSchema);
  const sectionSchemaBytes = compactJsonBytes(sectionSchema);
  const routeAudit = auditDecomposedStrictSchema(routeSchema);
  const sectionAudit = auditDecomposedStrictSchema(sectionSchema);
  const routeInputBytes =
    manualBytes.length + columnarGuideBytes.length + guideBytes.length +
    packetBytes.length + transportBytes.length + routeSchemaBytes.length;
  const sectionMaximumInputBytes =
    manualBytes.length + columnarGuideBytes.length + guideBytes.length +
    packetBytes.length + transportBytes.length + prior.maximumPlanOutputBytes +
    sectionSchemaBytes.length;
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    routeSchema: routeSchemaPath,
    routeSchemaSha256: sha256(routeSchemaBytes),
    routeSchemaBytes: routeSchemaBytes.length,
    sectionSchemaPrototype: sectionSchemaPath,
    sectionSchemaPrototypeSha256: sha256(sectionSchemaBytes),
    sectionSchemaPrototypeBytes: sectionSchemaBytes.length,
    routeStrictObjectsAudited: routeAudit.objectsAudited,
    sectionStrictObjectsAudited: sectionAudit.objectsAudited,
    routeCopiedInputBytes: routeInputBytes,
    sectionMaximumCopiedInputBytes: sectionMaximumInputBytes,
    priorPlanCopiedInputBytes: prior.planCopiedInputBytes,
    routeInputReductionBytes: prior.planCopiedInputBytes - routeInputBytes,
    bothWithinCeiling:
      routeInputBytes <= 115000 && sectionMaximumInputBytes <= 115000,
  });
  if (shouldWrite) {
    await mkdir(`${ROOT}/schemas/routes`, { recursive: true });
    await mkdir(`${ROOT}/schemas/sections`, { recursive: true });
    await writeFile(routeSchemaPath, routeSchemaBytes);
    await writeFile(sectionSchemaPath, sectionSchemaBytes);
  }
}

const retiredRecords = [];
for (const record of priorDevelopment.regression.records) {
  const context = contextByDebate.get(record.debateNumber);
  const [proposal, transport, legacySchema] = await Promise.all([
    readFile(record.sourceProposal, "utf8").then(JSON.parse),
    readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
    readFile(context.priorSchema, "utf8").then(JSON.parse),
  ]);
  const sideProposal = normalizeSideProposal({
    proposal,
    candidateTransport: transport,
    dataset: record.dataset,
  });
  const { plan } = splitSidePartitionedInventoryProposal({
    proposal: sideProposal,
    candidateTransport: transport,
  });
  const split = splitPlan(plan);
  const recomposed = composePlan(split.routes, split.sections);
  validateDecomposedInventoryPlan({
    plan: recomposed,
    legacySchema,
    candidateTransport: transport,
  });
  assertV4(isDeepStrictEqual(recomposed, plan), "retired plan replay drifted");
  assertV4(
    jsonBytes(split.routes).length < jsonBytes(plan).length &&
      jsonBytes(split.sections).length < jsonBytes(plan).length,
    "a split planner output is not smaller than the source plan"
  );
  retiredRecords.push({
    dataset: record.dataset,
    debateNumber: record.debateNumber,
    sourceProposal: record.sourceProposal,
    planSha256: inventoryPlanSha256(plan),
    routeOutputBytes: jsonBytes(split.routes).length,
    sectionOutputBytes: jsonBytes(split.sections).length,
    planOutputBytes: jsonBytes(plan).length,
    recomposedPlanIdentical: true,
  });
}

const failedGatePlanRecords = [];
for (const context of preparation.contexts) {
  if (!(await exists(context.planOutput))) continue;
  const [plan, transport, legacySchema] = await Promise.all([
    readFile(context.planOutput, "utf8").then(JSON.parse),
    readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
    readFile(context.priorSchema, "utf8").then(JSON.parse),
  ]);
  const split = splitPlan(plan);
  const recomposed = composePlan(split.routes, split.sections);
  validateDecomposedInventoryPlan({
    plan: recomposed,
    legacySchema,
    candidateTransport: transport,
  });
  assertV4(isDeepStrictEqual(recomposed, plan), "failed-gate plan replay drifted");
  failedGatePlanRecords.push({
    debateNumber: context.debateNumber,
    evidenceOnlyNotReusableForAcceptance: true,
    planSha256: inventoryPlanSha256(plan),
    recomposedPlanIdentical: true,
  });
}

assertV4(
  retiredRecords.length === 22 &&
    failedGatePlanRecords.length === 8 &&
    schemaRecords.length === 10,
  "development evidence cardinality drifted"
);
const firstRetired = retiredRecords[0];
const firstTransport = JSON.parse(
  await readFile(
    contextByDebate.get(firstRetired.debateNumber).modelCandidateTransport,
    "utf8"
  )
);
const firstProposal = normalizeSideProposal({
  proposal: JSON.parse(await readFile(firstRetired.sourceProposal, "utf8")),
  candidateTransport: firstTransport,
  dataset: firstRetired.dataset,
});
const tampered = structuredClone(
  splitPlan(
    splitSidePartitionedInventoryProposal({
      proposal: firstProposal,
      candidateTransport: firstTransport,
    }).plan
  )
);
tampered.sections.inventoryRoutesSha256 = "0".repeat(64);
let routeBindingTamperRejected = false;
try {
  composePlan(tampered.routes, tampered.sections);
} catch {
  routeBindingTamperRejected = true;
}
assertV4(routeBindingTamperRejected, "route binding tamper was accepted");

const sourceFiles = [
  PRIOR_DEVELOPMENT,
  FAILURE_DIAGNOSIS,
  PREPARATION,
  GUIDE,
  SCRIPT,
  TEST,
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  "scripts/lib/v4-lean-production.mjs",
  ...retiredRecords.map((record) => record.sourceProposal),
  ...failedGatePlanRecords.map(
    (record) => contextByDebate.get(record.debateNumber).planOutput
  ),
  ...preparation.contexts.flatMap((context) => [
    context.packet,
    context.modelCandidateTransport,
    context.priorSchema,
    context.planSchema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const analysis = {
  schemaVersion:
    "1.0-score-stability-v2-route-section-selection-inventory-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2-route-section-selection-inventory-development",
  status: shouldWrite
    ? "route-section-selection-retired-regression-passed-successor-preparation-not-authorized"
    : "preview",
  developedAt: shouldWrite ? developedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: {
    allFiveFailedGatesPreserved: true,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
    retriesPerformed: 0,
    timeoutExtensionsPerformed: 0,
    validFailedGatePlansReusableForAcceptance: false,
  },
  design: {
    stages: ["inventory-routes", "inventory-sections", "candidate-selection"],
    freshIsolatedContextPerStage: true,
    routeStageWritableDomains: ["routes"],
    sectionStageWritableDomains: ["sections"],
    selectionStageWritableDomains: ["candidateSelectionsBySide"],
    canonicalCandidateTransportHashBoundInEveryStage: true,
    canonicalRouteHashBoundInSectionStage: true,
    canonicalPlanHashBoundInSelectionStage: true,
    deterministicCompositionRequired: true,
    finalInventorySemanticsChanged: false,
    fullLosslessCandidateTransportStillRequiredByRouteAndSectionStages: true,
    silentTimeoutCauseAddressedByInputReduction: false,
  },
  schemas: schemaRecords,
  regression: {
    acceptedRetiredArtifactsReplayed: retiredRecords.length,
    retiredRecords,
    failedGateValidPlansReplayedAsEvidenceOnly: failedGatePlanRecords.length,
    failedGatePlanRecords,
    routeBindingTamperRejected,
    recomposedPlansIdentical:
      retiredRecords.length + failedGatePlanRecords.length,
    freshModelEvidenceUsed: false,
  },
  sizing: {
    provenCeilingBytes: 115000,
    routeMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.routeCopiedInputBytes)
    ),
    sectionMaximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.sectionMaximumCopiedInputBytes)
    ),
    selectionMaximumCopiedInputBytes:
      preparation.transport.selectionMaximumCopiedInputBoundBytes,
    everyStageWithinCeiling: schemaRecords.every((record) => record.bothWithinCeiling),
    minimumObservedRouteOutputReductionFraction: Math.min(
      ...retiredRecords.map(
        (record) => 1 - record.routeOutputBytes / record.planOutputBytes
      )
    ),
    minimumObservedSectionOutputReductionFraction: Math.min(
      ...retiredRecords.map(
        (record) => 1 - record.sectionOutputBytes / record.planOutputBytes
      )
    ),
    inputSizeCauseEstablished: false,
    outputComplexityCauseEstablished: false,
  },
  conclusion: {
    strictThreeStageContractFeasible: true,
    exactSemanticsPreservedInRetiredRegression: true,
    guaranteesModelCompletion: false,
    materiallyReducesFullEvidenceInputForEveryPreSelectionStage: false,
    sufficientEvidenceForFreshSuccessorGate: false,
    reason:
      "The split reduces writable output domains but the route and section stages still require the complete lossless candidate evidence. Because both silent timeouts occurred before any progress output and no deterministic input-size, schema, or concurrency cause is established, another fresh gate is not justified by this development result alone.",
  },
  sourceHashes,
  totals: {
    debates: 10,
    retiredArtifactsReplayed: retiredRecords.length,
    failedGatePlansReplayedAsEvidenceOnly: failedGatePlanRecords.length,
    modelContextsExecuted: 0,
    retries: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
  },
  authorization: {
    successorPreparation: false,
    successorExecutionManifest: false,
    successorModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: "none-without-explicit-user-authorization",
};
if (shouldWrite) await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({
  status: analysis.status,
  retiredArtifactsReplayed: retiredRecords.length,
  failedGatePlansReplayedAsEvidenceOnly: failedGatePlanRecords.length,
  routeMaximumCopiedInputBytes: analysis.sizing.routeMaximumCopiedInputBytes,
  sectionMaximumCopiedInputBytes: analysis.sizing.sectionMaximumCopiedInputBytes,
  selectionMaximumCopiedInputBytes: analysis.sizing.selectionMaximumCopiedInputBytes,
  strictThreeStageContractFeasible: true,
  sufficientEvidenceForFreshSuccessorGate: false,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0,
  nextAuthorized: analysis.nextAuthorizedAction,
}, null, 2));
