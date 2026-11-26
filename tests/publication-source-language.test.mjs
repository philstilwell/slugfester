import { test } from "node:test";
import assert from "node:assert/strict";
import { hasInternalDebateMetadata } from "../scripts/lib/publication-source-language.mjs";
import { readerScopeLanguage } from "../scripts/lib/reader-scope-language.mjs";
import { readerCritiqueText, readerArgumentRole, renderCritiqueText, critiqueLabels, hasStructuredCritique } from "../src/data/critique-format.js";
import { assessmentGuide } from "../src/data/reader-guides.js";
import { publishedDebates } from "../src/data/debates.js";

test("reader scope states coverage directly and preserves every qualification", () => {
  const scope = "this assessment covers only the main conversation, approximately 05:29–1:16:07. Audience questions are excluded; neither debater receives credit or penalty for them.";
  assert.equal(readerScopeLanguage(`By explicit editorial approval, ${scope}`), `This assessment${scope.slice("this assessment".length)}`);
  const exclusion = "Andrés Roemer’s substantive interventions and their directly dependent replies are excluded.";
  const readable = "Andrés Roemer’s contributions to the argument and their directly dependent replies are excluded.";
  assert.equal(readerScopeLanguage(`Independent exchanges are assessed. By explicit editorial approval, ${exclusion}`), `Independent exchanges are assessed. ${readable}`);
  assert.equal(readerScopeLanguage(readable), readable);
});

test("reader formatting distinguishes process jargon from the substance of an argument", () => {
  assert.equal(readerCritiqueText("Locked score: The fixed 84 rewards a relevant reply."), "Locked score: The score of 84 rewards a relevant reply.");
  const substance = "The locked-room account, canonical texts, provenance and the fixed 42 parameters remain disputed.";
  assert.equal(readerCritiqueText(substance), substance);
  assert.equal(readerArgumentRole("Load-bearing constructive"), "Central argument for this side");
  assert.equal(readerArgumentRole("Historical reply"), "Historical reply");
  const html = renderCritiqueText("Live burden: The objection still needs evidence. Locked score: The fixed 84 rewards relevance.");
  assert(html.includes("<strong>What remains to be shown:</strong>"));
  assert(html.includes("<strong>Why this score:</strong>"));
  assert(html.includes("The objection still needs evidence."));
});

test("new critique headings validate and render like legacy headings without changing assessment content", () => {
  const original = publishedDebates.flatMap(d => d.sections.flatMap(s => s.exchanges.flatMap(e => [e.pro, e.con].filter(Boolean))))
    .find(a => hasStructuredCritique(a.critique));
  assert(original, "Need an authentic four-sentence critique");
  const clearer = Object.entries(critiqueLabels).reduce((text, [old, next]) => text.replace(old, next), original.critique);
  assert(hasStructuredCritique(original.critique));
  assert(hasStructuredCritique(clearer));
  assert(hasStructuredCritique(clearer, { labels: Object.values(critiqueLabels) }));
  assert(!hasStructuredCritique(original.critique, { labels: Object.values(critiqueLabels) }), "New contracts must reject old headings");
  assert.equal(renderCritiqueText(clearer), renderCritiqueText(original.critique));
  for (const invalid of [
    clearer.replace("Main limitation:", "Principal limitation:"),
    clearer.replace("Main strength:", "Main limitation:"),
    clearer.replace("Why this score:", ""),
    clearer.replace("Why this score:", "Main strength: Duplicate. Why this score:"),
    clearer + " An extra sentence.",
    clearer.slice(0, -1)
  ]) assert(!hasStructuredCritique(invalid), "Malformed, mixed or incomplete headings must fail");
  const debate = publishedDebates.find(d => d.sections.some(s => s.exchanges.some(e => [e.pro, e.con].filter(Boolean).some(a => hasStructuredCritique(a.critique)))));
  const updated = structuredClone(debate);
  for (const section of updated.sections) for (const exchange of section.exchanges) for (const card of [exchange.pro, exchange.con].filter(Boolean)) {
    card.critique = Object.entries(critiqueLabels).reduce((text, [old, next]) => text.replace(old, next), card.critique);
  }
  const extract = d => assessmentGuide(d).sides.map(({ strength, strengthIsMove, score }) => ({ strength, strengthIsMove, score }));
  assert.deepEqual(extract(updated), extract(debate), "Brief assessment strengths and scores must survive the new headings");
});

test("reader copy preserves every numeric fact and all quoted critique passages across the catalogue", () => {
  const numbers = text => (String(text).match(/\d+(?:[.:]\d+)*/g) || []).sort();
  const quotations = text => String(text).match(/“[^”]*”|"[^"]*"/g) || [];
  const before = JSON.stringify(publishedDebates);
  for (const debate of publishedDebates) {
    for (const field of ["sourceNote", "scoringNote"]) {
      assert.deepEqual(numbers(readerScopeLanguage(debate[field])), numbers(debate[field]), `${debate.id}: ${field} numbers`);
    }
    for (const section of debate.sections) for (const exchange of section.exchanges) {
      for (const argument of [exchange.pro, exchange.con].filter(Boolean)) {
        const text = readerCritiqueText(argument.critique);
        assert.deepEqual(numbers(text), numbers(argument.critique), `${debate.id}: critique numbers`);
        assert.deepEqual(quotations(text), quotations(argument.critique), `${debate.id}: quoted critique text`);
      }
    }
  }
  assert.equal(JSON.stringify(publishedDebates), before, "Presentation must not mutate the assessment records");
});

