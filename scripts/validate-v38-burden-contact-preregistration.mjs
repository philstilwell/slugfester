#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate";
const MANIFEST = `${ROOT}/gate-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };

const manifestText = await readFile(path.resolve(MANIFEST), "utf8");
const manifest = JSON.parse(manifestText);
const poolText = await readFile(path.resolve(manifest.selectionProtocol.eligiblePoolPath), "utf8");
const pool = JSON.parse(poolText);
const prior = JSON.parse(await readFile(path.resolve(manifest.priorAuthorization.analysisPath), "utf8"));

assert(manifest.schemaVersion === "3.8-heldout-burden-contact-integration-gate-manifest", "manifest schema version mismatch");
assert(manifest.status === "preregistered-heldout-access-blocked", "manifest is not access-blocked");
assert(manifest.calibrationOnly === true && manifest.AIOnly === true && manifest.dyadicOnly === true, "scope flags invalid");
assert(prior.decision?.heldOutBurdenContactIntegrationGatePreregistrationAuthorized === true, "prior test did not authorize preregistration");
assert(prior.decision?.heldOutAccessAuthorized === false, "prior test unexpectedly authorized held-out access");

assert(pool.transcriptContentAccessed === false, "eligible pool claims transcript access");
assert(pool.audioAccessed === false, "eligible pool claims audio access");
assert(pool.legacyAssessmentContentAccessed === false, "eligible pool claims legacy assessment access");
assert(pool.candidateRanksInspected === false, "eligible pool claims candidate-rank inspection");
assert(manifest.selectionProtocol.eligiblePoolSha256 === sha256(poolText), "eligible pool hash mismatch");
assert(/^[a-f0-9]{32}$/.test(manifest.selectionProtocol.randomizationSeed), "selection seed invalid");

const rank = (candidate) => sha256(`${manifest.selectionProtocol.randomizationSeed}:v3.8-dyadic:${candidate.debateId}`);
const expected = [...pool.eligibleDyadic].sort((a, b) => rank(a).localeCompare(rank(b))).slice(0, 3);
assert(manifest.sample.debateCount === 3 && manifest.sample.movesPerDebate === 4 && manifest.sample.compositeCaseCount === 12, "sample shape invalid");
assert(manifest.sample.debates.length === 3, "selected debate count invalid");
assert(new Set(manifest.sample.debates.map((item) => item.debateId)).size === 3, "selected debates not unique");

for (let index = 0; index < expected.length; index += 1) {
  const selected = manifest.sample.debates[index];
  assert(selected.debateId === expected[index].debateId, `selection mismatch at rank ${index + 1}`);
  assert(selected.selectionRankSha256 === rank(expected[index]), `selection-rank hash mismatch for ${selected.debateId}`);
  assert(selected.speakerCount === 2 && selected.sides.pro.speakers.length === 1 && selected.sides.con.speakers.length === 1, `${selected.debateId} is not dyadic`);
  assert(!pool.retiredDebateIds.includes(selected.debateId), `${selected.debateId} overlaps a prior calibration ID`);
  assert(!pool.retiredDebateNumbers.includes(String(selected.number).padStart(2, "0")), `${selected.debateId} overlaps a prior calibration number`);
  for (const name of ["transcript.txt", "events.json", "manifest.json"]) {
    assert(await exists(`.assessment-cache/captions/${selected.videoId}/${name}`), `${selected.debateId} is missing local ${name}`);
  }
}

const thresholds = manifest.thresholds;
assert(thresholds.validInitialContexts === 6, "initial-context threshold invalid");
assert(thresholds.compositeCases === 12, "composite-case threshold invalid");
assert(thresholds.initialCompositeAgreementsMinimum === 11 && thresholds.initialDisagreementsMaximum === 1, "initial semantic thresholds invalid");
assert(thresholds.finalTwoVoteBundlesRequired === 12 && thresholds.unresolvedBundlesMaximum === 0, "final consensus thresholds invalid");
assert(thresholds.requiredAudioVerificationRate === 1, "audio-verification threshold invalid");
assert(JSON.stringify(thresholds.finalCategoryMinimums) === JSON.stringify({ noContact: 2, support: 2, attack: 2, motion: 1, central: 1, subsidiary: 4 }), "category minimums invalid");
assert(thresholds.initialInvalidBundlesMaximum === 0 && thresholds.scoringFieldsMaximum === 0, "invalid-output threshold invalid");

assert(manifest.modelInputPolicy.gateManifestUnavailableToModel === true, "manifest must be unavailable to models");
assert(manifest.modelInputPolicy.thresholdsUnavailableToModel === true, "thresholds must be unavailable to models");
assert(manifest.assessmentPolicy.twoIsolatedInitialContextsPerDebate === true, "two initial contexts not required");
assert(manifest.assessmentPolicy.deterministicSemanticDisagreementExtraction === true, "deterministic extraction not required");
assert(manifest.assessmentPolicy.thirdContextDisputedCasesOnly === true, "adjudicator scope invalid");
assert(manifest.assessmentPolicy.finalTupleRequiresMatchingVotes === 2, "two-vote policy invalid");
assert(manifest.audioPolicy.mediumOrLowConfidenceRequiresAudioVerification === true, "medium-confidence audio rule absent");
assert(manifest.sourcePreparationPolicy.fullLocalTranscriptRequired === true, "full local transcript not required");

for (const [key, value] of Object.entries(manifest.authorization)) assert(value === false, `authorization.${key} must remain false`);
for (const directory of Object.values(manifest.emptyBeforeAccess)) assert(!(await exists(directory)), `${directory} exists before held-out access authorization`);

for (const [file, expectedHash] of Object.entries(manifest.frozenSources)) {
  const text = await readFile(path.resolve(file), "utf8");
  assert(sha256(text) === expectedHash, `frozen-source hash mismatch: ${file}`);
}

for (const file of [manifest.modelInputPolicy.invariantWorkflow, manifest.modelInputPolicy.invariantRubric, manifest.modelInputPolicy.classificationManual]) {
  const text = await readFile(path.resolve(file), "utf8");
  assert(!/\b11\s*\/\s*12\b|\b12\s*\/\s*12\b|initialCompositeAgreementsMinimum|finalCategoryMinimums|prior gate (?:passed|failed)/i.test(text), `sample-specific outcome language leaked into ${file}`);
  for (const debate of manifest.sample.debates) assert(!text.includes(debate.debateId), `selected debate identity leaked into ${file}`);
}

console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  metadataOnlySelectionPassed: true,
  selectedDebates: manifest.sample.debates.map(({ debateId, number }) => ({ debateId, number })),
  sourceChainsPresent: 3,
  transcriptContentAccessAuthorized: false,
  modelExecutionAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
}, null, 2));
