import { test } from "node:test";
import assert from "node:assert/strict";
import { hasInternalDebateMetadata } from "../scripts/lib/publication-source-language.mjs";

const disclosure = "Automatic captions were supplemented by targeted automated audio checks; this was not direct human listening.";
const equivalentDisclosure = "Automatic captions were supplemented by targeted automated audio checks, not direct human listening.";
const publicCaptionDisclosure = "Public automatic captions were supplemented by targeted automated audio checks; these were not direct human listening.";
const supplementaryDisclosure = "The source uses automatic captions and supplementary automated audio checks where available; no direct human listening is claimed.";

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
