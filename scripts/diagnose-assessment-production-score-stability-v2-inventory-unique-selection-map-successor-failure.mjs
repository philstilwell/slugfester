#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-unique-selection-map-successor";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const PROPOSAL = `${ROOT}/inventory-proposals/debate-31.json`;
const TRANSPORT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/candidate-transport/debate-31.json";
const SCHEMA =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-unique-selection-map-development/schemas/debate-31.schema.json";
const OUTPUT = `${ROOT}/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2-inventory-unique-selection-map-successor-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-unique-selection-map-successor-failure-diagnosis.mjs";
const INVALID_SECTION = "section-naturalistic-alternatives";
const CON_LABELED_PRO_CANDIDATE = "chunk-002:chunk-002-candidate-10";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; diagnosis is immutable`);
}

const [
  manifestBytes,
  executionBytes,
  preparationBytes,
  proposalBytes,
  transportBytes,
  schemaBytes,
] = await Promise.all([
  readFile(MANIFEST),
  readFile(EXECUTION),
  readFile(PREPARATION),
  readFile(PROPOSAL),
  readFile(TRANSPORT),
  readFile(SCHEMA),
]);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const proposal = JSON.parse(proposalBytes);
const transport = JSON.parse(transportBytes);
const schema = JSON.parse(schemaBytes);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `manifest source hash drift: ${file}`
  );
}
assertV4(
  manifest.status ===
      "frozen-ten-fresh-unique-selection-map-v2-validation-score-blind-inventory-successor-contexts-authorized" &&
    manifest.model?.label === "5.6 Sol" &&
    manifest.model?.slug === "gpt-5.6-sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 &&
    manifest.executionPolicy?.retriesMaximum === 0 &&
    manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
    manifest.executionPolicy?.timeoutExtensionApplied === false &&
    manifest.priorFailedGateEvidence?.bothGatesPreservedAsFailed === true &&
    manifest.priorFailedGateEvidence
      ?.priorValidOutputsReusableForSuccessorAcceptance === false &&
    manifest.selectionTopology?.candidateIdentityStructurallyUnique === true &&
    manifest.selectionTopology?.duplicateCandidateSelectionRepresentable ===
      false,
  "frozen successor manifest boundary drifted"
);
assertV4(
  execution.status ===
      "v2-validation-score-blind-inventory-unique-selection-map-successor-complete-with-failure" &&
    execution.contextsPlanned === 10 &&
    execution.contextsAttempted === 3 &&
    execution.contextsUnattempted === 7 &&
    execution.validContexts === 2 &&
    execution.invalidContexts === 1 &&
    execution.attempts === 3 &&
    execution.retries === 0 &&
    execution.rampPassed === false &&
    execution.rampPhases?.length === 2 &&
    execution.rampPhases[0]?.passed === true &&
    execution.rampPhases[1]?.passed === false &&
    execution.authorization?.failureDiagnosis === true &&
    execution.authorization?.deterministicPassingAnalysis === false &&
    execution.authorization?.independentJudgmentPacketPreparation === false &&
    execution.scoresDerived === 0,
  "successor failure ledger drifted"
);

const failureRecords = execution.results.filter((result) => !result.accepted);
assertV4(failureRecords.length === 1, "exactly one successor failure is required");
const failure = failureRecords[0];
assertV4(
  failure.debateNumber === "31" &&
    failure.contextIndex === 2 &&
    failure.status === "output-validation-failed" &&
    failure.attemptCount === 1 &&
    failure.retryCount === 0 &&
    failure.timedOut === false &&
    failure.commandExitCode === 0 &&
    failure.terminationSignal === null &&
    failure.proposalWritten === true &&
    failure.proposalSha256 === sha256(proposalBytes) &&
    failure.validationMessage?.includes(
      `${INVALID_SECTION}/proSelections: requires unique positions for one or two selections`
    ),
  "Debate 31 successor failure boundary drifted"
);

const idIndex = transport.columnOrder.indexOf("qualifiedCandidateId");
const sideIndex = transport.columnOrder.indexOf("side");
assertV4(idIndex >= 0 && sideIndex >= 0, "candidate identity or side column missing");
const candidates = transport.candidateRows.map((row) => ({
  qualifiedCandidateId: row[idIndex],
  side: row[sideIndex],
}));
const sideByCandidate = new Map(
  candidates.map((candidate) => [candidate.qualifiedCandidateId, candidate.side])
);
const expectedCandidateIds = candidates.map(
  (candidate) => candidate.qualifiedCandidateId
);
assertV4(
  expectedCandidateIds.length === 20 &&
    Object.keys(proposal.candidateSelections).length === 20 &&
    expectedCandidateIds.every((candidateId) =>
      Object.hasOwn(proposal.candidateSelections, candidateId)
    ),
  "candidate selection map does not preserve every candidate key"
);

const selected = expectedCandidateIds
  .filter((candidateId) => proposal.candidateSelections[candidateId] !== null)
  .map((candidateId) => ({
    candidateId,
    side: sideByCandidate.get(candidateId),
    ...proposal.candidateSelections[candidateId],
  }));
