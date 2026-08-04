#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388, readJson, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/schema-preflight-recovery`;
const [manifest, execution, output, packet] = await Promise.all([
  readJson(`${recoveryRoot}/execution-manifest.json`),
  readJson(`${recoveryRoot}/model-execution.json`),
  readJson(`${recoveryRoot}/output.json`),
  readJson(`${V388_PERFORMANCE_ROOT}/schema-preflight/synthetic-packet.json`)
]);
assertV388(execution.status === "corrected-preflight-validation-failed" && execution.result.commandExitCode === 0 && execution.result.outputWritten === true && execution.result.packetAwareValidationPassed === false, "corrected preflight failure boundary invalid");
assertV388(/untested charity rationale must say not tested/.test(execution.result.validationMessage ?? ""), "corrected preflight did not fail on the historical charity phrase check");
const charity = output.moveJudgments[0].ratings.representationalCharity;
assertV388(output.moveJudgments[0].charityTested === false && charity.value === 75 && /no charity test occurred/i.test(charity.rationale), "output does not express the required untested-charity semantics");
const validation = validateV388PerformanceOutput(output, packet, "A");
assertV388(validation.status === "passed" && validation.moves === 1, "semantic charity validator recovery did not validate existing output");
const audit = {
  schemaVersion: "3.8.8-performance-charity-validator-recovery-audit",
  status: "passed-existing-output-revalidated-with-semantic-anchor",
  exactSharedSchemaSha256: manifest.input.schemaSha256,
  endpointAccepted: true,
  modelOutputChanged: false,
  schemaChanged: false,
  judgmentContractChanged: false,
  validatorChange: { priorAcceptedPhrase: "contains exact contiguous words 'not tested'", addedEquivalentForms: ["charity ... not ... tested", "no ... charity test"], value75StillRequired: true, charityTestedFlagStillRequired: true },
  recoveredValidation: validation,
  scope: { syntheticContexts: 1, validSyntheticContexts: 1, debateJudgments: 0, participantScores: 0, participantProse: 0 },
  financials: { additionalModelCalls: 0, totalCorrectedPreflightModelCalls: 1, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { sixContextPerformanceRecoveryPreregistration: true, sixContextPerformanceModelExecution: false, scoreDerivation: false, assessmentProse: false }
};
if (shouldWrite) { await mkdir(path.resolve(root, recoveryRoot), { recursive: true }); await writeFile(path.resolve(root, `${recoveryRoot}/validator-recovery-audit.json`), `${JSON.stringify(audit, null, 2)}\n`); }
console.log(JSON.stringify({ status: "passed", endpointAccepted: true, existingOutputRevalidated: true, validSyntheticContexts: 1, modelOutputChanged: false, additionalModelCalls: 0, sixContextRecoveryPreregistrationAuthorized: true }, null, 2));
