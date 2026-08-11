#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.2-validation-cohort";
const DISCOVERY_ROOT = `${ROOT}/discovery`;
const SOURCE_ROOT = `${ROOT}/source-preparation`;
const ACTIVATION = `${DISCOVERY_ROOT}/execution-activation.json`;
const EXECUTION_PREPARATION =
  `${DISCOVERY_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${DISCOVERY_ROOT}/model-execution.json`;
const PREPARATION_MANIFEST = `${SOURCE_ROOT}/preparation-manifest.json`;
const INVALID_OUTPUT =
  `${SOURCE_ROOT}/discovery-outputs/debate-177-chunk-001.json`;
const INVALID_SCHEMA =
  `${SOURCE_ROOT}/schemas/debate-177-chunk-001.schema.json`;
const OUTPUT = `${DISCOVERY_ROOT}/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2.2-discovery-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2-discovery-failure-diagnosis.mjs";
const PRIOR_CANDIDATE_ID = "c007";
const FAILED_CANDIDATE_ID = "c008";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(OUTPUT)),
    `${OUTPUT} already exists; diagnosis is immutable`
  );
}

const [
  activationBytes,
  executionPreparationBytes,
  executionBytes,
  preparationBytes,
  invalidOutputBytes,
  invalidSchemaBytes,
] = await Promise.all([
  readFile(ACTIVATION),
  readFile(EXECUTION_PREPARATION),
  readFile(EXECUTION),
  readFile(PREPARATION_MANIFEST),
  readFile(INVALID_OUTPUT),
  readFile(INVALID_SCHEMA),
]);
const activation = JSON.parse(activationBytes);
const executionPreparation = JSON.parse(executionPreparationBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const invalidOutput = JSON.parse(invalidOutputBytes);
const invalidSchema = JSON.parse(invalidSchemaBytes);

assertV4(
  activation.status ===
      "frozen-thirty-eight-v2.2-validation-discovery-contexts-authorized" &&
    activation.model?.label === "5.6 Sol" &&
    activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.model?.scoreBlind === true &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.authorization?.retry === false &&
    activation.authorization?.semanticCorrection === false &&
    activation.authorization?.independentJudgmentModelExecution === false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false &&
    activation.failedGateDisposition?.v213ScoreGatePreservedFailed === true &&
    activation.proposedPolicy?.promoted === false,
  "v2.2 discovery activation boundary drifted"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `activation source drift: ${file}`
  );
}
assertV4(
  activation.preparationManifest === EXECUTION_PREPARATION &&
    sha256(executionPreparationBytes) ===
      activation.preparationManifestSha256 &&
    executionPreparation.preparation === PREPARATION_MANIFEST,
  "execution preparation manifest hash or source link drifted"
);
assertV4(
  execution.status === "v2.2-validation-discovery-complete-with-failure" &&
    execution.contextsPlanned === 38 &&
    execution.contextsAttempted === 38 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 37 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.scoresDerived === 0 &&
    execution.authorization?.deterministicAnalysis === false &&
    execution.authorization?.retry === false &&
    execution.authorization?.semanticCorrection === false &&
    execution.authorization?.inventoryPreparation === false &&
    execution.authorization?.independentJudgmentModelExecution === false &&
    execution.authorization?.scoreDerivation === false &&
    execution.authorization?.productionMutation === false,
  "v2.2 failed discovery ledger drifted"
);

const failures = execution.results.filter((result) => !result.accepted);
assertV4(failures.length === 1, "exactly one discovery failure is required");
const failure = failures[0];
assertV4(
  failure.contextIndex === 22 &&
    failure.debateNumber === "177" &&
    failure.chunkId === "chunk-001" &&
    failure.status === "output-validation-failed" &&
    failure.attemptCount === 1 &&
    failure.retryCount === 0 &&
    failure.timedOut === false &&
    failure.commandExitCode === 0 &&
    failure.terminationSignal === null &&
    failure.rawOutputWritten === true &&
    failure.rawOutputSha256 === sha256(invalidOutputBytes) &&
    failure.validationMessage?.includes(
      `${FAILED_CANDIDATE_ID}: candidates are not chronological`
    ),
  "Debate 177 chunk-001 failure boundary drifted"
);

const debate = preparation.contexts.find((item) => item.debateNumber === "177");
const chunk = debate?.chunks.find((item) => item.chunkId === "chunk-001");
assertV4(
  debate &&
    chunk &&
    chunk.coreStartEvent === 0 &&
    chunk.coreEndEvent === 859 &&
    chunk.contextStartEvent === 0 &&
    chunk.contextEndEvent === 899 &&
    chunk.rawOutput === INVALID_OUTPUT &&
    chunk.schemaPath === INVALID_SCHEMA &&
    sha256(invalidSchemaBytes) === chunk.schemaSha256,
  "Debate 177 chunk-001 preparation boundary drifted"
);
const priorCandidate = invalidOutput.candidates.find(
  (candidate) => candidate.candidateId === PRIOR_CANDIDATE_ID
);
const failedCandidate = invalidOutput.candidates.find(
  (candidate) => candidate.candidateId === FAILED_CANDIDATE_ID
);
assertV4(
  invalidOutput.candidates.length === 8 &&
    priorCandidate?.sourceWindow?.startEvent === 699 &&
    priorCandidate?.sourceWindow?.endEvent === 878 &&
    failedCandidate?.sourceWindow?.startEvent === 679 &&
    failedCandidate?.sourceWindow?.endEvent === 890 &&
    failedCandidate.side === "con" &&
    failedCandidate.speaker === "Bart Ehrman",
  "nonchronological candidate evidence drifted"
);
const startRegressionEvents =
  priorCandidate.sourceWindow.startEvent -
  failedCandidate.sourceWindow.startEvent;
assertV4(startRegressionEvents === 20, "candidate start regression drifted");

const candidateArraySchema = invalidSchema.properties?.candidates;
const candidateSchema = candidateArraySchema?.items;
const sourceWindowSchema = candidateSchema?.properties?.sourceWindow;
assertV4(
  candidateArraySchema?.type === "array" &&
    candidateArraySchema?.minItems === 0 &&
    candidateArraySchema?.maxItems === 10 &&
    !Object.hasOwn(candidateArraySchema, "contains") &&
    !Object.hasOwn(candidateArraySchema, "prefixItems") &&
    sourceWindowSchema?.properties?.startEvent?.minimum === 0 &&
    sourceWindowSchema?.properties?.startEvent?.maximum === 859 &&
    sourceWindowSchema?.properties?.endEvent?.maximum === 899,
  "chunk-001 transport schema diagnosis boundary drifted"
);

const sourceFiles = [
  ACTIVATION,
  EXECUTION_PREPARATION,
  EXECUTION,
  PREPARATION_MANIFEST,
  INVALID_OUTPUT,
  INVALID_SCHEMA,
  chunk.tokenCountedLedgerPath,
  debate.originalEvents,
  preparation.inputs.discoveryManual,
  preparation.inputs.policy,
  "docs/assessment-production/score-stability-policy-v2.2-retrospective-audit.json",
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-discovery-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  "scripts/validate-v212-discovery.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion: "1.0-score-stability-v2.2-discovery-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "v2.2-discovery-gate-failed-nonchronological-candidate-order-confirmed-no-further-action-authorized",
  diagnosedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  gateDisposition: {
    execution: EXECUTION,
    executionSha256: sha256(executionBytes),
    status: execution.status,
    contextsPlanned: execution.contextsPlanned,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    maximumParallelContextsObserved:
      execution.maximumParallelContextsObserved,
    retries: execution.retries,
    timeoutExtensions: execution.timeoutExtensions,
    semanticCorrections: execution.semanticCorrections,
    acceptedAsPassed: false,
    v213ScoreGatePreservedFailed: true,
    v22DiscoveryFailed: true,
    proposedV22PolicyPromoted: false,
    productionCanaryReclassified: false,
  },
  failure: {
    contextIndex: failure.contextIndex,
    debateNumber: failure.debateNumber,
    chunkId: failure.chunkId,
    priorCandidateId: PRIOR_CANDIDATE_ID,
    failedCandidateId: FAILED_CANDIDATE_ID,
    status: failure.status,
    classification:
      "model-authored-nonchronological-candidate-start-order",
    modelTransportSucceeded: true,
    authentication: failure.authentication,
    timedOut: false,
    commandExitCode: failure.commandExitCode,
    rawOutputPreserved: INVALID_OUTPUT,
    rawOutputSha256: sha256(invalidOutputBytes),
    deterministicValidationPassed: false,
    deterministicValidationMessage:
      "c008: candidates are not chronological",
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  candidateOrderEvidence: {
    candidateCount: invalidOutput.candidates.length,
    priorCandidateId: PRIOR_CANDIDATE_ID,
    priorStartEvent: priorCandidate.sourceWindow.startEvent,
    priorEndEvent: priorCandidate.sourceWindow.endEvent,
    failedCandidateId: FAILED_CANDIDATE_ID,
    failedStartEvent: failedCandidate.sourceWindow.startEvent,
    failedEndEvent: failedCandidate.sourceWindow.endEvent,
    startRegressionEvents,
    transportStartMinimum: sourceWindowSchema.properties.startEvent.minimum,
    transportStartMaximum: sourceWindowSchema.properties.startEvent.maximum,
    crossItemChronologyStructurallyEncoded: false,
  },
  contractFinding: {
    sourceHashesPassed: true,
    modelTransportSucceeded: true,
    outputConformedToTransportSchema: true,
    promptRequiredChronologicalCandidates: true,
    manualRequiredChronologicalCandidates: true,
    transportSchemaCanExpressCurrentCrossItemChronologyRule: false,
    deterministicValidatorCorrectlyRejectedOutput: true,
    compilerDefectDetected: false,
    sourceDefectDetected: false,
    authenticationDefectDetected: false,
    timeoutDetected: false,
    automaticCandidateReorderingPermitted: false,
    semanticCorrectionPermitted: false,
    retryPermitted: false,
    analysisPermitted: false,
    inventoryPreparationPermitted: false,
  },
  possibleFutureProtocolDirections: {
    authorized: false,
    candidates: [
      "Preregister a deterministic canonical-order normalization before a new fresh gate.",
      "Strengthen the model instruction with an explicit final ascending-start-event audit while retaining deterministic rejection.",
      "Replace the array transport with an order-by-construction representation if a future protocol can preserve all candidate semantics.",
    ],
    caveat:
      "Any change would be a prospective successor protocol and cannot rescue, retry, or reclassify this failed v2.2 gate.",
  },
  totals: {
    modelContextsThisDiagnosis: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  sourceHashes,
  authorization: {
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    deterministicCandidateReordering: false,
    analysis: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    audioVerification: false,
    paidTranscription: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: "none-without-explicit-user-authorization",
};

if (shouldWrite) await writeFile(OUTPUT, jsonBytes(diagnosis));
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      failedDebate: diagnosis.failure.debateNumber,
      failedChunk: diagnosis.failure.chunkId,
      priorCandidate: diagnosis.failure.priorCandidateId,
      failedCandidate: diagnosis.failure.failedCandidateId,
      priorStartEvent: diagnosis.candidateOrderEvidence.priorStartEvent,
      failedStartEvent: diagnosis.candidateOrderEvidence.failedStartEvent,
      startRegressionEvents,
      validContexts: diagnosis.gateDisposition.validContexts,
      invalidContexts: diagnosis.gateDisposition.invalidContexts,
      modelContextsThisDiagnosis: 0,
      retries: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
