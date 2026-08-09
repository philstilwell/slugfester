#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_MODEL,
  V212_DISCOVERY_PROTOCOL_ID,
  buildV212TokenCountedChunkLedger,
  makeV212DiscoverySchema,
  migrateV211OutputToV212ForRegression,
  migrateV422112OutputToV212ForRegression,
  validateV212Discovery,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { materializeV211SourceWindow } from "./lib/assessment-production-score-stability-v2.1.1-discovery.mjs";
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
const V211_ROOT =
  "docs/assessment-production/score-stability-v2.1.1-validation-cohort";
const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development";
const V21_FAILURE = `${V21_ROOT}/discovery/failure-diagnosis.json`;
const V21_ACTIVATION = `${V21_ROOT}/discovery/execution-activation.json`;
const V21_EXECUTION = `${V21_ROOT}/discovery/model-execution.json`;
const V21_PREPARATION =
  `${V21_ROOT}/source-preparation/preparation-manifest.json`;
const V211_FAILURE = `${V211_ROOT}/discovery/failure-diagnosis.json`;
const V211_ACTIVATION = `${V211_ROOT}/discovery/execution-activation.json`;
const V211_EXECUTION = `${V211_ROOT}/discovery/model-execution.json`;
const V211_PREPARATION =
  `${V211_ROOT}/source-preparation/preparation-manifest.json`;
const MANUAL = `${ROOT}/manual.md`;
const SCHEMA_143 = `${ROOT}/schemas/debate-143-chunk-003.schema.json`;
const SCHEMA_140 = `${ROOT}/schemas/debate-140-chunk-001.schema.json`;
const TOKEN_LEDGER_143 =
  `${ROOT}/token-ledgers/debate-143-chunk-003.jsonl`;
const TOKEN_LEDGER_140 =
  `${ROOT}/token-ledgers/debate-140-chunk-001.jsonl`;
const REGRESSION = `${ROOT}/retired-artifact-regression.json`;
const ANALYSIS = `${ROOT}/development-analysis.json`;
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2.1.2-discovery-successor.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.2-discovery-successor.mjs";
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  for (const output of [
    SCHEMA_143,
    SCHEMA_140,
    TOKEN_LEDGER_143,
    TOKEN_LEDGER_140,
    REGRESSION,
    ANALYSIS,
  ]) {
    assertV4(
      !(await exists(output)),
      `${output} already exists; development output is immutable`
    );
  }
}

const [
  v21FailureBytes,
  v21ActivationBytes,
  v21ExecutionBytes,
  v21PreparationBytes,
  v211FailureBytes,
  v211ActivationBytes,
  v211ExecutionBytes,
  v211PreparationBytes,
  manualBytes,
] = await Promise.all([
  readFile(V21_FAILURE),
  readFile(V21_ACTIVATION),
  readFile(V21_EXECUTION),
  readFile(V21_PREPARATION),
  readFile(V211_FAILURE),
  readFile(V211_ACTIVATION),
  readFile(V211_EXECUTION),
  readFile(V211_PREPARATION),
  readFile(MANUAL),
]);
const v21Failure = JSON.parse(v21FailureBytes);
const v21Activation = JSON.parse(v21ActivationBytes);
const v21Execution = JSON.parse(v21ExecutionBytes);
const v21Preparation = JSON.parse(v21PreparationBytes);
const v211Failure = JSON.parse(v211FailureBytes);
const v211Activation = JSON.parse(v211ActivationBytes);
const v211Execution = JSON.parse(v211ExecutionBytes);
const v211Preparation = JSON.parse(v211PreparationBytes);

