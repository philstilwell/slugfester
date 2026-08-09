#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V211_DISCOVERY_MODEL,
  V211_DISCOVERY_PROTOCOL_ID,
  buildV211TokenCountedChunkLedger,
  makeV211DiscoverySchema,
  migrateV422112OutputToV211ForRegression,
  validateV211Discovery,
} from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const V21_ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort";
const ROOT =
  "docs/assessment-production/score-stability-v2.1.1-discovery-successor-development";
const FAILURE_DIAGNOSIS = `${V21_ROOT}/discovery/failure-diagnosis.json`;
const ACTIVATION = `${V21_ROOT}/discovery/execution-activation.json`;
const EXECUTION = `${V21_ROOT}/discovery/model-execution.json`;
const PREPARATION = `${V21_ROOT}/source-preparation/preparation-manifest.json`;
const MANUAL = `${ROOT}/manual.md`;
const SCHEMA = `${ROOT}/schemas/debate-143-chunk-003.schema.json`;
const TOKEN_LEDGER = `${ROOT}/token-ledgers/debate-143-chunk-003.jsonl`;
const REGRESSION = `${ROOT}/retired-artifact-regression.json`;
const ANALYSIS = `${ROOT}/development-analysis.json`;
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2.1.1-discovery-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.1-discovery-successor.mjs";
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(
  () => true,
  () => false
);

if (shouldWrite) {
  for (const output of [SCHEMA, TOKEN_LEDGER, REGRESSION, ANALYSIS]) {
    assertV4(!(await exists(output)), `${output} already exists; development output is immutable`);
  }
}

const [failureBytes, activationBytes, executionBytes, preparationBytes, manualBytes] =
  await Promise.all([
    readFile(FAILURE_DIAGNOSIS),
    readFile(ACTIVATION),
    readFile(EXECUTION),
    readFile(PREPARATION),
    readFile(MANUAL),
  ]);
const failure = JSON.parse(failureBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);

assertV4(
  failure.status ===
      "v2.1-discovery-gate-failed-cross-boundary-short-source-span-confirmed-no-further-action-authorized" &&
    failure.failure?.debateNumber === "143" &&
    failure.failure?.chunkId === "chunk-003" &&
    failure.failure?.candidateId === "c003-01" &&
    failure.sourceSpanEvidence?.lexicalTokenCount === 11 &&
    failure.sourceSpanEvidence?.minimumLexicalTokenCount === 12 &&
    failure.gateDisposition?.acceptedAsPassed === false &&
    failure.authorization?.retry === false &&
    failure.authorization?.semanticCorrection === false &&
    failure.authorization?.successorModelExecution === false,
  "frozen v2.1 discovery failure boundary drifted"
);
for (const [file, digest] of Object.entries(failure.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `failure diagnosis source drift: ${file}`);
}
assertV4(
  activation.model?.label === V211_DISCOVERY_MODEL.label &&
    activation.model?.slug === V211_DISCOVERY_MODEL.slug &&
    activation.model?.reasoningEffort === V211_DISCOVERY_MODEL.reasoningEffort &&
    activation.model?.authentication === V211_DISCOVERY_MODEL.authentication &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0,
  "inherited model or execution discipline drifted"
);
assertV4(
  execution.status === "v2.1-validation-discovery-complete-with-failure" &&
    execution.contextsAttempted === 40 &&
    execution.validContexts === 39 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0 &&
    preparation.contexts.length === 10,
  "retired v2.1 regression corpus drifted"
);
assertV4(
  manualBytes.includes(
    Buffer.from("A move that begins in lookbehind remains owned by the predecessor chunk")
  ) &&
    manualBytes.includes(Buffer.from("requestedLexicalTokens")) &&
    manualBytes.includes(Buffer.from("must be at least 12")) &&
    manualBytes.includes(Buffer.from("never emit an end event")),
  "successor manual does not close the frozen boundary and length contract"
);

