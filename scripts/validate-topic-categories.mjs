import assert from "node:assert/strict";
import { debates, publishedDebates } from "../src/data/debates.js";
import { debateSummaries } from "../src/data/debate-summaries.js";
import { topicCategoryDefinitions, topicCategoryIds } from "../src/data/topics.js";
import { primaryTopicAssignments, withPrimaryTopic } from "../src/data/topic-assignments.js";

assert.equal(topicCategoryDefinitions.length, topicCategoryIds.size, "Topic IDs must be unique");
const records = new Map(debates.map((debate) => [debate.id, debate]));
const summaries = new Map(debateSummaries.map((debate) => [debate.id, debate]));
assert.equal(summaries.size, publishedDebates.length, "Regenerate the public catalogue");

for (const [id, category] of Object.entries(primaryTopicAssignments)) {
  assert.ok(records.has(id), `Unknown debate in editorial topic assignments: ${id}`);
  assert.ok(topicCategoryIds.has(category), `Unknown editorial category for ${id}: ${category}`);
}

for (const debate of publishedDebates) {
  assert.ok(topicCategoryIds.has(debate.topicCategory), `${debate.id}: missing or invalid primary topic`);
  assert.equal(summaries.get(debate.id)?.topicCategory, debate.topicCategory,
    `${debate.id}: generated primary topic is stale`);
  // Editorial categorization must never change the underlying assessment.
  const original = records.get(debate.id);
  const { topicCategory: before, ...originalContent } = original;
  const { topicCategory: after, ...categorizedContent } = withPrimaryTopic(original);
  assert.deepEqual(categorizedContent, originalContent, `${debate.id}: assessment content changed`);
}

assert.throws(() => withPrimaryTopic({ id: "unassigned-debate", label: "God and resurrection" }),
  /explicit, recognized primary topic/, "Keywords must not supply a primary category");
assert.throws(() => withPrimaryTopic({ id: "invalid-category", topicCategory: "unknown" }),
  /explicit, recognized primary topic/);

console.log(`Validated explicit primary categories for ${publishedDebates.length} debates across ${topicCategoryIds.size} categories.`);
