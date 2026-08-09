#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { validateProductionCanaryAudioAttributionAdjudicationOutput } from "./lib/assessment-production-canary-audio-attribution-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) {
  throw new Error(
    "usage: validate-assessment-production-canary-audio-attribution-adjudication.mjs <output> <packet>"
  );
}
const [output, packet] = await Promise.all(
  [outputPath, packetPath].map((file) => readFile(file, "utf8").then(JSON.parse))
);
console.log(
  JSON.stringify(
    await validateProductionCanaryAudioAttributionAdjudicationOutput(output, packet),
    null,
    2
  )
);
