import { readFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, V388_RATING_KEYS, assertV388, canonicalJson, containsProhibitedDerivedField } from "./v388-performance-judgment.mjs";

export const V388_ADJUDICATION_ROOT = `${V388_PERFORMANCE_ROOT}/adjudication`;

const choiceOrNull = {
  anyOf: [
    { type: "null" },
    { type: "integer", enum: [1, 2] },
  ],
};

export function makeV388AdjudicationSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "moveDecisions", "burdenAdjustmentDecisions", "audit"],
    properties: {
      schemaVersion: { type: "string", enum: ["3.8.8-performance-adjudication-output"] },
      protocolId: { type: "string", enum: ["v3.8.8-performance-judgment-consensus"] },
      debateNumber: { type: "string", enum: ["55", "103", "161"] },
      debateId: { type: "string", minLength: 1 },
      reviewerRole: { type: "string", enum: ["performance-adjudicator"] },
      assessmentModel: { type: "string", enum: ["5.6 Sol"] },
      calibrationOnly: { type: "boolean", enum: [true] },
      isolation: {
        type: "object",
        additionalProperties: false,
        required: ["initialPassIdentityUnavailable", "candidateOrderingAnonymous", "nondisputedFieldsUnavailable", "legacyAssessmentsUnavailable", "calculatedScoresUnavailable", "winnerLabelsUnavailable", "assessmentProseUnavailable", "contaminationDetected"],
        properties: {
          initialPassIdentityUnavailable: { type: "boolean", enum: [true] },
          candidateOrderingAnonymous: { type: "boolean", enum: [true] },
          nondisputedFieldsUnavailable: { type: "boolean", enum: [true] },
          legacyAssessmentsUnavailable: { type: "boolean", enum: [true] },
          calculatedScoresUnavailable: { type: "boolean", enum: [true] },
          winnerLabelsUnavailable: { type: "boolean", enum: [true] },
          assessmentProseUnavailable: { type: "boolean", enum: [true] },
          contaminationDetected: { type: "boolean", enum: [false] },
        },
      },
      moveDecisions: {
        type: "array",
        minItems: 1,
        maxItems: 28,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["moveId", "responseTupleChoice", "charityPairChoice", "ratingChoices", "rationale"],
          properties: {
            moveId: { type: "string", minLength: 1 },
            responseTupleChoice: choiceOrNull,
            charityPairChoice: choiceOrNull,
            ratingChoices: {
              type: "array",
              minItems: 0,
              maxItems: 7,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["ratingKey", "choice"],
                properties: {
                  ratingKey: { type: "string", enum: V388_RATING_KEYS },
                  choice: { type: "integer", enum: [1, 2] },
                },
              },
            },
            rationale: { type: "string", minLength: 40 },
          },
        },
      },
      burdenAdjustmentDecisions: {
        type: "array",
        minItems: 0,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["side", "choice", "rationale"],
          properties: {
            side: { type: "string", enum: ["pro", "con"] },
            choice: { type: "integer", enum: [1, 2] },
            rationale: { type: "string", minLength: 40 },
          },
        },
      },
      audit: {
        type: "object",
        additionalProperties: false,
        required: ["allDisputedMovesDecidedOnce", "onlyCandidateValuesSelected", "nondisputedFieldsUntouched", "calculatedScoresAbsent", "publicationProseAbsent"],
        properties: {
          allDisputedMovesDecidedOnce: { type: "boolean", enum: [true] },
          onlyCandidateValuesSelected: { type: "boolean", enum: [true] },
          nondisputedFieldsUntouched: { type: "boolean", enum: [true] },
          calculatedScoresAbsent: { type: "boolean", enum: [true] },
          publicationProseAbsent: { type: "boolean", enum: [true] },
        },
      },
    },
  };
}

function objectShape(value, keys, label) {
  assertV388(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assertV388(canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()), `${label} keys mismatch`);
}

function validateChoice(value, required, label) {
  if (required) assertV388(value === 1 || value === 2, `${label} must select candidate 1 or 2`);
  else assertV388(value === null, `${label} must be null for a nondisputed field`);
}

