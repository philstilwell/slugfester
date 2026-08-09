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
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const DISCOVERY_ROOT = `${ROOT}/discovery`;
const SOURCE_ROOT = `${ROOT}/source-preparation`;
const ACTIVATION = `${DISCOVERY_ROOT}/execution-activation.json`;
const EXECUTION_PREPARATION =
  `${DISCOVERY_ROOT}/execution-preparation-manifest.json`;
const EXECUTION = `${DISCOVERY_ROOT}/model-execution.json`;
const PREPARATION_MANIFEST = `${SOURCE_ROOT}/preparation-manifest.json`;
const INVALID_OUTPUT =
  `${SOURCE_ROOT}/discovery-outputs/debate-140-chunk-001.json`;
const INVALID_SCHEMA =
  `${SOURCE_ROOT}/schemas/debate-140-chunk-001.schema.json`;
const OUTPUT = `${DISCOVERY_ROOT}/failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2.1.1-discovery-failure.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-discovery-failure-diagnosis.mjs";
const FAILED_CANDIDATE_ID = "c010";

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
      "frozen-forty-two-v2.1.1-validation-discovery-contexts-authorized" &&
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
    activation.authorization?.productionMutation === false,
  "v2.1.1 discovery activation boundary drifted"
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
  execution.status === "v2.1.1-validation-discovery-complete-with-failure" &&
    execution.contextsPlanned === 42 &&
    execution.contextsAttempted === 42 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 41 &&
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
  "v2.1.1 failed discovery ledger drifted"
);

const failures = execution.results.filter((result) => !result.accepted);
assertV4(failures.length === 1, "exactly one discovery failure is required");
const failure = failures[0];
assertV4(
  failure.contextIndex === 7 &&
    failure.debateNumber === "140" &&
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
      "source window request exceeds the available locked lookahead"
    ),
  "Debate 140 chunk-001 failure boundary drifted"
);

const debate = preparation.contexts.find((item) => item.debateNumber === "140");
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
  "Debate 140 chunk-001 preparation boundary drifted"
);
const tokenLedgerBytes = await readFile(chunk.tokenCountedLedgerPath);
assertV4(
  sha256(tokenLedgerBytes) === chunk.tokenCountedLedgerSha256,
  "Debate 140 token-counted ledger drifted"
);
const tokenRows = tokenLedgerBytes
  .toString("utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
const failedCandidate = invalidOutput.candidates.find(
  (candidate) => candidate.candidateId === FAILED_CANDIDATE_ID
);
assertV4(
  failedCandidate?.sourceWindow?.startEvent === 794 &&
    failedCandidate?.sourceWindow?.requestedLexicalTokens === 648 &&
    failedCandidate.side === "pro" &&
    failedCandidate.speaker === "Kenny Rhodes",
  "failed candidate boundary drifted"
);
const suffixRows = tokenRows.filter(
  (row) => row[0] >= failedCandidate.sourceWindow.startEvent
);
const availableLexicalTokens = suffixRows.reduce(
  (sum, row) => sum + row[3],
  0
);
const requestedLexicalTokens =
  failedCandidate.sourceWindow.requestedLexicalTokens;
const excessLexicalTokens = requestedLexicalTokens - availableLexicalTokens;
assertV4(
  suffixRows[0][0] === 794 &&
    suffixRows.at(-1)[0] === 899 &&
    suffixRows.length === 106 &&
    availableLexicalTokens === 589 &&
    requestedLexicalTokens === 648 &&
    excessLexicalTokens === 59,
  "locked-lookahead capacity diagnosis drifted"
);

const sourceWindowSchema =
  invalidSchema.properties?.candidates?.items?.properties?.sourceWindow;
const tokenRequestSchema =
  sourceWindowSchema?.properties?.requestedLexicalTokens;
assertV4(
  sourceWindowSchema?.properties?.startEvent?.minimum === 0 &&
    sourceWindowSchema?.properties?.startEvent?.maximum === 859 &&
    tokenRequestSchema?.minimum === 12 &&
    tokenRequestSchema?.maximum === 4962 &&
    !Object.hasOwn(sourceWindowSchema.properties, "endEvent"),
  "chunk-001 successor schema diagnosis boundary drifted"
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
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
  SCRIPT,
  TEST,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-discovery-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "v2.1.1-discovery-gate-failed-start-dependent-locked-lookahead-capacity-confirmed-no-further-action-authorized",
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
    v1CanaryPreservedFailed: true,
    v2ValidationPreservedFailed: true,
    v21DiscoveryPreservedFailed: true,
    v211DiscoveryFailed: true,
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
      "schema-admitted-start-dependent-token-request-exceeding-locked-lookahead-capacity",
    modelTransportSucceeded: true,
    authentication: failure.authentication,
    timedOut: false,
    commandExitCode: failure.commandExitCode,
    rawOutputPreserved: INVALID_OUTPUT,
    rawOutputSha256: sha256(invalidOutputBytes),
    deterministicValidationPassed: false,
    deterministicValidationMessage:
      "source window request exceeds the available locked lookahead",
    semanticCorrectionPerformed: false,
    retryPerformed: false,
  },
  sourceWindowEvidence: {
    startEvent: failedCandidate.sourceWindow.startEvent,
    coreStartEvent: chunk.coreStartEvent,
    coreEndEvent: chunk.coreEndEvent,
    contextEndEvent: chunk.contextEndEvent,
    suffixStartEvent: suffixRows[0][0],
    suffixEndEvent: suffixRows.at(-1)[0],
    suffixEventCount: suffixRows.length,
    availableLexicalTokens,
    requestedLexicalTokens,
    excessLexicalTokens,
    schemaMinimumRequestedLexicalTokens: tokenRequestSchema.minimum,
    schemaMaximumRequestedLexicalTokens: tokenRequestSchema.maximum,
    candidateProposition: failedCandidate.proposition,
    candidateAttributionBasis: failedCandidate.attributionBasis,
    sourceStartWasOwnedByCore: true,
    modelAuthoredEndEvent: false,
    repositoryMaterializationRejected: true,
  },
  contractFinding: {
    tokenMinimumStructurallyEncoded: true,
    modelAuthoredEndEventProhibited: true,
    repositoryMaterializationEnabled: true,
    tokenRequestGlobalMaximumEncoded: true,
    tokenRequestMaximumConditionalOnSelectedStart: false,
    deterministicValidatorCorrectlyRejectedOutput: true,
    preregisteredResidualRiskOccurred: true,
    thresholdRelaxationPermitted: false,
    automaticTokenRequestClampingPermitted: false,
    automaticSpanTruncationPermitted: false,
    candidateOmissionWouldBeSemanticRepair: true,
    currentOutputReusableForFutureAcceptance: false,
    finding:
      "The schema encoded a 12-token minimum and a chunk-global 4,962-token maximum, but not the 589-token suffix capacity associated with start event 794. The model's 648-token request therefore passed transport schema validation and was correctly rejected during repository materialization.",
  },
  possibleFutureProtocolDirection: {
    authorized: false,
    description:
      "A separately authorized successor must bind every permitted start event to a capacity-safe requested-token maximum, or provide an equivalent structurally enforced representation, without silently truncating the intended semantic endpoint.",
    requirements: [
      "preserve the explicit predecessor-chunk ownership rule and 12-token minimum",
      "structurally enforce start-dependent locked-lookahead capacity",
      "do not clamp, truncate, omit, or repair a model-authored candidate automatically",
      "prove schema size and copied-input ceilings remain operationally safe",
      "model-free regression against the preserved Debate 140 chunk-001 artifact",
      "new disjoint fresh validation evidence; no v2.1.1 output may count toward successor acceptance",
      "one attempt per context with no retry or timeout extension",
      "explicit user authorization before successor development or model execution",
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
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      gateDisposition: diagnosis.gateDisposition,
      failure: diagnosis.failure,
      sourceWindowEvidence: diagnosis.sourceWindowEvidence,
      contractFinding: diagnosis.contractFinding,
      modelContextsThisDiagnosis: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
