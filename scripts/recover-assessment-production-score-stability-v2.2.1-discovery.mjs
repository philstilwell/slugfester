#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  canonicalizeV221DiscoveryCandidateOrder,
  compileV221CandidateBundle,
  validateV221Discovery,
} from "./lib/assessment-production-score-stability-v2.2.1-order-invariant-discovery.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows,
} from "./lib/v42219-generalized-partition.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  !shouldWrite || (frozenAt && !Number.isNaN(Date.parse(frozenAt))),
  "--write requires --frozen-at with an ISO timestamp"
);

const SOURCE_ROOT =
  "docs/assessment-production/score-stability-v2.2-validation-cohort";
const PREPARATION = `${SOURCE_ROOT}/source-preparation/preparation-manifest.json`;
const EXECUTION = `${SOURCE_ROOT}/discovery/model-execution.json`;
const FAILURE = `${SOURCE_ROOT}/discovery/failure-diagnosis.json`;
const SUCCESSOR =
  "docs/assessment-production/score-stability-v2.2.1-discovery-successor-development/development-analysis.json";
const ROOT =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/discovery-mechanical-recovery";
const ANALYSIS = `${ROOT}/analysis.json`;
const SCRIPT =
  "scripts/recover-assessment-production-score-stability-v2.2.1-discovery.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.2.1-discovery-recovery.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  assertV4(!(await exists(ROOT)), `${ROOT} already exists; recovery is immutable`);
}

const [preparationBytes, executionBytes, failureBytes, successorBytes] =
  await Promise.all([
    readFile(PREPARATION),
    readFile(EXECUTION),
    readFile(FAILURE),
    readFile(SUCCESSOR),
  ]);
const preparation = JSON.parse(preparationBytes);
const execution = JSON.parse(executionBytes);
const failure = JSON.parse(failureBytes);
const successor = JSON.parse(successorBytes);

assertV4(
  preparation.status ===
      "fresh-ten-debate-v2.2-source-token-ledgers-and-discovery-packets-prepared" &&
    preparation.contexts.length === 10 &&
    preparation.totals.discoveryContexts === 38 &&
    preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true,
  "v2.2 source preparation drifted"
);
assertV4(
  execution.status === "v2.2-validation-discovery-complete-with-failure" &&
    execution.contextsAttempted === 38 &&
    execution.validContexts === 37 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0,
  "source discovery gate disposition drifted"
);
assertV4(
  failure.status ===
      "v2.2-discovery-gate-failed-nonchronological-candidate-order-confirmed-no-further-action-authorized" &&
    failure.gateDisposition.acceptedAsPassed === false &&
    failure.gateDisposition.v22DiscoveryFailed === true,
  "ordering-only failure diagnosis unavailable"
);
assertV4(
  successor.status ===
      "v2.2.1-order-invariant-bounded-end-discovery-successor-model-free-regression-passed" &&
    successor.predecessorGateDisposition.v22DiscoveryGate ===
      "failed-and-not-retried" &&
    successor.predecessorGateDisposition.reclassified === false &&
    successor.totals.v22RawOutputs === 38 &&
    successor.totals.successorAccepted === 38 &&
    successor.totals.orderingOnlyRecoveries === 1 &&
    successor.totals.negativeControlsRejected === 8 &&
    successor.authorization.preservedV22RawOutputMechanicalRecovery === true,
  "v2.2.1 successor development evidence unavailable"
);

