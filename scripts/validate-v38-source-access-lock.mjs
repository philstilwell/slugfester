#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
const MANIFEST = `${ROOT}/gate-manifest.json`;
const AUTHORIZATION = `${ROOT}/source-access-authorization.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };

const manifestText = await readFile(path.resolve(MANIFEST), "utf8");
const manifest = JSON.parse(manifestText);
const authorization = JSON.parse(await readFile(path.resolve(AUTHORIZATION), "utf8"));
const poolText = await readFile(path.resolve(manifest.selectionProtocol.eligiblePoolPath), "utf8");
const pool = JSON.parse(poolText);

assert(manifest.schemaVersion === "3.8-heldout-burden-contact-integration-gate-manifest", "gate manifest schema mismatch");
assert(manifest.status === "preregistered-heldout-access-blocked", "historical gate manifest status changed");
assert(authorization.schemaVersion === "3.8-heldout-burden-contact-source-access-authorization", "authorization schema mismatch");
assert(authorization.status === "source-access-and-preparation-authorized", "source access is not authorized");
assert(authorization.gateManifest.path === MANIFEST, "authorization gate path mismatch");
assert(authorization.gateManifest.sha256 === sha256(manifestText), "authorization gate hash mismatch");
assert(manifest.selectionProtocol.eligiblePoolSha256 === sha256(poolText), "eligible-pool hash mismatch");

const rank = (candidate) => sha256(`${manifest.selectionProtocol.randomizationSeed}:v3.8-dyadic:${candidate.debateId}`);
const expected = [...pool.eligibleDyadic].sort((a, b) => rank(a).localeCompare(rank(b))).slice(0, 3);
assert(JSON.stringify(expected.map((item) => item.debateId)) === JSON.stringify(manifest.sample.debates.map((item) => item.debateId)), "metadata selection no longer reproduces");
assert(JSON.stringify(manifest.sample.debates.map((item) => item.videoId)) === JSON.stringify(authorization.selectedVideoIds), "authorized video IDs differ from selected sample");

for (const debate of manifest.sample.debates) {
  assert(debate.speakerCount === 2, `${debate.debateId} is not dyadic`);
  for (const name of ["transcript.txt", "events.json", "manifest.json"]) {
    assert(await exists(`.assessment-cache/captions/${debate.videoId}/${name}`), `${debate.debateId} is missing local ${name}`);
  }
}

for (const [file, expectedHash] of Object.entries(manifest.frozenSources)) {
  assert(sha256(await readFile(path.resolve(file), "utf8")) === expectedHash, `frozen-source hash mismatch: ${file}`);
}

for (const value of Object.values(authorization.authorized)) assert(value === true, "an authorized action is not true");
for (const value of Object.values(authorization.stillBlocked)) assert(value === true, "a prohibited action is not blocked");
assert(authorization.execution.authentication === "ChatGPT subscription", "authentication is not subscription based");
assert(authorization.execution.APIKeysRemoved === true, "API-key removal is not required");
assert(authorization.execution.meteredModelApiCostUsdMaximum === 0, "metered model cost is not zero");
assert(authorization.execution.transcriptionCostUsdMaximum === 0, "transcription cost is not zero");

console.log(JSON.stringify({
  status: "passed",
  gateManifestImmutable: true,
  selectedDebates: manifest.sample.debates.map(({ debateId, number }) => ({ debateId, number })),
  localTranscriptChainsPresent: manifest.sample.debates.length,
  sourceAccessAuthorized: true,
  sourcePreparationAuthorized: true,
  classificationPassesAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false,
  maximumMeteredCostUsd: 0
}, null, 2));
