import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V4_MODEL_RATING_KEYS } from "./v4-lean-production.mjs";
import { assertV4, canonicalJson, containsProhibitedCalculatedField, makeV41PrimarySchema, readJson, validateV41PrimaryOutput } from "./v41-lean-production.mjs";
import { v416ScoringFields } from "./v416-disagreement.mjs";
import { validateV416AdjudicationOutput } from "./v416-adjudication.mjs";

export const V416_FINAL_LEDGER_VERSION = "4.1.6-adjudicated-final-ledger";
export const V416_FINAL_LEDGER_PROTOCOL_ID = "v4.1.6-triggered-pass-b-consensus";
export const V416_FINAL_LEDGER_ROOT = "docs/calibration/v4.1.6/lean-retired-gate/pass-b/adjudication";

const clone = (value) => structuredClone(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const candidateKey = (choice) => `candidate${choice}`;

function mutableMoves(finalJudgment) {
  return new Map(finalJudgment.sections.flatMap((section) => [
    ...section.proMoves.map((move) => [move.moveId, move]),
    ...section.conMoves.map((move) => [move.moveId, move])
  ]));
}

function sourceMoves(primary, passB) {
  const primaryById = new Map(primary.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).map((move) => [move.moveId, move]));
  const passBById = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  return { primaryById, passBById };
}

function selectedMove(choice, moveA, moveB) {
  assertV4(choice === 1 || choice === 2, "candidate choice must be one or two");
  return choice === 1 ? moveA : moveB;
}

function meanRationale(key, candidate1, candidate2) {
  return `The adjudicated ledger applies the preregistered rounded mean to the two nondisputed ${key} ratings (${candidate1} and ${candidate2}), whose difference remained below every dispute trigger.`;
}

export function makeV416FinalLedgerSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v416-adjudicated-final-ledger",
    title: "Slugfester v4.1.6 single scoring-input ledger",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "status", "scoringInputSchema", "sources", "debates", "audit", "authorization"],
    properties: {
      schemaVersion: { type: "string", const: V416_FINAL_LEDGER_VERSION },
      protocolId: { type: "string", const: V416_FINAL_LEDGER_PROTOCOL_ID },
      status: { type: "string", const: "passed-final-ledger-assembly" },
      scoringInputSchema: { type: "string", const: "v4.1.5-bounded-primary-output-with-v4.1.6-adjudicated-provenance" },
      sources: { type: "object" },
      debates: {
        type: "array", minItems: 3, maxItems: 3,
        items: {
          type: "object", additionalProperties: false,
          required: ["debateNumber", "debateId", "finalJudgment", "mergeAudit"],
          properties: { debateNumber: { type: "string", enum: ["55", "103", "161"] }, debateId: { type: "string" }, finalJudgment: makeV41PrimarySchema(), mergeAudit: { type: "object" } }
        }
      },
      audit: { type: "object" },
      authorization: { type: "object" }
    }
  };
}

