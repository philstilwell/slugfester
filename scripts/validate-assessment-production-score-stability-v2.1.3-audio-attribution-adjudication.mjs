#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { validateV213AudioAttributionAdjudicationOutput } from "./lib/assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) {
  throw new Error(
    "usage: validate-assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs <output> <packet>"
  );
}
const [output, packet] = await Promise.all(
  [outputPath, packetPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);
console.log(
  JSON.stringify(
    await validateV213AudioAttributionAdjudicationOutput(output, packet),
    null,
    2
  )
);
