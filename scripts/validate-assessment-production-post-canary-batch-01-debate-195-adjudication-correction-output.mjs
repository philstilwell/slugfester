#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { validatePostCanaryBatch01Debate195CorrectionOutput } from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) {
  throw new Error(
    "usage: validate-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-output.mjs OUTPUT PACKET"
  );
}

const [output, packet] = await Promise.all(
  [outputPath, packetPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);

console.log(
  JSON.stringify(
    validatePostCanaryBatch01Debate195CorrectionOutput(output, packet),
    null,
    2
  )
);
