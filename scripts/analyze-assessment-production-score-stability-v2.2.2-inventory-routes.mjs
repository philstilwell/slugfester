#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import { buildMaximumCandidateShardedPlanFixture } from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";
import {
  composeV222CandidateCensusPlan,
  splitV222CandidateCensusPlan,
  v222InventoryRoutesSha256,
} from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const ACTIVATION = `${ROOT}/route-execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "frozen-ten-v2.2.2-route-contexts-authorized" &&
    activation.authorization?.routeAnalysis === true &&
    activation.authorization?.exactSectionPacketPreparation === false &&
    activation.authorization?.exactSidePacketPreparation === false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false,
  "route analysis is unauthorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
assertV4(
  !(await exists(activation.artifacts.analysis)),
  `${activation.artifacts.analysis} already exists`
);

const [preparationBytes, sourcePreparationBytes, executionBytes] =
  await Promise.all([
    readFile(activation.preparationManifest),
    readFile(activation.sourcePreparation),
    readFile(activation.artifacts.execution),
  ]);
assertV4(
  sha256(preparationBytes) === activation.preparationManifestSha256 &&
    sha256(sourcePreparationBytes) === activation.sourcePreparationSha256,
  "frozen preparation hash drifted"
);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.status ===
      "ten-v2.2.2-route-contexts-passed" &&
    execution.activationSha256 === sha256(activationBytes) &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 10 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 10 &&
    execution.invalidContexts === 0 &&
    execution.attempts === 10 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.rampPassed === true &&
    execution.authentication === "ChatGPT subscription" &&
    execution.scoreBlind === true &&
    execution.meteredApiCostUsd === 0 &&
    execution.transcriptionCostUsd === 0 &&
    execution.scoresDerived === 0 &&
    execution.predecessorV22DiscoveryGateReclassified === false &&
    execution.predecessorV213ScoreGateReclassified === false &&
    execution.predecessorV221PlanningGateReclassified === false &&
    execution.authorization?.deterministicRouteAnalysis === true &&
    execution.authorization?.exactSectionPacketPreparation === false &&
    execution.authorization?.exactSidePacketPreparation === false &&
    execution.authorization?.scoreDerivation === false &&
    execution.authorization?.productionMutation === false,
  "route execution did not pass as one complete gate"
);

const routes = [];
for (const [index, context] of preparation.contexts.entries()) {
  const prepared = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const result = execution.results.find(
    (item) => item.contextIndex === index
  );
  assertV4(
    prepared &&
      result?.debateNumber === context.debateNumber &&
      result?.accepted === true &&
      result?.attemptCount === 1 &&
      result?.retryCount === 0 &&
      result?.timedOut === false &&
      result?.status === "completed-valid" &&
      result?.routeOutputWritten === true,
    `${context.debateNumber}: accepted route execution record drifted`
  );
  const [routeBytes, legacySchema, candidateTransport, candidateCensus] =
    await Promise.all([
      readFile(context.output),
      readFile(prepared.sourceContext.compilerSchema, "utf8").then(JSON.parse),
      readFile(prepared.sourceContext.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(prepared.sourceContext.candidateCensus, "utf8").then(JSON.parse),
    ]);
  assertV4(
    sha256(routeBytes) === result.routeSha256,
    `${context.debateNumber}: accepted route bytes drifted`
  );
  const routeOutput = JSON.parse(routeBytes);
  const maximumPlan = buildMaximumCandidateShardedPlanFixture({
    legacySchema,
    candidateTransport,
  });
  const sectionFixture = splitV222CandidateCensusPlan(maximumPlan).sections;
  sectionFixture.debateNumber = routeOutput.debateNumber;
  sectionFixture.debateId = routeOutput.debateId;
  sectionFixture.assessmentModel = routeOutput.assessmentModel;
  sectionFixture.calibrationOnly = routeOutput.calibrationOnly;
  sectionFixture.candidateCensusCanonicalSha256 =
    routeOutput.candidateCensusCanonicalSha256;
  sectionFixture.fullCandidateTransportCanonicalSha256 =
    routeOutput.fullCandidateTransportCanonicalSha256;
  sectionFixture.inventoryRoutesSha256 =
    v222InventoryRoutesSha256(routeOutput.routes);
  sectionFixture.isolation = structuredClone(routeOutput.isolation);
  const composedPlan = composeV222CandidateCensusPlan(
    routeOutput,
    sectionFixture
  );
  const validation = validateCandidateShardedInventoryPlan({
    plan: composedPlan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  assertV4(
    validation.status === "passed" &&
      v222InventoryRoutesSha256(routeOutput.routes) ===
        result.inventoryRoutesSha256,
    `${context.debateNumber}: deterministic route replay failed`
  );
  routes.push({
    contextIndex: index,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    output: context.output,
    outputSha256: sha256(routeBytes),
    inventoryRoutesSha256: result.inventoryRoutesSha256,
    routes: routeOutput.routes.length,
    validated: true,
  });
}

const sourceHashes = {
  [ACTIVATION]: sha256(activationBytes),
  [activation.preparationManifest]: sha256(preparationBytes),
  [activation.sourcePreparation]: sha256(sourcePreparationBytes),
  [activation.artifacts.execution]: sha256(executionBytes),
};
for (const route of routes) sourceHashes[route.output] = route.outputSha256;

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-analysis",
  protocolId: activation.protocolId,
  status:
    "v2.2.2-route-gate-passed-exact-section-packet-preparation-authorized",
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  failedGateDisposition: structuredClone(activation.failedGateDisposition),
  proposedPolicy: structuredClone(activation.proposedPolicy),
  model: structuredClone(activation.model),
  activation: ACTIVATION,
  activationSha256: sha256(activationBytes),
  execution: activation.artifacts.execution,
  executionSha256: sha256(executionBytes),
  routes,
  audit: {
    exactRouteOutputCount: routes.length,
    everyRouteSingleAttempt: true,
    everyRouteSchemaAndSemanticValidationPassed: true,
    everyRouteCanonicalHashReplayed: true,
    everyOutputHasOneRoutePerSide: routes.every((route) => route.routes === 2),
    sectionsAuthored: false,
    candidateSelectionPerformed: false,
    exactSectionPacketsFrozen: 0,
    exactSidePacketsFrozen: 0,
    scoresDerived: false,
  },
  sourceHashes,
  totals: {
    debates: routes.length,
    routeContextsAttempted: execution.contextsAttempted,
    acceptedRoutes: routes.length,
    exactSectionPacketsFrozen: 0,
    exactSidePacketsFrozen: 0,
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
    exactSectionPacketPreparation: true,
    sectionExecutionManifestPreparation: false,
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
    "prepare-and-freeze-ten-exact-v2.2.2-section-packets-model-free-only",
};

await writeFile(
  activation.artifacts.analysis,
  `${JSON.stringify(analysis, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: routes.length,
      acceptedRoutes: routes.length,
      exactSectionPacketsFrozen: 0,
      exactSidePacketsFrozen: 0,
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
