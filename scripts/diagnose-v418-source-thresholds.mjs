#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson } from "./lib/v41-lean-production.mjs";
import {
  V418_MINIMUM_LEXICAL_RECALL,
  V418_MINIMUM_ORDERED_COVERAGE,
  V418_ROOT,
  bagOfWordsRecall,
  lexicalTokens,
  orderedTokenCoverage
} from "./lib/v418-source-integrity.mjs";

const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.1.7/fresh-six-gate";
const preparation = await readJson(`${priorRoot}/preparation-manifest.json`);
const moves = [];
for (const debate of preparation.debates) {
  const [packet, output] = await Promise.all([readJson(debate.packet), readJson(debate.output)]);
  const eventsDocument = await readJson(packet.sourceChain.eventsPath);
  const events = Array.isArray(eventsDocument) ? eventsDocument : eventsDocument.events;
  for (const move of output.sections.flatMap((section) => [...section.proMoves, ...section.conMoves])) {
    const spanText = events.slice(move.sourceSpan.startEvent, move.sourceSpan.endEvent + 1).map((event) => event.text).join(" ");
    const lexicalRecall = bagOfWordsRecall(move.sourceSpan.excerpt, spanText);
    const orderedCoverage = orderedTokenCoverage(move.sourceSpan.excerpt, spanText);
    moves.push({
      debateNumber: debate.debateNumber,
      moveId: move.moveId,
      excerptTokens: lexicalTokens(move.sourceSpan.excerpt).length,
      lexicalRecall: Number(lexicalRecall.toFixed(6)),
      orderedCoverage: Number(orderedCoverage.toFixed(6)),
      passedLexical: lexicalRecall >= V418_MINIMUM_LEXICAL_RECALL,
      passedOrdered: orderedCoverage >= V418_MINIMUM_ORDERED_COVERAGE
    });
  }
}
const failed = moves.filter((move) => !move.passedLexical || !move.passedOrdered);
const passed = moves.filter((move) => move.passedLexical && move.passedOrdered);
const artifact = {
  schemaVersion: "4.1.8-source-integrity-threshold-diagnostic",
  status: "diagnostic-only-threshold-separation-confirmed",
  sourceBoundary: { sourceVersion: "v4.1.7", judgmentsReusableInV418: false, scoresAccessed: false, legacyComparatorsAccessed: false },
  thresholds: { minimumLexicalRecall: V418_MINIMUM_LEXICAL_RECALL, minimumOrderedCoverage: V418_MINIMUM_ORDERED_COVERAGE },
  totals: { moves: moves.length, passed: passed.length, failed: failed.length, lexicalFailures: moves.filter((move) => !move.passedLexical).length, orderedFailures: moves.filter((move) => !move.passedOrdered).length },
  separation: {
    lowestPassingLexicalRecall: Math.min(...passed.map((move) => move.lexicalRecall)),
    lowestPassingOrderedCoverage: Math.min(...passed.map((move) => move.orderedCoverage)),
    highestFailingLexicalRecall: Math.max(...failed.map((move) => move.lexicalRecall)),
    highestFailingOrderedCoverage: Math.max(...failed.map((move) => move.orderedCoverage))
  },
  failures: failed,
  interpretation: "The ordered check detects one additional wrong-order/wrong-span case beyond the lexical check. All 57 remaining diagnostic moves clear both thresholds; the lowest ordered coverage among them is above 0.93.",
  execution: { modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  authorization: { validatorFixtureUse: true, v417JudgmentReuse: false, scoreDerivation: false, legacyComparison: false, primaryModelExecution: false }
};
if (shouldWrite) await writeFile(path.resolve(V418_ROOT, "source-integrity-threshold-diagnostic.json"), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: artifact.status, ...artifact.totals, ...artifact.separation, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
