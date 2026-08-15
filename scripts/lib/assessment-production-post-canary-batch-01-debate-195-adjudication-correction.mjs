import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField
} from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-1";
export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction";
export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-packet";
export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-output";

export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_EVIDENCE_BOUNDARY =
  Object.freeze({
    burdenAdjustmentDisputesOnly: true,
    anonymousCandidatePairsOnly: true,
    candidateProvenanceUnavailable: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    moveDecisionsUnavailable: true,
    preservedMoveDecisionsImmutable: true,
    fullInitialOutputUnavailable: true,
    calculatedScoresUnavailable: true,
    winnerLabelsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true
  });

export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION =
  Object.freeze({
    candidateOrderingAnonymous: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    moveDecisionsUnavailable: true,
    fullInitialOutputUnavailable: true,
    provenanceUnavailable: true,
    calculatedScoresUnavailable: true,
    winnerLabelsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    contaminationDetected: false
  });

export const POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT =
  Object.freeze({
    exactlyTwoBurdenAdjustmentsDecidedOnce: true,
    onlyCandidateValuesSelected: true,
    preservedMoveDecisionsUntouched: true,
    calculatedScoresAbsent: true,
    publicationProseAbsent: true
  });

const clone = (value) => structuredClone(value);

function exactObject(properties) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties
  };
}

function exactKeys(value, keys, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort()),
    `${label}: keys mismatch`
  );
}

export function buildPostCanaryBatch01Debate195CorrectionPacket(
  originalPacket
) {
  assertV4(
    originalPacket.debateNumber === "195" &&
      originalPacket.debateId ===
        "russell-copleston-existence-of-god-1948",
    "Debate 195 source packet identity mismatch"
  );
  assertV4(
    originalPacket.burdenAdjustmentDisputes.length === 2 &&
      canonicalJson(
        originalPacket.burdenAdjustmentDisputes.map((item) => item.side)
      ) === canonicalJson(["pro", "con"]),
    "Debate 195 source burden-adjustment disputes changed"
  );
  return {
    schemaVersion:
      POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PACKET_VERSION,
    protocolId: POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
    debateNumber: "195",
    debateId: originalPacket.debateId,
    correctionType: "missing-burden-adjustment-decisions-only",
    candidateOrdering: originalPacket.candidateOrdering,
    evidenceBoundary: clone(
      POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_EVIDENCE_BOUNDARY
    ),
    requiredDecision: {
      decisionCount: 2,
      sideOrder: ["pro", "con"],
      candidateChoices: [1, 2],
      rationaleMinimumCharacters: 40
    },
    burdenAdjustmentDisputes: clone(
      originalPacket.burdenAdjustmentDisputes
    ),
    productionCanary: false,
    batchNumber: 1,
    stagingOnly: true,
    developmentValidationOnly: false
  };
}

export function validatePostCanaryBatch01Debate195CorrectionPacket(packet) {
  exactKeys(
    packet,
    [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "correctionType",
      "candidateOrdering",
      "evidenceBoundary",
      "requiredDecision",
      "burdenAdjustmentDisputes",
      "productionCanary",
      "batchNumber",
      "stagingOnly",
      "developmentValidationOnly"
    ],
    "correction packet"
  );
  assertV4(
    packet.schemaVersion ===
        POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PACKET_VERSION &&
      packet.protocolId ===
        POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
    "correction packet identity mismatch"
  );
  assertV4(
    packet.debateNumber === "195" &&
      packet.debateId === "russell-copleston-existence-of-god-1948",
    "correction packet debate identity mismatch"
  );
  assertV4(
    packet.correctionType === "missing-burden-adjustment-decisions-only" &&
      packet.productionCanary === false &&
      packet.batchNumber === 1 &&
      packet.stagingOnly === true &&
      packet.developmentValidationOnly === false,
    "correction packet boundary mismatch"
  );
  assertV4(
    packet.candidateOrdering ===
      "deterministically anonymized independently for every pair",
    "correction packet candidate ordering changed"
  );
  assertV4(
    canonicalJson(packet.evidenceBoundary) ===
      canonicalJson(
        POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_EVIDENCE_BOUNDARY
      ),
    "correction packet evidence boundary mismatch"
  );
  assertV4(
    canonicalJson(packet.requiredDecision) ===
      canonicalJson({
        decisionCount: 2,
        sideOrder: ["pro", "con"],
        candidateChoices: [1, 2],
        rationaleMinimumCharacters: 40
      }),
    "correction packet decision contract mismatch"
  );
  assertV4(
    packet.burdenAdjustmentDisputes.length === 2 &&
      canonicalJson(
        packet.burdenAdjustmentDisputes.map((item) => item.side)
      ) === canonicalJson(["pro", "con"]),
    "correction packet must contain exactly pro and con disputes"
  );
  for (const [index, dispute] of packet.burdenAdjustmentDisputes.entries()) {
    exactKeys(dispute, ["side", "candidates"], `dispute[${index}]`);
    exactKeys(
      dispute.candidates,
      ["candidate1", "candidate2"],
      `dispute[${index}].candidates`
    );
    assertV4(
      dispute.candidates.candidate1 && dispute.candidates.candidate2,
      `dispute[${index}]: anonymous pair missing`
    );
  }
  assertV4(
    !Object.hasOwn(packet, "disputedMoves") &&
      !Object.hasOwn(packet, "moveDecisions"),
    "correction packet contains move material"
  );
  return {
    status: "passed",
    debateNumber: "195",
    burdenAdjustmentDisputes: 2,
    candidateSelections: 2,
    moveDecisions: 0,
    calculatedScores: 0
  };
}

