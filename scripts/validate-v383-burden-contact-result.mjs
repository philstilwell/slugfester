#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { V383_DEBATES, assert, canonicalJson, validateV383Output } from "./lib/v383-burden-contact.mjs";
import { V383_EXECUTION_MANIFEST, adjudicationV383Option, readV383Json, v383SemanticWinner } from "./lib/v383-execution.mjs";

const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(V383_EXECUTION_MANIFEST);
const initial = await readJson(manifest.artifacts.initialExecution);
const disagreements = await readJson(manifest.artifacts.initialDisagreements);
const adjudicationMap = await readJson(manifest.artifacts.adjudicationOptionMap);
const adjudication = await readJson(manifest.artifacts.adjudicationExecution);
const analysis = await readJson(manifest.artifacts.analysis);

for (const [file, expectedHash] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === expectedHash, `frozen-source hash mismatch: ${file}`);
assert(initial.contextsPlanned === 6 && initial.validOutputContexts === 6 && initial.results.length === 6, "initial context execution invalid");
assert(initial.results.every((item) => item.status === "completed-valid" && item.attemptCount === 1 && item.retryCount === 0 && item.scoringFieldCount === 0), "initial result policy invalid");
assert(disagreements.allInitialValid === true && disagreements.counts.compositeCases === 12, "initial disagreement coverage invalid");
assert(disagreements.counts.agreements + disagreements.counts.disagreements === 12, "initial comparison count invalid");
assert(adjudication.contextsPlanned === disagreements.adjudicationContexts.length && adjudication.validOutputContexts === disagreements.adjudicationContexts.length, "adjudication execution invalid");
assert(adjudication.results.every((item) => item.status === "completed-valid" && item.attemptCount === 1 && item.retryCount === 0 && item.scoringFieldCount === 0), "adjudication result policy invalid");

for (const context of disagreements.adjudicationContexts) {
  const [packet, schema, output] = await Promise.all([context.packet, context.schema, context.output].map((file) => readV383Json(root, file)));
  assert(packet.bundles.length === context.itemCount, `${context.debateNumber}: adjudication scope count invalid`);
  assert(packet.bundles.every((bundle) => bundle.candidates.length === 2), `${context.debateNumber}: adjudication includes more than two initial tuples`);
  validateV383Output(output, packet, schema);
}

const decisionById = new Map(analysis.results.final.decisions.map((item) => [item.bundleId, item]));
for (const comparison of disagreements.comparisons) {
  const final = decisionById.get(comparison.bundleId);
  assert(final, `${comparison.bundleId}: final decision missing`);
  const votes = [comparison.passA, comparison.passB];
  if (!comparison.agreed) {
    const context = disagreements.adjudicationContexts.find((item) => item.debateNumber === comparison.debateNumber);
    const output = await readJson(context.output);
    const choice = output.bundles.find((item) => item.bundleId === comparison.bundleId);
    votes.push(adjudicationV383Option(adjudicationMap, comparison.debateNumber, comparison.bundleId, choice.optionId).semanticTuple);
  }
  const winner = v383SemanticWinner(votes);
  assert(Boolean(winner) === final.resolved && canonicalJson(winner?.value ?? null) === canonicalJson(final.finalSemanticTuple), `${comparison.bundleId}: final semantic winner mismatch`);
}

assert(analysis.results.final.compositeCases === 12 && analysis.results.final.resolved === 12, "final resolution coverage invalid");
assert(analysis.decision.numericalParticipantScoringAuthorized === false && analysis.decision.assessmentProseAuthorized === false && analysis.decision.productionMutationAuthorized === false, "downstream boundary invalid");
assert(new Set(disagreements.comparisons.map((item) => item.debateNumber)).size === V383_DEBATES.length, "debate coverage invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, initialValidContexts: initial.validOutputContexts, initialAgreements: disagreements.counts.agreements, initialDisagreements: disagreements.counts.disagreements, adjudicationContexts: adjudication.contextsPlanned, finalTwoVoteBundles: analysis.results.final.resolved, gatePassed: analysis.passed, scoreDerivationPreregistrationAuthorized: analysis.decision.scoreDerivationAndAssessmentReconstructionGatePreregistrationAuthorized, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