assertV4(
  v21Failure.status ===
      "v2.1-discovery-gate-failed-cross-boundary-short-source-span-confirmed-no-further-action-authorized" &&
    v21Failure.failure?.debateNumber === "143" &&
    v21Failure.failure?.chunkId === "chunk-003" &&
    v21Failure.failure?.candidateId === "c003-01" &&
    v21Failure.sourceSpanEvidence?.lexicalTokenCount === 11 &&
    v21Failure.gateDisposition?.acceptedAsPassed === false,
  "frozen v2.1 discovery failure boundary drifted"
);
assertV4(
  v211Failure.status ===
      "v2.1.1-discovery-gate-failed-start-dependent-locked-lookahead-capacity-confirmed-no-further-action-authorized" &&
    v211Failure.failure?.debateNumber === "140" &&
    v211Failure.failure?.chunkId === "chunk-001" &&
    v211Failure.failure?.candidateId === "c010" &&
    v211Failure.sourceWindowEvidence?.availableLexicalTokens === 589 &&
    v211Failure.sourceWindowEvidence?.requestedLexicalTokens === 648 &&
    v211Failure.sourceWindowEvidence?.excessLexicalTokens === 59 &&
    v211Failure.gateDisposition?.acceptedAsPassed === false,
  "frozen v2.1.1 discovery failure boundary drifted"
);
for (const diagnosis of [v21Failure, v211Failure]) {
  for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
    assertV4(
      sha256(await readFile(file)) === digest,
      `failure diagnosis source drift: ${file}`
    );
  }
}
for (const activation of [v21Activation, v211Activation]) {
  assertV4(
    activation.model?.label === V212_DISCOVERY_MODEL.label &&
      activation.model?.slug === V212_DISCOVERY_MODEL.slug &&
      activation.model?.reasoningEffort ===
        V212_DISCOVERY_MODEL.reasoningEffort &&
      activation.model?.authentication ===
        V212_DISCOVERY_MODEL.authentication &&
      activation.executionPolicy?.attemptsPerContext === 1 &&
      activation.executionPolicy?.retriesMaximum === 0 &&
      activation.executionPolicy?.timeoutExtensionsMaximum === 0,
    "inherited model or execution discipline drifted"
  );
}
assertV4(
  v21Execution.status === "v2.1-validation-discovery-complete-with-failure" &&
    v21Execution.contextsAttempted === 40 &&
    v21Execution.validContexts === 39 &&
    v21Execution.invalidContexts === 1 &&
    v21Execution.retries === 0 &&
    v21Execution.timeoutExtensions === 0 &&
    v21Preparation.contexts.length === 10,
  "retired v2.1 regression corpus drifted"
);
assertV4(
  v211Execution.status ===
      "v2.1.1-validation-discovery-complete-with-failure" &&
    v211Execution.contextsAttempted === 42 &&
    v211Execution.validContexts === 41 &&
    v211Execution.invalidContexts === 1 &&
    v211Execution.retries === 0 &&
    v211Execution.timeoutExtensions === 0 &&
    v211Execution.semanticCorrections === 0 &&
    v211Preparation.contexts.length === 10,
  "retired v2.1.1 regression corpus drifted"
);
assertV4(
  manualBytes.includes(
    Buffer.from(
      "A move that begins in lookbehind remains owned by the predecessor chunk"
    )
  ) &&
    manualBytes.includes(Buffer.from("sourceWindow.endEvent")) &&
    manualBytes.includes(Buffer.from("requires at least 12")) &&
    manualBytes.includes(Buffer.from("never emit a lexical-token count")),
  "bounded-end manual does not close both frozen failure contracts"
);

function preparationMap(preparation) {
  return new Map(
    preparation.contexts.map((context) => [context.debateNumber, context])
  );
}

async function loadContext(preparationByDebate, result) {
  const debate = preparationByDebate.get(result.debateNumber);
  const chunk = debate?.chunks.find((item) => item.chunkId === result.chunkId);
  assertV4(
    debate && chunk,
    `${result.debateNumber}/${result.chunkId}: preparation missing`
  );
  const [
    packetBytes,
    planBytes,
    eventsBytes,
    chunkBytes,
    fullLedgerBytes,
    rawBytes,
  ] = await Promise.all([
    readFile(debate.packet),
    readFile(debate.plan),
    readFile(debate.originalEvents),
    readFile(chunk.chunkLedgerPath),
    readFile(debate.fullLedger),
    readFile(chunk.rawOutput),
  ]);
  return {
    debate,
    chunk,
    packetBytes,
    planBytes,
    eventsBytes,
    chunkBytes,
    fullLedgerBytes,
    rawBytes,
    packet: JSON.parse(packetBytes),
    plan: JSON.parse(planBytes),
    eventsDocument: JSON.parse(eventsBytes),
    predecessorOutput: JSON.parse(rawBytes),
  };
}

