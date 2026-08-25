#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  candidateShardedInventoryPlanSha256,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  compileChronologyFallbackInventory,
  validateChronologyFallbackSideSelection,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";
import {
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch10StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/inventory-candidate-sharded";
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch10StandingAuthorization();
assertV4(
  activation.status ===
      "frozen-twenty-post-canary-batch-10-side-selector-contexts-authorized" &&
    activation.authorization?.inventoryAnalysis === true &&
    activation.authorization?.inventoryCompilation === true &&
    activation.authorization?.independentJudgmentPacketPreparation ===
      false &&
    activation.authorization?.scoreDerivation === false &&
    activation.authorization?.productionMutation === false &&
    activation.activePolicy?.version === "v2.2" &&
    activation.activePolicy
      ?.agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    activation.activePolicy?.scorePassesMaximum === 1 &&
    activation.validatedInventoryContract?.planAndSideIsolationPreserved ===
      true &&
    activation.validatedInventoryContract
      ?.fallbackAppliedOnlyToRetainedOrphanReply === true &&
    activation.validatedInventoryContract?.scoreFieldsAvailable === false &&
    activation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    activation.sourceCompatibility?.sourceRowsInjected === 0 &&
    activation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    activation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    activation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    activation.sourceCompatibility?.occurrences?.length === 0 &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_10_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256,
  "side-selector inventory analysis is unauthorized"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source drifted`);
}
assertV4(
  !(await exists(activation.artifacts.analysis)),
  `${activation.artifacts.analysis} already exists`
);

const [preparationBytes, sourcePreparationBytes, executionBytes] =
  await Promise.all([
    readFile(activation.preparationManifest),
    readFile(activation.sourcePreparation),
    readFile(activation.artifacts.execution),
  ]);
assertV4(
  sha256(preparationBytes) === activation.preparationManifestSha256 &&
    sha256(sourcePreparationBytes) === activation.sourcePreparationSha256,
  "frozen preparation hash drifted"
);
const preparation = JSON.parse(preparationBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.status ===
      "twenty-post-canary-batch-10-side-selector-contexts-passed" &&
    execution.activationSha256 === sha256(activationBytes) &&
    execution.contextsPlanned === 20 &&
    execution.contextsAttempted === 20 &&
    execution.contextsUnattempted === 0 &&
    execution.validContexts === 20 &&
    execution.invalidContexts === 0 &&
    execution.attempts === 20 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.rampPassed === true &&
    execution.authentication === "ChatGPT subscription" &&
    execution.scoreBlind === true &&
    execution.meteredApiCostUsd === 0 &&
    execution.transcriptionCostUsd === 0 &&
    JSON.stringify(execution.sourceCompatibility) ===
      JSON.stringify(activation.sourceCompatibility) &&
    execution.scoresDerived === 0 &&
    execution.authorization?.deterministicInventoryAnalysis === true &&
    execution.authorization?.inventoryCompilation === false &&
    execution.authorization?.independentJudgmentPacketPreparation === false &&
    execution.authorization?.scoreDerivation === false &&
    execution.authorization?.productionMutation === false,
  "side-selector execution did not pass as one complete gate"
);

const debates = [];
for (const prepared of sourcePreparation.contexts) {
  const contexts = preparation.contexts.filter(
    (context) => context.debateNumber === prepared.debateNumber
  );
  assertV4(
    contexts.length === 2 &&
      contexts.map((context) => context.side).join(",") === "pro,con",
    `${prepared.debateNumber}: exact side pair drifted`
  );
  const [
    planBytes,
    legacySchema,
    candidateTransport,
    candidateCensus,
    evidenceBundle,
    eventsDocument,
  ] = await Promise.all([
    readFile(prepared.planOutput),
    readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
    readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
    readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
    readFile(prepared.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
    readFile(prepared.originalEvents, "utf8").then(JSON.parse),
  ]);
  const plan = JSON.parse(planBytes);
  const sideSelections = {};
  const sideCandidateTransports = {};
  const sideSelectionHashes = {};
  for (const context of contexts) {
    const result = execution.results.find(
      (item) => item.contextIndex === context.contextIndex
    );
    assertV4(
      result?.debateNumber === context.debateNumber &&
        result?.side === context.side &&
        result?.accepted === true &&
        result?.attemptCount === 1 &&
        result?.retryCount === 0 &&
        result?.timedOut === false &&
        result?.status === "completed-valid" &&
        result?.outputWritten === true,
      `${context.debateNumber}/${context.side}: execution record drifted`
    );
    const [selectionBytes, sideTransport] = await Promise.all([
      readFile(context.output),
      readFile(
        prepared.sideAssets.find((asset) => asset.side === context.side)
          .transport,
        "utf8"
      ).then(JSON.parse),
    ]);
    assertV4(
      sha256(selectionBytes) === result.outputSha256,
      `${context.debateNumber}/${context.side}: output bytes drifted`
    );
    const sideSelection = JSON.parse(selectionBytes);
    const validation = validateChronologyFallbackSideSelection({
      sideSelection,
      side: context.side,
      plan,
      legacySchema,
      candidateTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
    });
    assertV4(
      validation.status === "passed",
      `${context.debateNumber}/${context.side}: replay validation failed`
    );
    sideSelections[context.side] = sideSelection;
    sideCandidateTransports[context.side] = sideTransport;
    sideSelectionHashes[context.side] = sha256(selectionBytes);
  }

  const compiled = compileChronologyFallbackInventory({
    plan,
    sideSelections,
    legacySchema,
    candidateTransport,
    candidateCensus,
    sideCandidateTransports,
    evidenceBundle,
    eventsDocument,
  });
  const belowHighAttributionMoveIds = compiled.lockedInventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId);
  const summary = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-chronology-fallback-inventory-validation",
    protocolId: activation.protocolId,
    status: "passed",
    developmentValidationOnly: false,
    productionCanary: false,
    batchNumber: 10,
    stagingOnly: true,
    debateNumber: prepared.debateNumber,
    inventoryPlanCanonicalSha256:
      candidateShardedInventoryPlanSha256(plan),
    sideSelectionSha256: sideSelectionHashes,
    sections: compiled.lockedInventory.sections.length,
    moves: compiled.lockedInventory.moves.length,
    proMoves: compiled.lockedInventory.moves.filter(
      (move) => move.side === "pro"
    ).length,
    conMoves: compiled.lockedInventory.moves.filter(
      (move) => move.side === "con"
    ).length,
    belowHighAttributionMoveIds,
    chronologyFallbackPlanAndSideSelectorsUsed: true,
    sideSelectorContextsMutuallyIsolated: true,
    immutablePlanHashBoundInBothSelectors: true,
    correspondingSideTransportHashBoundInEachSelector: true,
    everyCandidateKeyReviewed: true,
    priorityThenChronologyReductionApplied: true,
    preferredMoveKindAndConstructiveFallbackAuthored: true,
    chronologyFallbackAppliedOnlyToRetainedOrphanReply: true,
    chronologyFallbacks: structuredClone(
      compiled.reduction.chronologyFallbacks
    ),
    chronologyFallbackCount: compiled.reduction.chronologyFallbacks.length,
    nominatedCandidates: compiled.reduction.nominatedCandidates,
    retainedCandidates: compiled.reduction.retainedCandidates,
    deterministicallyDeferredCandidates:
      compiled.reduction.deterministicallyDeferredCandidates,
    finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact,
    ratingsAbsent: compiled.validation.ratingsAbsent,
    responseTopologyAbsent: compiled.validation.responseTopologyAbsent,
    semanticRepairPerformed: false,
    scoresDerived: 0,
  };
  assertV4(
    summary.sections >= 4 &&
      summary.sections <= 6 &&
      summary.proMoves >= summary.sections &&
      summary.proMoves <= summary.sections * 2 &&
      summary.conMoves >= summary.sections &&
      summary.conMoves <= summary.sections * 2 &&
      summary.moves === summary.proMoves + summary.conMoves &&
      summary.finalEvidenceSourceExact === true &&
      summary.ratingsAbsent === true &&
      summary.responseTopologyAbsent === true &&
      summary.chronologyFallbacks.every(
        (fallback) =>
          fallback.preferredMoveKind === "reply" &&
          fallback.appliedMoveKind === "constructive" &&
          fallback.reason === "no-earlier-selected-opposing-move"
      ),
    `${prepared.debateNumber}: compiled inventory boundary drifted`
  );

  for (const output of [
    prepared.inventoryProposalOutput,
    prepared.lockedInventoryOutput,
    prepared.validationOutput,
    prepared.provenanceOutput,
  ]) {
    assertV4(!(await exists(output)), `${output} already exists`);
    await mkdir(path.dirname(output), { recursive: true });
  }
  const proposalBytes = jsonBytes(compiled.proposal);
  const lockedBytes = jsonBytes(compiled.lockedInventory);
  const validationBytes = jsonBytes(summary);
  const provenanceBytes = jsonBytes(compiled.provenance);
  await Promise.all([
    writeFile(prepared.inventoryProposalOutput, proposalBytes),
    writeFile(prepared.lockedInventoryOutput, lockedBytes),
    writeFile(prepared.validationOutput, validationBytes),
    writeFile(prepared.provenanceOutput, provenanceBytes),
  ]);
  debates.push({
    debateNumber: prepared.debateNumber,
    debateId: prepared.debateId,
    plan: prepared.planOutput,
    planSha256: sha256(planBytes),
    planCanonicalSha256: candidateShardedInventoryPlanSha256(plan),
    sideSelections: Object.fromEntries(
      contexts.map((context) => [context.side, context.output])
    ),
    sideSelectionSha256: sideSelectionHashes,
    inventoryProposal: prepared.inventoryProposalOutput,
    inventoryProposalSha256: sha256(proposalBytes),
    lockedInventory: prepared.lockedInventoryOutput,
    lockedInventorySha256: sha256(lockedBytes),
    validation: prepared.validationOutput,
    validationSha256: sha256(validationBytes),
    provenance: prepared.provenanceOutput,
    provenanceSha256: sha256(provenanceBytes),
    sections: summary.sections,
    moves: summary.moves,
    proMoves: summary.proMoves,
    conMoves: summary.conMoves,
    nominatedCandidates: summary.nominatedCandidates,
    retainedCandidates: summary.retainedCandidates,
    deterministicallyDeferredCandidates:
      summary.deterministicallyDeferredCandidates,
    chronologyFallbacks: summary.chronologyFallbacks,
    chronologyFallbackCount: summary.chronologyFallbackCount,
    belowHighAttributionMoveIds,
    validated: true,
  });
}
assertV4(debates.length === 10, "compiled inventory debate count drifted");

const sourceHashes = {
  [ACTIVATION]: sha256(activationBytes),
  [activation.preparationManifest]: sha256(preparationBytes),
  [activation.sourcePreparation]: sha256(sourcePreparationBytes),
  [activation.artifacts.execution]: sha256(executionBytes),
};
for (const debate of debates) {
  sourceHashes[debate.plan] = debate.planSha256;
  for (const side of ["pro", "con"]) {
    sourceHashes[debate.sideSelections[side]] =
      debate.sideSelectionSha256[side];
  }
  sourceHashes[debate.inventoryProposal] = debate.inventoryProposalSha256;
  sourceHashes[debate.lockedInventory] = debate.lockedInventorySha256;
  sourceHashes[debate.validation] = debate.validationSha256;
  sourceHashes[debate.provenance] = debate.provenanceSha256;
}

const belowHighAttributionMoves = debates.reduce(
  (sum, debate) => sum + debate.belowHighAttributionMoveIds.length,
  0
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-chronology-fallback-inventory-analysis",
  protocolId: activation.protocolId,
  status:
    belowHighAttributionMoves > 0
      ? "post-canary-batch-10-inventory-gate-passed-audio-verification-required-before-later-adjudication"
      : "post-canary-batch-10-inventory-gate-passed-standing-authorization-active-for-independent-judgment-packet-preparation",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  activePolicy: structuredClone(activation.activePolicy),
  sourceCompatibility: structuredClone(activation.sourceCompatibility),
  validatedInventoryContract: structuredClone(
    activation.validatedInventoryContract
  ),
  model: structuredClone(activation.model),
  activation: ACTIVATION,
  activationSha256: sha256(activationBytes),
  execution: activation.artifacts.execution,
  executionSha256: sha256(executionBytes),
  debates,
  audit: {
    exactDebateCount: debates.length,
    exactSideContextCount: execution.validContexts,
    everySelectorSingleAttempt: true,
    everySelectorSchemaAndSemanticValidationPassed: true,
    everyPlanAndSideHashReplayed: true,
    everyLockedInventoryValidated: true,
    everyLockedMoveUsesExactSourceEvidence: true,
    ratingsAbsent: true,
    responseTopologyAbsent: true,
    semanticRepairPerformed: false,
    preferredMoveKindAndConstructiveFallbackAuthored: true,
    chronologyFallbackAppliedOnlyToRetainedOrphanReply: debates.every(
      (debate) =>
        debate.chronologyFallbacks.every(
          (fallback) =>
            fallback.preferredMoveKind === "reply" &&
            fallback.appliedMoveKind === "constructive" &&
            fallback.reason === "no-earlier-selected-opposing-move"
        )
    ),
    zeroLexicalTokenSourceRowPreserved: true,
    exactSourceRowsInjectedOmittedOrRewritten: false,
    scoresDerived: false,
  },
  audioPolicy: {
    belowHighAttributionMoveIds: debates.flatMap((debate) =>
      debate.belowHighAttributionMoveIds.map((moveId) => ({
        debateNumber: debate.debateNumber,
        moveId,
      }))
    ),
    audioVerificationDeferredUntilAfterIndependentDisputeExtraction: true,
    everyRetainedBelowHighMoveRequiresAudioBeforeAdjudication: true,
    audioCalls: 0,
  },
  sourceHashes,
  totals: {
    debates: debates.length,
    sideContextsAttempted: execution.contextsAttempted,
    acceptedSideSelections: execution.validContexts,
    inventoryProposalsCompiled: debates.length,
    lockedInventoriesCompiled: debates.length,
    sections: debates.reduce((sum, debate) => sum + debate.sections, 0),
    moves: debates.reduce((sum, debate) => sum + debate.moves, 0),
    proMoves: debates.reduce((sum, debate) => sum + debate.proMoves, 0),
    conMoves: debates.reduce((sum, debate) => sum + debate.conMoves, 0),
    nominatedCandidates: debates.reduce(
      (sum, debate) => sum + debate.nominatedCandidates,
      0
    ),
    deterministicallyDeferredCandidates: debates.reduce(
      (sum, debate) => sum + debate.deterministicallyDeferredCandidates,
      0
    ),
    belowHighAttributionMoves,
    chronologyFallbacks: debates.reduce(
      (sum, debate) => sum + debate.chronologyFallbackCount,
      0
    ),
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
    independentJudgmentPacketPreparation: false,
    independentJudgmentExecutionManifestPreparation: false,
    independentJudgmentModelExecution: false,
    paidTranscription: false,
    audioVerification: false,
    disputeExtraction: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationPreparation: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "prepare-freeze-and-activate-batch-10-independent-judgment-contexts-under-standing-authorization",
};

await writeFile(
  activation.artifacts.analysis,
  `${JSON.stringify(analysis, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: debates.length,
      acceptedSideSelections: execution.validContexts,
      lockedInventories: debates.length,
      moves: analysis.totals.moves,
      belowHighAttributionMoves: analysis.totals.belowHighAttributionMoves,
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
