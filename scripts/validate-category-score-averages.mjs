import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../src/data/debates.js";
import { debateSummaries } from "../src/data/debate-summaries.js";
import { debateAnalytics } from "../src/data/debate-analytics.js";
import { topicCategoryDefinitions } from "../src/data/topics.js";

// Exercise the browser's actual aggregation and markup against the source scores.
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const names = ["topicGroupsForDebates", "reasoningTagDistribution", "renderReasoningTopicRow", "formatTagRate", "formatAverageScore"];
const functions = names.map((name) => {
  const source = app.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}`, "m"))?.[0];
  assert.ok(source, `Missing category average dependency: ${name}`);
  return source;
}).join("\n");
const escaping = app.match(/^const escapeHtml =[\s\S]*?;\n/m)?.[0];
const fallback = app.match(/^const fallbackTopicCategory =[\s\S]*?^};/m)?.[0];
assert.ok(escaping && fallback, "Missing category rendering helpers");
const evaluate = new Function("debates", "topicCategoryDefinitions", `${escaping}\n${fallback}\n${functions}\nreturn {
  topics: reasoningTagDistribution(), render: renderReasoningTopicRow
};`);
const browserDebates = debateSummaries.map((debate) => ({ ...debate, ...debateAnalytics[debate.id] }));
const { topics, render } = evaluate(browserDebates, topicCategoryDefinitions);

for (const topic of topics) {
  const sources = publishedDebates.filter((debate) => debate.topicCategory === topic.id);
  assert.equal(topic.debates, sources.length, `${topic.id}: primary-category scope`);
  const expected = sources.reduce((sum, debate) => sum + debate.score.pro + debate.score.con, 0) / (sources.length * 2);
  assert.equal(topic.averageScore, expected, `${topic.id}: both sides must have equal weight`);
  const summaries = sources.flatMap((debate) => Object.values(debateAnalytics[debate.id].tagSummary));
  for (const key of ["scoredMoves", "fallacies", "biases"]) {
    assert.equal(topic[key], summaries.reduce((sum, side) => sum + side[key], 0), `${topic.id}: ${key} unchanged`);
  }
  const html = render(topic, 100);
  assert.ok(html.includes(`scored moves · <b class="reasoning-topic-average">Avg. score ${expected.toFixed(1).replace(/\.0$/, "")}</b>`));
}
assert.equal(topics.reduce((sum, topic) => sum + topic.debates, 0), publishedDebates.length);

const category = topicCategoryDefinitions[0].id;
const fixture = (score, scoredMoves = 0) => ({
  topicCategory: category, score,
  tagSummary: { pro: { scoredMoves, fallacies: 0, biases: 0 } }
});
const synthetic = evaluate([
  fixture({ pro: 70, con: 90 }, 100),
  { ...fixture({ pro: 80, con: 85 }, 1), interlocutorRankingEligible: false }
], topicCategoryDefinitions).topics[0];
assert.equal(synthetic.averageScore, 81.25, "Neither move counts nor ranking eligibility may reweight category averages");
assert.ok(render(synthetic, 0).includes("Avg. score 81.3"));
const zero = evaluate([fixture({ pro: 0, con: 0 })], topicCategoryDefinitions).topics[0];
assert.equal(zero.averageScore, 0);
assert.ok(render(zero, 0).includes("Avg. score 0"));
const missing = evaluate([fixture({})], topicCategoryDefinitions).topics[0];
assert.equal(missing.averageScore, null);
assert.ok(!render(missing, 0).includes("Avg. score"));
assert.deepEqual(evaluate([], topicCategoryDefinitions).topics, []);
console.log(`Validated ${topics.length} category averages against ${publishedDebates.length} published scorecards, plus weighting and missing-score safeguards.`);