function validationArgs(loaded) {
  return {
    packet: loaded.packet,
    chunk: loaded.chunk,
    plan: loaded.plan,
    eventsDocument: loaded.eventsDocument,
    eventsBytes: loaded.eventsBytes,
    chunkBytes: loaded.chunkBytes,
    fullLedgerBytes: loaded.fullLedgerBytes,
  };
}

const regressionSourceFiles = [];
const v21ContextResults = [];
let v21AcceptedCandidates = 0;
let v21ExactSpans = 0;
let v21RejectedCandidate = null;
const v21ByDebate = preparationMap(v21Preparation);
for (const result of v21Execution.results) {
  const loaded = await loadContext(v21ByDebate, result);
  const migrated = migrateV422112OutputToV212ForRegression(
    loaded.predecessorOutput
  );
  regressionSourceFiles.push(
    loaded.debate.packet,
    loaded.debate.plan,
    loaded.debate.originalEvents,
    loaded.chunk.chunkLedgerPath,
    loaded.debate.fullLedger,
    loaded.chunk.rawOutput
  );
  if (result.accepted) {
    const validation = validateV212Discovery(migrated, validationArgs(loaded));
    assertV4(
      validation.status === "passed" &&
        validation.repositoryDerivedLexicalTokenCounts === true &&
        validation.modelAuthoredLexicalTokenCounts === false &&
        validation.startDependentLockedLookaheadCapacityStructurallyBounded ===
          true &&
        validation.derivedWindows.length ===
          loaded.predecessorOutput.candidates.length,
      `${result.debateNumber}/${result.chunkId}: v2.1 regression validation failed`
    );
    for (const [index, window] of validation.derivedWindows.entries()) {
      const predecessorSpan =
        loaded.predecessorOutput.candidates[index].sourceSpan;
      assertV4(
        window.startEvent === predecessorSpan.startEvent &&
          window.endEvent === predecessorSpan.endEvent,
        `${result.debateNumber}/${result.chunkId}/${window.candidateId}: v2.1 span drifted`
      );
      v21ExactSpans += 1;
    }
    v21AcceptedCandidates += loaded.predecessorOutput.candidates.length;
    v21ContextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: true,
      successorRegressionStatus: "passed-exact-bounded-window-reconstruction",
      candidates: loaded.predecessorOutput.candidates.length,
      exactSpanReconstructions: validation.derivedWindows.length,
      predecessorOutputSha256: sha256(loaded.rawBytes),
    });
  } else {
    let rejectionMessage = null;
    try {
      validateV212Discovery(migrated, validationArgs(loaded));
    } catch (error) {
      rejectionMessage = error.message;
    }
    const candidate = migrated.candidates.find(
      (item) => item.candidateId === v21Failure.failure.candidateId
    );
    assertV4(
      result.contextIndex === v21Failure.failure.contextIndex &&
        candidate?.sourceWindow?.startEvent === 1680 &&
        candidate?.sourceWindow?.endEvent === 1681 &&
        rejectionMessage === "source window has fewer than 12 lexical tokens",
      "retired v2.1 short-window artifact was not rejected"
    );
    v21RejectedCandidate = {
      candidateId: candidate.candidateId,
      sourceWindow: candidate.sourceWindow,
      repositoryDerivedLexicalTokens: 11,
      minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      rejectionMessage,
      rejectedByDeterministicMinimum: true,
    };
    v21ContextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: false,
      successorRegressionStatus:
        "passed-retired-short-bounded-window-deterministically-rejected",
      candidates: loaded.predecessorOutput.candidates.length,
      rejectedCandidate: v21RejectedCandidate,
      predecessorOutputSha256: sha256(loaded.rawBytes),
    });
  }
}

