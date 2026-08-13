#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { publishedDebates } from "../src/data/debates.js";
import {
  validateCheckpointV22SiteLedgerAdapter
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";
import {
  CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER,
  CHECKPOINT_V22_PRODUCTION_MUTATION_PROTOCOL_ID,
  CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT,
  buildDebatesProjection,
  publicProjectionRecord,
  renderSeoOutputsInMemory,
  serializedJson,
  sha256,
  summarizeSeoProjection
} from "./lib/assessment-production-checkpoint-v2.2-production-mutation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const frozenAtIndex = args.indexOf("--frozen-at");
const requestedFrozenAt =
  frozenAtIndex >= 0 ? args[frozenAtIndex + 1] : null;
const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const fileSha256 = async (relativePath) =>
  sha256(await readFile(resolve(relativePath)));

const paths = {
  root: CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT,
  packet: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/mutation-packet.json`,
  preparation: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/preparation-manifest.json`,
  analysis: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/analysis.json`,
  futureActivation: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/execution-activation.json`,
  futureExecution: `${CHECKPOINT_V22_PRODUCTION_MUTATION_ROOT}/execution.json`,
  productionDebates: "src/data/debates.js",
  productionLedgerRoot: "docs/assessment-ledgers",
  candidateRoot:
    "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/output-bundle/final-candidates",
  stagedLedgerRoot:
    "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy/output-bundle/staged-ledgers",
  baselineAnalysis:
    "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy/repository-baseline-remedy/analysis.json",
  baselineExecution:
    "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy/repository-baseline-remedy/execution.json",
  compatibilityAnalysis:
    "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy/analysis.json",
  publicationAnalysis:
    "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/analysis.json",
  finalizationAudit:
    "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/output-bundle/finalization-audit.json",
  renderingAnalysis:
    "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9/analysis.json",
  workflow: "docs/assessment-production-workflow.md",
  activeValidator: "scripts/validate-debates.mjs",
  seoGenerator: "scripts/generate-seo-pages.mjs",
  seoLibrary: "src/seo.js",
  interlocutors: "src/data/interlocutors.js",
  references: "src/data/references.js",
  compatibilityLibrary:
    "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  projectionLibrary:
    "scripts/lib/assessment-production-checkpoint-v2.2-production-mutation.mjs",
  preparationScript:
    "scripts/prepare-assessment-production-checkpoint-v2.2-production-mutation.mjs",
  preparationTest:
    "scripts/test-assessment-production-checkpoint-v2.2-production-mutation-preparation.mjs",
  package: "package.json"
};

const existingPreparation = (await exists(paths.preparation))
  ? await readJson(paths.preparation)
  : null;
const frozenAt = existingPreparation?.frozenAt ?? requestedFrozenAt;
assertV4(
  typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)),
  "a stable --frozen-at ISO timestamp is required for the first preparation write"
);

const [
  baselineAnalysis,
  baselineExecution,
  compatibilityAnalysis,
  publicationAnalysis,
  finalizationAudit,
  renderingAnalysis,
  productionSource
] = await Promise.all([
  readJson(paths.baselineAnalysis),
  readJson(paths.baselineExecution),
  readJson(paths.compatibilityAnalysis),
  readJson(paths.publicationAnalysis),
  readJson(paths.finalizationAudit),
  readJson(paths.renderingAnalysis),
  readFile(resolve(paths.productionDebates), "utf8")
]);

