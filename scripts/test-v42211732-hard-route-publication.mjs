#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V42211732_BYLINE, V42211732_DISCLOSURE, V42211732_OUTPUT_VERSION, V42211732_PROTOCOL_ID, V42211732_ROOT, buildV42211732PublicationSchema, compileV42211732PublicationPreview, validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";

const preparation = JSON.parse(await readFile(path.resolve(`${V42211732_ROOT}/preparation-manifest.json`), "utf8"));
assert.equal(preparation.status, "prepared-five-isolated-hard-route-publication-contexts");
assert.equal(preparation.contexts.length, 5);
assert.equal(preparation.totals.moves, 100);
assert.equal(preparation.totals.modelAuthoredScores, 0);

const words = (value) => String(value).trim().split(/\s+/).filter(Boolean).length;
function pad(prefix, target, token = "grounded") {
  const parts = prefix.trim().replace(/[.]$/, "").split(/\s+/).filter(Boolean);
  while (parts.length < target) parts.push(token);
  return `${parts.join(" ")}.`;
}
function critique() {
  return [
    pad("Strongest feature: The move presents a clear relevant inferential route from its locked proposition and source evidence", 28),
    pad("Principal limitation: Its warrant remains compressed at an important bridge and the record identifies a qualification or alternative that limits its force", 28),
    pad("Live burden: The participant still needs to defend that bridge compare the strongest live alternative and explain why the evidence completes the assigned route", 28),
    pad("Locked score: Those strengths and limitations fit the supplied performance band while withholding credit for support scope or engagement not established in the transcript", 28)
  ].join(" ");
}
const reference = { label: "Red herring", type: "fallacy", slug: "red-herring", context: pad("This label identifies a material diversion from the decisive issue already reflected in the locked assessment", 16) };
function firstExactWords(text, count = 6) {
  return text.trim().split(/\s+/).slice(0, count).join(" ");
}
function novelty(classification, sourceMoveIds) {
  return { classification, sourceMoveIds, explanation: pad("The novelty classification follows from comparison with the locked move inventory and its exposed limitations", 18) };
}
function extension(side, sideMoves) {
  const first = sideMoves[0].moveId, second = (sideMoves[1] ?? sideMoves[0]).moveId;
  return {
    thesis: { id: `${side}-thesis`, text: pad("The strengthened position should combine its strongest transcript route with explicit comparative limits and proportionate conclusions", 18), novelty: novelty("extends", [first]) },
    premises: Array.from({ length: 4 }, (_, index) => ({ id: `${side}-premise-${index + 1}`, text: pad(`Premise ${index + 1} develops a source grounded bridge while answering the strongest objection preserved in the assessment`, 18), novelty: novelty(index === 3 ? "repairs" : "extends", [index % 2 ? second : first]) })),
    conclusion: { id: `${side}-conclusion`, text: pad("The available considerations therefore support a measured conclusion only to the extent that these repaired premises withstand comparative scrutiny", 20), novelty: novelty("repairs", [first, second]) },
    newArguments: [
      { id: `${side}-new-1`, title: "Comparative prediction test", text: pad("A new comparative argument can specify what each position predicts before inspecting a disputed case, assign the relevant alternatives equal evidential scrutiny, and ask which framework better explains both expected successes and costly anomalies without adding assumptions only after contrary evidence appears", 52), novelty: novelty("introduces", []) },
      { id: `${side}-new-2`, title: "Cumulative bridge repair", text: pad("A second reinforcement can connect the strongest surviving transcript claims through an explicit cumulative bridge, state which premise carries the greatest uncertainty, and show how the conclusion weakens if that premise fails, thereby improving calibration without pretending that possibility alone establishes probability", 52), novelty: novelty("repairs", [first, second]) }
    ]
  };
}