const preparationByDebate = new Map(
  preparation.contexts.map((context) => [context.debateNumber, context])
);
const contextResults = [];
let acceptedCandidateCount = 0;
let exactSpanReconstructions = 0;
let rejectedCandidate = null;
const regressionSourceFiles = [];

for (const result of execution.results) {
  const debate = preparationByDebate.get(result.debateNumber);
  const chunk = debate?.chunks.find((item) => item.chunkId === result.chunkId);
  assertV4(debate && chunk, `${result.debateNumber}/${result.chunkId}: preparation missing`);
  const [packetBytes, planBytes, eventsBytes, chunkBytes, fullLedgerBytes, rawBytes] =
    await Promise.all([
      readFile(debate.packet),
      readFile(debate.plan),
      readFile(debate.originalEvents),
      readFile(chunk.chunkLedgerPath),
      readFile(debate.fullLedger),
      readFile(chunk.rawOutput),
    ]);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const predecessorOutput = JSON.parse(rawBytes);
  const migrated = migrateV422112OutputToV211ForRegression(
    predecessorOutput,
    eventsDocument
  );
  const args = {
    packet,
    chunk,
    plan,
    eventsDocument,
    eventsBytes,
    chunkBytes,
    fullLedgerBytes,
  };
  regressionSourceFiles.push(
    debate.packet,
    debate.plan,
    debate.originalEvents,
    chunk.chunkLedgerPath,
    debate.fullLedger,
    chunk.rawOutput
  );
  if (result.accepted) {
    const validation = validateV211Discovery(migrated, args);
    assertV4(
      validation.status === "passed" &&
        validation.repositoryMaterializedSourceWindows === true &&
        validation.modelAuthoredEndEvents === false &&
        validation.minimumLexicalTokens === V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS &&
        validation.materializedWindows.length === predecessorOutput.candidates.length,
      `${result.debateNumber}/${result.chunkId}: successor regression validation failed`
    );
    for (const [index, window] of validation.materializedWindows.entries()) {
      const predecessorSpan = predecessorOutput.candidates[index].sourceSpan;
      assertV4(
        window.startEvent === predecessorSpan.startEvent &&
          window.endEvent === predecessorSpan.endEvent &&
          window.materializedLexicalTokens === window.requestedLexicalTokens,
        `${result.debateNumber}/${result.chunkId}/${window.candidateId}: source span did not reconstruct exactly`
      );
      exactSpanReconstructions += 1;
    }
    acceptedCandidateCount += predecessorOutput.candidates.length;
    contextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: true,
      successorRegressionStatus: "passed-exact-source-window-reconstruction",
      candidates: predecessorOutput.candidates.length,
      exactSpanReconstructions: validation.materializedWindows.length,
      predecessorOutputSha256: sha256(rawBytes),
    });
  } else {
    let rejectionMessage = null;
    try {
      validateV211Discovery(migrated, args);
    } catch (error) {
      rejectionMessage = error.message;
    }
    const candidate = migrated.candidates.find(
      (item) => item.candidateId === failure.failure.candidateId
    );
    assertV4(
      result.contextIndex === failure.failure.contextIndex &&
        result.debateNumber === failure.failure.debateNumber &&
        result.chunkId === failure.failure.chunkId &&
        candidate?.sourceWindow?.startEvent === 1680 &&
        candidate?.sourceWindow?.requestedLexicalTokens === 11 &&
        rejectionMessage ===
          "c003-01: source window requests fewer than 12 lexical tokens",
      "retired failed artifact was not structurally rejected at the frozen defect"
    );
    rejectedCandidate = {
      candidateId: candidate.candidateId,
      startEvent: candidate.sourceWindow.startEvent,
      requestedLexicalTokens: candidate.sourceWindow.requestedLexicalTokens,
      minimumLexicalTokens: V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      rejectionMessage,
      rejectedBeforeSourceWindowMaterialization: true,
    };
    contextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: false,
      successorRegressionStatus: "passed-retired-short-window-structurally-rejected",
      candidates: predecessorOutput.candidates.length,
      rejectedCandidate,
      predecessorOutputSha256: sha256(rawBytes),
    });
  }
}

