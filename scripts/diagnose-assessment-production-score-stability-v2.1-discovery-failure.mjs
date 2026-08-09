#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

import { lexicalTokens } from "./lib/v418-source-integrity.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort";
const DISCOVERY_ROOT = `${ROOT}/discovery`;
const SOURCE_ROOT = `${ROOT}/source-preparation`;
const ACTIVATION = `${DISCOVERY_ROOT}/execution-activation.json`;
const EXECUTION_PREPARATION = `${DISCOVERY_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${DISCOVERY_ROOT}/model-execution.json`;
const PREPARATION_MANIFEST = `${SOURCE_ROOT}/preparation-manifest.json`;
const INVALID_OUTPUT = `${SOURCE_ROOT}/discovery-outputs/debate-143-chunk-003.json`;
const PREVIOUS_OUTPUT = `${SOURCE_ROOT}/discovery-outputs/debate-143-chunk-002.json`;
const INVALID_SCHEMA = `${SOURCE_ROOT}/schemas/debate-143-chunk-003.schema.json`;
const OUTPUT = `${DISCOVERY_ROOT}/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2.1-discovery-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1-discovery-failure-diagnosis.mjs";
const FAILED_CANDIDATE_ID = "c003-01";
const PREVIOUS_CANDIDATE_ID = "c002-10";
const MINIMUM_LEXICAL_TOKENS = 12;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(
  () => true,
  () => false
);

if (shouldWrite) {
  assertV4(!(await exists(OUTPUT)), `${OUTPUT} already exists; diagnosis is immutable`);
}

const [activationBytes, executionPreparationBytes, executionBytes,
  preparationBytes, invalidOutputBytes, previousOutputBytes, invalidSchemaBytes] = await Promise.all([
  readFile(ACTIVATION),
  readFile(EXECUTION_PREPARATION),
  readFile(EXECUTION),
  readFile(PREPARATION_MANIFEST),
  readFile(INVALID_OUTPUT),
  readFile(PREVIOUS_OUTPUT),
  readFile(INVALID_SCHEMA),
]);
const activation = JSON.parse(activationBytes);
const executionPreparation = JSON.parse(executionPreparationBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);
const invalidOutput = JSON.parse(invalidOutputBytes);
const previousOutput = JSON.parse(previousOutputBytes);
const invalidSchema = JSON.parse(invalidSchemaBytes);

assertV4(
  activation.status ===
      "frozen-forty-v2.1-validation-discovery-contexts-authorized" &&
    activation.model?.label === "5.6 Sol" &&
    activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.authorization?.retry === false &&
    activation.authorization?.semanticCorrection === false &&
    activation.authorization?.independentJudgmentModelExecution === false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false,
  "v2.1 discovery activation boundary drifted"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `activation source drift: ${file}`);
}
assertV4(
  activation.preparationManifest === EXECUTION_PREPARATION &&
    sha256(executionPreparationBytes) === activation.preparationManifestSha256 &&
    executionPreparation.preparation === PREPARATION_MANIFEST,
  "execution preparation manifest hash or source link drifted"
);
assertV4(
  execution.status === "v2.1-validation-discovery-complete-with-failure" &&
    execution.contextsPlanned === 40 &&
    execution.contextsAttempted === 40 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 39 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.scoresDerived === 0 &&
    execution.authorization?.deterministicAnalysis === false &&
    execution.authorization?.retry === false &&
    execution.authorization?.semanticCorrection === false &&
    execution.authorization?.inventoryPreparation === false &&
    execution.authorization?.independentJudgmentModelExecution === false &&
    execution.authorization?.scoreDerivation === false &&
    execution.authorization?.productionMutation === false,
  "v2.1 failed discovery ledger drifted"
);

const failures = execution.results.filter((result) => !result.accepted);
assertV4(failures.length === 1, "exactly one discovery failure is required");
const failure = failures[0];
assertV4(
  failure.contextIndex === 8 &&
    failure.debateNumber === "143" &&
    failure.chunkId === "chunk-003" &&
    failure.status === "output-validation-failed" &&
    failure.attemptCount === 1 &&
    failure.retryCount === 0 &&
    failure.timedOut === false &&
    failure.commandExitCode === 0 &&
    failure.terminationSignal === null &&
    failure.rawOutputWritten === true &&
    failure.rawOutputSha256 === sha256(invalidOutputBytes) &&
    failure.validationMessage?.includes(
      `${FAILED_CANDIDATE_ID}: source span has fewer than 12 lexical tokens`
    ),
  "Debate 143 chunk-003 failure boundary drifted"
);
const previousResult = execution.results.find(
  (result) => result.debateNumber === "143" && result.chunkId === "chunk-002"
);
assertV4(
  previousResult?.accepted === true &&
    previousResult.status === "completed-valid" &&
    previousResult.rawOutputSha256 === sha256(previousOutputBytes),
  "Debate 143 chunk-002 accepted predecessor drifted"
);

const debate = preparation.contexts.find((item) => item.debateNumber === "143");
const chunk = debate?.chunks.find((item) => item.chunkId === "chunk-003");
assertV4(
  debate && chunk &&
    chunk.coreStartEvent === 1680 &&
    chunk.coreEndEvent === 2499 &&
    chunk.contextStartEvent === 1640 &&
    chunk.contextEndEvent === 2539 &&
    chunk.rawOutput === INVALID_OUTPUT &&
    chunk.schemaPath === INVALID_SCHEMA &&
    sha256(invalidSchemaBytes) === chunk.schemaSha256,
  "Debate 143 chunk-003 preparation boundary drifted"
);
const eventsBytes = await readFile(debate.originalEvents);
assertV4(
  sha256(eventsBytes) === debate.originalEventsSha256,
  "Debate 143 event source drifted"
);
const eventsDocument = JSON.parse(eventsBytes);
const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument.events;
assertV4(Array.isArray(events), "Debate 143 events are malformed");

const failedCandidate = invalidOutput.candidates.find(
  (candidate) => candidate.candidateId === FAILED_CANDIDATE_ID
);
const previousCandidate = previousOutput.candidates.find(
  (candidate) => candidate.candidateId === PREVIOUS_CANDIDATE_ID
);
assertV4(
  failedCandidate?.sourceSpan?.startEvent === 1680 &&
    failedCandidate?.sourceSpan?.endEvent === 1681 &&
    failedCandidate.side === "pro" &&
    failedCandidate.speaker === "Tyler Vela" &&
    previousCandidate?.sourceSpan?.startEvent === 1620 &&
    previousCandidate?.sourceSpan?.endEvent === 1681 &&
    previousCandidate.side === failedCandidate.side &&
    previousCandidate.speaker === failedCandidate.speaker,
  "failed or predecessor candidate boundary drifted"
);
const failedSpanEvents = events.slice(
  failedCandidate.sourceSpan.startEvent,
  failedCandidate.sourceSpan.endEvent + 1
);
const failedSpanText = failedSpanEvents.map((event) => event.text).join(" ");
const failedSpanTokens = lexicalTokens(failedSpanText);
assertV4(
  failedSpanTokens.length === 11 &&
    failedSpanTokens.length < MINIMUM_LEXICAL_TOKENS,
  "failed span token diagnosis drifted"
);
const previousSpanContainsFailedSpan =
  previousCandidate.sourceSpan.startEvent <= failedCandidate.sourceSpan.startEvent &&
  previousCandidate.sourceSpan.endEvent >= failedCandidate.sourceSpan.endEvent;
assertV4(previousSpanContainsFailedSpan, "cross-boundary containment drifted");
assertV4(
  failedCandidate.attributionBasis.includes("continues Vela's uninterrupted question") &&
    failedCandidate.sourceSpan.startEvent === chunk.coreStartEvent,
  "cross-boundary tail evidence drifted"
);

const spanSchema = invalidSchema.properties?.candidates?.items?.properties?.sourceSpan;
assertV4(
  spanSchema?.properties?.startEvent?.minimum === 1680 &&
    spanSchema?.properties?.startEvent?.maximum === 2499 &&
    spanSchema?.properties?.endEvent?.minimum === 1640 &&
    spanSchema?.properties?.endEvent?.maximum === 2539 &&
    !invalidSchemaBytes.includes(Buffer.from("lexical")) &&
    !invalidSchemaBytes.includes(Buffer.from("minimumTokens")),
  "chunk-003 schema diagnosis boundary drifted"
);
const manualBytes = await readFile(
  "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md"
);
assertV4(
  !manualBytes.includes(Buffer.from("12 lexical")) &&
    !manualBytes.includes(Buffer.from("twelve lexical")),
  "manual now discloses the formerly hidden token minimum"
);

const sourceFiles = [
  ACTIVATION,
  EXECUTION_PREPARATION,
  EXECUTION,
  PREPARATION_MANIFEST,
  INVALID_OUTPUT,
  PREVIOUS_OUTPUT,
  INVALID_SCHEMA,
  debate.originalEvents,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion: "1.0-score-stability-v2.1-discovery-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "v2.1-discovery-gate-failed-cross-boundary-short-source-span-confirmed-no-further-action-authorized",
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
    maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
    retries: execution.retries,
    timeoutExtensions: execution.timeoutExtensions,
    acceptedAsPassed: false,
    priorV1GatePreservedFailed: true,
    priorV2GatePreservedFailed: true,
    proposedV21PolicyPromoted: false,
    currentCanaryReclassified: false,
  },
  failure: {
    contextIndex: failure.contextIndex,
    debateNumber: failure.debateNumber,
    chunkId: failure.chunkId,
    candidateId: FAILED_CANDIDATE_ID,
    status: failure.status,
    classification:
      "schema-conforming-cross-boundary-tail-rejected-by-source-derived-lexical-minimum",
    modelTransportSucceeded: true,
    authentication: failure.authentication,
    timedOut: false,
    commandExitCode: failure.commandExitCode,
    rawOutputPreserved: INVALID_OUTPUT,
    rawOutputSha256: sha256(invalidOutputBytes),
    deterministicValidationPassed: false,
    deterministicValidationMessage:
      `${FAILED_CANDIDATE_ID}: source span has fewer than 12 lexical tokens`,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  sourceSpanEvidence: {
    startEvent: failedCandidate.sourceSpan.startEvent,
    endEvent: failedCandidate.sourceSpan.endEvent,
    coreStartEvent: chunk.coreStartEvent,
    eventCount: failedSpanEvents.length,
    lexicalTokenCount: failedSpanTokens.length,
    minimumLexicalTokenCount: MINIMUM_LEXICAL_TOKENS,
    deficit: MINIMUM_LEXICAL_TOKENS - failedSpanTokens.length,
    exactEventTexts: failedSpanEvents.map((event, index) => ({
      event: failedCandidate.sourceSpan.startEvent + index,
      text: event.text,
    })),
    exactLexicalTokens: failedSpanTokens,
    candidateAttributionBasis: failedCandidate.attributionBasis,
    candidateBeginsAtCoreBoundary: true,
    predecessorChunkAccepted: true,
    predecessorCandidateId: PREVIOUS_CANDIDATE_ID,
    predecessorSourceSpan: previousCandidate.sourceSpan,
    predecessorSpanContainsFailedSpan: previousSpanContainsFailedSpan,
    sameSideAndSpeakerAsPredecessorCandidate: true,
  },
  contractFinding: {
    sourceSpecificSchemaAcceptedIntegerPairWithinBounds: true,
    sourceSpecificSchemaEncodedLexicalMinimum: false,
    reviewerManualDisclosedLexicalMinimum: false,
    deterministicValidatorEnforcedLexicalMinimum: true,
    deterministicValidatorCorrectlyRejectedOutput: true,
    thresholdRelaxationPermitted: false,
    automaticSpanExpansionPermitted: false,
    candidateOmissionOrReassignmentWouldBeSemanticRepair: true,
    currentOutputReusableForFutureAcceptance: false,
    finding:
      "The output contract admitted a core-boundary span whose source-derived length could only be rejected after generation. The rejected tail was already contained in an accepted predecessor-chunk candidate, but changing or omitting it would alter model-authored discovery and is therefore not allowed in this gate.",
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "A separately authorized versioned discovery protocol could make predecessor ownership and the 12-token minimum explicit, structurally exclude source-specific short spans, and prove the change against this retired artifact before using fresh evidence.",
    requirements: [
      "new versioned manual, prompt, source-specific schema, and deterministic validator",
      "explicit rule that a move beginning in lookbehind remains owned by the predecessor chunk",
      "structural rejection of source-span coordinates below the frozen lexical minimum",
      "model-free regression using the preserved Debate 143 chunk-003 artifact",
      "new disjoint fresh validation cohort and frozen execution activation",
      "no reuse of any output from the failed v2.1 gate for successor acceptance",
      "one attempt per context with no retry or timeout extension",
      "explicit user authorization",
    ],
  },
  sourceHashes,
  totals: {
    modelContextsThisDiagnosis: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    deterministicPassingAnalysis: false,
    candidateCompilation: false,
    inventoryPreparation: false,
    inventoryModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
    successorProtocolDevelopment: false,
    successorModelExecution: false,
  },
  nextAuthorizedAction: "none-without-explicit-user-authorization",
};

if (shouldWrite) await writeFile(OUTPUT, jsonBytes(diagnosis));
console.log(JSON.stringify({
  status: shouldWrite ? diagnosis.status : "preview",
  gateDisposition: diagnosis.gateDisposition,
  failure: diagnosis.failure,
  sourceSpanEvidence: diagnosis.sourceSpanEvidence,
  contractFinding: diagnosis.contractFinding,
  modelContextsThisDiagnosis: 0,
  scoresDerived: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction,
}, null, 2));
