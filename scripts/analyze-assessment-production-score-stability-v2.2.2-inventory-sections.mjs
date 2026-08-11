#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  candidateShardedInventoryPlanSha256,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import { composeV222CandidateCensusPlan } from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const ACTIVATION = `${ROOT}/section-execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status ===
      "frozen-ten-v2.2.2-section-contexts-authorized" &&
    activation.authorization?.planAnalysis === true &&
    activation.authorization?.planComposition === true &&
    activation.authorization?.exactSidePacketPreparation === false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false,
  "section analysis is unauthorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
assertV4(
  !(await exists(activation.artifacts.analysis)),
  `${activation.artifacts.analysis} already exists`
);
for (const planOutput of activation.artifacts.composedPlans) {
  assertV4(!(await exists(planOutput)), `${planOutput} already exists`);
}

const [preparationBytes, sourcePreparationBytes, executionBytes] =
  await Promise.all([
    readFile(activation.preparationManifest),
    readFile(activation.sourcePreparation),
    readFile(activation.artifacts.execution),
  ]);
assertV4(
  sha256(preparationBytes) === activation.preparationManifestSha256 &&
    sha256(sourcePreparationBytes) === activation.sourcePreparationSha256,
  "frozen section preparation hash drifted"
);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.status === "ten-v2.2.2-section-contexts-passed" &&
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
    execution.authorization?.deterministicPlanAnalysis === true &&
    execution.authorization?.persistentPlanComposition === true &&
    execution.authorization?.exactSidePacketPreparation === false &&
    execution.authorization?.scoreDerivation === false &&
    execution.authorization?.productionMutation === false,
  "section execution did not pass as one complete gate"
);

const plans = [];
const pendingWrites = [];
for (const [index, context] of preparation.contexts.entries()) {
  const prepared = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const result = execution.results.find((item) => item.contextIndex === index);
  assertV4(
    prepared &&
      result?.debateNumber === context.debateNumber &&
      result?.accepted === true &&
      result?.attemptCount === 1 &&
      result?.retryCount === 0 &&
      result?.timedOut === false &&
      result?.status === "completed-valid" &&
      result?.sectionOutputWritten === true &&
      result?.inventoryRoutesSha256 === context.inventoryRoutesSha256,
    `${context.debateNumber}: accepted section execution record drifted`
  );
  const [sectionBytes, routeBytes, legacySchema, candidateTransport, candidateCensus] =
    await Promise.all([
      readFile(context.output),
      readFile(context.immutableRouteOutput),
      readFile(prepared.sourceContext.compilerSchema, "utf8").then(JSON.parse),
      readFile(prepared.sourceContext.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(prepared.sourceContext.candidateCensus, "utf8").then(JSON.parse),
    ]);
  assertV4(
    sha256(sectionBytes) === result.sectionSha256 &&
      sha256(routeBytes) === context.immutableRouteOutputSha256,
    `${context.debateNumber}: accepted section or route bytes drifted`
  );
  const sectionOutput = JSON.parse(sectionBytes);
  const routeOutput = JSON.parse(routeBytes);
  const plan = composeV222CandidateCensusPlan(routeOutput, sectionOutput);
  const validation = validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
  });
  const canonicalSha256 = candidateShardedInventoryPlanSha256(plan);
  assertV4(
    validation.status === "passed" &&
      canonicalSha256 === result.composedPlanCanonicalSha256,
    `${context.debateNumber}: deterministic plan replay failed`
  );
  const planBytes = jsonBytes(plan);
  pendingWrites.push({ file: context.composedPlanOutput, bytes: planBytes });
  plans.push({
    contextIndex: index,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    routeOutput: context.immutableRouteOutput,
    routeOutputSha256: sha256(routeBytes),
    sectionOutput: context.output,
    sectionOutputSha256: sha256(sectionBytes),
    output: context.composedPlanOutput,
    outputSha256: sha256(planBytes),
    canonicalSha256,
    inventoryRoutesSha256: context.inventoryRoutesSha256,
    routes: plan.routes.length,
    sections: plan.sections.length,
    weightPercentTotal: plan.sections.reduce(
      (sum, section) => sum + section.weightPercent,
      0
    ),
    validated: true,
  });
}
assertV4(plans.length === 10, "exactly ten accepted plans required");

for (const pending of pendingWrites) {
  await mkdir(path.dirname(pending.file), { recursive: true });
  await writeFile(pending.file, pending.bytes);
}

const sourceHashes = {
  [ACTIVATION]: sha256(activationBytes),
  [activation.preparationManifest]: sha256(preparationBytes),
  [activation.sourcePreparation]: sha256(sourcePreparationBytes),
  [activation.artifacts.execution]: sha256(executionBytes),
};
for (const plan of plans) {
  sourceHashes[plan.routeOutput] = plan.routeOutputSha256;
  sourceHashes[plan.sectionOutput] = plan.sectionOutputSha256;
  sourceHashes[plan.output] = plan.outputSha256;
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-route-section-plan-analysis",
  protocolId: activation.protocolId,
  status:
    "v2.2.2-route-section-plan-gate-passed-exact-side-packet-preparation-authorized",
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
  plans,
  audit: {
    exactPlanCount: plans.length,
    everySectionSingleAttempt: true,
    everySectionSchemaAndSemanticValidationPassed: true,
    everyPlanCanonicalHashReplayed: true,
    everyPlanHasOneRoutePerSide: plans.every((plan) => plan.routes === 2),
    everyPlanHasFourToSixSections: plans.every(
      (plan) => plan.sections >= 4 && plan.sections <= 6
    ),
    everyPlanWeightsTotalOneHundred: plans.every(
      (plan) => plan.weightPercentTotal === 100
    ),
    everySectionBoundToImmutableRouteHash: true,
    candidateSelectionPerformed: false,
    exactSidePacketsFrozen: 0,
    scoresDerived: false,
  },
  sourceHashes,
  totals: {
    debates: plans.length,
    routeContextsPreviouslyAccepted: 10,
    sectionContextsAttempted: execution.contextsAttempted,
    acceptedSections: plans.length,
    acceptedPlans: plans.length,
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
    exactSidePacketPreparation: true,
    sideSelectorExecutionManifestPreparation: false,
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
    "prepare-and-freeze-twenty-exact-v2.2.2-side-selector-packets-model-free-only",
};

await writeFile(activation.artifacts.analysis, jsonBytes(analysis));
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: plans.length,
      acceptedPlans: plans.length,
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
