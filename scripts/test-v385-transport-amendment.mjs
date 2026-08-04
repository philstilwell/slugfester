#!/usr/bin/env node

import assert from "node:assert/strict";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";

const stderr = [
  "ordinary diagnostic mentioning resume without a stream",
  "\u001b[33mReconnecting... 1/5\u001b[0m",
  "response stream disconnected before completion; attempting resume",
  "stream recovered and output continued",
  "tool output: a speaker will resume the argument"
].join("\n");
assert.deepEqual(extractTransportEvents(stderr), [
  "Reconnecting... 1/5",
  "response stream disconnected before completion; attempting resume",
  "stream recovered and output continued"
]);
assert.equal(extractTransportEvents("plain resume\nreconnect later").length, 0);
assert.equal(classifyTransportEventCount(0, 2, 8), "clean");
assert.equal(classifyTransportEventCount(2, 2, 8), "clean");
assert.equal(classifyTransportEventCount(3, 2, 8), "recovered-degraded");
assert.equal(classifyTransportEventCount(8, 2, 8), "recovered-degraded");
assert.equal(classifyTransportEventCount(9, 2, 8), "invalid");
assert.throws(() => classifyTransportEventCount(-1, 2, 8));

console.log(JSON.stringify({ status: "passed", stderrOnlyExtractionVerified: true, genericResumeIgnored: true, ansiRemovalVerified: true, boundaryClassificationsVerified: [0, 2, 3, 8, 9] }, null, 2));