const outputAudits = [];
const debates = [];
const pendingWrites = [];
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
    const result = execution.results.find(
      (item) =>
        item.debateNumber === debate.debateNumber &&
        item.chunkId === chunk.chunkId
    );
    assertV4(
      result?.rawOutputWritten &&
        result.retryCount === 0 &&
        result.attemptCount === 1,
      `${debate.debateNumber}/${chunk.chunkId}: preserved raw output unavailable`
    );
    const rawBytes = await readFile(chunk.rawOutput);
    assertV4(
      sha256(rawBytes) === result.rawOutputSha256,
      `${debate.debateNumber}/${chunk.chunkId}: raw output hash drifted`
    );
    const raw = JSON.parse(rawBytes);
    const validation = validateV221Discovery(raw, {
      packet,
      chunk,
      plan,
      eventsDocument: JSON.parse(eventsBytes),
      eventsBytes,
      chunkBytes: await readFile(chunk.chunkLedgerPath),
      fullLedgerBytes,
    });
    const { orderedOutput } = canonicalizeV221DiscoveryCandidateOrder(raw);
    rawOutputs.push(raw);
    orderedOutputs.push(orderedOutput);
    outputAudits.push({
      contextIndex: result.contextIndex,
      debateNumber: debate.debateNumber,
      chunkId: chunk.chunkId,
      rawOutput: chunk.rawOutput,
      rawOutputSha256: result.rawOutputSha256,
      sourceExecutionAccepted: result.accepted,
      recoveryValidationStatus: validation.status,
      candidates: validation.candidates,
      repositoryDerivedLexicalTokenCounts:
        validation.repositoryDerivedLexicalTokenCounts,
      modelAuthoredLexicalTokenCounts:
        validation.modelAuthoredLexicalTokenCounts,
      modelAuthoredBoundedEndEvents:
        validation.modelAuthoredBoundedEndEvents,
      rawChronologyCanonical: validation.rawChronologyCanonical,
      canonicalOrderingAppliedForValidation:
        validation.canonicalOrderingAppliedForValidation,
      rawCandidateIds: validation.rawCandidateIds,
      canonicalCandidateIds: validation.canonicalCandidateIds,
      candidateFieldsModified: validation.candidateFieldsModified,
    });
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
    `${debate.debateNumber}: compilation depends on raw array order`
  );
  const pro = rawBundle.candidates.filter((candidate) => candidate.side === "pro")
    .length;
  const con = rawBundle.candidates.filter((candidate) => candidate.side === "con")
    .length;
  assertV4(
    rawBundle.candidateCount >= 8 && pro >= 4 && con >= 4,
    `${debate.debateNumber}: recovered candidate inventory is insufficient`
  );
  const rows = parseV42219Ledger(fullLedgerBytes);
  const included = new Set();
  for (const candidate of rawBundle.candidates) {
    for (
      let event = Math.max(0, candidate.sourceSpan.startEvent - 12);
      event <= Math.min(rows.length - 1, candidate.sourceSpan.endEvent + 12);
      event += 1
    ) {
      included.add(event);
    }
  }
  const sparseRows = [...included]
    .sort((left, right) => left - right)
    .map((event) => rows[event]);
  const sparseBytes = serializeV42219Rows(sparseRows);
  const bundlePath =
    `${ROOT}/candidate-bundles/debate-${debate.debateNumber}.json`;
  const sparsePath =
    `${ROOT}/candidate-context/debate-${debate.debateNumber}.jsonl`;
  const bundleBytes = Buffer.from(`${JSON.stringify(rawBundle, null, 2)}\n`);
  pendingWrites.push(
    { file: bundlePath, bytes: bundleBytes },
    { file: sparsePath, bytes: sparseBytes }
  );
  debates.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    family: debate.family,
    sourceComplexityBand: debate.sourceComplexityBand,
    chunks: debate.chunks.length,
    candidates: rawBundle.candidateCount,
    pro,
    con,
    constructive: rawBundle.candidates.filter(
      (candidate) => candidate.moveKind === "constructive"
    ).length,
    reply: rawBundle.candidates.filter(
      (candidate) => candidate.moveKind === "reply"
    ).length,
    mediumAttributionCandidates: rawBundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "medium"
    ).length,
    lowAttributionCandidates: rawBundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "low"
    ).length,
    rawAndOrderedCompilationCanonicallyIdentical: true,
    bundlePath,
    bundleSha256: sha256(bundleBytes),
    sparsePath,
    sparseEvents: sparseRows.length,
    sparseBytes: sparseBytes.length,
    sparseSha256: sha256(sparseBytes),
    candidateSpansIncluded: rawBundle.candidates.every((candidate) => {
      for (
        let event = candidate.sourceSpan.startEvent;
        event <= candidate.sourceSpan.endEvent;
        event += 1
      ) {
        if (!included.has(event)) return false;
      }
      return true;
    }),
  });
}

