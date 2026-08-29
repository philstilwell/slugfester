import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DIMENSION_KEYS,
  MULTI_SPEAKER_MODEL,
  MULTI_SPEAKER_PROTOCOL_ID,
  MULTI_SPEAKER_REASONING,
  assembleMultiSpeakerFinalLedger,
  canonicalJson,
  deriveMultiSpeakerScores,
  extractMultiSpeakerDisagreements,
  sha256,
  validateMultiSpeakerAdjudication,
  validateMultiSpeakerInventory,
  validateMultiSpeakerPrimaryJudgment,
  validateMultiSpeakerScoreStability
} from "./lib/assessment-production-multi-speaker-approximation-v1.mjs";

const events = Array.from({ length: 12 }, (_, index) => ({
  startMs: index * 10_000,
  durationMs: 9_000,
  text: `speaker move ${String(index + 1).padStart(2, "0")} gives a complete exact source excerpt for the synthetic contract test`
}));

for (const schemaPath of [
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/primary-judgment.schema.json",
  "docs/assessment-production/multi-speaker-approximation-v1/schemas/adjudication.schema.json"
]) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.type, "object");
}

const movePlan = [
  ["m01", "s1", "pro", "Speaker A", "constructive", [], []],
  ["m02", "s1", "con", "Speaker C", "constructive", [], []],
  ["m03", "s1", "pro", "Speaker B", "reply", ["m02"], ["m01"]],
  ["m04", "s2", "con", "Speaker C", "constructive", [], []],
  ["m05", "s2", "pro", "Speaker A", "reply", ["m04"], []],
  ["m06", "s2", "con", "Speaker C", "reply", ["m05"], []],
  ["m07", "s3", "pro", "Speaker B", "constructive", [], []],
  ["m08", "s3", "con", "Speaker C", "reply", ["m07"], []],
  ["m09", "s3", "pro", "Speaker A", "reply", ["m08"], ["m07"]],
  ["m10", "s4", "con", "Speaker C", "constructive", [], []],
  ["m11", "s4", "pro", "Speaker B", "reply", ["m10"], []],
  ["m12", "s4", "con", "Speaker C", "reply", ["m11"], []]
];

