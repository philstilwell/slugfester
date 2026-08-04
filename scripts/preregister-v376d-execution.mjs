#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376D_DEBATES, V376D_ROOT, assert } from "./lib/v376d-burden-contact.mjs";
import { V376D_EXECUTION_MANIFEST } from "./lib/v376d-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), frozenIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : new Date().toISOString(), read = (file) => readFile(path.resolve(root, file), "utf8");
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be ISO");
if (shouldWrite) { try { await access(path.resolve(root, V376D_EXECUTION_MANIFEST)); throw new Error(`${V376D_EXECUTION_MANIFEST} already exists; execution preregistration is immutable`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const developmentPath = `${V376D_ROOT}/development-manifest.json`, developmentText = await read(developmentPath), development = JSON.parse(developmentText);
assert(development.status === "frozen-packet-development-model-execution-blocked" && !development.developmentState.modelExecutionAuthorized && development.caseDisjointFromV376Development && development.dyadicOnly, "development lock invalid");
for (const [file, digest] of Object.entries(development.sourceHashes)) assert(sha256(await read(file)) === digest, `development source hash mismatch: ${file}`);
const dryPath = `${V376D_ROOT}/execution-dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.syntheticDisputedCompositeCases === 3 && dry.twoVoteResolutions === 3 && dry.noContactDisputeVerified && dry.polarityDisputeVerified && dry.tierDisputeVerified, "execution dry fixture invalid");
const initialContexts = { "pass-a": {}, "pass-b": {} }, outputs = { initial: { "pass-a": {}, "pass-b": {} } };
for (const reviewerPass of ["pass-a", "pass-b"]) for (const debateNumber of V376D_DEBATES) {
  const source = development.contexts[reviewerPass][debateNumber], output = `${V376D_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`;
  initialContexts[reviewerPass][debateNumber] = { debateNumber, reviewerPass, packet: source.packet, packetSha256: source.packetSha256, schema: source.schema, schemaSha256: source.schemaSha256, output, bundleCount: source.bundleCount }; outputs.initial[reviewerPass][debateNumber] = output;
}
const executionSources = ["scripts/lib/v376d-execution.mjs", "scripts/validate-v376d-burden-contact-output.mjs", "scripts/test-v376d-execution-tooling.mjs", "scripts/extract-v376d-disagreements.mjs", "scripts/analyze-v376d-burden-contact-test.mjs", "scripts/run-v376d-burden-contact-test.mjs", "scripts/preregister-v376d-execution.mjs", "scripts/validate-v376d-execution-lock.mjs", "scripts/validate-v376d-burden-contact-test.mjs"];
const sourceFiles = [...new Set([developmentPath, ...Object.keys(development.sourceHashes), dryPath, ...executionSources])], sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.6-disjoint-burden-contact-execution-manifest", protocolId: development.protocolId, status: "frozen-before-model-execution", frozenAt, root: V376D_ROOT, calibrationOnly: true, AIOnly: true, retiredCases: true, caseDisjointFromV376Development: true, dyadicOnly: true, disjointTestExecutionAuthorized: true,
  authorizationScope: "Exactly six initial burden-contact contexts and at most one isolated dispute-only adjudication context per sampled dyadic debate, solely for the frozen v3.7.6 case-disjoint retired test.",
  developmentLock: { path: developmentPath, sha256: sha256(developmentText), remainsImmutableAndModelExecutionBlocked: true, narrowLaterExecutionAuthorization: true },
  workflowVersion: development.workflowVersion, rubricVersion: development.rubricVersion, model: development.model, debateNumbers: V376D_DEBATES,
  modelInputs: { workflow: "docs/assessment-workflow-v3.7.6.md", rubric: "docs/reassessment-rubric-v3.7.6.md", manual: `${V376D_ROOT}/test-manual.md` }, sealedOptionMap: development.sealedOptionMap, sourceAudit: development.sourceAudit,
  isolation: { twoInitialContextsPerDebate: true, thirdContextOnlyForDisputedCompositeCases: true, candidateOriginsUnavailable: true, otherPassOutputsUnavailable: true, provisionalReferencesUnavailable: true, independentClaim: "isolated-context judgments; not statistical independence" },
  consensusPolicy: { finalSemanticTupleRequiresMatchingVotes: 2, thirdPassReceivesOnlyDisputedCompositeCases: true, thirdPassCannotAddCandidateTuples: true, thirdPassTupleSelectedByNeitherInitialPassRemainsUnresolved: true, scoresDerivedOnlyAfterAdjudication: true },
  audioPolicy: { mediumConfidenceMovesRequireAudioVerification: true, sampledMediumOrLowConfidenceMoves: development.sourceControls.mediumOrLowAttributionsInSample, requiredAudioVerifications: development.sourceControls.requiredAudioVerifications, completedAudioVerifications: development.sourceControls.completedAudioVerifications, requiredVerificationRate: development.frozenThresholds.requiredAudioVerificationRate },
  executionPolicy: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  thresholds: { validInitialContexts: development.frozenThresholds.validInitialContexts, compositeCases: development.sample.compositeCaseCount, initialCompositeAgreementsMinimum: development.frozenThresholds.initialCompositeAgreementsMinimum, initialDisagreementsMaximum: development.frozenThresholds.initialDisagreementsMaximum, initialInvalidBundlesMaximum: development.frozenThresholds.initialInvalidBundlesMaximum, finalTwoVoteBundlesRequired: development.frozenThresholds.finalTwoVoteBundlesRequired, unresolvedBundlesMaximum: development.frozenThresholds.unresolvedBundlesMaximum, scoringFieldsMaximum: development.frozenThresholds.scoringFieldsMaximum },
  passMeaning: development.passMeaning, prohibitions: { benchmarkMutation: true, largerModelBatch: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true },
  executionDryFixture: { path: dryPath, sha256: sha256(dryText) }, initialContexts, outputs,
  artifacts: { initialExecution: `${V376D_ROOT}/initial-model-execution.json`, initialDisagreements: `${V376D_ROOT}/initial-disagreements.json`, adjudicationOptionMap: `${V376D_ROOT}/adjudication-option-map.json`, adjudicationExecution: `${V376D_ROOT}/adjudication-model-execution.json`, analysis: `${V376D_ROOT}/test-analysis.json`, assessment: `${V376D_ROOT}/execution-assessment.md` }, sourceHashes
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, V376D_EXECUTION_MANIFEST)), { recursive: true }); await writeFile(path.resolve(root, V376D_EXECUTION_MANIFEST), outputText); }
console.log(outputText);
