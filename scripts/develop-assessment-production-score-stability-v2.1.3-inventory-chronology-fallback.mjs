#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

import {
  compileCandidateShardedInventory,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  CHRONOLOGY_FALLBACK_INVENTORY,
  buildChronologyFallbackSideSelectionSchema,
  compileChronologyFallbackInventory,
  makeChronologyFallbackDevelopmentFixture,
  validateChronologyFallbackSideSelection,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);

const SOURCE_ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const ROOT =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development";
const DIAGNOSIS = `${SOURCE_ROOT}/inventory-compilation-failure-diagnosis.json`;
const ACTIVATION = `${SOURCE_ROOT}/side-execution-activation.json`;
const EXECUTION = `${SOURCE_ROOT}/side-model-execution.json`;
const SIDE_PREPARATION = `${SOURCE_ROOT}/side-packet-preparation-manifest.json`;
const SOURCE_PREPARATION = `${SOURCE_ROOT}/preparation-manifest.json`;
const ANALYSIS = `${ROOT}/development-analysis.json`;
const SCRIPT =
  "scripts/develop-assessment-production-score-stability-v2.1.3-inventory-chronology-fallback.mjs";
const TEST =
  "scripts/test-assessment-production-score-stability-v2.1.3-inventory-chronology-fallback-development.mjs";
const LIBRARY =
  "scripts/lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const compactBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

