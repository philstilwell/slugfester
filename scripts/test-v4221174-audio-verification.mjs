#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification";
const [manifest, execution, audit, analysis] = await Promise.all(["execution-manifest.json", "model-execution.json", "audio-verification.json", "analysis.json"].map((file) => readFile(`${root}/${file}`, "utf8").then(JSON.parse)));
assert.equal(manifest.status, "frozen-two-paid-audio-transcriptions-authorized");
assert.equal(execution.status, "two-paid-audio-transcriptions-completed");
assert.equal(audit.status, "passed-all-two-medium-assessment-moves-audio-verified");
assert.equal(analysis.gate.passed, true);
assert.equal(audit.totals.requiredMoves, 2);
assert.equal(audit.totals.verified, 2);
assert.equal(audit.totals.unresolved, 0);
assert.equal(audit.totals.retries, 0);
assert(audit.totals.estimatedSuccessfulProcessingCostUsd <= manifest.costEstimate.maximumAuthorizedCostUsd);
assert.equal(audit.totals.scoresDerived, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const move of audit.debates[0].moves) {
  assert.equal(sha256(await readFile(move.clip.path)), move.clip.sha256);
  assert.equal(sha256(await readFile(move.transcript.path)), move.transcript.sha256);
  assert(move.deterministicEvidence.excerptRecall >= audit.thresholds.minimumFullClipExcerptRecall);
  assert.equal(move.deterministicEvidence.clipHashMatched, true);
  assert.equal(move.deterministicEvidence.transcriptHashMatched, true);
}
assert.equal(audit.authorization.adjudicationPacketPreparation, true);
assert.equal(audit.authorization.adjudicationModelExecution, false);
console.log(JSON.stringify({ status: "passed", requiredMoves: 2, verified: 2, unresolved: 0, transcriptHashesVerified: 2, clipHashesVerified: 2, estimatedSuccessfulProcessingCostUsd: audit.totals.estimatedSuccessfulProcessingCostUsd, maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd, retries: 0, scoresDerived: 0, nextAuthorized: "adjudication-packet-preparation" }, null, 2));
