import {
  V42211728_ADJUDICATION_ISOLATION,
  buildV42211728AdjudicationPacket,
  makeV42211728AdjudicationSchema,
  validateV42211728AdjudicationOutput
} from "./v42211728-hard-route-adjudication.mjs";

export const PRODUCTION_CANARY_DISPUTE_ADJ_ROOT =
  "docs/assessment-production/canary-v1-dispute-only-adjudication";
export const PRODUCTION_CANARY_DISPUTE_ADJ_PROTOCOL_ID =
  "assessment-production-canary-v1-dispute-only-adjudication";
export const PRODUCTION_CANARY_DISPUTE_ADJ_PACKET_VERSION =
  "1.0-production-canary-dispute-only-adjudication-packet";
export const PRODUCTION_CANARY_DISPUTE_ADJ_OUTPUT_VERSION =
  "1.0-production-canary-dispute-only-adjudication-output";

const clone = (value) => structuredClone(value);

export function buildProductionCanaryDisputeAdjudicationPacket(
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
  built.packet.schemaVersion = PRODUCTION_CANARY_DISPUTE_ADJ_PACKET_VERSION;
  built.packet.protocolId = PRODUCTION_CANARY_DISPUTE_ADJ_PROTOCOL_ID;
  built.packet.productionCanary = true;
  built.packet.stagingOnly = true;
  return built;
}

export function makeProductionCanaryDisputeAdjudicationSchema() {
  const schema = makeV42211728AdjudicationSchema();
  schema.$id = "slugfester-production-canary-dispute-only-adjudication";
  schema.title = "Slugfester production-canary dispute-only adjudication";
  schema.properties.schemaVersion.const =
    PRODUCTION_CANARY_DISPUTE_ADJ_OUTPUT_VERSION;
  schema.properties.protocolId.const = PRODUCTION_CANARY_DISPUTE_ADJ_PROTOCOL_ID;
  schema.required = schema.required.filter((key) => key !== "calibrationOnly");
  delete schema.properties.calibrationOnly;
  schema.required.push("productionCanary", "stagingOnly");
  schema.properties.productionCanary = { type: "boolean", const: true };
  schema.properties.stagingOnly = { type: "boolean", const: true };
  return schema;
}

export function validateProductionCanaryDisputeAdjudicationOutput(output, packet) {
  const translatedOutput = clone(output);
  const translatedPacket = clone(packet);
  delete translatedOutput.productionCanary;
  delete translatedOutput.stagingOnly;
  translatedOutput.calibrationOnly = true;
  translatedOutput.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-output";
  translatedOutput.protocolId = "v4.2.21.17.28-hard-route-decomposed-consensus";
  delete translatedPacket.productionCanary;
  delete translatedPacket.stagingOnly;
  translatedPacket.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-packet";
  translatedPacket.protocolId = "v4.2.21.17.28-hard-route-decomposed-consensus";
  return validateV42211728AdjudicationOutput(translatedOutput, translatedPacket);
}

export {
  V42211728_ADJUDICATION_ISOLATION as PRODUCTION_CANARY_DISPUTE_ADJ_ISOLATION
};
