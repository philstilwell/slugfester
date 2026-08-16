#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT,
  buildPostCanaryBatch01CompatibilityCorrectedValidator,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-01-compatibility-correction.mjs";
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

const compatibilityRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility";
const paths = {
  preparation:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/preparation-manifest.json`,
  preparationAnalysis:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/preparation-analysis.json`,
  correctionPacket:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/correction-packet.json`,
  proposedValidator:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/proposed-validator.mjs`,
  futureActivation:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/execution-activation.json`,
  futureExecution:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/execution.json`,
  futureExecutionAnalysis:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/execution-analysis.json`,
  originalPreparation: `${compatibilityRoot}/preparation-manifest.json`,
  originalActivation: `${compatibilityRoot}/execution-activation.json`,
  failedExecution: `${compatibilityRoot}/execution.json`,
  failedAnalysis: `${compatibilityRoot}/analysis.json`,
  activeValidator: "scripts/validate-debates.mjs",
  productionDebates: "src/data/debates.js",
  references: "src/data/references.js",
  workflow: "docs/assessment-production-workflow.md",
  rubric: "docs/reassessment-rubric-v2.1.md",
  legacyWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
  productionManifest: "docs/assessment-production/manifest-v1.json",
  checkpointActivation:
    "docs/assessment-production/production-checkpoint-v2.2-1/compatibility-remedy/execution-activation.json",
  checkpointCompatibilityLibrary:
    "scripts/lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs",
  batchCompatibilityLibrary:
    "scripts/lib/assessment-production-post-canary-batch-01-compatibility.mjs",
  correctionLibrary:
    "scripts/lib/assessment-production-post-canary-batch-01-compatibility-correction.mjs",
  preparationScript:
    "scripts/prepare-assessment-production-post-canary-batch-01-compatibility-correction.mjs",
  preparationTest:
    "scripts/test-assessment-production-post-canary-batch-01-compatibility-correction-preparation.mjs"
};

const existingPreparation = (await exists(paths.preparation))
  ? await readJson(paths.preparation)
  : null;
const frozenAt = existingPreparation?.frozenAt ?? requestedFrozenAt;
assertV4(
  typeof frozenAt === "string" && !Number.isNaN(Date.parse(frozenAt)),
  "a stable --frozen-at ISO timestamp is required for the first correction-plan write"
);

const [
  originalPreparation,
  originalActivation,
  failedExecution,
  failedAnalysis,
  attemptedValidatorSource
] = await Promise.all([
  readJson(paths.originalPreparation),
  readJson(paths.originalActivation),
  readJson(paths.failedExecution),
  readJson(paths.failedAnalysis),
  readFile(resolve(paths.activeValidator), "utf8")
]);

assertV4(
  failedExecution.status ===
      "failed-closed-at-first-negative-control-nonrejection" &&
    failedExecution.attempt.deterministicPassesAttempted === 1 &&
    failedExecution.attempt.deterministicPassesCompleted === 0 &&
    failedExecution.attempt.reruns === 0 &&
    failedExecution.failure.debateNumber === "94" &&
    failedExecution.failure.originalValue === 76 &&
    failedExecution.failure.tamperedValue === 77 &&
    failedExecution.failure.innerReplayValidatorRejected === false &&
    failedExecution.failure.exactAdapterHashChanged === true &&
    failedExecution.failure.authenticatedRouteWouldRejectHashMismatch === true,
  "preserved Batch 1 negative-control failure is unavailable or changed"
);
assertV4(
  failedAnalysis.status ===
      "failed-closed-awaiting-separate-compatibility-correction-plan-approval" &&
    failedAnalysis.decision.compatibilityGatePassed === false &&
    failedAnalysis.decision.retryPerformed === false &&
    failedAnalysis.decision.repairPerformed === false &&
    failedAnalysis.authorization.compatibilityCorrectionPlanPreparation ===
      false &&
    failedAnalysis.authorization.compatibilityExecutionContinuation ===
      false &&
    failedAnalysis.authorization.productionMutation === false,
  "preserved Batch 1 failure analysis is unavailable or changed"
);
assertV4(
  sha256(attemptedValidatorSource) ===
      failedExecution.writes.validator.attemptedSha256 &&
    failedExecution.writes.validator.attemptedSha256 ===
      "3fb5dd3a3f1e7414966fc6fb7b44c840c80e6d1259195f41f032b5557bc81c7f",
  "attempted validator baseline differs from the preserved failure"
);
assertV4(
  originalPreparation.status ===
      "post-canary-batch-01-compatibility-plan-prepared-and-frozen" &&
    originalActivation.status ===
      "post-canary-batch-01-compatibility-execution-authorized-and-frozen" &&
    originalPreparation.artifacts.packets.length === 10 &&
    originalActivation.packetHashes.length === 10,
  "original Batch 1 compatibility locks are unavailable"
);

const packetLocks = [];
for (const packetRecord of originalPreparation.artifacts.packets) {
  const activationLock = originalActivation.packetHashes.find(
    (item) => item.debateNumber === packetRecord.debateNumber
  );
  const packetBytes = await readFile(resolve(packetRecord.path));
  const packet = JSON.parse(packetBytes);
  const stagedLedgerBytes = await readFile(
    resolve(packet.futurePaths.stagedLedger)
  );
  assertV4(
    activationLock &&
      sha256(packetBytes) === packetRecord.sha256 &&
      activationLock.sha256 === packetRecord.sha256 &&
      packet.proposedAdapterSha256 ===
        packetRecord.proposedAdapterSha256 &&
      activationLock.proposedAdapterSha256 ===
        packetRecord.proposedAdapterSha256 &&
      sha256(stagedLedgerBytes) === packetRecord.proposedAdapterSha256 &&
      !(await exists(packet.futurePaths.productionLedger)),
    `${packetRecord.debateNumber}: frozen packet, staged adapter, or production boundary changed`
  );
  packetLocks.push({
    debateNumber: packetRecord.debateNumber,
    debateId: packetRecord.debateId,
    packetPath: packetRecord.path,
    packetSha256: packetRecord.sha256,
    stagedLedgerPath: packet.futurePaths.stagedLedger,
    stagedLedgerSha256: packetRecord.proposedAdapterSha256,
    stagedLedgerBytes: stagedLedgerBytes.length,
    productionLedgerPath: packet.futurePaths.productionLedger
  });
}

const proposedValidatorSource =
  buildPostCanaryBatch01CompatibilityCorrectedValidator(
    attemptedValidatorSource
  );
const proposedValidatorSha256 = sha256(proposedValidatorSource);
const correctionPacket = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-compatibility-correction-plan-packet",
  protocolId: POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID,
  status: "frozen-batch-01-compatibility-correction-plan-packet",
  productionCanary: false,
  batchNumber: 1,
  planningOnly: true,
  scope: {
    findings: [
      "route-level-tamper-control",
      "mutable-analysis-hash-conflict"
    ],
    onlyActiveFileProposedToChange: paths.activeValidator
  },
  attemptedValidator: {
    path: paths.activeValidator,
    sha256: sha256(attemptedValidatorSource),
    bytes: Buffer.byteLength(attemptedValidatorSource)
  },
  proposedValidator: {
    path: paths.proposedValidator,
    targetPath: paths.activeValidator,
    sha256: proposedValidatorSha256,
    bytes: Buffer.byteLength(proposedValidatorSource)
  },
  exactTransformations: [
    {
      order: 1,
      id: "remove-analysis-text-route-parameter",
      effect:
        "Remove analysisText from validatePostCanaryBatch01LedgerAdapterRouteLocks."
    },
    {
      order: 2,
      id: "remove-analysis-hash-route-condition",
      effect:
        "Remove the comparison between mutable analysis.json bytes and the preparation-time analysis hash."
    },
    {
      order: 3,
      id: "remove-analysis-file-read",
      effect:
        "Do not read analysis.json during Batch 1 ledger authentication."
    },
    {
      order: 4,
      id: "remove-analysis-text-route-call-argument",
      effect:
        "Remove analysisText from the route-lock call."
    },
    {
      order: 5,
      id: "use-correction-specific-activation-path",
      effect:
        "Authenticate through correction-1/execution-activation.json so the failed activation remains preserved."
    },
    {
      order: 6,
      id: "require-correction-specific-activation-status",
      effect:
        "Require post-canary-batch-01-compatibility-correction-1-execution-authorized-and-frozen."
    }
  ],
  immutableRouteLocksRetained: [
    "correction activation status and authorization",
    "immutable correction preparation-manifest hash",
    "packet path, debate identity, and packet SHA-256",
    "production-ledger destination",
    "exact adapter SHA-256 over ledger bytes",
    "adapter source-lock object",
    "repository-derived score replay",
    "candidate model, rubric, move IDs, section order, and displayed scores",
    "AI Extension requirement"
  ],
  correctedValidationContract: {
    routeLayer:
      "Every change to serialized adapter bytes, including a score-neutral one-point rating change, must fail the exact adapter SHA-256 check before inner replay acceptance can matter.",
    innerReplayLayer:
      "The inner adapter validator must reproduce and compare the stored integer move, section, and overall score snapshot. It is not required to reject a scoring-input change that provably leaves that entire rounded snapshot unchanged.",
    scoreChangingInnerControls:
      "Inner-validator negative controls must first prove that their tamper changes the derived score snapshot, then require rejection.",
    failureSpecificControl: {
      debateNumber: "94",
      moveId: "con-impossible-quantitative-divine-infinity",
      field: "logicalCoherence",
      originalValue: 76,
      tamperedValue: 77,
      innerReplayMayRemainScoreEquivalent: true,
      routeHashMustReject: true
    },
    mutableAnalysisRule:
      "Preparation analysis and execution analysis use separate immutable paths; neither is a live ledger-authentication dependency."
  },
  preservedArtifacts: packetLocks,
  authorization: {
    correctionPlanPreparation: true,
    correctionExecutionActivation: false,
    validatorCorrectionExecution: false,
    compatibilityRerun: false,
    stagedAdapterRewrite: false,
    packetRewrite: false,
    modelExecution: false,
    paidServices: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
const correctionPacketBytes = serializedJson(correctionPacket);

const staticSourcePaths = [
  paths.originalPreparation,
  paths.originalActivation,
  paths.failedExecution,
  paths.failedAnalysis,
  paths.activeValidator,
  paths.productionDebates,
  paths.references,
  paths.workflow,
  paths.rubric,
  paths.legacyWorkflow,
  paths.productionManifest,
  paths.checkpointActivation,
  paths.checkpointCompatibilityLibrary,
  paths.batchCompatibilityLibrary,
  paths.correctionLibrary,
  paths.preparationScript,
  paths.preparationTest
];
const frozenSourcePaths = [
  ...new Set([
    ...staticSourcePaths,
    ...packetLocks.flatMap((item) => [
      item.packetPath,
      item.stagedLedgerPath
    ])
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
const stagedLedgerBytes = packetLocks.reduce(
  (sum, item) => sum + item.stagedLedgerBytes,
  0
);
assertV4(
  packetLocks.length === 10 && stagedLedgerBytes === 1063267,
  "preserved staged-adapter population changed"
);

const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-compatibility-correction-preparation-manifest",
  protocolId: POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID,
  status: "batch-01-compatibility-correction-plan-prepared-and-frozen",
  frozenAt,
  productionCanary: false,
  batchNumber: 1,
  planningOnly: true,
  directIncrementalCostCapUsd: 0,
  scope: {
    findings: correctionPacket.scope.findings,
    description:
      "Freeze a validator-only correction for the failed route test and mutable analysis lock without applying the validator, rewriting adapters or packets, or rerunning compatibility."
  },
  invariants: {
    assessmentModel: "5.6 Sol",
    reasoningEffort: "low",
    chatGptSubscriptionAuthenticationPreserved: true,
    isolatedModelPassesPreserved: true,
    scoreBlindnessPreserved: true,
    integerRoundedTiesAllowed: true,
    oneCompletedScorePassOnly: true,
    scoreRerunAllowed: false,
    modelExecutionAllowed: false,
    paidServiceAllowed: false,
    scoreChangeAllowed: false,
    proseChangeAllowed: false,
    attributionChangeAllowed: false,
    stagedAdapterRewriteAllowed: false,
    packetRewriteAllowed: false,
    productionMutationAllowed: false
  },
  correction: {
    packet: {
      path: paths.correctionPacket,
      sha256: sha256(correctionPacketBytes)
    },
    proposedValidator: correctionPacket.proposedValidator,
    transformationCount: correctionPacket.exactTransformations.length,
    validationContract: correctionPacket.correctedValidationContract
  },
  preservedArtifacts: {
    packets: packetLocks.map((item) => ({
      debateNumber: item.debateNumber,
      path: item.packetPath,
      sha256: item.packetSha256
    })),
    stagedLedgers: packetLocks.map((item) => ({
      debateNumber: item.debateNumber,
      path: item.stagedLedgerPath,
      sha256: item.stagedLedgerSha256,
      bytes: item.stagedLedgerBytes
    })),
    packetRewrites: 0,
    stagedAdapterRewrites: 0
  },
  futureActivationContract: {
    path: paths.futureActivation,
    status:
      "post-canary-batch-01-compatibility-correction-1-execution-authorized-and-frozen",
    authorizationRequired: true,
    mustHashLock: [
      paths.preparation,
      paths.preparationAnalysis,
      paths.correctionPacket,
      paths.proposedValidator,
      paths.activeValidator,
      ...packetLocks.flatMap((item) => [
        item.packetPath,
        item.stagedLedgerPath
      ])
    ]
  },
  futureExecutionPlan: {
    passLimit: 1,
    rerunsAllowed: false,
    continuationOfFailedPass: false,
    newCorrectionPass: true,
    allowedWrites: [
      paths.activeValidator,
      paths.futureExecution,
      paths.futureExecutionAnalysis,
      paths.failedAnalysis
    ],
    forbiddenWrites: [
      `${compatibilityRoot}/packets/**`,
      `${compatibilityRoot}/output-bundle/staged-ledgers/**`,
      "docs/assessment-ledgers/**",
      paths.productionDebates,
      paths.references,
      ".assessment-cache/**"
    ],
    actions: [
      "require a separately frozen correction activation",
      "replace scripts/validate-debates.mjs with the exact proposed validator bytes",
      "run the corrected route-level and score-replay validation contract once",
      "run checkpoint, legacy, reference, and complete repository regressions once",
      "record correction execution and analysis without rewriting adapters or packets"
    ]
  },
  mandatoryFutureTests: {
    positive: [
      "all ten unchanged Batch 1 staged adapters authenticate through the correction activation and replay 177 moves, 50 sections, and 20 overall scores",
      "all ten unchanged checkpoint adapters retain their original activation, packet, and score replays",
      "legacy Rubric v2 and v2.1 routes retain their existing results",
      "all 19 one-sided rows, 52 empty reference arrays, and one supplied reference remain valid",
      "node scripts/validate-debates.mjs and npm run check pass"
    ],
    negativeRouteLayer: [
      "for each Batch 1 adapter, any serialized-byte change fails the exact adapter hash",
      "the Debate 94 76-to-77 logical-coherence change fails at the route hash",
      "tampered correction activation, preparation hash, packet path, packet hash, adapter hash, source lock, move ID, or displayed score fails"
    ],
    negativeInnerReplayLayer: [
      "a tamper proven to change derived integer scores fails score replay",
      "a tamper proven not to change the complete rounded score snapshot is not misclassified as an inner replay failure and must still fail at the route hash"
    ],
    deterministicReplayRequired: true,
    onePassOnly: true
  },
  artifacts: {
    preparation: paths.preparation,
    preparationAnalysis: paths.preparationAnalysis,
    correctionPacket: paths.correctionPacket,
    proposedValidator: paths.proposedValidator,
    futureActivation: paths.futureActivation,
    futureExecution: paths.futureExecution,
    futureExecutionAnalysis: paths.futureExecutionAnalysis
  },
  frozenSources,
  totals: {
    findings: 2,
    exactValidatorTransformations: 6,
    debates: 10,
    packetsPreserved: 10,
    stagedAdaptersPreserved: 10,
    stagedAdapterBytesPreserved: stagedLedgerBytes,
    packetRewrites: 0,
    stagedAdapterRewrites: 0,
    compatibilityPassesExecuted: 0,
    compatibilityReruns: 0,
    modelContexts: 0,
    scoreChanges: 0,
    proseChanges: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    productionLedgerPublications: 0,
    productionMutations: 0
  },
  authorization: {
    correctionPlanPreparation: true,
    correctionExecutionActivation: false,
    validatorCorrectionExecution: false,
    compatibilityRerun: false,
    modelExecution: false,
    paidServices: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  stopRules: {
    separateCorrectionExecutionApprovalRequired: true,
    sourceHashMismatchBlocks: true,
    proposedValidatorHashMismatchBlocks: true,
    packetHashMismatchBlocks: true,
    stagedAdapterHashMismatchBlocks: true,
    unexpectedWriteBlocks: true,
    exactlyOneCorrectionPassIfApproved: true,
    automaticContinuationForbidden: true,
    automaticRerunForbidden: true,
    packetRewriteForbidden: true,
    stagedAdapterRewriteForbidden: true,
    scoreChangeForbidden: true,
    proseChangeForbidden: true,
    modelExecutionForbidden: true,
    paidServiceForbidden: true,
    productionLedgerPublicationForbidden: true,
    productionMutationForbidden: true,
    nextBatchSelectionForbidden: true
  },
  nextAuthorizedAction:
    "user-approval-required-before-batch-01-compatibility-correction-1-activation-and-single-execution"
};
const preparationBytes = serializedJson(preparation);
const preparationAnalysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-compatibility-correction-preparation-analysis",
  protocolId: POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID,
  status: "batch-01-compatibility-correction-plan-freeze-passed",
  productionCanary: false,
  batchNumber: 1,
  planningOnly: true,
  preparation: {
    path: paths.preparation,
    sha256: sha256(preparationBytes)
  },
  correctionPacket: {
    path: paths.correctionPacket,
    sha256: sha256(correctionPacketBytes)
  },
  proposedValidator: correctionPacket.proposedValidator,
  checks: {
    failedExecutionPreserved: true,
    failureDiagnosisPreserved: true,
    routeLevelTamperContractDefined: true,
    innerReplayContractDefined: true,
    mutableAnalysisDependencyRemovedFromProposal: true,
    correctionSpecificActivationRouteDefined: true,
    exactValidatorOutputFrozen: true,
    packetsPreserved: 10,
    stagedAdaptersPreserved: 10,
    packetRewrites: 0,
    stagedAdapterRewrites: 0,
    activeValidatorChangedThisStage: false,
    compatibilityPassesExecuted: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    productionMutationPerformed: false
  },
  totals: preparation.totals,
  authorization: preparation.authorization,
  stopRules: preparation.stopRules,
  nextAuthorizedAction: preparation.nextAuthorizedAction
};
const preparationAnalysisBytes = serializedJson(preparationAnalysis);

if (write) {
  assertV4(
    !(await exists(paths.futureActivation)) &&
      !(await exists(paths.futureExecution)) &&
      !(await exists(paths.futureExecutionAnalysis)),
    "correction execution artifact already exists; plan write blocked"
  );
  await mkdir(resolve(POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT), {
    recursive: true
  });
  await writeFile(resolve(paths.proposedValidator), proposedValidatorSource);
  await writeFile(resolve(paths.correctionPacket), correctionPacketBytes);
  await writeFile(resolve(paths.preparation), preparationBytes);
  await writeFile(
    resolve(paths.preparationAnalysis),
    preparationAnalysisBytes
  );
} else {
  assertV4(
    existingPreparation &&
      canonicalJson(existingPreparation) === canonicalJson(preparation),
    "stored correction preparation differs from deterministic replay"
  );
  assertV4(
    (await readFile(resolve(paths.proposedValidator), "utf8")) ===
      proposedValidatorSource,
    "stored proposed validator differs from deterministic replay"
  );
  assertV4(
    (await readFile(resolve(paths.correctionPacket), "utf8")) ===
      correctionPacketBytes,
    "stored correction packet differs from deterministic replay"
  );
  assertV4(
    canonicalJson(await readJson(paths.preparationAnalysis)) ===
      canonicalJson(preparationAnalysis),
    "stored correction preparation analysis differs from deterministic replay"
  );
}

console.log(
  JSON.stringify(
    {
      status: preparationAnalysis.status,
      write,
      findings: preparation.totals.findings,
      proposedValidatorSha256,
      packetsPreserved: packetLocks.length,
      stagedAdaptersPreserved: packetLocks.length,
      compatibilityPassesExecuted: 0,
      compatibilityReruns: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false,
      nextAuthorizedAction: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
