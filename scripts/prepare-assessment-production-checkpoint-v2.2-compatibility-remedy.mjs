#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_COMPATIBILITY_ORDER,
  CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID,
  CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT,
  buildCheckpointV22SiteLedgerAdapter,
  serializedJson,
  sha256,
  validateCheckpointV22SiteLedgerAdapter
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";
import {
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
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
  preparation: `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/preparation-manifest.json`,
  analysis: `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/analysis.json`,
  activation: `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/execution-activation.json`,
  execution: `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/execution.json`,
  stagedLedgerRoot: `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/output-bundle/staged-ledgers`,
  compatibility:
    "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/compatibility-analysis.json",
  finalizationAudit:
    "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/output-bundle/finalization-audit.json",
  finalLedger:
    "docs/assessment-production/production-checkpoint-v2.2-1/final-ledger/final-ledger.json",
  scores:
    "docs/assessment-production/production-checkpoint-v2.2-1/score-pass/calculated-scores.json",
  renderingAnalysis:
    "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v9/analysis.json",
  workflow: "docs/assessment-production-workflow.md",
  rubric: "docs/reassessment-rubric-v2.1.md",
  legacyWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
  activeValidator: "scripts/validate-debates.mjs",
  legacyCalculator: "scripts/lib/reassessment-scoring.mjs",
  scoreCalculator: "scripts/lib/v4-lean-production.mjs",
  sourceCanonicalizer: "scripts/lib/v4220-source-span-rendering.mjs",
  compatibilityLibrary:
    "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  preparationScript:
    "scripts/prepare-assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  preparationTest:
    "scripts/test-assessment-production-checkpoint-v2.2-compatibility-remedy-preparation.mjs",
  references: "src/data/references.js",
  productionDebates: "src/data/debates.js"
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
  compatibility,
  finalizationAudit,
  finalLedger,
  scores,
  renderingAnalysis,
  loadedInputs
] = await Promise.all([
  readJson(paths.compatibility),
  readJson(paths.finalizationAudit),
  readJson(paths.finalLedger),
  readJson(paths.scores),
  readJson(paths.renderingAnalysis),
  loadCheckpointV22FinalLedgerInputs()
]);

assertV4(
  renderingAnalysis.status ===
      "ninth-replacement-rendering-verification-passed" &&
    renderingAnalysis.authorization.compatibilityRemedyPlanPreparation &&
    !renderingAnalysis.authorization.compatibilityRemedyExecution &&
    !renderingAnalysis.authorization.validatorMigration &&
    !renderingAnalysis.authorization.productionMutation,
  "rendering gate does not authorize compatibility-remedy planning only"
);
assertV4(
  compatibility.status ===
      "production-mutation-compatibility-blockers-recorded" &&
    canonicalJson(compatibility.findings.map((finding) => finding.id)) ===
      canonicalJson([
        "optional-overall-reference-links",
        "checkpoint-ledger-schema-adapter"
      ]) &&
    !compatibility.authorization.validatorMigration &&
    !compatibility.authorization.productionLedgerPublication &&
    !compatibility.authorization.productionMutation,
  "two frozen publication compatibility blockers required"
);
assertV4(
  finalizationAudit.status ===
      "passed-ten-debate-publication-finalization" &&
    finalizationAudit.productionMutationPerformed === false,
  "passed staging-only publication finalization audit required"
);
assertV4(
  scores.status ===
      "production-checkpoint-v2.2-single-score-pass-stability-gate-passed" &&
    scores.totals.acceptancePassed &&
    scores.totals.scoringPasses === 1 &&
    scores.authorization.scoreRerun === false &&
    scores.authorization.productionMutation === false,
  "accepted one-pass checkpoint score ledger required"
);
validateCheckpointV22FinalLedger(
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
      CHECKPOINT_V22_COMPATIBILITY_ORDER.join(",") &&
    scores.debates.map((debate) => debate.debateNumber).join(",") ===
      CHECKPOINT_V22_COMPATIBILITY_ORDER.join(","),
  "checkpoint compatibility debate order changed"
);

