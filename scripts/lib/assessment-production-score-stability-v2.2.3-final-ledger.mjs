import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField,
} from "./v4-lean-production.mjs";
import { normalizeV418Events } from "./v418-source-integrity.mjs";
import { validateV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";
import { extractAssessmentProductionScoreStabilityV223Disagreements } from "./assessment-production-score-stability-v2.2.3-disagreement.mjs";
import {
  buildV223DisputeAdjudicationPacket,
  validateV223DisputeAdjudicationOutput,
} from "./assessment-production-score-stability-v2.2.3-dispute-adjudication.mjs";

export const V223_FINAL_LEDGER_ROOT =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/final-ledger";
export const V223_FINAL_LEDGER_PROTOCOL_ID =
  "assessment-production-score-stability-v2.2.3-adjudicated-consensus";
export const V223_FINAL_LEDGER_VERSION =
  "1.0-score-stability-v2.2.3-adjudicated-raw-ledger";

const COHORT_ROOT =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort";
const EXPECTED_DEBATES = Object.freeze([
  "17",
  "39",
  "121",
  "21",
  "75",
  "168",
  "177",
  "56",
  "49",
  "132",
]);
const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const RATING_KEYS = new Set([
  "logicalCoherence",
  "evidenceWarrant",
  "relevanceBurden",
  "representationalCharity",
]);
const candidateKey = (choice) => `candidate${choice}`;

function exactKeys(value, keys, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    canonicalJson(Object.keys(value).sort()) ===
      canonicalJson([...keys].sort()),
    `${label}: keys mismatch`
  );
}

function moveMap(primary) {
  return new Map(primary.moves.map((move) => [move.moveId, move]));
}

function scalarValue(move, fieldKey) {
  if (fieldKey === "responsivenessWithinClass") {
    return move.response.responsivenessWithinClass.value;
  }
  assertV4(
    RATING_KEYS.has(fieldKey),
    `${move.moveId}.${fieldKey}: unsupported rounded-mean field`
  );
  return move.ratings[fieldKey].value;
}

function meanRationale(fieldKey, candidate1, candidate2) {
  return `The adjudicated raw ledger applies the preregistered rounded mean to the two nondisputed ${fieldKey} values (${candidate1} and ${candidate2}); their difference did not meet a semantic or magnitude dispute trigger.`;
}

function assertProvenancePair(mapping, label) {
  exactKeys(mapping, ["candidate1", "candidate2"], label);
  assertV4(
    [mapping.candidate1, mapping.candidate2].sort().join(",") ===
      "passA,passB",
    `${label}: candidates must map one-to-one to passA and passB`
  );
}

function selectedSource({ choice, mapping, packetPair, originalPair, label }) {
  assertV4(
    choice === 1 || choice === 2,
    `${label}: choice must be one or two`
  );
  assertProvenancePair(mapping, `${label}.provenance`);
  const key = candidateKey(choice);
  const source = mapping[key];
  const originalKey = source === "passA" ? "candidate1" : "candidate2";
  assertV4(
    canonicalJson(packetPair[key]) === canonicalJson(originalPair[originalKey]),
    `${label}: anonymized candidate does not match provenance`
  );
  return source;
}

function selectedMove(source, moveA, moveB) {
  return source === "passA" ? moveA : moveB;
}

function audioMap(audioAudit) {
  return new Map(
    audioAudit.debates.flatMap((debate) =>
      debate.moves.map((move) => [move.moveId, move])
    )
  );
}

function validateInputReplay(input) {
  const {
    primaryA,
    primaryB,
    lockedInventory,
    sourcePacket,
    eventsDocument,
    originalEventsDocument,
    eventsFileBytes,
    sourceLedgerBytes,
    disagreements,
    adjudicationPacket,
    provenance,
    adjudicationOutput,
    audioAudit,
  } = input;
  validateV4220PrimaryOutput(
    primaryA,
    sourcePacket,
    eventsDocument,
    eventsFileBytes,
    sourceLedgerBytes
  );
  validateV4220PrimaryOutput(
    primaryB,
    sourcePacket,
    eventsDocument,
    eventsFileBytes,
    sourceLedgerBytes
  );
  const replayedDisagreements =
    extractAssessmentProductionScoreStabilityV223Disagreements(
      primaryA,
      primaryB,
      lockedInventory
    );
  assertV4(
    canonicalJson(replayedDisagreements) === canonicalJson(disagreements),
    `${primaryA.debateNumber}: stored disagreements differ from deterministic v2.2.3 replay`
  );
  const rebuiltAdjudication = buildV223DisputeAdjudicationPacket(
    replayedDisagreements,
    lockedInventory,
    originalEventsDocument,
    audioMap(audioAudit)
  );
  assertV4(
    canonicalJson(rebuiltAdjudication.packet) ===
      canonicalJson(adjudicationPacket),
    `${primaryA.debateNumber}: adjudication packet differs from deterministic v2.2.3 replay`
  );
  assertV4(
    provenance.modelInput === false,
    `${primaryA.debateNumber}: provenance must not be model input`
  );
  assertV4(
    canonicalJson(rebuiltAdjudication.provenance) ===
      canonicalJson(provenance.mappings),
    `${primaryA.debateNumber}: adjudication provenance differs from deterministic v2.2.3 replay`
  );
  validateV223DisputeAdjudicationOutput(
    adjudicationOutput,
    adjudicationPacket
  );
  return replayedDisagreements;
}