assertV4(
  baselineAnalysis.status ===
      "debate-167-corpus-audit-baseline-remedy-passed-compatibility-acceptance-restored" &&
    baselineAnalysis.compatibilityGate.repositoryAcceptancePassed &&
    baselineAnalysis.compatibilityGate
      .productionMutationReadyForSeparatePlanningDecision &&
    baselineAnalysis.authorization.productionMutationPlanPreparation === false &&
    baselineAnalysis.authorization.productionMutation === false,
  "repository baseline remedy does not authorize a separate production-mutation plan decision"
);
assertV4(
  baselineExecution.status ===
      "debate-167-corpus-audit-baseline-remedy-executed-repository-acceptance-passed" &&
    baselineExecution.tests.repositoryCheck.status === "passed" &&
    baselineExecution.authorization.compatibilityAcceptanceRestored,
  "passed repository baseline execution is required"
);
assertV4(
  compatibilityAnalysis.status ===
      "compatibility-remedy-passed-repository-acceptance-blocked" &&
    compatibilityAnalysis.findings
      .filter((finding) => finding.remedyPassed)
      .every((finding) => finding.productionMutationUnblockedByFinding) &&
    compatibilityAnalysis.totals.compatibilityFindingsPassed === 2 &&
    !compatibilityAnalysis.authorization.productionMutation,
  "the two passed compatibility remedies are required"
);
assertV4(
  publicationAnalysis.status === "ten-debate-publication-finalization-passed" &&
    publicationAnalysis.gate.finalCandidatesPassed === 10 &&
    publicationAnalysis.gate.moves === 188 &&
    !publicationAnalysis.authorization.productionMutation,
  "passed ten-debate publication finalization is required"
);
assertV4(
  finalizationAudit.status === "passed-ten-debate-publication-finalization" &&
    finalizationAudit.productionMutationPerformed === false,
  "passed staging-only finalization audit is required"
);
assertV4(
  renderingAnalysis.status ===
      "ninth-replacement-rendering-verification-passed" &&
    renderingAnalysis.gate.debatesPassed === 10 &&
    renderingAnalysis.gate.viewportResultsPassed === 20 &&
    renderingAnalysis.decision.renderingGatePassed &&
    !renderingAnalysis.authorization.productionMutation,
  "passed ten-debate rendering verification is required"
);
assertV4(
  publishedDebates.length === 195,
  "production debate baseline count changed"
);

const candidatesByNumber = new Map();
const inputRecords = [];
for (const debateNumber of CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER) {
  const candidatePath = `${paths.candidateRoot}/debate-${debateNumber}.json`;
  const candidateBytes = await readFile(resolve(candidatePath));
  const candidate = JSON.parse(candidateBytes);
  const stagedLedgerPath = `${paths.stagedLedgerRoot}/${candidate.id}.json`;
  const stagedLedgerBytes = await readFile(resolve(stagedLedgerPath));
  const stagedLedger = JSON.parse(stagedLedgerBytes);
  const productionLedgerPath = `${paths.productionLedgerRoot}/${candidate.id}.json`;
  assertV4(
    !(await exists(productionLedgerPath)),
    `${debateNumber}: production ledger already exists; planning baseline changed`
  );
  const validation = validateCheckpointV22SiteLedgerAdapter({
    adapter: stagedLedger,
    candidate,
    expectedSourceLocks: stagedLedger.sourceLocks
  });
  assertV4(
    validation.repositoryScoreReplayPassed &&
      candidate.assessmentModel === "5.6 Sol" &&
      candidate.assessmentRubric === "Slugfester Reassessment Rubric v2" &&
      stagedLedger.model === "5.6 Sol" &&
      stagedLedger.rubric === "Slugfester Reassessment Rubric v2" &&
      stagedLedger.scoreProtocolId ===
        "assessment-production-checkpoint-v2.2-1-single-deterministic-score-pass",
    `${debateNumber}: frozen candidate or staged ledger controls changed`
  );
  candidatesByNumber.set(debateNumber, candidate);
  inputRecords.push({
    debateNumber,
    debateId: candidate.id,
    candidate: {
      path: candidatePath,
      bytes: candidateBytes.byteLength,
      sha256: sha256(candidateBytes)
    },
    stagedLedger: {
      path: stagedLedgerPath,
      bytes: stagedLedgerBytes.byteLength,
      sha256: sha256(stagedLedgerBytes)
    },
    productionLedger: {
      path: productionLedgerPath,
      baselineExists: false,
      exactCopyFromStagedLedgerRequired: true
    },
    scoreReplayPassed: validation.repositoryScoreReplayPassed
  });
}