const v211ContextResults = [];
let v211AcceptedCandidates = 0;
let v211ExactSpans = 0;
let v211RejectedCandidate = null;
const v211ByDebate = preparationMap(v211Preparation);
for (const result of v211Execution.results) {
  const loaded = await loadContext(v211ByDebate, result);
  regressionSourceFiles.push(
    loaded.debate.packet,
    loaded.debate.plan,
    loaded.debate.originalEvents,
    loaded.chunk.chunkLedgerPath,
    loaded.debate.fullLedger,
    loaded.chunk.rawOutput
  );
  if (result.accepted) {
    const migrated = migrateV211OutputToV212ForRegression(
      loaded.predecessorOutput,
      loaded
    );
    const validation = validateV212Discovery(migrated, validationArgs(loaded));
    assertV4(
      validation.status === "passed" &&
        validation.derivedWindows.length ===
          loaded.predecessorOutput.candidates.length,
      `${result.debateNumber}/${result.chunkId}: v2.1.1 regression validation failed`
    );
    for (const [index, window] of validation.derivedWindows.entries()) {
      const predecessorWindow = materializeV211SourceWindow(
        loaded.predecessorOutput.candidates[index].sourceWindow,
        loaded
      );
      assertV4(
        window.startEvent === predecessorWindow.startEvent &&
          window.endEvent === predecessorWindow.endEvent &&
          window.repositoryDerivedLexicalTokens ===
            predecessorWindow.materializedLexicalTokens,
        `${result.debateNumber}/${result.chunkId}/${window.candidateId}: v2.1.1 materialized span drifted`
      );
      v211ExactSpans += 1;
    }
    v211AcceptedCandidates += loaded.predecessorOutput.candidates.length;
    v211ContextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: true,
      successorRegressionStatus:
        "passed-exact-materialized-to-bounded-window-reconstruction",
      candidates: loaded.predecessorOutput.candidates.length,
      exactSpanReconstructions: validation.derivedWindows.length,
      predecessorOutputSha256: sha256(loaded.rawBytes),
    });
  } else {
    let rejectionMessage = null;
    try {
      migrateV211OutputToV212ForRegression(loaded.predecessorOutput, loaded);
    } catch (error) {
      rejectionMessage = error.message;
    }
    const candidate = loaded.predecessorOutput.candidates.find(
      (item) => item.candidateId === v211Failure.failure.candidateId
    );
    const tokenRows = (await readFile(loaded.chunk.tokenCountedLedgerPath))
      .toString("utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    const available = tokenRows
      .filter((row) => row[0] >= candidate.sourceWindow.startEvent)
      .reduce((sum, row) => sum + row[3], 0);
    assertV4(
      result.contextIndex === v211Failure.failure.contextIndex &&
        candidate?.sourceWindow?.startEvent === 794 &&
        candidate?.sourceWindow?.requestedLexicalTokens === 648 &&
        available === 589 &&
        rejectionMessage ===
          "source window request exceeds the available locked lookahead",
      "retired v2.1.1 over-capacity artifact was not rejected"
    );
    v211RejectedCandidate = {
      candidateId: candidate.candidateId,
      startEvent: candidate.sourceWindow.startEvent,
      requestedLexicalTokens: candidate.sourceWindow.requestedLexicalTokens,
      availableLexicalTokens: available,
      excessLexicalTokens:
        candidate.sourceWindow.requestedLexicalTokens - available,
      rejectionMessage,
      boundedEndSchemaMaximum: loaded.chunk.contextEndEvent,
      overCapacityRequestRepresentationAbsentFromSuccessor: true,
    };
    v211ContextResults.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      chunkId: result.chunkId,
      predecessorAccepted: false,
      successorRegressionStatus:
        "passed-retired-over-capacity-request-unrepresentable-and-rejected",
      candidates: loaded.predecessorOutput.candidates.length,
      rejectedCandidate: v211RejectedCandidate,
      predecessorOutputSha256: sha256(loaded.rawBytes),
    });
  }
}

