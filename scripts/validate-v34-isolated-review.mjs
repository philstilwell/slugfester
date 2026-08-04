#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256, validateReviewArtifact } from "./lib/v34-conservative-review.mjs";

const [reviewPath, packetPath, modelKey] = process.argv.slice(2);
assert(reviewPath && packetPath && ["terra", "sol"].includes(modelKey), "usage: validate-v34-isolated-review <review> <packet> <terra|sol>");
const root = process.cwd(), gateRoot = "docs/calibration/v3.4/retired-three-debate-test";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [reviewText, packetText, workflowText, rubricText, manualText, schemaText] = await Promise.all([
  read(reviewPath), read(packetPath), read("docs/assessment-workflow-v3.4.md"), read("docs/reassessment-rubric-v3.4.md"), read(`${gateRoot}/review-manual.md`), read(`${gateRoot}/review-schema.json`)
]);
const artifact = JSON.parse(reviewText), packet = JSON.parse(packetText);
const annotations = validateReviewArtifact(artifact, packet, modelKey, { packetSha256: packetText, workflowSha256: workflowText, rubricSha256: rubricText, manualSha256: manualText, schemaSha256: schemaText });
console.log(JSON.stringify({ status: "passed", modelKey, debateId: packet.debateId, caseCount: annotations.length, reviewSha256: sha256(reviewText), packetSha256: sha256(packetText), modelSchemaOrInvariantRetries: 0 }, null, 2));
