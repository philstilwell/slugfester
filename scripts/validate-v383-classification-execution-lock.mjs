#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  V383_AUDIO_REQUIRED,
  V383_DEBATES,
  V383_OUTPUT_SCHEMA_VERSION,
  V383_PASSES,
  V383_ROOT,
  assert,
  buildV383CandidateUniverse,
  canonicalJson
} from "./lib/v383-burden-contact.mjs";

const root = process.cwd();
const manifestPath = `${V383_ROOT}/execution-manifest.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const manifest = await readJson(manifestPath);
const phaseLock = await readJson(manifest.phaseLock);
const audit = await readJson(manifest.packetConstruction.audit);
const fixture = await readJson(manifest.packetConstruction.dryFixture);
const executionFixture = await readJson(manifest.packetConstruction.executionDryFixture);
const mapping = await readJson(manifest.packetConstruction.sealedOptionMap);
const inventory = await readJson(manifest.packetConstruction.inventory);
const audio = await readJson(V383_AUDIO_REQUIRED);

assert(manifest.schemaVersion === "3.8.3-heldout-burden-contact-classification-execution-manifest", "manifest schema mismatch");
assert(manifest.status === "frozen-classification-execution-authorized", "classification manifest is not frozen and authorized");
assert(manifest.calibrationOnly === true && manifest.AIOnly === true && manifest.dyadicOnly === true, "scope flags invalid");
assert(manifest.model?.slug === "gpt-5.6-sol" && manifest.model?.reasoningEffort === "high", "model lock invalid");
assert(audit.status === "passed" && fixture.passed === true, "packet construction did not pass");
assert(fixture.modelContextsExecuted === 0 && fixture.scoringFields === 0, "packet fixture crossed execution boundary");
assert(executionFixture.passed === true && executionFixture.modelContextsExecuted === 0 && executionFixture.twoInitialTuplesOnly === true, "execution fixture invalid");
assert(audio.pendingCount === 0 && audit.totals.pendingAudioVerifications === 0, "pending audio verification exists");
assert(audit.totals.highConfidenceAttributions === 12 && audit.totals.requiredAudioVerifications === 0, "attribution gate invalid");

assert(phaseLock.status === "locked-before-model-execution", "phase lock status invalid");
assert(phaseLock.everyModelVisibleFileHashed === true && phaseLock.completedUpstreamArtifactsHashed === true && phaseLock.futureOutputsExcluded === true, "phase lock policy invalid");
assert(phaseLock.contexts.length === 6, "phase lock context count invalid");

for (const [file, expectedHash] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === expectedHash, `frozen-source hash mismatch: ${file}`);
for (const [file, expectedHash] of Object.entries(phaseLock.upstreamHashes)) assert(sha256(await read(file)) === expectedHash, `upstream hash mismatch: ${file}`);

let contexts = 0;
for (const reviewerPass of V383_PASSES) {
  for (const debateNumber of V383_DEBATES) {
    const context = manifest.contexts[reviewerPass]?.[debateNumber];
    const lock = phaseLock.contexts.find((item) => item.reviewerPass === reviewerPass && item.debateNumber === debateNumber);
    assert(context && lock, `${reviewerPass}.${debateNumber}: context lock absent`);
    assert(lock.modelVisibleFiles.length === 7, `${reviewerPass}.${debateNumber}: model-visible allowlist size invalid`);
    assert(lock.outputExcludedFromLock === context.output, `${reviewerPass}.${debateNumber}: future output boundary invalid`);
    assert(!(await exists(context.output)), `${context.output} exists before execution`);
    for (const file of lock.modelVisibleFiles) assert(sha256(await read(file)) === lock.modelVisibleHashes[file], `${reviewerPass}.${debateNumber}: model-visible hash mismatch for ${file}`);
    const packet = await readJson(context.packet);
    const schema = await readJson(context.schema);
    assert(packet.reviewerPass === reviewerPass && packet.debateNumber === debateNumber && packet.bundles.length === 4, `${reviewerPass}.${debateNumber}: packet identity invalid`);
    assert(schema.properties?.schemaVersion?.const === V383_OUTPUT_SCHEMA_VERSION, `${reviewerPass}.${debateNumber}: output schema version invalid`);
    const packetText = canonicalJson(packet);
    for (const forbiddenKey of ["provisionalBurdenContact", "provisionalLabelWarning", "attributionBasis", "matchesProvisionalAid"]) assert(!packetText.includes(forbiddenKey), `${reviewerPass}.${debateNumber}: provisional field leaked`);
    for (const bundle of packet.bundles) {
      assert(bundle.candidates.length === 21, `${reviewerPass}.${bundle.bundleId}: candidate count invalid`);
      const universe = buildV383CandidateUniverse(bundle.decisionContext.routes);
      assert(canonicalJson(bundle.candidates.map((item) => canonicalJson(item.values)).sort()) === canonicalJson(universe.map(canonicalJson).sort()), `${reviewerPass}.${bundle.bundleId}: composite universe incomplete`);
      const counterpartPass = reviewerPass === "pass-a" ? "pass-b" : "pass-a";
      const currentMap = mapping.passes[reviewerPass][bundle.bundleId];
      const counterpartMap = mapping.passes[counterpartPass][bundle.bundleId];
      for (const option of currentMap.options) {
        const counterpart = counterpartMap.options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(option.semanticTuple));
        assert(counterpart && counterpart.optionId !== option.optionId, `${reviewerPass}.${bundle.bundleId}: candidate position not counterbalanced`);
      }
    }
    contexts += 1;
  }
}

const thresholds = manifest.thresholds;
assert(thresholds.validInitialContexts === 6 && thresholds.compositeCases === 12, "sample threshold invalid");
assert(thresholds.initialCompositeAgreementsMinimum === 11 && thresholds.initialDisagreementsMaximum === 1, "initial agreement threshold invalid");
assert(thresholds.initialInvalidBundlesMaximum === 0 && thresholds.finalTwoVoteBundlesRequired === 12 && thresholds.unresolvedBundlesMaximum === 0, "resolution threshold invalid");
assert(canonicalJson(thresholds.finalCategoryMinimums) === canonicalJson({ noContact: 2, support: 2, attack: 2, motion: 1, central: 1, subsidiary: 4 }), "category threshold invalid");
assert(thresholds.scoringFieldsMaximum === 0, "score prohibition absent");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0, "attempt policy invalid");
assert(manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext === 2 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000, "transport policy invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved === true, "authentication policy invalid");
assert(manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "cost policy invalid");
assert(manifest.authorization.burdenContactClassificationInitialPasses === true && manifest.authorization.deterministicDisagreementExtraction === true && manifest.authorization.disputeOnlyClassificationAdjudication === true, "classification authorization invalid");
for (const key of ["numericalParticipantScoring", "assessmentProse", "benchmarkMutation", "productionMutation", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain blocked`);
assert(inventory.selectedMoveCount === 12 && inventory.debateCount === 3, "source inventory changed");
for (const file of Object.values(manifest.artifacts)) assert(!(await exists(file)), `${file} exists before classification execution`);

console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, phaseLockedContexts: contexts, compositeCases: 12, candidatesPerCase: 21, provisionalLabelsHidden: true, candidatePositionsCounterbalanced: true, requiredAudioVerifications: 0, classificationAuthorized: true, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false, meteredApiCostUsdMaximum: 0 }, null, 2));
