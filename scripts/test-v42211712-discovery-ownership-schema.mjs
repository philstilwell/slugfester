#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.10/held-out-source-preparation/preparation-manifest.json";
const FAILURE = "docs/calibration/v4.2.21.17.12/discovery-ownership-hardening/failure-analysis.json";
const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));

for (const debate of preparation.contexts) {
  const packet = JSON.parse(await readFile(debate.packet, "utf8"));
  for (const chunk of debate.chunks) {
    const schema = makeV422112DiscoverySchema({ packet, chunk });
    const span = schema.properties.candidates.items.properties.sourceSpan.properties;
    assert.equal(span.startEvent.minimum, chunk.coreStartEvent);
    assert.equal(span.startEvent.maximum, chunk.coreEndEvent);
    assert.equal(span.endEvent.minimum, chunk.contextStartEvent);
    assert.equal(span.endEvent.maximum, chunk.contextEndEvent);
  }
}

const failure = JSON.parse(await readFile(FAILURE, "utf8"));
assert.equal(failure.rootCause.violations.length, 1);
const violation = failure.rootCause.violations[0];
const debate = preparation.contexts.find((item) => item.debateNumber === violation.debateNumber);
const packet = JSON.parse(await readFile(debate.packet, "utf8"));
const chunk = debate.chunks.find((item) => item.chunkId === violation.chunkId);
const schema = makeV422112DiscoverySchema({ packet, chunk });
const start = schema.properties.candidates.items.properties.sourceSpan.properties.startEvent;
assert(violation.startEvent > start.maximum, "failed output must be structurally rejected by the hardened start-event schema");
assert.equal(failure.evidenceDisposition.reuseForCleanHeldOutGate, false);
assert.equal(failure.authorization.retryFailedContext, false);
assert.equal(failure.observed.scoresDerived, 0);

console.log(JSON.stringify({
  status: "passed",
  schemasChecked: preparation.totals.discoveryContexts,
  failedCandidateNowStructurallyExcluded: true,
  historicalOutputModified: false,
  failedSampleRetired: true,
  retries: 0,
  scoresDerived: 0,
}, null, 2));
