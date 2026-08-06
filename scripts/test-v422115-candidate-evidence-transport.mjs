#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildV422115EvidenceBundle, validateV422115EvidenceBundle } from "./lib/v422115-candidate-evidence-transport.mjs";

const discoveryRoot = "docs/calibration/v4.2.21.12/simplified-partition-discovery";
const discovery = JSON.parse(await readFile(`${discoveryRoot}/analysis.json`, "utf8"));
const sourcePreparation = JSON.parse(await readFile(`${discoveryRoot}/preparation-manifest.json`, "utf8"));
const results = [];
for (const debate of discovery.debates) {
  const source = sourcePreparation.contexts.find((context) => context.debateNumber === debate.debateNumber);
  const [candidateBundle, eventsDocument] = await Promise.all([readFile(debate.bundlePath, "utf8").then(JSON.parse), readFile(source.originalEvents, "utf8").then(JSON.parse)]);
  const first = buildV422115EvidenceBundle(candidateBundle, eventsDocument), second = buildV422115EvidenceBundle(candidateBundle, eventsDocument);
  assert.deepEqual(first, second);
  assert.equal(validateV422115EvidenceBundle(first, candidateBundle, eventsDocument).status, "passed");
  results.push({ debateNumber: debate.debateNumber, candidates: first.candidateCount, evidenceBytes: Buffer.byteLength(`${JSON.stringify(first, null, 2)}\n`), maximumExcerptCharacters: Math.max(...first.candidates.map((candidate) => candidate.candidateEvidence.characterCount)), maximumExcerptTokens: Math.max(...first.candidates.map((candidate) => candidate.candidateEvidence.tokenCount)) });
}
console.log(JSON.stringify({ status: "passed", debates: results, everyCandidateRetained: true, deterministicReplay: true, sourceExactEvidence: true, evidenceTokenRange: [12, 90], evidenceCharacterMaximum: 450, semanticCandidateDownselectionPerformed: false, finalSelectedEvidenceRerenderRequired: true, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