assertV4(
  v21ContextResults.length === 40 &&
    v21ContextResults.filter((result) => result.predecessorAccepted).length ===
      39 &&
    v21AcceptedCandidates === 370 &&
    v21ExactSpans === 370 &&
    v21RejectedCandidate?.repositoryDerivedLexicalTokens === 11 &&
    v211ContextResults.length === 42 &&
    v211ContextResults.filter((result) => result.predecessorAccepted).length ===
      41 &&
    v211RejectedCandidate?.excessLexicalTokens === 59,
  "v2.1.2 dual regression totals drifted"
);

const debate143 = v21ByDebate.get("143");
const chunk143 = debate143.chunks.find((chunk) => chunk.chunkId === "chunk-003");
const debate140 = v211ByDebate.get("140");
const chunk140 = debate140.chunks.find((chunk) => chunk.chunkId === "chunk-001");
const [packet143Bytes, chunk143Bytes, packet140Bytes, chunk140Bytes] =
  await Promise.all([
    readFile(debate143.packet),
    readFile(chunk143.chunkLedgerPath),
    readFile(debate140.packet),
    readFile(chunk140.chunkLedgerPath),
  ]);
const schema143 = makeV212DiscoverySchema({
  packet: JSON.parse(packet143Bytes),
  chunk: chunk143,
});
const schema140 = makeV212DiscoverySchema({
  packet: JSON.parse(packet140Bytes),
  chunk: chunk140,
});
const schema143Bytes = jsonBytes(schema143);
const schema140Bytes = jsonBytes(schema140);
const tokenLedger143Bytes = buildV212TokenCountedChunkLedger(chunk143Bytes);
const tokenLedger140Bytes = buildV212TokenCountedChunkLedger(chunk140Bytes);
for (const [schema, chunk, label] of [
  [schema143, chunk143, "143/chunk-003"],
  [schema140, chunk140, "140/chunk-001"],
]) {
  const sourceWindow =
    schema.properties.candidates.items.properties.sourceWindow;
  assertV4(
    JSON.stringify(sourceWindow.required) ===
        JSON.stringify(["startEvent", "endEvent"]) &&
      sourceWindow.properties.startEvent.minimum === chunk.coreStartEvent &&
      sourceWindow.properties.startEvent.maximum === chunk.coreEndEvent &&
      sourceWindow.properties.endEvent.minimum === chunk.coreStartEvent &&
      sourceWindow.properties.endEvent.maximum === chunk.contextEndEvent &&
      !Object.hasOwn(sourceWindow.properties, "requestedLexicalTokens") &&
      !Object.hasOwn(
        schema.properties.candidates.items.properties,
        "sourceSpan"
      ),
    `${label}: bounded-end schema drifted`
  );
}

let maximumCopiedInputBytes = 0;
let maximumSchemaBytes = 0;
let operationalContextsChecked = 0;
for (const preparation of [v21Preparation, v211Preparation]) {
  for (const debate of preparation.contexts) {
    const packetBytes = await readFile(debate.packet);
    const packet = JSON.parse(packetBytes);
    for (const chunk of debate.chunks) {
      const chunkBytes = await readFile(chunk.chunkLedgerPath);
      const schemaBytes = jsonBytes(
        makeV212DiscoverySchema({ packet, chunk })
      );
      const tokenBytes = buildV212TokenCountedChunkLedger(chunkBytes);
      maximumSchemaBytes = Math.max(maximumSchemaBytes, schemaBytes.length);
      maximumCopiedInputBytes = Math.max(
        maximumCopiedInputBytes,
        manualBytes.length + packetBytes.length + schemaBytes.length + tokenBytes.length
      );
      operationalContextsChecked += 1;
    }
  }
}
assertV4(
  operationalContextsChecked === 82 &&
    maximumSchemaBytes < 10000 &&
    maximumCopiedInputBytes <= 70000,
  "bounded-end schema or copied-input ceiling is not operationally safe"
);

