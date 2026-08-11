#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_PROTOCOL_ID,
  compileV212CandidateBundle,
  validateV212Discovery,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  V221_DISCOVERY_VALIDATION_PROTOCOL_ID,
  canonicalizeV221DiscoveryCandidateOrder,
  compileV221CandidateBundle,
  validateV221Discovery,
} from "./lib/assessment-production-score-stability-v2.2.1-order-invariant-discovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const V22_ROOT =
  "docs/assessment-production/score-stability-v2.2-validation-cohort";
const PREPARATION = `${V22_ROOT}/source-preparation/preparation-manifest.json`;
const EXECUTION_PREPARATION =
  `${V22_ROOT}/discovery/execution-preparation-manifest.json`;
const ACTIVATION = `${V22_ROOT}/discovery/execution-activation.json`;
const EXECUTION = `${V22_ROOT}/discovery/model-execution.json`;
const DIAGNOSIS = `${V22_ROOT}/discovery/failure-diagnosis.json`;
const PREDECESSOR_REGRESSION =
  "docs/calibration/v4.2.21.17.22/order-invariant-discovery-regression/regression.json";
const ROOT =
  "docs/assessment-production/score-stability-v2.2.1-discovery-successor-development";
const OUTPUT = `${ROOT}/development-analysis.json`;
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2.2.1-order-invariant-discovery.mjs";
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2.2.1-discovery-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.1-discovery-successor.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const captureValidation = (validator, output, args) => {
  try {
    return { accepted: true, validation: validator(output, args), error: null };
  } catch (error) {
    return { accepted: false, validation: null, error: error.message };
  }
};

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists`);
}

const [
  preparationBytes,
  executionPreparationBytes,
  activationBytes,
  executionBytes,
  diagnosisBytes,
  predecessorRegressionBytes,
] = await Promise.all([
  readFile(PREPARATION),
  readFile(EXECUTION_PREPARATION),
  readFile(ACTIVATION),
  readFile(EXECUTION),
  readFile(DIAGNOSIS),
  readFile(PREDECESSOR_REGRESSION),
]);
const preparation = JSON.parse(preparationBytes);
const executionPreparation = JSON.parse(executionPreparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const diagnosis = JSON.parse(diagnosisBytes);
const predecessorRegression = JSON.parse(predecessorRegressionBytes);

assertV4(
  preparation.status ===
      "fresh-ten-debate-v2.2-source-token-ledgers-and-discovery-packets-prepared" &&
    preparation.contexts.length === 10 &&
    preparation.totals.discoveryContexts === 38 &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.proposedPolicy.version === "v2.2-proposal" &&
    preparation.proposedPolicy.promoted === false,
  "v2.2 source preparation boundary drifted"
);
assertV4(
  executionPreparation.status ===
      "frozen-thirty-eight-v2.2-validation-discovery-contexts-prepared-not-authorized" &&
    activation.status ===
      "frozen-thirty-eight-v2.2-validation-discovery-contexts-authorized" &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    activation.authorization.semanticCorrection === false,
  "v2.2 execution boundary drifted"
);
assertV4(
  execution.status === "v2.2-validation-discovery-complete-with-failure" &&
    execution.contextsPlanned === 38 &&
    execution.contextsAttempted === 38 &&
    execution.validContexts === 37 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.scoresDerived === 0,
  "v2.2 failed execution boundary drifted"
);
assertV4(
  diagnosis.status ===
      "v2.2-discovery-gate-failed-nonchronological-candidate-order-confirmed-no-further-action-authorized" &&
    diagnosis.gateDisposition.acceptedAsPassed === false &&
    diagnosis.gateDisposition.v22DiscoveryFailed === true &&
    diagnosis.contractFinding.deterministicValidatorCorrectlyRejectedOutput ===
      true &&
    diagnosis.contractFinding.automaticCandidateReorderingPermitted === false &&
    diagnosis.possibleFutureProtocolDirections.authorized === false,
  "v2.2 failure diagnosis boundary drifted"
);
assertV4(
  predecessorRegression.status ===
      "order-invariant-discovery-validator-retired-regression-passed" &&
    predecessorRegression.totals.availableRawOutputs === 63 &&
    predecessorRegression.totals.orderingOnlyRecoveries === 1 &&
    predecessorRegression.totals.hardenedRejected === 2 &&
    predecessorRegression.invariants.rawOutputsRewritten === false &&
    predecessorRegression.invariants.candidateFieldsModified === false &&
    predecessorRegression.invariants.allNonOrderingValidationRulesRetained ===
      true,
  "promoted order-invariant predecessor evidence drifted"
);

const rows = [];
const debateBundles = [];
let positiveFixture = null;
let replyFixture = null;
for (const debate of preparation.contexts) {
  const [packetBytes, planBytes, eventsBytes, fullLedgerBytes] =
    await Promise.all([
      readFile(debate.packet),
      readFile(debate.plan),
      readFile(debate.originalEvents),
      readFile(debate.fullLedger),
    ]);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  const rawOutputs = [];
  const orderedOutputs = [];
  for (const chunk of debate.chunks) {
    const rawBytes = await readFile(chunk.rawOutput);
    const rawOutput = JSON.parse(rawBytes);
    const executionResult = execution.results.find(
      (result) =>
        result.debateNumber === debate.debateNumber &&
        result.chunkId === chunk.chunkId
    );
    assertV4(
      executionResult?.rawOutputWritten === true &&
        executionResult.rawOutputSha256 === sha256(rawBytes) &&
        executionResult.attemptCount === 1 &&
        executionResult.retryCount === 0,
      `${debate.debateNumber}/${chunk.chunkId}: raw output boundary drifted`
    );
    const args = {
      packet,
      chunk,
      plan,
      eventsDocument: JSON.parse(eventsBytes),
      eventsBytes,
      chunkBytes: await readFile(chunk.chunkLedgerPath),
      fullLedgerBytes,
    };
    const strict = captureValidation(validateV212Discovery, rawOutput, args);
    const successor = captureValidation(validateV221Discovery, rawOutput, args);
    assertV4(
      strict.accepted === executionResult.accepted,
      `${debate.debateNumber}/${chunk.chunkId}: strict replay drifted`
    );
    assertV4(
      successor.accepted &&
        successor.validation.candidateFieldsModified === false &&
        successor.validation.repositoryDerivedLexicalTokenCounts === true &&
        successor.validation.modelAuthoredLexicalTokenCounts === false &&
        successor.validation.modelAuthoredBoundedEndEvents === true &&
        successor.validation.minimumLexicalTokens ===
          V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      `${debate.debateNumber}/${chunk.chunkId}: successor validation failed`
    );
    const canonicalized = canonicalizeV221DiscoveryCandidateOrder(rawOutput);
    rawOutputs.push(rawOutput);
    orderedOutputs.push(canonicalized.orderedOutput);
    rows.push({
      contextIndex: executionResult.contextIndex,
      debateNumber: debate.debateNumber,
      chunkId: chunk.chunkId,
      rawOutput: chunk.rawOutput,
      rawOutputSha256: sha256(rawBytes),
      sourceExecutionAccepted: executionResult.accepted,
      strictAccepted: strict.accepted,
      strictError: strict.error,
      successorAccepted: successor.accepted,
      successorError: successor.error,
      rawChronologyCanonical:
        successor.validation.rawChronologyCanonical,
      canonicalOrderingAppliedForValidation:
        successor.validation.canonicalOrderingAppliedForValidation,
      rawCandidateIds: successor.validation.rawCandidateIds,
      canonicalCandidateIds: successor.validation.canonicalCandidateIds,
      candidateFieldsModified: successor.validation.candidateFieldsModified,
    });
    if (!positiveFixture && rawOutput.candidates.length >= 2 && strict.accepted) {
      positiveFixture = { output: rawOutput, args };
    }
    if (
      !replyFixture &&
      strict.accepted &&
      rawOutput.candidates.some(
        (candidate) => candidate.responseIntent.kind === "reply"
      )
    ) {
      replyFixture = { output: rawOutput, args };
    }
  }
  const rawBundle = compileV221CandidateBundle({
    packet,
    plan,
    outputs: rawOutputs,
  });
  const orderedBundle = compileV221CandidateBundle({
    packet,
    plan,
    outputs: orderedOutputs,
  });
  assertV4(
    canonicalJson(rawBundle) === canonicalJson(orderedBundle),
    `${debate.debateNumber}: compilation depends on raw candidate array order`
  );
  debateBundles.push({
    debateNumber: debate.debateNumber,
    chunks: debate.chunks.length,
    candidates: rawBundle.candidateCount,
    pro: rawBundle.candidates.filter((candidate) => candidate.side === "pro")
      .length,
    con: rawBundle.candidates.filter((candidate) => candidate.side === "con")
      .length,
    rawAndOrderedCompilationCanonicallyIdentical: true,
  });
}

assertV4(positiveFixture && replyFixture, "control fixtures unavailable");
const reversed = structuredClone(positiveFixture.output);
reversed.candidates.reverse();
const reversedStrict = captureValidation(
  validateV212Discovery,
  reversed,
  positiveFixture.args
);
const reversedSuccessor = captureValidation(
  validateV221Discovery,
  reversed,
  positiveFixture.args
);
assertV4(
  !reversedStrict.accepted &&
    reversedSuccessor.accepted &&
    reversedSuccessor.validation.canonicalOrderingAppliedForValidation,
  "ordering-only positive control failed"
);
const singleChunkPlan = {
  ...positiveFixture.args.plan,
  chunks: [positiveFixture.args.chunk],
};
const originalBundle = compileV212CandidateBundle({
  packet: positiveFixture.args.packet,
  plan: singleChunkPlan,
  outputs: [positiveFixture.output],
});
const reversedBundle = compileV221CandidateBundle({
  packet: positiveFixture.args.packet,
  plan: singleChunkPlan,
  outputs: [reversed],
});
assertV4(
  canonicalJson(originalBundle) === canonicalJson(reversedBundle),
  "ordering-only positive control changed compilation"
);

const negativeCases = [
  {
    name: "speaker-side-mismatch",
    fixture: positiveFixture,
    mutate(output, args) {
      const candidate = output.candidates[0];
      const otherSide = candidate.side === "pro" ? "con" : "pro";
      candidate.speaker = args.packet.sides[otherSide].speakers[0];
    },
    expected: /speaker\/side mismatch/,
  },
  {
    name: "source-ownership-bound",
    fixture: positiveFixture,
    mutate(output, args) {
      output.candidates[0].sourceWindow.startEvent =
        args.chunk.coreStartEvent - 1;
    },
    expected: /source window start violates chunk ownership/,
  },
  {
    name: "end-before-start",
    fixture: positiveFixture,
    mutate(output) {
      output.candidates[0].sourceWindow.endEvent =
        output.candidates[0].sourceWindow.startEvent - 1;
    },
    expected: /source window end violates start order or locked lookahead/,
  },
  {
    name: "duplicate-candidate-id",
    fixture: positiveFixture,
    mutate(output) {
      output.candidates[1].candidateId = output.candidates[0].candidateId;
    },
    expected: /invalid or duplicate candidate ID/,
  },
  {
    name: "short-proposition",
    fixture: positiveFixture,
    mutate(output) {
      output.candidates[0].proposition = "too short";
    },
    expected: /proposition too short/,
  },
  {
    name: "short-reply-description",
    fixture: replyFixture,
    mutate(output) {
      output.candidates.find(
        (candidate) => candidate.responseIntent.kind === "reply"
      ).responseIntent.earlierTargetDescription = "too short";
    },
    expected: /too short/,
  },
  {
    name: "prohibited-requested-token-field",
    fixture: positiveFixture,
    mutate(output) {
      output.candidates[0].sourceWindow.requestedLexicalTokens = 12;
    },
    expected: /keys must be endEvent, startEvent/,
  },
  {
    name: "unknown-candidate-field",
    fixture: positiveFixture,
    mutate(output) {
      output.candidates[0].unknownField = true;
    },
    expected: /keys must be/,
  },
];
const negativeControls = negativeCases.map((testCase) => {
  const mutated = structuredClone(testCase.fixture.output);
  testCase.mutate(mutated, testCase.fixture.args);
  const result = captureValidation(
    validateV221Discovery,
    mutated,
    testCase.fixture.args
  );
  assertV4(
    !result.accepted && testCase.expected.test(result.error),
    `${testCase.name}: successor admitted or misclassified negative control: ${result.error}`
  );
  return { name: testCase.name, rejected: true, error: result.error };
});

assertV4(rows.length === 38, "v2.2 raw output count drifted");
assertV4(
  rows.filter((row) => row.strictAccepted).length === 37,
  "strict accepted count drifted"
);
assertV4(
  rows.filter((row) => row.successorAccepted).length === 38,
  "successor accepted count drifted"
);
const recoveredRows = rows.filter(
  (row) => row.canonicalOrderingAppliedForValidation
);
assertV4(
  recoveredRows.length === 1 &&
    recoveredRows[0].debateNumber === "177" &&
    recoveredRows[0].chunkId === "chunk-001" &&
    recoveredRows[0].sourceExecutionAccepted === false,
  "ordering-only recovery identity drifted"
);
assertV4(
  rows.every((row) => !row.candidateFieldsModified),
  "candidate field mutation detected"
);

const sourceFiles = [
  PREPARATION,
  EXECUTION_PREPARATION,
  ACTIVATION,
  EXECUTION,
  DIAGNOSIS,
  PREDECESSOR_REGRESSION,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-discovery-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/v42211722-order-invariant-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  LIBRARY,
  SCRIPT,
  TEST,
  ...preparation.contexts.flatMap((debate) => [
    debate.packet,
    debate.plan,
    debate.fullLedger,
    debate.originalEvents,
    ...debate.chunks.flatMap((chunk) => [
      chunk.chunkLedgerPath,
      chunk.tokenCountedLedgerPath,
      chunk.schemaPath,
      chunk.rawOutput,
    ]),
  ]),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.2.1-order-invariant-discovery-successor-development",
  protocolId: V221_DISCOVERY_VALIDATION_PROTOCOL_ID,
  inheritedModelOutputProtocolId: V212_DISCOVERY_PROTOCOL_ID,
  status:
    "v2.2.1-order-invariant-bounded-end-discovery-successor-model-free-regression-passed",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  predecessorGateDisposition: {
    v22DiscoveryGate: "failed-and-not-retried",
    failureDiagnosis: DIAGNOSIS,
    failureDiagnosisSha256: sha256(diagnosisBytes),
    acceptedAsPassed: false,
    reclassified: false,
    rawOutputsUsedForDevelopmentEvidenceOnly: true,
    proposedV22ScorePolicyPromoted: false,
    v213ScoreGatePreservedFailed: true,
  },
  predecessorOrderInvariantEvidence: {
    regression: PREDECESSOR_REGRESSION,
    regressionSha256: sha256(predecessorRegressionBytes),
    availableRawOutputs: predecessorRegression.totals.availableRawOutputs,
    orderingOnlyRecoveries:
      predecessorRegression.totals.orderingOnlyRecoveries,
    preservedKnownNonOrderingRejections:
      predecessorRegression.totals.hardenedRejected,
  },
  successorContract: {
    validationProtocolId: V221_DISCOVERY_VALIDATION_PROTOCOL_ID,
    modelOutputProtocolIdUnchanged: V212_DISCOVERY_PROTOCOL_ID,
    rawOutputsRewritten: false,
    candidateFieldsModified: false,
    candidateArrayOrderRepositoryCanonicalizedBeforeValidation: true,
    canonicalOrderKey: [
      "sourceWindow.startEvent",
      "sourceWindow.endEvent",
      "candidateId",
    ],
    sourceWindowShapeUnchanged: ["startEvent", "endEvent"],
    repositoryDerivedLexicalTokenCount: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    requestedLexicalTokensProhibited: true,
    modelAuthoredBoundedEndEventRequired: true,
    allNonOrderingValidationRulesRetained: true,
    candidateBundleCompilationOrderInvariant: true,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
    scoreFieldsAvailable: false,
  },
  rows,
  debateBundles,
  positiveControl: {
    reversedRawArrayStrictlyRejected: !reversedStrict.accepted,
    reversedRawArraySuccessorAccepted: reversedSuccessor.accepted,
    canonicalOrderingAppliedForValidation:
      reversedSuccessor.validation.canonicalOrderingAppliedForValidation,
    compiledBundleCanonicallyIdentical: true,
  },
  negativeControls,
  totals: {
    v22RawOutputs: rows.length,
    strictAccepted: rows.filter((row) => row.strictAccepted).length,
    strictRejected: rows.filter((row) => !row.strictAccepted).length,
    successorAccepted: rows.filter((row) => row.successorAccepted).length,
    successorRejected: rows.filter((row) => !row.successorAccepted).length,
    orderingOnlyRecoveries: recoveredRows.length,
    negativeControls: negativeControls.length,
    negativeControlsRejected: negativeControls.filter((item) => item.rejected)
      .length,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  sourceHashes,
  authorization: {
    preservedV22RawOutputMechanicalRecovery: true,
    modelExecution: false,
    retry: false,
    semanticCorrection: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "mechanically-revalidate-and-compile-preserved-v2.2-raw-outputs-under-v2.2.1-model-free-only",
};

if (shouldWrite) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      predecessorGate: analysis.predecessorGateDisposition.v22DiscoveryGate,
      debates: debateBundles,
      totals: analysis.totals,
      positiveControl: analysis.positiveControl,
      negativeControls: negativeControls.map(({ name, rejected }) => ({
        name,
        rejected,
      })),
      modelExecutionAuthorized: false,
      inventoryPreparationAuthorized: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
