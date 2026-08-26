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

export const POST_CANARY_BATCH_11_PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/publication-reconstruction";
export const POST_CANARY_BATCH_11_PUBLICATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-11-publication-reconstruction";
export const POST_CANARY_BATCH_11_PUBLICATION_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-11-publication-packet";
export const POST_CANARY_BATCH_11_PUBLICATION_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-11-publication-output";
export const POST_CANARY_BATCH_11_PUBLICATION_MODEL =
  CHECKPOINT_V22_PUBLICATION_MODEL;
export const POST_CANARY_BATCH_11_PUBLICATION_BYLINE =
  CHECKPOINT_V22_PUBLICATION_BYLINE;
export const POST_CANARY_BATCH_11_PUBLICATION_DISCLOSURE =
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE;
export const POST_CANARY_BATCH_11_PUBLICATION_DEBATES = Object.freeze([
  "54",
  "01",
  "82",
  "191",
  "151",
  "188",
  "60",
  "79",
  "43",
  "24"
]);

export const postCanaryBatch11ReferenceCatalog =
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

export function buildPostCanaryBatch11PublicationPacket(input) {
  return {
    ...buildCheckpointV22PublicationPacket(input),
    schemaVersion: POST_CANARY_BATCH_11_PUBLICATION_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_11_PUBLICATION_PROTOCOL_ID,
    productionCanary: false
  };
}

export function buildPostCanaryBatch11PublicationSchema(packet) {
  const schema = buildCheckpointV22PublicationSchema(
    toCheckpointV22PublicationPacket(packet)
  );
  schema.$id =
    `slugfester-post-canary-batch-11-publication-${packet.debateNumber}`;
  schema.title =
    `Slugfester post-canary Batch 11 publication Debate ${packet.debateNumber}`;
  schema.properties.schemaVersion.const =
    POST_CANARY_BATCH_11_PUBLICATION_OUTPUT_VERSION;
  schema.properties.protocolId.const =
    POST_CANARY_BATCH_11_PUBLICATION_PROTOCOL_ID;
  schema.properties.productionCanary.const = false;
  return schema;
}
