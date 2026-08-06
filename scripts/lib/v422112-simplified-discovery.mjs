import { assertV4 } from "./v4-lean-production.mjs";
import { validateV42219Discovery, V42219_MODEL } from "./v42219-generalized-partition.mjs";

export const V422112_ROOT = "docs/calibration/v4.2.21.12/simplified-partition-discovery";
export const V422112_PROTOCOL_ID = "v4.2.21.12-simplified-partition-discovery";
export const V422112_OUTPUT_VERSION = "4.2.21.12-score-blind-chunk-discovery";
export const V422112_BUNDLE_VERSION = "4.2.21.12-candidate-bundle";
export const V422112_MODEL = V42219_MODEL;

const clone = (value) => structuredClone(value);
const TOP_KEYS = ["schemaVersion", "protocolId", "debateNumber", "debateId", "chunkId", "coreStartEvent", "coreEndEvent", "contextStartEvent", "contextEndEvent", "reviewerRole", "assessmentModel", "calibrationOnly", "completeCoreReviewed", "candidates"];
const CANDIDATE_KEYS = ["candidateId", "side", "speaker", "proposition", "sourceSpan", "attributionConfidence", "attributionBasis", "loadBearingLevel", "loadBearingReason", "responseIntent", "contextSummary", "candidateConfidence"];

function exactKeys(value, keys, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertV4(actual.length === expected.length && actual.every((key, index) => key === expected[index]), `${label}: keys must be ${expected.join(", ")}`);
}

function constOrType(value, type) {
  return value === undefined ? { type } : { type, const: value };
}

