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
  V422116_MODEL
} from "./lib/v422116-decomposed-consensus.mjs";
import {
  makeV223CompactJudgmentPacket,
  makeV223CompactJudgmentSchema,
  stripV223SchemaDescriptions,
} from "./lib/assessment-production-score-stability-v2.2.3-compact-judgment-schema.mjs";
import {
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch09StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-09-standing-authorization.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-09/independent-judgments";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-09-independent-judgments";
const INVENTORY_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/batch-09/inventory-candidate-sharded/inventory-analysis.json";
const INVENTORY_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/batch-09/inventory-candidate-sharded/preparation-manifest.json";
const SOURCE_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/batch-09/source-preparation/preparation-manifest.json";
const SOURCE_VALIDATION = "docs/assessment-production/post-canary-continuation-v1/batch-09/source-preparation/validation.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const COHORT_SELECTION =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/selection.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const STAGE_WORKFLOW = "docs/assessment-production-canary-independent-judgment-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const RUBRIC = "docs/reassessment-rubric-v2.1.md";
const MANUAL = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/judgment-manual.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const PROVEN_COPIED_INPUT_CEILING_BYTES = 115000;
const EXPECTED_DEBATES = [
  "170",
  "134",
  "19",
  "114",
  "166",
  "89",
  "176",
  "183",
  "112",
  "17",
];
const SOURCE_FILES = [
  PRODUCTION_MANIFEST,
  COHORT_SELECTION,
  PRODUCTION_WORKFLOW,
  STAGE_WORKFLOW,
  READINESS_WORKFLOW,
  RUBRIC,
  MANUAL,
  INVENTORY_ANALYSIS,
  INVENTORY_PREPARATION,
  SOURCE_PREPARATION,
  SOURCE_VALIDATION,
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/assessment-production-canary-packets.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-compact-judgment-schema.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-standing-authorization.mjs",
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  "scripts/prepare-assessment-production-post-canary-batch-09-independent-judgments.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-independent-judgment-preparation.mjs"
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const compactJsonBytes = (value) => Buffer.from(JSON.stringify(value));
const prettyJsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

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
  sourceValidationBytes,
  productionManifestBytes,
  cohortSelectionBytes,
  manualBytes
] = await Promise.all([
  readFile(INVENTORY_ANALYSIS),
  readFile(INVENTORY_PREPARATION),
  readFile(SOURCE_PREPARATION),
  readFile(SOURCE_VALIDATION),
  readFile(PRODUCTION_MANIFEST),
  readFile(COHORT_SELECTION),
  readFile(MANUAL)
]);
const inventoryAnalysis = JSON.parse(inventoryAnalysisBytes);
const inventoryPreparation = JSON.parse(inventoryPreparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const sourceValidation = JSON.parse(sourceValidationBytes);
const productionManifest = JSON.parse(productionManifestBytes);
const cohortSelection = JSON.parse(cohortSelectionBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch09StandingAuthorization();

assertV4(
  inventoryAnalysis.status ===
      "post-canary-batch-09-inventory-gate-passed-audio-verification-required-before-later-adjudication" &&
    inventoryAnalysis.developmentValidationOnly === false &&
    inventoryAnalysis.productionCanary === false &&
    inventoryAnalysis.stagingOnly === true &&
    inventoryAnalysis.authorization?.independentJudgmentPacketPreparation === false &&
    inventoryAnalysis.authorization?.independentJudgmentModelExecution === false &&
    inventoryAnalysis.activePolicy?.version === "v2.2" &&
    inventoryAnalysis.activePolicy
      ?.agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    inventoryAnalysis.activePolicy?.scorePassesMaximum === 1 &&
    inventoryAnalysis.validatedInventoryContract
      ?.planAndSideIsolationPreserved === true &&
    inventoryAnalysis.validatedInventoryContract
      ?.fallbackAppliedOnlyToRetainedOrphanReply === true &&
    inventoryAnalysis.validatedInventoryContract?.scoreFieldsAvailable ===
      false &&
    inventoryAnalysis.audit?.everyLockedInventoryValidated === true &&
    inventoryAnalysis.audit?.everyLockedMoveUsesExactSourceEvidence === true &&
    inventoryAnalysis.totals?.debates === 10 &&
    inventoryAnalysis.totals?.moves === 180 &&
    inventoryAnalysis.totals?.belowHighAttributionMoves === 2 &&
    inventoryAnalysis.totals?.chronologyFallbacks === 4 &&
    inventoryAnalysis.audit?.zeroLexicalTokenSourceRowPreserved === true &&
    inventoryAnalysis.audit?.exactSourceRowsInjectedOmittedOrRewritten ===
      false &&
    inventoryAnalysis.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    inventoryAnalysis.sourceCompatibility?.sourceRowsInjected === 0 &&
    inventoryAnalysis.sourceCompatibility?.sourceRowsOmitted === 0 &&
    inventoryAnalysis.sourceCompatibility?.sourceRowsRewritten === 0 &&
    inventoryAnalysis.sourceCompatibility
      ?.minimumCandidateLexicalTokensChanged === false &&
    inventoryAnalysis.sourceCompatibility?.occurrences?.length === 0 &&
    standingAuthorization.record.authorization
      .independentJudgmentPreparationAndModelExecution === true &&
    inventoryAnalysis.nextAuthorizedAction ===
      "prepare-freeze-and-activate-batch-09-independent-judgment-contexts-under-standing-authorization",
  "the Batch 9 inventory gate is not ready for the separately authorized independent-judgment packet preparation"
);
assertV4(
  inventoryPreparation.status ===
      "post-canary-batch-09-candidate-sharded-source-assets-and-ten-planner-packets-frozen" &&
    inventoryPreparation.developmentValidationOnly === false &&
    inventoryPreparation.productionCanary === false &&
    inventoryPreparation.stagingOnly === true &&
    inventoryPreparation.contexts?.length === 10,
  "the Batch 9 inventory preparation is unavailable"
);
assertV4(
  sourcePreparation.status ===
      "post-canary-batch-09-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
    sourcePreparation.developmentValidationOnly === false &&
    sourcePreparation.stagingOnly === true &&
    sourcePreparation.contexts?.length === 10 &&
    canonicalJson(sourcePreparation.tokenLedgerCompatibility) ===
      canonicalJson(inventoryAnalysis.sourceCompatibility),
  "the Batch 9 source preparation is unavailable"
);
assertV4(
  sourceValidation.status ===
      "post-canary-batch-09-score-blind-source-packet-validation-passed-frozen-under-standing-authorization" &&
    sourceValidation.totals?.debates === 10 &&
    sourceValidation.totals?.modelContextsExecuted === 0 &&
    sourceValidation.totals?.paidServiceCalls === 0 &&
    sourceValidation.totals?.scoresDerived === 0 &&
    sourceValidation.checks?.exactZeroLexicalTokenHandlingReplayed ===
      true &&
    sourceValidation.checks?.exactSourceRowsInjectedOmittedOrRewritten ===
      false,
  "the Batch 9 source validation is unavailable"
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
  cohortSelection.status ===
      "ninth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    cohortSelection.developmentValidationOnly === false &&
    cohortSelection.stagingOnly === true &&
    cohortSelection.selected?.map((item) => item.debateNumber).join(",") ===
      EXPECTED_DEBATES.join(",") &&
    cohortSelection.authorization?.independentJudgmentModelExecution ===
      false &&
    cohortSelection.authorization?.productionMutation === false,
  "the frozen Batch 9 cohort boundary changed"
);
assertV4(
  inventoryAnalysis.debates.map((debate) => debate.debateNumber).join(",") ===
    EXPECTED_DEBATES.join(","),
  "the passed Batch 9 inventory debate order changed"
);
for (const [file, digest] of Object.entries(inventoryAnalysis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: inventory source drifted`);
}
if (shouldWrite) await mustNotExist(PREPARATION);

const sharedInputBytes = manualBytes.length;
const contexts = [];
for (const debate of inventoryAnalysis.debates) {
  const source = sourcePreparation.contexts.find(
    (context) => context.debateNumber === debate.debateNumber
  );
  const inventoryContext = inventoryPreparation.contexts.find(
    (context) => context.debateNumber === debate.debateNumber
  );
  assertV4(source && inventoryContext, `${debate.debateNumber}: frozen source context missing`);
  assertV4(
    source.debateId === debate.debateId && inventoryContext.debateId === debate.debateId,
    `${debate.debateNumber}: debate identity drifted`
  );
  assertV4(
    inventoryContext.lockedInventoryOutput === debate.lockedInventory,
    `${debate.debateNumber}: locked-inventory path drifted`
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
    readFile(source.packet),
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
    [sourceInputPacketBytes, source.packetSha256, "source input packet"],
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
    const compactPacket = makeV223CompactJudgmentPacket(
      lockedInventory,
      reviewerPass
    );
    const packet = compactPacket.packet;
    const packetBytes = compactJsonBytes(packet);
    const packetPath = `${ROOT}/judgment-packets/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`;
    const compactSchema = makeV223CompactJudgmentSchema({ packet });
    const schema = stripV223SchemaDescriptions(compactSchema.schema);
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
    assertV4(
      copiedInputBytes <= PROVEN_COPIED_INPUT_CEILING_BYTES,
      `${debate.debateNumber}/${reviewerPass}: independent-judgment context is ${copiedInputBytes} bytes and exceeds the proven 115 KB transport ceiling`
    );

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
      packetCompactionAudit: compactPacket.audit,
      schemaCompactionAudit: compactSchema.audit,
      judgmentOutput: `${ROOT}/judgments/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      rawOutput: `${ROOT}/raw-outputs/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      validationOutput: `${ROOT}/validations/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`,
      provenanceOutput: `${ROOT}/provenance/pass-${reviewerPass.toLowerCase()}/debate-${debate.debateNumber}.json`
    });
  }
}

assertV4(contexts.length === 20, "independent-judgment preparation must contain twenty contexts");
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 360,
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
    "1.0-assessment-production-post-canary-batch-09-independent-judgment-preparation",
  protocolId: PROTOCOL_ID,
  status: shouldWrite
    ? "twenty-post-canary-batch-09-independent-judgment-contexts-prepared-and-frozen"
    : "preview",
  preparedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    scope:
      "prepare, freeze, activate, and execute exactly twenty Batch 9 score-blind independent-judgment contexts under the frozen standing authorization",
    standingAuthorization: POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    thisArtifactActivatesModelExecution: false,
    directIncrementalCostUsdMaximum: 0,
    independentJudgmentPacketPreparationAuthorized: true,
    executionPreparationManifestAuthorized: true,
    independentJudgmentModelExecutionAuthorized: false,
    paidServicesAuthorized: false,
  },
  activePolicy: structuredClone(inventoryAnalysis.activePolicy),
  sourceCompatibility: structuredClone(
    inventoryAnalysis.sourceCompatibility
  ),
  validatedInventoryContract: structuredClone(
    inventoryAnalysis.validatedInventoryContract
  ),
  model: {
    ...V422116_MODEL,
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    meteredApiCostUsdMaximum: 0
  },
  inputs: {
    productionManifest: PRODUCTION_MANIFEST,
    productionManifestSha256: sha256(productionManifestBytes),
    cohortSelection: COHORT_SELECTION,
    cohortSelectionSha256: sha256(cohortSelectionBytes),
    inventoryAnalysis: INVENTORY_ANALYSIS,
    inventoryAnalysisSha256: sha256(inventoryAnalysisBytes),
    inventoryPreparation: INVENTORY_PREPARATION,
    inventoryPreparationSha256: sha256(inventoryPreparationBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    sourceValidation: SOURCE_VALIDATION,
    sourceValidationSha256: sha256(sourceValidationBytes),
    productionWorkflow: PRODUCTION_WORKFLOW,
    stageWorkflow: STAGE_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    rubric: RUBRIC,
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
    standingAuthorization: POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256
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
    failedProductionCanaryOutputsUnavailable: true,
    validationCohortOutputsUnavailable: true,
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
    identicalSchemaSubtreeInterningOnly: true,
    deterministicallyRedundantBurdenContactLabelsRemoved: true,
    validationKeywordsRemoved: 0,
    validationKeywordsRelaxed: 0,
    targetEnumsChanged: 0,
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
    unexpectedPaidService: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-post-canary-batch-09-independent-judgment-execution-preparation-manifest-model-free-only",
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
  pairedLockedInventoriesIdentical: true,
  authentication: preparation.model.authentication,
  modelContextsExecuted: 0,
  scoresDerived: 0,
  nextAuthorized: "independent-judgment-execution-manifest",
  independentJudgmentModelExecutionAuthorized: false,
  productionMutationAuthorized: false
}, null, 2));
