import { assertV4 } from "./v4-lean-production.mjs";
import { makeV4221PassBSchema, reconstructV4221PassB, validateV4221PassBOutput } from "./v4221-pass-b-consensus.mjs";

export const V42211_ROOT = "docs/calibration/v4.2.21.1/charity-closure";
export const V42211_PROTOCOL_ID = "v4.2.21.1-charity-conditional-closure";
export const V42211_OUTPUT_VERSION = "4.2.21.1-charity-closed-pass-b-output";

const clone = (value) => structuredClone(value);
function exactObject(properties) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

export function makeV42211PassBSchema() {
  const schema = makeV4221PassBSchema();
  schema.$id = "slugfester-v42211-charity-closed-pass-b";
  schema.title = "Slugfester v4.2.21.1 charity-closed isolated Pass B judgment";
  schema.properties.schemaVersion.const = V42211_OUTPUT_VERSION;
  schema.properties.protocolId.const = V42211_PROTOCOL_ID;
  const charity = schema.properties.moveJudgments.items.properties.charity;
  const testedProperty = clone(charity.properties.tested);
  schema.properties.moveJudgments.items.properties.charity = {
    anyOf: [
      exactObject({ tested: { ...testedProperty, const: false }, alternative: { type: "string", const: "" }, decisiveQualification: { type: "string", const: "" } }),
      exactObject({ tested: { ...testedProperty, const: true }, alternative: { type: "string", minLength: 10 }, decisiveQualification: { type: "string", minLength: 10 } })
    ]
  };
  return schema;
}

function toV4221Output(output) {
  return { ...clone(output), schemaVersion: "4.2.21-source-span-pass-b-output", protocolId: "v4.2.21-source-span-consensus" };
}

export function validateV42211CharityClosure(output) {
  assertV4(Array.isArray(output?.moveJudgments), "v4.2.21.1 move judgments missing");
  for (const move of output.moveJudgments) {
    assertV4(move.charity && typeof move.charity.tested === "boolean", `${move.moveId}: charity tested state missing`);
    if (move.charity.tested) {
      assertV4(typeof move.charity.alternative === "string" && move.charity.alternative.trim().length >= 10, `${move.moveId}: tested charity alternative too short`);
      assertV4(typeof move.charity.decisiveQualification === "string" && move.charity.decisiveQualification.trim().length >= 10, `${move.moveId}: tested charity qualification too short`);
    } else {
      assertV4(move.charity.alternative === "" && move.charity.decisiveQualification === "", `${move.moveId}: untested charity descriptions must be empty`);
      assertV4(move.ratings?.representationalCharity?.value === 75, `${move.moveId}: untested representational charity must equal 75`);
    }
  }
  return { status: "passed", moves: output.moveJudgments.length, conditionalViolations: 0 };
}

export function validateV42211PassBOutput(output, packet, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes) {
  assertV4(output?.schemaVersion === V42211_OUTPUT_VERSION && output?.protocolId === V42211_PROTOCOL_ID, "v4.2.21.1 output identity mismatch");
  validateV42211CharityClosure(output);
  const validation = validateV4221PassBOutput(toV4221Output(output), packet, sourcePacket, eventsDocument, eventsFileBytes, sourceLedgerBytes);
  return { ...validation, schemaVersion: V42211_OUTPUT_VERSION, protocolId: V42211_PROTOCOL_ID, charityConditionalClosure: { status: "passed", untestedDescriptionsEmpty: true, untestedRatingFixedAt75: true, testedDescriptionsMinimumCharacters: 10 } };
}

export function reconstructV42211PassB(packet, output) {
  return reconstructV4221PassB(packet, toV4221Output(output));
}

export function toV42211Output(output) {
  return { ...clone(output), schemaVersion: V42211_OUTPUT_VERSION, protocolId: V42211_PROTOCOL_ID };
}
