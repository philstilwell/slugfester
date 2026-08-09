#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ORIGINAL_ROOT = `${VALIDATION_ROOT}/inventory`;
const ROOT = `${VALIDATION_ROOT}/inventory-columnar-recovery`;
const DIAGNOSIS = `${ROOT}/timeout-diagnosis.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const GUIDE = `${ROOT}/columnar-transport-guide.md`;
const ORIGINAL_PREPARATION = `${ORIGINAL_ROOT}/preparation-manifest.json`;
const ORIGINAL_MANIFEST = `${ORIGINAL_ROOT}/execution-manifest.json`;
const ORIGINAL_EXECUTION = `${ORIGINAL_ROOT}/model-execution.json`;
const MANUAL =
  "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2-inventory-columnar-recovery.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-columnar-recovery-preparation.mjs";
const PROTOCOL_ID =
  "assessment-production-score-stability-v2-fresh-validation-columnar-inventory-recovery";
const COLUMN_ORDER = Object.freeze([
  "qualifiedCandidateId",
  "side",
  "speaker",
  "discoveryMoveKindAdvisory",
  "proposedProposition",
  "sourceSpan.startEvent",
  "sourceSpan.endEvent",
  "loadBearingLevel",
  "loadBearingReason",
  "responseIntent.kind",
  "responseIntent.earlierTargetDescription",
  "contextSummary",
  "candidateEvidence.excerpt",
  "candidateEvidence.sourceExact",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const getPath = (value, dottedPath) =>
  dottedPath.split(".").reduce((current, key) => current[key], value);
function setPath(value, dottedPath, fieldValue) {
  const keys = dottedPath.split(".");
  let current = value;
  for (let index = 0; index < keys.length - 1; index += 1) {
    current[keys[index]] ??= {};
    current = current[keys[index]];
  }
  current[keys.at(-1)] = fieldValue;
}
function buildColumnarTransport(source) {
  return {
    schemaVersion: "1.0-lossless-columnar-candidate-evidence-transport",
    sourceSchemaVersion: source.schemaVersion,
    protocolId: source.protocolId,
    debateNumber: source.debateNumber,
    debateId: source.debateId,
    candidateCount: source.candidateCount,
    completeSourceDiscovery: structuredClone(source.completeSourceDiscovery),
    transportPolicy: structuredClone(source.transportPolicy),
    columnOrder: [...COLUMN_ORDER],
    candidateRows: source.candidates.map((candidate) =>
      COLUMN_ORDER.map((field) => getPath(candidate, field))
    ),
  };
}
function decodeColumnarTransport(columnar) {
  assertV4(
    JSON.stringify(columnar.columnOrder) === JSON.stringify(COLUMN_ORDER),
    `${columnar.debateNumber}: column order drifted`
  );
  return {
    schemaVersion: columnar.sourceSchemaVersion,
    protocolId: columnar.protocolId,
    debateNumber: columnar.debateNumber,
    debateId: columnar.debateId,
    candidateCount: columnar.candidateCount,
    completeSourceDiscovery: structuredClone(columnar.completeSourceDiscovery),
    candidates: columnar.candidateRows.map((row) => {
      assertV4(
        row.length === COLUMN_ORDER.length,
        `${columnar.debateNumber}: invalid columnar row width`
      );
      const candidate = {};
      COLUMN_ORDER.forEach((field, index) => setPath(candidate, field, row[index]));
      return candidate;
    }),
    transportPolicy: structuredClone(columnar.transportPolicy),
  };
}

async function mustNotExist(file) {
  assertV4(
    !(await access(file).then(() => true, () => false)),
    `${file} already exists; recovery preparation is immutable`
  );
}

const [diagnosisBytes, originalPreparationBytes, originalManifestBytes, originalExecutionBytes, manualBytes, guideBytes] =
  await Promise.all([
    readFile(DIAGNOSIS),
    readFile(ORIGINAL_PREPARATION),
    readFile(ORIGINAL_MANIFEST),
    readFile(ORIGINAL_EXECUTION),
    readFile(MANUAL),
    readFile(GUIDE),
  ]);
const diagnosis = JSON.parse(diagnosisBytes);
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalManifest = JSON.parse(originalManifestBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
assertV4(
  diagnosis.status ===
      "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized" &&
    diagnosis.authorization?.columnarRecoveryTransportPreparation === true &&
    diagnosis.authorization?.recoveryModelExecution === false &&
    diagnosis.requiredSuccessorDesign?.fullTenContextFreshExecution === true &&
    diagnosis.requiredSuccessorDesign?.priorNineValidOutputsReusableForSuccessorAcceptance === false &&
    diagnosis.requiredSuccessorDesign?.samePerContextTimeoutMs === 600000,
  "timeout diagnosis does not authorize columnar recovery preparation"
);
assertV4(
  originalExecution.status ===
      "v2-validation-score-blind-inventory-complete-with-failure" &&
    originalExecution.validContexts === 9 &&
    originalExecution.invalidContexts === 1 &&
    originalExecution.retries === 0 &&
    originalExecution.authorization?.independentJudgmentPacketPreparation === false,
  "original failed gate drifted"
);
assertV4(
  originalManifest.model?.label === "5.6 Sol" &&
    originalManifest.model?.slug === "gpt-5.6-sol" &&
    originalManifest.model?.reasoningEffort === "low" &&
    originalManifest.model?.authentication === "ChatGPT subscription",
  "model boundary drifted"
);
if (shouldWrite) await mustNotExist(PREPARATION);

const contexts = [];
const pendingWrites = [];
for (const original of originalPreparation.contexts) {
  const sourceBytes = await readFile(original.modelCandidateTransport);
  const source = JSON.parse(sourceBytes);
  const columnar = buildColumnarTransport(source);
  assertV4(
    isDeepStrictEqual(decodeColumnarTransport(columnar), source),
    `${original.debateNumber}: columnar round-trip changed candidate semantics`
  );
  const columnarBytes = compactBytes(columnar);
  const columnarPath = `${ROOT}/candidate-transport/debate-${original.debateNumber}.json`;
  if (shouldWrite) await mustNotExist(columnarPath);
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(original.packet),
    readFile(original.schema),
  ]);
  const copiedInputBytes =
    manualBytes.length +
    guideBytes.length +
    packetBytes.length +
    columnarBytes.length +
    schemaBytes.length;
  const {
    prettyCopiedInputBytes: _priorPrettyCopiedInputBytes,
    compactSerializationSavingsBytes: _priorCompactSerializationSavingsBytes,
    ...originalContext
  } = structuredClone(original);
  pendingWrites.push({ file: columnarPath, bytes: columnarBytes });
  contexts.push({
    ...originalContext,
    priorModelCandidateTransport: original.modelCandidateTransport,
    priorModelCandidateTransportSha256: original.modelCandidateTransportSha256,
    modelCandidateTransport: columnarPath,
    modelCandidateTransportSha256: sha256(columnarBytes),
    originalModelTransportBytes: sourceBytes.length,
    modelTransportBytes: columnarBytes.length,
    columnarSavingsBytes: sourceBytes.length - columnarBytes.length,
    columnarSavingsFraction: Number(
      ((sourceBytes.length - columnarBytes.length) / sourceBytes.length).toFixed(4)
    ),
    copiedInputBytes,
    proposalOutput: `${ROOT}/inventory-proposals/debate-${original.debateNumber}.json`,
    lockedInventoryOutput: `${ROOT}/locked-inventories/debate-${original.debateNumber}.json`,
    validationOutput: `${ROOT}/validations/debate-${original.debateNumber}.json`,
    provenanceOutput: `${ROOT}/provenance/debate-${original.debateNumber}.json`,
  });
}
assertV4(
  contexts.length === 10 &&
    contexts.reduce((sum, context) => sum + context.candidates, 0) === 406 &&
    contexts.reduce((sum, context) => sum + context.proCandidates, 0) === 203 &&
    contexts.reduce((sum, context) => sum + context.conCandidates, 0) === 203,
  "columnar recovery cohort totals drifted"
);
assertV4(
  contexts.every(
    (context) =>
      context.columnarSavingsFraction >= 0.17 &&
      context.copiedInputBytes <
        originalPreparation.contexts.find(
          (prior) => prior.debateNumber === context.debateNumber
        ).copiedInputBytes
  ),
  "columnar transport did not reduce every context"
);

const sourceFiles = [
  DIAGNOSIS,
  ORIGINAL_PREPARATION,
  ORIGINAL_MANIFEST,
  ORIGINAL_EXECUTION,
  MANUAL,
  GUIDE,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-inventory-workflow.md",
  "docs/assessment-production-canary-inventory-execution-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422115-candidate-evidence-transport.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-stage.mjs",
  "scripts/validate-assessment-production-score-stability-v2-inventory.mjs",
  SCRIPT,
  TEST,
  ...originalPreparation.contexts.flatMap((context) => [
    context.packet,
    context.discoveryCandidateBundle,
    context.discoverySparseContext,
    context.validatorCandidateEvidenceBundle,
    context.modelCandidateTransport,
    context.originalEvents,
    context.fullLedger,
    context.schema,
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}
const futureOutputPaths = contexts.flatMap((context) => [
  context.proposalOutput,
  context.lockedInventoryOutput,
  context.validationOutput,
  context.provenanceOutput,
]);
const preparation = {
  schemaVersion:
    "1.0-score-stability-v2-columnar-inventory-recovery-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-fresh-columnar-v2-validation-inventory-contexts-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  priorGateDisposition: {
    execution: ORIGINAL_EXECUTION,
    executionSha256: sha256(originalExecutionBytes),
    status: originalExecution.status,
    validContexts: 9,
    invalidContexts: 1,
    retries: 0,
    preservedAsFailed: true,
    priorValidOutputsReusableForSuccessorAcceptance: false,
  },
  currentCanaryDisposition: structuredClone(
    originalPreparation.currentCanaryDisposition
  ),
  proposedPolicy: {
    ...structuredClone(originalPreparation.proposedPolicy),
    promoted: false,
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
  },
  inputs: {
    timeoutDiagnosis: DIAGNOSIS,
    timeoutDiagnosisSha256: sha256(diagnosisBytes),
    originalPreparation: ORIGINAL_PREPARATION,
    originalPreparationSha256: sha256(originalPreparationBytes),
    originalExecutionManifest: ORIGINAL_MANIFEST,
    originalExecutionManifestSha256: sha256(originalManifestBytes),
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(originalExecutionBytes),
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
    columnarTransportGuide: GUIDE,
    columnarTransportGuideSha256: sha256(guideBytes),
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    fullTenContextFreshExecutionRequired: true,
    priorNineValidOutputsUnavailable: true,
    priorFailedAttemptUnavailable: true,
    priorExecutionMetadataUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    scoringRubricsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  transport: {
    representation: "lossless compact JSON column order plus candidate rows",
    everyCandidateRetained: true,
    everyOriginalModelVisibleFieldRetained: true,
    rowOrderPreserved: true,
    semanticCandidateDownselectionPerformed: false,
    sourceExactExcerptRetained: true,
    validatorOwnedFieldsOmittedFromModelTransport: true,
    validatorOwnedFieldsRestoredFromFullEvidenceBundle: true,
    parsedRoundTripIdentityVerified: true,
    columnOrder: [...COLUMN_ORDER],
    originalMaximumCopiedInputBytes: Math.max(
      ...originalPreparation.contexts.map((context) => context.copiedInputBytes)
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    minimumSavingsFraction: Math.min(
      ...contexts.map((context) => context.columnarSavingsFraction)
    ),
    timeoutExtensionApplied: false,
    provenCeilingBytes: 115000,
  },
  deterministicCompilation: structuredClone(
    originalPreparation.deterministicCompilation
  ),
  audioPolicy: structuredClone(originalPreparation.audioPolicy),
  totals: {
    debates: contexts.length,
    candidates: contexts.reduce((sum, context) => sum + context.candidates, 0),
    proCandidates: contexts.reduce(
      (sum, context) => sum + context.proCandidates,
      0
    ),
    conCandidates: contexts.reduce(
      (sum, context) => sum + context.conCandidates,
      0
    ),
    originalModelTransportBytes: contexts.reduce(
      (sum, context) => sum + context.originalModelTransportBytes,
      0
    ),
    columnarModelTransportBytes: contexts.reduce(
      (sum, context) => sum + context.modelTransportBytes,
      0
    ),
    columnarSavingsBytes: contexts.reduce(
      (sum, context) => sum + context.columnarSavingsBytes,
      0
    ),
    copiedInputBytes: contexts.reduce(
      (sum, context) => sum + context.copiedInputBytes,
      0
    ),
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  stopRules: {
    ...structuredClone(originalPreparation.stopRules),
    originalGateFailureMustRemainPreserved: true,
    priorOutputsUnavailableToSuccessorModels: true,
    priorValidOutputsCannotCountTowardSuccessorAcceptance: true,
    allTenFreshContextsRequired: true,
    timeoutExtensionBlocks: true,
  },
  authorization: {
    deterministicValidation: true,
    recoveryExecutionManifest: true,
    recoveryModelExecution: false,
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
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(PREPARATION, jsonBytes(preparation));
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        candidates: context.candidates,
        originalCopiedInputBytes:
          originalPreparation.contexts.find(
            (prior) => prior.debateNumber === context.debateNumber
          ).copiedInputBytes,
        columnarCopiedInputBytes: context.copiedInputBytes,
        savingsFraction: context.columnarSavingsFraction,
      })),
      totals: preparation.totals,
      maximumCopiedInputBytes: preparation.transport.maximumCopiedInputBytes,
      fullFreshTenContextSuccessorRequired: true,
      priorOutputsReusable: false,
      timeoutExtensionAuthorized: false,
      nextAuthorized: "recovery-execution-manifest",
      recoveryModelExecutionAuthorized: false,
      scoresDerived: 0,
    },
    null,
    2
  )
);