const regression = {
  schemaVersion:
    "1.0-score-stability-v2.1.2-retired-discovery-artifact-regression",
  protocolId: V212_DISCOVERY_PROTOCOL_ID,
  status:
    "passed-dual-retired-gate-regression-both-failures-preserved-and-accepted-spans-exactly-reconstructed",
  diagnosticUseOnly: true,
  failedV21GateReclassified: false,
  failedV211GateReclassified: false,
  retiredOutputsReusableForSuccessorAcceptance: false,
  v21Contexts: v21ContextResults,
  v211Contexts: v211ContextResults,
  totals: {
    retiredContexts: 82,
    retiredAcceptedContexts: 80,
    retiredFailedContexts: 2,
    successorExactRegressionContexts: 80,
    successorRejectedFailureContexts: 2,
    acceptedCandidatesReplayed:
      v21AcceptedCandidates + v211AcceptedCandidates,
    exactSourceSpanReconstructions: v21ExactSpans + v211ExactSpans,
    v21AcceptedCandidatesReplayed: v21AcceptedCandidates,
    v211AcceptedCandidatesReplayed: v211AcceptedCandidates,
    v21ExactSourceSpanReconstructions: v21ExactSpans,
    v211ExactSourceSpanReconstructions: v211ExactSpans,
    modelContexts: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    scoresDerived: 0,
  },
  frozenFailures: {
    v21ShortWindow: {
      debateNumber: "143",
      chunkId: "chunk-003",
      rejectedCandidate: v21RejectedCandidate,
    },
    v211OverCapacityRequest: {
      debateNumber: "140",
      chunkId: "chunk-001",
      rejectedCandidate: v211RejectedCandidate,
    },
  },
  operationalProof: {
    contextsChecked: operationalContextsChecked,
    maximumSchemaBytes,
    maximumCopiedInputBytes,
    copiedInputBytesMaximum: 70000,
    passed: true,
  },
};
const regressionBytes = jsonBytes(regression);

