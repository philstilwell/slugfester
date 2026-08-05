#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson } from "./lib/v41-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.1.7/fresh-six-gate";
const preparation = await readJson(`${root}/preparation-manifest.json`);
const lexicalTokens = (value) => String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
function bagOfWordsRecall(reference, candidate) {
  const referenceTokens = lexicalTokens(reference); const counts = new Map();
  for (const token of lexicalTokens(candidate)) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of referenceTokens) { const available = counts.get(token) ?? 0; if (available > 0) { matched += 1; counts.set(token, available - 1); } }
  return referenceTokens.length ? matched / referenceTokens.length : 0;
}
const moves = [];
for (const debate of preparation.debates) {
  const [output, packet] = await Promise.all([readJson(debate.output), readJson(debate.packet)]); const events = await readJson(packet.sourceChain.eventsPath);
  for (const move of output.sections.flatMap((section) => [...section.proMoves, ...section.conMoves])) {
    const start = events[move.sourceSpan.startEvent]; const end = events[move.sourceSpan.endEvent]; const spanText = events.slice(move.sourceSpan.startEvent, move.sourceSpan.endEvent + 1).map((event) => event.text).join(" ");
    const excerptRecall = bagOfWordsRecall(move.sourceSpan.excerpt, spanText); const startTimeExact = start.startMs === move.sourceSpan.startMs; const declaredEndInsideEndEvent = move.sourceSpan.endMs >= end.startMs && move.sourceSpan.endMs <= end.startMs + end.durationMs + 250;
    const checks = { excerptRecallAtLeast80Percent: excerptRecall >= 0.8, startTimeMatchesStartEvent: startTimeExact, declaredEndInsideEndEvent };
    moves.push({ debateNumber: debate.debateNumber, debateId: debate.debateId, moveId: move.moveId, sourceSpan: move.sourceSpan, excerptRecall: Number(excerptRecall.toFixed(6)), startEventTime: start.startMs, endEventStartTime: end.startMs, endEventDurationMs: end.durationMs, checks, passed: Object.values(checks).every(Boolean) });
  }
}
const failures = moves.filter((move) => !move.passed);
const audit = {
  schemaVersion: "4.1.7-source-span-integrity-audit",
  protocolId: "v4.1.7-fresh-six-validation",
  status: failures.length === 0 ? "passed-all-source-span-integrity-checks" : "failed-source-span-integrity",
  scope: { debates: preparation.debates.length, moves: moves.length, transcriptEventsLoadedForValidation: true },
  thresholds: { minimumExcerptBagOfWordsRecall: 0.8, startEventToleranceMs: 0, endEventToleranceMs: 250 },
  totals: { moves: moves.length, passed: moves.length - failures.length, failed: failures.length, excerptRecallFailures: moves.filter((move) => !move.checks.excerptRecallAtLeast80Percent).length, startTimeFailures: moves.filter((move) => !move.checks.startTimeMatchesStartEvent).length, endTimeFailures: moves.filter((move) => !move.checks.declaredEndInsideEndEvent).length },
  failures,
  confirmedCriticalFailure: { debateNumber: "91", moveId: "con-apriori-reply", lockedExcerptAbsentFromDeclaredSpan: true, independentAudioAdjudicationStatus: "unresolved", independentAudioAdjudicationFinding: "Expected-speaker segments in the locked span do not express the locked pain/aversive-behavior proposition." },
  validatorGap: { currentPrimaryValidatorLoadsEventText: false, currentPrimaryValidatorChecksOnlyIndexAndDurationBounds: true, invalidOutputPreviouslyAccepted: true },
  authorization: { validatorRemediation: true, reuseV417Scores: false, disagreementExtraction: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, "source-span-integrity-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: audit.status, debates: audit.scope.debates, moves: audit.totals.moves, passed: audit.totals.passed, failed: audit.totals.failed, excerptRecallFailures: audit.totals.excerptRecallFailures, startTimeFailures: audit.totals.startTimeFailures, endTimeFailures: audit.totals.endTimeFailures, disagreementExtractionAuthorized: false, scoreDerivationAuthorized: false }, null, 2));
if (failures.length > 0) process.exitCode = 1;