const debatesProjection = buildDebatesProjection({
  source: productionSource,
  currentDebates: publishedDebates,
  candidatesByNumber
});
const [beforeSeoOutputs, afterSeoOutputs] = await Promise.all([
  renderSeoOutputsInMemory({ root, debates: publishedDebates, tag: "before" }),
  renderSeoOutputsInMemory({
    root,
    debates: debatesProjection.projectedDebates,
    tag: "projected-after"
  })
]);
const seoProjection = summarizeSeoProjection({
  beforeOutputs: beforeSeoOutputs,
  afterOutputs: afterSeoOutputs
});
const expectedChangedSeoPaths = [
  "src/data/debate-summaries.js",
  ...inputRecords.map(
    (record) => `debate/${record.debateId}/index.html`
  ),
  "sitemap.xml"
].sort();
assertV4(
  canonicalJson(seoProjection.changedOutputs.map((output) => output.path)) ===
    canonicalJson(expectedChangedSeoPaths),
  "projected SEO output set differs from the exact expected twelve files"
);

let checkedCurrentSeoOutputs = 0;
for (const [outputPath, expectedContent] of beforeSeoOutputs) {
  const actualContent = await readFile(resolve(outputPath), "utf8");
  assertV4(
    actualContent === expectedContent,
    `${outputPath}: current generated SEO baseline is stale`
  );
  checkedCurrentSeoOutputs += 1;
}

const staticFrozenSources = [
  paths.baselineAnalysis,
  paths.baselineExecution,
  paths.compatibilityAnalysis,
  paths.publicationAnalysis,
  paths.finalizationAudit,
  paths.renderingAnalysis,
  paths.workflow,
  paths.productionDebates,
  paths.activeValidator,
  paths.seoGenerator,
  paths.seoLibrary,
  paths.interlocutors,
  paths.references,
  paths.compatibilityLibrary,
  paths.projectionLibrary,
  paths.preparationScript,
  paths.preparationTest,
  paths.package
];
const frozenSourcePaths = [
  ...new Set([
    ...staticFrozenSources,
    ...inputRecords.flatMap((record) => [
      record.candidate.path,
      record.stagedLedger.path
    ]),
    ...seoProjection.changedOutputs.map((output) => output.path)
  ])
].sort();
const frozenSources = Object.fromEntries(
  await Promise.all(
    frozenSourcePaths.map(async (sourcePath) => [
      sourcePath,
      await fileSha256(sourcePath)
    ])
  )
);

const projectionByNumber = new Map(
  debatesProjection.records.map((record) => [record.debateNumber, record])
);
const debateRecords = inputRecords.map((input) => ({
  ...input,
  productionDebateProjection: publicProjectionRecord(
    projectionByNumber.get(input.debateNumber)
  )
}));
const totals = {
  debates: debateRecords.length,
  sourceDebateObjectsReplaced: debateRecords.length,
  sourceDebateObjectsUnchanged:
    debatesProjection.sourceProof.unchangedDebateObjects,
  productionLedgersAdded: debateRecords.length,
  sections: debateRecords.reduce(
    (sum, record) => sum + record.productionDebateProjection.sections,
    0
  ),
  moves: debateRecords.reduce(
    (sum, record) => sum + record.productionDebateProjection.moves,
    0
  ),
  overallScores: debateRecords.length * 2,
  integerRoundedTies: debateRecords.filter((record) => {
    const score = record.productionDebateProjection.proposedScore;
    return score.pro === score.con;
  }).length,
  generatedSeoOutputsChecked: checkedCurrentSeoOutputs,
  generatedSeoOutputsChanged: seoProjection.changedOutputs.length,
  generatedSeoOutputsUnchanged: seoProjection.unchangedOutputs,
  exactProductionPathsPlanned:
    1 + debateRecords.length + seoProjection.changedOutputs.length,
  judgmentModelContexts: 0,
  scorePassesRerun: 0,
  meteredApiCostUsd: 0,
  productionMutations: 0
};
assertV4(
  totals.sections === 51 &&
    totals.moves === 188 &&
    totals.overallScores === 20 &&
    totals.integerRoundedTies === 2 &&
    totals.generatedSeoOutputsChecked === 380 &&
    totals.generatedSeoOutputsChanged === 12 &&
    totals.generatedSeoOutputsUnchanged === 368 &&
    totals.exactProductionPathsPlanned === 23,
  "production-mutation plan totals drifted"
);

