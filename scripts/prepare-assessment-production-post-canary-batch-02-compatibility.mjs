#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_COMPATIBILITY_ORDER,
  POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID,
  POST_CANARY_BATCH_02_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION,
  buildPostCanaryBatch02SiteLedgerAdapter,
  serializedJson,
  sha256,
  validatePostCanaryBatch02SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-02-compatibility.mjs";
import {
  loadPostCanaryBatch02FinalLedgerInputs,
  validatePostCanaryBatch02FinalLedger
} from "./lib/assessment-production-post-canary-batch-02-final-ledger.mjs";
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
  preparation: `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/preparation-manifest.json`,
  analysis: `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/analysis.json`,
  activation: `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/execution.json`,
  stagedLedgerRoot:
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/output-bundle/staged-ledgers`,
  compatibility:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-finalization/compatibility-analysis.json",
  finalizationAudit:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-finalization/output-bundle/finalization-audit.json",
  finalLedger:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/final-ledger/final-ledger.json",
  scores:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/score-pass/calculated-scores.json",
  renderingAnalysis:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/rendering-verification/resumption-1/analysis.json",
  renderingAudit:
    "docs/assessment-production/post-canary-continuation-v1/batch-02/rendering-verification/resumption-1/rendering-audit.json",
  workflow: "docs/assessment-production-workflow.md",
  rubric: "docs/reassessment-rubric-v2.1.md",
  legacyWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
  activeValidator: "scripts/validate-debates.mjs",
  checkpointCompatibilityLibrary:
    "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  batch01CompatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-01-compatibility.mjs",
  batch01CompatibilityActivation:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1/execution-activation.json",
  batchFinalLedgerLibrary:
    "scripts/lib/assessment-production-post-canary-batch-02-final-ledger.mjs",
  compatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-02-compatibility.mjs",
  scoreCalculator: "scripts/lib/v4-lean-production.mjs",
  sourceCanonicalizer: "scripts/lib/v4220-source-span-rendering.mjs",
  activeScorePolicy:
    "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  preparationScript:
    "scripts/prepare-assessment-production-post-canary-batch-02-compatibility.mjs",
  preparationTest:
    "scripts/test-assessment-production-post-canary-batch-02-compatibility-preparation.mjs",
  references: "src/data/references.js",
  productionDebates: "src/data/debates.js"
};

const existingPreparation = (await exists(paths.preparation))
  ? await readJson(paths.preparation)
  : null;
const frozenAt = existingPreparation?.frozenAt ?? requestedFrozenAt;
assertV4(
  typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)),
  "a stable --frozen-at ISO timestamp is required for the first Batch 2 compatibility preparation write"
);

const [
  compatibility,
  finalizationAudit,
  finalLedger,
  scores,
  renderingAnalysis,
  renderingAudit,
  loadedInputs
] = await Promise.all([
  readJson(paths.compatibility),
  readJson(paths.finalizationAudit),
  readJson(paths.finalLedger),
  readJson(paths.scores),
  readJson(paths.renderingAnalysis),
  readJson(paths.renderingAudit),
  loadPostCanaryBatch02FinalLedgerInputs()
]);

assertV4(
  renderingAnalysis.status ===
      "ten-debate-batch-02-rendering-resumption-1-passed" &&
    renderingAnalysis.decision?.renderingGatePassed === true &&
    renderingAnalysis.decision.productionMutationRemainsBlocked === true &&
    renderingAnalysis.compatibilityBoundary?.productionMutationBlocked ===
      true &&
    renderingAnalysis.authorization?.compatibilityPlanPreparation === false &&
    renderingAnalysis.authorization.validatorMigration === false &&
    renderingAnalysis.authorization.productionMutation === false &&
    renderingAnalysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-02-production-compatibility-preparation-only",
  "Batch 2 rendering gate does not authorize compatibility planning only"
);
assertV4(
  renderingAudit.status ===
      "passed-ten-debate-batch-02-rendering-resumption-1" &&
    renderingAudit.debates === 10 &&
    renderingAudit.viewportResults === 20 &&
    renderingAudit.runtimeFailures === 0 &&
    renderingAudit.productionMutationPerformed === false,
  "passed Batch 2 rendering evidence audit required"
);
assertV4(
  compatibility.status ===
      "batch-02-production-compatibility-boundary-recorded" &&
    canonicalJson(compatibility.findings.map((finding) => finding.id)) ===
      canonicalJson(["batch-02-site-ledger-adapter-and-validator-route"]) &&
    compatibility.observations.optionalOverallReferenceLinksAlreadyAcceptedByCurrentValidator ===
      true &&
    compatibility.authorization.compatibilityRemedyPlanPreparation === false &&
    compatibility.authorization.validatorMigration === false &&
    compatibility.authorization.productionLedgerPublication === false &&
    compatibility.authorization.productionMutation === false,
  "frozen Batch 2 publication compatibility blocker required"
);
assertV4(
  finalizationAudit.status ===
      "passed-ten-debate-batch-02-publication-finalization" &&
    finalizationAudit.totals.deterministicFinalizationPasses === 1 &&
    finalizationAudit.totals.reruns === 0 &&
    finalizationAudit.totals.displayFieldsChanged === 0,
  "passed one-pass Batch 2 staging-only finalization audit required"
);
assertV4(
  scores.status ===
      "post-canary-batch-02-single-score-pass-stability-gate-passed" &&
    scores.totals.acceptancePassed &&
    scores.totals.scoringPasses === 1 &&
    scores.authorization.scoreRerun === false &&
    scores.authorization.productionMutation === false,
  "accepted one-pass Batch 2 score ledger required"
);
validatePostCanaryBatch02FinalLedger(
  finalLedger,
  loadedInputs.debateInputs,
  loadedInputs.sourceHashes
);

const finalByNumber = new Map(
  finalLedger.debates.map((debate) => [debate.debateNumber, debate])
);
const scoreByNumber = new Map(
  scores.debates.map((debate) => [debate.debateNumber, debate])
);
const inputByNumber = new Map(
  loadedInputs.debateInputs.map((input) => [
    input.primaryA.debateNumber,
    input
  ])
);
assertV4(
  finalLedger.debates.map((debate) => debate.debateNumber).join(",") ===
      POST_CANARY_BATCH_02_COMPATIBILITY_ORDER.join(",") &&
    scores.debates.map((debate) => debate.debateNumber).join(",") ===
      POST_CANARY_BATCH_02_COMPATIBILITY_ORDER.join(",") &&
    renderingAudit.rows.map((row) => row.debateNumber).join(",") ===
      POST_CANARY_BATCH_02_COMPATIBILITY_ORDER.join(","),
  "Batch 2 compatibility debate order changed"
);

const finalLedgerSha256 = await fileSha256(paths.finalLedger);
const calculatedScoresSha256 = await fileSha256(paths.scores);
const finalizationAuditSha256 = await fileSha256(paths.finalizationAudit);
const renderingAuditSha256 = await fileSha256(paths.renderingAudit);
const packetRecords = [];
for (const debateNumber of POST_CANARY_BATCH_02_COMPATIBILITY_ORDER) {
  const finalLedgerDebate = finalByNumber.get(debateNumber);
  const scoreDebate = scoreByNumber.get(debateNumber);
  const input = inputByNumber.get(debateNumber);
  const candidatePath =
    `docs/assessment-production/post-canary-continuation-v1/batch-02/` +
    `publication-finalization/output-bundle/final-candidates/debate-${debateNumber}.json`;
  const packetPath =
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/packets/debate-${debateNumber}.json`;
  const stagedLedgerPath =
    `${paths.stagedLedgerRoot}/${finalLedgerDebate.debateId}.json`;
  const productionLedgerPath =
    `docs/assessment-ledgers/${finalLedgerDebate.debateId}.json`;
  const candidateBytes = await readFile(resolve(candidatePath));
  const candidate = JSON.parse(candidateBytes);
  const eventsPath = input.sourcePacket.sourceChain.eventsPath;
  const sourceLocks = {
    finalLedgerSha256,
    calculatedScoresSha256,
    finalizationAuditSha256,
    renderingAuditSha256,
    finalCandidateSha256: sha256(candidateBytes),
    eventsPath,
    eventsSha256: await fileSha256(eventsPath),
    finalJudgmentSha256: sha256(
      serializedJson(finalLedgerDebate.finalJudgment)
    )
  };
  const adapter = buildPostCanaryBatch02SiteLedgerAdapter({
    finalLedgerDebate,
    scoreDebate,
    candidate,
    eventsDocument: input.eventsDocument,
    sourceLocks
  });
  const validation = validatePostCanaryBatch02SiteLedgerAdapter({
    adapter,
    candidate,
    expectedSourceLocks: sourceLocks
  });
  const adapterBytes = serializedJson(adapter);
  const packet = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-02-compatibility-plan-packet",
    protocolId: POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID,
    status: "frozen-post-canary-batch-02-compatibility-plan-packet",
    productionCanary: false,
    batchNumber: 2,
    planningOnly: true,
    debateNumber,
    debateId: finalLedgerDebate.debateId,
    sources: {
      candidate: candidatePath,
      finalLedger: paths.finalLedger,
      calculatedScores: paths.scores,
      finalizationAudit: paths.finalizationAudit,
      renderingAudit: paths.renderingAudit,
      events: eventsPath
    },
    sourceLocks,
    futurePaths: {
      stagedLedger: stagedLedgerPath,
      productionLedger: productionLedgerPath
    },
    proposedAdapterExactOutput: adapter,
    proposedAdapterBytes: Buffer.byteLength(adapterBytes),
    proposedAdapterSha256: sha256(adapterBytes),
    validation,
    authorization: {
      compatibilityExecution: false,
      validatorMigration: false,
      stagingLedgerWrite: false,
      productionLedgerPublication: false,
      productionMutation: false
    }
  };
  const packetBytes = serializedJson(packet);
  packetRecords.push({
    debateNumber,
    debateId: finalLedgerDebate.debateId,
    packetPath,
    packet,
    packetBytes,
    packetSha256: sha256(packetBytes),
    candidatePath,
    candidateSha256: sourceLocks.finalCandidateSha256,
    eventsPath,
    eventsSha256: sourceLocks.eventsSha256,
    stagedLedgerPath,
    productionLedgerPath,
    proposedAdapterBytes: Buffer.byteLength(adapterBytes),
    proposedAdapterSha256: sha256(adapterBytes),
    sections: validation.sections,
    moves: validation.moves
  });
}