export function compileV416Debate({ primary, passB, disagreements, adjudicationPacket, adjudicationOutput, sourcePacket }) {
  validateV416AdjudicationOutput(adjudicationOutput, adjudicationPacket);
  assertV4(primary.debateNumber === passB.debateNumber && primary.debateNumber === disagreements.debateNumber && primary.debateNumber === adjudicationOutput.debateNumber, "compiler debate identity mismatch");
  const finalJudgment = clone(primary);
  const finalById = mutableMoves(finalJudgment);
  const { primaryById, passBById } = sourceMoves(primary, passB);
  const decisionById = new Map(adjudicationOutput.moveDecisions.map((item) => [item.moveId, item]));
  const packetById = new Map(adjudicationPacket.disputedMoves.map((item) => [item.moveId, item]));
  const compoundSelections = [];
  const scoringFieldSelections = [];
  const meanMerges = [];
  const dependencyMeanMergesSuppressed = [];
  const ownedRatings = new Map();
  const own = (moveId, ratingKey) => {
    ownedRatings.get(moveId)?.add(ratingKey) ?? ownedRatings.set(moveId, new Set([ratingKey]));
  };

  for (const dispute of disagreements.moveDisputes) {
    const finalMove = finalById.get(dispute.moveId);
    const moveA = primaryById.get(dispute.moveId);
    const moveB = passBById.get(dispute.moveId);
    const decision = decisionById.get(dispute.moveId);
    const packetMove = packetById.get(dispute.moveId);
    assertV4(finalMove && moveA && moveB && decision && packetMove, `${dispute.moveId}: compiler input missing`);
    if (decision.responsePairChoice !== null) {
      const selected = selectedMove(decision.responsePairChoice, moveA, moveB);
      const supplied = packetMove.candidates.responsePair[candidateKey(decision.responsePairChoice)];
      assertV4(supplied.responsiveness === selected.ratings.responsiveness.value, `${dispute.moveId}: responsiveness candidate mapping invalid`);
      finalMove.response = clone(selected.response);
      finalMove.ratings.responsiveness = clone(selected.ratings.responsiveness);
      own(dispute.moveId, "responsiveness");
      compoundSelections.push({ moveId: dispute.moveId, compound: "response-and-responsiveness", choice: decision.responsePairChoice });
    }
    if (decision.charityPairChoice !== null) {
      const selected = selectedMove(decision.charityPairChoice, moveA, moveB);
      const supplied = packetMove.candidates.charityPair[candidateKey(decision.charityPairChoice)];
      assertV4(canonicalJson(supplied.charity) === canonicalJson(selected.charity) && supplied.representationalCharity === selected.ratings.representationalCharity.value, `${dispute.moveId}: charity candidate mapping invalid`);
      finalMove.charity = clone(selected.charity);
      finalMove.ratings.representationalCharity = clone(selected.ratings.representationalCharity);
      own(dispute.moveId, "representationalCharity");
      compoundSelections.push({ moveId: dispute.moveId, compound: "charity-and-representational-charity", choice: decision.charityPairChoice });
    }
    for (const fieldDecision of decision.scoringFieldChoices) {
      const { fieldKey, choice } = fieldDecision;
      const selected = selectedMove(choice, moveA, moveB);
      const supplied = packetMove.candidates.scoringFields[fieldKey][candidateKey(choice)];
      const selectedFields = v416ScoringFields(selected);
      assertV4(supplied.value === selectedFields[fieldKey], `${dispute.moveId}.${fieldKey}: candidate value mapping invalid`);
      if (V4_MODEL_RATING_KEYS.includes(fieldKey)) {
        finalMove.ratings[fieldKey] = clone(selected.ratings[fieldKey]);
        own(dispute.moveId, fieldKey);
        if (fieldKey === "relevanceBurden") {
          assertV4(canonicalJson(supplied.burdenContact) === canonicalJson(selected.burdenContact), `${dispute.moveId}: burden-contact candidate mapping invalid`);
          finalMove.burdenContact = clone(selected.burdenContact);
        }
      } else if (fieldKey === "precisionClarity") {
        finalMove.precisionFindings = clone(selected.precisionFindings);
      } else if (fieldKey === "epistemicCalibration") {
        finalMove.calibrationFindings = clone(selected.calibrationFindings);
      } else {
        throw new Error(`${dispute.moveId}: unknown scoring field ${fieldKey}`);
      }
      scoringFieldSelections.push({ moveId: dispute.moveId, fieldKey, choice });
    }
  }

  for (const merge of disagreements.nondisputedScalarMerges) {
    const finalMove = finalById.get(merge.moveId);
    const moveA = primaryById.get(merge.moveId);
    const moveB = passBById.get(merge.moveId);
    assertV4(finalMove && moveA && moveB, `${merge.moveId}: mean-merge move missing`);
    assertV4(moveA.ratings[merge.ratingKey].value === merge.candidate1 && moveB.ratings[merge.ratingKey].value === merge.candidate2, `${merge.moveId}.${merge.ratingKey}: mean candidates changed`);
    if (ownedRatings.get(merge.moveId)?.has(merge.ratingKey)) {
      dependencyMeanMergesSuppressed.push({ moveId: merge.moveId, ratingKey: merge.ratingKey, rule: "adjudicated compound-or-field selection takes precedence" });
      continue;
    }
    finalMove.ratings[merge.ratingKey] = { value: merge.roundedMeanAfterAdjudication, rationale: meanRationale(merge.ratingKey, merge.candidate1, merge.candidate2) };
    meanMerges.push(clone(merge));
  }

  const burdenAdjustmentSelections = [];
  for (const decision of adjudicationOutput.burdenAdjustmentDecisions) {
    const selected = decision.choice === 1 ? primary.burdenCompletionAdjustment[decision.side] : passB.burdenCompletionAdjustment[decision.side];
    const packetDecision = adjudicationPacket.burdenAdjustmentDisputes.find((item) => item.side === decision.side);
    const supplied = packetDecision?.candidates[candidateKey(decision.choice)];
    assertV4(supplied && supplied.value === selected.value && canonicalJson(supplied.eligibility) === canonicalJson(selected.eligibility), `${decision.side}: burden-adjustment candidate mapping invalid`);
    finalJudgment.burdenCompletionAdjustment[decision.side] = clone(selected);
    burdenAdjustmentSelections.push({ side: decision.side, choice: decision.choice });
  }

  const validation = validateV41PrimaryOutput(finalJudgment, sourcePacket);
  assertV4(!containsProhibitedCalculatedField(finalJudgment), `${primary.debateNumber}: final judgment contains calculated score`);
  return {
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
    finalJudgment,
    mergeAudit: {
      validation,
      disputedMoves: disagreements.disputedMoveCount,
      compoundSelections,
      scoringFieldSelections,
      burdenAdjustmentSelections,
      meanMerges,
      dependencyMeanMergesSuppressed,
      calculatedScores: 0
    }
  };
}

