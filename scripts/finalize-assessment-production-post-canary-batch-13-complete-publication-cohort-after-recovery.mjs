#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch13PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const RECOVERY_ROOT = `${ROOT}/original-unattempted-context-resumption-4`;
const OUTPUT = `${RECOVERY_ROOT}/complete-cohort-analysis.json`;
const DEBATES = Object.freeze(["26", "190", "87", "20", "70", "30", "37", "117", "111", "34"]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const recoverySources = Object.freeze({
  debate87: `${ROOT}/timeout-recovery/critique-repair/exceptional-atomic-recovery/analysis.json`,
  debate20: `${ROOT}/original-unattempted-context-resumption-1/debate-20-field-disjoint-repair-1/analysis.json`,
  debate70: `${ROOT}/original-unattempted-context-resumption-2/debate-70-field-disjoint-repair-1/analysis.json`,
  debate30: `${ROOT}/original-unattempted-context-resumption-3/debate-30-field-disjoint-repair-1/analysis.json`,
  finalResumption: `${RECOVERY_ROOT}/analysis.json`,
  debate34: `${RECOVERY_ROOT}/debate-34-field-disjoint-repair-1/analysis.json`
});
const recoveryBytes = Object.fromEntries(await Promise.all(Object.entries(recoverySources)
  .map(async ([key, file]) => [key, await readFile(path.resolve(file))])));
const recovery = Object.fromEntries(Object.entries(recoveryBytes)
  .map(([key, bytes]) => [key, JSON.parse(bytes)]));
assertV4(
  recovery.debate87.status ===
      "debate-87-exceptional-third-level-atomic-shard-recovery-passed-awaiting-seven-context-resumption" &&
    recovery.debate20.status ===
      "debate-20-field-disjoint-repair-1-passed-awaiting-six-context-resumption" &&
    recovery.debate70.status ===
      "debate-70-field-disjoint-repair-1-passed-awaiting-five-context-resumption" &&
    recovery.debate30.status ===
      "debate-30-field-disjoint-repair-1-passed-awaiting-four-context-resumption" &&
    recovery.finalResumption.status === "four-context-publication-resumption-failed" &&
    recovery.finalResumption.execution?.contextsAttempted === 4 &&
    recovery.finalResumption.execution?.validContexts === 3 &&
    recovery.debate34.status ===
      "debate-34-field-disjoint-repair-1-passed-awaiting-complete-cohort-replay",
  "accepted publication recovery chain changed"
);

const validationReplay = [];
for (const debateNumber of DEBATES) {
  const output = `${ROOT}/outputs/debate-${debateNumber}.json`;
  const packet = `${ROOT}/packets/debate-${debateNumber}.json`;
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(output)), readFile(path.resolve(packet))
  ]);
  const validation = validatePostCanaryBatch13PublicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes)
  );
  assertV4(validation.status === "passed" && validation.lockedScoresUnchanged === true &&
    validation.calculatedScoresAuthoredByModel === 0,
  `Debate ${debateNumber}: complete publication validation failed`);
  validationReplay.push({
    debateNumber,
    output,
    outputSha256: sha256(outputBytes),
    packet,
    packetSha256: sha256(packetBytes),
    validation
  });
}
assertV4(canonicalJson(validationReplay.map((item) => item.debateNumber)) ===
  canonicalJson(DEBATES), "complete cohort order changed");
assertV4(validationReplay.reduce((sum, item) => sum + item.validation.moves, 0) === 199 &&
  validationReplay.reduce((sum, item) => sum + item.validation.critiques, 0) === 199 &&
  validationReplay.reduce((sum, item) => sum + item.validation.quoteExactSourceMatches, 0) === 20 &&
  validationReplay.reduce((sum, item) => sum + item.validation.overallCommentarySides, 0) === 20 &&
  validationReplay.reduce((sum, item) => sum + item.validation.aiExtensionSides, 0) === 20,
"complete publication cohort totals changed");

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-13-complete-publication-cohort-analysis-after-recovery",
  protocolId:
    "assessment-production-post-canary-batch-13-complete-publication-cohort-after-recovery",
  status: "post-canary-batch-13-complete-ten-debate-publication-output-gate-passed-after-recovery",
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  debates: DEBATES,
  recoverySources: Object.fromEntries(Object.entries(recoverySources).map(([key, file]) => [key, {
    path: file,
    sha256: sha256(recoveryBytes[key]),
    status: recovery[key].status
  }])),
  validationReplay,
  totals: {
    debates: 10,
    lockedMoves: 199,
    critiques: 199,
    exactSourceQuotes: 20,
    overallCommentarySides: 20,
    aiExtensionSides: 20,
    originalPublicationAttempts: 10,
    fieldDisjointPublicationRepairContexts: 18,
    fieldDisjointPublicationCorrectedCritiques: 32,
    fieldDisjointPublicationCorrectedQuotes: 1,
    debate87ExceptionalAtomicRecoveryContexts: 2,
    debate87ExceptionalRecoveredCritiques: 4,
    retries: 0,
    timeoutExtensions: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsdThisStage: 0
  },
  integrity: {
    everyAcceptedOutputReplayedDeterministically: true,
    everyDebateValidatedCompletely: true,
    participantJudgmentWasScoreBlind: true,
    scoresRemainedImmutable: true,
    aiExtensionExcludedFromScores: true,
    failedAttemptsPreservedAsEvidence: true,
    validationCleanFieldsRetainedDeterministically: true,
    automaticRetriesPerformed: false,
    timeoutExtensionsPerformed: false,
    scorePassRerun: false,
    publicationFinalized: false,
    productionMutated: false
  },
  authorization: {
    deterministicCompilationPreparation: true,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "prepare-batch-13-deterministic-publication-compilation"
};
assertV4(!(await exists(OUTPUT)), "complete cohort analysis already exists");
if (shouldWrite) await writeFile(path.resolve(OUTPUT), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? analysis.status : "preview",
  debates: analysis.totals.debates,
  lockedMoves: analysis.totals.lockedMoves,
  critiques: analysis.totals.critiques,
  exactSourceQuotes: analysis.totals.exactSourceQuotes,
  retries: 0,
  scorePassRerun: false,
  directIncrementalCostUsdThisStage: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
