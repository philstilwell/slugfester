#!/usr/bin/env node

import assert from "node:assert/strict";
import { occurrenceCount, uniqueEvidenceText } from "./lib/v361-evidence-context.mjs";

const excerpt = "I accepted the claim, then later I accepted the claim for a different reason.";
const first = { startChar: 0, endChar: 20, text: "I accepted the claim" };
const expanded = uniqueEvidenceText(excerpt, first);
assert.equal(occurrenceCount(excerpt, expanded), 1);
assert.ok(expanded.includes(first.text));
const uniqueText = "I accepted the claim for a different reason";
const uniqueStart = excerpt.indexOf(uniqueText);
assert.equal(uniqueEvidenceText(excerpt, { startChar: uniqueStart, endChar: uniqueStart + uniqueText.length, text: uniqueText }), uniqueText);
assert.throws(() => uniqueEvidenceText("same same", { startChar: 0, endChar: 4, text: "same" }, 4), /no unique word-boundary evidence window/);
console.log(JSON.stringify({ status: "passed", assertions: 4, expanded }, null, 2));