function fixture(packet) {
  const sideMoves = Object.fromEntries(["pro", "con"].map((side) => [side, packet.moves.filter((move) => move.side === side)]));
  const quote = (side) => {
    const move = sideMoves[side].find((item) => item.quoteEligible);
    return { sourceMoveId: move.moveId, text: firstExactWords(move.sourceExcerpt), context: pad("This exact caption phrase appears in a locked high confidence source span and expresses a central part of the participant position", 22) };
  };
  return {
    schemaVersion: V42211732_OUTPUT_VERSION,
    protocolId: V42211732_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    completedAt: "2026-08-08T12:00:00Z",
    summary: pad("The adjudicated record gives one side the stronger overall case while preserving substantial arguments and unresolved burdens for both participants", 20),
    representativeQuotes: { pro: quote("pro"), con: quote("con") },
    moveProse: Object.fromEntries(packet.moves.map((move) => [move.moveId, { role: move.moveKind === "reply" ? "Major direct reply" : "Load-bearing constructive", words: pad("The participant advances the locked proposition through the supplied source span while preserving its original scope and argumentative purpose", 20), critique: critique(), tags: [] }])),
    overallCommentary: Object.fromEntries(["pro", "con"].map((side) => [side, { strengths: [pad("The side clearly advances a central burden through a source grounded inferential route", 14), pad("The side supplies a material response to an important challenge preserved in the locked record", 15), pad("The side maintains several useful qualifications that keep its conclusion proportionate to the evidence", 15)], blunders: [{ text: pad("The side sometimes diverts from a decisive burden and leaves an important comparative bridge insufficiently developed", 16), tags: [reference] }] }])),
    aiExtension: { aiGenerated: true, disclaimer: V42211732_DISCLOSURE, pro: extension("pro", sideMoves.pro), con: extension("con", sideMoves.con) },
    displayContract: { sectionTitle: "AI Extension", placement: "immediately-after-overall-commentary", defaultCollapsed: true, visualVariant: "ai-distinct", byline: V42211732_BYLINE, prohibitedLanguageScanPassed: true },
    audit: { lockedScoresUnchanged: true, everyMoveAuthoredOnce: true, legacyAssessmentUnavailable: true, aiMaterialExcludedFromScores: true, sourceOnlyQuoteSelection: true }
  };
}

let moves = 0;
for (const context of preparation.contexts) {
  const packet = JSON.parse(await readFile(path.resolve(context.packet), "utf8"));
  const schema = buildV42211732PublicationSchema(packet);
  const serializedSchema = JSON.stringify(schema);
  assert.equal(serializedSchema.includes('"overallScore"'), false);
  assert.equal(serializedSchema.includes('"winner"'), false);
  const output = fixture(packet);
  const validation = validateV42211732PublicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  assert.equal(validation.calculatedScoresAuthoredByModel, 0);
  const preview = compileV42211732PublicationPreview(output, packet);
  const compiledMoves = preview.sections.flatMap((section) => section.exchanges.flatMap((exchange) => [exchange.pro, exchange.con].filter(Boolean)));
  assert.equal(compiledMoves.length, packet.moves.length);
  assert.deepEqual(preview.score, { pro: packet.calculatedScores.overall.pro.score, con: packet.calculatedScores.overall.con.score });
  assert.equal(Boolean(preview.logicalExtension), true);
  const quoteMutation = structuredClone(output);
  quoteMutation.representativeQuotes.pro.text = "not present in the locked source excerpt";
  assert.throws(() => validateV42211732PublicationOutput(quoteMutation, packet));
  const noveltyMutation = structuredClone(output);
  noveltyMutation.aiExtension.pro.newArguments[0].novelty.sourceMoveIds = [packet.moves[0].moveId];
  assert.throws(() => validateV42211732PublicationOutput(noveltyMutation, packet));
  const languageMutation = structuredClone(output);
  languageMutation.aiExtension.pro.thesis.text += " This is unassailable.";
  assert.throws(() => validateV42211732PublicationOutput(languageMutation, packet));
  const coverageMutation = structuredClone(output);
  delete coverageMutation.moveProse[packet.moves[0].moveId];
  assert.throws(() => validateV42211732PublicationOutput(coverageMutation, packet));
  moves += packet.moves.length;
}
assert.equal(moves, 100);
assert.ok(words(critique()) >= 105 && words(critique()) <= 130);
console.log(JSON.stringify({ status: "passed", debates: 5, moves: 100, syntheticOutputsValidated: 5, allLockedScoresRepositoryOwned: true, exactQuoteMutationRejected: true, noveltyMutationRejected: true, prohibitedLanguageMutationRejected: true, moveCoverageMutationRejected: true, modelAuthoredScores: 0 }, null, 2));
