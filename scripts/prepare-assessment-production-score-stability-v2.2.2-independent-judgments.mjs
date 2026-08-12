#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionCanarySourcePacket } from "./lib/assessment-production-canary-packets.mjs";
import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import {
  buildV422116JudgmentPacket,
  makeV422116JudgmentSchema,
  V422116_MODEL
} from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ROOT = "docs/assessment-production/score-stability-v2.2.2-validation-cohort/independent-judgments";
const PROTOCOL_ID = "assessment-production-score-stability-v2.2.2-fresh-validation-independent-judgments";
const INVENTORY_ANALYSIS = "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/inventory-analysis.json";
const INVENTORY_PREPARATION = "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/section-packet-preparation-manifest.json";
const SOURCE_PREPARATION = "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/section-packet-preparation-manifest.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const STAGE_WORKFLOW = "docs/assessment-production-canary-independent-judgment-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/judgment-manual.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const PROVEN_COPIED_INPUT_CEILING_BYTES = 115000;
const EXPECTED_DEBATES = [
  "17",
  "39",
  "121",
  "21",
  "75",
  "168",
  "177",
  "56",
  "49",
  "132",
];
const SOURCE_FILES = [
  PRODUCTION_MANIFEST,
  PRODUCTION_WORKFLOW,
  STAGE_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  MANUAL,
  INVENTORY_ANALYSIS,
  INVENTORY_PREPARATION,
  SOURCE_PREPARATION,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/prepare-assessment-production-score-stability-v2.2.2-independent-judgments.mjs",
  "scripts/test-assessment-production-score-stability-v2.2.2-independent-judgment-preparation.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const compactJsonBytes = (value) => Buffer.from(JSON.stringify(value));
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const stripSchemaDescriptions = (value) => {
  if (Array.isArray(value)) return value.map(stripSchemaDescriptions);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "description")
      .map(([key, child]) => [key, stripSchemaDescriptions(child)])
  );
};

async function mustNotExist(file) {
  await access(file).then(
    () => {
      throw new Error(`${file} already exists; independent-judgment preparation is immutable`);
    },
    () => true
  );
}

