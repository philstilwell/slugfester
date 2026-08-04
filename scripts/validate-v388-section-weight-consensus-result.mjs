#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, assert, validateSectionPlan } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [analysis, inventory, initialManifest, initialExecution, adjudicationManifest, adjudicationExecution] = await Promise.all([readJson(`${V388_SECTION_ROOT}/section-weight-consensus-analysis.json`), readJson(`${V388_SECTION_ROOT}/locked-section-weight-plans.json`), readJson(`${V388_SECTION_ROOT}/initial-execution-manifest.json`), readJson(`${V388_SECTION_ROOT}/initial-model-execution.json`), readJson(`${V388_SECTION_ROOT}/adjudication/execution-manifest.json`), readJson(`${V388_SECTION_ROOT}/adjudication/model-execution.json`)]);
for (const manifest of [initialManifest, adjudicationManifest]) for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
assert(initialExecution.validOutputContexts === 6 && initialExecution.totalRetries === 0 && initialExecution.results.every((item) => item.gateAcceptancePassed && item.transportClassification !== "invalid"), "initial execution invalid");
assert(adjudicationExecution.validOutputContexts === 3 && adjudicationExecution.totalRetries === 0 && adjudicationExecution.results.every((item) => item.gateAcceptancePassed && item.transportClassification !== "invalid"), "adjudication execution invalid");
assert(analysis.passed && analysis.status === "section-weight-consensus-passed" && inventory.status === "locked-score-blind-section-weight-plans", "section consensus failed");
assert(inventory.debateCount === 3 && inventory.assignedMoveCount === 81 && inventory.debates.length === 3, "section inventory totals invalid");
for (const debateNumber of V388_SECTION_DEBATES) {
  const [finalDebate, packet, schema] = await Promise.all([readJson(`${V388_SECTION_ROOT}/final/debate-${debateNumber}.json`), readJson(`${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`), readJson(`${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`)]);
  validateSectionPlan(finalDebate.plan, packet, schema);
  const inventoryDebate = inventory.debates.find((item) => item.debateNumber === debateNumber);
  assert(JSON.stringify(finalDebate) === JSON.stringify(inventoryDebate), `${debateNumber}: final section plan inventory mismatch`);
  assert(finalDebate.resolution.finalVotes >= 2 && !finalDebate.resolution.componentMixing && !containsScoreField(finalDebate), `${debateNumber}: final resolution invalid`);
}
assert(analysis.totals.initialPlanContexts === 6 && analysis.totals.semanticInitialAgreements === 0 && analysis.totals.semanticInitialDisagreements === 3 && analysis.totals.adjudicationContexts === 3 && analysis.totals.finalTwoVotePlans === 3 && analysis.totals.assignedMoves === 81 && analysis.totals.bridges === 30 && analysis.totals.componentMixing === 0 && analysis.totals.scoringFields === 0 && analysis.totals.meteredApiCostUsd === 0 && analysis.totals.transcriptionCostUsd === 0, "section consensus analysis totals invalid");
assert(analysis.decision.burdenContactPreregistrationAuthorized && !analysis.decision.burdenContactModelExecutionAuthorized && !analysis.decision.scoringModelExecutionAuthorized && !analysis.decision.numericalParticipantScoringAuthorized && !analysis.decision.assessmentProseAuthorized && !analysis.decision.productionMutationAuthorized && !analysis.decision.tenDebateGateAuthorized && !analysis.decision.all195DebatesAuthorized, "section consensus authorization invalid");
assert(!containsScoreField(inventory) && !containsScoreField(analysis), "score field present in section consensus artifacts");
console.log(JSON.stringify({ status: "passed", sectionWeightConsensusPassed: true, debates: 3, initialPlanContexts: 6, adjudicationContexts: 3, finalTwoVotePlans: 3, sections: analysis.totals.sections, assignedMoves: 81, bridges: 30, componentMixing: 0, scoringFields: 0, meteredApiCostUsd: 0, burdenContactPreregistrationAuthorized: true, burdenContactModelExecutionAuthorized: false, scoringAuthorized: false }, null, 2));