const inventory = {
  schemaVersion: "1.0-multi-speaker-score-blind-inventory",
  protocolId: MULTI_SPEAKER_PROTOCOL_ID,
  status: "complete-and-frozen",
  debateNumber: "test",
  debateId: "synthetic-multi-speaker-contract-test",
  assessmentModel: MULTI_SPEAKER_MODEL,
  reasoningEffort: MULTI_SPEAKER_REASONING,
  sides: {
    pro: { label: "Affirmative team", speakers: ["Speaker A", "Speaker B"] },
    con: { label: "Negative side", speakers: ["Speaker C"] }
  },
  routes: [
    {
      routeId: "pro-route",
      side: "pro",
      description: "The affirmative route connects its selected arguments to the synthetic test motion.",
      bridges: [
        { bridgeId: "p-motion", tier: "motion", description: "Complete the affirmative motion burden in the synthetic test." },
        { bridgeId: "p-central", tier: "central", description: "Advance the affirmative central burden in the synthetic test." },
        { bridgeId: "p-sub", tier: "subsidiary", description: "Advance an affirmative subsidiary burden in the synthetic test." }
      ]
    },
    {
      routeId: "con-route",
      side: "con",
      description: "The negative route connects its selected arguments to the synthetic test motion.",
      bridges: [
        { bridgeId: "c-motion", tier: "motion", description: "Complete the negative motion burden in the synthetic test." },
        { bridgeId: "c-central", tier: "central", description: "Advance the negative central burden in the synthetic test." },
        { bridgeId: "c-sub", tier: "subsidiary", description: "Advance a negative subsidiary burden in the synthetic test." }
      ]
    }
  ],
  sections: ["s1", "s2", "s3", "s4"].map((sectionId, index) => ({
    sectionId,
    title: `Synthetic section ${index + 1}`,
    weightPercent: 25,
    rationale: "This synthetic section exercises side-level weighted score aggregation."
  })),
  moves: movePlan.map(
    ([moveId, sectionId, side, speaker, moveKind, respondsToIds, adoptsMoveIds], index) => ({
      moveId,
      sectionId,
      side,
      speaker,
      moveKind,
      proposition: `This is the bounded proposition represented by synthetic move ${moveId}.`,
      sourceSpan: {
        startEvent: index,
        endEvent: index,
        startMs: events[index].startMs,
        endMs: events[index].startMs + events[index].durationMs,
        excerpt: events[index].text
      },
      quoteEligibleExactSpans: [events[index].text.split(" ").slice(0, 5).join(" ")],
      attributionConfidence: "high",
      attributionBasis: "The synthetic event is assigned directly to its declared test speaker.",
      importance: (index % 3) + 1,
      burdenContact: {
        bridgeId: `${side === "pro" ? "p" : "c"}-${index % 3 === 0 ? "motion" : index % 3 === 1 ? "central" : "sub"}`,
        tier: index % 3 === 0 ? "motion" : index % 3 === 1 ? "central" : "subsidiary"
      },
      respondsToIds,
      adoptsMoveIds
    })
  ),
  speakerCoverage: ["Speaker A", "Speaker B", "Speaker C"].map((speaker) => ({
    speaker,
    substantiveOpportunityCount: movePlan.filter((move) => move[3] === speaker).length,
    selectedMoveIds: movePlan.filter((move) => move[3] === speaker).map((move) => move[0]),
    omissionReason: null
  })),
  audit: {
    completeTranscriptReviewed: true,
    legacyAssessmentsUnavailable: true,
    allSpansSourceExact: true,
    speakerOwnershipExplicit: true,
    calculatedTotalsAbsent: true
  }
};

const inventoryValidation = validateMultiSpeakerInventory(inventory, events);
assert.equal(inventoryValidation.status, "passed");
assert.equal(inventoryValidation.speakers, 3);
assert.equal(inventoryValidation.moves, 12);

const inventorySha256 = sha256(canonicalJson(inventory));
const rationale =
  "The synthetic rationale is deliberately long enough to exercise the contract's minimum explanatory boundary.";

function judgment(pass, offset) {
  return {
    schemaVersion: "1.0-multi-speaker-primary-judgment",
    protocolId: MULTI_SPEAKER_PROTOCOL_ID,
    status: "complete-and-schema-valid",
    pass,
    debateNumber: inventory.debateNumber,
    debateId: inventory.debateId,
    reviewerRole: "isolated-score-blind-primary-judge",
    assessmentModel: MULTI_SPEAKER_MODEL,
    reasoningEffort: MULTI_SPEAKER_REASONING,
    inventorySha256,
    isolation: {
      legacyAssessmentsUnavailable: true,
      calculatedTotalsUnavailable: true,
      winnerLabelsUnavailable: true,
      otherJudgmentUnavailable: true,
      publicationProseUnavailable: true,
      otherDebatesUnavailable: true,
      contaminationDetected: false
    },
    judgments: inventory.moves.map((move, index) => ({
      moveId: move.moveId,
      assessmentConfidence:
        pass === "pass-b" && move.moveId === "m08" ? "medium" : "high",
      dimensions: Object.fromEntries(
        DIMENSION_KEYS.map((dimension, dimensionIndex) => {
          let value = 70 + ((index + dimensionIndex) % 12) + offset;
          if (
            pass === "pass-b" &&
            move.moveId === "m05" &&
            dimension === "logicalCoherence"
          ) {
            value += 10;
          }
          return [dimension, { value, rationale }];
        })
      )
    })),
    burdenCompletionAdjustment: {
      pro:
        pass === "pass-b"
          ? {
              value: 3,
              rationale,
              distinctUnscoredConsequence:
                "The synthetic pro side completes one debate-wide burden not already captured by a move rating.",
              relatedMoveIds: ["m05"]
            }
          : {
              value: 0,
              rationale,
              distinctUnscoredConsequence: null,
              relatedMoveIds: []
            },
      con: {
        value: 0,
        rationale,
        distinctUnscoredConsequence: null,
        relatedMoveIds: []
      }
    },
    audit: {
      completeLockedInventoryReviewed: true,
      allMovesJudgedOnce: true,
      ratingsOnlyNoCalculatedScores: true,
      scoreBlind: true,
      speakerCreditNotTransferred: true
    }
  };
}