export function makePostCanaryBatch01Debate195CorrectionSchema() {
  const isolationProperties = Object.fromEntries(
    Object.entries(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION).map(
      ([key, value]) => [key, { type: "boolean", const: value }]
    )
  );
  const auditProperties = Object.fromEntries(
    Object.entries(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT).map(
      ([key, value]) => [key, { type: "boolean", const: value }]
    )
  );
  const decision = (side) =>
    exactObject({
      side: { type: "string", const: side },
      choice: { type: "integer", enum: [1, 2] },
      rationale: { type: "string", minLength: 40 }
    });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction",
    title:
      "Slugfester post-canary Batch 1 Debate 195 burden-adjustment correction",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "reviewerRole",
      "assessmentModel",
      "correctionOnly",
      "isolation",
      "burdenAdjustmentDecisions",
      "audit",
      "productionCanary",
      "batchNumber",
      "stagingOnly",
      "developmentValidationOnly"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID
      },
      debateNumber: { type: "string", const: "195" },
      debateId: {
        type: "string",
        const: "russell-copleston-existence-of-god-1948"
      },
      reviewerRole: {
        type: "string",
        const: "isolated-burden-adjustment-correction-adjudicator"
      },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      correctionOnly: { type: "boolean", const: true },
      isolation: exactObject(isolationProperties),
      burdenAdjustmentDecisions: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        prefixItems: [decision("pro"), decision("con")],
        items: false
      },
      audit: exactObject(auditProperties),
      productionCanary: { type: "boolean", const: false },
      batchNumber: { type: "integer", const: 1 },
      stagingOnly: { type: "boolean", const: true },
      developmentValidationOnly: { type: "boolean", const: false }
    }
  };
}

export function validatePostCanaryBatch01Debate195CorrectionOutput(
  output,
  packet
) {
  validatePostCanaryBatch01Debate195CorrectionPacket(packet);
  const schema = makePostCanaryBatch01Debate195CorrectionSchema();
  exactKeys(output, schema.required, "correction output");
  assertV4(
    output.schemaVersion ===
        POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_OUTPUT_VERSION &&
      output.protocolId ===
        POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_PROTOCOL_ID,
    "correction output identity mismatch"
  );
  assertV4(
    output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId,
    "correction output debate identity mismatch"
  );
  assertV4(
    output.reviewerRole ===
        "isolated-burden-adjustment-correction-adjudicator" &&
      output.assessmentModel === "5.6 Sol" &&
      output.correctionOnly === true &&
      output.productionCanary === false &&
      output.batchNumber === 1 &&
      output.stagingOnly === true &&
      output.developmentValidationOnly === false,
    "correction output reviewer boundary mismatch"
  );
  assertV4(
    canonicalJson(output.isolation) ===
      canonicalJson(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ISOLATION),
    "correction output isolation mismatch"
  );
  assertV4(
    !containsProhibitedCalculatedField(output),
    "correction output contains a prohibited calculated field"
  );
  assertV4(
    output.burdenAdjustmentDecisions.length === 2,
    "correction output must contain exactly two burden-adjustment decisions"
  );
  for (const [index, side] of ["pro", "con"].entries()) {
    const decision = output.burdenAdjustmentDecisions[index];
    exactKeys(
      decision,
      ["side", "choice", "rationale"],
      `burdenAdjustmentDecisions[${index}]`
    );
    assertV4(
      decision.side === side &&
        (decision.choice === 1 || decision.choice === 2),
      `burdenAdjustmentDecisions[${index}] mismatch`
    );
    assertV4(
      typeof decision.rationale === "string" &&
        decision.rationale.trim().length >= 40,
      `burdenAdjustmentDecisions[${index}].rationale too short`
    );
  }
  assertV4(
    canonicalJson(output.audit) ===
      canonicalJson(POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_AUDIT),
    "correction output audit mismatch"
  );
  return {
    status: "passed",
    debateNumber: "195",
    burdenAdjustmentDecisions: 2,
    candidateSelections: 2,
    preservedMoveDecisions: 18,
    calculatedScores: 0,
    deterministicMergeAuthorized: false
  };
}