assertV4(
  contextResults.length === 40 &&
    contextResults.filter((result) => result.predecessorAccepted).length === 39 &&
    acceptedCandidateCount === 370 &&
    exactSpanReconstructions === 370 &&
    rejectedCandidate?.requestedLexicalTokens === 11,
  "successor regression totals drifted"
);

const debate143 = preparationByDebate.get("143");
const chunk143 = debate143.chunks.find((chunk) => chunk.chunkId === "chunk-003");
const [packet143Bytes, events143Bytes, chunk143Bytes] = await Promise.all([
  readFile(debate143.packet),
  readFile(debate143.originalEvents),
  readFile(chunk143.chunkLedgerPath),
]);
const packet143 = JSON.parse(packet143Bytes);
const events143 = JSON.parse(events143Bytes);
const schema = makeV211DiscoverySchema({
  packet: packet143,
  chunk: chunk143,
  eventsDocument: events143,
});
const schemaBytes = jsonBytes(schema);
const tokenLedgerBytes = buildV211TokenCountedChunkLedger(chunk143Bytes);
const sourceWindowSchema =
  schema.properties.candidates.items.properties.sourceWindow;
assertV4(
  sourceWindowSchema.required.length === 2 &&
    sourceWindowSchema.required.includes("startEvent") &&
    sourceWindowSchema.required.includes("requestedLexicalTokens") &&
    sourceWindowSchema.properties.requestedLexicalTokens.minimum === 12 &&
    !Object.hasOwn(sourceWindowSchema.properties, "endEvent") &&
    !Object.hasOwn(schema.properties.candidates.items.properties, "sourceSpan"),
  "successor schema does not structurally close the short-span contract"
);

const regression = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-retired-discovery-artifact-regression",
  protocolId: V211_DISCOVERY_PROTOCOL_ID,
  status:
    "passed-39-valid-contexts-exactly-reconstructed-and-retired-short-window-rejected",
  diagnosticUseOnly: true,
  failedV21GateReclassified: false,
  failedV21OutputsReusableForSuccessorAcceptance: false,
  contexts: contextResults,
  totals: {
    predecessorContexts: 40,
    predecessorAcceptedContexts: 39,
    predecessorFailedContexts: 1,
    successorExactRegressionContexts: 39,
    successorStructurallyRejectedContexts: 1,
    acceptedCandidatesReplayed: acceptedCandidateCount,
    exactSourceSpanReconstructions: exactSpanReconstructions,
    rejectedCandidates: 1,
    modelContexts: 0,
    retries: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
  },
  frozenFailure: {
    debateNumber: "143",
    chunkId: "chunk-003",
    rejectedCandidate,
  },
};
const regressionBytes = jsonBytes(regression);

