#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  auditEndpointCompatibleStrictSchema,
  buildUniqueSelectionMapSchema,
  compileUniqueSelectionMapInventory,
  convertLegacyProposalToUniqueSelectionMap,
} from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ORIGINAL_ROOT = `${VALIDATION_ROOT}/inventory`;
const RECOVERY_ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const ROOT = `${VALIDATION_ROOT}/inventory-unique-selection-map-development`;
const GUIDE = `${ROOT}/unique-selection-map-guide.md`;
const OUTPUT = `${ROOT}/development-analysis.json`;
const RECOVERY_PREPARATION = `${RECOVERY_ROOT}/preparation-manifest.json`;
const FAILURE_DIAGNOSIS = `${RECOVERY_ROOT}/failure-diagnosis.json`;
const COLUMNAR_GUIDE = `${RECOVERY_ROOT}/columnar-transport-guide.md`;
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2-inventory-unique-selection-map.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-unique-selection-map-development.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; development is immutable`);
}

const [
  recoveryPreparationBytes,
  failureDiagnosisBytes,
  columnarGuideBytes,
  guideBytes,
] = await Promise.all([
  readFile(RECOVERY_PREPARATION),
  readFile(FAILURE_DIAGNOSIS),
  readFile(COLUMNAR_GUIDE),
  readFile(GUIDE),
]);
const recoveryPreparation = JSON.parse(recoveryPreparationBytes);
const failureDiagnosis = JSON.parse(failureDiagnosisBytes);
assertV4(
  recoveryPreparation.status ===
      "ten-fresh-columnar-v2-validation-inventory-contexts-prepared" &&
    recoveryPreparation.transport?.parsedRoundTripIdentityVerified === true &&
    recoveryPreparation.priorGateDisposition?.preservedAsFailed === true &&
    failureDiagnosis.status ===
      "recovery-inventory-gate-failed-cross-section-duplicate-confirmed-no-further-action-authorized" &&
    failureDiagnosis.failure?.debateNumber === "31" &&
    failureDiagnosis.duplicateEvidence?.modelSelectionOccurrences === 2 &&
    failureDiagnosis.duplicateEvidence?.transportOccurrences === 1 &&
    failureDiagnosis.gateDisposition?.acceptedAsPassed === false,
  "failed-gate evidence is unavailable"
);

const [manualBytes] = await Promise.all([
  readFile(recoveryPreparation.inputs.manual),
]);
const contextsByDebate = new Map(
  recoveryPreparation.contexts.map((context) => [context.debateNumber, context])
);
const schemaRecords = [];
const schemaWrites = [];
for (const context of recoveryPreparation.contexts) {
  const [legacySchemaBytes, transportBytes, packetBytes] = await Promise.all([
    readFile(context.schema),
    readFile(context.modelCandidateTransport),
    readFile(context.packet),
  ]);
  const legacySchema = JSON.parse(legacySchemaBytes);
  const candidateTransport = JSON.parse(transportBytes);
  const schema = buildUniqueSelectionMapSchema({
    legacySchema,
    candidateTransport,
  });
  const schemaAudit = auditEndpointCompatibleStrictSchema(schema);
  assertV4(
    schemaAudit.nullableCandidateProperties === context.candidates,
    `${context.debateNumber}: candidate property count drifted`
  );
  const schemaBytes = compactBytes(schema);
  assertV4(
    !schemaBytes.includes(Buffer.from('"uniqueItems"')),
    `${context.debateNumber}: unsupported uniqueItems returned`
  );
  const schemaPath = `${ROOT}/schemas/debate-${context.debateNumber}.schema.json`;
  const copiedInputBytes =
    manualBytes.length +
    columnarGuideBytes.length +
    guideBytes.length +
    packetBytes.length +
    transportBytes.length +
    schemaBytes.length;
  assertV4(
    copiedInputBytes <= 115000,
    `${context.debateNumber}: unique-map input exceeds proven ceiling`
  );
  schemaWrites.push({ file: schemaPath, bytes: schemaBytes });
  schemaRecords.push({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    endpointStrictObjectsAudited: schemaAudit.objectsAudited,
    nullableCandidateProperties: schemaAudit.nullableCandidateProperties,
    totalObjectProperties: schemaAudit.totalObjectProperties,
    maximumSchemaTreeDepth: schemaAudit.maximumSchemaTreeDepth,
    totalSchemaStringCharacters: schemaAudit.totalSchemaStringCharacters,
    allCandidatePropertiesRequired: true,
    additionalCandidatePropertiesRejected: true,
    candidateIdentityStructurallyUnique: true,
  });
}

const datasets = [
  {
    label: "predecessor-timeout-gate",
    execution: `${ORIGINAL_ROOT}/model-execution.json`,
    preparation: `${ORIGINAL_ROOT}/preparation-manifest.json`,
  },
  {
    label: "columnar-recovery-gate",
    execution: `${RECOVERY_ROOT}/model-execution.json`,
    preparation: RECOVERY_PREPARATION,
  },
];
const regressionRecords = [];
const regressionSourceFiles = [];
for (const dataset of datasets) {
  const [executionBytes, preparationBytes] = await Promise.all([
    readFile(dataset.execution),
    readFile(dataset.preparation),
  ]);
  const execution = JSON.parse(executionBytes);
  const preparation = JSON.parse(preparationBytes);
  regressionSourceFiles.push(dataset.execution, dataset.preparation);
  for (const result of execution.results.filter((item) => item.accepted)) {
    const legacyContext = preparation.contexts[result.contextIndex];
    const recoveryContext = contextsByDebate.get(result.debateNumber);
    assertV4(legacyContext && recoveryContext, `${result.debateNumber}: context unavailable`);
    const [
      proposalBytes,
      expectedLockedBytes,
      legacySchemaBytes,
      transportBytes,
      evidenceBundleBytes,
      eventsBytes,
    ] = await Promise.all([
      readFile(legacyContext.proposalOutput),
      readFile(legacyContext.lockedInventoryOutput),
      readFile(recoveryContext.schema),
      readFile(recoveryContext.modelCandidateTransport),
      readFile(recoveryContext.validatorCandidateEvidenceBundle),
      readFile(recoveryContext.originalEvents),
    ]);
    const legacyProposal = JSON.parse(proposalBytes);
    const expectedLockedInventory = JSON.parse(expectedLockedBytes);
    const legacySchema = JSON.parse(legacySchemaBytes);
    const candidateTransport = JSON.parse(transportBytes);
    const uniqueProposal = convertLegacyProposalToUniqueSelectionMap({
      legacyProposal,
      candidateTransport,
    });
    const compiled = compileUniqueSelectionMapInventory({
      proposal: uniqueProposal,
      candidateTransport,
      legacySchema,
      evidenceBundle: JSON.parse(evidenceBundleBytes),
      eventsDocument: JSON.parse(eventsBytes),
    });
    assertV4(
      isDeepStrictEqual(compiled.projectedProposal, legacyProposal),
      `${dataset.label}/${result.debateNumber}: proposal round-trip drifted`
    );
    assertV4(
      isDeepStrictEqual(compiled.lockedInventory, expectedLockedInventory),
      `${dataset.label}/${result.debateNumber}: locked inventory drifted`
    );
    regressionRecords.push({
      dataset: dataset.label,
      debateNumber: result.debateNumber,
      proposal: legacyContext.proposalOutput,
      proposalSha256: sha256(proposalBytes),
      selectedCandidates: Object.values(uniqueProposal.candidateSelections).filter(
        (selection) => selection !== null
      ).length,
      exactLegacyProposalRoundTrip: true,
      lockedInventoryCanonicallyIdentical: true,
      uniqueProposalSha256: sha256(jsonBytes(uniqueProposal)),
    });
    regressionSourceFiles.push(
      legacyContext.proposalOutput,
      legacyContext.lockedInventoryOutput,
      recoveryContext.schema,
      recoveryContext.modelCandidateTransport,
      recoveryContext.validatorCandidateEvidenceBundle,
      recoveryContext.originalEvents
    );
  }
}
assertV4(
  regressionRecords.length === 11 &&
    regressionRecords.every(
      (record) =>
        record.exactLegacyProposalRoundTrip &&
        record.lockedInventoryCanonicallyIdentical
    ),
  "accepted-artifact regression coverage drifted"
);

const failedProposalBytes = await readFile(
  `${RECOVERY_ROOT}/inventory-proposals/debate-31.json`
);
let duplicateRejected = false;
let duplicateMessage = null;
try {
  convertLegacyProposalToUniqueSelectionMap({
    legacyProposal: JSON.parse(failedProposalBytes),
    candidateTransport: JSON.parse(
      await readFile(contextsByDebate.get("31").modelCandidateTransport)
    ),
  });
} catch (error) {
  duplicateMessage = error.message;
  duplicateRejected = duplicateMessage.includes(
    "duplicate candidate IDs: chunk-002:chunk-002-candidate-09"
  );
}
assertV4(duplicateRejected, "failed Debate 31 duplicate was not rejected");

const sourceFiles = [
  RECOVERY_PREPARATION,
  FAILURE_DIAGNOSIS,
  COLUMNAR_GUIDE,
  GUIDE,
  recoveryPreparation.inputs.manual,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  LIBRARY,
  SCRIPT,
  TEST,
  `${RECOVERY_ROOT}/inventory-proposals/debate-31.json`,
  ...recoveryPreparation.contexts.flatMap((context) => [
    context.packet,
    context.modelCandidateTransport,
    context.validatorCandidateEvidenceBundle,
    context.originalEvents,
    context.schema,
  ]),
  ...regressionSourceFiles,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2-inventory-unique-selection-map-development-analysis",
  protocolId: "assessment-production-score-stability-v2-inventory-unique-selection-map-development",
  status:
    "unique-selection-map-retired-regression-passed-successor-preparation-authorized",
  developedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: {
    predecessorTimeoutGatePreservedFailed: true,
    columnarRecoveryGatePreservedFailed: true,
    recoveryAcceptedAsPassed: false,
    recoveryRetryPerformed: false,
    recoverySemanticCorrectionPerformed: false,
    recoveryValidOutputsReusableForSuccessorAcceptance: false,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
  },
  design: {
    representation:
      "required nullable property per qualified candidate ID",
    everyCandidateKeyRequired: true,
    unselectedCandidateValue: null,
    selectedCandidateValueFields: [
      "sectionId",
      "orderWithinSide",
      "moveId",
      "moveKind",
      "proposition",
    ],
    candidateIdentityEncodedOnlyByUniqueObjectPropertyName: true,
    duplicateCandidateSelectionRepresentable: false,
    unsupportedUniqueItemsUsed: false,
    candidateMembershipClosedBySchema: true,
    sectionBalanceAndChronologyRemainDeterministicallyValidated: true,
    semanticCandidateDownselectionPerformed: false,
    structuredOutputsLimitEvidence: {
      source:
        "https://developers.openai.com/api/docs/guides/structured-outputs#objects-have-limitations-on-nesting-depth-and-size",
      checkedAt: "2026-08-09",
      objectPropertiesMaximum: 5000,
      nestingLevelsMaximum: 10,
      schemaStringCharactersMaximum: 120000,
      everyGeneratedSchemaWithinLimits: true,
    },
  },
  schemas: schemaRecords,
  regression: {
    datasets: datasets.map((dataset) => dataset.label),
    acceptedArtifactsTested: regressionRecords.length,
    records: regressionRecords,
    exactLegacyProposalRoundTrips: regressionRecords.length,
    lockedInventoriesCanonicallyIdentical: regressionRecords.length,
    failedDebate31DuplicateRejectedBeforeProjection: duplicateRejected,
    failedDebate31DuplicateMessage: duplicateMessage,
    freshModelEvidenceUsed: false,
  },
  transport: {
    manual: recoveryPreparation.inputs.manual,
    columnarTransportGuide: COLUMNAR_GUIDE,
    uniqueSelectionMapGuide: GUIDE,
    minimumCopiedInputBytes: Math.min(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    maximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    provenCeilingBytes: 115000,
    everyContextWithinCeiling: true,
  },
  sourceHashes,
  totals: {
    debates: schemaRecords.length,
    candidates: recoveryPreparation.totals.candidates,
    acceptedRetiredOutputsReplayed: regressionRecords.length,
    modelContextsExecuted: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    successorPreparation: true,
    successorExecutionManifest: false,
    successorModelExecution: false,
    retry: false,
    semanticCorrection: false,
    priorOutputReuseForSuccessorAcceptance: false,
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
};

if (shouldWrite) {
  for (const { file, bytes } of schemaWrites) {
    assertV4(!(await exists(file)), `${file} already exists; schemas are immutable`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(OUTPUT, jsonBytes(analysis));
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      debates: analysis.totals.debates,
      candidates: analysis.totals.candidates,
      acceptedRetiredOutputsReplayed:
        analysis.totals.acceptedRetiredOutputsReplayed,
      failedDebate31DuplicateRejected:
        analysis.regression.failedDebate31DuplicateRejectedBeforeProjection,
      maximumCopiedInputBytes: analysis.transport.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
      successorModelExecutionAuthorized: false,
    },
    null,
    2
  )
);