assertV4(
  outputAudits.length === 38 &&
    outputAudits.every(
      (output) =>
        output.recoveryValidationStatus === "passed" &&
        output.repositoryDerivedLexicalTokenCounts === true &&
        output.modelAuthoredLexicalTokenCounts === false &&
        output.modelAuthoredBoundedEndEvents === true &&
        output.candidateFieldsModified === false
    ),
  "universal v2.2.1 recovery validation failed"
);
const canonicalized = outputAudits.filter(
  (output) => output.canonicalOrderingAppliedForValidation
);
assertV4(
  canonicalized.length === 1 &&
    canonicalized[0].debateNumber === "177" &&
    canonicalized[0].chunkId === "chunk-001" &&
    canonicalized[0].sourceExecutionAccepted === false,
  "ordering recovery identity drifted"
);

const sourceFiles = [
  PREPARATION,
  EXECUTION,
  FAILURE,
  SUCCESSOR,
  "docs/assessment-production-workflow.md",
  "docs/assessment-production-canary-discovery-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v418-source-integrity.mjs",
  "scripts/lib/v42219-generalized-partition.mjs",
  "scripts/lib/v422112-simplified-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.1.2-discovery.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.1-order-invariant-discovery.mjs",
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
    "1.0-score-stability-v2.2.1-discovery-mechanical-recovery",
  protocolId: successor.protocolId,
  status:
    "v2.2.1-discovery-mechanically-recovered-chronology-fallback-inventory-preparation-authorized",
  frozenAt: shouldWrite ? frozenAt : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  AIOnly: true,
  model: structuredClone(preparation.model),
  proposedScorePolicy: structuredClone(preparation.proposedPolicy),
  sourceDiscoveryGateDisposition: "v2.2-failed-and-not-retried",
  successorValidation: SUCCESSOR,
  successorValidationSha256: sha256(successorBytes),
  rawOutputBoundary: {
    rawOutputsRewritten: false,
    candidateFieldsModified: false,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
    sourceExecutionReclassified: false,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    canonicalOrderingRepositoryOwned: true,
  },
  outputAudits,
  debates,
  audit: {
    rawOutputs: outputAudits.length,
    sourceExecutionValid: execution.validContexts,
    sourceExecutionInvalid: execution.invalidContexts,
    recoveryValid: outputAudits.filter(
      (output) => output.recoveryValidationStatus === "passed"
    ).length,
    orderingCanonicalizations: canonicalized.length,
    rawOutputsRewritten: false,
    candidateFieldsModified: false,
    semanticCorrectionPerformed: false,
    retryPerformed: false,
    allDiscoveredCandidatesTransported: true,
    silentSemanticDeduplication: false,
    rawAndOrderedCompilationCanonicallyIdenticalForAllDebates: debates.every(
      (debate) => debate.rawAndOrderedCompilationCanonicallyIdentical
    ),
    candidateBundlesInventoryFeasible: true,
    predecessorV22DiscoveryGateReclassified: false,
    predecessorV213ScoreGateReclassified: false,
    proposedV22ScorePolicyPromoted: false,
    scoresDerived: 0,
  },
  totals: {
    debates: debates.length,
    candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
    pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
    con: debates.reduce((sum, debate) => sum + debate.con, 0),
    sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0),
    modelContextsExecutedByRecovery: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    scoresDerived: 0,
  },
  sourceHashes,
  authorization: {
    chronologyFallbackInventoryPreparation: true,
    inventoryExecutionActivation: false,
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
  nextAuthorizedAction:
    "prepare-v2.2.1-chronology-fallback-inventory-packets-model-free-only",
};

if (shouldWrite) {
  for (const { file, bytes } of pendingWrites) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
  await writeFile(ANALYSIS, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      sourceDiscoveryGateDisposition: analysis.sourceDiscoveryGateDisposition,
      debates,
      audit: analysis.audit,
      totals: analysis.totals,
      inventoryPreparationAuthorized: true,
      inventoryModelExecutionAuthorized: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
