#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

const root = "docs/calibration/v4.2.21.8/held-out-five";
const [sample, screening] = await Promise.all(
  ["source-only-sample.json", "sample-screening.json"].map((file) =>
    readFile(`${root}/${file}`, "utf8").then(JSON.parse)
  )
);
assert.equal(sample.status, "frozen-pending-route-metadata-screening");
assert.equal(screening.status, "held-out-five-screened-lane-preparation-authorized");
assert.equal(sample.debates.length, 5);
assert.equal(sample.audit.direct, 2);
assert.equal(sample.audit.partition, 3);
assert.ok(sample.audit.distinctTopicFamilies >= 4);
assert.equal(sample.audit.priorOrRejectedSampleOverlap, 0);
assert.equal(sample.audit.localTranscriptChainsPresent, 5);
assert.equal(screening.audit.routeReplayPassed, 5);
assert.equal(screening.authorization.partitionLaneDesign, true);
assert.equal(screening.authorization.primaryModelExecution, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 5,
      routeMix: { direct: 2, partition: 3 },
      distinctFamilies: sample.audit.distinctTopicFamilies,
      priorOverlap: 0,
      localTranscriptChains: 5,
      partitionLaneDesignAuthorized: true,
      modelContextsExecuted: 0,
      audioCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
