#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import {
  V381_ROOT,
  V382_CONTINUATION_FIXTURE,
  V382_DEBATE_NUMBERS,
  V382_MANUAL,
  V382_ROOT,
  V38_SOURCE_AUDIT,
  assert,
  canonicalJson,
  enrichProposal,
  validateEnrichedProposal,
  validateProposalRaw
} from "./lib/v382-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const failure = await readJson(`${V381_ROOT}/frozen-attempt-failure.json`);
const audit = await readJson(V38_SOURCE_AUDIT);
const inheritedDry = await readJson(`${V381_ROOT}/end-to-end-dry-fixture.json`);
assert(inheritedDry.passed && inheritedDry.comparisonFieldCount === 44 && inheritedDry.twoVoteResolvedFields === 44, "inherited semantic dry fixture invalid");
const reports = [];

for (const debateNumber of V382_DEBATE_NUMBERS) {
  const failureContext = failure.contexts.find((item) => item.debateNumber === debateNumber);
  const packetPath = `${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V381_ROOT}/proposal/schemas/debate-${debateNumber}.schema.json`;
  const rawPath = `${V381_ROOT}/proposal/raw-outputs/debate-${debateNumber}.json`;
  const enrichedPath = `${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`;
  const reviewPacketPath = `${V382_ROOT}/review/packets/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V382_ROOT}/review/schemas/debate-${debateNumber}.schema.json`;
  const reviewOutputPath = `${V382_ROOT}/review/outputs/debate-${debateNumber}.json`;
  const source = audit.debateSources[debateNumber];
  const [packet, schema, raw, enriched, reviewPacket, reviewSchema, events, rawText, enrichedText, transcriptText, eventsText] = await Promise.all([
    readJson(packetPath), readJson(schemaPath), readJson(rawPath), readJson(enrichedPath), readJson(reviewPacketPath), readJson(reviewSchemaPath), readJson(source.eventsPath),
    read(rawPath), read(enrichedPath), read(source.transcriptPath), read(source.eventsPath)
  ]);
  validateProposalRaw(raw, packet, schema, events);
  validateEnrichedProposal(enriched, packet);
  assert(canonicalJson(enrichProposal(raw, packet)) === canonicalJson(enriched), `Debate ${debateNumber}: enrichment reproduction invalid`);
  assert(sha256(rawText) === failureContext.rawOutputSha256 && sha256(enrichedText) === failureContext.enrichedOutputSha256, `Debate ${debateNumber}: proposal hashes invalid`);
  assert(sha256(transcriptText) === source.transcriptSha256 && sha256(eventsText) === source.eventsSha256, `Debate ${debateNumber}: local source hashes invalid`);
  assert(!containsScoreField(raw) && !containsScoreField(enriched) && !containsScoreField(reviewPacket), `Debate ${debateNumber}: scoring field leaked`);
  const expectedHidden = ["speaker", "side", "proposition", "attributionConfidence", "attributionBasis", "provisionalBurdenContact", "selectionRationale"];
  assert(canonicalJson(reviewPacket.hiddenProposalFields) === canonicalJson(expectedHidden), `Debate ${debateNumber}: hidden review fields invalid`);
  assert(reviewPacket.candidates.length === 8 && reviewPacket.candidates.every((candidate) => expectedHidden.every((field) => !Object.hasOwn(candidate, field))), `Debate ${debateNumber}: proposal field leaked into candidates`);
  assert(reviewSchema.additionalProperties === false && reviewSchema.properties.moveReviews.minItems === 8 && reviewSchema.properties.moveReviews.maxItems === 8, `Debate ${debateNumber}: review schema invalid`);
  const modelVisible = new Set(["docs/assessment-workflow-v3.8.md", "docs/reassessment-rubric-v3.8.md", V382_MANUAL, reviewPacketPath, reviewSchemaPath, source.transcriptPath, source.eventsPath]);
  assert(modelVisible.has(source.transcriptPath) && modelVisible.has(source.eventsPath), `Debate ${debateNumber}: transcript/event absent from phase model`);
  assert(!modelVisible.has(reviewOutputPath), `Debate ${debateNumber}: future output leaked into phase model`);
  reports.push({ debateNumber, rawHashMatched: true, enrichedHashMatched: true, validatorPassed: true, enrichmentReproduced: true, hiddenProposalFields: expectedHidden.length, candidateCount: 8, transcriptHashMatched: true, eventsHashMatched: true, futureOutputExcluded: true });
}

const fixture = {
  schemaVersion: "3.8.2-source-continuation-dry-fixture",
  passed: true,
  modelContextsExecuted: 0,
  inheritedSemanticDryFixture: {
    path: `${V381_ROOT}/end-to-end-dry-fixture.json`,
    comparisonFields: inheritedDry.comparisonFieldCount,
    disputedFields: inheritedDry.disputedFieldCount,
    twoVoteResolvedFields: inheritedDry.twoVoteResolvedFields,
    mediumConfidenceAudioTriggerVerified: inheritedDry.mediumConfidenceAudioTriggerVerified,
    phaseLocksExcludeFutureOutputs: inheritedDry.phaseLocksExcludeFutureOutputs,
    timeoutTerminationVerified: inheritedDry.timeoutTerminationVerified
  },
  proposalReuseContexts: reports.length,
  semanticallyValidatedProposalContexts: reports.filter((item) => item.validatorPassed).length,
  enrichmentReproductionsMatched: reports.filter((item) => item.enrichmentReproduced).length,
  reviewPacketsWithAllSevenProposalFieldsHidden: reports.filter((item) => item.hiddenProposalFields === 7).length,
  transcriptAndEventChainsHashMatched: reports.filter((item) => item.transcriptHashMatched && item.eventsHashMatched).length,
  futureReviewOutputsExcluded: reports.filter((item) => item.futureOutputExcluded).length,
  scoringFieldsEmitted: 0,
  reports
};
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, V382_CONTINUATION_FIXTURE)), { recursive: true });
  await writeFile(path.resolve(root, V382_CONTINUATION_FIXTURE), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", proposalReuseContexts: reports.length, hiddenReviewPackets: fixture.reviewPacketsWithAllSevenProposalFieldsHidden, sourceChainsHashMatched: fixture.transcriptAndEventChainsHashMatched, fixtureWritten: shouldWrite }, null, 2));