export function compileV223FinalLedgerDebate(input) {
  const {
    primaryA,
    primaryB,
    adjudicationPacket,
    provenance,
    adjudicationOutput,
    sourcePacket,
  } = input;
  const disagreements = validateInputReplay(input);
  const finalJudgment = clone(primaryA);
  const finalById = moveMap(finalJudgment);
  const passAById = moveMap(primaryA);
  const passBById = moveMap(primaryB);
  const decisionById = new Map(
    adjudicationOutput.moveDecisions.map((move) => [move.moveId, move])
  );
  const disputeById = new Map(
    disagreements.moveDisputes.map((move) => [move.moveId, move])
  );
  const ownedScalars = new Map();
  const own = (moveId, fieldKey) => {
    if (!ownedScalars.has(moveId)) ownedScalars.set(moveId, new Set());
    ownedScalars.get(moveId).add(fieldKey);
  };
  const pairSelections = [];
  const scoringFieldSelections = [];
  let audioVerifiedMoves = 0;

  for (const packetMove of adjudicationPacket.disputedMoves) {
    const { moveId } = packetMove;
    const finalMove = finalById.get(moveId);
    const moveA = passAById.get(moveId);
    const moveB = passBById.get(moveId);
    const dispute = disputeById.get(moveId);
    const decision = decisionById.get(moveId);
    const mapping = provenance.mappings.moves[moveId];
    assertV4(
      finalMove && moveA && moveB && dispute && decision && mapping,
      `${moveId}: final-ledger compiler input missing`
    );
    if (disagreements.audioVerificationMoveIds.includes(moveId)) {
      assertV4(
        packetMove.evidence.audioVerification?.status === "verified" &&
          packetMove.evidence.audioVerification.transcriptSha256,
        `${moveId}: required audio verification is not locked`
      );
      audioVerifiedMoves += 1;
    }

    const applyPair = (pairKey, choice, apply) => {
      if (choice === null) return;
      const source = selectedSource({
        choice,
        mapping: mapping[pairKey],
        packetPair: packetMove.candidates[pairKey],
        originalPair: dispute.candidates[pairKey],
        label: `${moveId}.${pairKey}`,
      });
      apply(selectedMove(source, moveA, moveB));
      pairSelections.push({ moveId, pairKey, choice, source });
    };
    applyPair("importancePair", decision.importancePairChoice, (sourceMove) => {
      finalMove.importance = sourceMove.importance;
    });
    applyPair(
      "attributionPair",
      decision.attributionPairChoice,
      (sourceMove) => {
        finalMove.attributionConfidence = sourceMove.attributionConfidence;
        finalMove.attributionBasis = sourceMove.attributionBasis;
      }
    );
    applyPair("responsePair", decision.responsePairChoice, (sourceMove) => {
      finalMove.response = clone(sourceMove.response);
      own(moveId, "responsivenessWithinClass");
    });
    applyPair("charityPair", decision.charityPairChoice, (sourceMove) => {
      finalMove.charity = clone(sourceMove.charity);
      finalMove.ratings.representationalCharity = clone(
        sourceMove.ratings.representationalCharity
      );
      own(moveId, "representationalCharity");
    });
    applyPair(
      "assessmentConfidencePair",
      decision.assessmentConfidencePairChoice,
      (sourceMove) => {
        finalMove.assessmentConfidence = sourceMove.assessmentConfidence;
      }
    );

    for (const fieldDecision of decision.scoringFieldChoices) {
      const { fieldKey, choice } = fieldDecision;
      const source = selectedSource({
        choice,
        mapping: mapping.scoringFields[fieldKey],
        packetPair: packetMove.candidates.scoringFields[fieldKey],
        originalPair: dispute.candidates.scoringFields[fieldKey],
        label: `${moveId}.scoringFields.${fieldKey}`,
      });
      const sourceMove = selectedMove(source, moveA, moveB);
      if (RATING_KEYS.has(fieldKey)) {
        finalMove.ratings[fieldKey] = clone(sourceMove.ratings[fieldKey]);
        own(moveId, fieldKey);
        if (fieldKey === "relevanceBurden") {
          finalMove.burdenContact = clone(sourceMove.burdenContact);
        }
      } else if (fieldKey === "precisionClarity") {
        finalMove.precisionFindings = clone(sourceMove.precisionFindings);
      } else if (fieldKey === "epistemicCalibration") {
        finalMove.calibrationFindings = clone(sourceMove.calibrationFindings);
      } else {
        throw new Error(`${moveId}.${fieldKey}: unsupported scoring field`);
      }
      scoringFieldSelections.push({ moveId, fieldKey, choice, source });
    }
  }

  const meanMerges = [];
  const dependencyMeanMergesSuppressed = [];
  for (const merge of disagreements.nondisputedScalarMerges) {
    const finalMove = finalById.get(merge.moveId);
    const moveA = passAById.get(merge.moveId);
    const moveB = passBById.get(merge.moveId);
    assertV4(
      finalMove && moveA && moveB,
      `${merge.moveId}: rounded-mean move missing`
    );
    assertV4(
      scalarValue(moveA, merge.fieldKey) === merge.candidate1 &&
        scalarValue(moveB, merge.fieldKey) === merge.candidate2,
      `${merge.moveId}.${merge.fieldKey}: rounded-mean inputs changed`
    );
    if (ownedScalars.get(merge.moveId)?.has(merge.fieldKey)) {
      dependencyMeanMergesSuppressed.push({
        moveId: merge.moveId,
        fieldKey: merge.fieldKey,
        rule: "adjudicated dependency selection takes precedence",
      });
      continue;
    }
    const rationale = meanRationale(
      merge.fieldKey,
      merge.candidate1,
      merge.candidate2
    );
    if (merge.fieldKey === "responsivenessWithinClass") {
      finalMove.response.responsivenessWithinClass = {
        value: merge.roundedMeanAfterAdjudication,
        rationale,
      };
    } else {
      finalMove.ratings[merge.fieldKey] = {
        value: merge.roundedMeanAfterAdjudication,
        rationale,
      };
    }
    meanMerges.push(clone(merge));
  }

  const burdenAdjustmentSelections = [];
  for (const decision of adjudicationOutput.burdenAdjustmentDecisions) {
    const packetDispute = adjudicationPacket.burdenAdjustmentDisputes.find(
      (item) => item.side === decision.side
    );
    const originalDispute = disagreements.burdenAdjustmentDisputes.find(
      (item) => item.side === decision.side
    );
    const mapping = provenance.mappings.burdenAdjustments[decision.side];
    assertV4(
      packetDispute && originalDispute && mapping,
      `${decision.side}: adjustment input missing`
    );
    const source = selectedSource({
      choice: decision.choice,
      mapping,
      packetPair: packetDispute.candidates,
      originalPair: originalDispute,
      label: `burdenAdjustment.${decision.side}`,
    });
    finalJudgment.burdenCompletionAdjustment[decision.side] = clone(
      (source === "passA" ? primaryA : primaryB).burdenCompletionAdjustment[
        decision.side
      ]
    );
    burdenAdjustmentSelections.push({
      side: decision.side,
      choice: decision.choice,
      source,
    });
  }

  const validation = validateV4220PrimaryOutput(
    finalJudgment,
    sourcePacket,
    input.eventsDocument,
    input.eventsFileBytes,
    input.sourceLedgerBytes
  );
  assertV4(
    !containsProhibitedCalculatedField(finalJudgment),
    `${primaryA.debateNumber}: final raw judgment contains a prohibited calculated field`
  );
  return {
    debateNumber: primaryA.debateNumber,
    debateId: primaryA.debateId,
    finalJudgment,
    mergeAudit: {
      validation,
      disputedMoves: disagreements.moveDisputes.length,
      pairSelections,
      scoringFieldSelections,
      burdenAdjustmentSelections,
      meanMerges,
      dependencyMeanMergesSuppressed,
      audioVerifiedMoves,
      unchangedEqualSemanticFieldsUsePassARationale: true,
      adjudicationRationalesRemainSourceAuditOnly: true,
      calculatedScores: 0,
    },
  };
}

