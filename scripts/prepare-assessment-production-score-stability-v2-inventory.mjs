#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  buildV422115EvidenceBundle,
  validateV422115EvidenceBundle,
} from "./lib/v422115-candidate-evidence-transport.mjs";
import {
  makeV422116InventorySchema,
  V422116_MODEL,
} from "./lib/v422116-decomposed-consensus.mjs";
import {
  buildV4221162InventoryCandidateTransport,
  validateV4221162InventoryCandidateTransport,
} from "./lib/v4221162-inventory-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const VALIDATION_ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort";
const ROOT = `${VALIDATION_ROOT}/inventory`;
const PROTOCOL_ID =
  "assessment-production-score-stability-v2-fresh-validation-score-blind-inventory";
const DISCOVERY_ANALYSIS = `${VALIDATION_ROOT}/discovery/analysis.json`;
const SOURCE_PREPARATION = `${VALIDATION_ROOT}/source-preparation/preparation-manifest.json`;
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const INVENTORY_WORKFLOW =
  "docs/assessment-production-canary-inventory-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL =
  "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const SCRIPT =
  "scripts/prepare-assessment-production-score-stability-v2-inventory.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2-inventory-preparation.mjs";
const PROVEN_COPIED_INPUT_CEILING_BYTES = 115000;
const SOURCE_FILES = [
  PRODUCTION_WORKFLOW,
  INVENTORY_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  MANUAL,
  DISCOVERY_ANALYSIS,
  SOURCE_PREPARATION,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422115-candidate-evidence-transport.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/v4221162-inventory-transport.mjs",
  SCRIPT,
  TEST,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const prettyJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);

async function mustNotExist(file) {
  await access(file).then(
    () => {
      throw new Error(`${file} already exists; inventory preparation is immutable`);
    },
    () => true
  );
}

