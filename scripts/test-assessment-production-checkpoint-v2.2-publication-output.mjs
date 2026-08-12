#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CHECKPOINT_V22_PUBLICATION_BYLINE,
  CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
  CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION,
  CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(
  preparation.status,
  "ten-production-checkpoint-v2.2-publication-contexts-prepared-and-frozen"
);

const words = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
function pad(prefix, target, token = "argumentativelysubstantial") {
  const parts = prefix.trim().replace(/[.]$/, "").split(/\s+/).filter(Boolean);
  while (parts.length < target) parts.push(token);
  return `${parts.join(" ")}.`;
}
function critique() {
  return [
    pad("Strongest feature: The move presents a clear relevant inferential route from its locked proposition and exact source evidence", 28),
    pad("Principal limitation: Its warrant remains compressed at an important bridge while the record identifies a qualification or alternative limiting its force", 28),
    pad("Live burden: The participant still needs to defend that bridge compare the strongest live alternative and explain why the evidence completes the route", 28),
    pad("Locked score: Those strengths and limitations fit the supplied performance band without credit for support scope or engagement absent from the transcript", 28)
  ].join(" ");
}
function firstExactWords(text, count = 6) {
  return text.trim().split(/\s+/).slice(0, count).join(" ");
}
function novelty(classification, sourceMoveIds) {
  return {
    classification,
    sourceMoveIds,
    explanation: pad(
      "This novelty classification follows from comparison with the locked move inventory and its exposed limitations",
      14,
      "grounded"
    )
  };
}
function extension(side, sideMoves) {
  const first = sideMoves[0].moveId;
  const second = (sideMoves[1] ?? sideMoves[0]).moveId;
  return {
    thesis: {
      id: `${side}-thesis`,
      text: pad(
        "The strengthened position combines its strongest transcript route with explicit comparative limits and a proportionate conclusion",
        18,
        "grounded"
      ),
      novelty: novelty("extends", [first])
    },
    premises: Array.from({ length: 4 }, (_, index) => ({
      id: `${side}-premise-${index + 1}`,
      text: pad(
        `Premise ${index + 1} develops a source grounded bridge while answering the strongest objection preserved in the assessment`,
        18,
        "grounded"
      ),
      novelty: novelty(index === 3 ? "repairs" : "extends", [index % 2 ? second : first])
    })),
    conclusion: {
      id: `${side}-conclusion`,
      text: pad(
        "The available considerations therefore support a measured conclusion only to the extent that these repaired premises withstand comparative scrutiny",
        20,
        "grounded"
      ),
      novelty: novelty("repairs", [first, second])
    },
    newArguments: [
      {
        id: `${side}-new-1`,
        title: "Comparative prediction test",
        text: pad(
          "A new comparative argument can specify what each position predicts before inspecting a disputed case assign the alternatives equal evidential scrutiny and ask which framework better explains expected successes and costly anomalies without adding assumptions only after contrary evidence appears",
          52,
          "grounded"
        ),
        novelty: novelty("introduces", [])
      },
      {
        id: `${side}-new-2`,
        title: "Cumulative bridge repair",
        text: pad(
          "A second reinforcement can connect the strongest surviving transcript claims through an explicit cumulative bridge state which premise carries the greatest uncertainty and show how the conclusion weakens if that premise fails thereby improving calibration without pretending that possibility alone establishes probability",
          52,
          "grounded"
        ),
        novelty: novelty("repairs", [first, second])
      }
    ]
  };
}

