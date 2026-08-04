#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376_CASES } from "./lib/v376-burden-contact.mjs";
import { V376D_CASES, V376D_ROOT, assert, canonicalJson, v376dCoordinate } from "./lib/v376d-burden-contact.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8"), manifestText = await read(`${V376D_ROOT}/development-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-packet-development-model-execution-blocked" && manifest.retiredCases && manifest.caseDisjointFromV376Development && manifest.dyadicOnly, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText), auditText = await read(manifest.sourceAudit.path), audit = JSON.parse(auditText), mappingText = await read(manifest.sealedOptionMap.path), mapping = JSON.parse(mappingText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.compositeCaseCount === 12 && dry.modelContextsExecuted === 0, "dry fixture invalid");
assert(sha256(auditText) === manifest.sourceAudit.sha256 && audit.totals.caseCount === 12 && audit.totals.uniqueLocalEventMatches === 12 && audit.totals.developmentOverlapCoordinates === 0 && audit.totals.multiSpeakerDebates === 0, "source audit invalid");
assert(sha256(mappingText) === manifest.sealedOptionMap.sha256, "sealed map hash invalid");
const priorCoordinates = new Set(V376_CASES.map((item) => item.caseId.replace(/^v291-dev-/, "")));
assert(V376D_CASES.every((item) => !priorCoordinates.has(v376dCoordinate(item.sourceCaseId))), "v3.7.6 development coordinate overlap");
for (const pass of ["pass-a", "pass-b"]) {
  assert(Object.keys(mapping.passes[pass]).length === 12, `${pass}: map coverage invalid`);
  for (const bundle of Object.values(mapping.passes[pass])) assert(bundle.options.length === 9 && bundle.options.filter((item) => item.matchesProvisionalReference).length === 1, `${pass}: candidate coverage invalid`);
}
execFileSync(process.execPath, ["scripts/test-v376d-burden-contact-packets.mjs"], { cwd: root, stdio: "ignore" });
const thresholds = manifest.frozenThresholds;
assert(thresholds.initialCompositeAgreementsMinimum === 11 && thresholds.initialCompositeCases === 12 && thresholds.initialDisagreementsMaximum === 1 && thresholds.finalTwoVoteBundlesRequired === 12 && thresholds.unresolvedBundlesMaximum === 0, "semantic thresholds invalid");
assert(thresholds.requiredAudioVerificationRate === 1 && manifest.sourceControls.mediumOrLowAttributionRequiresAudioVerification, "audio rule invalid");
assert(manifest.decomposition.exactPropositionContactFirst && manifest.decomposition.explicitNoContactCandidate && manifest.decomposition.supportAttackPolarityExplicit && manifest.decomposition.bridgeSelectedWithinValidComposite && manifest.decomposition.genericSubsidiaryCatchAllProhibited && manifest.decomposition.motionRequiresCompleteConclusion, "decomposition controls invalid");
assert(!manifest.developmentState.executionRunnerImplemented && !manifest.developmentState.disagreementExtractorImplemented && !manifest.developmentState.adjudicationRunnerImplemented && !manifest.developmentState.analyzerImplemented && !manifest.developmentState.modelExecutionAuthorized, "development state overstates readiness");
for (const debates of Object.values(manifest.contexts)) for (const context of Object.values(debates)) {
  const packet = JSON.parse(await read(context.packet));
  assert(!canonicalJson(packet).includes("matchesProvisionalReference") && !canonicalJson(packet).includes("semanticTuple"), `${context.packet}: sealed reference leaked`);
}
for (const [debateNumber, source] of Object.entries(audit.debateSources)) {
  assert(sha256(await read(source.transcriptPath)) === source.transcriptSha256, `${debateNumber}: local transcript hash mismatch`);
  assert(sha256(await read(source.eventsPath)) === source.eventsSha256, `${debateNumber}: local events hash mismatch`);
}
assert(manifest.prohibitions.modelExecution && manifest.prohibitions.benchmarkMutation && manifest.prohibitions.largerModelBatch && manifest.prohibitions.heldOutAccess && manifest.prohibitions.numericalParticipantScoring && manifest.prohibitions.assessmentProse && manifest.prohibitions.productionMutation, "prohibitions invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, caseDisjointBurdenContactDevelopmentPassed: true, debates: 3, dyadicOnly: true, compositeCases: 12, minimumInitialAgreement: 11, developmentOverlapCoordinates: 0, localTranscriptHashesVerified: true, modelExecutionAuthorized: false, manifestSha256: sha256(manifestText) }, null, 2));
