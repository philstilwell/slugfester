#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { classifyV4220Motion } from "./lib/v4220-source-classification.mjs";

const cases = [
  ["Do Jesus' teachings and the West's moral transformation point to objective moral truths grounded beyond human preference, or can morality be explained as historically shaped human inclination without divine grounding?", "morality-ethics"],
  ["Does evil and objective morality point to God, or can agnostic atheism explain moral experience without accepting a divine moral ground?", "evil-hiddenness"],
  ["Can God's existence be established through contingency, religious experience, or moral obligation?", "morality-ethics"],
  ["Is consciousness the ontological foundation of reality rather than an emergent property of matter?", "mind-agency"],
  ["Is the bodily resurrection of Jesus historically established by the New Testament evidence?", "resurrection-history"],
  ["Does cosmic fine-tuning make a divine explanation of the universe probable?", "science-origins"],
  ["Does God exist?", "general-theism-religion"]
];
for (const [motion, expected] of cases) assert.equal(classifyV4220Motion(motion), expected);
console.log(JSON.stringify({ status: "passed", cases: cases.length, moralityPrecedesBroadHistoricalLanguage: true, evilPrecedesEmbeddedMoralLanguage: true }, null, 2));