const exactProductionPaths = [
  paths.productionDebates,
  ...debateRecords.map((record) => record.productionLedger.path),
  ...seoProjection.changedOutputs.map((output) => output.path)
];
assertV4(
  new Set(exactProductionPaths).size === exactProductionPaths.length,
  "production-mutation path set contains duplicates"
);

const packet = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-ten-debate-production-mutation-plan-packet",
  protocolId: CHECKPOINT_V22_PRODUCTION_MUTATION_PROTOCOL_ID,
  status: "ten-debate-production-mutation-plan-packet-frozen",
  frozenAt,
  productionCanary: true,
  planningOnly: true,
  baseline: {
    gitCommit: "c89f502a8a18af80cae4348bb08f562f348d6213",
    branch: "main",
    repositoryAcceptancePassed: true,
    productionDebates: {
      path: paths.productionDebates,
      bytes: debatesProjection.sourceProof.beforeBytes,
      sha256: debatesProjection.sourceProof.beforeSha256
    },
    productionLedgerTargetsAbsent: debateRecords.length,
    generatedSeoOutputsCurrentAndExact: checkedCurrentSeoOutputs
  },
  transformation: {
    debateOrder: CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER,
    productionDebates: {
      method:
        "Replace only each frozen top-level debate object span with the corresponding final candidate serialized by JSON.stringify(candidate, null, 2), adding two spaces after every newline so array indentation remains exact; preserve every byte outside those ten spans.",
      proof: debatesProjection.sourceProof
    },
    productionLedgers: {
      method:
        "Copy each frozen staged checkpoint adapter byte-for-byte to its absent production ledger path.",
      exactCopies: debateRecords.length
    },
    generatedSeo: {
      method:
        "Project the repository SEO generator in memory with the exact prospective debate array, require the current generator to match all existing outputs, then write only the twelve outputs whose bytes differ.",
      generator: paths.seoGenerator,
      generatedOutputs: seoProjection.generatedOutputs,
      changedOutputs: seoProjection.changedOutputs,
      unchangedOutputs: seoProjection.unchangedOutputs,
      unchangedOutputsManifestSha256:
        seoProjection.unchangedOutputsManifestSha256
    }
  },
  debates: debateRecords,
  exactProductionPaths,
  validationPlan: {
    preflight: [
      "verify every frozen source hash and exact baseline output hash",
      "verify all ten production ledger targets remain absent",
      "replay all ten staged adapters and all 188 move scores",
      "recompute the exact production-source and SEO projections",
      "run npm run check before any production write"
    ],
    postWrite: [
      "verify src/data/debates.js has the exact projected SHA-256 hash",
      "verify all ten published objects are deeply equal to their frozen final candidates",
      "verify the other 185 debate objects remain byte-equivalent",
      "verify all ten production ledgers are byte-identical to their staged adapters",
      "verify exactly twelve generated SEO outputs changed and 368 remained byte-identical",
      "run node scripts/validate-debates.mjs",
      "run node scripts/generate-seo-pages.mjs --check",
      "run node scripts/validate-corpus-transcripts.mjs",
      "run npm run check"
    ],
    renderingEvidenceReuse: {
      path: paths.renderingAnalysis,
      reason:
        "The previously passed 20-viewport verification rendered these exact final candidates; post-write deep equality proves production uses the same objects."
    }
  },
  rollbackBoundary: {
    beforeCommit:
      "If any write or validation fails, restore only the thirteen existing changed paths from their exact frozen baseline bytes and remove only the ten newly created production ledgers; then rerun npm run check.",
    existingPathsRestored: 13,
    newlyCreatedPathsRemoved: 10,
    unrelatedPathsMayBeTouched: false,
    commitAllowedOnlyAfterAllChecksPass: true,
    pushAllowedOnlyAfterCommitSucceeds: true,
    pushFailureHandling:
      "Keep the verified local commit intact, report that remote publication did not occur, and do not begin another batch."
  },
  authorization: {
    productionMutationPlanPreparation: true,
    productionMutationExecutionActivation: false,
    productionMutationExecution: false,
    productionLedgerPublication: false,
    productionDebatesChange: false,
    generatedSeoPublication: false,
    remainingProductionBatches: false
  }
};
const packetBytes = serializedJson(packet);

