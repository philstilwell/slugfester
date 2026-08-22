#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER,
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ROOT,
  buildPostCanaryBatch05PublicationFinalization,
  validatePostCanaryBatch05PublicationFinalCandidate
} from "./lib/assessment-production-post-canary-batch-05-publication-finalization.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt =
  frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");

const COMPILATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/deterministic-publication-compilation";
const COMPILATION_PREPARATION = `${COMPILATION_ROOT}/preparation-manifest.json`;
const COMPILATION_ACTIVATION = `${COMPILATION_ROOT}/execution-activation.json`;
const COMPILATION_EXECUTION = `${COMPILATION_ROOT}/execution.json`;
const COMPILATION_ANALYSIS = `${COMPILATION_ROOT}/analysis.json`;
const COMPILATION_AUDIT = `${COMPILATION_ROOT}/compilation-audit.json`;
const IDENTITY = `${COMPILATION_ROOT}/production-identity-snapshot.json`;
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ROOT;
const COMPATIBILITY = `${ROOT}/compatibility-analysis.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const BUNDLE = `${ROOT}/output-bundle`;
const AUDIT = `${BUNDLE}/finalization-audit.json`;
const PREVIEW = `${BUNDLE}/previews/index.html`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const standingAuthorization =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();

if (shouldWrite) {
  for (const file of [COMPATIBILITY, PREPARATION]) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}

const [
  compilationPreparation,
  compilationActivation,
  compilationExecution,
  compilationAnalysis,
  compilationAudit,
  identities
] = await Promise.all([
  parse(COMPILATION_PREPARATION),
  parse(COMPILATION_ACTIVATION),
  parse(COMPILATION_EXECUTION),
  parse(COMPILATION_ANALYSIS),
  parse(COMPILATION_AUDIT),
  parse(IDENTITY)
]);

assertV4(
  compilationAnalysis.status ===
      "ten-debate-batch-05-deterministic-publication-compilation-passed" &&
    compilationAnalysis.authorization.publicationFinalizationPreparation === true &&
    compilationAnalysis.authorization.publicationFinalization === false &&
    compilationExecution.status ===
      "ten-debate-batch-05-deterministic-publication-compilation-passed" &&
    compilationExecution.deterministicCompilationPasses === 1 &&
    compilationExecution.reruns === 0 &&
    compilationAudit.status ===
      "passed-ten-debate-batch-05-deterministic-publication-compilation" &&
    canonicalJson(compilationAudit.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER) &&
    compilationAudit.rows.length === 10 &&
    compilationAudit.totals.sections === 49 &&
    compilationAudit.totals.moves === 187 &&
    compilationAudit.totals.modelAuthoredScores === 0 &&
    compilationAudit.totals.scoresRecalculated === false &&
    compilationAudit.productionMutationPerformed === false &&
    compilationAudit.nextBatchSelectionPerformed === false,
  "passing Batch 5 deterministic compilation evidence required"
);

const contexts = [];
const compatibilityRows = [];
const sourceChainFiles = [];
for (const debateNumber of POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER) {
  const compiledRow = compilationAudit.rows.find(
    (item) => item.debateNumber === debateNumber
  );
  const compilationContext = compilationActivation.contexts.find(
    (item) => item.debateNumber === debateNumber
  );
  const identity = identities.rows.find((item) => item.number === debateNumber);
  assertV4(
    compiledRow && compilationContext && identity,
    `${debateNumber}: Batch 5 finalization source context missing`
  );
  const [compiledBytes, output, packet] = await Promise.all([
    readFile(path.resolve(compiledRow.output)),
    parse(compilationContext.publicationOutput),
    parse(compilationContext.publicationPacket)
  ]);
  assertV4(
    sha256(compiledBytes) === compiledRow.outputSha256,
    `${debateNumber}: Batch 5 compiled input hash changed`
  );
  const compiled = JSON.parse(compiledBytes);
  const built = buildPostCanaryBatch05PublicationFinalization({
    compiled,
    compiledPath: compiledRow.output,
    compiledSha256: compiledRow.outputSha256,
    output,
    packet,
    identity
  });
  const validation = validatePostCanaryBatch05PublicationFinalCandidate({
    candidate: built.candidate,
    provenance: built.provenance,
    compiled,
    output,
    packet,
    identity
  });
  const finalCandidate = `${BUNDLE}/final-candidates/debate-${debateNumber}.json`;
  const provenance = `${BUNDLE}/provenance/debate-${debateNumber}.json`;
  contexts.push({
    debateNumber,
    debateId: compiledRow.debateId,
    compiledInput: compiledRow.output,
    compiledInputSha256: compiledRow.outputSha256,
    publicationOutput: compilationContext.publicationOutput,
    publicationOutputSha256: compilationContext.publicationOutputSha256,
    publicationPacket: compilationContext.publicationPacket,
    publicationPacketSha256: compilationContext.publicationPacketSha256,
    finalCandidate,
    provenance,
    expectedFinalCandidateSha256: sha256(
      Buffer.from(`${JSON.stringify(built.candidate, null, 2)}\n`)
    ),
    expectedProvenanceSha256: sha256(
      Buffer.from(`${JSON.stringify(built.provenance, null, 2)}\n`)
    ),
    validation
  });
  compatibilityRows.push({
    debateNumber,
    oneSidedDisplayRows: validation.oneSidedDisplayRows,
    overallBlunders: validation.overallBlunders,
    emptyReferenceLinks: validation.emptyOverallReferenceLinks,
    taggedReferenceLinks:
      validation.overallBlunders - validation.emptyOverallReferenceLinks
  });
  sourceChainFiles.push(
    packet.sourceChain.transcriptPath,
    packet.sourceChain.eventsPath,
    packet.sourceChain.localManifestPath
  );
}

const totals = compatibilityRows.reduce(
  (result, row) => ({
    oneSidedDisplayRows: result.oneSidedDisplayRows + row.oneSidedDisplayRows,
    overallBlunders: result.overallBlunders + row.overallBlunders,
    emptyReferenceLinks: result.emptyReferenceLinks + row.emptyReferenceLinks,
    taggedReferenceLinks: result.taggedReferenceLinks + row.taggedReferenceLinks
  }),
  {
    oneSidedDisplayRows: 0,
    overallBlunders: 0,
    emptyReferenceLinks: 0,
    taggedReferenceLinks: 0
  }
);
const compatibility = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-publication-finalization-compatibility-analysis",
  protocolId: POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "batch-05-production-compatibility-boundary-recorded",
  analyzedAt: frozenAt,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  observations: {
    optionalOverallReferenceLinksAlreadyAcceptedByCurrentValidator: true,
    batchRows: compatibilityRows,
    totals
  },
  findings: [
    {
      id: "batch-05-site-ledger-adapter-and-validator-route",
      description:
        "The live site validator recognizes adjudicated-consensus ledgers only through the earlier checkpoint-specific adapter schema, activation, and packet root; it cannot authenticate or replay Batch 5 ledgers without a separately frozen Batch 5 adapter route.",
      evidence: {
        debates: 10,
        sections: 49,
        moves: 187,
        oneSidedDisplayRows: totals.oneSidedDisplayRows,
        displayedRubric: "Slugfester Reassessment Rubric v2",
        batchFinalLedger:
          "docs/assessment-production/post-canary-continuation-v1/batch-05/final-ledger/final-ledger.json",
        batchScores:
          "docs/assessment-production/post-canary-continuation-v1/batch-05/score-pass/calculated-scores.json",
        currentValidator: "scripts/validate-debates.mjs",
        currentCheckpointAdapter:
          "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs"
      },
      blocksFinalizationStaging: false,
      blocksRenderingVerification: false,
      blocksProductionMutation: true,
      requiredRemedy:
        "A separately authorized production-compatibility plan must define, hash-lock, and test a Batch 5 site-ledger adapter and validator route without changing scores, prose, attribution, or the accepted optional-reference behavior."
    }
  ],
  authorization: {
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
const compatibilityBytes = Buffer.from(
  `${JSON.stringify(compatibility, null, 2)}\n`
);

const sourceFiles = [
  COMPILATION_PREPARATION,
  COMPILATION_ACTIVATION,
  COMPILATION_EXECUTION,
  COMPILATION_ANALYSIS,
  COMPILATION_AUDIT,
  IDENTITY,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-05/selection.json",
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  "docs/assessment-production/post-canary-continuation-v1/batch-05/final-ledger/final-ledger.json",
  "docs/assessment-production/post-canary-continuation-v1/batch-05/score-pass/calculated-scores.json",
  "src/app.js",
  "src/styles.css",
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/validate-debates.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-finalization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-finalization.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-finalization.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-finalization.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-finalization-preparation.mjs",
  ...contexts.flatMap((context) => [
    context.compiledInput,
    context.publicationOutput,
    context.publicationPacket
  ]),
  ...sourceChainFiles
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[COMPATIBILITY] = sha256(compatibilityBytes);

const futureOutputPaths = [ACTIVATION, EXECUTION, ANALYSIS, BUNDLE];
for (const file of futureOutputPaths) {
  assertV4(!(await exists(file)), `future Batch 5 finalization output exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-publication-finalization-preparation",
  protocolId: POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "frozen-post-canary-batch-05-publication-finalization-prepared-not-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION,
    scopeInterpretation:
      "Prepare, validate, freeze, activate, and execute the deterministic Batch 5 publication-finalization pass under the standing authorization.",
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    publicationFinalizationPreparation: true,
    publicationFinalizationActivation: false,
    publicationFinalization: false,
    modelExecution: false,
    paidServices: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    independentModelPassesWereIsolated: true,
    participantJudgmentWasScoreBlind: true,
    integerRoundedScoreTiesPermitted: true,
    contextsPlannedThisStage: 0
  },
  preservedControls: {
    exactModelLabel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    independentModelPassesWereIsolated: true,
    participantJudgmentWasScoreBlind: true,
    integerRoundedScoreTiesPermitted: true,
    integerRoundedTiePolicyPreserved: true,
    priorJudgmentsChanged: false,
    scoresChanged: false
  },
  costEstimate: {
    directIncrementalCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedFutureDeterministicExecutionWallMinutes: [0, 1]
  },
  inputs: {
    compilationPreparation: COMPILATION_PREPARATION,
    compilationActivation: COMPILATION_ACTIVATION,
    compilationExecution: COMPILATION_EXECUTION,
    compilationAnalysis: COMPILATION_ANALYSIS,
    compilationAudit: COMPILATION_AUDIT,
    identitySnapshot: IDENTITY,
    compatibilityAnalysis: COMPATIBILITY
  },
  explicitOrder: POST_CANARY_BATCH_05_PUBLICATION_FINALIZATION_ORDER,
  contexts,
  executionPolicy: {
    deterministicRepositoryFinalizationPassesMaximum: 1,
    rerunsMaximum: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    separateActivationRequired: true
  },
  finalizationPolicy: {
    iterateExplicitOrderArrayDirectly: true,
    validateAllTenCandidatesBeforeAtomicBundlePublication: true,
    onlyAllowedDisplayTransformation: "remove-stagingAudit",
    stagingAuditPreservedAsSeparateProvenance: true,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    scoresRecalculated: false,
    scorePassesMaximum: 0,
    modelAuthoredScores: 0,
    modelContexts: 0,
    localPreviewHarness: true,
    previewUsesPostCanaryBatch05StagingBanner: true,
    previewNoindex: true,
    previewLocalhostOnly: true,
    productionFilesWritable: false,
    rankingFilesWritable: false,
    productionLedgerFilesWritable: false,
    compatibilityRemediesWritable: false
  },
  aggregateExpectations: {
    debates: 10,
    sections: contexts.reduce(
      (sum, context) => sum + context.validation.sections,
      0
    ),
    moves: 187,
    oneSidedDisplayRows: totals.oneSidedDisplayRows,
    overallBlunders: totals.overallBlunders,
    emptyOverallReferenceLinks: totals.emptyReferenceLinks,
    modelContexts: 0,
    modelAuthoredScores: 0,
    scorePasses: 0,
    directIncrementalCostUsd: 0
  },
  compatibilityBoundary: {
    stagingFinalizationPermittedAfterSeparateActivation: true,
    renderingVerificationPermittedAfterFinalizationPasses: true,
    productionMutationBlocked: true,
    validatorMigrationAuthorized: false,
    productionLedgerPublicationAuthorized: false,
    blockers: compatibility.findings.map((finding) => finding.id)
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    explicitOrderMismatchBlocks: true,
    preexistingFutureOutputBlocks: true,
    separateActivationRequired: true,
    compiledReplayFailureBlocksEntireFinalization: true,
    finalCandidateReplayFailureBlocksEntireFinalization: true,
    displayFieldChangeBlocks: true,
    scoreDifferenceBlocks: true,
    scoreRecalculationBlocks: true,
    modelAuthoredScoreBlocks: true,
    partialOutputBundlePublicationBlocks: true,
    modelExecutionBlocks: true,
    paidServiceBlocks: true,
    renderingExecutionBlocks: true,
    validatorMigrationBlocks: true,
    productionLedgerPublicationBlocks: true,
    productionMutationBlocks: true,
    nextBatchSelectionBlocks: true
  },
  artifacts: {
    preparation: PREPARATION,
    compatibilityAnalysis: COMPATIBILITY,
    activation: ACTIVATION,
    execution: EXECUTION,
    analysis: ANALYSIS,
    outputBundle: BUNDLE,
    finalizationAudit: AUDIT,
    finalCandidates: contexts.map((context) => context.finalCandidate),
    provenance: contexts.map((context) => context.provenance),
    preview: PREVIEW
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    publicationFinalizationPreparation: true,
    publicationFinalizationActivation: false,
    publicationFinalization: false,
    modelExecution: false,
    paidServices: false,
    scoreRecalculation: false,
    renderingVerification: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  totals: {
    preparationManifests: 1,
    compatibilityAnalyses: 1,
    deterministicFinalizationPasses: 0,
    finalCandidatesWritten: 0,
    provenanceRecordsWritten: 0,
    previewFilesWritten: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    productionMutations: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction:
    "activate-and-execute-one-frozen-batch-05-deterministic-publication-finalization-pass-under-standing-authorization"
};

if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(COMPATIBILITY), compatibilityBytes);
  await writeFile(
    path.resolve(PREPARATION),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite
        ? manifest.status
        : "post-canary-batch-05-publication-finalization-preparation-preview",
      explicitOrder: manifest.explicitOrder,
      debates: manifest.aggregateExpectations.debates,
      sections: manifest.aggregateExpectations.sections,
      moves: manifest.aggregateExpectations.moves,
      productionMutationBlockers: manifest.compatibilityBoundary.blockers,
      modelContexts: 0,
      deterministicFinalizationPasses: 0,
      directIncrementalCostUsd: 0,
      finalCandidatesWritten: 0,
      previewWritten: false,
      productionMutation: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