const sourceFiles = [
  V21_FAILURE,
  V21_ACTIVATION,
  V21_EXECUTION,
  V21_PREPARATION,
  V211_FAILURE,
  V211_ACTIVATION,
  V211_EXECUTION,
  V211_PREPARATION,
  MANUAL,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-canary-score-gate.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.1-discovery.mjs",
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
    "1.0-score-stability-v2.1.2-discovery-successor-development-analysis",
  protocolId: V212_DISCOVERY_PROTOCOL_ID,
  status:
    "v2.1.2-bounded-end-discovery-successor-model-free-dual-regression-passed",
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
  inheritedModelBoundary: V212_DISCOVERY_MODEL,
  failedGateDisposition: {
    v21Diagnosis: V21_FAILURE,
    v21DiagnosisSha256: sha256(v21FailureBytes),
    v21Status: v21Failure.status,
    v211Diagnosis: V211_FAILURE,
    v211DiagnosisSha256: sha256(v211FailureBytes),
    v211Status: v211Failure.status,
    v1CanaryPreservedFailed: true,
    v2ValidationPreservedFailed: true,
    v21DiscoveryPreservedFailed: true,
    v211DiscoveryPreservedFailed: true,
    retiredOutputsAcceptedForSuccessorEvidence: false,
    currentCanaryReclassified: false,
    v21PolicyPromoted: false,
  },
  successorContract: {
    outputSchemaVersion: schema140.properties.schemaVersion.const,
    sourceSelectionShape: ["startEvent", "endEvent"],
    modelAuthoredEndEvent: true,
    modelAuthoredEndEventStructurallyBoundedByLockedContext: true,
    modelAuthoredLexicalTokenCount: false,
    repositoryDerivedLexicalTokenCount: true,
    minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
    minimumDeterministicallyEnforced: true,
    minimumStructurallyEncodedInTransportSchema: false,
    requestedLexicalTokensRemoved: true,
    startDependentOverCapacityRequestUnrepresentable: true,
    tokenCountsSuppliedPerLedgerRow: true,
    predecessorOwnershipRuleExplicit: true,
    predecessorOwnershipRule:
      "a move that begins in lookbehind remains owned by the predecessor chunk",
    thresholdRelaxed: false,
    silentCandidateDeletion: false,
    automaticTruncation: false,
    automaticSemanticRepair: false,
    selectedTargetTopologyStillDeferredToPrimaryA: true,
    ratingsScoresWinnersAndLegacyMaterialUnavailable: true,
  },
  regression: {
    artifact: REGRESSION,
    artifactSha256: sha256(regressionBytes),
    status: regression.status,
    retiredContexts: regression.totals.retiredContexts,
    exactRegressionContexts:
      regression.totals.successorExactRegressionContexts,
    rejectedFailureContexts:
      regression.totals.successorRejectedFailureContexts,
    acceptedCandidatesReplayed:
      regression.totals.acceptedCandidatesReplayed,
    exactSourceSpanReconstructions:
      regression.totals.exactSourceSpanReconstructions,
    v21ShortWindowRejected: true,
    v211OverCapacityRequestRejected: true,
    diagnosticUseOnly: true,
  },
  artifacts: {
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
    v21FailureSchema: SCHEMA_143,
    v21FailureSchemaSha256: sha256(schema143Bytes),
    v211FailureSchema: SCHEMA_140,
    v211FailureSchemaSha256: sha256(schema140Bytes),
    v21FailureTokenCountedLedger: TOKEN_LEDGER_143,
    v21FailureTokenCountedLedgerSha256: sha256(tokenLedger143Bytes),
    v211FailureTokenCountedLedger: TOKEN_LEDGER_140,
    v211FailureTokenCountedLedgerSha256: sha256(tokenLedger140Bytes),
    regression: REGRESSION,
    regressionSha256: sha256(regressionBytes),
  },
  operationalProof: structuredClone(regression.operationalProof),
  residualRisks: {
    endBeforeStartMayPassTransportSchemaButFailsDeterministicValidation: true,
    subTwelveWindowMayPassTransportSchemaButFailsDeterministicValidation: true,
    predecessorOwnershipRemainsReviewerSemanticInstruction: true,
    schemaDoesNotPreventBadCandidateSelection: true,
    mitigation:
      "The model selects an actual bounded final row rather than performing requested-token arithmetic; per-row token counts and the manual disclose the unchanged minimum; deterministic validation rejects reversed or short windows; and a fresh disjoint gate remains mandatory.",
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
    "prepare-disjoint-fresh-v2.1.2-validation-cohort-selection-only",
};
const analysisBytes = jsonBytes(analysis);

if (shouldWrite) {
  for (const file of [
    SCHEMA_143,
    SCHEMA_140,
    TOKEN_LEDGER_143,
    TOKEN_LEDGER_140,
    REGRESSION,
    ANALYSIS,
  ]) {
    await mkdir(path.dirname(file), { recursive: true });
  }
  await Promise.all([
    writeFile(SCHEMA_143, schema143Bytes),
    writeFile(SCHEMA_140, schema140Bytes),
    writeFile(TOKEN_LEDGER_143, tokenLedger143Bytes),
    writeFile(TOKEN_LEDGER_140, tokenLedger140Bytes),
    writeFile(REGRESSION, regressionBytes),
  ]);
  await writeFile(ANALYSIS, analysisBytes);
}

console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      failedGateDisposition: analysis.failedGateDisposition,
      successorContract: analysis.successorContract,
      regression: analysis.regression,
      operationalProof: analysis.operationalProof,
      residualRisks: analysis.residualRisks,
      totals: analysis.totals,
      authorization: analysis.authorization,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
