#!/usr/bin/env node

import { V389_PERFORMANCE_PASSES, readJson, validateV389PerformanceOutput } from "./lib/v389-performance-judgment.mjs";

const [outputPath, packetPath, expectedPass] = process.argv.slice(2);
if (!outputPath || !packetPath || !V389_PERFORMANCE_PASSES.includes(expectedPass)) throw new Error("usage: validate-v389-performance-judgment-output.mjs <output> <packet> <A|B>");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV389PerformanceOutput(output, packet, expectedPass), null, 2));
