#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";

const FAILURE = "docs/calibration/v4.2.21.17.16/discovery-transport-attribution-hardening/failure-analysis.json";
const failure = JSON.parse(await readFile(FAILURE, "utf8"));
assert.equal(failure.observed.openingBatchTimeouts, 4);
assert.equal(failure.observed.laterContexts, 14);
assert.equal(failure.observed.laterValidContexts, 13);
assert.deepEqual(failure.transportDiagnosis.correction.schedulerRamp, [1, 2, 4]);
assert.equal(failure.transportDiagnosis.correction.retiredStructuredOutputCanaryRequiredBeforeHeldOutLaunch, true);
assert.equal(failure.transportDiagnosis.correction.heldOutRetryMaximum, 0);
assert.equal(failure.attributionDiagnosis.invalidCandidates.length, 1);

const manifest = JSON.parse(await readFile(failure.inputs.manifest, "utf8"));
const context = manifest.contexts.find((item) => item.debateNumber === failure.attributionDiagnosis.debateNumber && item.chunkId === failure.attributionDiagnosis.chunkId);
const packet = JSON.parse(await readFile(context.packet, "utf8"));
const schema = makeV422112DiscoverySchema({ packet, chunk: context });
const speaker = schema.properties.candidates.items.properties.speaker;
assert.deepEqual(speaker.enum, failure.attributionDiagnosis.allowedSpeakers);
assert(!speaker.enum.includes(failure.attributionDiagnosis.invalidCandidates[0].speaker));
assert.equal(failure.evidenceDisposition.reuseForCleanHeldOutGate, false);
assert.equal(failure.authorization.retryFailedContexts, false);
assert.equal(failure.observed.scoresDerived, 0);

console.log(JSON.stringify({
  status: "passed",
  speakerAllowlistStructurallyExcludesObservedFailure: true,
  transportCanaryRequired: true,
  schedulerRamp: failure.transportDiagnosis.correction.schedulerRamp,
  failedSampleRetired: true,
  retries: 0,
  scoresDerived: 0,
}, null, 2));
