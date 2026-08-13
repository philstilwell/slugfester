#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT,
  buildCheckpointV22PublicationFinalization,
  validateCheckpointV22PublicationFinalCandidate
} from "./lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");

const compilationRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/deterministic-publication-compilation";
const compilationAnalysisPath = `${compilationRoot}/analysis.json`;
const compilationAuditPath = `${compilationRoot}/compilation-audit.json`;
const compilationActivationPath = `${compilationRoot}/execution-activation.json`;
const identityPath = `${compilationRoot}/production-identity-snapshot.json`;
const compatibilityPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/compatibility-analysis.json`;
const preparationPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution-activation.json`;
const executionPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution.json`;
const analysisPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/analysis.json`;
const bundleRoot = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/output-bundle`;
const finalizationAuditPath = `${bundleRoot}/finalization-audit.json`;
const previewPath = `${bundleRoot}/previews/index.html`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  for (const file of [compatibilityPath, preparationPath]) {
    assertV4(!(await exists(file)), `${file} already exists; preparation is immutable`);
  }
}
const [compilationAnalysis, compilationAudit, compilationActivation, identities] =
  await Promise.all([
    parse(compilationAnalysisPath),
    parse(compilationAuditPath),
    parse(compilationActivationPath),
    parse(identityPath)
  ]);
assertV4(
  compilationAnalysis.status ===
      "ten-debate-deterministic-publication-compilation-passed" &&
    compilationAnalysis.authorization.publicationFinalizationPlanPreparation === true &&
    compilationAnalysis.authorization.publicationFinalization === false &&
    compilationAudit.status ===
      "passed-ten-debate-deterministic-publication-compilation" &&
    canonicalJson(compilationAudit.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER) &&
    compilationAudit.rows.length === 10 &&
    compilationAudit.totals.moves === 188 &&
    compilationAudit.totals.modelAuthoredScores === 0 &&
    compilationAudit.totals.scoresRecalculated === false &&
    compilationAudit.productionMutationPerformed === false,
  "passing deterministic compilation evidence required"
);

const contexts = [];
const compatibilityRows = [];
const sourceChainFiles = [];
for (const debateNumber of CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER) {
  const compiledRow = compilationAudit.rows.find(
    (item) => item.debateNumber === debateNumber
  );
  const compilationContext = compilationActivation.contexts.find(
    (item) => item.debateNumber === debateNumber
  );
  const identity = identities.rows.find((item) => item.number === debateNumber);
  assertV4(
    compiledRow && compilationContext && identity,
    `${debateNumber}: finalization source context missing`
  );
  const [compiledBytes, output, packet] = await Promise.all([
    readFile(path.resolve(compiledRow.output)),
    parse(compilationContext.publicationOutput),
    parse(compilationContext.publicationPacket)
  ]);
  assertV4(
    sha256(compiledBytes) === compiledRow.outputSha256,
    `${debateNumber}: compiled input hash changed`
  );
  const compiled = JSON.parse(compiledBytes);
  const built = buildCheckpointV22PublicationFinalization({
    compiled,
    compiledPath: compiledRow.output,
    compiledSha256: compiledRow.outputSha256,
    output,
    packet,
    identity
  });
  const validation = validateCheckpointV22PublicationFinalCandidate({
    candidate: built.candidate,
    provenance: built.provenance,
    compiled,
    output,
    packet,
    identity
  });
  const finalCandidate = `${bundleRoot}/final-candidates/debate-${debateNumber}.json`;
  const provenance = `${bundleRoot}/provenance/debate-${debateNumber}.json`;
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

const totalBlunders = compatibilityRows.reduce(
  (sum, row) => sum + row.overallBlunders,
  0
);
const emptyReferenceLinks = compatibilityRows.reduce(
  (sum, row) => sum + row.emptyReferenceLinks,
  0
);
const compatibility = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-compatibility-analysis",
  protocolId: CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "production-mutation-compatibility-blockers-recorded",
  analyzedAt: frozenAt,
  productionCanary: true,
  stagingOnly: true,
  findings: [
    {
      id: "optional-overall-reference-links",
      description:
        "The active publication contract permits no fallacy or bias tag when none materially applies, but the current site validator requires every Overall Commentary blunder to contain at least one reference link.",
      evidence: {
        debates: 10,
        overallBlunders: totalBlunders,
        emptyReferenceLinks,
        taggedReferenceLinks: totalBlunders - emptyReferenceLinks,
        byDebate: compatibilityRows,
        currentValidator: "scripts/validate-debates.mjs:317",
        activeContract: "docs/assessment-production-workflow.md:47"
      },
      blocksFinalizationStaging: false,
      blocksRenderingVerification: false,
      blocksProductionMutation: true,
      requiredRemedy:
        "A separately authorized production-mutation plan must allow zero reference links while retaining full validation for any supplied link; it must not synthesize or force tags."
    },
    {
      id: "checkpoint-ledger-schema-adapter",
      description:
        "The current site validator routes the displayed Rubric v2 label to the legacy calculateV2Ledger shape, while this canary uses the promoted adjudicated-consensus raw ledger and v2.2 score-stability controls.",
      evidence: {
        debates: 10,
        displayedRubric: "Slugfester Reassessment Rubric v2",
        checkpointFinalLedger:
          "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json",
        checkpointScores:
          "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json",
        currentValidator: "scripts/validate-debates.mjs:101-137",
        currentCalculator: "scripts/lib/reassessment-scoring.mjs:82"
      },
      blocksFinalizationStaging: false,
      blocksRenderingVerification: false,
      blocksProductionMutation: true,
      requiredRemedy:
        "A separately authorized production-mutation plan must define and test a checkpoint-specific per-debate ledger adapter and validator without relabeling the model, rubric, or score protocol."
    }
  ],
  authorization: {
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false
  }
};
const compatibilityBytes = Buffer.from(
  `${JSON.stringify(compatibility, null, 2)}\n`
);

const sourceFiles = [
  compilationAnalysisPath,
  compilationAuditPath,
  compilationActivationPath,
  identityPath,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json",
  "src/app.js",
  "src/styles.css",
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/validate-debates.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-scores.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-publication-finalization.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-publication-finalization.mjs",
  "scripts/run-assessment-production-checkpoint-v2.2-publication-finalization.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-publication-finalization-preparation.mjs",
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
sourceHashes[compatibilityPath] = sha256(compatibilityBytes);

const futureOutputPaths = [activationPath, executionPath, analysisPath, bundleRoot];
for (const file of futureOutputPaths) {
  assertV4(!(await exists(file)), `future finalization output already exists: ${file}`);
}
const manifest = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-preparation",
  protocolId: CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "publication-finalization-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    participantJudgmentWasScoreBlind: true
  },
  costEstimate: {
    directCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedExecutionWallMinutes: [0, 1]
  },
  inputs: {
    compilationAnalysis: compilationAnalysisPath,
    compilationAudit: compilationAuditPath,
    compilationActivation: compilationActivationPath,
    identitySnapshot: identityPath,
    compatibilityAnalysis: compatibilityPath
  },
  explicitOrder: CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  contexts,
  finalizationPolicy: {
    iterateExplicitOrderArrayDirectly: true,
    validateAllTenCandidatesBeforeAtomicBundlePublication: true,
    onlyAllowedDisplayTransformation: "remove-stagingAudit",
    stagingAuditPreservedAsSeparateProvenance: true,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    scoresRecalculated: false,
    modelAuthoredScores: 0,
    modelContexts: 0,
    localPreviewHarness: true,
    previewUsesPublicationStagingBanner: true,
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
    moves: 188,
    overallBlunders: totalBlunders,
    emptyOverallReferenceLinks: emptyReferenceLinks,
    modelContexts: 0,
    modelAuthoredScores: 0,
    directCostUsd: 0
  },
  compatibilityBoundary: {
    stagingFinalizationPermitted: true,
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
    compiledReplayFailureBlocksEntireFinalization: true,
    finalCandidateReplayFailureBlocksEntireFinalization: true,
    displayFieldChangeBlocks: true,
    scoreDifferenceBlocks: true,
    modelAuthoredScoreBlocks: true,
    partialOutputBundlePublicationBlocks: true,
    modelExecutionBlocks: true,
    validatorMigrationBlocks: true,
    productionLedgerPublicationBlocks: true,
    renderingExecutionBlocks: true,
    productionMutationBlocks: true,
    remainingProductionBatchesBlock: true
  },
  artifacts: {
    preparation: preparationPath,
    compatibilityAnalysis: compatibilityPath,
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    outputBundle: bundleRoot,
    finalizationAudit: finalizationAuditPath,
    finalCandidates: contexts.map((context) => context.finalCandidate),
    provenance: contexts.map((context) => context.provenance),
    preview: previewPath
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    publicationFinalizationExecutionActivation: false,
    publicationFinalization: false,
    renderingVerificationPlanPreparation: false,
    renderingVerification: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "user-decision-on-publication-finalization-execution-activation"
};

if (shouldWrite) {
  await mkdir(path.resolve(CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT), {
    recursive: true
  });
  await writeFile(path.resolve(compatibilityPath), compatibilityBytes);
  await writeFile(
    path.resolve(preparationPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: shouldWrite
    ? manifest.status
    : "publication-finalization-plan-preview",
  debates: manifest.aggregateExpectations.debates,
  sections: manifest.aggregateExpectations.sections,
  moves: manifest.aggregateExpectations.moves,
  productionMutationBlockers: manifest.compatibilityBoundary.blockers,
  modelContexts: 0,
  directCostUsd: 0,
  finalCandidatesWritten: false,
  previewWritten: false,
  productionMutation: false,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