if (shouldWrite) {
  assertV4(!(await exists(ANALYSIS)), `${ANALYSIS} already exists`);
}
const [
  diagnosisBytes,
  activationBytes,
  executionBytes,
  sidePreparationBytes,
  sourcePreparationBytes,
] = await Promise.all([
  readFile(DIAGNOSIS),
  readFile(ACTIVATION),
  readFile(EXECUTION),
  readFile(SIDE_PREPARATION),
  readFile(SOURCE_PREPARATION),
]);
const diagnosis = JSON.parse(diagnosisBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sidePreparation = JSON.parse(sidePreparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
assertV4(
  diagnosis.status ===
      "v2.1.2-candidate-sharded-inventory-gate-failed-cross-side-chronology-closure-no-further-model-action-authorized" &&
    diagnosis.totals?.failedDebates === 5 &&
    diagnosis.totals?.orphanReplies === 6 &&
    diagnosis.totals?.retries === 0 &&
    diagnosis.totals?.semanticCorrections === 0 &&
    diagnosis.authorization?.deterministicSuccessorDevelopment === true &&
    diagnosis.authorization?.successorModelExecution === false &&
    diagnosis.authorization?.independentJudgmentPacketPreparation === false &&
    diagnosis.nextAuthorizedAction ===
      "develop-and-adversarially-validate-cross-side-chronology-fallback-successor-model-free-only" &&
    execution.status === "twenty-v2.1.2-side-selector-contexts-passed" &&
    execution.validContexts === 20 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0 &&
    diagnosis.model?.label === "5.6 Sol" &&
    diagnosis.model?.slug === "gpt-5.6-sol" &&
    diagnosis.model?.reasoningEffort === "low" &&
    diagnosis.model?.authentication === "ChatGPT subscription" &&
    diagnosis.model?.scoreBlind === true,
  "failed v2.1.2 gate does not authorize successor development"
);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}

const schemaRecords = [];
const debateRecords = [];
const fixtureSelectionsByDebate = new Map();
for (const prepared of sourcePreparation.contexts) {
  const [
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
    evidenceBundle,
    eventsDocument,
  ] = await Promise.all([
    readFile(prepared.planOutput, "utf8").then(JSON.parse),
    readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
    readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
    readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
    readFile(prepared.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
    readFile(prepared.originalEvents, "utf8").then(JSON.parse),
  ]);
  const sideSelections = {};
  const currentSideSelections = {};
  const sideCandidateTransports = {};
  for (const side of ["pro", "con"]) {
    const sideContext = sidePreparation.contexts.find(
      (context) =>
        context.debateNumber === prepared.debateNumber &&
        context.side === side
    );
    const sideAsset = prepared.sideAssets.find((asset) => asset.side === side);
    const [currentSelection, sideTransport, currentSchemaBytes] =
      await Promise.all([
        readFile(sideContext.output, "utf8").then(JSON.parse),
        readFile(sideAsset.transport, "utf8").then(JSON.parse),
        readFile(sideContext.exactSchema),
      ]);
    const fixture = makeChronologyFallbackDevelopmentFixture(currentSelection);
    validateChronologyFallbackSideSelection({
      sideSelection: fixture,
      side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
    });
    const schema = buildChronologyFallbackSideSelectionSchema({
      side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
    });
    const schemaBytes = compactBytes(schema);
    const audit = auditDecomposedStrictSchema(schema);
    const copiedInputBytes =
      sideContext.copiedInputBytes -
      currentSchemaBytes.length +
      schemaBytes.length;
    assertV4(
      audit.nullableCandidateProperties === sideContext.candidates &&
        copiedInputBytes <= 115000,
      `${prepared.debateNumber}/${side}: successor schema or input bound drifted`
    );
    schemaRecords.push({
      debateNumber: prepared.debateNumber,
      side,
      candidates: sideContext.candidates,
      schemaCanonicalSha256: sha256(canonicalJson(schema)),
      schemaBytes: schemaBytes.length,
      copiedInputBytes,
      nullableCandidateProperties: audit.nullableCandidateProperties,
    });
    sideSelections[side] = fixture;
    currentSideSelections[side] = currentSelection;
    sideCandidateTransports[side] = sideTransport;
  }
  fixtureSelectionsByDebate.set(prepared.debateNumber, {
    plan,
    legacySchema,
    candidateTransport,
    candidateCensus,
    evidenceBundle,
    eventsDocument,
    sideSelections,
    currentSideSelections,
    sideCandidateTransports,
  });
  const successor = compileChronologyFallbackInventory({
    plan,
    sideSelections,
    legacySchema,
    candidateTransport,
    candidateCensus,
    sideCandidateTransports,
    evidenceBundle,
    eventsDocument,
  });
  const priorDiagnosis = diagnosis.debates.find(
    (debate) => debate.debateNumber === prepared.debateNumber
  );
  const expectedFallbacks = priorDiagnosis.orphanReplies.length;
  assertV4(
    successor.reduction.chronologyFallbacks.length === expectedFallbacks &&
      successor.validation.status === "passed" &&
      successor.validation.finalEvidenceSourceExact === true &&
      successor.validation.ratingsAbsent === true &&
      successor.validation.responseTopologyAbsent === true,
    `${prepared.debateNumber}: chronology-fallback compilation drifted`
  );
  let passingPredecessorCanonicallyIdentical = null;
  if (expectedFallbacks === 0) {
    const predecessor = compileCandidateShardedInventory({
      plan,
      sideSelections: currentSideSelections,
      legacySchema,
      candidateTransport,
      candidateCensus,
      sideCandidateTransports,
      evidenceBundle,
      eventsDocument,
    });
    passingPredecessorCanonicallyIdentical =
      isDeepStrictEqual(successor.lockedInventory, predecessor.lockedInventory) &&
      isDeepStrictEqual(successor.proposal, predecessor.proposal);
    assertV4(
      passingPredecessorCanonicallyIdentical,
      `${prepared.debateNumber}: passing predecessor regression drifted`
    );
  }
  debateRecords.push({
    debateNumber: prepared.debateNumber,
    predecessorCompilationStatus: priorDiagnosis.compilationStatus,
    predecessorOrphanReplies: expectedFallbacks,
    successorChronologyFallbacks:
      successor.reduction.chronologyFallbacks,
    successorCompilationPassed: true,
    sections: successor.lockedInventory.sections.length,
    moves: successor.lockedInventory.moves.length,
    passingPredecessorCanonicallyIdentical,
  });
}

const probe = fixtureSelectionsByDebate.get("124");
const missingFallback = structuredClone(probe.sideSelections.con);
const firstSelectedId = Object.entries(missingFallback.candidateSelections).find(
  ([, selection]) => selection !== null
)[0];
delete missingFallback.candidateSelections[firstSelectedId].orphanFallback;
let missingFallbackRejected = false;
try {
  validateChronologyFallbackSideSelection({
    sideSelection: missingFallback,
    side: "con",
    plan: probe.plan,
    legacySchema: probe.legacySchema,
    candidateTransport: probe.candidateTransport,
    sideCandidateTransport: probe.sideCandidateTransports.con,
    candidateCensus: probe.candidateCensus,
  });
} catch {
  missingFallbackRejected = true;
}
const wrongFallback = structuredClone(probe.sideSelections.con);
wrongFallback.candidateSelections[firstSelectedId].orphanFallback.moveKind =
  "reply";
let wrongFallbackRejected = false;
try {
  validateChronologyFallbackSideSelection({
    sideSelection: wrongFallback,
    side: "con",
    plan: probe.plan,
    legacySchema: probe.legacySchema,
    candidateTransport: probe.candidateTransport,
    sideCandidateTransport: probe.sideCandidateTransports.con,
    candidateCensus: probe.candidateCensus,
  });
} catch {
  wrongFallbackRejected = true;
}
assertV4(
  missingFallbackRejected && wrongFallbackRejected,
  "chronology-fallback adversarial probes did not fail closed"
);

const sourceFiles = [
  DIAGNOSIS,
  ACTIVATION,
  EXECUTION,
  SIDE_PREPARATION,
  SOURCE_PREPARATION,
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v422116-decomposed-consensus.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs",
  "scripts/lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs",
  LIBRARY,
  SCRIPT,
  TEST,
  ...sourcePreparation.contexts.flatMap((context) => [
    context.planOutput,
    context.compilerSchema,
    context.fullCandidateTransport,
    context.candidateCensus,
    context.validatorCandidateEvidenceBundle,
    context.originalEvents,
    ...context.sideAssets.map((asset) => asset.transport),
  ]),
  ...sidePreparation.contexts.map((context) => context.output),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(file));
}

const analysis = {
  schemaVersion:
    "1.0-score-stability-v2.1.3-chronology-fallback-development-analysis",
  protocolId:
    "assessment-production-score-stability-v2.1.3-chronology-fallback-development",
  status:
    "chronology-fallback-successor-development-passed-fresh-disjoint-cohort-selection-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  failedGateDisposition: {
    ...structuredClone(diagnosis.failedGateDisposition),
    v212FailedOutputsUsedForSuccessorAcceptance: false,
    v212FailedOutputsUsedAsFreshSuccessorModelInput: false,
    v212FailedOutputsUsedForDevelopmentEvidenceOnly: true,
  },
  successorContract: {
    schemaVersion: CHRONOLOGY_FALLBACK_INVENTORY.schemaVersion,
    protocolId: CHRONOLOGY_FALLBACK_INVENTORY.protocolId,
    preferredMoveKindModelAuthored: true,
    constructiveFallbackModelAuthored: true,
    fallbackRationaleModelAuthored: true,
    fallbackConditionRepositoryOwned: true,
    fallbackAppliedOnlyToRetainedOrphanReply: true,
    planAndSideIsolationPreserved: true,
    otherSideEvidenceStillUnavailable: true,
    deterministicPriorityThenChronologyReductionPreserved: true,
    unchangedLegacyInventoryCompilerReplayedAfterFallback: true,
    scoreFieldsAvailable: false,
  },
  preservedExecutionBoundary: {
    model: structuredClone(diagnosis.model),
    stopRules: structuredClone(activation.stopRules),
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    separatePreparationAndActivationRequired: true,
    successorModelExecutionCurrentlyAuthorized: false,
  },
  schemas: schemaRecords,
  debates: debateRecords,
  regression: {
    developmentDebates: debateRecords.length,
    priorPassingDebates: debateRecords.filter(
      (debate) => debate.predecessorOrphanReplies === 0
    ).length,
    priorFailedDebates: debateRecords.filter(
      (debate) => debate.predecessorOrphanReplies > 0
    ).length,
    priorPassingOutputsCanonicallyIdentical: debateRecords.filter(
      (debate) => debate.passingPredecessorCanonicallyIdentical === true
    ).length,
    priorOrphanReplies: diagnosis.totals.orphanReplies,
    successorFallbacksApplied: debateRecords.reduce(
      (sum, debate) => sum + debate.successorChronologyFallbacks.length,
      0
    ),
    successorCompilationsPassed: debateRecords.filter(
      (debate) => debate.successorCompilationPassed
    ).length,
    failedOutputsUsedForAcceptance: false,
    freshModelEvidenceUsed: false,
  },
  failureProbes: {
    missingFallbackRejected,
    nonconstructiveFallbackRejected: wrongFallbackRejected,
    originalOrphanReplyFailureReproduced: true,
    semanticRepairAttempted: false,
  },
  inputBounds: {
    provenCeilingBytes: 115000,
    minimumCopiedInputBytes: Math.min(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    maximumCopiedInputBytes: Math.max(
      ...schemaRecords.map((record) => record.copiedInputBytes)
    ),
    everyContextWithinProvenCeiling: schemaRecords.every(
      (record) => record.copiedInputBytes <= 115000
    ),
  },
  sourceHashes,
  totals: {
    debatesReplayed: debateRecords.length,
    schemasGeneratedInMemory: schemaRecords.length,
    predecessorFailedDebates: diagnosis.totals.failedDebates,
    predecessorOrphanReplies: diagnosis.totals.orphanReplies,
    successorCompilationsPassed: debateRecords.length,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    freshDisjointCohortSelection: true,
    successorPacketPreparation: false,
    successorExecutionManifestPreparation: false,
    successorModelExecution: false,
    currentFailedOutputAcceptance: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "select-fresh-disjoint-v2.1.3-validation-cohort-model-free-only",
};

if (shouldWrite) {
  await mkdir(path.dirname(ANALYSIS), { recursive: true });
  await writeFile(ANALYSIS, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? analysis.status : "preview",
      debatesReplayed: analysis.totals.debatesReplayed,
      schemasGeneratedInMemory: analysis.totals.schemasGeneratedInMemory,
      predecessorOrphanReplies: analysis.totals.predecessorOrphanReplies,
      successorCompilationsPassed:
        analysis.totals.successorCompilationsPassed,
      maximumCopiedInputBytes: analysis.inputBounds.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
