#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) {
  throw new Error(
    "usage: validate-assessment-production-checkpoint-v2.2-publication-output.mjs <output> <packet>"
  );
}
const [output, packet] = await Promise.all(
  [outputPath, packetPath].map((file) =>
    readFile(path.resolve(file), "utf8").then(JSON.parse)
  )
);
console.log(JSON.stringify(validateCheckpointV22PublicationOutput(output, packet), null, 2));
