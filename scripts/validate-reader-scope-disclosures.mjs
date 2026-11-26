import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates } from "../src/data/debates.js";
import { readerScopeLanguage } from "./lib/reader-scope-language.mjs";

const registry = JSON.parse(readFileSync(new URL("../docs/assessment-production/standalone-debates-v1/registry.json", import.meta.url)));
let checked = 0;
for (const record of registry.debates.filter((record) => record.readerScopeDisclosurePath)) {
  assert.equal(record.readerScopeDisclosurePath, `${record.root}/source/reader-scope-disclosure.json`);
  const disclosure = JSON.parse(readFileSync(new URL(`../${record.readerScopeDisclosurePath}`, import.meta.url)));
  const debate = publishedDebates.find((item) => item.id === record.debateId);
  assert(debate, `${record.debateId}: disclosure has no published debate`);
  const identityMatches = disclosure.debateId === debate.id || (
    disclosure.debateId === undefined && disclosure.debateNumber === debate.number &&
    disclosure.videoId === record.videoId &&
    disclosure.videoId === new URL(debate.youtubeUrl).searchParams.get("v")
  );
  assert(identityMatches, `${debate.id}: reader disclosure identity must match the registered debate`);
  assert.equal(disclosure.debateNumber, debate.number);
  assert.equal(typeof disclosure.requiredReaderDisclosure, "string");
  assert(disclosure.requiredReaderDisclosure.trim());
  assert(debate.sourceNote.includes(disclosure.requiredReaderDisclosure));
  const { debate: browserDetail } = await import(new URL(`../src/data/debate-details/${debate.id}.js`, import.meta.url));
  assert.equal(browserDetail.assessmentScopeDisclosure, readerScopeLanguage(disclosure.requiredReaderDisclosure),
    `${debate.id}: the approved source and scope notice is missing from the browser page data`);
  assert.equal(browserDetail.sourceNote, readerScopeLanguage(debate.sourceNote),
    `${debate.id}: the public source note must preserve the assessment scope`);
  checked += 1;
}
console.log(`Validated ${checked} explicitly registered reader-facing source and scope disclosure${checked === 1 ? "" : "s"}.`);
