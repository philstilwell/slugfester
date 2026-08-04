#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, assert, validateSectionPlan } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [disagreements, maps, initialExecution, adjudicationExecution] = await Promise.all([
  readJson(`${V388_SECTION_ROOT}/initial-disagreements.json`), readJson(`${V388_SECTION_ROOT}/adjudication-option-map.json`), readJson(`${V388_SECTION_ROOT}/initial-model-execution.json`), readJson(`${V388_SECTION_ROOT}/adjudication/model-execution.json`)
]);
assert(initialExecution.validOutputContexts === 6 && initialExecution.results.every((item) => item.gateAcceptancePassed), "initial section plans invalid");
assert(adjudicationExecution.validOutputContexts === disagreements.counts.adjudicationContexts && adjudicationExecution.results.every((item) => item.gateAcceptancePassed), "section adjudications invalid");
const finalDebates = [], reports = [];
for (const debateNumber of V388_SECTION_DEBATES) {
  const debate = disagreements.debates[debateNumber];
  const [planningPacket, planSchema, passA] = await Promise.all([readJson(`${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`), readJson(`${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`), readJson(debate.initialOutputs.passA)]);
  let selectedPlan = passA, resolutionType = "initial-two-plan-semantic-agreement", chosenOrigin = "pass-a", finalVotes = 2;
  if (!debate.semanticPlanAgreement) {
    const output = await readJson(debate.output);
    const field = maps.debates[debateNumber].fields[0];
    const choice = field.options.find((item) => item.optionId === output.plans[0].optionId);
    assert(choice, `${debateNumber}: adjudicated whole plan absent`);
    selectedPlan = choice.value; chosenOrigin = choice.origin; resolutionType = "anonymous-whole-plan-adjudication";
  }
  const validation = validateSectionPlan(selectedPlan, planningPacket, planSchema);
  const finalDebate = { debateNumber, debateId: planningPacket.debateId, motion: planningPacket.motion, sides: planningPacket.sides, resolution: { fieldId: `debate:${planningPacket.debateId}:sectionWeightPlan`, resolutionType, finalVotes, chosenOrigin, componentMixing: false }, plan: selectedPlan };
  assert(!containsScoreField(finalDebate), `${debateNumber}: final section plan contains score field`);
  finalDebates.push(finalDebate);
  reports.push({ debateNumber, debateId: planningPacket.debateId, semanticInitialAgreement: debate.semanticPlanAgreement, resolutionType, finalVotes, chosenOrigin, sections: validation.sectionCount, moves: validation.moveCount, bridges: validation.bridgeCount, weightTotal: validation.weightTotal, componentMixing: 0 });
  if (shouldWrite) { await mkdir(path.resolve(root, `${V388_SECTION_ROOT}/final`), { recursive: true }); await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/final/debate-${debateNumber}.json`), `${JSON.stringify(finalDebate, null, 2)}\n`); }
}
const passed = finalDebates.length === 3 && reports.every((report) => report.finalVotes >= 2 && report.sections >= 4 && report.sections <= 7 && report.weightTotal === 100 && report.componentMixing === 0) && !containsScoreField(finalDebates);
const inventory = { schemaVersion: "3.8.8-locked-section-weight-plans", status: passed ? "locked-score-blind-section-weight-plans" : "section-weight-consensus-failed", debateCount: finalDebates.length, sectionCount: reports.reduce((sum, report) => sum + report.sections, 0), assignedMoveCount: reports.reduce((sum, report) => sum + report.moves, 0), debates: finalDebates };
const analysis = {
  schemaVersion: "3.8.8-section-weight-consensus-analysis",
  status: passed ? "section-weight-consensus-passed" : "section-weight-consensus-failed",
  analyzedAt: new Date().toISOString(),
  passed,
  debateReports: reports,
  totals: { debates: 3, initialPlanContexts: initialExecution.validOutputContexts, semanticInitialAgreements: disagreements.counts.semanticAgreements, semanticInitialDisagreements: disagreements.counts.semanticDisagreements, adjudicationContexts: adjudicationExecution.validOutputContexts, finalTwoVotePlans: reports.filter((report) => report.finalVotes >= 2).length, sections: reports.reduce((sum, report) => sum + report.sections, 0), assignedMoves: reports.reduce((sum, report) => sum + report.moves, 0), bridges: reports.reduce((sum, report) => sum + report.bridges, 0), componentMixing: 0, recoverableStreamEvents: [...initialExecution.results, ...adjudicationExecution.results].reduce((sum, item) => sum + item.recoverableStreamEvents, 0), scoringFields: containsScoreField(finalDebates) ? 1 : 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  decision: { burdenContactPreregistrationAuthorized: passed, burdenContactModelExecutionAuthorized: false, scoringModelExecutionAuthorized: false, numericalParticipantScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false, tenDebateGateAuthorized: false, all195DebatesAuthorized: false },
  artifacts: { lockedPlans: `${V388_SECTION_ROOT}/locked-section-weight-plans.json`, finalDebates: Object.fromEntries(V388_SECTION_DEBATES.map((number) => [number, `${V388_SECTION_ROOT}/final/debate-${number}.json`])) }
};
assert(!containsScoreField(inventory) && !containsScoreField(analysis), "section consensus artifacts contain score field");
if (shouldWrite) { await writeFile(path.resolve(root, analysis.artifacts.lockedPlans), `${JSON.stringify(inventory, null, 2)}\n`); await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/section-weight-consensus-analysis.json`), `${JSON.stringify(analysis, null, 2)}\n`); }
console.log(JSON.stringify({ status: analysis.status, debates: 3, initialPlanContexts: analysis.totals.initialPlanContexts, semanticInitialDisagreements: analysis.totals.semanticInitialDisagreements, adjudicationContexts: analysis.totals.adjudicationContexts, finalTwoVotePlans: analysis.totals.finalTwoVotePlans, sections: analysis.totals.sections, assignedMoves: analysis.totals.assignedMoves, bridges: analysis.totals.bridges, componentMixing: 0, burdenContactPreregistrationAuthorized: analysis.decision.burdenContactPreregistrationAuthorized, scoringAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