const staticSourcePaths = [
  paths.compatibility,
  paths.finalizationAudit,
  paths.finalLedger,
  paths.scores,
  paths.renderingAnalysis,
  paths.renderingAudit,
  paths.workflow,
  paths.rubric,
  paths.legacyWorkflow,
  paths.activeValidator,
  paths.checkpointCompatibilityLibrary,
  paths.batch01CompatibilityLibrary,
  paths.batch01CompatibilityActivation,
  paths.batchFinalLedgerLibrary,
  paths.compatibilityLibrary,
  paths.scoreCalculator,
  paths.sourceCanonicalizer,
  paths.activeScorePolicy,
  paths.preparationScript,
  paths.preparationTest,
  paths.references,
  paths.productionDebates
];
const frozenSourcePaths = [
  ...new Set([
    ...staticSourcePaths,
    ...packetRecords.flatMap((record) => [
      record.candidatePath,
      record.eventsPath
    ])
  ])
].sort();
const sourceHashes = Object.fromEntries(
  await Promise.all(
    frozenSourcePaths.map(async (sourcePath) => [
      sourcePath,
      await fileSha256(sourcePath)
    ])
  )
);
const totals = {
  debates: packetRecords.length,
  planPackets: packetRecords.length,
  sections: packetRecords.reduce((sum, record) => sum + record.sections, 0),
  moves: packetRecords.reduce((sum, record) => sum + record.moves, 0),
  oneSidedDisplayRows:
    compatibility.observations.totals.oneSidedDisplayRows,
  overallBlunders: compatibility.observations.totals.overallBlunders,
  emptyReferenceLinks:
    compatibility.observations.totals.emptyReferenceLinks,
  suppliedReferenceLinks:
    compatibility.observations.totals.taggedReferenceLinks,
  proposedAdapterBytes: packetRecords.reduce(
    (sum, record) => sum + record.proposedAdapterBytes,
    0
  ),
  repositoryScoreReplays: packetRecords.length,
  modelContexts: 0,
  modelAuthoredScores: 0,
  scoreChanges: 0,
  proseChanges: 0,
  attributionChanges: 0,
  optionalReferenceBehaviorChanges: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  productionMutations: 0
};
assertV4(
  totals.debates === 10 &&
    totals.sections === 51 &&
    totals.moves === 190 &&
    totals.oneSidedDisplayRows === 14 &&
    totals.overallBlunders === 61 &&
    totals.emptyReferenceLinks === 55 &&
    totals.suppliedReferenceLinks === 6,
  "Batch 2 compatibility population changed"
);

