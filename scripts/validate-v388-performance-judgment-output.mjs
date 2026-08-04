#!/usr/bin/env node

import { V388_PERFORMANCE_PASSES, readJson, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";

const [outputPath, packetPath, expectedPass] = process.argv.slice(2);
if (!outputPath || !packetPath || !V388_PERFORMANCE_PASSES.includes(expectedPass)) throw new Error("usage: validate-v388-performance-judgment-output.mjs <output> <packet> <A|B>");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV388PerformanceOutput(output, packet, expectedPass), null, 2));
