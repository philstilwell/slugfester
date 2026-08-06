import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField
} from "./v4-lean-production.mjs";
import {
  makeV4220PrimarySchema,
  validateV4220PrimaryOutput
} from "./v4220-source-span-rendering.mjs";
import {
  V4221_PROTOCOL_ID,
  buildV4221AdjudicationPacket,
  extractV4221Disagreements,
  reconstructV4221PassB,
  validateV4221AdjudicationOutput,
  validateV4221PassBOutput
} from "./v4221-pass-b-consensus.mjs";
import {
  reconstructV42211PassB,
  validateV42211PassBOutput
} from "./v42211-charity-closure.mjs";

export const V42215_FINAL_LEDGER_VERSION = "4.2.21.5-adjudicated-raw-ledger";
export const V42215_FINAL_LEDGER_ROOT = "docs/calibration/v4.2.21.5/final-ledger";

const EXPECTED_DEBATES = Object.freeze(["27", "188", "195"]);
const RATING_KEYS = new Set([
  "logicalCoherence",
  "evidenceWarrant",
  "relevanceBurden",
  "representationalCharity"
]);
const clone = (value) => structuredClone(value);
const candidateKey = (choice) => `candidate${choice}`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(
    canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()),
    `${label}: keys mismatch`
  );
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
  return `The adjudicated raw ledger applies the preregistered rounded mean to the two nondisputed ${fieldKey} values (${candidate1} and ${candidate2}); their difference did not meet any semantic or magnitude dispute trigger.`;
}

function assertProvenancePair(mapping, label) {
  exactKeys(mapping, ["candidate1", "candidate2"], label);
  assertV4(
    [mapping.candidate1, mapping.candidate2].sort().join(",") === "passA,passB",
    `${label}: candidates must map one-to-one to passA and passB`
  );
}