const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-compatibility-preparation-manifest",
  protocolId: POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID,
  status: "post-canary-batch-02-compatibility-plan-prepared-and-frozen",
  frozenAt,
  productionCanary: false,
  batchNumber: 2,
  planningOnly: true,
  directIncrementalCostCapUsd: 0,
  userAuthorization: {
    instruction: "Continue.",
    scopeInterpretation:
      "Prepare, validate, freeze, commit, and push the Batch 2 production-compatibility plan only; do not activate or execute compatibility, write staged or production ledgers, mutate production, run models, use paid services, or select Batch 3."
  },
  scope: {
    finding: "batch-02-site-ledger-adapter-and-validator-route",
    description:
      "Freeze the exact Batch 2 ledger adapters and schema-specific validator route without applying them to the active validator or production data."
  },
  invariants: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    displayedRubric: "Slugfester Reassessment Rubric v2",
    scoreProtocolId:
      "assessment-production-post-canary-batch-02-single-deterministic-score-pass",
    chatGptSubscriptionAuthenticationPreserved: true,
    isolatedModelPassesPreserved: true,
    scoreBlindnessOfCompletedModelPassesPreserved: true,
    integerRoundedTiesAllowed: true,
    oneCompletedScorePassOnly: true,
    scoreRerunAllowed: false,
    modelExecutionAllowed: false,
    paidServiceAllowed: false,
    proseRewriteAllowed: false,
    scoreChangeAllowed: false,
    attributionChangeAllowed: false,
    optionalReferenceBehaviorChangeAllowed: false
  },
  proposedValidatorRoute: {
    activeFile: paths.activeValidator,
    currentValidatorSha256: sourceHashes[paths.activeValidator],
    newSchemaVersion: POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION,
    existingCheckpointSchemaVersion:
      "1.0-production-checkpoint-v2.2-site-ledger-adapter",
    exactRoute:
      "When a production ledger uses the Batch 2 adapter schema, load the Batch 2 packet and activation from the frozen Batch 2 compatibility root, verify their hashes, and replay the adapter with the Batch 2 validator. Keep the checkpoint adapter and Batch 1 adapter on their existing roots, credentials, and validators, and keep legacy Rubric v2 and v2.1 ledgers on their existing calculators.",
    oneSidedDisplayRows:
      "Treat all three authenticated adjudicated-consensus adapter schemas as requiring ledgerMoveId and permitting a section exchange with only one side populated.",
    activationRequirements: [
      "activation status is post-canary-batch-02-compatibility-execution-authorized-and-frozen",
      "activation authorizes compatibility execution, validator migration, and staging-ledger writes",
      "packet path, packet SHA-256, proposed adapter SHA-256, and staged ledger SHA-256 all match",
      "adapter source locks and deterministic score replay pass"
    ],
    unchangedBehavior: [
      "the checkpoint v2.2 adapter route and hashes remain valid",
      "the Batch 1 adapter route, correction-1 credential, packets, and hashes remain valid",
      "legacy Rubric v2 and v2.1 calculations remain unchanged",
      "empty Overall Commentary reference arrays remain valid",
      "every supplied LogFall or CogBias reference keeps full validation",
      "all model, rubric, score protocol, move ID, section, and displayed-score checks remain active"
    ],
    plannedStagingOutputs: packetRecords.map((record) => ({
      debateNumber: record.debateNumber,
      debateId: record.debateId,
      path: record.stagedLedgerPath,
      sha256: record.proposedAdapterSha256,
      bytes: record.proposedAdapterBytes
    }))
  },
  stagedExecutionPlan: [
    {
      stage: 1,
      name: "separate-execution-activation",
      allowedWrites: [paths.activation],
      productionMutation: false
    },
    {
      stage: 2,
      name: "one-deterministic-compatibility-staging-pass",
      passLimit: 1,
      rerunsAllowed: false,
      allowedWrites: [
        paths.activeValidator,
        `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/output-bundle/**`,
        paths.execution,
        paths.analysis
      ],
      actions: [
        "wire the schema-specific Batch 2 adapter route",
        "materialize the ten exact staged adapters from the frozen packets",
        "run positive, negative, canary-regression, legacy-regression, full-site, and deterministic-replay tests"
      ],
      forbiddenWrites: [
        "docs/assessment-ledgers/**",
        paths.productionDebates,
        paths.references
      ],
      modelExecution: false,
      paidServices: false,
      productionMutation: false
    },
    {
      stage: 3,
      name: "separate-production-publication-plan",
      authorizationRequiredAfterCompatibilityPass: true,
      proposedFutureWrites: [
        paths.productionDebates,
        ...packetRecords.map((record) => record.productionLedgerPath)
      ],
      productionMutationPerformedNow: false
    }
  ],
  mandatoryExecutionTests: {
    positive: [
      "all ten Batch 2 adapters reproduce all 190 locked move scores, 51 section scores per side, and 20 overall scores",
      "all ten final candidates match ledgerMoveId, section order, model, rubric, and score protocol",
      "all 14 one-sided display rows pass through the authenticated Batch 2 adapter route",
      "all 55 empty Overall Commentary reference arrays pass without synthesized links",
      "all six supplied reference links retain full validation",
      "all ten checkpoint v2.2 adapters retain their existing activation, packet, and score replays",
      "all ten Batch 1 adapters retain their existing activation, packet, and score replays",
      "legacy Rubric v2 and v2.1 ledgers retain their existing results"
    ],
    negative: [
      "tampered scoring dimension fails",
      "tampered move importance fails",
      "tampered move ID or order fails",
      "tampered move, section, or overall score fails",
      "tampered source lock, packet hash, adapter hash, or activation fails",
      "a Batch 2 adapter routed through the checkpoint or Batch 1 root fails",
      "malformed, unknown, or wrong-host supplied reference fails"
    ],
    repository: [
      "node scripts/validate-debates.mjs",
      "npm run check"
    ],
    deterministicReplayRequired: true,
    onePassOnly: true
  },
  artifacts: {
    preparation: paths.preparation,
    analysis: paths.analysis,
    futureActivation: paths.activation,
    futureExecution: paths.execution,
    packets: packetRecords.map((record) => ({
      debateNumber: record.debateNumber,
      debateId: record.debateId,
      path: record.packetPath,
      sha256: record.packetSha256,
      proposedAdapterSha256: record.proposedAdapterSha256
    }))
  },
  frozenSources: sourceHashes,
  totals,
  authorization: {
    compatibilityPlanPreparation: true,
    compatibilityExecutionActivation: false,
    compatibilityExecution: false,
    validatorMigration: false,
    stagingLedgerWrite: false,
    modelExecution: false,
    paidServices: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  stopRules: {
    separateExecutionApprovalRequired: true,
    exactlyOneDeterministicStagingPassIfApproved: true,
    rerunForbidden: true,
    sourceHashMismatchBlocks: true,
    packetHashMismatchBlocks: true,
    adapterHashMismatchBlocks: true,
    unexpectedWriteBlocks: true,
    testFailureBlocks: true,
    checkpointRouteRegressionBlocks: true,
    batch01RouteRegressionBlocks: true,
    legacyRouteRegressionBlocks: true,
    suppliedReferenceValidationWeakeningForbidden: true,
    optionalReferenceBehaviorChangeForbidden: true,
    rubricRelabelingForbidden: true,
    modelRelabelingForbidden: true,
    scoreProtocolRelabelingForbidden: true,
    scoreChangeForbidden: true,
    proseChangeForbidden: true,
    attributionChangeForbidden: true,
    scoreRerunForbidden: true,
    modelExecutionForbidden: true,
    paidServiceForbidden: true,
    productionLedgerPublicationForbidden: true,
    productionMutationForbidden: true,
    nextBatchSelectionForbidden: true
  },
  nextAuthorizedAction:
    "user-approval-required-before-batch-02-production-compatibility-execution-activation"
};
const preparationBytes = serializedJson(preparation);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-compatibility-preparation-analysis",
  protocolId: POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID,
  status: "post-canary-batch-02-compatibility-plan-freeze-passed",
  productionCanary: false,
  batchNumber: 2,
  planningOnly: true,
  preparation: {
    path: paths.preparation,
    sha256: sha256(preparationBytes)
  },
  finding: {
    id: preparation.scope.finding,
    adapterDefined: true,
    validatorRouteDefined: true,
    executed: false
  },
  checks: {
    finalLedgerReplayPassed: true,
    repositoryScoreReplaysPassed: packetRecords.length,
    candidateCompatibilityChecksPassed: packetRecords.length,
    exactAdapterOutputsFrozen: packetRecords.length,
    validatorBaselineHashFrozen: true,
    checkpointRoutePreservationSpecified: true,
    batch01RoutePreservationSpecified: true,
    legacyRoutePreservationSpecified: true,
    optionalReferenceBehaviorPreservationSpecified: true,
    activeValidatorChanged: false,
    stagingLedgersWritten: 0,
    productionLedgersWritten: 0,
    productionDebatesChanged: false,
    modelContexts: 0,
    paidServiceCalls: 0,
    productionMutationPerformed: false
  },
  totals,
  authorization: preparation.authorization,
  stopRules: preparation.stopRules,
  nextAuthorizedAction: preparation.nextAuthorizedAction
};
const analysisBytes = serializedJson(analysis);

