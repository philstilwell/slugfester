import { referenceDefinitions } from "../../src/data/references.js";
import { mapV4219Responsiveness } from "./v4219-primary-recovery.mjs";
import { renderV4220EvidenceWindow } from "./v4220-source-span-rendering.mjs";
import { assertV4 } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_PUBLICATION_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/publication-reconstruction";
export const CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-publication-reconstruction";
export const CHECKPOINT_V22_PUBLICATION_PACKET_VERSION =
  "1.0-production-checkpoint-v2.2-publication-packet";
export const CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION =
  "1.0-production-checkpoint-v2.2-publication-output";
export const CHECKPOINT_V22_PUBLICATION_MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
export const CHECKPOINT_V22_PUBLICATION_BYLINE =
  "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.";
export const CHECKPOINT_V22_PUBLICATION_DISCLOSURE =
  "This section is an AI-generated contribution, not transcript content. Its wording is not attributable to either participant and it does not affect any participant score.";
export const CHECKPOINT_V22_PUBLICATION_DEBATES = Object.freeze([
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122"
]);

const clone = (value) => structuredClone(value);
const str = (minLength = 1) => ({ type: "string", minLength });
const exactObject = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});

function scoreBand(value) {
  if (value >= 95) return "exceptional 95–100";
  if (value >= 85) return "very strong 85–94";
  if (value >= 75) return "strong/competent 75–84";
  if (value >= 65) return "mixed 65–74";
  if (value >= 50) return "weak 50–64";
  if (value >= 25) return "very weak 25–49";
  return "non-performance 0–24";
}

function formatTime(milliseconds) {
  return `${Math.floor(milliseconds / 60000)}:${String(
    Math.floor((milliseconds % 60000) / 1000)
  ).padStart(2, "0")}`;
}

function responseClass(move) {
  if (move.moveKind === "constructive") return "constructive-opening";
  if (move.response.diagnosticConsequenceExplicit) return "diagnostic-defeat";
  if (move.response.replacementDemandAnswered) return "justified-reframe";
  const contacted = move.response.components.filter((component) => component.contacted).length;
  if (contacted > 0 && contacted === move.response.components.length) return "full-answer";
  if (contacted > 0) return "partial-answer";
  if (move.response.issueBearingContraryMaterial) return "relevant-nonanswer";
  return "nonanswer";
}

export function checkpointV22ReferenceCatalog() {
  return Object.entries(referenceDefinitions).flatMap(([type, definitions]) =>
    Object.entries(definitions).map(([slug, definition]) => ({
      type,
      slug,
      label: definition.label,
      definition: definition.definition,
      url: definition.externalUrl
    }))
  );
}

function tagSchema() {
  const catalog = checkpointV22ReferenceCatalog();
  return exactObject({
    label: str(),
    type: { type: "string", enum: ["fallacy", "bias"] },
    slug: { type: "string", enum: catalog.map((tag) => tag.slug) },
    context: str(40)
  });
}

function noveltySchema(moveIds) {
  return exactObject({
    classification: { type: "string", enum: ["extends", "repairs", "introduces"] },
    sourceMoveIds: { type: "array", items: { type: "string", enum: moveIds } },
    explanation: str(40)
  });
}

function extensionItemSchema(moveIds) {
  return exactObject({ id: str(), text: str(80), novelty: noveltySchema(moveIds) });
}

