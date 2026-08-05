import { makeV429ProposalSchema } from "./v429-long-context-partition.mjs";

export const V4291_ROOT = "docs/calibration/v4.2.9.1/long-context-schema-recovery";
export const V4291_PROTOCOL_ID = "v4.2.9.1-long-context-schema-recovery";

export function makeV4291ProposalSchema() {
  const schema = structuredClone(makeV429ProposalSchema());
  schema.$id = "slugfester-v4291-long-context-chunk-proposal";
  schema.title = "Slugfester v4.2.9.1 schema-recovered long-context chunk proposal";
  for (const key of ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel"]) schema.properties[key].type = "string";
  for (const key of ["calibrationOnly", "completeChunkReviewed"]) schema.properties[key].type = "boolean";
  return schema;
}
