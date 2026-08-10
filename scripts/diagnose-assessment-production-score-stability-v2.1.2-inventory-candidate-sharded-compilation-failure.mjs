#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  composeCandidateShardedInventoryProposal,
  validateCandidateShardedSideSelection,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  projectSidePartitionedSelectionMapToLegacyProposal,
} from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const DIAGNOSIS = `${ROOT}/inventory-compilation-failure-diagnosis.json`;
const SCRIPT =
  "scripts/diagnose-assessment-production-score-stability-v2.1.2-inventory-candidate-sharded-compilation-failure.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(!(await exists(DIAGNOSIS)), `${DIAGNOSIS} already exists`);
const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
const [preparationBytes, sourcePreparationBytes, executionBytes] =
  await Promise.all([
    readFile(activation.preparationManifest),
    readFile(activation.sourcePreparation),
    readFile(activation.artifacts.execution),
  ]);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  activation.status ===
      "frozen-twenty-v2.1.2-side-selector-contexts-authorized" &&
    execution.status === "twenty-v2.1.2-side-selector-contexts-passed" &&
    execution.validContexts === 20 &&
    execution.invalidContexts === 0 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0 &&
    !(await exists(activation.artifacts.analysis)),
  "failed compilation diagnosis boundary drifted"
);

const debates = [];
for (const prepared of sourcePreparation.contexts) {
  const contexts = preparation.contexts.filter(
    (context) => context.debateNumber === prepared.debateNumber
  );
  const [plan, legacySchema, candidateTransport, candidateCensus, evidenceBundle] =
    await Promise.all([
      readFile(prepared.planOutput, "utf8").then(JSON.parse),
      readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
      readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
      readFile(prepared.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
    ]);
  const sideSelections = {};
  const sideCandidateTransports = {};
  for (const context of contexts) {
    const sideAsset = prepared.sideAssets.find(
      (asset) => asset.side === context.side
    );
    const [sideSelection, sideTransport] = await Promise.all([
      readFile(context.output, "utf8").then(JSON.parse),
      readFile(sideAsset.transport, "utf8").then(JSON.parse),
    ]);
    validateCandidateShardedSideSelection({
      sideSelection,
      side: context.side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
    });
    sideSelections[context.side] = sideSelection;
    sideCandidateTransports[context.side] = sideTransport;
  }
  const composed = composeCandidateShardedInventoryProposal({
    plan,
    sideSelections,
    legacySchema,
    candidateTransport,
    candidateCensus,
    sideCandidateTransports,
  });
  const projected = projectSidePartitionedSelectionMapToLegacyProposal({
    proposal: composed.proposal,
    candidateTransport,
    legacySchema,
  });
  const candidateById = new Map(
    evidenceBundle.candidates.map((candidate) => [
      candidate.qualifiedCandidateId,
      candidate,
    ])
  );
  const selected = projected.sectionSelections.flatMap((section) =>
    [
      ["pro", section.proSelections],
      ["con", section.conSelections],
    ].flatMap(([side, selections]) =>
      selections.map((selection) => ({
        side,
        sectionId: section.sectionId,
        moveId: selection.moveId,
        moveKind: selection.moveKind,
        qualifiedCandidateId: selection.qualifiedCandidateId,
        sourceSpan: candidateById.get(selection.qualifiedCandidateId).sourceSpan,
      }))
    )
  );
  selected.sort(
    (left, right) =>
      left.sourceSpan.startEvent - right.sourceSpan.startEvent ||
      left.sourceSpan.endEvent - right.sourceSpan.endEvent ||
      left.moveId.localeCompare(right.moveId)
  );
  const orphanReplies = selected.filter(
    (move, index) =>
      move.moveKind === "reply" &&
      !selected
        .slice(0, index)
        .some((prior) => prior.side !== move.side)
  );
  let compilationStatus = "passed-structural-projection";
  let failureMessage = null;
  if (orphanReplies.length > 0) {
    compilationStatus = "failed-orphan-reply";
    failureMessage = `${orphanReplies[0].moveId}: reply has no earlier selected opposing move`;
  }
  debates.push({
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    selectedMoves: selected.length,
    nominatedCandidates: composed.reduction.nominatedCandidates,
    deterministicallyDeferredCandidates:
      composed.reduction.deterministicallyDeferredCandidates,
    earliestSelectedMove: selected[0],
    orphanReplies,
    compilationStatus,
    failureMessage,
  });
}

const failedDebates = debates.filter(
  (debate) => debate.compilationStatus !== "passed-structural-projection"
);
assertV4(failedDebates.length > 0, "expected at least one compilation failure");
const sourceHashes = {
  [ACTIVATION]: sha256(activationBytes),
  [activation.preparationManifest]: sha256(preparationBytes),
  [activation.sourcePreparation]: sha256(sourcePreparationBytes),
  [activation.artifacts.execution]: sha256(executionBytes),
  [SCRIPT]: sha256(await readFile(SCRIPT)),
};
for (const context of preparation.contexts) {
  sourceHashes[context.output] = sha256(await readFile(context.output));
}

const diagnosis = {
  schemaVersion:
    "1.0-score-stability-v2.1.2-candidate-sharded-inventory-compilation-failure-diagnosis",
  protocolId: activation.protocolId,
  status:
    "v2.1.2-candidate-sharded-inventory-gate-failed-cross-side-chronology-closure-no-further-model-action-authorized",
  diagnosedAt: new Date().toISOString(),
  developmentValidationOnly: true,
  productionCanary: false,
  stagingOnly: true,
  failedGateDisposition: {
    ...structuredClone(activation.failedGateDisposition),
    currentV212InventoryGatePreservedFailed: true,
    acceptedSideSelectorOutputsReusableForCurrentGateAcceptance: false,
    acceptedSideSelectorOutputsReusableAsFreshSuccessorModelInput: false,
    currentCanaryReclassified: false,
  },
  model: structuredClone(activation.model),
  execution: activation.artifacts.execution,
  executionSha256: sha256(executionBytes),
  observedFailure: {
    selectorContextsPassedSchemaAndLocalSemanticValidation: 20,
    selectorContextsFailed: 0,
    compilationFailedDebates: failedDebates.length,
    compilationPassedStructuralProjectionDebates:
      debates.length - failedDebates.length,
    failureClass: "cross-side-chronology-closure",
    exactInvariant:
      "Every selected move labeled reply must have at least one earlier selected opposing move.",
    whySideIsolationCouldNotEnforceIt:
      "Each selector saw only its own side evidence and could not know whether the opposing selector would retain an earlier anchor move after deterministic cardinality reduction.",
    firstObservedFailure: failedDebates[0].failureMessage,
  },
  debates,
  remedy: {
    currentOutputsSemanticallyRepaired: false,
    retryProposed: false,
    timeoutExtensionProposed: false,
    freshSuccessorRequired: true,
    proposedSuccessor:
      "Fresh side-selector contexts author both preferredMoveKind and a source-grounded constructive fallback for each nomination. The repository applies the fallback only when deterministic cross-side chronology shows no earlier selected opposing move, then replays the unchanged legacy inventory compiler.",
    whyThisPreservesIsolation:
      "Each side can author its own fallback from its own evidence without seeing the opposing side; the repository alone evaluates the cross-side chronology condition.",
    requiredDevelopmentBeforeFreshExecution: [
      "freeze a successor schema and deterministic fallback compiler",
      "replay accepted-artifact regression and adversarial orphan-reply probes",
      "prove copied-input bounds remain below the frozen ceiling",
      "select a fresh disjoint validation cohort before any successor model execution",
    ],
  },
  totals: {
    debatesDiagnosed: debates.length,
    failedDebates: failedDebates.length,
    orphanReplies: debates.reduce(
      (sum, debate) => sum + debate.orphanReplies.length,
      0
    ),
    selectorContextsExecuted: execution.contextsAttempted,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    audioCalls: 0,
    transcriptionCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  sourceHashes,
  authorization: {
    deterministicSuccessorDevelopment: true,
    freshDisjointCohortSelection: false,
    successorPacketPreparation: false,
    successorModelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    semanticCorrection: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "develop-and-adversarially-validate-cross-side-chronology-fallback-successor-model-free-only",
};

await writeFile(DIAGNOSIS, `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      debatesDiagnosed: diagnosis.totals.debatesDiagnosed,
      failedDebates: diagnosis.totals.failedDebates,
      orphanReplies: diagnosis.totals.orphanReplies,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      scoresDerived: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2
  )
);
