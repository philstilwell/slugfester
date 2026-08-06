#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42219_ROOT } from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(`${V42219_ROOT}/discovery-execution-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.status === "partition-discovery-complete-with-failure" && execution.contextsAttempted === manifest.contexts.length && execution.validContexts === 11 && execution.invalidContexts === 1 && execution.retries === 0, "expected one frozen discovery validation failure");
const invalid = execution.results.filter((result) => !result.accepted);
const outputPath = manifest.contexts.find((context) => context.debateNumber === invalid[0].debateNumber && context.chunkId === invalid[0].chunkId).rawOutput;
const output = JSON.parse(await readFile(outputPath, "utf8"));
const candidates = new Map(output.candidates.map((candidate) => [candidate.candidateId, candidate]));
const sameSideTargets = [];
for (const candidate of output.candidates) for (const targetId of candidate.responseIntent.localTargetCandidateIds) {
  const target = candidates.get(targetId);
  if (target?.side === candidate.side) sameSideTargets.push({ candidateId: candidate.candidateId, candidateSide: candidate.side, targetCandidateId: targetId, targetSide: target.side });
}
assertV4(sameSideTargets.length > 0 && invalid[0].validationMessage.includes("local target must be on the opposing side"), "failure class does not replay");
const analysis = {
  schemaVersion: "4.2.21.11-partition-discovery-failure-analysis",
  protocolId: manifest.protocolId,
  status: "partition-discovery-gate-failed-successor-design-authorized",
  calibrationOnly: true,
  AIOnly: true,
  execution: { contextsPlanned: execution.contextsPlanned, contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, retries: execution.retries, totalElapsedMs: execution.totalElapsedMs, meteredApiCostUsd: execution.meteredApiCostUsd, transcriptionCostUsd: execution.transcriptionCostUsd },
  failure: { debateNumber: invalid[0].debateNumber, chunkId: invalid[0].chunkId, status: invalid[0].status, transportPassed: invalid[0].commandExitCode === 0 && !invalid[0].timedOut, rawOutputPreserved: invalid[0].rawOutputWritten, rawOutputSha256: invalid[0].rawOutputSha256, class: "same-side-local-target", sameSideTargets, validatorMessage: "local target must be on the opposing side" },
  interpretation: { validatorCorrectlyRejectedOutput: true, manualAlreadyProhibitedSameSideTarget: true, schemaCouldNotEnforceCandidateSideDependency: true, semanticOutputRepairAuthorized: false, retryAuthorized: false, acceptedOutputsReusableInSuccessorGate: false, candidateBundlesCompiled: false, primaryAssessmentExecuted: false, scoresDerived: 0 },
  successorRecommendation: { removeLocalTargetIdsFromScoreBlindDiscovery: true, discoveryResponseIntentFields: ["kind", "earlierTargetDescription"], discoveryKindValues: ["constructive", "reply"], constructiveDescriptionMustBeEmpty: true, replyDescriptionMinimumCharacters: 30, repositoryDerivesMoveKindOnly: true, primaryAOwnsSelectedMoveTargetTopology: true, rerunAllTwelveAsNewPreregisteredGate: true },
  authorization: { successorSchemaDesign: true, successorExecutionManifest: false, modelExecution: false, retry: false, candidateCompilation: false, primaryExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${V42219_ROOT}/discovery-failure-analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, execution: analysis.execution, failure: analysis.failure, successorRecommendation: analysis.successorRecommendation }, null, 2));