export function validateV388AdjudicationOutput(output, packet) {
  const schema = makeV388AdjudicationSchema();
  objectShape(output, schema.required, "output");
  assertV388(output.schemaVersion === "3.8.8-performance-adjudication-output" && output.protocolId === "v3.8.8-performance-judgment-consensus", "adjudication identity mismatch");
  assertV388(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
  assertV388(output.reviewerRole === "performance-adjudicator" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly, "adjudicator role mismatch");
  assertV388(!containsProhibitedDerivedField(output), "adjudication output contains prohibited score or publication prose fields");
  objectShape(output.isolation, Object.keys(schema.properties.isolation.properties), "isolation");
  for (const [key, definition] of Object.entries(schema.properties.isolation.properties)) assertV388(output.isolation[key] === definition.enum[0], `isolation.${key} mismatch`);
  assertV388(Array.isArray(output.moveDecisions) && output.moveDecisions.length === packet.disputedMoves.length, "move decision count mismatch");
  assertV388(new Set(output.moveDecisions.map((item) => item.moveId)).size === output.moveDecisions.length, "move decisions must be unique");

  for (let index = 0; index < packet.disputedMoves.length; index += 1) {
    const required = packet.disputedMoves[index];
    const decision = output.moveDecisions[index];
    const label = `moveDecisions[${index}]`;
    objectShape(decision, ["moveId", "responseTupleChoice", "charityPairChoice", "ratingChoices", "rationale"], label);
    assertV388(decision.moveId === required.moveId, `${label}: move order or identity mismatch`);
    validateChoice(decision.responseTupleChoice, required.candidates.responseTuple !== null, `${label}.responseTupleChoice`);
    validateChoice(decision.charityPairChoice, required.candidates.charityPair !== null, `${label}.charityPairChoice`);
    assertV388(Array.isArray(decision.ratingChoices), `${label}.ratingChoices must be an array`);
    const expectedKeys = Object.keys(required.candidates.ratings).sort();
    const actualKeys = decision.ratingChoices.map((item) => item.ratingKey).sort();
    assertV388(canonicalJson(actualKeys) === canonicalJson(expectedKeys) && new Set(actualKeys).size === actualKeys.length, `${label}: rating choice keys mismatch`);
    for (const item of decision.ratingChoices) {
      objectShape(item, ["ratingKey", "choice"], `${label}.ratingChoices.${item.ratingKey}`);
      assertV388(item.choice === 1 || item.choice === 2, `${label}.${item.ratingKey}: invalid candidate choice`);
    }
    assertV388(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `${label}.rationale too short`);
  }

  assertV388(Array.isArray(output.burdenAdjustmentDecisions) && output.burdenAdjustmentDecisions.length === packet.burdenAdjustmentDisputes.length, "burden adjustment decision count mismatch");
  assertV388(new Set(output.burdenAdjustmentDecisions.map((item) => item.side)).size === output.burdenAdjustmentDecisions.length, "burden adjustment decisions must be unique");
  for (let index = 0; index < packet.burdenAdjustmentDisputes.length; index += 1) {
    const required = packet.burdenAdjustmentDisputes[index];
    const decision = output.burdenAdjustmentDecisions[index];
    objectShape(decision, ["side", "choice", "rationale"], `burdenAdjustmentDecisions[${index}]`);
    assertV388(decision.side === required.side && (decision.choice === 1 || decision.choice === 2), `burdenAdjustmentDecisions[${index}] mismatch`);
    assertV388(typeof decision.rationale === "string" && decision.rationale.trim().length >= 40, `burdenAdjustmentDecisions[${index}].rationale too short`);
  }

  objectShape(output.audit, Object.keys(schema.properties.audit.properties), "audit");
  assertV388(Object.values(output.audit).every((value) => value === true), "adjudication audit flags must all be true");
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    disputedMoves: packet.disputedMoves.length,
    responseTupleChoices: packet.disputedMoves.filter((item) => item.candidates.responseTuple !== null).length,
    charityPairChoices: packet.disputedMoves.filter((item) => item.candidates.charityPair !== null).length,
    ratingChoices: packet.disputedMoves.reduce((sum, item) => sum + Object.keys(item.candidates.ratings).length, 0),
    burdenAdjustmentChoices: packet.burdenAdjustmentDisputes.length,
    calculatedScores: 0,
  };
}

export async function readV388AdjudicationJson(relativePath, cwd = process.cwd()) {
  return JSON.parse(await readFile(path.resolve(cwd, relativePath), "utf8"));
}
