import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { assessmentGuide, debateSectionAnchor, relatedDebates } from "../src/data/reader-guides.js";
import { researchEdition, researchInsights, insightLink, renderInsightsContent } from "../src/data/insights.js";
import { debateDisplayTitle, debateTitleWithYear } from "../src/seo.js";

const scopedTitle = Object.freeze({ title: "A vs B — Question? (2004, formal rounds)", year: 2004 });
assert.equal(debateDisplayTitle(scopedTitle), "A vs B — Question?");
assert.equal(debateTitleWithYear(scopedTitle), "A vs B — Question? · 2004");
assert.equal(scopedTitle.title, "A vs B — Question? (2004, formal rounds)");
assert.equal(debateDisplayTitle({ title: "Question? (2004)" }), "Question?");
assert.equal(debateDisplayTitle({ title: "Question? (a formal reply)" }), "Question? (a formal reply)");

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

assert.equal(researchInsights.length, 10);
assert.equal(new Set(researchInsights.map((item) => item.id)).size, 10);
for (const item of researchInsights) {
  assert(item.explanation && item.limitation && item.reading && item.alt);
  assert(existsSync(`${root}output/pdf/${item.pdf}.pdf`));
  const image = readFileSync(`${root}assets/insights/${item.figure}.png`);
  assert(image.equals(readFileSync(`${root}${(item.directory || researchEdition.directory).slice(1)}figures/${item.figure}.png`)));
  assert.equal(image.readUInt32BE(16), item.width, `${item.figure}: width`);
  assert.equal(image.readUInt32BE(20), item.height, `${item.figure}: height`);
  for (const link of item.links) {
    if (link.id) assert(ids.has(link.id), `Unknown linked debate ${link.id}`);
    const url = new URL(insightLink(link), "https://slugfester.com");
    assert(existsSync(`${root}${url.pathname.slice(1)}index.html`), `Missing insight link ${url.pathname}`);
  }
}
const html = renderInsightsContent();
const companion = researchInsights[0].companion;
assert.equal(companion.title, "Evidence, faith, and fair assessment");
const companionUrl = new URL(companion.href, "https://slugfester.com");
assert(existsSync(`${root}${companionUrl.pathname.slice(1)}`), "Missing Charts companion PDF");
assert(readFileSync(`${root}src/data/charts.js`, "utf8").includes(companion.href), "Insights must link to the current Charts PDF edition");
assert(companion.scope.includes("226 debates and 5,405 moves") && companion.scope.includes("234 overall-score comparisons"));
assert(companion.scope.includes("evidence alone") && companion.scope.includes("not an independent replication"));
const chartsExplanation = JSON.parse(readFileSync(`${root}docs/charts/evidence-explanation-2026-10-08/analysis.json`));
const evidenceMeans = chartsExplanation.all.dimensionMeans.find(d => d.key === "evidenceWarrant").values;
assert(companion.scope.includes(`${chartsExplanation.included} debates and ${chartsExplanation.uniqueMoves.toLocaleString("en-US")} moves`));
for (const mean of evidenceMeans) assert(companion.scope.includes(mean.toFixed(1)));
assert(companion.scope.includes(`${(evidenceMeans[1] - evidenceMeans[0]).toFixed(1)}-point gap`));
assert(html.includes(companion.href) && html.includes("Related reading from Charts"));
const methodsHtml = readFileSync(`${root}insights/data-and-methods/index.html`, "utf8");
assert(methodsHtml.includes(companion.href) && methodsHtml.includes("tentatively judges this more likely to contribute"));
assert.equal((html.match(/<h1>/g) || []).length, 1);
assert(html.includes(researchEdition.date) && html.includes("not representative"));
assert(html.includes("no newer transcripts were reviewed for slogans"), "Historical slogan scope must remain explicit");
const plainLanguageChecks = [
  ["score-gap", /Support: how well evidence and reasons justify a claim/, /where the points differ, not why/],
  ["topic-differences", /another topic often leads when the mix of debates changes/, /do not show that the topic itself causes/],
  ["slogans", /‘protected slogan’ means/, /do not identify a slogan/],
  ["con-role", /PRO supports the debate’s stated claim; CON opposes it/, /not proof that taking CON raises a person’s score/],
  ["fallacy-count", /the lower-scoring side has no named logical-fallacy label/, /A missing label does not prove/],
  ["same-scale", /an 80 under one procedure represents the same quality as an 80 under another/, /different performances on different topics/],
  ["ranking-confidence", /31 people with at least six assessed debates/, /someone in fifth place reliably outperforms someone in sixth/]
];
for (const [id, ...patterns] of plainLanguageChecks) {
  const item = researchInsights.find(insight => insight.id === id);
  const text = [item.finding, item.explanation, item.detail, item.limitation].join(" ");
  for (const pattern of patterns) assert.match(text, pattern, `${id}: preserve a concrete explanation and its scope`);
  assert(item.reading.length > 150, `${id}: retain the plain-language chart guide`);
}
assert(!html.includes("well-represented speakers") && !html.includes("broad comparisons of recorded performance"));
const results = JSON.parse(readFileSync(`${root}${researchEdition.directory.slice(1)}results.json`));
const papers = [
  ...JSON.parse(readFileSync(`${root}${researchEdition.directory.slice(1)}publication-manifest.json`)),
  ...JSON.parse(readFileSync(`${root}docs/analysis/argument-structure-studies-2026-10-09/publication-manifest.json`))
];
assert.equal(results.counts.published, researchEdition.counts.published);
assert.equal(results.p7.ranked_speakers, researchEdition.ranked);
assert.equal(researchInsights[0].statistic, `${results.p1.gap.mean.toFixed(2)} points`);
for (const [i, item] of researchInsights.entries()) {
  assert.equal(item.pages, papers[i].pages);
  assert.equal(item.figures, papers[i].figures);
  assert(item.version.startsWith("20261009"));
}
const extensions = researchInsights.slice(7);
assert.deepEqual(extensions.map(item => item.id), ["answering-arguments", "creator-to-god", "opponent-context"]);
for (const item of extensions) {
  assert(html.includes(`id="${item.id}"`) && methodsHtml.includes(`id="${item.id}"`));
  for (const file of item.files) {
    assert(existsSync(`${root}${item.directory.slice(1)}${file}`), `Missing source file: ${file}`);
    assert(methodsHtml.includes(`${item.directory}${file}`), `Missing study-specific download: ${file}`);
  }
}
const extensionResults = JSON.parse(readFileSync(`${root}${extensions[0].directory.slice(1)}results.json`));
assert.equal(extensions[0].statistic, `${(100 * extensionResults.reply_graph.reply_to_reply_edges / extensionResults.reply_graph.edges).toFixed(1)}%`);
assert(extensions[0].limitation.includes("not to measure how often"));
assert(extensions[1].limitation.includes("not a census"));
assert(extensions[2].detail.includes("12 same-procedure repeat groups"));
assert(extensions[2].limitation.includes("not causal effects"));
const backendHtml = readFileSync(`${root}backend/index.html`, "utf8");
for (const item of extensions) assert(backendHtml.includes(`/output/pdf/${item.pdf}.pdf`));
console.log(`Validated source-grounded introductions and three related suggestions for ${debates.length} debates, plus all ${researchInsights.length} research introductions and figures.`);