const [
  inventoryAnalysisBytes,
  inventoryPreparationBytes,
  sourcePreparationBytes,
  productionManifestBytes,
  manualBytes
] = await Promise.all([
  readFile(INVENTORY_ANALYSIS),
  readFile(INVENTORY_PREPARATION),
  readFile(SOURCE_PREPARATION),
  readFile(PRODUCTION_MANIFEST),
  readFile(MANUAL)
]);
const inventoryAnalysis = JSON.parse(inventoryAnalysisBytes);
const inventoryPreparation = JSON.parse(inventoryPreparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const productionManifest = JSON.parse(productionManifestBytes);

assertV4(
  inventoryAnalysis.status ===
      "v2.2.2-chronology-fallback-inventory-gate-passed-independent-judgment-packet-preparation-authorized" &&
    inventoryAnalysis.developmentValidationOnly === true &&
    inventoryAnalysis.productionCanary === false &&
    inventoryAnalysis.stagingOnly === true &&
    inventoryAnalysis.authorization?.independentJudgmentPacketPreparation === true &&
    inventoryAnalysis.authorization?.independentJudgmentModelExecution === false &&
    inventoryAnalysis.audit?.everyLockedInventoryValidated === true &&
    inventoryAnalysis.audit?.everyLockedMoveUsesExactSourceEvidence === true &&
    inventoryAnalysis.totals?.debates === 10 &&
    inventoryAnalysis.totals?.moves === 197 &&
    inventoryAnalysis.totals?.belowHighAttributionMoves === 0 &&
    inventoryAnalysis.totals?.chronologyFallbacks === 1 &&
    inventoryAnalysis.nextAuthorizedAction ===
      "prepare-and-freeze-twenty-v2.2.2-independent-judgment-packets-model-free-only",
  "the inventory gate does not authorize v2.2.2 independent-judgment packet preparation"
);
assertV4(
  inventoryPreparation.status ===
      "ten-exact-v2.2.2-section-packets-frozen-not-authorized" &&
    inventoryPreparation.developmentValidationOnly === true &&
    inventoryPreparation.productionCanary === false &&
    inventoryPreparation.stagingOnly === true &&
    inventoryPreparation.contexts?.length === 10,
  "the v2.2.2 inventory preparation is unavailable"
);
assertV4(
  sourcePreparation.status ===
      "ten-exact-v2.2.2-section-packets-frozen-not-authorized" &&
    sourcePreparation.developmentValidationOnly === true &&
    sourcePreparation.productionCanary === false &&
    sourcePreparation.stagingOnly === true &&
    sourcePreparation.contexts?.length === 10,
  "the v2.2.2 source preparation is unavailable"
);
assertV4(
  productionManifest.model?.label === V422116_MODEL.label &&
    productionManifest.model?.slug === V422116_MODEL.slug &&
    productionManifest.model?.reasoningEffort === V422116_MODEL.reasoningEffort &&
    productionManifest.model?.authentication === "ChatGPT subscription" &&
    productionManifest.boundaries?.twoIndependentSolPasses === true &&
    productionManifest.boundaries?.modelAuthoredScoresMaximum === 0,
  "the frozen production model or independent-judgment boundary changed"
);
assertV4(
  inventoryAnalysis.debates.map((debate) => debate.debateNumber).join(",") ===
    EXPECTED_DEBATES.join(","),
  "the passed inventory debate order changed"
);
for (const [file, digest] of Object.entries(inventoryAnalysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: inventory source drifted`);
}
if (shouldWrite) await mustNotExist(PREPARATION);

const sharedInputBytes = manualBytes.length;
const contexts = [];
const transportOverflows = [];
for (const debate of inventoryAnalysis.debates) {
  const prepared = sourcePreparation.contexts.find(
    (context) => context.debateNumber === debate.debateNumber
  );
  const source = prepared?.sourceContext;
  assertV4(source, `${debate.debateNumber}: frozen source context missing`);
  assertV4(
    source.debateId === debate.debateId && prepared.debateId === debate.debateId,
    `${debate.debateNumber}: debate identity drifted`
  );

  const [
    lockedInventoryBytes,
    sourceInputPacketBytes,
    transcriptBytes,
    eventsBytes,
    manifestBytes,
    fullLedgerBytes
  ] = await Promise.all([
    readFile(debate.lockedInventory),
    readFile(source.inventorySourcePacket),
    readFile(source.originalTranscript),
    readFile(source.originalEvents),
    readFile(source.originalManifest),
    readFile(source.fullLedger)
  ]);
  assertV4(
    sha256(lockedInventoryBytes) === debate.lockedInventorySha256,
    `${debate.debateNumber}: locked-inventory hash drifted`
  );
  for (const [bytes, digest, label] of [
    [sourceInputPacketBytes, source.inventorySourcePacketSha256, "source input packet"],
    [transcriptBytes, source.originalTranscriptSha256, "transcript"],
    [eventsBytes, source.originalEventsSha256, "events"],
    [manifestBytes, source.originalManifestSha256, "manifest"],
    [fullLedgerBytes, source.fullLedgerSha256, "full ledger"]
  ]) assertV4(sha256(bytes) === digest, `${debate.debateNumber}: ${label} hash drifted`);

  const lockedInventory = JSON.parse(lockedInventoryBytes);
  const sourceInputPacket = JSON.parse(sourceInputPacketBytes);
  const localManifest = JSON.parse(manifestBytes);
  assertV4(
    lockedInventory.schemaVersion === "4.2.21.16-locked-inventory" &&
      lockedInventory.protocolId === "v4.2.21.16-decomposed-consensus-contract" &&
      lockedInventory.debateNumber === debate.debateNumber &&
      lockedInventory.debateId === debate.debateId &&
      lockedInventory.lockPolicy?.scoreBlind === true &&
      lockedInventory.lockPolicy?.ratingsAbsent === true &&
      lockedInventory.lockPolicy?.responseTopologyAbsent === true &&
      lockedInventory.lockPolicy?.calculatedTotalsAbsent === true &&
      lockedInventory.lockPolicy?.winnerLabelsAbsent === true &&
      lockedInventory.moves.length === debate.moves,
    `${debate.debateNumber}: locked-inventory boundary changed`
  );

  const canonicalEvents = normalizeV418Events(JSON.parse(eventsBytes)).map((event) => ({
    startMs: event.startMs,
    durationMs: event.durationMs,
    text: event.text
  }));
  const canonicalEventsBytes = prettyJsonBytes(canonicalEvents);
  const canonicalManifestBytes = prettyJsonBytes({
    ...localManifest,
    normalizedEventsSha256: sha256(canonicalEventsBytes)
  });
  const template = buildV4220SourcePacket({
    debate: {
      number: debate.debateNumber,
      debateId: debate.debateId,
      motion: sourceInputPacket.motion,
      sides: sourceInputPacket.sides,
      videoId: localManifest.videoId
    },
    transcriptPath: source.originalTranscript,
    eventsPath: source.originalEvents,
    manifestPath: source.originalManifest,
    sourceLedgerPath: source.fullLedger,
    transcriptBytes,
    eventsBytes: canonicalEventsBytes,
    manifestBytes: canonicalManifestBytes
  });
  const productionBuilt = buildProductionCanarySourcePacket({
    debate: {
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      motion: sourceInputPacket.motion,
      sides: sourceInputPacket.sides,
      videoId: localManifest.videoId
    },
    transcriptPath: source.originalTranscript,
    eventsPath: source.originalEvents,
    manifestPath: source.originalManifest,
    sourceLedgerPath: source.fullLedger,
    transcriptBytes,
    eventsBytes,
    manifestBytes
  });
  assertV4(
    sha256(template.sourceLedgerBytes) === sha256(productionBuilt.sourceLedgerBytes) &&
      sha256(productionBuilt.sourceLedgerBytes) === sha256(fullLedgerBytes),
    `${debate.debateNumber}: source-ledger replay changed`
  );
  const sourcePacket = {
    ...template.packet,
    sourceChain: productionBuilt.packet.sourceChain,
    transportChain: productionBuilt.packet.transportChain
  };
  const sourcePacketPath = `${ROOT}/source-packets/debate-${debate.debateNumber}.json`;
  const sourcePacketBytes = prettyJsonBytes(sourcePacket);

  if (shouldWrite) {
    await mustNotExist(sourcePacketPath);
    await mkdir(path.dirname(sourcePacketPath), { recursive: true });
    await writeFile(sourcePacketPath, sourcePacketBytes);
  }

  for (const reviewerPass of ["A", "B"]) {
    const packet = buildV422116JudgmentPacket(lockedInventory, reviewerPass);
    const packetBytes = compactJsonBytes(packet);
    const packetPath = `${ROOT}/judgment-packets/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`;
    const schema = stripSchemaDescriptions(makeV422116JudgmentSchema({ packet }));
    const schemaBytes = compactJsonBytes(schema);
    const schemaText = schemaBytes.toString("utf8");
    const schemaPath = `${ROOT}/schemas/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.schema.json`;
    assertV4(
      !schemaText.includes('"uniqueItems"'),
      `${debate.debateNumber}/${reviewerPass}: unsupported uniqueItems remains`
    );
    assertV4(
      packet.lockedInventorySha256 === sha256(canonicalJson(lockedInventory)),
      `${debate.debateNumber}/${reviewerPass}: canonical locked-inventory hash drifted`
    );
    const copiedInputBytes =
      sharedInputBytes + sourcePacketBytes.length + packetBytes.length + schemaBytes.length;
    if (copiedInputBytes > PROVEN_COPIED_INPUT_CEILING_BYTES) {
      transportOverflows.push({
        debateNumber: debate.debateNumber,
        reviewerPass,
        copiedInputBytes,
        overflowBytes: copiedInputBytes - PROVEN_COPIED_INPUT_CEILING_BYTES,
        components: {
          manualBytes: sharedInputBytes,
          sourcePacketBytes: sourcePacketBytes.length,
          judgmentPacketBytes: packetBytes.length,
          schemaBytes: schemaBytes.length,
        },
      });
    }

    if (shouldWrite) {
      await mustNotExist(packetPath);
      await mustNotExist(schemaPath);
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, packetBytes);
      await writeFile(schemaPath, schemaBytes);
    }

    contexts.push({
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: source.family,
      sourceComplexityBand: source.sourceComplexityBand,
      reviewerPass,
      reviewerRole: packet.reviewerRole,
      lockedInventory: debate.lockedInventory,
      lockedInventorySha256: debate.lockedInventorySha256,
      lockedInventoryCanonicalSha256: packet.lockedInventorySha256,
      sourcePacket: sourcePacketPath,
      sourcePacketSha256: sha256(sourcePacketBytes),
      originalTranscript: source.originalTranscript,
      originalTranscriptSha256: sha256(transcriptBytes),
      originalEvents: source.originalEvents,
      originalEventsSha256: sha256(eventsBytes),
      originalManifest: source.originalManifest,
      originalManifestSha256: sha256(manifestBytes),
      fullLedger: source.fullLedger,
      fullLedgerSha256: sha256(fullLedgerBytes),
      judgmentPacket: packetPath,
      judgmentPacketSha256: sha256(packetBytes),
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      moves: lockedInventory.moves.length,
      copiedInputBytes,
      judgmentOutput: `${ROOT}/judgments/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      rawOutput: `${ROOT}/raw-outputs/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      validationOutput: `${ROOT}/validations/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      provenanceOutput: `${ROOT}/provenance/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`
    });
  }
}

