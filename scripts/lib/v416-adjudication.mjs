import { V416_SCORING_FIELD_KEYS } from "./v416-disagreement.mjs";
import { assertV4, canonicalJson, containsProhibitedCalculatedField } from "./v41-lean-production.mjs";

export const V416_ADJUDICATION_ROOT = "docs/calibration/v4.1.6/lean-retired-gate/pass-b/adjudication";
export const V416_ADJUDICATION_PROTOCOL_ID = "v4.1.6-triggered-pass-b-consensus";
export const V416_ADJUDICATION_OUTPUT_VERSION = "4.1.6-dispute-only-adjudication-output";
export const V416_ADJUDICATION_PACKET_VERSION = "4.1.6-dispute-only-adjudication-packet";

const choiceOrNull = { anyOf: [{ type: "null" }, { type: "integer", enum: [1, 2] }] };

export function makeV416AdjudicationSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v416-dispute-only-adjudication",
    title: "Slugfester v4.1.6 dispute-only adjudication",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveDecisions", "burdenAdjustmentDecisions", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V416_ADJUDICATION_OUTPUT_VERSION },
      protocolId: { type: "string", const: V416_ADJUDICATION_PROTOCOL_ID },
      debateNumber: { type: "string", enum: ["55", "103", "161", "schema-preflight"] },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", const: "dispute-only-adjudicator" },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      calibrationOnly: { type: "boolean", const: true },
      isolation: {
        type: "object",
        additionalProperties: false,
        required: ["candidateOrderingAnonymous", "passIdentitiesUnavailable", "initialRationalesUnavailable", "nondisputedFieldsUnavailable", "fullInitialOutputsUnavailable", "legacyAssessmentsUnavailable", "calculatedScoresUnavailable", "winnerLabelsUnavailable", "publicationProseUnavailable", "contaminationDetected"],
        properties: {
          candidateOrderingAnonymous: { type: "boolean", const: true },
          passIdentitiesUnavailable: { type: "boolean", const: true },
          initialRationalesUnavailable: { type: "boolean", const: true },
          nondisputedFieldsUnavailable: { type: "boolean", const: true },
          fullInitialOutputsUnavailable: { type: "boolean", const: true },
          legacyAssessmentsUnavailable: { type: "boolean", const: true },
          calculatedScoresUnavailable: { type: "boolean", const: true },
          winnerLabelsUnavailable: { type: "boolean", const: true },
          publicationProseUnavailable: { type: "boolean", const: true },
          contaminationDetected: { type: "boolean", const: false }
        }
      },
      moveDecisions: {
        type: "array",
        minItems: 1,
        maxItems: 24,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["moveId", "responsePairChoice", "charityPairChoice", "scoringFieldChoices", "rationale"],
          properties: {
            moveId: { type: "string", minLength: 1 },
            responsePairChoice: choiceOrNull,
            charityPairChoice: choiceOrNull,
            scoringFieldChoices: {
              type: "array",
              minItems: 0,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["fieldKey", "choice"],
                properties: { fieldKey: { type: "string", enum: V416_SCORING_FIELD_KEYS }, choice: { type: "integer", enum: [1, 2] } }
              }
            },
            rationale: { type: "string", minLength: 40 }
          }
        }
      },
      burdenAdjustmentDecisions: {
        type: "array",
        minItems: 0,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["side", "choice", "rationale"],
          properties: { side: { type: "string", enum: ["pro", "con"] }, choice: { type: "integer", enum: [1, 2] }, rationale: { type: "string", minLength: 40 } }
        }
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["allDisputedMovesDecidedOnce", "onlyCandidateValuesSelected", "dependencyPairsKeptIndivisible", "nondisputedFieldsUntouched", "calculatedScoresAbsent", "publicationProseAbsent"],
        properties: Object.fromEntries(["allDisputedMovesDecidedOnce", "onlyCandidateValuesSelected", "dependencyPairsKeptIndivisible", "nondisputedFieldsUntouched", "calculatedScoresAbsent", "publicationProseAbsent"].map((key) => [key, { type: "boolean", const: true }]))
      }
    }
  };
}

