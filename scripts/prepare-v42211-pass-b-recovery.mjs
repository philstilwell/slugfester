#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221_ROOT } from "./lib/v4221-pass-b-consensus.mjs";
import { V42211_ROOT } from "./lib/v42211-charity-closure.mjs";

const shouldWrite = process.argv.includes("--write");
const preparationPath = `${V42211_ROOT}/preparation-manifest.json`;
if (shouldWrite) await access(preparationPath).then(() => { throw new Error(`${preparationPath} already exists`); }, () => true);
const [oldPreparation, diagnosis, design] = await Promise.all([
  readFile(`${V4221_ROOT}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${V4221_ROOT}/failure-diagnosis.json`, "utf8").then(JSON.parse),
  readFile(`${V42211_ROOT}/design-verification.json`, "utf8").then(JSON.parse)
]);
assertV4(diagnosis.status === "isolated-charity-conditional-schema-gap" && diagnosis.failedDebate === "195" && design.authorization.singleDebate195RecoveryPreparation, "v4.2.21.1 recovery preparation unauthorized");
const source = oldPreparation.contexts.find((context) => context.debateNumber === "195");
assertV4(source, "Debate 195 source context missing");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const acceptedOutputs = ["27", "188"].map((debateNumber) => ({ debateNumber, rawOutput: `${V4221_ROOT}/pass-b-outputs/debate-${debateNumber}.json`, reconstructedOutput: `${V4221_ROOT}/pass-b-reconstructed/debate-${debateNumber}.json` }));
for (const item of acceptedOutputs) { item.rawOutputSha256 = sha256(await readFile(item.rawOutput)); item.reconstructedOutputSha256 = sha256(await readFile(item.reconstructedOutput)); }
const context = { ...structuredClone(source), priorFailedOutput: `${V4221_ROOT}/pass-b-outputs/debate-195.json`, rawOutput: `${V42211_ROOT}/pass-b-output/debate-195.json`, reconstructedOutput: `${V42211_ROOT}/pass-b-reconstructed/debate-195.json` };
const preparation = {
  schemaVersion: "4.2.21.1-single-pass-b-recovery-preparation",
  protocolId: "v4.2.21.1-charity-conditional-closure",
  status: shouldWrite ? "prepared-one-fresh-debate-195-pass-b-recovery-context" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  recoveryNotRetryOfFrozenGate: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  inputs: { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", workflowBase: "docs/assessment-workflow-v4.2.21.md", workflowRecovery: "docs/assessment-workflow-v4.2.21.1.md", manualBase: `${V4221_ROOT}/manual.md`, manualRecovery: `${V42211_ROOT}/manual.md`, schema: `${V42211_ROOT}/pass-b.schema.json` },
  context,
  acceptedOutputs,
  isolation: { freshTemporaryCodexHome: true, freshSourceDirectory: true, oneDebateOnly: true, completeTimestampedSourceLedgerVisible: true, lockedInventoryVisible: true, primaryJudgmentsHidden: true, failedOutputHidden: true, acceptedOutputsHidden: true, triggerReasonHidden: true, otherDebatesHidden: true, scoresHidden: true, winnersHidden: true, publicationProseHidden: true },
  totals: { contexts: 1, lockedMoves: context.packetValidation.lockedMoves, acceptedOutputsReused: 2, modelContextsExecuted: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { executionManifest: true, recoveryModelExecution: false, disagreementExtraction: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debate: "195", contexts: 1, lockedMoves: preparation.totals.lockedMoves, acceptedOutputsReused: 2, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, recoveryModelExecutionAuthorized: false }, null, 2));
