import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson, containsProhibitedCalculatedField } from "./v4-lean-production.mjs";
import { validateV4220PrimaryOutput } from "./v4220-source-span-rendering.mjs";
import { extractV42211726Disagreements } from "./v42211726-hard-route-disagreement.mjs";
import { buildV42211728AdjudicationPacket, validateV42211728AdjudicationOutput } from "./v42211728-hard-route-adjudication.mjs";

export const V42211729_ROOT = "docs/calibration/v4.2.21.17.29/hard-route-final-ledger";
export const V42211729_PROTOCOL_ID = "v4.2.21.17.29-hard-route-adjudicated-consensus";
export const V42211729_LEDGER_VERSION = "4.2.21.17.29-hard-route-adjudicated-raw-ledger";

const EXPECTED_DEBATES = Object.freeze(["51", "63", "90", "153", "165"]);
const RATING_KEYS = new Set(["logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity"]);
const clone = (value) => structuredClone(value);
const candidateKey = (choice) => `candidate${choice}`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label}: keys mismatch`);
}

function moveMap(primary) {
  return new Map(primary.moves.map((move) => [move.moveId, move]));
}

function scalarValue(move, fieldKey) {
  if (fieldKey === "responsivenessWithinClass") return move.response.responsivenessWithinClass.value;
  assertV4(RATING_KEYS.has(fieldKey), `${move.moveId}.${fieldKey}: unsupported rounded-mean field`);
  return move.ratings[fieldKey].value;
}

function meanRationale(fieldKey, candidate1, candidate2) {
  return `The adjudicated raw ledger applies the preregistered rounded mean to the two nondisputed ${fieldKey} values (${candidate1} and ${candidate2}); their difference did not meet a semantic or magnitude dispute trigger.`;
}

function assertProvenancePair(mapping, label) {
  exactKeys(mapping, ["candidate1", "candidate2"], label);
  assertV4([mapping.candidate1, mapping.candidate2].sort().join(",") === "passA,passB", `${label}: candidates must map one-to-one to passA and passB`);
}

function selectedSource({ choice, mapping, packetPair, originalPair, label }) {
  assertV4(choice === 1 || choice === 2, `${label}: choice must be one or two`);
  assertProvenancePair(mapping, `${label}.provenance`);
  const key = candidateKey(choice);
  const source = mapping[key];
  const originalKey = source === "passA" ? "candidate1" : "candidate2";
  assertV4(canonicalJson(packetPair[key]) === canonicalJson(originalPair[originalKey]), `${label}: anonymized candidate does not match provenance`);
  return source;
}

function selectedMove(source, moveA, moveB) {
  return source === "passA" ? moveA : moveB;
}

function audioMap(audioAudit) {
  return new Map(audioAudit.debates.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
}

function validateInputReplay(input) {
  const { primaryA, primaryB, lockedInventory, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes, disagreements, adjudicationPacket, provenance, adjudicationOutput, audioAudit } = input;
  validateV4220PrimaryOutput(primaryA, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes);
  validateV4220PrimaryOutput(primaryB, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes);
  const replayedDisagreements = extractV42211726Disagreements(primaryA, primaryB, lockedInventory);
  assertV4(canonicalJson(replayedDisagreements) === canonicalJson(disagreements), `${primaryA.debateNumber}: stored disagreements differ from deterministic hard-route replay`);
  const rebuiltAdjudication = buildV42211728AdjudicationPacket(replayedDisagreements, lockedInventory, eventsDocument, audioMap(audioAudit));
  assertV4(canonicalJson(rebuiltAdjudication.packet) === canonicalJson(adjudicationPacket), `${primaryA.debateNumber}: adjudication packet differs from deterministic hard-route replay`);
  assertV4(provenance.modelInput === false, `${primaryA.debateNumber}: provenance must not be model input`);
  assertV4(canonicalJson(rebuiltAdjudication.provenance) === canonicalJson(provenance.mappings), `${primaryA.debateNumber}: adjudication provenance differs from deterministic hard-route replay`);
  validateV42211728AdjudicationOutput(adjudicationOutput, adjudicationPacket);
  return replayedDisagreements;
}

export function compileV42211729Debate(input) {
  const { primaryA, primaryB, adjudicationPacket, provenance, adjudicationOutput, sourcePacket } = input;
  const disagreements = validateInputReplay(input);
  const finalJudgment = clone(primaryA);
  const finalById = moveMap(finalJudgment);
  const passAById = moveMap(primaryA);
  const passBById = moveMap(primaryB);
  const decisionById = new Map(adjudicationOutput.moveDecisions.map((move) => [move.moveId, move]));
  const disputeById = new Map(disagreements.moveDisputes.map((move) => [move.moveId, move]));
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
    assertV4(finalMove && moveA && moveB && dispute && decision && mapping, `${moveId}: final-ledger compiler input missing`);
    if (disagreements.audioVerificationMoveIds.includes(moveId)) {
      assertV4(packetMove.evidence.audioVerification?.status === "verified" && packetMove.evidence.audioVerification.transcriptSha256, `${moveId}: required audio verification is not locked`);
      audioVerifiedMoves += 1;
    }

    const applyPair = (pairKey, choice, apply) => {
      if (choice === null) return;
      const source = selectedSource({ choice, mapping: mapping[pairKey], packetPair: packetMove.candidates[pairKey], originalPair: dispute.candidates[pairKey], label: `${moveId}.${pairKey}` });
      apply(selectedMove(source, moveA, moveB));
      pairSelections.push({ moveId, pairKey, choice, source });
    };
    applyPair("importancePair", decision.importancePairChoice, (sourceMove) => { finalMove.importance = sourceMove.importance; });
    applyPair("attributionPair", decision.attributionPairChoice, (sourceMove) => { finalMove.attributionConfidence = sourceMove.attributionConfidence; finalMove.attributionBasis = sourceMove.attributionBasis; });
    applyPair("responsePair", decision.responsePairChoice, (sourceMove) => { finalMove.response = clone(sourceMove.response); own(moveId, "responsivenessWithinClass"); });
    applyPair("charityPair", decision.charityPairChoice, (sourceMove) => { finalMove.charity = clone(sourceMove.charity); finalMove.ratings.representationalCharity = clone(sourceMove.ratings.representationalCharity); own(moveId, "representationalCharity"); });
    applyPair("assessmentConfidencePair", decision.assessmentConfidencePairChoice, (sourceMove) => { finalMove.assessmentConfidence = sourceMove.assessmentConfidence; });

    for (const fieldDecision of decision.scoringFieldChoices) {
      const { fieldKey, choice } = fieldDecision;
      const source = selectedSource({ choice, mapping: mapping.scoringFields[fieldKey], packetPair: packetMove.candidates.scoringFields[fieldKey], originalPair: dispute.candidates.scoringFields[fieldKey], label: `${moveId}.scoringFields.${fieldKey}` });
      const sourceMove = selectedMove(source, moveA, moveB);
      if (RATING_KEYS.has(fieldKey)) {
        finalMove.ratings[fieldKey] = clone(sourceMove.ratings[fieldKey]);
        own(moveId, fieldKey);
        if (fieldKey === "relevanceBurden") finalMove.burdenContact = clone(sourceMove.burdenContact);
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
    assertV4(finalMove && moveA && moveB, `${merge.moveId}: rounded-mean move missing`);
    assertV4(scalarValue(moveA, merge.fieldKey) === merge.candidate1 && scalarValue(moveB, merge.fieldKey) === merge.candidate2, `${merge.moveId}.${merge.fieldKey}: rounded-mean inputs changed`);
    if (ownedScalars.get(merge.moveId)?.has(merge.fieldKey)) {
      dependencyMeanMergesSuppressed.push({ moveId: merge.moveId, fieldKey: merge.fieldKey, rule: "adjudicated dependency selection takes precedence" });
      continue;
    }
    const rationale = meanRationale(merge.fieldKey, merge.candidate1, merge.candidate2);
    if (merge.fieldKey === "responsivenessWithinClass") finalMove.response.responsivenessWithinClass = { value: merge.roundedMeanAfterAdjudication, rationale };
    else finalMove.ratings[merge.fieldKey] = { value: merge.roundedMeanAfterAdjudication, rationale };
    meanMerges.push(clone(merge));
  }

  const burdenAdjustmentSelections = [];
  for (const decision of adjudicationOutput.burdenAdjustmentDecisions) {
    const packetDispute = adjudicationPacket.burdenAdjustmentDisputes.find((item) => item.side === decision.side);
    const originalDispute = disagreements.burdenAdjustmentDisputes.find((item) => item.side === decision.side);
    const mapping = provenance.mappings.burdenAdjustments[decision.side];
    assertV4(packetDispute && originalDispute && mapping, `${decision.side}: adjustment input missing`);
    const source = selectedSource({ choice: decision.choice, mapping, packetPair: packetDispute.candidates, originalPair: originalDispute, label: `burdenAdjustment.${decision.side}` });
    finalJudgment.burdenCompletionAdjustment[decision.side] = clone((source === "passA" ? primaryA : primaryB).burdenCompletionAdjustment[decision.side]);
    burdenAdjustmentSelections.push({ side: decision.side, choice: decision.choice, source });
  }

  const validation = validateV4220PrimaryOutput(finalJudgment, sourcePacket, input.eventsDocument, input.eventsFileBytes, input.sourceLedgerBytes);
  assertV4(!containsProhibitedCalculatedField(finalJudgment), `${primaryA.debateNumber}: final raw judgment contains a prohibited calculated field`);
  return {
    debateNumber: primaryA.debateNumber,
    debateId: primaryA.debateId,
    finalJudgment,
    mergeAudit: { validation, disputedMoves: disagreements.moveDisputes.length, pairSelections, scoringFieldSelections, burdenAdjustmentSelections, meanMerges, dependencyMeanMergesSuppressed, audioVerifiedMoves, unchangedEqualSemanticFieldsUsePassARationale: true, adjudicationRationalesRemainSourceAuditOnly: true, calculatedScores: 0 }
  };
}

export function buildV42211729FinalLedger(debateInputs, sourceHashes) {
  assertV4(Array.isArray(debateInputs) && debateInputs.length === 5, "five debate inputs required");
  const debates = debateInputs.map(compileV42211729Debate);
  assertV4(debates.map((debate) => debate.debateNumber).join(",") === EXPECTED_DEBATES.join(","), "hard-route final-ledger debate order invalid");
  const aggregate = debates.reduce((totals, debate) => {
    totals.disputedMoves += debate.mergeAudit.disputedMoves;
    totals.pairSelections += debate.mergeAudit.pairSelections.length;
    totals.scoringFieldSelections += debate.mergeAudit.scoringFieldSelections.length;
    totals.burdenAdjustmentSelections += debate.mergeAudit.burdenAdjustmentSelections.length;
    totals.meanMerges += debate.mergeAudit.meanMerges.length;
    totals.dependencyMeanMergesSuppressed += debate.mergeAudit.dependencyMeanMergesSuppressed.length;
    totals.audioVerifiedMoves += debate.mergeAudit.audioVerifiedMoves;
    return totals;
  }, { disputedMoves: 0, pairSelections: 0, scoringFieldSelections: 0, burdenAdjustmentSelections: 0, meanMerges: 0, dependencyMeanMergesSuppressed: 0, audioVerifiedMoves: 0 });
  const candidateSelections = aggregate.pairSelections + aggregate.scoringFieldSelections + aggregate.burdenAdjustmentSelections;
  assertV4(aggregate.disputedMoves === 94, "hard-route disputed-move population mismatch");
  assertV4(candidateSelections === 271, "hard-route candidate-selection population mismatch");
  assertV4(aggregate.meanMerges + aggregate.dependencyMeanMergesSuppressed === 287, "hard-route rounded-mean population mismatch");
  assertV4(aggregate.audioVerifiedMoves === 3, "hard-route audio-verification population mismatch");
  return {
    schemaVersion: V42211729_LEDGER_VERSION,
    protocolId: V42211729_PROTOCOL_ID,
    status: "passed-hard-route-deterministic-final-ledger-assembly",
    calibrationOnly: true,
    AIOnly: true,
    scoringInputSchema: "v4.2.20-source-span-primary-with-v4.2.21.17.29-hard-route-adjudicated-provenance",
    sources: clone(sourceHashes),
    debates,
    audit: { ...aggregate, candidateSelections, finalRawJudgments: debates.length, deterministicDisagreementReplay: true, anonymizedCandidateProvenanceReplay: true, adjudicationSelectionReplay: true, verifiedAudioEvidenceReplay: true, fullSourceChainValidation: true, singleScoringPassSchema: true, scoresDerivedOnlyAfterAdjudicatedLedgerLock: true, calculatedScores: 0 },
    authorization: { scoreDerivation: true, scorePassesMaximum: 1, publicationFinalization: false, productionMutation: false, all195Debates: false }
  };
}

export function validateV42211729FinalLedger(ledger, debateInputs, sourceHashes) {
  const expected = buildV42211729FinalLedger(debateInputs, sourceHashes);
  assertV4(canonicalJson(ledger) === canonicalJson(expected), "hard-route final ledger differs from deterministic replay");
  assertV4(!containsProhibitedCalculatedField(ledger.debates.map((debate) => debate.finalJudgment)), "hard-route final ledger contains a prohibited calculated field");
  return { status: "passed", debates: ledger.debates.length, disputedMoves: ledger.audit.disputedMoves, candidateSelections: ledger.audit.candidateSelections, roundedMeanMerges: ledger.audit.meanMerges, dependencyMeanMergesSuppressed: ledger.audit.dependencyMeanMergesSuppressed, audioVerifiedMoves: ledger.audit.audioVerifiedMoves, calculatedScores: 0, scoreDerivationAuthorized: ledger.authorization.scoreDerivation };
}

export async function loadV42211729FinalLedgerInputs() {
  const adjudicationRoot = "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication";
  const judgmentRoot = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
  const analysisPath = `${adjudicationRoot}/analysis.json`;
  const preparationPath = `${adjudicationRoot}/preparation-manifest.json`;
  const executionPath = `${adjudicationRoot}/model-execution.json`;
  const audioAnalysisPath = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/analysis.json";
  const audioAuditPath = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/audio-verification.json";
  const [analysis, preparation, execution, audioAnalysis, audioAudit] = await Promise.all([analysisPath, preparationPath, executionPath, audioAnalysisPath, audioAuditPath].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
  assertV4(analysis.status === "hard-route-dispute-only-adjudication-gate-passed" && analysis.authorization.finalLedgerAssembly && !analysis.authorization.scoreDerivation, "hard-route final-ledger assembly is not authorized");
  assertV4(execution.status === "five-isolated-hard-route-dispute-only-adjudication-contexts-passed" && execution.validContexts === 5 && execution.retries === 0 && execution.scoresDerived === 0, "accepted hard-route adjudication execution unavailable");
  assertV4(audioAnalysis.status === "passed-all-three-hard-route-confidence-moves-audio-verified" && audioAudit.totals.verified === 3 && audioAudit.totals.unresolved === 0, "required hard-route audio verification unavailable");
  const sourcePaths = [analysisPath, preparationPath, executionPath, audioAnalysisPath, audioAuditPath];
  const debateInputs = [];
  for (const context of preparation.contexts) {
    const paths = {
      primaryA: `${judgmentRoot}/raw-outputs/pass-a/debate-${context.debateNumber}.json`,
      primaryB: `${judgmentRoot}/raw-outputs/pass-b/debate-${context.debateNumber}.json`,
      lockedInventory: context.lockedInventory,
      sourcePacket: context.sourcePacket,
      disagreements: context.disputeSource,
      adjudicationPacket: context.packet,
      provenance: context.provenance,
      adjudicationOutput: context.output
    };
    const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, JSON.parse(await readFile(path.resolve(file), "utf8"))])));
    const eventsPath = loaded.sourcePacket.sourceChain.eventsPath;
    const transcriptPath = loaded.sourcePacket.sourceChain.transcriptPath;
    const localManifestPath = loaded.sourcePacket.sourceChain.localManifestPath;
    const sourceLedgerPath = loaded.sourcePacket.transportChain.sourceLedgerPath;
    const [eventsFileBytes, sourceLedgerBytes, transcriptBytes, localManifestBytes] = await Promise.all([eventsPath, sourceLedgerPath, transcriptPath, localManifestPath].map((file) => readFile(path.resolve(file))));
    assertV4(sha256(eventsFileBytes) === loaded.sourcePacket.sourceChain.eventsSha256, `${context.debateNumber}: events hash mismatch`);
    assertV4(sha256(transcriptBytes) === loaded.sourcePacket.sourceChain.transcriptSha256, `${context.debateNumber}: transcript hash mismatch`);
    assertV4(sha256(localManifestBytes) === loaded.sourcePacket.sourceChain.localManifestSha256, `${context.debateNumber}: local transcript manifest hash mismatch`);
    assertV4(sha256(sourceLedgerBytes) === loaded.sourcePacket.transportChain.sourceLedgerSha256, `${context.debateNumber}: source ledger hash mismatch`);
    const audioTranscriptPaths = context.audioTranscriptInputs.map((item) => item.sourcePath);
    sourcePaths.push(...Object.values(paths), eventsPath, transcriptPath, localManifestPath, sourceLedgerPath, ...audioTranscriptPaths);
    debateInputs.push({ ...loaded, eventsDocument: JSON.parse(eventsFileBytes), eventsFileBytes, sourceLedgerBytes, audioAudit });
  }
  assertV4(debateInputs.map((input) => input.primaryA.debateNumber).join(",") === EXPECTED_DEBATES.join(","), "loaded hard-route debate order invalid");
  const uniqueSourcePaths = [...new Set(sourcePaths)].sort();
  const sourceHashes = {};
  for (const file of uniqueSourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  return { debateInputs, sourceHashes, sourcePaths: uniqueSourcePaths };
}
