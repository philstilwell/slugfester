#!/usr/bin/env node

import { readV3811AdjudicationJson, validateV3811AdjudicationOutput } from "./lib/v3811-performance-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v3811-performance-adjudication-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([readV3811AdjudicationJson(outputPath), readV3811AdjudicationJson(packetPath)]);
console.log(JSON.stringify(validateV3811AdjudicationOutput(output, packet), null, 2));
