#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { evaluateV416AdjudicationTiming } from "./lib/v416-triggered-consensus.mjs";
import { V416_ADJUDICATION_ROOT, validateV416AdjudicationOutput } from "./lib/v416-adjudication.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution, preparation, primaryAnalysis, passBAnalysis] = await Promise.all([
  readJson(`${V416_ADJUDICATION_ROOT}/execution-manifest.json`),
  readJson(`${V416_ADJUDICATION_ROOT}/model-execution.json`),
  readJson(`${V416_ADJUDICATION_ROOT}/preparation-audit.json`),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/primary-analysis.json"),
  readJson("docs/calibration/v4.1.6/lean-retired-gate/pass-b/analysis.json")
]);
assertV4(execution.status === "adjudication-execution-passed" && execution.validContexts === 3 && execution.attempts === 3 && execution.retries === 0 && execution.authorization.adjudicationAnalysis, "valid adjudication execution unavailable");
assertV4(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.contexts === 3, "adjudication preparation unavailable");

const choiceTotals = { candidate1: 0, candidate2: 0 };
const choiceTypes = Object.fromEntries(["responsePair", "charityPair", "scoringField", "burdenAdjustment"].map((key) => [key, { candidate1: 0, candidate2: 0 }]));
const scoringFields = {};
const debates = [];
const sources = {
  executionManifestSha256: sha256(await readFile(path.resolve(`${V416_ADJUDICATION_ROOT}/execution-manifest.json`))),
  modelExecutionSha256: sha256(await readFile(path.resolve(`${V416_ADJUDICATION_ROOT}/model-execution.json`))),
  preparationAuditSha256: sha256(await readFile(path.resolve(`${V416_ADJUDICATION_ROOT}/preparation-audit.json`)))
};
const tally = (type, choice, fieldKey = null) => {
  const key = choice === 1 ? "candidate1" : "candidate2";
  choiceTotals[key] += 1;
  choiceTypes[type][key] += 1;
  if (fieldKey) {
    scoringFields[fieldKey] ??= { candidate1: 0, candidate2: 0 };
    scoringFields[fieldKey][key] += 1;
  }
};

for (const context of manifest.contexts) {
  const [output, packet, outputText, packetText] = await Promise.all([
    readJson(context.output), readJson(context.packet), readFile(path.resolve(context.output)), readFile(path.resolve(context.packet))
  ]);
  const validation = validateV416AdjudicationOutput(output, packet);
  for (const decision of output.moveDecisions) {
    if (decision.responsePairChoice !== null) tally("responsePair", decision.responsePairChoice);
    if (decision.charityPairChoice !== null) tally("charityPair", decision.charityPairChoice);
    for (const field of decision.scoringFieldChoices) tally("scoringField", field.choice, field.fieldKey);
  }
  for (const decision of output.burdenAdjustmentDecisions) tally("burdenAdjustment", decision.choice);
  sources[`debate${context.debateNumber}PacketSha256`] = sha256(packetText);
  sources[`debate${context.debateNumber}OutputSha256`] = sha256(outputText);
  debates.push({ debateNumber: context.debateNumber, debateId: context.debateId, validation, output: context.output, outputSha256: sha256(outputText) });
}

const totalChoices = choiceTotals.candidate1 + choiceTotals.candidate2;
const expectedChoices = preparation.responsePairChoices + preparation.charityPairChoices + preparation.independentScoringFieldChoices + preparation.burdenAdjustmentChoices;
assertV4(totalChoices === expectedChoices && totalChoices === 154, "adjudication choice total mismatch");
assertV4(choiceTypes.responsePair.candidate1 + choiceTypes.responsePair.candidate2 === preparation.responsePairChoices, "response-pair choice total mismatch");
assertV4(choiceTypes.charityPair.candidate1 + choiceTypes.charityPair.candidate2 === preparation.charityPairChoices, "charity-pair choice total mismatch");
assertV4(choiceTypes.scoringField.candidate1 + choiceTypes.scoringField.candidate2 === preparation.independentScoringFieldChoices, "scoring-field choice total mismatch");
assertV4(choiceTypes.burdenAdjustment.candidate1 + choiceTypes.burdenAdjustment.candidate2 === preparation.burdenAdjustmentChoices, "burden-adjustment choice total mismatch");
const runtime = evaluateV416AdjudicationTiming(execution.results, primaryAnalysis.runtime, passBAnalysis.runtime);
const status = runtime.runtimePassed ? "adjudication-analysis-passed-final-ledger-authorized" : "adjudication-analysis-failed-runtime-budget";
const analysis = {
  schemaVersion: "4.1.6-dispute-only-adjudication-analysis",
  protocolId: manifest.protocolId,
  status,
  sources,
  debates,
  runtime,
  choiceAudit: { totalChoices, choiceTotals, choiceTypes, scoringFields, missingChoices: 0, thirdValues: 0, calculatedScores: 0 },
  totals: { debates: 3, validContexts: debates.length, disputedMoves: preparation.disputedMoves, audioVerifiedDisputedMoves: preparation.audioVerifiedDisputedMoves, attempts: execution.attempts, retries: execution.retries, recoverableStreamEvents: execution.results.reduce((sum, item) => sum + item.recoverableStreamEvents, 0), meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  authorization: { finalLedgerAssembly: runtime.runtimePassed, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V416_ADJUDICATION_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, validContexts: debates.length, disputedMoves: analysis.totals.disputedMoves, candidateChoices: totalChoices, candidate1Choices: choiceTotals.candidate1, candidate2Choices: choiceTotals.candidate2, adjudicationMinutesPerDebate: runtime.computeAdjudicationMinutesPerDebate, conservativeAdjudicationMinutesPerDebate: runtime.conservativeAdjudicationMinutesPerDebate, projected195HoursCentral: runtime.centralProjection.hours.total, projected195HoursConservative: runtime.conservativeProjection.hours.total, finalLedgerAssemblyAuthorized: analysis.authorization.finalLedgerAssembly, scoreDerivationAuthorized: false }, null, 2));
