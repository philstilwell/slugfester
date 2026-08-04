#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376D_CASES, V376D_DEBATES, V376D_PASSES, V376D_ROOT, assert } from "./lib/v376d-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V376D_ROOT}/development-manifest.json`, frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; development preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const priorManifestPath = "docs/calibration/v3.7.6/burden-contact-decomposition-smoke/execution-manifest.json", priorAnalysisPath = "docs/calibration/v3.7.6/burden-contact-decomposition-smoke/smoke-analysis.json", priorAssessmentPath = "docs/calibration/v3.7.6/burden-contact-decomposition-smoke/execution-assessment.md";
const priorManifestText = await read(priorManifestPath), priorAnalysisText = await read(priorAnalysisPath), priorAnalysis = JSON.parse(priorAnalysisText), priorAssessmentText = await read(priorAssessmentPath);
assert(priorAnalysis.passed && priorAnalysis.decision.caseDisjointBurdenContactTestPreregistrationAuthorized, "v3.7.6 smoke does not authorize this preregistration");
const dryPath = `${V376D_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText), mapPath = `${V376D_ROOT}/sealed-option-map.json`, mapText = await read(mapPath), auditPath = `${V376D_ROOT}/source-audit.json`, auditText = await read(auditPath), audit = JSON.parse(auditText);
assert(dry.passed && dry.compositeCaseCount === 12 && dry.initialContextCount === 6 && dry.modelContextsExecuted === 0, "dry fixture invalid");
assert(audit.totals.developmentOverlapCoordinates === 0 && audit.totals.multiSpeakerDebates === 0 && audit.totals.uniqueLocalEventMatches === 12, "source audit invalid");
const contexts = {};
for (const reviewerPass of V376D_PASSES) {
  contexts[reviewerPass] = {};
  for (const debateNumber of V376D_DEBATES) {
    const packet = `${V376D_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`, schema = `${V376D_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`, packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
    contexts[reviewerPass][debateNumber] = { packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), bundleCount: parsed.bundles.length };
  }
}
const sourceFiles = [
  "docs/assessment-workflow-v3.7.6.md", "docs/reassessment-rubric-v3.7.6.md", `${V376D_ROOT}/test-manual.md`, dryPath, mapPath, auditPath,
  ...V376D_PASSES.flatMap((pass) => V376D_DEBATES.flatMap((debate) => [contexts[pass][debate].packet, contexts[pass][debate].schema])),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v372-atomic-bundles.mjs", "scripts/lib/v376-burden-contact.mjs", "scripts/lib/v376d-burden-contact.mjs",
  "scripts/build-v376d-burden-contact-packets.mjs", "scripts/test-v376d-burden-contact-packets.mjs", "scripts/preregister-v376d-burden-contact-development.mjs", "scripts/validate-v376d-burden-contact-development.mjs",
  "docs/calibration/v2.8/development/challenge-input.json", "docs/calibration/v2.1/corpus-transcript-audit.json", priorManifestPath, priorAnalysisPath, priorAssessmentPath
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.6-disjoint-burden-contact-development-manifest",
  protocolId: "v3.7.6-case-disjoint-retired-burden-contact-test",
  status: "frozen-packet-development-model-execution-blocked",
  frozenAt,
  workflowVersion: "Slugfester Burden-Contact Decomposition Workflow v3.7.6",
  rubricVersion: "Slugfester Burden-Contact Decomposition Rubric v3.7.6",
  calibrationOnly: true,
  retiredCases: true,
  caseDisjointFromV376Development: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  sample: { debateNumbers: V376D_DEBATES, debateCount: 3, compositeCaseCount: V376D_CASES.length, casesPerDebate: 4, multiSpeakerDebates: 0, developmentOverlapCoordinates: 0, allSpeakerAttributionConfidenceHigh: true, provisionalCategoryBalance: dry.provisionalCategoryBalance },
  decomposition: { exactPropositionContactFirst: true, explicitNoContactCandidate: true, supportAttackPolarityExplicit: true, bridgeSelectedWithinValidComposite: true, genericSubsidiaryCatchAllProhibited: true, motionRequiresCompleteConclusion: true },
  sourceControls: { localTranscriptRequired: true, localTranscriptHashesVerified: true, uniqueNormalizedEventMatchRequired: true, mediumOrLowAttributionRequiresAudioVerification: true, mediumOrLowAttributionsInSample: audit.totals.mediumOrLowAttributions, requiredAudioVerifications: audit.totals.requiredAudioVerifications, completedAudioVerifications: audit.totals.completedAudioVerifications },
  provisionalReference: { warning: "AI-authored retired references only test candidate coverage and category balance; they are hidden from model contexts and are not a pass threshold, benchmark, or human ground truth." },
  plannedExecution: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  frozenThresholds: { validInitialContexts: 6, initialCompositeAgreementsMinimum: 11, initialCompositeCases: 12, initialDisagreementsMaximum: 1, initialInvalidBundlesMaximum: 0, finalTwoVoteBundlesRequired: 12, unresolvedBundlesMaximum: 0, requiredAudioVerificationRate: 1, scoringFieldsMaximum: 0 },
  passMeaning: "A pass may authorize separate preregistration of a narrow held-out burden-contact integration gate only; it does not authorize held-out access, numerical scoring, assessment prose, benchmark mutation, or production reassessment.",
  developmentState: { packetsBuilt: true, schemasBuilt: true, dryFixturePassed: true, sourceAuditPassed: true, executionRunnerImplemented: false, disagreementExtractorImplemented: false, adjudicationRunnerImplemented: false, analyzerImplemented: false, modelExecutionAuthorized: false },
  priorV376Smoke: { manifestPath: priorManifestPath, manifestSha256: sha256(priorManifestText), analysisPath: priorAnalysisPath, analysisSha256: sha256(priorAnalysisText), assessmentPath: priorAssessmentPath, assessmentSha256: sha256(priorAssessmentText), outcome: "perfect-initial-composite-repeatability-pass" },
  sealedOptionMap: { path: mapPath, sha256: sha256(mapText), unavailableToModelContexts: true },
  sourceAudit: { path: auditPath, sha256: sha256(auditText) },
  contexts,
  dryFixture: { path: dryPath, sha256: sha256(dryText) },
  sourceHashes,
  prohibitions: { modelExecution: true, benchmarkMutation: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true }
};
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), text); }
console.log(text);
