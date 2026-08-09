#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const closedIndex = process.argv.indexOf("--closed-at");
const closedAt = closedIndex >= 0 ? process.argv[closedIndex + 1] : null;
assertV4(
  !shouldWrite || (closedAt && !Number.isNaN(Date.parse(closedAt))),
  "--write requires --closed-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const OUTPUT = `${ROOT}/validation-closure-analysis.json`;
const PROTOCOL = `${ROOT}/validation-closure-protocol.md`;
const SCRIPT =
  "scripts/close-assessment-production-score-stability-v2-validation.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-validation-closure.mjs";
const CANARY_FAILURE =
  "docs/assessment-production/canary-v1-score-pass/failure-diagnosis.json";
const POLICY = "docs/assessment-production/score-stability-policy-v2-proposal.md";
const RETROSPECTIVE =
  "docs/assessment-production/score-stability-policy-v2-retrospective-audit.json";
const MASTER_MANIFEST = `${ROOT}/validation-manifest.json`;
const DISCOVERY_EXECUTION = `${ROOT}/discovery/model-execution.json`;
const ROUTE_DEVELOPMENT =
  `${ROOT}/inventory-route-section-selection-development/development-analysis.json`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; closure is immutable`);
}

const standardGateDefinitions = [
  {
    id: "original-monolithic-inventory",
    execution: `${ROOT}/inventory/model-execution.json`,
    preparation: `${ROOT}/inventory/preparation-manifest.json`,
    diagnosis: `${ROOT}/inventory-columnar-recovery/timeout-diagnosis.json`,
    expected: {
      attempted: 10,
      valid: 9,
      failedDebates: ["137"],
      failureModes: ["timed-out"],
    },
  },
  {
    id: "columnar-recovery-inventory",
    execution: `${ROOT}/inventory-columnar-recovery/model-execution.json`,
    preparation: `${ROOT}/inventory-columnar-recovery/preparation-manifest.json`,
    diagnosis: `${ROOT}/inventory-columnar-recovery/failure-diagnosis.json`,
    expected: {
      attempted: 3,
      valid: 2,
      failedDebates: ["31"],
      failureModes: ["output-validation-failed"],
    },
  },
  {
    id: "unique-selection-map-inventory",
    execution: `${ROOT}/inventory-unique-selection-map-successor/model-execution.json`,
    preparation: `${ROOT}/inventory-unique-selection-map-successor/preparation-manifest.json`,
    diagnosis: `${ROOT}/inventory-unique-selection-map-successor/failure-diagnosis.json`,
    expected: {
      attempted: 3,
      valid: 2,
      failedDebates: ["31"],
      failureModes: ["output-validation-failed"],
    },
  },
  {
    id: "side-partitioned-selection-map-inventory",
    execution:
      `${ROOT}/inventory-side-partitioned-selection-map-successor/model-execution.json`,
    preparation:
      `${ROOT}/inventory-side-partitioned-selection-map-successor/preparation-manifest.json`,
    diagnosis:
      `${ROOT}/inventory-side-partitioned-selection-map-successor/failure-diagnosis.json`,
    expected: {
      attempted: 10,
      valid: 9,
      failedDebates: ["137"],
      failureModes: ["timed-out"],
    },
  },
];
const decomposedDefinition = {
  id: "decomposed-plan-selection-inventory",
  execution:
    `${ROOT}/inventory-decomposed-plan-selection-successor/model-execution.json`,
  planExecution:
    `${ROOT}/inventory-decomposed-plan-selection-successor/plan-model-execution.json`,
  preparation:
    `${ROOT}/inventory-decomposed-plan-selection-successor/preparation-manifest.json`,
  diagnosis:
    `${ROOT}/inventory-decomposed-plan-selection-successor/failure-diagnosis.json`,
};

const [
  canaryFailure,
  retrospective,
  masterManifest,
  discoveryExecution,
  routeDevelopment,
] = await Promise.all([
  readJson(CANARY_FAILURE),
  readJson(RETROSPECTIVE),
  readJson(MASTER_MANIFEST),
  readJson(DISCOVERY_EXECUTION),
  readJson(ROUTE_DEVELOPMENT),
]);

assertV4(
  canaryFailure.status ===
      "confirmed-single-rounding-edge-winner-preservation-failure" &&
    canaryFailure.debate64.final.proRoundedScore === 82 &&
    canaryFailure.debate64.final.conRoundedScore === 82 &&
    canaryFailure.debate64.final.winner === "tie" &&
    canaryFailure.decision.canaryPassed === false &&
    canaryFailure.decision.automaticRerunAuthorized === false &&
    canaryFailure.decision.productionMutationAuthorized === false,
  "v1 production-canary failure boundary drifted"
);
assertV4(
  retrospective.status ===
      "retrospective-diagnostic-supports-v2-fresh-validation-still-required" &&
    retrospective.authorization.freshDisjointCohortSelection === true &&
    retrospective.authorization.currentCanaryReclassification === false &&
    masterManifest.status ===
      "frozen-fresh-disjoint-ten-debate-score-stability-v2-validation" &&
    masterManifest.currentCanaryDisposition.reclassified === false &&
    masterManifest.proposedPolicy.promoted === false &&
    masterManifest.cohort.disjointFromObservedCalibrationAndCanary === true &&
    discoveryExecution.status ===
      "forty-five-v2-validation-discovery-contexts-passed" &&
    discoveryExecution.contextsPlanned === 45 &&
    discoveryExecution.contextsAttempted === 45 &&
    discoveryExecution.validContexts === 45 &&
    discoveryExecution.invalidContexts === 0 &&
    discoveryExecution.retries === 0 &&
    discoveryExecution.authentication === "ChatGPT subscription" &&
    discoveryExecution.meteredApiCostUsd === 0 &&
    discoveryExecution.results.length === 45 &&
    discoveryExecution.results.every(
      (result) =>
        result.accepted === true &&
        result.model === "5.6 Sol" &&
        result.modelSlug === "gpt-5.6-sol" &&
        result.reasoningEffort === "low" &&
        result.authentication === "ChatGPT subscription" &&
        result.apiKeysRemoved === true &&
        result.attemptCount === 1 &&
        result.retryCount === 0
    ) &&
    routeDevelopment.status ===
      "route-section-selection-retired-regression-passed-successor-preparation-not-authorized" &&
    routeDevelopment.conclusion.sufficientEvidenceForFreshSuccessorGate ===
      false &&
    Object.values(routeDevelopment.authorization).every((value) => value === false),
  "v2 validation lineage drifted"
);

const artifactRecords = [];
async function registerExistingArtifacts({ gateId, debateNumber, context }) {
  const fields = [
    "proposalOutput",
    "lockedInventoryOutput",
    "validationOutput",
    "provenanceOutput",
  ];
  for (const field of fields) {
    const file = context[field];
    if (!file || !(await exists(file))) continue;
    artifactRecords.push({
      gateId,
      debateNumber,
      artifactKind: field,
      file,
      sha256: sha256(await readFile(path.resolve(file))),
      disposition: "preserved-evidence-only-not-reusable-for-acceptance",
    });
  }
}

const gates = [];
for (const definition of standardGateDefinitions) {
  const [execution, preparation, diagnosis] = await Promise.all([
    readJson(definition.execution),
    readJson(definition.preparation),
    readJson(definition.diagnosis),
  ]);
  const validResults = execution.results.filter((result) => result.accepted);
  const invalidResults = execution.results.filter((result) => !result.accepted);
  assertV4(
    execution.contextsAttempted === definition.expected.attempted &&
      execution.validContexts === definition.expected.valid &&
      execution.invalidContexts === invalidResults.length &&
      execution.retries === 0 &&
      execution.authentication === "ChatGPT subscription" &&
      execution.meteredApiCostUsd === 0 &&
      execution.results.every(
        (result) =>
          result.model === "5.6 Sol" &&
          result.modelSlug === "gpt-5.6-sol" &&
          result.reasoningEffort === "low" &&
          result.authentication === "ChatGPT subscription" &&
          result.apiKeysRemoved === true &&
          result.attemptCount === 1 &&
          result.retryCount === 0
      ) &&
      JSON.stringify(invalidResults.map((result) => result.debateNumber)) ===
        JSON.stringify(definition.expected.failedDebates) &&
      JSON.stringify(invalidResults.map((result) => result.status)) ===
        JSON.stringify(definition.expected.failureModes),
    `${definition.id}: frozen execution drifted`
  );
  const contextByDebate = new Map(
    preparation.contexts.map((context) => [context.debateNumber, context])
  );
  for (const result of execution.results) {
    await registerExistingArtifacts({
      gateId: definition.id,
      debateNumber: result.debateNumber,
      context: contextByDebate.get(result.debateNumber),
    });
  }
  gates.push({
    gateId: definition.id,
    execution: definition.execution,
    executionStatus: execution.status,
    diagnosis: definition.diagnosis,
    diagnosisStatus: diagnosis.status,
    contextsPlanned: execution.contextsPlanned,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    locallyValidIntermediateContexts: validResults.length,
    invalidContexts: invalidResults.length,
    failedDebates: invalidResults.map((result) => result.debateNumber),
    failureModes: invalidResults.map((result) => result.status),
    retries: execution.retries,
    completeTenDebateGatePassed: false,
    validOutputsReusableForAcceptance: false,
  });
}

const [decomposedExecution, planExecution, decomposedPreparation, decomposedDiagnosis] =
  await Promise.all([
    readJson(decomposedDefinition.execution),
    readJson(decomposedDefinition.planExecution),
    readJson(decomposedDefinition.preparation),
    readJson(decomposedDefinition.diagnosis),
  ]);
const validPlans = planExecution.results.filter((result) => result.accepted);
const invalidPlans = planExecution.results.filter((result) => !result.accepted);
assertV4(
  decomposedExecution.stageContextsPlanned === 20 &&
    decomposedExecution.stageContextsAttempted === 10 &&
    decomposedExecution.validPlans === 8 &&
    decomposedExecution.validSelections === 0 &&
    decomposedExecution.retries === 0 &&
    decomposedExecution.authentication === "ChatGPT subscription" &&
    decomposedExecution.meteredApiCostUsd === 0 &&
    planExecution.contextsPlanned === 10 &&
    planExecution.contextsAttempted === 10 &&
    validPlans.length === 8 &&
    invalidPlans.length === 2 &&
    JSON.stringify(invalidPlans.map((result) => result.debateNumber)) ===
      JSON.stringify(["93", "137"]) &&
    invalidPlans.every((result) => result.status === "timed-out") &&
    planExecution.results.every(
      (result) =>
        result.model === "5.6 Sol" &&
        result.modelSlug === "gpt-5.6-sol" &&
        result.reasoningEffort === "low" &&
        result.authentication === "ChatGPT subscription" &&
        result.apiKeysRemoved === true &&
        result.attemptCount === 1 &&
        result.retryCount === 0
    ) &&
    decomposedDiagnosis.failure.selectorContextsExecuted === 0 &&
    Object.values(decomposedDiagnosis.authorization).every(
      (value) => value === false
    ),
  "decomposed plan/selection gate drifted"
);
const decomposedContextByDebate = new Map(
  decomposedPreparation.contexts.map((context) => [context.debateNumber, context])
);
for (const result of planExecution.results) {
  const context = decomposedContextByDebate.get(result.debateNumber);
  for (const [artifactKind, file] of [
    ["planOutput", context.planOutput],
    ["selectionSchemaOutput", context.selectionSchemaOutput],
    ["selectionOutput", context.selectionOutput],
    ["composedProposalOutput", context.composedProposalOutput],
    ["lockedInventoryOutput", context.lockedInventoryOutput],
    ["validationOutput", context.validationOutput],
    ["provenanceOutput", context.provenanceOutput],
  ]) {
    if (!(await exists(file))) continue;
    artifactRecords.push({
      gateId: decomposedDefinition.id,
      debateNumber: result.debateNumber,
      artifactKind,
      file,
      sha256: sha256(await readFile(path.resolve(file))),
      disposition: "preserved-evidence-only-not-reusable-for-acceptance",
    });
  }
}
gates.push({
  gateId: decomposedDefinition.id,
  execution: decomposedDefinition.execution,
  executionStatus: decomposedExecution.status,
  diagnosis: decomposedDefinition.diagnosis,
  diagnosisStatus: decomposedDiagnosis.status,
  contextsPlanned: 20,
  contextsAttempted: 10,
  contextsUnattempted: 10,
  locallyValidIntermediateContexts: validPlans.length,
  invalidContexts: invalidPlans.length,
  failedDebates: invalidPlans.map((result) => result.debateNumber),
  failureModes: invalidPlans.map((result) => result.status),
  retries: decomposedExecution.retries,
  selectorContextsExecuted: 0,
  completeTenDebateGatePassed: false,
  validOutputsReusableForAcceptance: false,
});

assertV4(
  gates.length === 5 &&
    gates.every((gate) => gate.completeTenDebateGatePassed === false) &&
    gates.reduce((sum, gate) => sum + gate.contextsAttempted, 0) === 36 &&
    gates.reduce(
      (sum, gate) => sum + gate.locallyValidIntermediateContexts,
      0
    ) === 30 &&
    gates.reduce((sum, gate) => sum + gate.invalidContexts, 0) === 6 &&
    artifactRecords.length === 106 &&
    new Set(artifactRecords.map((record) => record.file)).size ===
      artifactRecords.length,
  "aggregate inventory closure counts drifted"
);

const prohibitedDownstreamRoots = [
  `${ROOT}/independent-judgments`,
  `${ROOT}/disagreement-audio-prep`,
  `${ROOT}/dispute-only-adjudication`,
  `${ROOT}/final-ledger`,
  `${ROOT}/score-pass`,
  `${ROOT}/publication`,
];
assertV4(
  (await Promise.all(prohibitedDownstreamRoots.map(exists))).every(
    (present) => present === false
  ),
  "prohibited downstream v2 validation artifact exists"
);

const sourceFiles = [
  CANARY_FAILURE,
  POLICY,
  RETROSPECTIVE,
  MASTER_MANIFEST,
  DISCOVERY_EXECUTION,
  ROUTE_DEVELOPMENT,
  PROTOCOL,
  SCRIPT,
  TEST,
  ...standardGateDefinitions.flatMap((definition) => [
    definition.execution,
    definition.preparation,
    definition.diagnosis,
  ]),
  decomposedDefinition.execution,
  decomposedDefinition.planExecution,
  decomposedDefinition.preparation,
  decomposedDefinition.diagnosis,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const analysis = {
  schemaVersion: "1.0-score-stability-v2-validation-closure-analysis",
  protocolId: "assessment-production-score-stability-v2-validation-closure",
  status: shouldWrite
    ? "score-stability-v2-fresh-validation-failed-at-inventory-policy-not-promoted"
    : "preview",
  closedAt: shouldWrite ? closedAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  sourceHashes,
  v1CanaryDisposition: {
    status: canaryFailure.status,
    failedDebate: "64",
    finalRoundedScores: { pro: 82, con: 82 },
    finalUnroundedDirection: "con",
    reclassified: false,
    rerunPerformed: false,
    automaticRerunAuthorized: false,
  },
  proposedV2PolicyDisposition: {
    status: "proposal-unvalidated-not-promoted",
    retrospectiveSupportDiagnosticOnly: true,
    freshDisjointValidationRequired: true,
    freshDisjointValidationCompleted: false,
    failedBeforeIndependentJudgments: true,
    promoted: false,
    currentCanaryReclassified: false,
  },
  executionBoundary: {
    modelLabel: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    discoveryContextsExecuted: 45,
    inventoryContextsExecuted: 36,
    totalModelContextsExecuted: 81,
    retries: 0,
    meteredApiCostUsd: 0,
    closureModelContextsExecuted: 0,
  },
  inventoryCampaign: {
    gatesAttempted: gates.length,
    completeTenDebateGatesPassed: 0,
    contextsAttempted: gates.reduce(
      (sum, gate) => sum + gate.contextsAttempted,
      0
    ),
    locallyValidIntermediateContexts: gates.reduce(
      (sum, gate) => sum + gate.locallyValidIntermediateContexts,
      0
    ),
    invalidContexts: gates.reduce(
      (sum, gate) => sum + gate.invalidContexts,
      0
    ),
    independentJudgmentContextsExecuted: 0,
    scoresDerived: 0,
    gates,
  },
  artifactQuarantine: {
    logicalQuarantineOnlyFilesNotMoved: true,
    records: artifactRecords.sort((left, right) =>
      left.file.localeCompare(right.file)
    ),
    files: artifactRecords.length,
    everyArtifactHashBound: true,
    everyArtifactPreservedAsEvidenceOnly: true,
    reusableForFutureAcceptance: false,
    reusableAsFreshModelInput: false,
  },
  developmentDisposition: {
    strictRouteSectionSelectionContractFeasible: true,
    exactRetiredRecompositionPassed: true,
    sufficientEvidenceForFreshSuccessorGate: false,
    silentTimeoutCauseEstablished: false,
    successorPreparationAuthorized: false,
  },
  conclusion: {
    validationPassed: false,
    failureStage: "score-blind-inventory",
    currentCanaryRemainsFailed: true,
    proposedPolicyRemainsUnvalidated: true,
    proposedPolicyPromoted: false,
    publicationAuthorized: false,
    productionMutationAuthorized: false,
    remainingProductionBatchesAuthorized: false,
    reason:
      "The fresh disjoint cohort passed discovery but no inventory protocol completed all ten debates. Five failed inventory gates and the final model-free development result provide no authorized or causally supported path to independent judgments, scoring, policy promotion, publication, or production mutation.",
  },
  authorization: {
    successorProtocolDevelopment: false,
    successorPreparation: false,
    successorExecutionManifest: false,
    successorModelExecution: false,
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
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: "none-without-new-explicit-user-authorization",
};

if (shouldWrite) {
  await writeFile(path.resolve(OUTPUT), jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      inventoryGatesAttempted: analysis.inventoryCampaign.gatesAttempted,
      completeTenDebateInventoryGatesPassed:
        analysis.inventoryCampaign.completeTenDebateGatesPassed,
      inventoryContextsExecuted:
        analysis.executionBoundary.inventoryContextsExecuted,
      locallyValidIntermediateContexts:
        analysis.inventoryCampaign.locallyValidIntermediateContexts,
      invalidContexts: analysis.inventoryCampaign.invalidContexts,
      quarantinedArtifactFiles: analysis.artifactQuarantine.files,
      independentJudgmentContextsExecuted: 0,
      scoresDerived: 0,
      closureModelContextsExecuted: 0,
      meteredApiCostUsd: 0,
      proposedPolicyPromoted: false,
      nextAuthorized: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
