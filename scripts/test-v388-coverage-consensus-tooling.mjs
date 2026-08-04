#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import {
  V388_CONSENSUS_ROOT,
  V388_DEBATE_NUMBERS,
  canonicalJson,
  resolveCoverageFields,
  validateCoverageAdjudicationOutput
} from "./lib/v388-coverage-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [disagreements, maps, audio] = await Promise.all([
  readJson(`${V388_CONSENSUS_ROOT}/initial-disagreements.json`),
  readJson(`${V388_CONSENSUS_ROOT}/adjudication-option-map.json`),
  readJson(`${V388_CONSENSUS_ROOT}/audio-verification.json`)
]);
const debates = [];
let blindIdentityLeakage = 0;
let resolvedFields = 0;

for (const debateNumber of V388_DEBATE_NUMBERS) {
  const dispute = disagreements.debates[debateNumber];
  const [packet, schema] = await Promise.all([
    readJson(dispute.adjudicationPacket),
    readJson(dispute.adjudicationSchema)
  ]);
  const packetText = JSON.stringify(packet);
  blindIdentityLeakage += Number(/proposalValue|reviewValue|proposalSnapshot|\"origin\"|-review-missing-/.test(packetText));
  const privateMap = maps.debates[debateNumber];
  const output = {
    schemaVersion: "3.8.8-coverage-adjudication-output",
    debateNumber,
    debateId: packet.debateId,
    reviewerRole: "coverage-adjudicator",
    fields: packet.disputedFields.map((field) => {
      const mapped = privateMap.fields.find((item) => item.fieldId === field.fieldId);
      const reviewOption = mapped.options.find((item) => item.origin === "review");
      return { fieldId: field.fieldId, optionId: reviewOption.optionId, rationale: "The synthetic fixture selects the independently reviewed option solely to prove anonymous option resolution, closed-schema validation, and final two-vote enforcement." };
    })
  };
  validateCoverageAdjudicationOutput(output, packet, schema);
  const resolved = resolveCoverageFields(dispute.comparisons, output, privateMap);
  if (!resolved.every((item) => item.finalVotes >= 2)) throw new Error(`${debateNumber}: two-vote fixture failed`);
  resolvedFields += resolved.length;
  debates.push({
    debateNumber,
    comparisonFields: dispute.comparisonCount,
    agreements: dispute.agreementCount,
    disagreements: dispute.disagreementCount,
    finalTwoVoteFields: resolved.length
  });
}

const fixture = {
  schemaVersion: "3.8.8-coverage-consensus-dry-fixture",
  passed: blindIdentityLeakage === 0 && !containsScoreField({ disagreements, maps }),
  modelContextsExecuted: 0,
  blindIdentityLeakage,
  scoreFields: containsScoreField({ disagreements, maps }) ? 1 : 0,
  audioVerificationsRequired: audio.records.length,
  audioVerificationsCompleted: audio.records.filter((item) => item.status === "verified").length,
  comparisonFields: disagreements.counts.comparisonFields,
  resolvedFields,
  comparisonCountIdentity: canonicalJson(debates.map((item) => item.comparisonFields)) === canonicalJson(Object.values(disagreements.debates).map((item) => item.comparisonCount)),
  debates
};
if (!fixture.passed || !fixture.comparisonCountIdentity || fixture.resolvedFields !== fixture.comparisonFields || fixture.audioVerificationsRequired !== fixture.audioVerificationsCompleted) throw new Error("v3.8.8 coverage consensus dry fixture failed");
if (shouldWrite) await writeFile(path.resolve(root, `${V388_CONSENSUS_ROOT}/dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
