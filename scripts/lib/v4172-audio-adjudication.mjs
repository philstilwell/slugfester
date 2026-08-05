import { V4171_AUDIO_ADJ_OUTPUT_VERSION, V4171_AUDIO_ADJ_PROTOCOL_ID, makeV4171AudioAdjudicationSchema, validateV4171AudioAdjudicationOutput } from "./v4171-audio-adjudication.mjs";

export const V4172_AUDIO_ADJ_ROOT = "docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication-v4172";
export const V4172_AUDIO_ADJ_PROTOCOL_ID = "v4.1.7.2-endpoint-compatible-audio-attribution";
export const V4172_AUDIO_ADJ_PACKET_VERSION = "4.1.7.2-audio-attribution-adjudication-packet";
export const V4172_AUDIO_ADJ_OUTPUT_VERSION = "4.1.7.2-audio-attribution-adjudication-output";

export function makeV4172AudioAdjudicationSchema() {
  const schema = makeV4171AudioAdjudicationSchema();
  schema.$id = "slugfester-v4172-endpoint-compatible-audio-attribution";
  schema.title = "Slugfester v4.1.7.2 endpoint-compatible audio-attribution adjudication";
  schema.properties.schemaVersion.const = V4172_AUDIO_ADJ_OUTPUT_VERSION;
  schema.properties.protocolId.const = V4172_AUDIO_ADJ_PROTOCOL_ID;
  delete schema.properties.adjudications.items.properties.evidenceSegmentIndexes.uniqueItems;
  return schema;
}

export async function validateV4172AudioAdjudicationOutput(output, packet, root = process.cwd()) {
  const translated = { ...structuredClone(output), schemaVersion: V4171_AUDIO_ADJ_OUTPUT_VERSION, protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID };
  const validation = await validateV4171AudioAdjudicationOutput(translated, packet, root);
  return { ...validation, schemaVersion: V4172_AUDIO_ADJ_OUTPUT_VERSION, protocolId: V4172_AUDIO_ADJ_PROTOCOL_ID, endpointSchemaUniqueItemsKeywordPresent: false, deterministicUniquenessEnforced: true };
}
