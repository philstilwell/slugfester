#!/usr/bin/env node

import { readJson, validateV4PrimaryOutput } from "./lib/v4-lean-production.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v4-lean-primary-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV4PrimaryOutput(output, packet), null, 2));
