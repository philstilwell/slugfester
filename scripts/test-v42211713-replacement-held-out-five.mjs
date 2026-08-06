#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/calibration/v4.2.21.17.13/replacement-held-out-five";
const sample = JSON.parse(await readFile(`${ROOT}/source-only-sample.json`, "utf8"));
assert.equal(sample.status, "frozen-pending-route-metadata-screening");
assert.equal(sample.debates.length, 5);
assert.equal(sample.audit.direct, 2);
assert.equal(sample.audit.partition, 3);
assert.equal(sample.audit.failedFiveOverlap, 0);
assert(sample.audit.distinctTopicFamilies >= 4);
assert(sample.audit.distinctDurationBins >= 2);
assert(sample.audit.distinctCaptionKinds >= 1);
assert.equal(new Set(sample.debates.map((debate) => debate.debateId)).size, 5);
assert(sample.debates.every((debate) => !sample.exclusions.failedDebateIds.includes(debate.debateId)));
assert.equal(sample.authorization.modelExecution, false);
assert.equal(sample.authorization.scoreDerivation, false);
const screeningPath = `${ROOT}/sample-screening.json`;
if (await access(screeningPath).then(() => true, () => false)) {
  const screening = JSON.parse(await readFile(screeningPath, "utf8"));
  assert.equal(screening.status, "replacement-held-out-five-screened-source-preparation-authorized");
  assert.equal(screening.audit.failedFiveOverlap, 0);
  assert.equal(screening.audit.classifierReplayPassed, 5);
  assert.equal(screening.audit.routeReplayPassed, 5);
  assert.equal(screening.audit.dyadic, 5);
  assert.equal(screening.audit.transcriptChainsPresent, 5);
  assert.equal(screening.authorization.sourcePacketPreparation, true);
  assert.equal(screening.authorization.modelExecution, false);
}
console.log(JSON.stringify({
  status: "passed",
  debates: 5,
  direct: 2,
  partition: 3,
  distinctFamilies: sample.audit.distinctTopicFamilies,
  distinctDurationBins: sample.audit.distinctDurationBins,
  distinctCaptionKinds: sample.audit.distinctCaptionKinds,
  distinctPartitionSeverityBins: sample.audit.distinctPartitionSeverityBins,
  failedFiveOverlap: 0,
  semanticTranscriptInspection: false,
  modelContexts: 0,
  scoresDerived: 0,
}, null, 2));