const preparation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-ten-debate-production-mutation-preparation-manifest",
  protocolId: CHECKPOINT_V22_PRODUCTION_MUTATION_PROTOCOL_ID,
  status: "ten-debate-production-mutation-plan-prepared-and-frozen",
  frozenAt,
  productionCanary: true,
  planningOnly: true,
  scope: {
    debateOrder: CHECKPOINT_V22_PRODUCTION_MUTATION_ORDER,
    exactProductionPaths,
    exactProductionPathCount: exactProductionPaths.length,
    description:
      "Freeze the exact ten-debate source replacements, ten production-ledger copies, twelve mechanically dependent SEO outputs, validation gates, and rollback boundary without changing production."
  },
  invariants: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlindnessOfCompletedIndependentJudgmentsPreserved: true,
    integerRoundedTiesAllowed: true,
    oneCompletedScorePassOnly: true,
    judgmentExecutionAllowed: false,
    scoreRerunAllowed: false,
    scoreChangeAllowed: false,
    proseRewriteAllowed: false,
    syntheticReferenceAllowed: false,
    remainingProductionBatchesAllowed: false
  },
  gateEvidence: {
    repositoryBaselineRemedy: paths.baselineAnalysis,
    compatibilityRemedy: paths.compatibilityAnalysis,
    publicationFinalization: paths.publicationAnalysis,
    renderingVerification: paths.renderingAnalysis
  },
  artifacts: {
    mutationPacket: {
      path: paths.packet,
      bytes: Buffer.byteLength(packetBytes),
      sha256: sha256(packetBytes)
    },
    preparation: paths.preparation,
    analysis: paths.analysis,
    futureActivation: paths.futureActivation,
    futureExecution: paths.futureExecution
  },
  frozenSources,
  totals,
  stagedExecutionPlan: [
    {
      stage: 1,
      name: "separate-production-mutation-execution-activation",
      separateAuthorizationRequired: true,
      allowedWrites: [paths.futureActivation],
      productionMutation: false
    },
    {
      stage: 2,
      name: "atomic-ten-debate-production-mutation",
      separateAuthorizationRequiredAfterActivation: true,
      allowedWrites: [
        ...exactProductionPaths,
        paths.futureExecution,
        paths.analysis
      ],
      exactProductionWrites: exactProductionPaths.length,
      productionMutation: true,
      rollbackBoundary: packet.rollbackBoundary
    }
  ],
  authorization: {
    productionMutationPlanPreparation: true,
    productionMutationExecutionActivation: true,
    productionMutationExecution: false,
    productionLedgerPublication: false,
    productionDebatesChange: false,
    generatedSeoPublication: false,
    remainingProductionBatches: false
  },
  stopRules: {
    separateExecutionActivationRequired: true,
    exactBaselineHashMismatchStops: true,
    candidateOrStagedLedgerHashMismatchStops: true,
    existingProductionLedgerStops: true,
    projectionHashMismatchStops: true,
    generatedOutputSetMismatchStops: true,
    unexpectedWriteStops: true,
    validationFailureTriggersBoundedRollback: true,
    judgmentExecutionForbidden: true,
    scoreRerunForbidden: true,
    scoreChangeForbidden: true,
    proseRewriteForbidden: true,
    syntheticReferenceForbidden: true,
    remainingProductionBatchesForbidden: true
  },
  nextAuthorizedAction:
    "user-decision-on-ten-debate-production-mutation-execution-activation"
};
const preparationBytes = serializedJson(preparation);