const grouped = new Map();
for (const selection of selected) {
  const key = `${selection.sectionId}/${selection.side}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(selection);
}
const invalidGroups = [...grouped.entries()]
  .map(([key, selections]) => ({
    key,
    sectionId: selections[0].sectionId,
    side: selections[0].side,
    count: selections.length,
    positions: selections.map((selection) => selection.orderWithinSide),
    uniquePositions: new Set(
      selections.map((selection) => selection.orderWithinSide)
    ).size,
    selections,
  }))
  .filter(
    (group) =>
      group.count < 1 ||
      group.count > 2 ||
      group.uniquePositions !== group.count
  );
assertV4(
  invalidGroups.length === 1 &&
    invalidGroups[0].sectionId === INVALID_SECTION &&
    invalidGroups[0].side === "pro" &&
    invalidGroups[0].count === 3 &&
    JSON.stringify(invalidGroups[0].positions) === JSON.stringify([1, 2, 2]) &&
    invalidGroups[0].selections.some(
      (selection) =>
        selection.candidateId === CON_LABELED_PRO_CANDIDATE &&
        selection.side === "pro" &&
        selection.moveId === "move-con-tradition-dating"
    ),
  "unexpected section-side cardinality or position failure"
);
const invalidGroup = invalidGroups[0];

const candidateSelectionSchema = schema.properties?.candidateSelections;
assertV4(
  candidateSelectionSchema?.additionalProperties === false &&
    candidateSelectionSchema.required.length === 20 &&
    Object.keys(candidateSelectionSchema.properties).length === 20 &&
    !schemaBytes.includes(Buffer.from('"uniqueItems"')) &&
    schema.$defs?.candidateSelection?.properties?.orderWithinSide?.minimum ===
      1 &&
    schema.$defs?.candidateSelection?.properties?.orderWithinSide?.maximum ===
      2,
  "unique selection schema boundary drifted"
);

const sourceFiles = [
  MANIFEST,
  EXECUTION,
  PREPARATION,
  PROPOSAL,
  TRANSPORT,
  SCHEMA,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-unique-selection-map-successor-stage.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2-unique-selection-map-inventory-successor-failure-diagnosis",
  protocolId: manifest.protocolId,
  status:
    "unique-selection-map-successor-gate-failed-section-side-cardinality-confirmed-no-further-action-authorized",
  diagnosedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    successorExecution: EXECUTION,
    successorExecutionSha256: sha256(executionBytes),
    status: execution.status,
    contextsPlanned: 10,
    contextsAttempted: 3,
    contextsUnattempted: 7,
    validContexts: 2,
    invalidContexts: 1,
    retries: 0,
    acceptedAsPassed: false,
    predecessorTimeoutGatePreservedFailed: true,
    columnarRecoveryGatePreservedFailed: true,
    uniqueSelectionSuccessorGatePreservedFailed: true,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  failure: {
    contextIndex: failure.contextIndex,
    debateNumber: failure.debateNumber,
    status: failure.status,
    classification:
      "schema-conforming-candidate-unique-map-with-pro-side-overselection-and-position-collision",
    modelTransportSucceeded: true,
    timedOut: false,
    proposalPreserved: PROPOSAL,
    proposalSha256: sha256(proposalBytes),
    deterministicValidationPassed: false,
    deterministicValidationMessage:
      `${INVALID_SECTION}/proSelections: requires unique positions for one or two selections`,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  sectionSideEvidence: {
    sectionId: invalidGroup.sectionId,
    side: invalidGroup.side,
    selectedCount: invalidGroup.count,
    allowedSelectedCount: [1, 2],
    orderWithinSideValues: invalidGroup.positions,
    uniqueOrderWithinSideValues: invalidGroup.uniquePositions,
    selections: invalidGroup.selections,
    repositorySideOfConLabeledCandidate: sideByCandidate.get(
      CON_LABELED_PRO_CANDIDATE
    ),
    modelMoveIdForConLabeledCandidate:
      proposal.candidateSelections[CON_LABELED_PRO_CANDIDATE].moveId,
    modelAuditClaimedEverySelectedCandidateUsedOnce:
      proposal.audit.everySelectedCandidateUsedOnce,
    candidateIdentityAuditAccurate: true,
  },
  designFinding: {
    uniqueSelectionMapPreventedDuplicateCandidateIdentity: true,
    everyCandidateKeyPresentExactlyOnce: true,
    duplicateCandidateSelectionRepresentable: false,
    candidateSideAvailableInLosslessTransport: true,
    flatCandidatePropertyTopologyEncodedCandidateSide: false,
    schemaRestrictedEachOrderValueToOneOrTwo: true,
    schemaEnforcedSectionSideCardinalityAcrossCandidateProperties: false,
    schemaEnforcedUniqueOrderAcrossCandidateProperties: false,
    deterministicProjectionCorrectlyRestoredCandidateSide: true,
    deterministicProjectionCorrectlyRejectedInvalidGroup: true,
    changingOnlyTheRepeatedOrderWouldStillLeaveThreeProSelections: true,
    removingOrRelocatingASelectionWouldBeSemanticRepair: true,
    automaticRepairPermitted: false,
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "A separately authorized development stage would need to expose repository-owned candidate side in the output topology, remove model-authored within-side ordering where repository chronology can derive it, and prove section-side cardinality behavior without weakening the one-or-two-per-side rule.",
    requirements: [
      "new versioned output contract and deterministic projection",
      "model-free retired-artifact regression before any fresh evidence",
      "proof that duplicate candidate identity remains unrepresentable",
      "proof that invalid section-side cardinality cannot pass deterministic acceptance",
      "new frozen full-ten execution manifest",
      "no reuse of outputs from any failed gate",
      "one attempt per context and no retry",
      "explicit user authorization",
    ],
  },
  sourceHashes,
  totals: {
    modelContextsThisDiagnosis: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    retry: false,
    semanticCorrection: false,
    successorProtocolDevelopment: false,
    successorModelExecution: false,
    deterministicPassingAnalysis: false,
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
  nextAuthorizedAction: "none-without-explicit-user-authorization",
};

if (shouldWrite) await writeFile(OUTPUT, jsonBytes(diagnosis));
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      gateDisposition: diagnosis.gateDisposition,
      failure: diagnosis.failure,
      sectionSideEvidence: diagnosis.sectionSideEvidence,
      modelContextsThisDiagnosis: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