function selectedSource({ choice, mapping, packetPair, originalPair, label }) {
  assertV4(choice === 1 || choice === 2, `${label}: choice must be one or two`);
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

function selectedMove(source, primaryMove, passBMove) {
  return source === "passA" ? primaryMove : passBMove;
}

function audioMap(audioAudit) {
  return new Map(
    audioAudit.debates.flatMap((debate) => debate.moves.map((move) => [move.moveId, move]))
  );
}

function validateInputReplay(input) {
  const {
    primary,
    passBOutput,
    passBPacket,
    sourcePacket,
    eventsDocument,
    eventsFileBytes,
    sourceLedgerBytes,
    disagreements,
    adjudicationPacket,
    provenance,
    adjudicationOutput,
    audioAudit
  } = input;

  validateV4220PrimaryOutput(primary, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes);
  const isCharityClosure = passBOutput.schemaVersion === "4.2.21.1-charity-closed-pass-b-output";
  if (isCharityClosure) {
    validateV42211PassBOutput(
      passBOutput,
      passBPacket,
      sourcePacket,
      eventsDocument,
      eventsFileBytes,
      sourceLedgerBytes
    );
  } else {
    validateV4221PassBOutput(
      passBOutput,
      passBPacket,
      sourcePacket,
      eventsDocument,
      eventsFileBytes,
      sourceLedgerBytes
    );
  }

  const reconstructedPassB = isCharityClosure
    ? reconstructV42211PassB(passBPacket, passBOutput)
    : reconstructV4221PassB(passBPacket, passBOutput);
  const replayedDisagreements = extractV4221Disagreements(primary, reconstructedPassB);
  assertV4(
    canonicalJson(replayedDisagreements) === canonicalJson(disagreements),
    `${primary.debateNumber}: stored disagreements differ from deterministic replay`
  );

  const rebuiltAdjudication = buildV4221AdjudicationPacket(
    replayedDisagreements,
    passBPacket,
    eventsDocument,
    audioMap(audioAudit)
  );
  assertV4(
    canonicalJson(rebuiltAdjudication.packet) === canonicalJson(adjudicationPacket),
    `${primary.debateNumber}: adjudication packet differs from deterministic replay`
  );
  assertV4(provenance.modelInput === false, `${primary.debateNumber}: provenance must not be model input`);
  assertV4(
    canonicalJson(rebuiltAdjudication.provenance) === canonicalJson(provenance.mappings),
    `${primary.debateNumber}: adjudication provenance differs from deterministic replay`
  );
  validateV4221AdjudicationOutput(adjudicationOutput, adjudicationPacket);

  return { reconstructedPassB, replayedDisagreements };
}

export function compileV42215Debate(input) {
  const { primary, adjudicationPacket, provenance, adjudicationOutput, sourcePacket } = input;
  const { reconstructedPassB, replayedDisagreements: disagreements } = validateInputReplay(input);
  const finalJudgment = clone(primary);
  const finalById = moveMap(finalJudgment);
  const primaryById = moveMap(primary);
  const passBById = moveMap(reconstructedPassB);
  const packetById = new Map(adjudicationPacket.disputedMoves.map((move) => [move.moveId, move]));
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
    const primaryMove = primaryById.get(moveId);
    const passBMove = passBById.get(moveId);
    const dispute = disputeById.get(moveId);
    const decision = decisionById.get(moveId);
    const mapping = provenance.mappings.moves[moveId];
    assertV4(
      finalMove && primaryMove && passBMove && dispute && decision && mapping,
      `${moveId}: final-ledger compiler input missing`
    );

    if (dispute.triggers.audioVerificationRequired) {
      assertV4(
        packetMove.evidence.audioVerification?.status === "verified" &&
          packetMove.evidence.audioVerification.expectedSpeaker === packetMove.speaker,
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
        label: `${moveId}.${pairKey}`
      });
      const sourceMove = selectedMove(source, primaryMove, passBMove);
      apply(sourceMove);
      pairSelections.push({ moveId, pairKey, choice, source });
    };

    applyPair("attributionPair", decision.attributionPairChoice, (sourceMove) => {
      finalMove.attributionConfidence = sourceMove.attributionConfidence;
      finalMove.attributionBasis = sourceMove.attributionBasis;
    });
    applyPair("responsePair", decision.responsePairChoice, (sourceMove) => {
      finalMove.response = clone(sourceMove.response);
      own(moveId, "responsivenessWithinClass");
    });
    applyPair("charityPair", decision.charityPairChoice, (sourceMove) => {
      finalMove.charity = clone(sourceMove.charity);
      finalMove.ratings.representationalCharity = clone(sourceMove.ratings.representationalCharity);
      own(moveId, "representationalCharity");
    });
    applyPair("assessmentConfidencePair", decision.assessmentConfidencePairChoice, (sourceMove) => {
      finalMove.assessmentConfidence = sourceMove.assessmentConfidence;
    });

    for (const fieldDecision of decision.scoringFieldChoices) {
      const { fieldKey, choice } = fieldDecision;
      const source = selectedSource({
        choice,
        mapping: mapping.scoringFields[fieldKey],
        packetPair: packetMove.candidates.scoringFields[fieldKey],
        originalPair: dispute.candidates.scoringFields[fieldKey],
        label: `${moveId}.scoringFields.${fieldKey}`
      });
      const sourceMove = selectedMove(source, primaryMove, passBMove);
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
    const primaryMove = primaryById.get(merge.moveId);
    const passBMove = passBById.get(merge.moveId);
    assertV4(finalMove && primaryMove && passBMove, `${merge.moveId}: rounded-mean move missing`);
    assertV4(
      scalarValue(primaryMove, merge.fieldKey) === merge.candidate1 &&
        scalarValue(passBMove, merge.fieldKey) === merge.candidate2,
      `${merge.moveId}.${merge.fieldKey}: rounded-mean inputs changed`
    );
    if (ownedScalars.get(merge.moveId)?.has(merge.fieldKey)) {
      dependencyMeanMergesSuppressed.push({
        moveId: merge.moveId,
        fieldKey: merge.fieldKey,
        rule: "adjudicated dependency selection takes precedence"
      });
      continue;
    }
    const rationale = meanRationale(merge.fieldKey, merge.candidate1, merge.candidate2);
    if (merge.fieldKey === "responsivenessWithinClass") {
      finalMove.response.responsivenessWithinClass = {
        value: merge.roundedMeanAfterAdjudication,
        rationale
      };
    } else {
      finalMove.ratings[merge.fieldKey] = {
        value: merge.roundedMeanAfterAdjudication,
        rationale
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
    assertV4(packetDispute && originalDispute && mapping, `${decision.side}: adjustment input missing`);
    const source = selectedSource({
      choice: decision.choice,
      mapping,
      packetPair: packetDispute.candidates,
      originalPair: originalDispute,
      label: `burdenAdjustment.${decision.side}`
    });
    finalJudgment.burdenCompletionAdjustment[decision.side] = clone(
      source === "passA"
        ? primary.burdenCompletionAdjustment[decision.side]
        : reconstructedPassB.burdenCompletionAdjustment[decision.side]
    );
    burdenAdjustmentSelections.push({ side: decision.side, choice: decision.choice, source });
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
    `${primary.debateNumber}: final raw judgment contains a prohibited calculated field`
  );

  return {
    debateNumber: primary.debateNumber,
    debateId: primary.debateId,
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
      calculatedScores: 0
    }
  };
}

export function makeV42215FinalLedgerSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v42215-adjudicated-raw-ledger",
    title: "Slugfester v4.2.21.5 adjudicated single scoring-input ledger",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "status",
      "calibrationOnly",
      "AIOnly",
      "scoringInputSchema",
      "sources",
      "debates",
      "audit",
      "authorization"
    ],
    properties: {
      schemaVersion: { type: "string", const: V42215_FINAL_LEDGER_VERSION },
      protocolId: { type: "string", const: V4221_PROTOCOL_ID },
      status: { type: "string", const: "passed-deterministic-final-ledger-assembly" },
      calibrationOnly: { type: "boolean", const: true },
      AIOnly: { type: "boolean", const: true },
      scoringInputSchema: {
        type: "string",
        const: "v4.2.20-source-span-primary-with-v4.2.21.5-adjudicated-provenance"
      },
      sources: { type: "object" },
      debates: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["debateNumber", "debateId", "finalJudgment", "mergeAudit"],
          properties: {
            debateNumber: { type: "string", enum: EXPECTED_DEBATES },
            debateId: { type: "string", minLength: 1 },
            finalJudgment: makeV4220PrimarySchema(),
            mergeAudit: { type: "object" }
          }
        }
      },
      audit: { type: "object" },
      authorization: { type: "object" }
    }
  };
}