export function buildCheckpointV22PublicationSchema(packet) {
  const moveIds = packet.moves.map((move) => move.moveId);
  const moveProse = Object.fromEntries(
    packet.moves.map((move) => [
      move.moveId,
      exactObject({
        role: {
          type: "string",
          enum: [
            "Load-bearing constructive",
            "Supporting constructive",
            "Major direct reply",
            "Supporting reply",
            "Diagnostic challenge",
            "Concession or qualification"
          ]
        },
        words: str(50),
        critique: str(880),
        tags: { type: "array", maxItems: 2, items: tagSchema() }
      })
    ])
  );
  const quote = (side) =>
    exactObject({
      sourceMoveId: {
        type: "string",
        enum: packet.moves
          .filter((move) => move.side === side && move.quoteEligible)
          .map((move) => move.moveId)
      },
      text: str(12),
      context: str(60)
    });
  const limitation = exactObject({
    text: str(50),
    tags: { type: "array", maxItems: 2, items: tagSchema() }
  });
  const overallSide = exactObject({
    strengths: { type: "array", minItems: 3, maxItems: 6, items: str(30) },
    blunders: { type: "array", minItems: 1, maxItems: 4, items: limitation }
  });
  const extensionItem = extensionItemSchema(moveIds);
  const newArgument = exactObject({
    id: str(),
    title: str(8),
    text: str(280),
    novelty: noveltySchema(moveIds)
  });
  const extensionSide = exactObject({
    thesis: extensionItem,
    premises: { type: "array", minItems: 4, maxItems: 6, items: extensionItem },
    conclusion: extensionItem,
    newArguments: { type: "array", minItems: 2, maxItems: 4, items: newArgument }
  });

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-production-checkpoint-v2.2-publication-${packet.debateNumber}`,
    title: `Slugfester production checkpoint v2.2 publication Debate ${packet.debateNumber}`,
    ...exactObject({
      schemaVersion: { type: "string", const: CHECKPOINT_V22_PUBLICATION_OUTPUT_VERSION },
      protocolId: { type: "string", const: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: CHECKPOINT_V22_PUBLICATION_MODEL.label },
      productionCanary: { type: "boolean", const: true },
      stagingOnly: { type: "boolean", const: true },
      completedAt: str(),
      summary: str(40),
      representativeQuotes: exactObject({ pro: quote("pro"), con: quote("con") }),
      moveProse: exactObject(moveProse),
      overallCommentary: exactObject({ pro: overallSide, con: overallSide }),
      aiExtension: exactObject({
        aiGenerated: { type: "boolean", const: true },
        disclaimer: { type: "string", const: CHECKPOINT_V22_PUBLICATION_DISCLOSURE },
        pro: extensionSide,
        con: extensionSide
      }),
      displayContract: exactObject({
        sectionTitle: { type: "string", const: "AI Extension" },
        placement: { type: "string", const: "immediately-after-overall-commentary" },
        defaultCollapsed: { type: "boolean", const: true },
        visualVariant: { type: "string", const: "ai-distinct" },
        byline: { type: "string", const: CHECKPOINT_V22_PUBLICATION_BYLINE },
        prohibitedLanguageScanPassed: { type: "boolean", const: true }
      }),
      audit: exactObject({
        lockedScoresUnchanged: { type: "boolean", const: true },
        everyMoveAuthoredOnce: { type: "boolean", const: true },
        legacyAssessmentUnavailable: { type: "boolean", const: true },
        otherDebatesUnavailable: { type: "boolean", const: true },
        aiMaterialExcludedFromScores: { type: "boolean", const: true },
        sourceOnlyQuoteSelection: { type: "boolean", const: true }
      })
    })
  };
}

export function buildCheckpointV22PublicationPacket({
  ledgerDebate,
  scoreDebate,
  sourcePacket,
  eventsDocument,
  production,
  audioVerifiedMoveIds,
  renderDate
}) {
  const raw = ledgerDebate.finalJudgment;
  const scoreByMoveId = new Map(
    scoreDebate.final.sections.flatMap((section) =>
      ["pro", "con"].flatMap((side) =>
        section.sides[side].moves.map((move) => [move.moveId, move.score])
      )
    )
  );
  const moves = raw.moves.map((move) => {
    const startEvent = eventsDocument[move.sourceSpan.startEvent];
    const endEvent = eventsDocument[move.sourceSpan.endEvent];
    const finalScore = scoreByMoveId.get(move.moveId);
    assertV4(
      startEvent && endEvent && Number.isInteger(finalScore),
      `${move.moveId}: publication packet source or score missing`
    );
    const evidence = renderV4220EvidenceWindow(move, eventsDocument);
    const derivedClass = responseClass(move);
    const audioVerified = audioVerifiedMoveIds.has(move.moveId);
    return {
      moveId: move.moveId,
      sectionId: move.sectionId,
      side: move.side,
      speaker: move.speaker,
      moveKind: move.moveKind,
      proposition: move.proposition,
      importance: move.importance,
      finalScore,
      scoreBand: scoreBand(finalScore),
      displayTime: formatTime(startEvent.startMs),
      sourceSpan: {
        ...clone(move.sourceSpan),
        startMs: startEvent.startMs,
        endMs: endEvent.startMs + endEvent.durationMs
      },
      sourceExcerpt: evidence.excerpt,
      sourceExcerptAudit: {
        sourceExact: evidence.sourceExact,
        wholeWordBoundaries: evidence.wholeWordBoundaries,
        tokenCount: evidence.tokenCount,
        characterCount: evidence.characterCount
      },
      attributionConfidence: move.attributionConfidence,
      audioVerified,
      quoteEligible: move.attributionConfidence === "high" || audioVerified,
      burdenContact: clone(move.burdenContact),
      response: {
        class: derivedClass,
        decisiveTargetIds: clone(move.response.decisiveTargetIds),
        components: clone(move.response.components),
        rationale: move.response.rationale,
        responsivenessWithinClass: clone(move.response.responsivenessWithinClass),
        responsiveness: {
          value: mapV4219Responsiveness(
            derivedClass,
            move.response.responsivenessWithinClass.value
          ),
          rationale: move.response.responsivenessWithinClass.rationale
        }
      },
      precisionFindings: clone(move.precisionFindings),
      calibrationFindings: clone(move.calibrationFindings),
      charity: clone(move.charity),
      ratings: clone(move.ratings),
      evidenceBasis: move.evidenceBasis,
      assessmentConfidence: move.assessmentConfidence
    };
  });
  assertV4(
    moves.length === scoreByMoveId.size && moves.every((move) => scoreByMoveId.has(move.moveId)),
    `${ledgerDebate.debateNumber}: final ledger and calculated move population differ`
  );

  const sections = raw.sections.map((section) => {
    const sectionScore = scoreDebate.final.sections.find(
      (item) => item.sectionId === section.sectionId
    );
    const sectionMoves = moves.filter((move) => move.sectionId === section.sectionId);
    const bySide = Object.fromEntries(
      ["pro", "con"].map((side) => [
        side,
        sectionMoves
          .filter((move) => move.side === side)
          .sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent)
      ])
    );
    const displayRows = Array.from(
      { length: Math.max(bySide.pro.length, bySide.con.length) },
      (_, index) => ({
        pro: bySide.pro[index]?.moveId ?? null,
        con: bySide.con[index]?.moveId ?? null
      })
    );
    const startMs = Math.min(...sectionMoves.map((move) => move.sourceSpan.startMs));
    const endMs = Math.max(...sectionMoves.map((move) => move.sourceSpan.endMs));
    assertV4(
      sectionScore && bySide.pro.length >= 1 && bySide.con.length >= 1 && displayRows.length <= 3,
      `${section.sectionId}: publication section invalid`
    );
    return {
      ...clone(section),
      timebox: `${formatTime(startMs)}–${formatTime(endMs)}`,
      score: {
        pro: sectionScore.sides.pro.score,
        con: sectionScore.sides.con.score
      },
      displayRows
    };
  });

  const transcriptHash = sourcePacket.sourceChain.transcriptSha256;
  const sourceNote =
    `Assessment based exclusively on the complete locally cached YouTube caption transcript and timestamped events (transcript SHA-256 ${transcriptHash}). Required below-high-confidence audio checks were completed before adjudication; representative quotations must be exact strings from quote-eligible locked source spans.`;
  const scoringNote =
    "Scores are AI-generated estimates of argumentative performance under the locked adjudicated-consensus workflow. Repository code calculated every move, section, and overall result once, only after two isolated judgments, required audio review, and disputed-field adjudication closed.";

  return {
    schemaVersion: CHECKPOINT_V22_PUBLICATION_PACKET_VERSION,
    protocolId: CHECKPOINT_V22_PUBLICATION_PROTOCOL_ID,
    debateNumber: ledgerDebate.debateNumber,
    debateId: ledgerDebate.debateId,
    productionCanary: true,
    stagingOnly: true,
    metadata: {
      title: production.title,
      label: production.label,
      date: renderDate,
      duration: production.duration,
      youtubeUrl: production.youtubeUrl,
      motion: sourcePacket.motion,
      sourceNote,
      scoringNote
    },
    sides: clone(production.sides),
    routes: clone(raw.routes),
    sections,
    moves,
    calculatedScores: {
      overall: clone(scoreDebate.final.overall),
      winner: scoreDebate.final.winner,
      winningMargin: scoreDebate.final.winningMargin,
      scoreProtocolId: scoreDebate.final.scoreProtocolId
    },
    sourceChain: clone(sourcePacket.sourceChain),
    publicationBoundary: {
      participantJudgmentClosed: true,
      participantJudgmentWasScoreBlind: true,
      adjudicationClosed: true,
      scoresLocked: true,
      ownDebateCalculatedScoresAvailableAsImmutableInputs: true,
      modelAuthorsNoIdentityStructureMoveOrScoreField: true,
      allLockedMovesMustReceiveProse: true,
      legacyAssessmentUnavailable: true,
      otherDebatesUnavailable: true,
      aiExtensionNeverScored: true
    },
    prohibitedInputs: [
      "legacy scores",
      "legacy critiques",
      "legacy tags",
      "legacy Overall Commentary",
      "legacy AI Extension",
      "other debates",
      "rankings",
      "winner comparisons"
    ]
  };
}
