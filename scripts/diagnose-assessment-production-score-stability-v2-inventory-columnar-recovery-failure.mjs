#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery";
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const PROPOSAL = `${ROOT}/inventory-proposals/debate-31.json`;
const TRANSPORT = `${ROOT}/candidate-transport/debate-31.json`;
const OUTPUT = `${ROOT}/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2-inventory-columnar-recovery-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-columnar-recovery-failure-diagnosis.mjs";
const DUPLICATE_ID = "chunk-002:chunk-002-candidate-09";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; diagnosis is immutable`);
}

const [manifestBytes, executionBytes, preparationBytes, proposalBytes, transportBytes] =
  await Promise.all([
    readFile(MANIFEST),
    readFile(EXECUTION),
    readFile(PREPARATION),
    readFile(PROPOSAL),
    readFile(TRANSPORT),
  ]);
const manifest = JSON.parse(manifestBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const proposal = JSON.parse(proposalBytes);
const transport = JSON.parse(transportBytes);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `manifest source hash drift: ${file}`);
}
assertV4(
  manifest.status ===
      "frozen-ten-fresh-columnar-v2-validation-score-blind-inventory-recovery-contexts-authorized" &&
    manifest.model?.label === "5.6 Sol" &&
    manifest.model?.slug === "gpt-5.6-sol" &&
    manifest.model?.reasoningEffort === "low" &&
    manifest.model?.authentication === "ChatGPT subscription" &&
    manifest.executionPolicy?.attemptsPerContext === 1 &&
    manifest.executionPolicy?.retriesMaximum === 0 &&
    manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
    manifest.executionPolicy?.timeoutExtensionApplied === false &&
    manifest.priorFailedGateEvidence?.preservedAsFailed === true &&
    manifest.priorFailedGateEvidence
      ?.priorValidOutputsReusableForSuccessorAcceptance === false,
  "frozen recovery manifest boundary drifted"
);
assertV4(
  execution.status ===
      "v2-validation-score-blind-inventory-columnar-recovery-complete-with-failure" &&
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
    execution.scoresDerived === 0 &&
    execution.currentCanaryReclassified === false &&
    execution.proposedPolicyPromoted === false,
  "recovery failure ledger drifted"
);

const failureRecords = execution.results.filter((result) => !result.accepted);
assertV4(failureRecords.length === 1, "exactly one recovery failure is required");
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
    failure.validationMessage?.includes("selected candidate IDs: duplicate values"),
  "Debate 31 failure boundary drifted"
);

const selections = proposal.sectionSelections.flatMap((section, sectionIndex) =>
  ["proSelections", "conSelections"].flatMap((selectionKey) =>
    section[selectionKey].map((selection, selectionIndex) => ({
      sectionIndex,
      sectionId: section.sectionId,
      selectionKey,
      selectionIndex,
      qualifiedCandidateId: selection.qualifiedCandidateId,
      moveId: selection.moveId,
      moveKind: selection.moveKind,
      proposition: selection.proposition,
    }))
  )
);
const counts = new Map();
for (const selection of selections) {
  counts.set(
    selection.qualifiedCandidateId,
    (counts.get(selection.qualifiedCandidateId) ?? 0) + 1
  );
}
const duplicateIds = [...counts.entries()]
  .filter(([, count]) => count > 1)
  .map(([candidateId]) => candidateId);
assertV4(
  duplicateIds.length === 1 && duplicateIds[0] === DUPLICATE_ID,
  "unexpected duplicate candidate set"
);
const duplicateSelections = selections.filter(
  (selection) => selection.qualifiedCandidateId === DUPLICATE_ID
);
assertV4(
  duplicateSelections.length === 2 &&
    duplicateSelections[0].sectionId === "section-historical-data" &&
    duplicateSelections[1].sectionId === "section-naturalistic-alternatives" &&
    duplicateSelections.every(
      (selection) => selection.selectionKey === "conSelections"
    ) &&
    proposal.audit?.everySelectedCandidateUsedOnce === true,
  "duplicate-selection or self-audit evidence drifted"
);

const idColumn = transport.columnOrder.indexOf("qualifiedCandidateId");
assertV4(idColumn >= 0, "qualified candidate ID column is unavailable");
const transportOccurrences = transport.candidateRows.filter(
  (row) => row[idColumn] === DUPLICATE_ID
).length;
assertV4(
  transportOccurrences === 1 &&
    transport.candidateRows.length === 20 &&
    preparation.transport?.parsedRoundTripIdentityVerified === true,
  "lossless transport evidence drifted"
);

const sourceFiles = [
  MANIFEST,
  EXECUTION,
  PREPARATION,
  PROPOSAL,
  TRANSPORT,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-columnar-recovery-stage.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2-columnar-inventory-recovery-failure-diagnosis",
  protocolId: manifest.protocolId,
  status:
    "recovery-inventory-gate-failed-cross-section-duplicate-confirmed-no-further-action-authorized",
  diagnosedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    recoveryExecution: EXECUTION,
    recoveryExecutionSha256: sha256(executionBytes),
    status: execution.status,
    contextsPlanned: 10,
    contextsAttempted: 3,
    contextsUnattempted: 7,
    validContexts: 2,
    invalidContexts: 1,
    retries: 0,
    acceptedAsPassed: false,
    priorTimeoutGatePreservedFailed: true,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  failure: {
    contextIndex: failure.contextIndex,
    debateNumber: failure.debateNumber,
    status: failure.status,
    classification:
      "schema-shaped-output-with-cross-section-duplicate-candidate-id",
    modelTransportSucceeded: true,
    timedOut: false,
    proposalPreserved: PROPOSAL,
    proposalSha256: sha256(proposalBytes),
    deterministicValidationPassed: false,
    deterministicValidationMessage:
      "selected candidate IDs: duplicate values",
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  duplicateEvidence: {
    qualifiedCandidateId: DUPLICATE_ID,
    modelSelectionOccurrences: duplicateSelections.length,
    transportOccurrences,
    selections: duplicateSelections,
    modelAuditClaimedEverySelectedCandidateUsedOnce:
      proposal.audit.everySelectedCandidateUsedOnce,
    auditContradictedByOutput: true,
  },
  designFinding: {
    columnarTransportIntroducedDuplicate: false,
    candidatePresentExactlyOnceInLosslessTransport: true,
    promptProhibitedCandidateReuse: true,
    closedSchemaEnforcedCandidateIdMembership: true,
    closedSchemaEnforcedCrossSectionCandidateUniqueness: false,
    deterministicCompilerCorrectlyRejectedDuplicate: true,
    removingEitherSelectionWouldBeSemanticRepair: true,
    automaticDeduplicationPermitted: false,
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "A separately authorized protocol could make candidate identity the unique object key of a property-keyed selection map, then deterministically project that map into section selections.",
    requirements: [
      "new versioned output schema and compiler",
      "retired-artifact regression before any fresh evidence",
      "new frozen execution manifest",
      "full fresh ten-context gate",
      "no reuse of outputs from either failed gate",
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

if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, jsonBytes(diagnosis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      gateDisposition: diagnosis.gateDisposition,
      failure: diagnosis.failure,
      duplicateEvidence: diagnosis.duplicateEvidence,
      modelContextsThisDiagnosis: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
