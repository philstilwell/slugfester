#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  buildV422115EvidenceBundle,
  validateV422115EvidenceBundle
} from "./lib/v422115-candidate-evidence-transport.mjs";
import {
  makeV422116InventorySchema,
  V422116_MODEL
} from "./lib/v422116-decomposed-consensus.mjs";
import {
  buildV4221162InventoryCandidateTransport,
  validateV4221162InventoryCandidateTransport
} from "./lib/v4221162-inventory-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = "docs/assessment-production/canary-v1-inventory";
const PROTOCOL_ID = "assessment-production-canary-v1-score-blind-inventory";
const DISCOVERY_ANALYSIS = "docs/assessment-production/canary-v1-discovery/analysis.json";
const SOURCE_PREPARATION = "docs/assessment-production/canary-v1-source-preparation/preparation-manifest.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const INVENTORY_WORKFLOW = "docs/assessment-production-canary-inventory-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL = "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
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
  "scripts/prepare-assessment-production-canary-inventory.mjs",
  "scripts/test-assessment-production-canary-inventory-preparation.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

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
  readFile(MANUAL)
]);
const analysis = JSON.parse(analysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);

assertV4(
  analysis.status === "production-canary-discovery-passed-inventory-packet-preparation-authorized" &&
    analysis.productionCanary === true &&
    analysis.stagingOnly === true &&
    analysis.authorization?.inventoryPacketPreparation === true &&
    analysis.authorization?.inventoryModelExecution === false &&
    analysis.totals?.debates === 10 &&
    analysis.totals?.candidates === 322 &&
    analysis.audit?.allDiscoveredCandidatesTransported === true &&
    analysis.audit?.silentSemanticDeduplication === false,
  "the discovery analysis does not authorize production-canary inventory preparation"
);
assertV4(
  sourcePreparation.status === "ten-debate-production-canary-source-and-discovery-packets-prepared" &&
    sourcePreparation.productionCanary === true &&
    sourcePreparation.stagingOnly === true &&
    sourcePreparation.contexts?.length === 10,
  "the production-canary source preparation is unavailable"
);
assertV4(
  sourcePreparation.model?.label === V422116_MODEL.label &&
    sourcePreparation.model?.slug === V422116_MODEL.slug &&
    sourcePreparation.model?.reasoningEffort === V422116_MODEL.reasoningEffort &&
    sourcePreparation.model?.authentication === "ChatGPT subscription",
  "the frozen model or subscription identity changed"
);
if (shouldWrite) await mustNotExist(PREPARATION);

const contexts = [];
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
      readFile(source.fullLedger)
    ]);
  assertV4(
    sha256(candidateBundleBytes) === discovered.bundleSha256,
    `${discovered.debateNumber}: discovery candidate-bundle hash drifted`
  );
  assertV4(
    sha256(sparseBytes) === discovered.sparseSha256,
    `${discovered.debateNumber}: sparse-context hash drifted`
  );
  assertV4(sha256(packetBytes) === source.packetSha256, `${discovered.debateNumber}: packet hash drifted`);
  assertV4(sha256(eventsBytes) === source.originalEventsSha256, `${discovered.debateNumber}: event hash drifted`);
  assertV4(sha256(ledgerBytes) === source.fullLedgerSha256, `${discovered.debateNumber}: ledger hash drifted`);

  const candidateBundle = JSON.parse(candidateBundleBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assertV4(
    candidateBundle.candidateCount === discovered.candidates &&
      candidateBundle.candidates.length === discovered.candidates,
    `${discovered.debateNumber}: candidate count drifted`
  );
  const fullEvidence = buildV422115EvidenceBundle(candidateBundle, eventsDocument);
  validateV422115EvidenceBundle(fullEvidence, candidateBundle, eventsDocument);
  const fullEvidenceBytes = jsonBytes(fullEvidence);
  const fullEvidencePath = `${ROOT}/candidate-evidence/debate-${discovered.debateNumber}.json`;

  const modelTransport = buildV4221162InventoryCandidateTransport(fullEvidence);
  validateV4221162InventoryCandidateTransport(modelTransport, fullEvidence);
  const modelTransportBytes = jsonBytes(modelTransport);
  const modelTransportPath = `${ROOT}/candidate-transport/debate-${discovered.debateNumber}.json`;

  const schema = makeV422116InventorySchema({ evidenceBundle: modelTransport });
  const schemaBytes = jsonBytes(schema);
  const schemaPath = `${ROOT}/schemas/debate-${discovered.debateNumber}.schema.json`;
  const copiedInputBytes =
    manualBytes.length + packetBytes.length + modelTransportBytes.length + schemaBytes.length;

  assertV4(
    copiedInputBytes <= PROVEN_COPIED_INPUT_CEILING_BYTES,
    `${discovered.debateNumber}: inventory context exceeds the proven 115 KB transport ceiling`
  );

  if (shouldWrite) {
    for (const output of [fullEvidencePath, modelTransportPath, schemaPath]) {
      await mkdir(path.dirname(output), { recursive: true });
    }
    await writeFile(fullEvidencePath, fullEvidenceBytes);
    await writeFile(modelTransportPath, modelTransportBytes);
    await writeFile(schemaPath, schemaBytes);
  }

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
    proCandidates: modelTransport.candidates.filter((candidate) => candidate.side === "pro").length,
    conCandidates: modelTransport.candidates.filter((candidate) => candidate.side === "con").length,
    belowHighAttributionCandidates: fullEvidence.candidates.filter(
      (candidate) => candidate.attributionConfidence !== "high"
    ).length,
    fullEvidenceBytes: fullEvidenceBytes.length,
    modelTransportBytes: modelTransportBytes.length,
    schemaBytes: schemaBytes.length,
    copiedInputBytes,
    proposalOutput: `${ROOT}/inventory-proposals/debate-${discovered.debateNumber}.json`,
    lockedInventoryOutput: `${ROOT}/locked-inventories/debate-${discovered.debateNumber}.json`,
    validationOutput: `${ROOT}/validations/debate-${discovered.debateNumber}.json`,
    provenanceOutput: `${ROOT}/provenance/debate-${discovered.debateNumber}.json`
  });
}