export function buildV42215FinalLedger(debateInputs, sourceHashes) {
  assertV4(Array.isArray(debateInputs) && debateInputs.length === 3, "three debate inputs required");
  const debates = debateInputs.map(compileV42215Debate);
  assertV4(
    debates.map((debate) => debate.debateNumber).join(",") === EXPECTED_DEBATES.join(","),
    "v4.2.21.5 debate order invalid"
  );
  const aggregate = debates.reduce(
    (totals, debate) => {
      totals.disputedMoves += debate.mergeAudit.disputedMoves;
      totals.pairSelections += debate.mergeAudit.pairSelections.length;
      totals.scoringFieldSelections += debate.mergeAudit.scoringFieldSelections.length;
      totals.burdenAdjustmentSelections += debate.mergeAudit.burdenAdjustmentSelections.length;
      totals.meanMerges += debate.mergeAudit.meanMerges.length;
      totals.dependencyMeanMergesSuppressed += debate.mergeAudit.dependencyMeanMergesSuppressed.length;
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
      audioVerifiedMoves: 0
    }
  );
  const candidateSelections =
    aggregate.pairSelections +
    aggregate.scoringFieldSelections +
    aggregate.burdenAdjustmentSelections;
  assertV4(aggregate.disputedMoves === 34, "v4.2.21.5 disputed-move population mismatch");
  assertV4(candidateSelections === 160, "v4.2.21.5 candidate-selection population mismatch");
  assertV4(
    aggregate.meanMerges + aggregate.dependencyMeanMergesSuppressed === 64,
    "v4.2.21.5 rounded-mean population mismatch"
  );
  assertV4(aggregate.audioVerifiedMoves === 5, "v4.2.21.5 audio-verification population mismatch");
  return {
    schemaVersion: V42215_FINAL_LEDGER_VERSION,
    protocolId: V4221_PROTOCOL_ID,
    status: "passed-deterministic-final-ledger-assembly",
    calibrationOnly: true,
    AIOnly: true,
    scoringInputSchema: "v4.2.20-source-span-primary-with-v4.2.21.5-adjudicated-provenance",
    sources: clone(sourceHashes),
    debates,
    audit: {
      ...aggregate,
      candidateSelections,
      finalRawJudgments: debates.length,
      deterministicDisagreementReplay: true,
      anonymizedCandidateProvenanceReplay: true,
      fullSourceChainValidation: true,
      singleScoringPassSchema: true,
      scoresDerivedOnlyAfterAdjudicatedLedgerLock: true,
      calculatedScores: 0
    },
    authorization: {
      scoreDerivation: true,
      scorePassesMaximum: 1,
      publicationFinalization: false,
      productionMutation: false,
      heldOutGate: false,
      all195Debates: false
    }
  };
}

