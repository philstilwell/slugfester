#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_PERFORMANCE_ROOT,
  assertV388,
  canonicalJson,
  validateV388PerformanceOutput,
} from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const normalizedRoot = `${recoveryRoot}/normalized`;
const auditPath = `${recoveryRoot}/nonanswer-summary-normalization-audit.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };

assertV388(!(await exists(auditPath)), `${auditPath} already exists`);
assertV388(!(await exists(normalizedRoot)), `${normalizedRoot} already exists`);

const executionPath = `${recoveryRoot}/model-execution.json`;
const execution = await readJson(executionPath);
assertV388(execution.validOutputContexts === 0 && execution.moveJudgmentsAcrossPasses === 0, "clean validated-recovery gate must remain failed");
assertV388(execution.results.length === 6 && execution.results.every((item) => item.status === "output-validation-failed" && item.outputWritten && !item.deterministicValidationPassed && !item.gateAcceptancePassed), "unexpected raw execution status");
assertV388(execution.results.every((item) => item.validationMessage.includes("nonanswer contact summary must be empty")), "raw failures are not uniformly the permitted representation failure");

const contextAudits = [];
let moveJudgments = 0;
let normalizationCount = 0;

for (const result of execution.results) {
  const passLower = result.pass.toLowerCase();
  const rawPath = `${recoveryRoot}/outputs/debate-${result.debateNumber}-pass-${passLower}.json`;
  const packetPath = `${V388_PERFORMANCE_ROOT}/packets/debate-${result.debateNumber}.json`;
  const normalizedPath = `${normalizedRoot}/outputs/debate-${result.debateNumber}-pass-${passLower}.json`;
  const rawBytes = await bytes(rawPath);
  assertV388(sha256(rawBytes) === result.outputSha256, `${rawPath}: raw output hash differs from execution record`);
  const raw = JSON.parse(rawBytes);
  const normalized = structuredClone(raw);
  const changes = [];

  normalized.moveJudgments.forEach((judgment, index) => {
    const response = judgment.response;
    if (!["relevant-nonanswer", "nonanswer"].includes(response.class) || response.contactedComponentSummary === "") return;
    assertV388(response.contactedComponents === 0, `${rawPath}: attempted normalization of a contacted response`);
    changes.push({
      path: `moveJudgments[${index}].response.contactedComponentSummary`,
      moveId: judgment.moveId,
      responseClass: response.class,
      contactedComponents: response.contactedComponents,
      before: response.contactedComponentSummary,
      after: "",
    });
    response.contactedComponentSummary = "";
  });

  assertV388(changes.length >= 1, `${rawPath}: expected at least one permitted normalization`);
  const packet = await readJson(packetPath);
  const validation = validateV388PerformanceOutput(normalized, packet, result.pass);
  assertV388(validation.status === "passed", `${normalizedPath}: unchanged validator did not pass`);
  assertV388(canonicalJson(raw) !== canonicalJson(normalized), `${rawPath}: normalization made no structural change`);

  const normalizedBytes = `${JSON.stringify(normalized, null, 2)}\n`;
  await mkdir(path.dirname(path.resolve(root, normalizedPath)), { recursive: true });
  await writeFile(path.resolve(root, normalizedPath), normalizedBytes);
  assertV388(sha256(await bytes(rawPath)) === result.outputSha256, `${rawPath}: raw output mutated during recovery`);

  moveJudgments += normalized.moveJudgments.length;
  normalizationCount += changes.length;
  contextAudits.push({
    debateNumber: result.debateNumber,
    debateId: result.debateId,
    pass: result.pass,
    rawPath,
    rawSha256: result.outputSha256,
    normalizedPath,
    normalizedSha256: sha256(normalizedBytes),
    moveJudgments: normalized.moveJudgments.length,
    normalizationCount: changes.length,
    changes,
    validation,
  });
}

assertV388(moveJudgments === 162, "normalized recovery must contain 162 move judgments");
assertV388(normalizationCount === 21, "observed recovery must contain exactly 21 permitted path changes");
assertV388(contextAudits.every((context) => context.validation.status === "passed"), "all normalized contexts must validate");

const audit = {
  schemaVersion: "3.8.8-performance-nonanswer-summary-normalization-audit",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "passed-post-hoc-representation-only-normalization",
  recoveryPolicyPath: `${V388_PERFORMANCE_ROOT}/nonanswer-summary-recovery.md`,
  rawExecutionPath: executionPath,
  originalCleanGatePassed: false,
  rawOutputsPreserved: true,
  normalizedCopiesSeparated: true,
  contexts: 6,
  moveJudgments,
  normalizationCount,
  changedField: "moveJudgments[*].response.contactedComponentSummary",
  permittedBeforeClasses: ["relevant-nonanswer", "nonanswer"],
  requiredContactedComponents: 0,
  permittedAfterValue: "",
  substantiveJudgmentFieldsChanged: 0,
  unchangedPacketAwareValidatorPassedContexts: 6,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  authorization: {
    deterministicDisagreementExtraction: true,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  contextAudits,
};

await writeFile(path.resolve(root, auditPath), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  status: audit.status,
  originalCleanGatePassed: false,
  normalizedContextsPassed: 6,
  moveJudgments,
  normalizationCount,
  substantiveJudgmentFieldsChanged: 0,
  deterministicDisagreementExtractionAuthorized: true,
  scoreDerivationAuthorized: false,
}, null, 2));