export function buildV223FinalLedger(debateInputs, sourceHashes) {
  assertV4(
    Array.isArray(debateInputs) && debateInputs.length === EXPECTED_DEBATES.length,
    "ten v2.2.3 final-ledger debate inputs required"
  );
  const debates = debateInputs.map(compileV223FinalLedgerDebate);
  assertV4(
    debates.map((debate) => debate.debateNumber).join(",") ===
      EXPECTED_DEBATES.join(","),
    "v2.2.3 final-ledger debate order invalid"
  );
  const aggregate = debates.reduce(
    (totals, debate) => {
      totals.disputedMoves += debate.mergeAudit.disputedMoves;
      totals.pairSelections += debate.mergeAudit.pairSelections.length;
      totals.scoringFieldSelections +=
        debate.mergeAudit.scoringFieldSelections.length;
      totals.burdenAdjustmentSelections +=
        debate.mergeAudit.burdenAdjustmentSelections.length;
      totals.meanMerges += debate.mergeAudit.meanMerges.length;
      totals.dependencyMeanMergesSuppressed +=
        debate.mergeAudit.dependencyMeanMergesSuppressed.length;
      totals.audioVerifiedMoves += debate.mergeAudit.audioVerifiedMoves;
      return totals;
    },
    {
      disputedMoves: 0,
      pairSelections: 0,
      scoringFieldSelections: 0,
      burdenAdjustmentSelections: 0,
      meanMerges: 0,
      dependencyMeanMergesSuppressed: 0,
      audioVerifiedMoves: 0,
    }
  );
  const candidateSelections =
    aggregate.pairSelections +
    aggregate.scoringFieldSelections +
    aggregate.burdenAdjustmentSelections;
  assertV4(
    aggregate.disputedMoves === 185,
    "v2.2.3 disputed-move population mismatch"
  );
  assertV4(
    candidateSelections === 490,
    "v2.2.3 candidate-selection population mismatch"
  );
  assertV4(
    aggregate.meanMerges + aggregate.dependencyMeanMergesSuppressed === 434,
    "v2.2.3 rounded-mean population mismatch"
  );
  assertV4(
    aggregate.audioVerifiedMoves === 4,
    "v2.2.3 audio-verification population mismatch"
  );
  return {
    schemaVersion: V223_FINAL_LEDGER_VERSION,
    protocolId: V223_FINAL_LEDGER_PROTOCOL_ID,
    status: "passed-v2.2.3-deterministic-final-ledger-assembly",
    productionCanary: false,
    stagingOnly: true,
    developmentValidationOnly: true,
    AIOnly: true,
    scoringInputSchema:
      "v4.2.20-source-span-primary-with-v2.2.3-adjudicated-provenance",
    sources: clone(sourceHashes),
    debates,
    audit: {
      ...aggregate,
      candidateSelections,
      finalRawJudgments: debates.length,
      deterministicDisagreementReplay: true,
      anonymizedCandidateProvenanceReplay: true,
      adjudicationSelectionReplay: true,
      verifiedAudioEvidenceReplay: true,
      fullSourceChainValidation: true,
      singleScoringPassSchema: true,
      scoresDerivedOnlyAfterAdjudicatedLedgerLock: true,
      calculatedScores: 0,
    },
    authorization: {
      scoreDerivation: true,
      scorePassesMaximum: 1,
      policyPromotion: false,
      publicationFinalization: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
  };
}

export function validateV223FinalLedger(ledger, debateInputs, sourceHashes) {
  const expected = buildV223FinalLedger(debateInputs, sourceHashes);
  assertV4(
    canonicalJson(ledger) === canonicalJson(expected),
    "v2.2.3 final ledger differs from deterministic replay"
  );
  assertV4(
    !containsProhibitedCalculatedField(
      ledger.debates.map((debate) => debate.finalJudgment)
    ),
    "v2.2.3 final ledger contains a prohibited calculated field"
  );
  return {
    status: "passed",
    debates: ledger.debates.length,
    disputedMoves: ledger.audit.disputedMoves,
    candidateSelections: ledger.audit.candidateSelections,
    roundedMeanMerges: ledger.audit.meanMerges,
    dependencyMeanMergesSuppressed:
      ledger.audit.dependencyMeanMergesSuppressed,
    audioVerifiedMoves: ledger.audit.audioVerifiedMoves,
    calculatedScores: 0,
    scoreDerivationAuthorized: ledger.authorization.scoreDerivation,
  };
}

function buildCombinedAudioAudit(audioAudit, audioAttributionAnalysis) {
  const combined = clone(audioAudit);
  const decision = audioAttributionAnalysis.adjudication.decisions[0];
  const originalUnresolved = combined.debates
    .flatMap((debate) => debate.moves)
    .find(
      (move) =>
        move.debateNumber === "17" && move.moveId === decision.moveId
    );
  assertV4(
    decision.status === "verified" &&
      decision.moveId === "pro-cumulative-moral-christian-case" &&
      originalUnresolved?.status === "unresolved",
    "v2.2.3 combined audio resolution unavailable"
  );
  const debate = combined.debates.find(
    (item) => item.debateNumber === "17"
  );
  const index = debate.moves.findIndex(
    (move) => move.moveId === decision.moveId
  );
  debate.moves[index] = {
    ...clone(originalUnresolved),
    status: "verified",
    resolvedSpeaker: decision.authoringSpeaker,
    resolutionMethod: "isolated-audio-attribution-adjudication",
    audioAttributionDecision: clone(decision),
    deterministicEvidence: {
      ...clone(originalUnresolved.deterministicEvidence),
      transcriptHashMatched: true,
      excerptRecall:
        originalUnresolved.deterministicEvidence.expectedSpeakerExcerptRecall,
      isolatedAuthorshipVerified: true,
    },
  };
  combined.status = "passed-all-four-v2.2.3-audio-moves-verified";
  combined.totals.verified = 4;
  combined.totals.unresolved = 0;
  return combined;
}

export async function loadV223FinalLedgerInputs() {
  const adjudicationRoot = `${COHORT_ROOT}/dispute-only-adjudication`;
  const judgmentRoot = `${COHORT_ROOT}/independent-judgments`;
  const audioRoot = `${COHORT_ROOT}/audio-verification`;
  const audioAttributionRoot = `${COHORT_ROOT}/audio-attribution-adjudication`;
  const analysisPath = `${adjudicationRoot}/analysis.json`;
  const preparationPath = `${adjudicationRoot}/preparation-manifest.json`;
  const executionPath = `${adjudicationRoot}/model-execution.json`;
  const judgmentPreparationPath = `${judgmentRoot}/preparation-manifest.json`;
  const audioAnalysisPath = `${audioRoot}/analysis.json`;
  const audioAuditPath = `${audioRoot}/audio-verification.json`;
  const audioAttributionAnalysisPath = `${audioAttributionRoot}/analysis.json`;
  const audioAttributionExecutionPath = `${audioAttributionRoot}/model-execution.json`;
  const audioAttributionOutputPath = `${audioAttributionRoot}/output.json`;
  const [
    analysis,
    preparation,
    execution,
    judgmentPreparation,
    audioAnalysis,
    audioAudit,
    audioAttributionAnalysis,
  ] = await Promise.all(
    [
      analysisPath,
      preparationPath,
      executionPath,
      judgmentPreparationPath,
      audioAnalysisPath,
      audioAuditPath,
      audioAttributionAnalysisPath,
    ].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse))
  );
  assertV4(
    analysis.status === "v2.2.3-dispute-only-adjudication-gate-passed" &&
      analysis.authorization.finalLedgerAssembly &&
      !analysis.authorization.scoreDerivation,
    "v2.2.3 final-ledger assembly is not authorized"
  );
  assertV4(
    execution.status ===
      "ten-isolated-v2.2.3-dispute-only-adjudication-contexts-passed" &&
      execution.validContexts === 10 &&
      execution.retries === 0 &&
      execution.corrections === 0 &&
      execution.scoresDerived === 0,
    "accepted v2.2.3 adjudication execution unavailable"
  );
  assertV4(
    audioAnalysis.status === "v2.2.3-audio-verification-unresolved" &&
      audioAudit.totals.verified === 3 &&
      audioAudit.totals.unresolved === 1 &&
      audioAttributionAnalysis.status ===
        "v2.2.3-audio-attribution-adjudication-passed" &&
      audioAttributionAnalysis.combinedAudioResult.requiredMoves === 4 &&
      audioAttributionAnalysis.combinedAudioResult.unresolved === 0 &&
      audioAttributionAnalysis.combinedAudioResult.verificationRate === 1,
    "complete v2.2.3 audio verification chain unavailable"
  );
  const combinedAudioAudit = buildCombinedAudioAudit(
    audioAudit,
    audioAttributionAnalysis
  );
  const sourcePaths = [
    analysisPath,
    preparationPath,
    executionPath,
    judgmentPreparationPath,
    audioAnalysisPath,
    audioAuditPath,
    audioAttributionAnalysisPath,
    audioAttributionExecutionPath,
    audioAttributionOutputPath,
  ];
  const debateInputs = [];
  for (const context of preparation.contexts) {
    const passA = judgmentPreparation.contexts.find(
      (item) =>
        item.debateNumber === context.debateNumber && item.reviewerPass === "A"
    );
    const passB = judgmentPreparation.contexts.find(
      (item) =>
        item.debateNumber === context.debateNumber && item.reviewerPass === "B"
    );
    assertV4(passA && passB, `${context.debateNumber}: judgment pair unavailable`);
    const paths = {
      primaryA: passA.rawOutput,
      primaryB: passB.rawOutput,
      lockedInventory: context.lockedInventory,
      sourcePacket: context.sourcePacket,
      disagreements: context.disputeSource,
      adjudicationPacket: context.packet,
      provenance: context.provenance,
      adjudicationOutput: context.output,
    };
    const loaded = Object.fromEntries(
      await Promise.all(
        Object.entries(paths).map(async ([key, file]) => [
          key,
          JSON.parse(await readFile(path.resolve(file), "utf8")),
        ])
      )
    );
    const eventsPath = loaded.sourcePacket.sourceChain.eventsPath;
    const transcriptPath = loaded.sourcePacket.sourceChain.transcriptPath;
    const localManifestPath =
      loaded.sourcePacket.sourceChain.localManifestPath;
    const sourceLedgerPath =
      loaded.sourcePacket.transportChain.sourceLedgerPath;
    const [
      eventsFileBytes,
      sourceLedgerBytes,
      transcriptBytes,
      localManifestBytes,
    ] = await Promise.all(
      [
        eventsPath,
        sourceLedgerPath,
        transcriptPath,
        localManifestPath,
      ].map((file) => readFile(path.resolve(file)))
    );
    assertV4(
      sha256(eventsFileBytes) ===
        loaded.sourcePacket.sourceChain.eventsSha256,
      `${context.debateNumber}: events hash mismatch`
    );
    assertV4(
      sha256(transcriptBytes) ===
        loaded.sourcePacket.sourceChain.transcriptSha256,
      `${context.debateNumber}: transcript hash mismatch`
    );
    assertV4(
      sha256(localManifestBytes) ===
        loaded.sourcePacket.sourceChain.localManifestSha256,
      `${context.debateNumber}: local transcript manifest hash mismatch`
    );
    assertV4(
      sha256(sourceLedgerBytes) ===
        loaded.sourcePacket.transportChain.sourceLedgerSha256,
      `${context.debateNumber}: source ledger hash mismatch`
    );
    for (const audioInput of context.audioTranscriptInputs) {
      assertV4(
        sha256(await readFile(path.resolve(audioInput.sourcePath))) ===
          audioInput.sha256,
        `${context.debateNumber}/${audioInput.moveId}: audio transcript hash mismatch`
      );
    }
    const audioTranscriptPaths = context.audioTranscriptInputs.map(
      (item) => item.sourcePath
    );
    sourcePaths.push(
      ...Object.values(paths),
      eventsPath,
      transcriptPath,
      localManifestPath,
      sourceLedgerPath,
      ...audioTranscriptPaths
    );
    debateInputs.push({
      ...loaded,
      originalEventsDocument: JSON.parse(eventsFileBytes),
      eventsDocument: normalizeV418Events(JSON.parse(eventsFileBytes)).map(
        (event) => ({
          startMs: event.startMs,
          durationMs: event.durationMs,
          text: event.text,
        })
      ),
      eventsFileBytes,
      sourceLedgerBytes,
      audioAudit: combinedAudioAudit,
    });
  }
  assertV4(
    debateInputs.map((input) => input.primaryA.debateNumber).join(",") ===
      EXPECTED_DEBATES.join(","),
    "loaded v2.2.3 debate order invalid"
  );
  const uniqueSourcePaths = [...new Set(sourcePaths)].sort();
  const sourceHashes = {};
  for (const file of uniqueSourcePaths) {
    sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  }
  return {
    debateInputs,
    sourceHashes,
    sourcePaths: uniqueSourcePaths,
  };
}