assertV4(contexts.length === 20, "independent-judgment preparation must contain twenty contexts");
if (shouldWrite) {
  assertV4(
    transportOverflows.length === 0,
    `${transportOverflows.length} independent-judgment contexts exceed the proven 115 KB transport ceiling`
  );
}
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 394,
  "independent-judgment move coverage drifted"
);
for (const debateNumber of EXPECTED_DEBATES) {
  const pair = contexts.filter((context) => context.debateNumber === debateNumber);
  assertV4(
    pair.length === 2 && pair.map((context) => context.reviewerPass).sort().join("") === "AB",
    `${debateNumber}: Pass A/B pair missing`
  );
  assertV4(
    pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256 &&
      pair[0].lockedInventoryCanonicalSha256 === pair[1].lockedInventoryCanonicalSha256 &&
      pair[0].sourcePacketSha256 === pair[1].sourcePacketSha256,
    `${debateNumber}: Pass A/B source or inventory mismatch`
  );
}

const sourceHashes = {};
for (const file of [...new Set(SOURCE_FILES)]) sourceHashes[file] = sha256(await readFile(file));
const futureOutputPaths = contexts.flatMap((context) => [
  context.judgmentOutput,
  context.rawOutput,
  context.validationOutput,
  context.provenanceOutput
]);
const preparation = {
  schemaVersion:
    "1.0-score-stability-v2.2.2-independent-judgment-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "twenty-v2.2.2-independent-judgment-contexts-prepared-and-frozen"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  failedGateDisposition: structuredClone(
    inventoryAnalysis.failedGateDisposition
  ),
  proposedPolicy: {
    ...structuredClone(inventoryAnalysis.proposedPolicy),
    promoted: false,
  },
  inventorySuccessorContract: structuredClone(
    inventoryAnalysis.inventorySuccessorContract
  ),
  model: {
    ...V422116_MODEL,
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    meteredApiCostUsdMaximum: 0
  },
  inputs: {
    productionManifest: PRODUCTION_MANIFEST,
    productionManifestSha256: sha256(productionManifestBytes),
    inventoryAnalysis: INVENTORY_ANALYSIS,
    inventoryAnalysisSha256: sha256(inventoryAnalysisBytes),
    inventoryPreparation: INVENTORY_PREPARATION,
    inventoryPreparationSha256: sha256(inventoryPreparationBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    productionWorkflow: PRODUCTION_WORKFLOW,
    stageWorkflow: STAGE_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    manual: MANUAL,
    manualSha256: sha256(manualBytes)
  },
  sourceHashes,
  contexts,
  isolation: {
    twoIndependentPassesPerDebate: true,
    byteIdenticalLockedInventoryPerPair: true,
    byteIdenticalSourcePacketPerPair: true,
    separateFreshModelContextPerPassRequired: true,
    oneDebateAndOnePassPerFutureContext: true,
    onlyManualSourcePacketJudgmentPacketAndSchemaAllowed: true,
    otherPassUnavailable: true,
    otherDebatesUnavailable: true,
    candidateSelectionUnavailable: true,
    failedV221PlanOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    ratingsScoresWinnersTagsAndPublicationProseUnavailable: true
  },
  transport: {
    copiedInputsPerContext: ["manual", "sourcePacket", "judgmentPacket", "schema"],
    sharedManualBytes: sharedInputBytes,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    provenCeilingBytes: PROVEN_COPIED_INPUT_CEILING_BYTES,
    unsupportedUniqueItemsRemoved: true,
    schemaDescriptionAnnotationsRemoved: true,
    schemaValidationKeywordsChanged: false,
    runtimeUniquenessValidationRetained: true
  },
  deterministicCompilation: {
    targetEnumsEarlierOpposingOnly: true,
    responseClassRepositoryDerived: true,
    absoluteResponsivenessRepositoryMapped: true,
    absoluteRelevanceBurdenRepositoryMapped: true,
    precisionAndCalibrationRepositoryMapped: true,
    untestedCharityAnchorRepositoryApplied: true,
    strictBurdenResidualExclusionRepositoryApplied: true,
    semanticRepair: false,
    modelAuthoredScores: 0
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    pendingAttributionVerificationMoves: structuredClone(
      inventoryAnalysis.audioPolicy.belowHighAttributionMoveIds
    ),
    audioAccessedDuringPreparation: false
  },
  executionPolicyToFreezeSeparately: {
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    freshTemporaryWorkingDirectoryPerContext: true,
    freshTemporaryCodexHomePerContext: true,
    attemptsPerContextMaximum: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true
  },
  totals: {
    debates: 10,
    contexts: 20,
    uniqueMoves: inventoryAnalysis.totals.moves,
    movesJudgedAcrossPasses: contexts.reduce((sum, context) => sum + context.moves, 0),
    copiedInputBytes: contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0),
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    meanCopiedInputBytes: Math.round(
      contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) / contexts.length
    ),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  authorization: {
    deterministicValidation: true,
    independentJudgmentExecutionManifest: true,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    disagreementExtraction: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "prepare-v2.2.2-independent-judgment-execution-manifest-model-free-only",
};

if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, prettyJsonBytes(preparation));
}

console.log(JSON.stringify({
  status: preparation.status,
  debates: EXPECTED_DEBATES,
  contexts: contexts.map((context) => ({
    debateNumber: context.debateNumber,
    reviewerPass: context.reviewerPass,
    moves: context.moves,
    copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000)
  })),
  totals: preparation.totals,
  transportOverflows,
  pairedLockedInventoriesIdentical: true,
  authentication: preparation.model.authentication,
  modelContextsExecuted: 0,
  scoresDerived: 0,
  nextAuthorized: "independent-judgment-execution-manifest",
  independentJudgmentModelExecutionAuthorized: false,
  productionMutationAuthorized: false
}, null, 2));
