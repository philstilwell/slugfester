import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { assessmentGuide, debateSectionAnchor, relatedDebates } from "../src/data/reader-guides.js";
import { researchInsights, insightLink, renderInsightsContent } from "../src/data/insights.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const peopleCache = new Map();
const people = (debate) => {
  if (!peopleCache.has(debate.id)) {
    peopleCache.set(debate.id, [...new Map(["pro", "con"].flatMap((key) => avatarsForSpeakerText(debate.sides[key].speaker)).map((person) => [person.name, person])).values()]);
  }
  return peopleCache.get(debate.id);
};
const ids = new Set(debates.map((debate) => debate.id));
for (const debate of debates) {
  const guide = assessmentGuide(debate);
  assert.equal(guide.summary, debate.summary);
  assert.equal(guide.question, debate.motion);
  assert.equal(guide.gap, Math.abs(debate.score.pro - debate.score.con));
  assert.equal(guide.higherSide === null, debate.score.pro === debate.score.con);
  assert.equal(new Set(debate.sections.map((_, index) => debateSectionAnchor(index))).size, debate.sections.length);
  for (const side of guide.sides) {
    assert.equal(side.score, debate.score[side.key]);
    const sourceMoves = debate.sections.flatMap((section) => section.exchanges.map((exchange) => exchange[side.key]).filter(Boolean));
    assert(sourceMoves.includes(side.strongest.argument), `${debate.id}: missing source move`);
    assert.equal(side.strongest.argument.score, Math.max(...sourceMoves.map((move) => move.score)));
    assert.equal(debate.sections[side.strongest.sectionIndex], side.strongest.section);
    assert(side.strength && side.limitation, `${debate.id}: incomplete guide`);
    assert(side.strengthIsMove ? side.strongest.argument.critique.includes(side.strength) : debate.overall[side.key].strengths.includes(side.strength));
    assert(debate.overall[side.key].blunders.some((item) => (item.text || item) === side.limitation));
  }
  const related = relatedDebates(debate, debates, people);
  assert.equal(related.length, 3, `${debate.id}: needs three relevant suggestions`);
  assert.equal(new Set(related.map((item) => item.debate.id)).size, 3);
  assert.deepEqual(related, relatedDebates(debate, [...debates].reverse(), people));
  for (const item of related) {
    assert(ids.has(item.debate.id) && item.debate.id !== debate.id);
    assert.notEqual(new URL(item.debate.youtubeUrl).searchParams.get("v"), new URL(debate.youtubeUrl).searchParams.get("v"));
    const shared = people(item.debate).filter((person) => people(debate).some((other) => other.name === person.name));
    if (item.label === "A different matchup") assert(shared.length && item.reason.includes(shared[0].name));
    else assert.equal(item.debate.topicCategory, debate.topicCategory);
    if (item.label === "Hear other speakers") assert.equal(shared.length, 0);
  }
}

assert.equal(researchInsights.length, 7);
assert.equal(new Set(researchInsights.map((item) => item.id)).size, 7);
for (const item of researchInsights) {
  assert(item.explanation && item.limitation && item.reading && item.alt);
  assert(existsSync(`${root}output/pdf/${item.pdf}.pdf`));
  const image = readFileSync(`${root}assets/insights/${item.figure}.png`);
  const source = item.figure.startsWith("p3-") ? "direct-slogan-study-2026-09-04" : "astra-corpus-papers-2026-09-04";
  assert(image.equals(readFileSync(`${root}docs/analysis/${source}/figures/${item.figure}.png`)));
  assert.equal(image.readUInt32BE(16), item.width, `${item.figure}: width`);
  assert.equal(image.readUInt32BE(20), item.height, `${item.figure}: height`);
  for (const link of item.links) {
    if (link.id) assert(ids.has(link.id), `Unknown linked debate ${link.id}`);
    const url = new URL(insightLink(link), "https://slugfester.com");
    assert(existsSync(`${root}${url.pathname.slice(1)}index.html`), `Missing insight link ${url.pathname}`);
  }
}
const html = renderInsightsContent();
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert(html.includes("September 4, 2026") && html.includes("not representative"));
console.log(`Validated source-grounded introductions and three related suggestions for ${debates.length} debates, plus all seven research introductions and figures.`);
