#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V42211735_ROOT } from "./lib/v42211735-hard-route-publication-stability.mjs";

const shouldWrite = process.argv.includes("--write");
const preparation = JSON.parse(await readFile(path.resolve(`${V42211735_ROOT}/preparation-manifest.json`), "utf8"));
const findings = [];
for (const context of preparation.contexts) {
  const output = JSON.parse(await readFile(path.resolve(context.output), "utf8"));
  for (const [moveId, prose] of Object.entries(output.moveProse)) {
    const critique = prose.critique.trim();
    const issues = [];
    if (!/[.!?]$/u.test(critique)) issues.push("missing-terminal-punctuation");
    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(critique)) issues.push("unexpected-non-latin-script");
    if (critique.length === context.critiqueCharacterEnvelope[1]) issues.push("exact-structured-maximum-length");
    if (issues.length) findings.push({ debateNumber: context.debateNumber, moveId, characters: critique.length, issues, terminalFragment: critique.slice(-160) });
  }
}
const diagnosis = {
  schemaVersion: "4.2.21.17.35-publication-integrity-diagnosis",
  protocolId: preparation.protocolId,
  status: findings.length ? "failed-publication-prose-integrity" : "passed-publication-prose-integrity",
  calibrationOnly: true,
  visualInspectionTrigger: "Desktop browser snapshot exposed an unexpected CJK token and an incomplete critique ending.",
  deterministicReplay: { debates: preparation.contexts.length, moves: preparation.totals.moves, findings, findingCount: findings.length, affectedDebates: [...new Set(findings.map((finding) => finding.debateNumber))] },
  rootCause: findings.length ? "The structured-output maxLength of 1,020 characters permitted or induced exact-bound truncation; the repository sentence counter accepted an unterminated fourth fragment." : null,
  requiredRepair: { removeCritiqueMaxLength: true, retainCritiqueMinLength: 880, requireTerminalPunctuation: true, rejectUnexpectedNonLatinScripts: true, retainRepositoryWordInterval: [105, 130], rerunFreshFiveDebateGate: true },
  authorization: { renderingPromotion: false, readinessPromotion: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(`${V42211735_ROOT}/integrity-diagnosis.json`), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify(diagnosis, null, 2));

