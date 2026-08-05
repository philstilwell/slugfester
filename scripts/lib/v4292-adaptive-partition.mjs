import { makeV4291ProposalSchema } from "./v4291-schema-recovery.mjs";

export const V4292_ROOT = "docs/calibration/v4.2.9.2/adaptive-long-context-continuation";
export const V4292_PROTOCOL_ID = "v4.2.9.2-adaptive-long-context-continuation";
export const V4292_CHUNKS = [
  { chunkId: "chunk-2a", startEvent: 1638, endEvent: 2577 },
  { chunkId: "chunk-2b", startEvent: 2457, endEvent: 3396 }
];

export function makeV4292ProposalSchema() {
  const schema = structuredClone(makeV4291ProposalSchema());
  schema.$id = "slugfester-v4292-adaptive-chunk-proposal";
  schema.title = "Slugfester v4.2.9.2 adaptive long-context chunk proposal";
  schema.properties.chunkId.enum = V4292_CHUNKS.map((chunk) => chunk.chunkId);
  return schema;
}

export function deriveMoveKindFromResponseIntent(output) {
  const derived = structuredClone(output);
  const changedCandidateIds = [];
  for (const candidate of derived.candidates) {
    const expected = candidate.responseIntent.kind === "constructive" ? "constructive" : "reply";
    if (candidate.moveKind !== expected) changedCandidateIds.push(candidate.candidateId);
    candidate.moveKind = expected;
  }
  return { derived, changedCandidateIds };
}
