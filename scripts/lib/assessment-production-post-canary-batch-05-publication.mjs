import {
  buildCheckpointV22PublicationPacket,
  buildCheckpointV22PublicationSchema,
  checkpointV22ReferenceCatalog,
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION,
  CHECKPOINT_V22_PUBLICATION_PACKET_VERSION,
  CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID
} from "./assessment-production-checkpoint-v2.2-publication.mjs";

export const POST_CANARY_BATCH_05_PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/publication-reconstruction";
export const POST_CANARY_BATCH_05_PUBLICATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-05-publication-reconstruction";
export const POST_CANARY_BATCH_05_PUBLICATION_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-05-publication-packet";
export const POST_CANARY_BATCH_05_PUBLICATION_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-05-publication-output";
export const POST_CANARY_BATCH_05_PUBLICATION_MODEL =
  CHECKPOINT_V22_PUBLICATION_MODEL;
export const POST_CANARY_BATCH_05_PUBLICATION_BYLINE =
  CHECKPOINT_V22_PUBLICATION_BYLINE;
export const POST_CANARY_BATCH_05_PUBLICATION_DISCLOSURE =
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE;
export const POST_CANARY_BATCH_05_PUBLICATION_DEBATES = Object.freeze([
  "158",
  "46",
  "64",
  "132",
  "189",
  "109",
  "179",
  "05",
  "42",
  "59"
]);

export const postCanaryBatch05ReferenceCatalog =
  checkpointV22ReferenceCatalog;

export function toCheckpointV22PublicationPacket(packet) {
  return {
    ...structuredClone(packet),
    schemaVersion: CHECKPOINT_V22_PUBLICATION_PACKET_VERSION,
    protocolId: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
    productionCanary: true
  };
}

export function toCheckpointV22PublicationOutput(output) {
  return {
    ...structuredClone(output),
    schemaVersion: CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION,
    protocolId: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
    productionCanary: true
  };
}

export function buildPostCanaryBatch05PublicationPacket(input) {
  return {
    ...buildCheckpointV22PublicationPacket(input),
    schemaVersion: POST_CANARY_BATCH_05_PUBLICATION_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_05_PUBLICATION_PROTOCOL_ID,
    productionCanary: false
  };
}

export function buildPostCanaryBatch05PublicationSchema(packet) {
  const schema = buildCheckpointV22PublicationSchema(
    toCheckpointV22PublicationPacket(packet)
  );
  schema.$id =
    `slugfester-post-canary-batch-05-publication-${packet.debateNumber}`;
  schema.title =
    `Slugfester post-canary Batch 5 publication Debate ${packet.debateNumber}`;
  schema.properties.schemaVersion.const =
    POST_CANARY_BATCH_05_PUBLICATION_OUTPUT_VERSION;
  schema.properties.protocolId.const =
    POST_CANARY_BATCH_05_PUBLICATION_PROTOCOL_ID;
  schema.properties.productionCanary.const = false;
  return schema;
}