export function makeV422112DiscoverySchema({ packet, chunk, candidatesMaximum = 10 } = {}) {
  const responseIntent = { type: "object", additionalProperties: false, required: ["kind", "earlierTargetDescription"], properties: { kind: { type: "string", enum: ["constructive", "reply"] }, earlierTargetDescription: { type: "string" } } };
  const candidate = {
    type: "object",
    additionalProperties: false,
    required: CANDIDATE_KEYS,
    properties: {
      candidateId: { type: "string", minLength: 1 },
      side: { type: "string", enum: ["pro", "con"] },
      speaker: { type: "string", minLength: 1 },
      proposition: { type: "string", minLength: 25 },
      sourceSpan: { type: "object", additionalProperties: false, required: ["startEvent", "endEvent"], properties: { startEvent: { type: "integer", minimum: 0 }, endEvent: { type: "integer", minimum: 0 } } },
      attributionConfidence: { type: "string", enum: ["high", "medium", "low"] },
      attributionBasis: { type: "string", minLength: 40 },
      loadBearingLevel: { type: "string", enum: ["motion", "central", "subsidiary"] },
      loadBearingReason: { type: "string", minLength: 60 },
      responseIntent,
      contextSummary: { type: "string", minLength: 60 },
      candidateConfidence: { type: "string", enum: ["high", "medium", "low"] }
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v422112-simplified-score-blind-chunk-discovery",
    type: "object",
    additionalProperties: false,
    required: TOP_KEYS,
    properties: {
      schemaVersion: { type: "string", const: V422112_OUTPUT_VERSION },
      protocolId: { type: "string", const: V422112_PROTOCOL_ID },
      debateNumber: constOrType(packet?.debateNumber, "string"),
      debateId: constOrType(packet?.debateId, "string"),
      chunkId: constOrType(chunk?.chunkId, "string"),
      coreStartEvent: chunk ? { type: "integer", const: chunk.coreStartEvent } : { type: "integer", minimum: 0 },
      coreEndEvent: chunk ? { type: "integer", const: chunk.coreEndEvent } : { type: "integer", minimum: 0 },
      contextStartEvent: chunk ? { type: "integer", const: chunk.contextStartEvent } : { type: "integer", minimum: 0 },
      contextEndEvent: chunk ? { type: "integer", const: chunk.contextEndEvent } : { type: "integer", minimum: 0 },
      reviewerRole: { type: "string", const: "score-blind-source-discovery" },
      assessmentModel: { type: "string", const: V422112_MODEL.label },
      calibrationOnly: { type: "boolean", const: true },
      completeCoreReviewed: { type: "boolean", const: true },
      candidates: { type: "array", minItems: 0, maxItems: candidatesMaximum, items: candidate }
    }
  };
}

function toV42219CompatibilityOutput(output) {
  return {
    ...clone(output),
    schemaVersion: "4.2.21.9-score-blind-chunk-discovery",
    protocolId: "v4.2.21.9-generalized-partition",
    candidates: output.candidates.map((candidate) => ({
      ...clone(candidate),
      responseIntent: candidate.responseIntent.kind === "constructive"
        ? { kind: "constructive", localTargetCandidateIds: [], earlierTargetDescription: "" }
        : { kind: "earlier-unselected-or-cross-chunk-reply", localTargetCandidateIds: [], earlierTargetDescription: candidate.responseIntent.earlierTargetDescription }
    }))
  };
}

export function validateV422112Discovery(output, args) {
  exactKeys(output, TOP_KEYS, "simplified discovery output");
  assertV4(output.schemaVersion === V422112_OUTPUT_VERSION && output.protocolId === V422112_PROTOCOL_ID, "simplified discovery output identity mismatch");
  for (const [index, candidate] of output.candidates.entries()) {
    exactKeys(candidate, CANDIDATE_KEYS, `candidates[${index}]`);
    exactKeys(candidate.responseIntent, ["kind", "earlierTargetDescription"], `${candidate.candidateId}.responseIntent`);
    assertV4(["constructive", "reply"].includes(candidate.responseIntent.kind), `${candidate.candidateId}: invalid simplified response kind`);
    if (candidate.responseIntent.kind === "constructive") assertV4(candidate.responseIntent.earlierTargetDescription === "", `${candidate.candidateId}: constructive target description must be empty`);
    else assertV4(candidate.responseIntent.earlierTargetDescription.length >= 30, `${candidate.candidateId}: reply target description is too short`);
  }
  const inherited = validateV42219Discovery(toV42219CompatibilityOutput(output), args);
  return { ...inherited, schemaVersion: V422112_OUTPUT_VERSION, protocolId: V422112_PROTOCOL_ID, localTargetIdsModelAuthored: false, primaryAOwnsSelectedTargetTopology: true };
}

export function compileV422112CandidateBundle({ packet, plan, outputs }) {
  assertV4(outputs.length === plan.chunks.length, "one simplified discovery output is required per planned chunk");
  const byChunk = new Map(outputs.map((output) => [output.chunkId, output]));
  assertV4(byChunk.size === outputs.length, "duplicate simplified discovery chunk outputs");
  const candidates = [];
  for (const chunk of plan.chunks) {
    const output = byChunk.get(chunk.chunkId);
    assertV4(output, `${chunk.chunkId}: simplified discovery output missing`);
    for (const candidate of output.candidates) candidates.push({ chunkId: chunk.chunkId, qualifiedCandidateId: `${chunk.chunkId}:${candidate.candidateId}`, side: candidate.side, speaker: candidate.speaker, moveKind: candidate.responseIntent.kind === "constructive" ? "constructive" : "reply", proposition: candidate.proposition, sourceSpan: clone(candidate.sourceSpan), attributionConfidence: candidate.attributionConfidence, attributionBasis: candidate.attributionBasis, loadBearingLevel: candidate.loadBearingLevel, loadBearingReason: candidate.loadBearingReason, responseIntent: clone(candidate.responseIntent), contextSummary: candidate.contextSummary, candidateConfidence: candidate.candidateConfidence });
  }
  candidates.sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent || left.sourceSpan.endEvent - right.sourceSpan.endEvent || left.qualifiedCandidateId.localeCompare(right.qualifiedCandidateId));
  assertV4(new Set(candidates.map((candidate) => candidate.qualifiedCandidateId)).size === candidates.length, "qualified simplified candidate IDs are not unique");
  return { schemaVersion: V422112_BUNDLE_VERSION, protocolId: V422112_PROTOCOL_ID, debateNumber: packet.debateNumber, debateId: packet.debateId, completeSourceDiscovery: { chunks: plan.chunks.length, everyEventOwnedExactlyOnce: true, everyCoreReportedComplete: outputs.every((output) => output.completeCoreReviewed), silentDeduplicationPerformed: false, localTargetIdsModelAuthored: false, selectedTargetTopologyDeferredToPrimaryA: true }, candidateCount: candidates.length, candidates };
}

export function buildV422112FailureFixture(predecessorOutput) {
  return {
    ...clone(predecessorOutput),
    schemaVersion: V422112_OUTPUT_VERSION,
    protocolId: V422112_PROTOCOL_ID,
    candidates: predecessorOutput.candidates.map((candidate) => {
      const targets = candidate.responseIntent.localTargetCandidateIds;
      const description = candidate.responseIntent.earlierTargetDescription || (targets.length ? `This reply addresses the earlier locally discovered material represented by ${targets.join(", ")}.` : "This reply addresses earlier argumentative material outside the selected local inventory.");
      return { ...clone(candidate), responseIntent: candidate.responseIntent.kind === "constructive" ? { kind: "constructive", earlierTargetDescription: "" } : { kind: "reply", earlierTargetDescription: description } };
    })
  };
}
