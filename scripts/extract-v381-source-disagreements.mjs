#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V381_DEBATE_NUMBERS, V381_ROOT, V38_SOURCE_AUDIT, validateReviewOutput } from "./lib/v381-source-preparation.mjs";
import { compareSourceProposalAndReview, makeSourceAdjudicationArtifacts } from "./lib/v381-source-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const audit = await readJson(V38_SOURCE_AUDIT);
const debates = {};
const adjudicationContexts = [];
const combinedMap = { schemaVersion: "3.8.1-source-adjudication-option-map-set", debates: {} };

for (let debateIndex = 0; debateIndex < V381_DEBATE_NUMBERS.length; debateIndex += 1) {
  const debateNumber = V381_DEBATE_NUMBERS[debateIndex];
  const proposalPacketPath = `${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`;
  const proposalPath = `${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`;
  const reviewPacketPath = `${V381_ROOT}/review/packets/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V381_ROOT}/review/schemas/debate-${debateNumber}.schema.json`;
  const reviewPath = `${V381_ROOT}/review/outputs/debate-${debateNumber}.json`;
  const [packet, proposal, reviewPacket, reviewSchema, review] = await Promise.all([readJson(proposalPacketPath), readJson(proposalPath), readJson(reviewPacketPath), readJson(reviewSchemaPath), readJson(reviewPath)]);
  validateReviewOutput(review, packet, proposal, reviewPacket, reviewSchema);
  const comparisons = compareSourceProposalAndReview(proposal, review, reviewPacket);
  const artifacts = makeSourceAdjudicationArtifacts(debateNumber, proposal.debateId, comparisons, debateIndex * 7);
  const packetPath = `${V381_ROOT}/adjudication/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V381_ROOT}/adjudication/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${V381_ROOT}/adjudication/outputs/debate-${debateNumber}.json`;
  if (shouldWrite && artifacts.packet.disputedFields.length > 0) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(artifacts.packet, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
  }
  combinedMap.debates[debateNumber] = artifacts.map;
  debates[debateNumber] = { debateId: proposal.debateId, sourceEvents: audit.debateSources[debateNumber].eventsPath, comparisonCount: comparisons.length, agreementCount: comparisons.filter((item) => item.agreed).length, disagreementCount: comparisons.filter((item) => !item.agreed).length, comparisons, adjudicationPacket: packetPath, adjudicationSchema: schemaPath, adjudicationOutput: outputPath };
  if (artifacts.packet.disputedFields.length > 0) adjudicationContexts.push({ debateNumber, reviewerRole: "source-adjudication", packet: packetPath, schema: schemaPath, output: outputPath, fieldCount: artifacts.packet.disputedFields.length });
}

const artifact = {
  schemaVersion: "3.8.1-source-preparation-initial-disagreements",
  allProposalAndReviewOutputsValid: true,
  debates,
  counts: {
    comparisonFields: Object.values(debates).reduce((sum, item) => sum + item.comparisonCount, 0),
    agreements: Object.values(debates).reduce((sum, item) => sum + item.agreementCount, 0),
    disagreements: Object.values(debates).reduce((sum, item) => sum + item.disagreementCount, 0),
    adjudicationContexts: adjudicationContexts.length
  },
  adjudicationContexts
};
if (shouldWrite) {
  await writeFile(path.resolve(root, `${V381_ROOT}/initial-disagreements.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V381_ROOT}/adjudication-option-map.json`), `${JSON.stringify(combinedMap, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", ...artifact.counts }, null, 2));
