#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V38_DEBATE_NUMBERS, V38_ROOT, validateProposalOutput, validateReviewOutput } from "./lib/v38-source-preparation.mjs";
import { compareSourceProposalAndReview, makeSourceAdjudicationArtifacts } from "./lib/v38-source-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const debates = {};
const adjudicationContexts = [];
const combinedMap = { schemaVersion: "3.8-source-adjudication-option-map-set", debates: {} };

for (let debateIndex = 0; debateIndex < V38_DEBATE_NUMBERS.length; debateIndex += 1) {
  const debateNumber = V38_DEBATE_NUMBERS[debateIndex];
  const proposalPacketPath = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debateNumber}.json`;
  const proposalSchemaPath = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debateNumber}.schema.json`;
  const proposalPath = `${V38_ROOT}/source-preparation/proposal/outputs/debate-${debateNumber}.json`;
  const reviewPacketPath = `${V38_ROOT}/source-preparation/review/packets/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V38_ROOT}/source-preparation/review/schemas/debate-${debateNumber}.schema.json`;
  const reviewPath = `${V38_ROOT}/source-preparation/review/outputs/debate-${debateNumber}.json`;
  const proposalPacket = await readJson(proposalPacketPath);
  const eventsPath = `.assessment-cache/captions/${proposalPacket.debateNumber === "103" ? "g1TlLCSn_5o" : proposalPacket.debateNumber === "55" ? "zQBY5K-Ns2Y" : "9JVRy7bR7zI"}/events.json`;
  const [proposalSchema, proposal, reviewPacket, reviewSchema, review, events] = await Promise.all([readJson(proposalSchemaPath), readJson(proposalPath), readJson(reviewPacketPath), readJson(reviewSchemaPath), readJson(reviewPath), readJson(eventsPath)]);
  validateProposalOutput(proposal, proposalPacket, proposalSchema, events);
  validateReviewOutput(review, proposalPacket, proposal, reviewPacket, reviewSchema);
  const comparisons = compareSourceProposalAndReview(proposal, review, reviewPacket);
  const artifacts = makeSourceAdjudicationArtifacts(debateNumber, proposal.debateId, comparisons, debateIndex * 7);
  const packetPath = `${V38_ROOT}/source-preparation/adjudication/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V38_ROOT}/source-preparation/adjudication/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${V38_ROOT}/source-preparation/adjudication/outputs/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(artifacts.packet, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
  }
  combinedMap.debates[debateNumber] = artifacts.map;
  debates[debateNumber] = { debateId: proposal.debateId, comparisonCount: comparisons.length, agreementCount: comparisons.filter((item) => item.agreed).length, disagreementCount: comparisons.filter((item) => !item.agreed).length, comparisons, adjudicationPacket: packetPath, adjudicationSchema: schemaPath, adjudicationOutput: outputPath };
  if (artifacts.packet.disputedFields.length > 0) adjudicationContexts.push({ debateNumber, reviewerRole: "source-adjudication", packet: packetPath, schema: schemaPath, output: outputPath, fieldCount: artifacts.packet.disputedFields.length });
}

const artifact = {
  schemaVersion: "3.8-source-preparation-initial-disagreements",
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
  await writeFile(path.resolve(root, `${V38_ROOT}/source-preparation/initial-disagreements.json`), `${JSON.stringify(artifact, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V38_ROOT}/source-preparation/adjudication-option-map.json`), `${JSON.stringify(combinedMap, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", ...artifact.counts }, null, 2));
