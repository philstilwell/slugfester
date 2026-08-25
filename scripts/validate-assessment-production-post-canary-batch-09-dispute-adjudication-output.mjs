#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { validatePostCanaryBatch09DisputeAdjudicationOutput } from "./lib/assessment-production-post-canary-batch-09-dispute-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) {
  throw new Error(
    "usage: validate-assessment-production-post-canary-batch-09-dispute-adjudication-output.mjs OUTPUT PACKET"
  );
}
const [output, packet] = await Promise.all(
  [outputPath, packetPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);
console.log(
  JSON.stringify(
    validatePostCanaryBatch09DisputeAdjudicationOutput(output, packet),
    null,
    2
  )
);