const sourceFiles = [
  FAILURE_DIAGNOSIS,
  ACTIVATION,
  EXECUTION,
  PREPARATION,
  MANUAL,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md",
  "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-canary-score-gate.mjs",
  LIBRARY,
  SCRIPT,
  TEST,
  ...regressionSourceFiles,
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.1.1-discovery-successor-development-analysis",
  protocolId: V211_DISCOVERY_PROTOCOL_ID,
  status:
    "v2.1.1-repository-materialized-discovery-successor-model-free-regression-passed",
  developedAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  userAuthorization: {
    instruction: "Continue at your discretion.",
    interpretedScope: "model-free-successor-protocol-development",
    modelExecutionAuthorizedByThisArtifact: false,
  },
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  inheritedModelBoundary: V211_DISCOVERY_MODEL,
  failedGateDisposition: {
    diagnosis: FAILURE_DIAGNOSIS,
    diagnosisSha256: sha256(failureBytes),
    status: failure.status,
    v1CanaryPreservedFailed: true,
    v2ValidationPreservedFailed: true,
    v21DiscoveryPreservedFailed: true,
    v21AcceptedAsPassed: false,
    validV21OutputsAcceptedForSuccessorEvidence: false,
    currentCanaryReclassified: false,
    v21PolicyPromoted: false,
  },
  successorContract: {
    outputSchemaVersion: schema.properties.schemaVersion.const,
    sourceSelectionShape: ["startEvent", "requestedLexicalTokens"],
    modelAuthoredEndEvent: false,
    modelAuthoredEvidenceText: false,
    minimumRequestedLexicalTokens: V211_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumStructurallyEncodedInSchema: true,
    repositoryMaterializesSmallestInclusiveEndEvent: true,
    tokenCountsSuppliedPerLedgerRow: true,
    predecessorOwnershipRuleExplicit: true,
    predecessorOwnershipRule:
      "a move that begins in lookbehind remains owned by the predecessor chunk",
    thresholdRelaxed: false,
    silentCandidateDeletion: false,
    automaticSemanticRepair: false,
    selectedTargetTopologyStillDeferredToPrimaryA: true,
    ratingsScoresWinnersAndLegacyMaterialUnavailable: true,
  },
  regression: {
    artifact: REGRESSION,
    artifactSha256: sha256(regressionBytes),
    status: regression.status,
    predecessorContexts: 40,
    exactRegressionContexts: 39,
    structurallyRejectedContexts: 1,
    acceptedCandidatesReplayed: acceptedCandidateCount,
    exactSourceSpanReconstructions: exactSpanReconstructions,
    failedCandidateRequestedLexicalTokens: 11,
    failedCandidateMinimumLexicalTokens: 12,
    failedCandidateRejectedBeforeMaterialization: true,
    diagnosticUseOnly: true,
  },
  artifacts: {
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
    schema: SCHEMA,
    schemaSha256: sha256(schemaBytes),
    tokenCountedLedger: TOKEN_LEDGER,
    tokenCountedLedgerSha256: sha256(tokenLedgerBytes),
    regression: REGRESSION,
    regressionSha256: sha256(regressionBytes),
  },
  residualRisks: {
    requestedTokenCountMustMatchIntendedSemanticEndpoint: true,
    repositoryMayRejectARequestExceedingLockedLookahead: true,
    predecessorOwnershipRemainsReviewerSemanticInstruction: true,
    schemaPreventsSubTwelveRequestButNotBadCandidateSelection: true,
    mitigation:
      "The token-counted ledger removes lexical counting guesswork, repository materialization removes end-coordinate arithmetic, the manual makes predecessor ownership explicit, and a fresh disjoint gate remains mandatory.",
  },
  sourceHashes,
  totals: {
    modelContexts: 0,
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
    freshDisjointCohortSelection: true,
    freshSourcePreparation: false,
    discoveryExecutionManifestPreparation: false,
    discoveryModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
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
  },
  nextAuthorizedAction:
    "prepare-disjoint-fresh-v2.1.1-validation-cohort-selection-only",
};
const analysisBytes = jsonBytes(analysis);

if (shouldWrite) {
  for (const file of [SCHEMA, TOKEN_LEDGER, REGRESSION, ANALYSIS]) {
    await mkdir(path.dirname(file), { recursive: true });
  }
  await Promise.all([
    writeFile(SCHEMA, schemaBytes),
    writeFile(TOKEN_LEDGER, tokenLedgerBytes),
    writeFile(REGRESSION, regressionBytes),
  ]);
  await writeFile(ANALYSIS, analysisBytes);
}

console.log(JSON.stringify({
  status: shouldWrite ? analysis.status : "preview",
  failedGateDisposition: analysis.failedGateDisposition,
  successorContract: analysis.successorContract,
  regression: analysis.regression,
  residualRisks: analysis.residualRisks,
  totals: analysis.totals,
  authorization: analysis.authorization,
  nextAuthorizedAction: analysis.nextAuthorizedAction,
}, null, 2));
