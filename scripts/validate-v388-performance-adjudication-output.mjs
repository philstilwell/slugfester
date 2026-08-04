#!/usr/bin/env node

import { readV388AdjudicationJson, validateV388AdjudicationOutput } from "./lib/v388-performance-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v388-performance-adjudication-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([readV388AdjudicationJson(outputPath), readV388AdjudicationJson(packetPath)]);
console.log(JSON.stringify(validateV388AdjudicationOutput(output, packet), null, 2));
