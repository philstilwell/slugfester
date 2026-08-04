#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_DEBATE_NUMBERS, V388_ROOT, makeProposalEquivalentFixture, validateReviewOutput } from "./lib/v388-coverage-review.mjs";
const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const gate = await readJson("docs/calibration/v3.8.4/held-out-score-reconstruction-gate/gate-manifest.json");
const debates = [];
let leakedStableMoveIds = 0;
let invalidCandidateShapes = 0;
for (const debateNumber of V388_DEBATE_NUMBERS) {
  const debate = gate.sample.debates.find((item) => item.debateNumber === debateNumber);
  const [packet, mapping, schema, events] = await Promise.all([readJson(`${V388_ROOT}/packets/debate-${debateNumber}.json`), readJson(`${V388_ROOT}/private-mappings/debate-${debateNumber}.json`), readJson(`${V388_ROOT}/schemas/debate-${debateNumber}.schema.json`), readJson(debate.events.path)]);
  const fixture = makeProposalEquivalentFixture(packet, mapping);
  const summary = validateReviewOutput(fixture, packet, schema, events);
  const serializedPacket = JSON.stringify(packet);
  leakedStableMoveIds += mapping.mappingEntries.filter((entry) => serializedPacket.includes(entry.stableRef)).length;
  const expectedCandidateKeys = ["atomicExcerpt", "candidateRef", "contextWindow", "sourceSpan"];
  invalidCandidateShapes += packet.candidates.filter((candidate) => JSON.stringify(Object.keys(candidate).sort()) !== JSON.stringify(expectedCandidateKeys)).length;
  debates.push({ debateNumber, candidateCount: packet.candidates.length, ...summary });
}
assert.equal(leakedStableMoveIds, 0, "stable move ID leaked into review packet");
assert.equal(invalidCandidateShapes, 0, "candidate-specific proposal field leaked into review packet");
const artifact = { schemaVersion: "3.8.8-independent-coverage-review-dry-fixture", passed: debates.length === 3 && leakedStableMoveIds === 0 && invalidCandidateShapes === 0, modelContextsExecuted: 0, proposalFieldsVisibleInReviewPackets: invalidCandidateShapes, stableMoveIdsVisibleInReviewPackets: leakedStableMoveIds, scoreFields: 0, debates };
if (shouldWrite) { await mkdir(path.resolve(root, V388_ROOT), { recursive: true }); await writeFile(path.resolve(root, `${V388_ROOT}/dry-fixture.json`), `${JSON.stringify(artifact, null, 2)}\n`); }
console.log(JSON.stringify(artifact, null, 2));
