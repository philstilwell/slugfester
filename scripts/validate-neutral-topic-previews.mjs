import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../src/data/debates.js";
import { debateSummaries } from "../src/data/debate-summaries.js";
import { topicPreviewText } from "../src/data/topic-preview.js";
import { initialPageContent } from "./lib/initial-page-content.mjs";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const initial = initialPageContent("/topics/");
const outcomeLanguage = /\b(?:wins|won|winner|loser|outperforms?|outperformed|prevails?|prevailed|victorious)\b/i;
for (const debate of publishedDebates) {
  const preview = topicPreviewText(debate);
  assert.ok(preview.trim(), `${debate.id}: empty topic preview`);
  assert.ok(preview.includes(debate.motion.trim()), `${debate.id}: preserve the debate question`);
  assert.ok(!outcomeLanguage.test(preview), `${debate.id}: remove outcome language from browsing copy`);
  assert.equal(topicPreviewText(debateSummaries.find((item) => item.id === debate.id)), preview,
    `${debate.id}: browser and initial previews must match`);
  assert.ok(initial.includes(escape(preview)), `${debate.id}: missing neutral initial preview`);
  assert.ok(!initial.includes(escape(debate.summary)), `${debate.id}: assessment summary leaked into topic browsing`);
}

const fixture = {
  motion: "Does God exist?",
  sections: [{ title: "Cosmic origins" }, { title: "Moral arguments" }, { title: "Religious experience" }],
  get summary() { throw new Error("Topic previews must not read verdict summaries"); },
  get score() { throw new Error("Topic previews must not read scores"); },
  get overall() { throw new Error("Topic previews must not read assessed strengths or weaknesses"); }
};
assert.equal(topicPreviewText(fixture), "Does God exist? Themes include: Cosmic origins; Moral arguments; Religious experience.");
assert.equal(topicPreviewText({ motion: "A sufficiently detailed debate question about cosmology, moral reasoning, historical evidence, and religious experience?", sections: [] }),
  "A sufficiently detailed debate question about cosmology, moral reasoning, historical evidence, and religious experience?");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const card = app.match(/^function renderTopicDebateCard\([\s\S]*?^}/m)?.[0];
assert.ok(card?.includes("escapeHtml(topicPreviewText(debate))"), "Use escaped neutral text in the hover/focus card");
assert.ok(!/debate\.(summary|score|overall)/.test(card), "Topic cards must not expose verdict fields");
assert.ok(!initial.includes("Scores assess the reasoning in this debate."), "Initial topic cards must not expose score comparisons");
console.log(`Validated neutral hover/focus and initial topic previews for ${publishedDebates.length} debates.`);
