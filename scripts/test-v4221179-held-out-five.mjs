#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = "docs/calibration/v4.2.21.17.9/new-held-out-five";
const [sample, screening] = await Promise.all(["source-only-sample.json", "sample-screening.json"].map((file) => readFile(`${root}/${file}`, "utf8").then(JSON.parse)));
assert.equal(sample.status, "frozen-pending-route-metadata-screening");
assert.equal(screening.status, "new-held-out-five-screened-source-preparation-authorized");
assert.equal(sample.debates.length, 5);
assert.equal(sample.audit.direct, 2);
assert.equal(sample.audit.partition, 3);
assert.equal(sample.audit.retiredPartitionThreeOverlap, 0);
assert(sample.audit.distinctTopicFamilies >= 4);
assert.equal(sample.selectionBoundary.transcriptContentSemanticallyInspected, false);
assert.equal(screening.sourceBoundary.transcriptContentSemanticallyInspected, false);
assert.deepEqual(sample.debates.filter((debate) => debate.route === "direct").map((debate) => debate.debateId).sort(), ["enoch-clarke-doane-moral-realism-objectivity-2026", "harris-oconnor-objective-morality-2024"]);
assert(screening.decisions.every((item) => item.classifierReplays && item.routeReplays && item.dyadic && item.transcriptChainPresent));
console.log(JSON.stringify({ status: "passed", debates: 5, direct: 2, partition: 3, distinctFamilies: sample.audit.distinctTopicFamilies, retiredPartitionThreeOverlap: 0, semanticTranscriptInspection: false, modelContexts: 0, audioCalls: 0, scoresDerived: 0, nextAuthorized: "source-packet-preparation" }, null, 2));
