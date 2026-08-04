#!/usr/bin/env node

import { V3811_PERFORMANCE_PASSES, readJson, validateV3811PerformanceOutput } from "./lib/v3811-performance-judgment.mjs";

const [outputPath, packetPath, expectedPass] = process.argv.slice(2);
if (!outputPath || !packetPath || !V3811_PERFORMANCE_PASSES.includes(expectedPass)) throw new Error("usage: validate-v3811-performance-judgment-output.mjs <output> <packet> <A|B>");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV3811PerformanceOutput(output, packet, expectedPass), null, 2));