const analysis = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-ten-debate-production-mutation-preparation-analysis",
  protocolId: CHECKPOINT_V22_PRODUCTION_MUTATION_PROTOCOL_ID,
  status: "ten-debate-production-mutation-plan-freeze-passed",
  productionCanary: true,
  planningOnly: true,
  preparation: {
    path: paths.preparation,
    bytes: Buffer.byteLength(preparationBytes),
    sha256: sha256(preparationBytes)
  },
  mutationPacket: preparation.artifacts.mutationPacket,
  checks: {
    repositoryBaselineAcceptancePassed: true,
    compatibilityAcceptancePassed: true,
    publicationFinalizationPassed: true,
    priorRenderingVerificationPassed: true,
    finalCandidatesHashLocked: debateRecords.length,
    stagedLedgersHashLockedAndReplayed: debateRecords.length,
    targetProductionLedgersAbsent: debateRecords.length,
    sourceProjectionEvaluated: true,
    projectedCandidatesDeepEqual: debateRecords.length,
    unchangedProductionDebateObjectsByteLocked:
      debatesProjection.sourceProof.unchangedDebateObjects,
    currentSeoOutputsMatchedGenerator: checkedCurrentSeoOutputs,
    exactChangedSeoOutputsProjected: seoProjection.changedOutputs.length,
    productionFilesChanged: 0,
    productionMutationPerformed: false
  },
  projectedProduction: {
    sourceSha256: debatesProjection.sourceProof.projectedAfterSha256,
    ledgers: debateRecords.length,
    generatedSeoOutputsChanged: seoProjection.changedOutputs.length,
    exactPaths: exactProductionPaths.length
  },
  totals,
  authorization: preparation.authorization,
  stopRules: preparation.stopRules,
  nextAuthorizedAction: preparation.nextAuthorizedAction
};
const analysisBytes = serializedJson(analysis);

if (write) {
  assertV4(
    !(await exists(paths.futureActivation)) &&
      !(await exists(paths.futureExecution)),
    "production-mutation execution artifact already exists; planning write blocked"
  );
  await mkdir(resolve(paths.root), { recursive: true });
  await writeFile(resolve(paths.packet), packetBytes);
  await writeFile(resolve(paths.preparation), preparationBytes);
  await writeFile(resolve(paths.analysis), analysisBytes);
} else {
  assertV4(existingPreparation, "stored production-mutation plan is missing");
  const [storedPacket, storedAnalysis] = await Promise.all([
    readFile(resolve(paths.packet), "utf8"),
    readJson(paths.analysis)
  ]);
  assertV4(
    storedPacket === packetBytes,
    "stored production-mutation packet differs from deterministic replay"
  );
  assertV4(
    canonicalJson(existingPreparation) === canonicalJson(preparation),
    "stored production-mutation preparation differs from deterministic replay"
  );
  assertV4(
    canonicalJson(storedAnalysis) === canonicalJson(analysis),
    "stored production-mutation analysis differs from deterministic replay"
  );
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      write,
      debates: totals.debates,
      moves: totals.moves,
      exactProductionPathsPlanned: totals.exactProductionPathsPlanned,
      generatedSeoOutputsProjected: totals.generatedSeoOutputsChanged,
      productionMutationPerformed: false,
      meteredApiCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