const finalLedgerSha256 = await fileSha256(paths.finalLedger);
const calculatedScoresSha256 = await fileSha256(paths.scores);
const packetRecords = [];
for (const debateNumber of CHECKPOINT_V22_COMPATIBILITY_ORDER) {
  const finalLedgerDebate = finalByNumber.get(debateNumber);
  const scoreDebate = scoreByNumber.get(debateNumber);
  const input = inputByNumber.get(debateNumber);
  const candidatePath =
    `docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization/` +
    `output-bundle/final-candidates/debate-${debateNumber}.json`;
  const packetPath =
    `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/packets/debate-${debateNumber}.json`;
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
    finalCandidateSha256: sha256(candidateBytes),
    eventsPath,
    eventsSha256: await fileSha256(eventsPath),
    finalJudgmentSha256: sha256(
      serializedJson(finalLedgerDebate.finalJudgment)
    )
  };
  const adapter = buildCheckpointV22SiteLedgerAdapter({
    finalLedgerDebate,
    scoreDebate,
    candidate,
    eventsDocument: input.eventsDocument,
    sourceLocks
  });
  const validation = validateCheckpointV22SiteLedgerAdapter({
    adapter,
    candidate,
    expectedSourceLocks: sourceLocks
  });
  const adapterBytes = serializedJson(adapter);
  const packet = {
    schemaVersion:
      "1.0-production-checkpoint-v2.2-compatibility-remedy-plan-packet",
    protocolId: CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID,
    status: "frozen-compatibility-remedy-plan-packet",
    productionCanary: true,
    planningOnly: true,
    debateNumber,
    debateId: finalLedgerDebate.debateId,
    sources: {
      candidate: candidatePath,
      finalLedger: paths.finalLedger,
      calculatedScores: paths.scores,
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
      compatibilityRemedyExecution: false,
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
  paths.workflow,
  paths.rubric,
  paths.legacyWorkflow,
  paths.activeValidator,
  paths.legacyCalculator,
  paths.scoreCalculator,
  paths.sourceCanonicalizer,
  paths.compatibilityLibrary,
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
  overallBlunders: compatibility.findings[0].evidence.overallBlunders,
  emptyReferenceLinks: compatibility.findings[0].evidence.emptyReferenceLinks,
  suppliedReferenceLinks: compatibility.findings[0].evidence.taggedReferenceLinks,
  proposedAdapterBytes: packetRecords.reduce(
    (sum, record) => sum + record.proposedAdapterBytes,
    0
  ),
  repositoryScoreReplays: packetRecords.length,
  modelContexts: 0,
  modelAuthoredScores: 0,
  scoreChanges: 0,
  proseChanges: 0,
  syntheticReferences: 0,
  meteredApiCostUsd: 0,
  productionMutations: 0
};
const preparation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-compatibility-remedy-preparation-manifest",
  protocolId: CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID,
  status: "compatibility-remedy-plan-prepared-and-frozen",
  frozenAt,
  productionCanary: true,
  planningOnly: true,
  scope: {
    findings: [
      "optional-overall-reference-links",
      "checkpoint-ledger-schema-adapter"
    ],
    description:
      "Freeze the exact validator and per-debate ledger-adapter remedy without applying it to the active validator or production data."
  },
  invariants: {
    assessmentModel: "5.6 Sol",
    displayedRubric: "Slugfester Reassessment Rubric v2",
    scoreProtocolId:
      "assessment-production-checkpoint-v2.2-1-single-deterministic-score-pass",
    chatGptSubscriptionAuthenticationPreserved: true,
    scoreBlindnessOfCompletedJudgmentPassesPreserved: true,
    integerRoundedTiesAllowed: true,
    oneCompletedScorePassOnly: true,
    scoreRerunAllowed: false,
    proseRewriteAllowed: false,
    scoreChangeAllowed: false,
    syntheticReferenceAllowed: false
  },
  remedy: {
    optionalOverallReferenceLinks: {
      activeFile: paths.activeValidator,
      exactChange:
        "In validateOverall only, remove the minLength: 1 requirement from each blunder.links array. Keep array type validation and every existing supplied-link label, host, URL, and local-reference validation unchanged.",
      zeroLinksMeaning:
        "No material fallacy or bias reference applies; an empty array is valid and no tag is synthesized.",
      negativeControls: [
        "non-array links still fail",
        "non-object supplied link still fails",
        "empty supplied label or URL still fails",
        "non-LogFall and non-CogBias host still fails",
        "unknown local reference still fails"
      ]
    },
    checkpointLedgerAdapter: {
      referenceImplementation: paths.compatibilityLibrary,
      plannedActiveRoute:
        "Route by the ledger schemaVersion 1.0-production-checkpoint-v2.2-site-ledger-adapter, never by changing the displayed rubric label.",
      legacyRoute:
        "All legacy Rubric v2 and v2.1 ledgers continue through their existing calculators and checks without changed formulas.",
      scoreReplay:
        "Recompute every move, section, and overall score from the embedded canonical scoring judgment with deriveV4PrimaryScores; match every published ledgerMoveId and displayed score.",
      sourceLock:
        "Require the exact frozen source-lock object and the exact adapter hash recorded by the plan packet.",
      plannedStagingOutputs: packetRecords.map((record) => ({
        debateNumber: record.debateNumber,
        debateId: record.debateId,
        path: record.stagedLedgerPath,
        sha256: record.proposedAdapterSha256,
        bytes: record.proposedAdapterBytes
      }))
    }
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
      name: "compatibility-remedy-execution",
      allowedWrites: [
        paths.activeValidator,
        `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/output-bundle/**`,
        paths.execution,
        paths.analysis
      ],
      actions: [
        "apply the one-line optional-link minimum change",
        "wire the schema-specific checkpoint adapter route",
        "materialize the ten exact staged adapters from the frozen packets",
        "run positive, negative, legacy-regression, full-site, and deterministic-replay tests"
      ],
      forbiddenWrites: [
        "docs/assessment-ledgers/**",
        paths.productionDebates
      ],
      productionMutation: false
    },
    {
      stage: 3,
      name: "separate-production-mutation-plan",
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
      "all ten adapters reproduce all 188 locked move scores, 51 section scores per side, and 20 overall scores",
      "all ten final candidates match ledgerMoveId, section order, model, rubric, and score protocol",
      "all 53 empty Overall Commentary links arrays pass",
      "all three supplied reference links retain full validation",
      "legacy v2 and v2.1 ledgers retain their existing results"
    ],
    negative: [
      "tampered scoring dimension fails",
      "tampered move importance fails",
      "tampered move ID or order fails",
      "tampered move, section, or overall score fails",
      "tampered source lock or adapter hash fails",
      "malformed or unknown supplied reference fails"
    ],
    repository: [
      "node scripts/validate-debates.mjs",
      "npm run check"
    ],
    deterministicReplayRequired: true
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
    compatibilityRemedyPlanPreparation: true,
    compatibilityRemedyExecutionActivation: true,
    compatibilityRemedyExecution: false,
    validatorMigration: false,
    stagingLedgerWrite: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  stopRules: {
    separateExecutionActivationRequired: true,
    sourceHashMismatchBlocks: true,
    adapterHashMismatchBlocks: true,
    unexpectedWriteBlocks: true,
    testFailureBlocks: true,
    suppliedReferenceValidationWeakeningForbidden: true,
    syntheticReferenceForbidden: true,
    rubricRelabelingForbidden: true,
    modelRelabelingForbidden: true,
    scoreProtocolRelabelingForbidden: true,
    scoreChangeForbidden: true,
    proseChangeForbidden: true,
    scoreRerunForbidden: true,
    productionMutationForbidden: true,
    remainingProductionBatchesForbidden: true
  },
  nextAuthorizedAction:
    "user-decision-on-compatibility-remedy-execution-activation"
};
const preparationBytes = serializedJson(preparation);
const analysis = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-compatibility-remedy-preparation-analysis",
  protocolId: CHECKPOINT_V22_COMPATIBILITY_REMEDY_PROTOCOL_ID,
  status: "compatibility-remedy-plan-freeze-passed",
  productionCanary: true,
  planningOnly: true,
  preparation: {
    path: paths.preparation,
    sha256: sha256(preparationBytes)
  },
  findings: preparation.scope.findings.map((id) => ({
    id,
    remedyDefined: true,
    executed: false
  })),
  checks: {
    finalLedgerReplayPassed: true,
    repositoryScoreReplaysPassed: packetRecords.length,
    candidateCompatibilityChecksPassed: packetRecords.length,
    exactAdapterOutputsFrozen: packetRecords.length,
    activeValidatorChanged: false,
    stagingLedgersWritten: 0,
    productionLedgersWritten: 0,
    productionDebatesChanged: false,
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
    "compatibility execution artifact already exists; planning write blocked"
  );
  await mkdir(resolve(`${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/packets`), {
    recursive: true
  });
  for (const record of packetRecords) {
    await writeFile(resolve(record.packetPath), record.packetBytes);
  }
  await writeFile(resolve(paths.preparation), preparationBytes);
  await writeFile(resolve(paths.analysis), analysisBytes);
} else {
  assertV4(
    existingPreparation &&
      canonicalJson(existingPreparation) === canonicalJson(preparation),
    "stored compatibility-remedy preparation differs from deterministic replay"
  );
  const storedAnalysis = await readJson(paths.analysis);
  assertV4(
    canonicalJson(storedAnalysis) === canonicalJson(analysis),
    "stored compatibility-remedy analysis differs from deterministic replay"
  );
  for (const record of packetRecords) {
    const storedPacket = await readFile(resolve(record.packetPath), "utf8");
    assertV4(
      storedPacket === record.packetBytes,
      `${record.debateNumber}: stored compatibility packet differs from deterministic replay`
    );
  }
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      write,
      debates: totals.debates,
      moves: totals.moves,
      exactAdaptersFrozen: packetRecords.length,
      activeValidatorChanged: false,
      productionMutationPerformed: false,
      meteredApiCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