assertV4(contexts.length === 10, "inventory preparation must contain ten debates");
assertV4(
  contexts.reduce((sum, context) => sum + context.candidates, 0) === 322,
  "inventory preparation candidate total drifted"
);
assertV4(
  contexts.every((context) => context.proCandidates >= 4 && context.conCandidates >= 4),
  "an inventory context lacks the minimum candidate coverage for both sides"
);

const sourceHashes = {};
for (const file of [...new Set(SOURCE_FILES)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputPaths = contexts.flatMap((context) => [
  context.proposalOutput,
  context.lockedInventoryOutput,
  context.validationOutput,
  context.provenanceOutput
]);
const preparation = {
  schemaVersion: "1.0-production-canary-score-blind-inventory-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "ten-production-canary-score-blind-inventory-contexts-prepared"
    : "preview",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  model: {
    ...V422116_MODEL,
    authentication: "ChatGPT subscription",
    meteredApiCostUsdMaximum: 0
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
    manualSha256: sha256(manualBytes)
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
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true
  },
  transport: {
    everyCandidateRetained: true,
    semanticCandidateDownselectionPerformed: false,
    sourceExactExcerptRetained: true,
    validatorOwnedFieldsOmittedFromModelTransport: true,
    validatorOwnedFieldsRestoredFromFullEvidenceBundle: true,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    provenCeilingBytes: PROVEN_COPIED_INPUT_CEILING_BYTES
  },
  deterministicCompilation: {
    chronologyRepositoryOwned: true,
    sourceEvidenceRepositoryRerendered: true,
    replyRequiresEarlierSelectedOpponent: true,
    responseTopologyAbsent: true,
    ratingsAbsent: true,
    semanticRepair: false
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    discoveryBelowHighCandidates: contexts.reduce(
      (sum, context) => sum + context.belowHighAttributionCandidates,
      0
    ),
    audioAccessedDuringPreparation: false
  },
  totals: {
    debates: contexts.length,
    candidates: contexts.reduce((sum, context) => sum + context.candidates, 0),
    proCandidates: contexts.reduce((sum, context) => sum + context.proCandidates, 0),
    conCandidates: contexts.reduce((sum, context) => sum + context.conCandidates, 0),
    fullEvidenceBytes: contexts.reduce((sum, context) => sum + context.fullEvidenceBytes, 0),
    modelTransportBytes: contexts.reduce((sum, context) => sum + context.modelTransportBytes, 0),
    copiedInputBytes: contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0),
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
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
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, jsonBytes(preparation));
}

console.log(JSON.stringify({
  status: preparation.status,
  debates: contexts.map((context) => ({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    proCandidates: context.proCandidates,
    conCandidates: context.conCandidates,
    modelTransportKilobytes: Math.round(context.modelTransportBytes / 1000),
    copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000)
  })),
  totals: preparation.totals,
  everyCandidateRetained: true,
  nextAuthorized: "inventory-execution-manifest",
  modelExecutionAuthorized: false,
  scoresDerived: 0,
  productionMutationAuthorized: false
}, null, 2));
