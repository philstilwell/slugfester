#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221_ROOT, validateV4221PassBOutput } from "./lib/v4221-pass-b-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, analysis] = await Promise.all(["execution-manifest.json", "model-execution.json", "pass-b-analysis.json"].map((file) => readFile(`${V4221_ROOT}/${file}`, "utf8").then(JSON.parse)));
assertV4(execution.validContexts === 2 && analysis.status === "isolated-source-span-pass-b-gate-failed-validation", "expected v4.2.21 validation failure unavailable");
const failedResult = execution.results.find((result) => !result.gateAcceptancePassed);
const context = manifest.contexts.find((item) => item.debateNumber === failedResult.debateNumber);
assertV4(context && failedResult.status === "output-validation-failed", "single failed Pass B context unavailable");
const [output, packet, sourcePacket, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.passBPacket, "utf8").then(JSON.parse), readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
const violations = output.moveJudgments.filter((move) => !move.charity.tested && (move.charity.alternative !== "" || move.charity.decisiveQualification !== "")).map((move) => ({ moveId: move.moveId, tested: move.charity.tested, representationalCharity: move.ratings.representationalCharity.value, alternativeCharacters: move.charity.alternative.length, decisiveQualificationCharacters: move.charity.decisiveQualification.length }));
const ratingViolations = output.moveJudgments.filter((move) => !move.charity.tested && move.ratings.representationalCharity.value !== 75).map((move) => move.moveId);
assertV4(violations.length > 0 && failedResult.validationMessage.includes("untested charity descriptions must be empty"), "expected charity conditional failure not found");
const counterfactual = structuredClone(output);
for (const move of counterfactual.moveJudgments) if (!move.charity.tested) { move.charity.alternative = ""; move.charity.decisiveQualification = ""; }
const counterfactualValidation = validateV4221PassBOutput(counterfactual, packet, sourcePacket, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assertV4(counterfactualValidation.status === "passed", "charity-only counterfactual did not isolate the failure class");

const diagnosis = {
  schemaVersion: "4.2.21.1-pass-b-failure-diagnosis",
  protocolId: manifest.protocolId,
  status: "isolated-charity-conditional-schema-gap",
  failedDebate: context.debateNumber,
  failedRawOutput: context.rawOutput,
  failedRawOutputPreserved: true,
  acceptedDebatesUnaffected: execution.results.filter((result) => result.gateAcceptancePassed).map((result) => result.debateNumber),
  timing: { allAttemptMeanMinutes: Number((execution.results.reduce((sum, result) => sum + result.elapsedMs, 0) / execution.results.length / 60000).toFixed(2)), failedContextMinutes: Number((failedResult.elapsedMs / 60000).toFixed(2)), timingWasNotFailureCause: true },
  cause: { layer: "Pass B JSON schema", semanticValidatorCorrect: true, schemaAllowedUntestedCharityDescriptions: true, manualDidNotStateEmptyStringAndFixed75ContractExplicitly: true, transcriptOrSourceFailure: false, judgmentTopologyFailure: false },
  violations,
  untestedCharityRatingViolations: ratingViolations,
  isolationCounterfactual: { acceptedAsGateOutput: false, onlyClearedForbiddenUntestedCharityDescriptions: true, fullValidatorThenPassed: true, automaticCorrectionAuthorized: false },
  gate: { validContexts: 2, requiredValidContexts: 3, retries: 0, corrections: 0, scoresDerived: 0, gatePassed: false },
  totals: { modelContexts: 3, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  authorization: { charitySchemaClosureDesign: true, acceptedPassBOutputsRemainLocked: true, singleFailedContextRecoveryPreparation: false, recoveryModelExecution: false, disagreementExtraction: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${V4221_ROOT}/failure-diagnosis.json`, `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: diagnosis.status, failedDebate: diagnosis.failedDebate, violations: violations.length, ratingViolations: ratingViolations.length, counterfactualFullValidationPassed: true, retries: 0, corrections: 0, scoresDerived: 0, nextAuthorized: "charity-schema-closure-design" }, null, 2));
