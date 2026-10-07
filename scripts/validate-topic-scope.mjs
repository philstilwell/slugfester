import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../src/data/debates.js";
import { topicCategoryDefinitions, creatorTheismScopeNote } from "../src/data/topics.js";
import { initialPageContent } from "./lib/initial-page-content.mjs";
import { topicPath } from "../src/seo.js";

// Editorial boundary examples, not keyword classifiers or quotas for future debates.
const boundaryExamples = {
  "dembski-hitchens-good-god-existence-2010": "creator-arguments-theism",
  "boteach-hitchens-god-morality-2008": "creator-arguments-theism",
  "goff-oppy-finite-theism-naturalism-2026": "creator-arguments-theism",
  "rasmussen-oppy-ultimate-reality-naturalism-2020": "creator-arguments-theism",
  "swinburne-oppy-theism-probability-2022": "theism-naturalism-ultimate-reality",
  "mclatchie-oconnor-theism-naturalism-reality-2022": "theism-naturalism-ultimate-reality",
  "schmid-tomaszewski-divine-simplicity-2020": "divine-nature-attributes",
  "swinburne-huemer-theism-coherent-2026": "divine-nature-attributes",
  "craig-hitchens-god-existence-2009": "god-theism-atheism",
  "horn-barker-christian-god-2018": "christian-belief-doctrine",
  "loke-linford-physical-reality-cause-beginning-2023": "cosmological-arguments",
  "craig-oppy-mathematics-theism-2020": "science-design"
};
for (const [id, topic] of Object.entries(boundaryExamples)) {
  assert.equal(publishedDebates.find((debate) => debate.id === id)?.topicCategory, topic,
    `${id}: review the documented creator/theism category boundary before reassigning`);
}

assert.equal(topicPath("god-theism-atheism"), "/topics/god-theism-atheism/",
  "The renamed general category must preserve existing links");
assert.ok(initialPageContent("/topics/").includes(creatorTheismScopeNote),
  "The creator-only distinction must be readable without JavaScript");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
assert.ok(app.includes('class="topic-scope">${escapeHtml(creatorTheismScopeNote)}'),
  "The interactive index must use the same scope explanation");
for (const id of ["creator-arguments-theism", "theism-naturalism-ultimate-reality", "divine-nature-attributes"]) {
  const topic = topicCategoryDefinitions.find((item) => item.id === id);
  assert.ok(topic, `Missing category: ${id}`);
  const html = readFileSync(new URL(`..${topicPath(topic)}index.html`, import.meta.url), "utf8");
  for (const debate of publishedDebates.filter((item) => item.topicCategory === id)) {
    assert.ok(html.includes(`/debate/${debate.id}/`), `${id}: missing initial assessment link for ${debate.id}`);
  }
}
console.log("Validated creator-only/theism boundaries, stable links, and initial topic content.");
