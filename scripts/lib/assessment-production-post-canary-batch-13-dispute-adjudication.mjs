import {
  V42211728_ADJUDICATION_ISOLATION,
  buildV42211728AdjudicationPacket,
  makeV42211728AdjudicationSchema,
  validateV42211728AdjudicationOutput
} from "./v42211728-hard-route-adjudication.mjs";

export const POST_CANARY_BATCH_13_DISPUTE_ADJ_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/dispute-only-adjudication";
export const POST_CANARY_BATCH_13_DISPUTE_ADJ_PROTOCOL_ID =
  "assessment-production-post-canary-batch-13-dispute-only-adjudication";
export const POST_CANARY_BATCH_13_DISPUTE_ADJ_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-13-dispute-only-adjudication-packet";
export const POST_CANARY_BATCH_13_DISPUTE_ADJ_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-13-dispute-only-adjudication-output";

const clone = (value) => structuredClone(value);

export function buildPostCanaryBatch13DisputeAdjudicationPacket(
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
  built.packet.schemaVersion = POST_CANARY_BATCH_13_DISPUTE_ADJ_PACKET_VERSION;
  built.packet.protocolId = POST_CANARY_BATCH_13_DISPUTE_ADJ_PROTOCOL_ID;
  built.packet.productionCanary = false;
  built.packet.batchNumber = 13;
  built.packet.stagingOnly = true;
  built.packet.developmentValidationOnly = false;
  return built;
}

export function makePostCanaryBatch13DisputeAdjudicationSchema() {
  const schema = makeV42211728AdjudicationSchema();
  schema.$id =
    "slugfester-assessment-production-post-canary-batch-13-dispute-only-adjudication";
  schema.title = "Slugfester post-canary Batch 13 dispute-only adjudication";
  schema.properties.schemaVersion.const =
    POST_CANARY_BATCH_13_DISPUTE_ADJ_OUTPUT_VERSION;
  schema.properties.protocolId.const =
    POST_CANARY_BATCH_13_DISPUTE_ADJ_PROTOCOL_ID;
  schema.required = schema.required.filter((key) => key !== "calibrationOnly");
  delete schema.properties.calibrationOnly;
  schema.required.push(
    "productionCanary",
    "batchNumber",
    "stagingOnly",
    "developmentValidationOnly"
  );
  schema.properties.productionCanary = { type: "boolean", const: false };
  schema.properties.batchNumber = { type: "integer", const: 13 };
  schema.properties.stagingOnly = { type: "boolean", const: true };
  schema.properties.developmentValidationOnly = {
    type: "boolean",
    const: false
  };
  return schema;
}

export function validatePostCanaryBatch13DisputeAdjudicationOutput(
  output,
  packet
) {
  const translatedOutput = clone(output);
  const translatedPacket = clone(packet);
  for (const key of [
    "productionCanary",
    "batchNumber",
    "stagingOnly",
    "developmentValidationOnly"
  ]) {
    delete translatedOutput[key];
    delete translatedPacket[key];
  }
  translatedOutput.calibrationOnly = true;
  translatedOutput.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-output";
  translatedOutput.protocolId =
    "v4.2.21.17.28-hard-route-decomposed-consensus";
  translatedPacket.schemaVersion =
    "4.2.21.17.28-hard-route-dispute-only-adjudication-packet";
  translatedPacket.protocolId =
    "v4.2.21.17.28-hard-route-decomposed-consensus";
  return validateV42211728AdjudicationOutput(
    translatedOutput,
    translatedPacket
  );
}

export {
  V42211728_ADJUDICATION_ISOLATION as POST_CANARY_BATCH_13_DISPUTE_ADJ_ISOLATION
};
