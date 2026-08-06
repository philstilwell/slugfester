#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot = "docs/calibration/v4.2.21.3/audio-verification", manifest = JSON.parse(await readFile(`${stageRoot}/execution-manifest.json`, "utf8"));
assert.equal(manifest.status, "frozen-five-paid-diarized-audio-calls-authorized"); assert.equal(manifest.calls.length, 5); assert.equal(manifest.model, "gpt-4o-transcribe-diarize"); assert.equal(manifest.costEstimate.pricePerMinuteUsd, 0.006); assert.equal(manifest.costEstimate.maximumCostUsd, 0.04); assert.equal(manifest.executionPolicy.retriesMaximum, 0); assert.equal(manifest.authorization.scoreDerivation, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex"); for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`); for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => assert.fail(`future output exists: ${future}`), () => true);
console.log(JSON.stringify({ status: "passed", calls: 5, clipMinutes: manifest.costEstimate.clipMinutes, estimatedCostUsd: manifest.costEstimate.estimatedCostUsd, maximumCostUsd: manifest.costEstimate.maximumCostUsd, retries: 0, transcriptsExisting: 0, scoresDerived: 0 }, null, 2));
