import {
  V42211728_ADJUDICATION_ISOLATION,
  buildV42211728AdjudicationPacket,
  makeV42211728AdjudicationSchema,
  validateV42211728AdjudicationOutput
} from "./v42211728-hard-route-adjudication.mjs";

export const V213_DISPUTE_ADJ_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/dispute-only-adjudication";
export const V213_DISPUTE_ADJ_PROTOCOL_ID =
  "assessment-production-score-stability-v2.1.3-dispute-only-adjudication";
export const V213_DISPUTE_ADJ_PACKET_VERSION =
  "1.0-score-stability-v2.1.3-dispute-only-adjudication-packet";
export const V213_DISPUTE_ADJ_OUTPUT_VERSION =
  "1.0-score-stability-v2.1.3-dispute-only-adjudication-output";

const clone = (value) => structuredClone(value);

export function buildV213DisputeAdjudicationPacket(
  disagreements,
  lockedInventory,
  events,
  audioVerificationByMoveId = new Map()
) {
  const built = buildV42211728AdjudicationPacket(
    disagreements,
    lockedInventory,
    events,
    audioVerificationByMoveId
  );
  built.packet.schemaVersion = V213_DISPUTE_ADJ_PACKET_VERSION;
  built.packet.protocolId = V213_DISPUTE_ADJ_PROTOCOL_ID;
  built.packet.productionCanary = false;
  built.packet.stagingOnly = true;
  built.packet.developmentValidationOnly = true;
  return built;
}

export function makeV213DisputeAdjudicationSchema() {
  const schema = makeV42211728AdjudicationSchema();
  schema.$id = "slugfester-score-stability-v2-1-3-dispute-only-adjudication";
  schema.title = "Slugfester score-stability v2.1.3 dispute-only adjudication";
  schema.properties.schemaVersion.const = V213_DISPUTE_ADJ_OUTPUT_VERSION;
  schema.properties.protocolId.const = V213_DISPUTE_ADJ_PROTOCOL_ID;
  schema.required = schema.required.filter((key) => key !== "calibrationOnly");
  delete schema.properties.calibrationOnly;
  schema.required.push(
    "productionCanary",
    "stagingOnly",
    "developmentValidationOnly"
  );
  schema.properties.productionCanary = { type: "boolean", const: false };
  schema.properties.stagingOnly = { type: "boolean", const: true };
  schema.properties.developmentValidationOnly = {
    type: "boolean",
    const: true
  };
  return schema;
}

export function validateV213DisputeAdjudicationOutput(output, packet) {
  const translatedOutput = clone(output);
  const translatedPacket = clone(packet);
  delete translatedOutput.productionCanary;
  delete translatedOutput.stagingOnly;
  delete translatedOutput.developmentValidationOnly;
  translatedOutput.calibrationOnly = true;
  translatedOutput.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-output";
  translatedOutput.protocolId =
    "v4.2.21.17.28-hard-route-decomposed-consensus";
  delete translatedPacket.productionCanary;
  delete translatedPacket.stagingOnly;
  delete translatedPacket.developmentValidationOnly;
  translatedPacket.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-packet";
  translatedPacket.protocolId =
    "v4.2.21.17.28-hard-route-decomposed-consensus";
  return validateV42211728AdjudicationOutput(translatedOutput, translatedPacket);
}

export {
  V42211728_ADJUDICATION_ISOLATION as V213_DISPUTE_ADJ_ISOLATION
};