test("browser data retains every assessment field apart from the reader-facing notes", async () => {
  for (const original of publishedDebates) {
    const { debate } = await import(`../src/data/debate-details/${original.id}.js`);
    const { assessmentScopeDisclosure, ...record } = debate;
    const { assessmentScopeDisclosure: originalDisclosure, ...originalRecord } = original;
    if (originalDisclosure) assert.equal(assessmentScopeDisclosure, readerScopeLanguage(originalDisclosure));
    assert.deepEqual(record, {
      ...originalRecord,
      sourceNote: readerScopeLanguage(original.sourceNote),
      scoringNote: readerScopeLanguage(original.scoringNote)
    }, original.id);
  }
});

const disclosure = "Automatic captions were supplemented by targeted automated audio checks; this was not direct human listening.";
const equivalentDisclosure = "Automatic captions were supplemented by targeted automated audio checks, not direct human listening.";
const publicCaptionDisclosure = "Public automatic captions were supplemented by targeted automated audio checks; these were not direct human listening.";
const supplementaryDisclosure = "The source uses automatic captions and supplementary automated audio checks where available; no direct human listening is claimed.";
const boundedDisclosures = [
  "Public automatic captions were supplemented by five targeted automated audio checks; these were not direct human listening.",
  "One long automated audio check ended before its clip ended; no independent audio verification is claimed beyond the text actually returned."
];

test("bounded source-quality disclosures preserve field and surrounding-text restrictions", () => {
  for (const note of boundedDisclosures) {
    assert.equal(hasInternalDebateMetadata(note, "sourceNote"), false);
    assert.equal(hasInternalDebateMetadata(`Formal rounds only. ${note}`, "sourceNote"), false);
    assert.equal(hasInternalDebateMetadata(`${note} SHA-256`, "sourceNote"), true);
    assert.equal(hasInternalDebateMetadata(`${note} audio check`, "sourceNote"), true);
    assert.equal(hasInternalDebateMetadata(note, "summary"), true);
  }
  assert.equal(hasInternalDebateMetadata(boundedDisclosures[0].replace("not direct human listening", "direct human listening"), "sourceNote"), true);
  assert.equal(hasInternalDebateMetadata(boundedDisclosures[1].replace("no independent audio verification", "independent audio verification"), "sourceNote"), true);
});

test("reader source note may accurately disclose automated audio verification", () => {
  assert.equal(hasInternalDebateMetadata(disclosure, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(`Assessed discussion only. ${disclosure} Audience questions excluded.`, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(equivalentDisclosure, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(`Assessed discussion only. ${equivalentDisclosure} Audience questions excluded.`, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(publicCaptionDisclosure, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(`Assessed discussion only. ${publicCaptionDisclosure} Audience questions excluded.`, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(supplementaryDisclosure, "sourceNote"), false);
  assert.equal(hasInternalDebateMetadata(`Assessed discussion only. ${supplementaryDisclosure} Audience questions excluded.`, "sourceNote"), false);
});

test("source disclosure does not exempt internal metadata or other fields", () => {
  for (const internal of ["SHA-256", ".assessment-cache/source", "locally cached", "timestamped events", "below-high-confidence", "audio check", "audio checks", "adjudicated-consensus", "disputed-field adjudication", "quote-eligible", "locked source spans", "repository code", "isolated judgments", "source-exact", "manifest.json", "transcript.txt", "events.json"]) {
    assert.equal(hasInternalDebateMetadata(internal, "sourceNote"), true, internal);
    assert.equal(hasInternalDebateMetadata(`${disclosure} ${internal}`, "sourceNote"), true, internal);
    assert.equal(hasInternalDebateMetadata(`${equivalentDisclosure} ${internal}`, "sourceNote"), true, internal);
    assert.equal(hasInternalDebateMetadata(`${publicCaptionDisclosure} ${internal}`, "sourceNote"), true, internal);
    assert.equal(hasInternalDebateMetadata(`${supplementaryDisclosure} ${internal}`, "sourceNote"), true, internal);
  }
  for (const field of ["summary", "critique", "text", "context", "sourceNoteExtra", undefined]) {
    assert.equal(hasInternalDebateMetadata(disclosure, field), true, String(field));
    assert.equal(hasInternalDebateMetadata(equivalentDisclosure, field), true, String(field));
    assert.equal(hasInternalDebateMetadata(publicCaptionDisclosure, field), true, String(field));
    assert.equal(hasInternalDebateMetadata(supplementaryDisclosure, field), true, String(field));
  }
  assert.equal(hasInternalDebateMetadata(disclosure.replace("not direct human listening", "direct human listening"), "sourceNote"), true);
  assert.equal(hasInternalDebateMetadata(equivalentDisclosure.replace("not direct human listening", "direct human listening"), "sourceNote"), true);
  assert.equal(hasInternalDebateMetadata(publicCaptionDisclosure.replace("not direct human listening", "direct human listening"), "sourceNote"), true);
  assert.equal(hasInternalDebateMetadata(supplementaryDisclosure.replace("no direct human listening", "direct human listening"), "sourceNote"), true);
});
