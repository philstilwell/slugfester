import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";
import { debatePath, interlocutorPath } from "../src/seo.js";
import { initialPageContent } from "./lib/initial-page-content.mjs";
import { renderAssessmentProcessGuide } from "../src/data/assessment-process-guide.js";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const read = (path) => readFileSync(new URL(`..${path}index.html`, import.meta.url), "utf8");
const people = new Map();
for (const debate of debates) {
  const html = read(debatePath(debate));
  assert(html.includes(initialPageContent(debatePath(debate))), `Stale initial assessment: ${debate.id}`);
  assert(html.includes(escape(debate.motion)), `Missing debate question: ${debate.id}`);
  for (const section of debate.sections) assert(html.includes(escape(section.title)), `Missing section: ${debate.id}`);
  for (const key of ["pro", "con"]) {
    for (const text of debate.overall?.[key]?.strengths || []) assert(html.includes(escape(text)), `Missing strength: ${debate.id}`);
    for (const person of avatarsForSpeakerText(debate.sides[key].speaker)) people.set(person.name, person);
  }
}
for (const person of people.values()) assert(read(interlocutorPath(person)).includes(initialPageContent(interlocutorPath(person))), `Incomplete initial profile: ${person.name}`);
for (const path of ["/", "/search/", "/topics/", "/rankings/", "/backend/"]) assert(read(path).includes(initialPageContent(path)));
const search = read("/search/");
const backend = read("/backend/");
const guide = renderAssessmentProcessGuide();
assert(backend.includes(guide), "Backend must include the complete infographic and text before JavaScript");
assert.equal((guide.match(/<figure /g) || []).length, 3, "All three infographic panels must be present");
assert.equal((guide.match(/<li><h3>/g) || []).length, 10, "Text version must explain all ten stages");
assert(!/<details[^>]*\sopen(?:\s|>)/.test(guide), "Text version should be closed by default");
for (let panel = 1; panel <= 3; panel += 1) {
  assert(readFileSync(new URL(`../assets/assessment-process/panel-${panel}.webp`, import.meta.url)).length > 0);
}
assert(readFileSync(new URL("../assets/assessment-process/slugfester-assessment-process.pdf", import.meta.url)).subarray(0, 5).toString() === "%PDF-");
const topics = read("/topics/");
for (const debate of debates) {
  assert(search.includes(escape(debate.summary)), `Missing catalogue summary: ${debate.id}`);
  assert(topics.includes(escape(debate.summary)), `Missing topic summary: ${debate.id}`);
}
console.log(`Validated substantive initial text for ${debates.length} debates and ${people.size} profiles, plus catalogue, topics, rankings and method pages.`);
