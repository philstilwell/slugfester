import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-17/audio-verification/audio-attribution-recovery";
export const PROTOCOL_ID = "assessment-production-post-canary-batch-17-audio-attribution-recovery";
export const OUTPUT_VERSION = "1.0-assessment-production-post-canary-batch-17-audio-attribution-output";
export const PACKET_VERSION = "1.0-assessment-production-post-canary-batch-17-audio-attribution-packet";
export const MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  directIncrementalCostUsdMaximum: 0,
});
export const ISOLATION = Object.freeze({
  ratingsUnavailable: true,
  scoresUnavailable: true,
  legacyUnavailable: true,
  otherDebatesUnavailable: true,
  publicationProseUnavailable: true,
  contaminationDetected: false,
});
export const AUDIT = Object.freeze({
  allDisputedMovesReviewed: true,
  rawAudioDerivedSegmentsNotAltered: true,
  calculatedScoreFieldsEmitted: false,
  thresholdRelaxationUsed: false,
  speakerRelabelingUsed: false,
  manualOverrideUsed: false,
  paidTranscriptionUsed: false,
});

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const exactObject = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

export function makeSchema(packet) {
  const moveSchemas = Object.fromEntries(packet.moves.map((move) => [move.moveId, exactObject({
    moveId: { type: "string", const: move.moveId },
    expectedSpeaker: { type: "string", const: move.expectedSpeaker },
    status: { type: "string", enum: ["verified", "unresolved"] },
    authoringSpeaker: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    corePropositionAuthoredByExpectedSpeaker: { type: "boolean" },
    mixedSpeakerSpan: { type: "boolean" },
    identityResolution: { type: "string", enum: ["named-label", "generic-label-dialogue-mapping", "unresolved"] },
    evidenceSegmentIndexes: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "integer", minimum: 0 },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    rationale: { type: "string", minLength: 20, maxLength: 1600 },
  })]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-17-audio-attribution-${packet.debateNumber}`,
    title: `Slugfester Batch 17 isolated audio-attribution recovery for Debate ${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "productionCanary", "stagingOnly", "isolation", "adjudications", "audit"],
    properties: {
      schemaVersion: { type: "string", const: OUTPUT_VERSION },
      protocolId: { type: "string", const: PROTOCOL_ID },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      reviewerRole: { type: "string", const: "isolated-audio-attribution-adjudicator" },
      assessmentModel: { type: "string", const: MODEL.label },
      productionCanary: { type: "boolean", const: false },
      stagingOnly: { type: "boolean", const: true },
      isolation: exactObject(Object.fromEntries(Object.entries(ISOLATION).map(([key, value]) => [key, { type: "boolean", const: value }]))),
      adjudications: {
        type: "array",
        minItems: packet.moves.length,
        maxItems: packet.moves.length,
        items: { anyOf: packet.moves.map((move) => moveSchemas[move.moveId]) },
      },
      audit: exactObject(Object.fromEntries(Object.entries(AUDIT).map(([key, value]) => [key, { type: "boolean", const: value }]))),
    },
  };
}

const assert = (condition, message) => { if (!condition) throw new Error(message); };

export async function validateOutput(output, packet) {
  assert(output && typeof output === "object", "output object missing");
  assert(output.schemaVersion === OUTPUT_VERSION && output.protocolId === PROTOCOL_ID, "output identity mismatch");
  assert(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "debate identity mismatch");
  assert(output.reviewerRole === "isolated-audio-attribution-adjudicator" && output.assessmentModel === MODEL.label, "reviewer identity mismatch");
  assert(output.productionCanary === false && output.stagingOnly === true, "stage boundary mismatch");
  assert(JSON.stringify(output.isolation) === JSON.stringify(ISOLATION), "isolation audit mismatch");
  assert(JSON.stringify(output.audit) === JSON.stringify(AUDIT), "execution audit mismatch");
  assert(!/(^|\")(score|rating|winner|total|points)(\"|$)/i.test(JSON.stringify(output)), "prohibited calculated or outcome field emitted");
  assert(Array.isArray(output.adjudications) && output.adjudications.length === packet.moves.length, "adjudication count mismatch");
  const validations = [];
  for (let index = 0; index < packet.moves.length; index += 1) {
    const move = packet.moves[index];
    const decision = output.adjudications[index];
    assert(decision.moveId === move.moveId && decision.expectedSpeaker === move.expectedSpeaker, `${move.moveId}: identity changed`);
    assert(Array.isArray(decision.evidenceSegmentIndexes) && decision.evidenceSegmentIndexes.length >= 1 && decision.evidenceSegmentIndexes.length <= 8, `${move.moveId}: evidence indexes invalid`);
    assert(new Set(decision.evidenceSegmentIndexes).size === decision.evidenceSegmentIndexes.length, `${move.moveId}: duplicate evidence index`);
    assert(typeof decision.rationale === "string" && decision.rationale.length >= 20 && decision.rationale.length <= 1600, `${move.moveId}: rationale invalid`);
    const bytes = await readFile(move.diarizedTranscriptPath);
    assert(sha256(bytes) === move.diarizedTranscriptSha256, `${move.moveId}: transcript hash changed`);
    const transcript = JSON.parse(bytes);
    const cited = decision.evidenceSegmentIndexes.map((segmentIndex) => {
      const segment = transcript.segments[segmentIndex];
      assert(segment && String(segment.text ?? "").trim(), `${move.moveId}: cited segment ${segmentIndex} invalid`);
      return segment;
    });
    const namedExpected = cited.filter((segment) => segment.speaker === move.expectedSpeaker).length;
    const generic = cited.filter((segment) => /^[A-Z]$/.test(String(segment.speaker))).length;
    if (decision.status === "verified") {
      assert(decision.authoringSpeaker === move.expectedSpeaker && decision.corePropositionAuthoredByExpectedSpeaker === true && decision.confidence === "high", `${move.moveId}: verified invariants invalid`);
      assert(decision.identityResolution === "named-label" || decision.identityResolution === "generic-label-dialogue-mapping", `${move.moveId}: verified identity resolution invalid`);
      if (decision.identityResolution === "named-label") assert(namedExpected >= 1, `${move.moveId}: named-label verification lacks named evidence`);
      if (decision.identityResolution === "generic-label-dialogue-mapping") assert(generic >= 1, `${move.moveId}: generic-label verification lacks generic evidence`);
    } else {
      assert(decision.authoringSpeaker === null && decision.corePropositionAuthoredByExpectedSpeaker === false && decision.identityResolution === "unresolved", `${move.moveId}: unresolved invariants invalid`);
    }
    validations.push({ moveId: move.moveId, status: decision.status, citedSegments: cited.length, namedExpectedSegmentsCited: namedExpected, genericSegmentsCited: generic, identityResolution: decision.identityResolution });
  }
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    decisions: validations,
    verified: validations.filter((item) => item.status === "verified").length,
    unresolved: validations.filter((item) => item.status === "unresolved").length,
    calculatedFields: 0,
  };
}

