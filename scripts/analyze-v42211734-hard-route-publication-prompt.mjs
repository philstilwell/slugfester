#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";
import { V42211734_ROOT } from "./lib/v42211734-hard-route-publication-prompt.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution, preparation] = await Promise.all(["execution-manifest.json", "model-execution.json", "preparation-manifest.json"].map((file) => readFile(path.resolve(`${V42211734_ROOT}/${file}`), "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-five-isolated-hard-route-publication-contexts-authorized" && execution.retries === 0 && execution.correctionContexts === 0 && execution.modelAuthoredScores === 0, "publication analysis unavailable or crossed its boundary");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `publication analysis source hash mismatch: ${file}`);
const contexts = [];
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  if (!result) { contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId, status: "unattempted", accepted: false, validationReplayed: false, moves: null }); continue; }
  let replay = null;
  if (result.gateAcceptancePassed) {
    replay = validateV42211732PublicationOutput(JSON.parse(await readFile(path.resolve(context.output), "utf8")), JSON.parse(await readFile(path.resolve(context.packet), "utf8")));
    assertV4(replay.status === "passed" && sha256(await readFile(path.resolve(context.output))) === result.outputSha256, `${context.debateNumber}: publication replay mismatch`);
  }
  contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId, status: result.status, accepted: result.gateAcceptancePassed, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: replay?.status === "passed", moves: replay?.moves ?? null, critiques: replay?.critiques ?? null, tags: replay?.tags ?? null, quoteExactSourceMatches: replay?.quoteExactSourceMatches ?? null, noveltyItems: replay?.noveltyItems ?? null, introducedItems: replay?.introducedItems ?? null, newArguments: replay?.newArguments ?? null, modelAuthoredScores: replay?.calculatedScoresAuthoredByModel ?? null });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length ? Math.max(...valid.map((context) => context.elapsedMinutes)) : null;
const meanElapsedMinutes = valid.length ? Number((valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) / valid.length).toFixed(2)) : null;
const semanticPass = valid.length === 5 && valid.reduce((sum, context) => sum + context.moves, 0) === preparation.totals.moves && valid.reduce((sum, context) => sum + context.quoteExactSourceMatches, 0) === 10 && valid.every((context) => context.newArguments >= 4 && context.introducedItems >= 2 && context.modelAuthoredScores === 0);
const timingPass = semanticPass && maximumElapsedMinutes <= manifest.executionPolicy.maximumMinutesPerContext && meanElapsedMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const passed = semanticPass && timingPass;
const analysis = { schemaVersion: "4.2.21.17.34-hard-route-publication-prompt-analysis", protocolId: manifest.protocolId, status: passed ? "hard-route-publication-model-gate-passed" : semanticPass ? "hard-route-publication-gate-failed-timing" : "hard-route-publication-gate-failed-validation", calibrationOnly: true, AIOnly: true, contexts, gate: { semanticPass, timingPass, validContexts: valid.length, requiredValidContexts: 5, movesAuthored: valid.reduce((sum, context) => sum + context.moves, 0), requiredMoves: preparation.totals.moves, exactSourceQuotes: valid.reduce((sum, context) => sum + context.quoteExactSourceMatches, 0), requiredExactSourceQuotes: 10, critiques: valid.reduce((sum, context) => sum + context.critiques, 0), noveltyItems: valid.reduce((sum, context) => sum + context.noveltyItems, 0), introducedItems: valid.reduce((sum, context) => sum + context.introducedItems, 0), newArguments: valid.reduce((sum, context) => sum + context.newArguments, 0), maximumElapsedMinutes, maximumAllowedMinutesPerContext: manifest.executionPolicy.maximumMinutesPerContext, meanElapsedMinutes, maximumAllowedMeanMinutes: manifest.executionPolicy.maximumMeanMinutes, retries: 0, correctionContexts: 0, modelAuthoredScores: 0 }, evidenceBoundary: { oneDebatePerContext: true, legacyAssessmentsUnavailable: true, otherDebatesUnavailable: true, participantJudgmentClosed: true, modelScoreFieldsUnavailable: true, everyLockedMoveAuthoredOnce: true, quoteExactSourceMatching: true, localReferenceCatalogOnly: true, completeAIExtensionNoveltyMapping: true, prohibitedLanguageHits: 0 }, totals: { modelContexts: execution.contextsAttempted, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 }, authorization: { deterministicCompilation: passed, renderingVerification: false, readinessPromotion: false, publicationFinalization: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(path.resolve(manifest.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: valid.length, movesAuthored: analysis.gate.movesAuthored, exactSourceQuotes: analysis.gate.exactSourceQuotes, noveltyItems: analysis.gate.noveltyItems, introducedItems: analysis.gate.introducedItems, timings: { byDebate: Object.fromEntries(contexts.map((context) => [context.debateNumber, context.elapsedMinutes ?? null])), maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass }, retries: 0, correctionContexts: 0, modelAuthoredScores: 0, nextAuthorized: passed ? "deterministic-publication-compilation" : "failure-diagnosis-only" }, null, 2));
