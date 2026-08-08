import { assertV4 } from "./v4-lean-production.mjs";

export const V42211733_ROOT = "docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair";
export const V42211733_PROTOCOL_ID = "v4.2.21.17.33-hard-route-publication-transport-repair";
export const OPENAI_STRUCTURED_OUTPUT_KEYWORDS = Object.freeze(["$schema", "$id", "title", "description", "type", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "enum", "const", "anyOf"]);

export function validateOpenAIStructuredOutputSubset(schema) {
  const allowed = new Set(OPENAI_STRUCTURED_OUTPUT_KEYWORDS);
  const unsupportedKeywords = [];
  function visit(node, location) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (!allowed.has(key)) unsupportedKeywords.push(`${location}/${key}`);
      if (key === "properties") for (const [property, propertySchema] of Object.entries(value)) visit(propertySchema, `${location}/properties/${property}`);
      else if (key === "items") visit(value, `${location}/items`);
      else if (key === "anyOf") value.forEach((branch, index) => visit(branch, `${location}/anyOf/${index}`));
    }
  }
  visit(schema, "#");
  assertV4(unsupportedKeywords.length === 0, `unsupported structured-output schema keywords: ${unsupportedKeywords.join(", ")}`);
  return { status: "passed", unsupportedKeywords, allowedKeywords: [...OPENAI_STRUCTURED_OUTPUT_KEYWORDS].sort() };
}

