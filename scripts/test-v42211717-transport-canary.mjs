#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/calibration/v4.2.21.17.17/transport-canary";
const manifest = JSON.parse(await readFile(`${ROOT}/canary-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-one-retired-transport-canary-authorized");
assert.equal(manifest.retiredEvidenceOnly, true);
assert.equal(manifest.executionPolicy.attempts, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMs, 300000);
assert.equal(manifest.schema.candidateStartOwnedCoreBounds, true);
assert.equal(manifest.schema.candidateEndAvailableContextBounds, true);
assert.equal(manifest.schema.speakerAllowlist.length, 2);
assert.equal(manifest.authorization.freshHeldOutExecution, false);
assert.equal(manifest.authorization.scoreDerivation, false);
const schema = JSON.parse(await readFile(manifest.schema.path, "utf8"));
assert.deepEqual(schema.properties.candidates.items.properties.speaker.enum, manifest.schema.speakerAllowlist);
const span = schema.properties.candidates.items.properties.sourceSpan.properties;
assert.equal(span.startEvent.minimum, manifest.source.coreStartEvent);
assert.equal(span.startEvent.maximum, manifest.source.coreEndEvent);
assert.equal(span.endEvent.minimum, manifest.source.contextStartEvent);
assert.equal(span.endEvent.maximum, manifest.source.contextEndEvent);

if (await access(manifest.artifacts.execution).then(() => true, () => false)) {
  const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
  assert.equal(execution.attemptCount, 1);
  assert.equal(execution.retryCount, 0);
  assert.equal(execution.meteredApiCostUsd, 0);
  assert.equal(execution.transcriptionCostUsd, 0);
  if (execution.status === "retired-transport-canary-passed") {
    assert.equal(execution.accepted, true);
    assert.equal(execution.authorization.rampedHeldOutLaunch, true);
    assert.equal(execution.resultSha256 !== null, true);
  } else {
    assert.equal(execution.authorization.rampedHeldOutLaunch, false);
  }
}
console.log(JSON.stringify({
  status: "passed",
  retiredEvidenceOnly: true,
  realDiscoverySchema: true,
  ownershipBounds: true,
  speakerAllowlist: true,
  attempts: 1,
  retries: 0,
  timeoutMinutes: 5,
  scoresDerived: 0,
}, null, 2));