if (write) {
  assertV4(
    !(await exists(paths.activation)) &&
      !(await exists(paths.execution)) &&
      !(await exists(paths.stagedLedgerRoot)),
    "Batch 2 compatibility execution artifact already exists; planning write blocked"
  );
  await mkdir(
    resolve(`${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/packets`),
    { recursive: true }
  );
  for (const record of packetRecords) {
    await writeFile(resolve(record.packetPath), record.packetBytes);
  }
  await writeFile(resolve(paths.preparation), preparationBytes);
  await writeFile(resolve(paths.analysis), analysisBytes);
} else {
  assertV4(
    existingPreparation &&
      canonicalJson(existingPreparation) === canonicalJson(preparation),
    "stored Batch 2 compatibility preparation differs from deterministic replay"
  );
  const storedAnalysis = await readJson(paths.analysis);
  assertV4(
    canonicalJson(storedAnalysis) === canonicalJson(analysis),
    "stored Batch 2 compatibility analysis differs from deterministic replay"
  );
  for (const record of packetRecords) {
    const storedPacket = await readFile(resolve(record.packetPath), "utf8");
    assertV4(
      storedPacket === record.packetBytes,
      `${record.debateNumber}: stored Batch 2 compatibility packet differs from deterministic replay`
    );
  }
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      write,
      debates: totals.debates,
      sections: totals.sections,
      moves: totals.moves,
      exactAdaptersFrozen: packetRecords.length,
      validatorRouteDefined: true,
      activeValidatorChanged: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