const passA = judgment("pass-a", 0);
const passB = judgment("pass-b", 1);
validateMultiSpeakerPrimaryJudgment(passA, inventory, {
  expectedPass: "pass-a",
  expectedInventorySha256: inventorySha256
});
validateMultiSpeakerPrimaryJudgment(passB, inventory, {
  expectedPass: "pass-b",
  expectedInventorySha256: inventorySha256
});

const disagreements = extractMultiSpeakerDisagreements({ inventory, passA, passB });
assert.deepEqual(
  disagreements.disputes.map((dispute) => dispute.disputeId),
  [
    "m05:logicalCoherence",
    "m08:assessmentConfidence",
    "burdenCompletionAdjustment:pro"
  ]
);

const adjudication = {
  schemaVersion: "1.0-multi-speaker-dispute-adjudication",
  protocolId: MULTI_SPEAKER_PROTOCOL_ID,
  status: "complete-and-schema-valid",
  debateNumber: inventory.debateNumber,
  debateId: inventory.debateId,
  reviewerRole: "isolated-dispute-only-adjudicator",
  assessmentModel: MULTI_SPEAKER_MODEL,
  reasoningEffort: MULTI_SPEAKER_REASONING,
  isolation: {
    passIdentitiesUnavailable: true,
    calculatedTotalsUnavailable: true,
    winnerLabelsUnavailable: true,
    publicationProseUnavailable: true,
    otherDebatesUnavailable: true,
    contaminationDetected: false
  },
  resolutions: disagreements.disputes.map((dispute) => ({
    disputeId: dispute.disputeId,
    selectedOption: "option-a",
    rationale
  }))
};
validateMultiSpeakerAdjudication(adjudication, disagreements);

const audio = { status: "complete", verifiedMoveIds: [] };
const finalLedger = assembleMultiSpeakerFinalLedger({
  inventory,
  inventorySha256,
  passA,
  passASha256: sha256(canonicalJson(passA)),
  passB,
  passBSha256: sha256(canonicalJson(passB)),
  disagreements,
  disagreementsSha256: sha256(canonicalJson(disagreements)),
  adjudication,
  adjudicationSha256: sha256(canonicalJson(adjudication)),
  audio,
  audioSha256: sha256(canonicalJson(audio))
});
assert.equal(finalLedger.audit.unresolvedDisputes, 0);
assert.equal(finalLedger.moves[4].speaker, "Speaker A");

const scores = deriveMultiSpeakerScores(finalLedger);
assert.equal(scores.audit.modelAuthoredTotals, 0);
assert.equal(scores.audit.manualScoreOverrides, 0);
assert.equal(scores.speakers["Speaker A"].publishedRankingEligible, false);
assert.equal(scores.speakers["Speaker B"].side, "pro");
assert.equal(scores.speakers["Speaker C"].side, "con");
assert.ok(Number.isInteger(scores.overall.pro.score));
assert.ok(Number.isInteger(scores.overall.con.score));

const stability = validateMultiSpeakerScoreStability({
  inventory,
  passA,
  passB,
  finalScores: scores
});
assert.equal(stability.passed, true);

console.log(
  JSON.stringify(
    {
      status: "passed",
      inventory: inventoryValidation,
      disputes: disagreements.disputes.length,
      scores: scores.overall,
      speakerDiagnostics: Object.keys(scores.speakers).length,
      stability: stability.metrics
    },
    null,
    2
  )
);