function objectShape(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label}: keys mismatch`);
}

function validateChoice(value, required, label) {
  if (required) assertV4(value === 1 || value === 2, `${label}: candidate 1 or 2 required`);
  else assertV4(value === null, `${label}: nondisputed pair choice must be null`);
}

export function validateV416AdjudicationOutput(output, packet) {
  const schema = makeV416AdjudicationSchema();
  objectShape(output, schema.required, "output");
  assertV4(output.schemaVersion === V416_ADJUDICATION_OUTPUT_VERSION && output.protocolId === V416_ADJUDICATION_PROTOCOL_ID, "adjudication identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "adjudication debate identity mismatch");
  assertV4(output.reviewerRole === "dispute-only-adjudicator" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true, "adjudicator boundary mismatch");
  assertV4(!containsProhibitedCalculatedField(output), "adjudication contains prohibited calculated field");
  objectShape(output.isolation, Object.keys(schema.properties.isolation.properties), "isolation");
  for (const [key, definition] of Object.entries(schema.properties.isolation.properties)) assertV4(output.isolation[key] === definition.const, `isolation.${key} mismatch`);
  assertV4(Array.isArray(output.moveDecisions) && output.moveDecisions.length === packet.disputedMoves.length, "move decision count mismatch");
  assertV4(new Set(output.moveDecisions.map((item) => item.moveId)).size === output.moveDecisions.length, "move decisions must be unique");
  for (let index = 0; index < packet.disputedMoves.length; index += 1) {
    const required = packet.disputedMoves[index];
    const decision = output.moveDecisions[index];
    const label = `moveDecisions[${index}]`;
    objectShape(decision, ["moveId", "responsePairChoice", "charityPairChoice", "scoringFieldChoices", "rationale"], label);
    assertV4(decision.moveId === required.moveId, `${label}: move order mismatch`);
    validateChoice(decision.responsePairChoice, required.candidates.responsePair !== null, `${label}.responsePairChoice`);
    validateChoice(decision.charityPairChoice, required.candidates.charityPair !== null, `${label}.charityPairChoice`);
    const expectedKeys = Object.keys(required.candidates.scoringFields).sort();
    const actualKeys = decision.scoringFieldChoices.map((item) => item.fieldKey).sort();
    assertV4(canonicalJson(actualKeys) === canonicalJson(expectedKeys) && new Set(actualKeys).size === actualKeys.length, `${label}: scoring field choice keys mismatch`);
    for (const item of decision.scoringFieldChoices) {
      objectShape(item, ["fieldKey", "choice"], `${label}.scoringFieldChoices`);
      assertV4(item.choice === 1 || item.choice === 2, `${label}.${item.fieldKey}: invalid choice`);
    }
    assertV4(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `${label}.rationale too short`);
  }
  assertV4(Array.isArray(output.burdenAdjustmentDecisions) && output.burdenAdjustmentDecisions.length === packet.burdenAdjustmentDisputes.length, "burden adjustment decision count mismatch");
  for (let index = 0; index < packet.burdenAdjustmentDisputes.length; index += 1) {
    const required = packet.burdenAdjustmentDisputes[index];
    const decision = output.burdenAdjustmentDecisions[index];
    objectShape(decision, ["side", "choice", "rationale"], `burdenAdjustmentDecisions[${index}]`);
    assertV4(decision.side === required.side && (decision.choice === 1 || decision.choice === 2), `burdenAdjustmentDecisions[${index}] mismatch`);
    assertV4(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `burdenAdjustmentDecisions[${index}].rationale too short`);
  }
  assertV4(new Set(output.burdenAdjustmentDecisions.map((item) => item.side)).size === output.burdenAdjustmentDecisions.length, "burden decisions must be unique");
  objectShape(output.audit, Object.keys(schema.properties.audit.properties), "audit");
  assertV4(Object.values(output.audit).every((value) => value === true), "adjudication audit flags must all be true");
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    disputedMoves: packet.disputedMoves.length,
    responsePairChoices: packet.disputedMoves.filter((item) => item.candidates.responsePair !== null).length,
    charityPairChoices: packet.disputedMoves.filter((item) => item.candidates.charityPair !== null).length,
    scoringFieldChoices: packet.disputedMoves.reduce((sum, item) => sum + Object.keys(item.candidates.scoringFields).length, 0),
    burdenAdjustmentChoices: packet.burdenAdjustmentDisputes.length,
    calculatedScores: 0
  };
}
