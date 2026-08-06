#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write"), root = "docs/calibration/v4.2.21.13/partition-primary-a";
const manifest = JSON.parse(await readFile(`${root}/execution-manifest.json`, "utf8")), execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
assertV4(execution.status === "three-structural-partition-primary-a-contexts-passed" && execution.validContexts === 3 && execution.retries === 0 && execution.scoresDerived === 0, "all partition Primary A contexts must pass without retry or scores");
const debates = [];
for (const context of manifest.contexts) {
  const [raw, provenance] = await Promise.all([context.rawOutput, context.provenanceOutput].map((file) => readFile(file, "utf8").then(JSON.parse)));
  assertV4(raw.sections.length >= 4 && raw.sections.length <= 6 && raw.moves.length >= 8 && raw.moves.length <= 24, `${context.debateNumber}: bounded Primary A inventory failed`);
  assertV4(provenance.moves.length === raw.moves.length && provenance.moves.every((move) => move.immutableCandidateFieldsPreserved), `${context.debateNumber}: candidate provenance failed`);
  const sectionCounts = raw.sections.map((section) => ({ sectionId: section.sectionId, pro: raw.moves.filter((move) => move.sectionId === section.sectionId && move.side === "pro").length, con: raw.moves.filter((move) => move.sectionId === section.sectionId && move.side === "con").length }));
  assertV4(sectionCounts.every((section) => section.pro >= 1 && section.pro <= 2 && section.con >= 1 && section.con <= 2), `${context.debateNumber}: structural side count failed`);
  debates.push({ debateNumber: context.debateNumber, debateId: context.debateId, sections: raw.sections.length, moves: raw.moves.length, proMoves: raw.moves.filter((move) => move.side === "pro").length, conMoves: raw.moves.filter((move) => move.side === "con").length, mediumAttributionMoves: raw.moves.filter((move) => move.attributionConfidence === "medium").length, lowAttributionMoves: raw.moves.filter((move) => move.attributionConfidence === "low").length, sectionCounts, rawOutput: context.rawOutput, compiledOutput: context.compiledOutput, provenance: context.provenanceOutput, elapsedMs: execution.results.find((result) => result.debateNumber === context.debateNumber).elapsedMs });
}
const analysis = { schemaVersion: "4.2.21.13.1-partition-primary-a-analysis", protocolId: manifest.protocolId, status: "partition-primary-a-passed-pass-b-preparation-authorized", calibrationOnly: true, AIOnly: true, debates, audit: { frozenContexts: 3, validContexts: 3, invalidContexts: 0, retries: 0, structuralSideCountsPassed: true, unchangedV4220ValidatorPassed: true, immutableCandidateFieldsPreserved: true, automaticTargetRepair: false, scoresDerived: 0 }, totals: { sections: debates.reduce((sum, debate) => sum + debate.sections, 0), moves: debates.reduce((sum, debate) => sum + debate.moves, 0), mediumAttributionMoves: debates.reduce((sum, debate) => sum + debate.mediumAttributionMoves, 0), lowAttributionMoves: debates.reduce((sum, debate) => sum + debate.lowAttributionMoves, 0), totalElapsedMs: execution.totalElapsedMs, modelContextsExecuted: execution.contextsAttempted, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, authorization: { passBPacketPreparation: true, passBModelExecution: false, disagreementExtraction: false, audioExecution: false, adjudicationExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates, totals: analysis.totals, passBPacketPreparationAuthorized: true }, null, 2));