export function validateV42215FinalLedger(ledger, debateInputs, sourceHashes) {
  const expected = buildV42215FinalLedger(debateInputs, sourceHashes);
  assertV4(
    canonicalJson(ledger) === canonicalJson(expected),
    "v4.2.21.5 final ledger differs from deterministic replay"
  );
  assertV4(
    !containsProhibitedCalculatedField(ledger.debates.map((debate) => debate.finalJudgment)),
    "v4.2.21.5 final ledger contains a prohibited calculated field"
  );
  return {
    status: "passed",
    debates: ledger.debates.length,
    disputedMoves: ledger.audit.disputedMoves,
    candidateSelections: ledger.audit.candidateSelections,
    roundedMeanMerges: ledger.audit.meanMerges,
    dependencyMeanMergesSuppressed: ledger.audit.dependencyMeanMergesSuppressed,
    audioVerifiedMoves: ledger.audit.audioVerifiedMoves,
    calculatedScores: 0,
    scoreDerivationAuthorized: ledger.authorization.scoreDerivation
  };
}

export function hashV42215Source(value) {
  return sha256(value);
}

export async function loadV42215FinalLedgerInputs() {
  const adjudicationRoot = "docs/calibration/v4.2.21.4/adjudication";
  const analysisPath = `${adjudicationRoot}/analysis.json`;
  const preparationPath = `${adjudicationRoot}/preparation-manifest.json`;
  const executionPath = `${adjudicationRoot}/model-execution.json`;
  const audioAnalysisPath = "docs/calibration/v4.2.21.3.1/audio-recovery/analysis.json";
  const audioAuditPath = "docs/calibration/v4.2.21.3.1/audio-recovery/audio-verification.json";
  const [analysis, preparation, execution, audioAnalysis, audioAudit] = await Promise.all(
    [analysisPath, preparationPath, executionPath, audioAnalysisPath, audioAuditPath].map((file) =>
      readFile(path.resolve(file), "utf8").then(JSON.parse)
    )
  );
  assertV4(
    analysis.status === "dispute-only-adjudication-gate-passed" &&
      analysis.authorization.finalLedgerAssembly &&
      !analysis.authorization.scoreDerivation,
    "v4.2.21.5 final-ledger assembly is not authorized"
  );
  assertV4(
    execution.status === "three-dispute-only-adjudication-contexts-passed" &&
      execution.validContexts === 3 &&
      execution.retries === 0,
    "v4.2.21.5 accepted adjudication execution unavailable"
  );
  assertV4(
    audioAnalysis.status === "passed-all-five-medium-attribution-moves-audio-verified" &&
      audioAudit.totals.verified === 5 &&
      audioAudit.totals.unresolved === 0,
    "v4.2.21.5 required audio verification unavailable"
  );

  const sourcePaths = [analysisPath, preparationPath, executionPath, audioAnalysisPath, audioAuditPath];
  const debateInputs = [];
  for (const context of preparation.contexts) {
    const primaryPath = `docs/calibration/v4.2.20/source-span-rendering/primary-outputs/debate-${context.debateNumber}.json`;
    const passBOutputPath =
      context.debateNumber === "195"
        ? "docs/calibration/v4.2.21.1/charity-closure/pass-b-output/debate-195.json"
        : `docs/calibration/v4.2.21/pass-b-consensus/pass-b-outputs/debate-${context.debateNumber}.json`;
    const paths = {
      primary: primaryPath,
      passBOutput: passBOutputPath,
      passBPacket: context.lockedPacket,
      sourcePacket: context.sourcePacket,
      disagreements: context.disputeSource,
      adjudicationPacket: context.packet,
      provenance: context.provenance,
      adjudicationOutput: context.output
    };
    const loaded = Object.fromEntries(
      await Promise.all(
        Object.entries(paths).map(async ([key, file]) => [
          key,
          JSON.parse(await readFile(path.resolve(file), "utf8"))
        ])
      )
    );
    const eventsPath = loaded.sourcePacket.sourceChain.eventsPath;
    const sourceLedgerPath = loaded.sourcePacket.transportChain.sourceLedgerPath;
    const [eventsFileBytes, sourceLedgerBytes] = await Promise.all([
      readFile(path.resolve(eventsPath)),
      readFile(path.resolve(sourceLedgerPath))
    ]);
    sourcePaths.push(...Object.values(paths), eventsPath, sourceLedgerPath);
    debateInputs.push({
      ...loaded,
      eventsDocument: JSON.parse(eventsFileBytes),
      eventsFileBytes,
      sourceLedgerBytes,
      audioAudit
    });
  }
  assertV4(
    debateInputs.map((input) => input.primary.debateNumber).join(",") === EXPECTED_DEBATES.join(","),
    "v4.2.21.5 loaded debate order invalid"
  );
  const uniqueSourcePaths = [...new Set(sourcePaths)].sort();
  const sourceHashes = {};
  for (const file of uniqueSourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
  return { debateInputs, sourceHashes, sourcePaths: uniqueSourcePaths };
}