const [analysisBytes, sourcePreparationBytes, manualBytes] = await Promise.all([
  readFile(DISCOVERY_ANALYSIS),
  readFile(SOURCE_PREPARATION),
  readFile(MANUAL),
]);
const analysis = JSON.parse(analysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
assertV4(
  analysis.status ===
    "v2-validation-discovery-passed-inventory-packet-preparation-authorized" &&
    analysis.developmentValidationOnly === true &&
    analysis.productionCanary === false &&
    analysis.stagingOnly === true &&
    analysis.currentCanaryDisposition?.reclassified === false &&
    analysis.proposedPolicy?.promoted === false &&
    analysis.authorization?.inventoryPacketPreparation === true &&
    analysis.authorization?.inventoryModelExecution === false &&
    analysis.authorization?.scoreDerivation === false &&
    analysis.authorization?.policyPromotion === false &&
    analysis.authorization?.productionMutation === false &&
    analysis.totals?.debates === 10 &&
    analysis.totals?.candidates === 406 &&
    analysis.totals?.pro === 203 &&
    analysis.totals?.con === 203 &&
    analysis.audit?.allDiscoveredCandidatesTransported === true &&
    analysis.audit?.silentSemanticDeduplication === false,
  "v2 discovery analysis does not authorize inventory preparation"
);
assertV4(
  sourcePreparation.status ===
    "fresh-ten-debate-v2-validation-source-and-discovery-packets-prepared" &&
    sourcePreparation.developmentValidationOnly === true &&
    sourcePreparation.productionCanary === false &&
    sourcePreparation.stagingOnly === true &&
    sourcePreparation.currentCanaryDisposition?.reclassified === false &&
    sourcePreparation.proposedPolicy?.promoted === false &&
    sourcePreparation.contexts?.length === 10,
  "v2 source preparation is unavailable"
);
assertV4(
  sourcePreparation.model?.label === V422116_MODEL.label &&
    sourcePreparation.model?.slug === V422116_MODEL.slug &&
    sourcePreparation.model?.reasoningEffort ===
      V422116_MODEL.reasoningEffort &&
    sourcePreparation.model?.authentication === "ChatGPT subscription",
  "frozen model, effort, or subscription identity changed"
);
if (shouldWrite) await mustNotExist(ROOT);

const contexts = [];
const pendingWrites = [];
for (const discovered of analysis.debates) {
  const source = sourcePreparation.contexts.find(
    (context) => context.debateNumber === discovered.debateNumber
  );
  assertV4(source, `${discovered.debateNumber}: source preparation missing`);
  assertV4(
    source.debateId === discovered.debateId,
    `${discovered.debateNumber}: debate identity drifted`
  );
  const [candidateBundleBytes, sparseBytes, packetBytes, eventsBytes, ledgerBytes] =
    await Promise.all([
      readFile(discovered.bundlePath),
      readFile(discovered.sparsePath),
      readFile(source.packet),
      readFile(source.originalEvents),
      readFile(source.fullLedger),
    ]);
  assertV4(
    sha256(candidateBundleBytes) === discovered.bundleSha256,
    `${discovered.debateNumber}: discovery candidate-bundle hash drifted`
  );
  assertV4(
    sha256(sparseBytes) === discovered.sparseSha256,
    `${discovered.debateNumber}: sparse-context hash drifted`
  );
  assertV4(
    sha256(packetBytes) === source.packetSha256,
    `${discovered.debateNumber}: packet hash drifted`
  );
  assertV4(
    sha256(eventsBytes) === source.originalEventsSha256,
    `${discovered.debateNumber}: event hash drifted`
  );
  assertV4(
    sha256(ledgerBytes) === source.fullLedgerSha256,
    `${discovered.debateNumber}: ledger hash drifted`
  );
  const packet = JSON.parse(packetBytes);
  assertV4(
    packet.modelInputBoundary?.scoreBlindDiscoveryOnly === true &&
      packet.modelInputBoundary?.developmentValidationOnly === true,
    `${discovered.debateNumber}: score-blind packet boundary drifted`
  );
  const candidateBundle = JSON.parse(candidateBundleBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assertV4(
    candidateBundle.candidateCount === discovered.candidates &&
      candidateBundle.candidates.length === discovered.candidates,
    `${discovered.debateNumber}: candidate count drifted`
  );
  const fullEvidence = buildV422115EvidenceBundle(
    candidateBundle,
    eventsDocument
  );
  validateV422115EvidenceBundle(
    fullEvidence,
    candidateBundle,
    eventsDocument
  );
  const fullEvidenceBytes = prettyJsonBytes(fullEvidence);
  const fullEvidencePath = `${ROOT}/candidate-evidence/debate-${discovered.debateNumber}.json`;
  const modelTransport =
    buildV4221162InventoryCandidateTransport(fullEvidence);
  validateV4221162InventoryCandidateTransport(modelTransport, fullEvidence);
  const modelTransportBytes = compactJsonBytes(modelTransport);
  const prettyModelTransportBytes = prettyJsonBytes(modelTransport);
  const modelTransportPath = `${ROOT}/candidate-transport/debate-${discovered.debateNumber}.json`;
  const schema = makeV422116InventorySchema({ evidenceBundle: modelTransport });
  const schemaBytes = compactJsonBytes(schema);
  const prettySchemaBytes = prettyJsonBytes(schema);
  const schemaPath = `${ROOT}/schemas/debate-${discovered.debateNumber}.schema.json`;
  assertV4(
    canonicalJson(JSON.parse(modelTransportBytes)) ===
      canonicalJson(modelTransport) &&
      canonicalJson(JSON.parse(schemaBytes)) === canonicalJson(schema),
    `${discovered.debateNumber}: compact JSON changed transport semantics`
  );
  const copiedInputBytes =
    manualBytes.length +
    packetBytes.length +
    modelTransportBytes.length +
    schemaBytes.length;
  const prettyCopiedInputBytes =
    manualBytes.length +
    packetBytes.length +
    prettyModelTransportBytes.length +
    prettySchemaBytes.length;
  assertV4(
    copiedInputBytes <= PROVEN_COPIED_INPUT_CEILING_BYTES,
    `${discovered.debateNumber}: compact inventory context exceeds the proven 115 KB transport ceiling`
  );
  pendingWrites.push(
    { file: fullEvidencePath, bytes: fullEvidenceBytes },
    { file: modelTransportPath, bytes: modelTransportBytes },
    { file: schemaPath, bytes: schemaBytes }
  );
  contexts.push({
    debateNumber: discovered.debateNumber,
    debateId: discovered.debateId,
    family: discovered.family,
    sourceComplexityBand: discovered.sourceComplexityBand,
    packet: source.packet,
    packetSha256: sha256(packetBytes),
    discoveryCandidateBundle: discovered.bundlePath,
    discoveryCandidateBundleSha256: sha256(candidateBundleBytes),
    discoverySparseContext: discovered.sparsePath,
    discoverySparseContextSha256: sha256(sparseBytes),
    validatorCandidateEvidenceBundle: fullEvidencePath,
    validatorCandidateEvidenceBundleSha256: sha256(fullEvidenceBytes),
    modelCandidateTransport: modelTransportPath,
    modelCandidateTransportSha256: sha256(modelTransportBytes),
    originalEvents: source.originalEvents,
    originalEventsSha256: sha256(eventsBytes),
    fullLedger: source.fullLedger,
    fullLedgerSha256: sha256(ledgerBytes),
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    candidates: modelTransport.candidateCount,
    proCandidates: modelTransport.candidates.filter(
      (candidate) => candidate.side === "pro"
    ).length,
    conCandidates: modelTransport.candidates.filter(
      (candidate) => candidate.side === "con"
    ).length,
    belowHighAttributionCandidates: fullEvidence.candidates.filter(
      (candidate) => candidate.attributionConfidence !== "high"
    ).length,
    fullEvidenceBytes: fullEvidenceBytes.length,
    modelTransportBytes: modelTransportBytes.length,
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    prettyCopiedInputBytes,
    compactSerializationSavingsBytes: prettyCopiedInputBytes - copiedInputBytes,
    proposalOutput: `${ROOT}/inventory-proposals/debate-${discovered.debateNumber}.json`,
    lockedInventoryOutput: `${ROOT}/locked-inventories/debate-${discovered.debateNumber}.json`,
    validationOutput: `${ROOT}/validations/debate-${discovered.debateNumber}.json`,
    provenanceOutput: `${ROOT}/provenance/debate-${discovered.debateNumber}.json`,
  });
}

assertV4(contexts.length === 10, "inventory preparation must contain ten debates");
assertV4(
  contexts.reduce((sum, context) => sum + context.candidates, 0) === 406 &&
    contexts.reduce((sum, context) => sum + context.proCandidates, 0) === 203 &&
    contexts.reduce((sum, context) => sum + context.conCandidates, 0) === 203,
  "inventory candidate totals drifted"
);
assertV4(
  contexts.every(
    (context) => context.proCandidates >= 4 && context.conCandidates >= 4
  ),
  "an inventory context lacks minimum candidate coverage for both sides"
);
const prettyCeilingFailures = contexts
  .filter(
    (context) =>
      context.prettyCopiedInputBytes > PROVEN_COPIED_INPUT_CEILING_BYTES
  )
  .map((context) => context.debateNumber);
assertV4(
  prettyCeilingFailures.length === 1 && prettyCeilingFailures[0] === "158",
  "the frozen lossless-serialization preflight no longer matches the observed 76-byte overrun"
);
const sourceHashes = {};
for (const file of [...new Set(SOURCE_FILES)].sort()) {
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
    "1.0-score-stability-v2-fresh-validation-score-blind-inventory-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-v2-validation-score-blind-inventory-contexts-prepared"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  currentCanaryDisposition: structuredClone(
    analysis.currentCanaryDisposition
  ),
  proposedPolicy: { ...structuredClone(analysis.proposedPolicy), promoted: false },
  model: {
    ...V422116_MODEL,
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0,
  },
  inputs: {
    discoveryAnalysis: DISCOVERY_ANALYSIS,
    discoveryAnalysisSha256: sha256(analysisBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    productionWorkflow: PRODUCTION_WORKFLOW,
    inventoryWorkflow: INVENTORY_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
  },
  sourceHashes,
  contexts,
  isolation: {
    oneDebatePerContext: true,
    scoreBlindCurator: true,
    allDiscoveredCandidatesAvailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    independentJudgmentsUnavailable: true,
    scoringRubricsUnavailable: true,
    performanceJudgmentsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
  },
  transport: {
    everyCandidateRetained: true,
    semanticCandidateDownselectionPerformed: false,
    sourceExactExcerptRetained: true,
    validatorOwnedFieldsOmittedFromModelTransport: true,
    validatorOwnedFieldsRestoredFromFullEvidenceBundle: true,
    modelTransportAndSchemaSerialization:
      "lossless compact JSON with terminal newline",
    parsedSemanticIdentityVerified: true,
    compactSerializationChosenBeforeInventoryModelExecution: true,
    maximumPrettyCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.prettyCopiedInputBytes)
    ),
    prettyCeilingFailureDebates: prettyCeilingFailures,
    maximumCopiedInputBytes: Math.max(
      ...contexts.map((context) => context.copiedInputBytes)
    ),
    provenCeilingBytes: PROVEN_COPIED_INPUT_CEILING_BYTES,
  },
  deterministicCompilation: {
    chronologyRepositoryOwned: true,
    sourceEvidenceRepositoryRerendered: true,
    replyRequiresEarlierSelectedOpponent: true,
    responseTopologyAbsent: true,
    ratingsAbsent: true,
    semanticRepair: false,
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    discoveryBelowHighCandidates: contexts.reduce(
      (sum, context) => sum + context.belowHighAttributionCandidates,
      0
    ),
    audioAccessedDuringPreparation: false,
  },
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
    fullEvidenceBytes: contexts.reduce(
      (sum, context) => sum + context.fullEvidenceBytes,
      0
    ),
    modelTransportBytes: contexts.reduce(
      (sum, context) => sum + context.modelTransportBytes,
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
  stopRules: structuredClone(analysis.stopRules ?? sourcePreparation.stopRules),
  authorization: {
    deterministicValidation: true,
    inventoryExecutionManifest: true,
    inventoryModelExecution: false,
    retry: false,
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
  await writeFile(PREPARATION, prettyJsonBytes(preparation));
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      debates: contexts.map((context) => ({
        debateNumber: context.debateNumber,
        candidates: context.candidates,
        proCandidates: context.proCandidates,
        conCandidates: context.conCandidates,
        prettyCopiedInputBytes: context.prettyCopiedInputBytes,
        compactCopiedInputBytes: context.copiedInputBytes,
      })),
      totals: preparation.totals,
      losslessCompactSerialization: true,
      prettyCeilingFailureDebates: prettyCeilingFailures,
      everyCandidateRetained: true,
      currentCanaryStillFailed: true,
      proposedPolicyPromoted: false,
      nextAuthorized: "inventory-execution-manifest",
      modelExecutionAuthorized: false,
      scoresDerived: 0,
      productionMutationAuthorized: false,
    },
    null,
    2
  )
);