function fixture(packet) {
  const sideMoves = Object.fromEntries(
    ["pro", "con"].map((side) => [
      side,
      packet.moves.filter((move) => move.side === side)
    ])
  );
  const quote = (side) => {
    const move = sideMoves[side].find((item) => item.quoteEligible);
    return {
      sourceMoveId: move.moveId,
      text: firstExactWords(move.sourceExcerpt),
      context: pad(
        "This exact caption phrase appears in a locked high confidence source span and expresses a central part of the participant position",
        22,
        "grounded"
      )
    };
  };
  return {
    schemaVersion: CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION,
    protocolId: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    assessmentModel: "5.6 Sol",
    productionCanary: true,
    stagingOnly: true,
    completedAt: "2026-08-12T23:00:00Z",
    summary: pad(
      "The locked record preserves substantial arguments and unresolved burdens for both participants while the calculated result reflects their debate performance",
      20,
      "grounded"
    ),
    representativeQuotes: { pro: quote("pro"), con: quote("con") },
    moveProse: Object.fromEntries(
      packet.moves.map((move) => [
        move.moveId,
        {
          role: move.moveKind === "reply" ? "Major direct reply" : "Load-bearing constructive",
          words: pad(
            "The participant advances the locked proposition through the supplied source span while preserving its original scope and argumentative purpose",
            20,
            "grounded"
          ),
          critique: critique(),
          tags: []
        }
      ])
    ),
    overallCommentary: Object.fromEntries(
      ["pro", "con"].map((side) => [
        side,
        {
          strengths: [
            pad("The side clearly advances a central burden through a source grounded inferential route", 14, "grounded"),
            pad("The side supplies a material response to an important challenge preserved in the locked record", 15, "grounded"),
            pad("The side maintains useful qualifications that keep its conclusion proportionate to the available evidence", 15, "grounded")
          ],
          blunders: [
            {
              text: pad("The side leaves an important comparative bridge insufficiently developed under the locked record", 14, "grounded"),
              tags: []
            }
          ]
        }
      ])
    ),
    aiExtension: {
      aiGenerated: true,
      disclaimer: CHECKPOINT_V22_PUBLICATION_DISCLOSURE,
      pro: extension("pro", sideMoves.pro),
      con: extension("con", sideMoves.con)
    },
    displayContract: {
      sectionTitle: "AI Extension",
      placement: "immediately-after-overall-commentary",
      defaultCollapsed: true,
      visualVariant: "ai-distinct",
      byline: CHECKPOINT_V22_PUBLICATION_BYLINE,
      prohibitedLanguageScanPassed: true
    },
    audit: {
      lockedScoresUnchanged: true,
      everyMoveAuthoredOnce: true,
      legacyAssessmentUnavailable: true,
      otherDebatesUnavailable: true,
      aiMaterialExcludedFromScores: true,
      sourceOnlyQuoteSelection: true
    }
  };
}

assert(words(critique()) >= 105 && words(critique()) <= 130);
assert(critique().length >= 880);
let moves = 0;
for (const context of preparation.contexts) {
  const packet = JSON.parse(await readFile(context.packet, "utf8"));
  const output = fixture(packet);
  const validation = validateCheckpointV22PublicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  assert.equal(validation.minimumCritiqueCharacters >= 880, true);
  assert.equal(validation.calculatedScoresAuthoredByModel, 0);
  assert.equal(validation.lockedScoresUnchanged, true);

  const quoteMutation = structuredClone(output);
  quoteMutation.representativeQuotes.pro.text = "not present in the locked source excerpt";
  assert.throws(() => validateCheckpointV22PublicationOutput(quoteMutation, packet));

  const characterMutation = structuredClone(output);
  characterMutation.moveProse[packet.moves[0].moveId].critique = critique().replaceAll(
    "argumentativelysubstantial",
    "x"
  );
  assert.equal(words(characterMutation.moveProse[packet.moves[0].moveId].critique), words(critique()));
  assert.throws(() => validateCheckpointV22PublicationOutput(characterMutation, packet));

  const noveltyMutation = structuredClone(output);
  noveltyMutation.aiExtension.pro.newArguments[0].novelty.sourceMoveIds = [packet.moves[0].moveId];
  assert.throws(() => validateCheckpointV22PublicationOutput(noveltyMutation, packet));

  const languageMutation = structuredClone(output);
  languageMutation.aiExtension.pro.thesis.text += " This is unassailable.";
  assert.throws(() => validateCheckpointV22PublicationOutput(languageMutation, packet));

  const scriptMutation = structuredClone(output);
  scriptMutation.summary += " 漢字";
  assert.throws(() => validateCheckpointV22PublicationOutput(scriptMutation, packet));

  const scoreMutation = structuredClone(output);
  scoreMutation.score = { pro: 99, con: 1 };
  assert.throws(() => validateCheckpointV22PublicationOutput(scoreMutation, packet));

  const coverageMutation = structuredClone(output);
  delete coverageMutation.moveProse[packet.moves[0].moveId];
  assert.throws(() => validateCheckpointV22PublicationOutput(coverageMutation, packet));
  moves += packet.moves.length;
}
assert.equal(moves, 188);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      moves: 188,
      syntheticOutputsValidated: 10,
      critiqueMinimumCharacterMutationRejected: true,
      exactQuoteMutationRejected: true,
      noveltyMutationRejected: true,
      prohibitedLanguageMutationRejected: true,
      unexpectedScriptMutationRejected: true,
      modelAuthoredScoreFieldMutationRejected: true,
      moveCoverageMutationRejected: true,
      emptyMaterialTagListsAccepted: true,
      modelAuthoredScores: 0
    },
    null,
    2
  )
);