export function buildV416FinalLedger(debateInputs, sourceHashes) {
  assertV4(Array.isArray(debateInputs) && debateInputs.length === 3, "three final-ledger debate inputs required");
  const debates = debateInputs.map(compileV416Debate);
  assertV4(debates.map((item) => item.debateNumber).join(",") === "55,103,161", "final-ledger debate order invalid");
  const aggregate = debates.reduce((result, debate) => {
    result.disputedMoves += debate.mergeAudit.disputedMoves;
    result.compoundSelections += debate.mergeAudit.compoundSelections.length;
    result.scoringFieldSelections += debate.mergeAudit.scoringFieldSelections.length;
    result.burdenAdjustmentSelections += debate.mergeAudit.burdenAdjustmentSelections.length;
    result.meanMerges += debate.mergeAudit.meanMerges.length;
    result.dependencyMeanMergesSuppressed += debate.mergeAudit.dependencyMeanMergesSuppressed.length;
    return result;
  }, { disputedMoves: 0, compoundSelections: 0, scoringFieldSelections: 0, burdenAdjustmentSelections: 0, meanMerges: 0, dependencyMeanMergesSuppressed: 0 });
  const candidateSelections = aggregate.compoundSelections + aggregate.scoringFieldSelections + aggregate.burdenAdjustmentSelections;
  assertV4(aggregate.disputedMoves === 34 && candidateSelections === 154, "final-ledger adjudication population mismatch");
  assertV4(aggregate.meanMerges + aggregate.dependencyMeanMergesSuppressed === 39, "final-ledger mean population mismatch");
  return {
    schemaVersion: V416_FINAL_LEDGER_VERSION,
    protocolId: V416_FINAL_LEDGER_PROTOCOL_ID,
    status: "passed-final-ledger-assembly",
    scoringInputSchema: "v4.1.5-bounded-primary-output-with-v4.1.6-adjudicated-provenance",
    sources: { ...sourceHashes },
    debates,
    audit: { ...aggregate, candidateSelections, finalJudgments: debates.length, singleScoringPassSchema: true, scoresDerivedAfterLedgerLockOnly: true, calculatedScores: 0 },
    authorization: { scoreDerivation: true, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
  };
}

export function validateV416FinalLedger(ledger, debateInputs, sourceHashes) {
  const expected = buildV416FinalLedger(debateInputs, sourceHashes);
  assertV4(canonicalJson(ledger) === canonicalJson(expected), "final ledger differs from deterministic replay");
  assertV4(!containsProhibitedCalculatedField(ledger.debates.map((item) => item.finalJudgment)), "final ledger contains prohibited calculated score");
  return { status: "passed", debates: 3, disputedMoves: ledger.audit.disputedMoves, candidateSelections: ledger.audit.candidateSelections, roundedMeanMerges: ledger.audit.meanMerges, dependencyMeanMergesSuppressed: ledger.audit.dependencyMeanMergesSuppressed, calculatedScores: 0, scoreDerivationAuthorized: ledger.authorization.scoreDerivation };
}

export function hashV416Source(value) {
  return sha256(value);
}

export async function loadV416FinalLedgerInputs() {
  const analysisPath = `${V416_FINAL_LEDGER_ROOT}/analysis.json`;
  const disagreementsPath = "docs/calibration/v4.1.6/lean-retired-gate/pass-b/disagreements.json";
  const audioPath = "docs/calibration/v4.1.6/lean-retired-gate/pass-b/audio-verification.json";
  const [analysis, disagreementArtifact] = await Promise.all([readJson(analysisPath), readJson(disagreementsPath)]);
  assertV4(analysis.status === "adjudication-analysis-passed-final-ledger-authorized" && analysis.authorization.finalLedgerAssembly && !analysis.authorization.scoreDerivation, "final-ledger assembly is not authorized");
  assertV4(disagreementArtifact.status === "passed-deterministic-disagreement-extraction", "disagreement artifact unavailable");
  const sourcePaths = [analysisPath, disagreementsPath, audioPath];
  const debateInputs = [];
  for (const disagreements of disagreementArtifact.debates) {
    const adjudicationPacketPath = `${V416_FINAL_LEDGER_ROOT}/packets/debate-${disagreements.debateNumber}.json`;
    const adjudicationOutputPath = `${V416_FINAL_LEDGER_ROOT}/outputs/debate-${disagreements.debateNumber}.json`;
    sourcePaths.push(disagreements.primaryPath, disagreements.passBPath, disagreements.sourcePacketPath, adjudicationPacketPath, adjudicationOutputPath);
    const [primary, passB, sourcePacket, adjudicationPacket, adjudicationOutput] = await Promise.all([
      readJson(disagreements.primaryPath), readJson(disagreements.passBPath), readJson(disagreements.sourcePacketPath), readJson(adjudicationPacketPath), readJson(adjudicationOutputPath)
    ]);
    debateInputs.push({ primary, passB, disagreements, adjudicationPacket, adjudicationOutput, sourcePacket });
  }
  const sourceHashes = {};
  for (const sourcePath of sourcePaths) sourceHashes[sourcePath] = sha256(await readFile(path.resolve(sourcePath)));
  return { debateInputs, sourceHashes, sourcePaths };
}
