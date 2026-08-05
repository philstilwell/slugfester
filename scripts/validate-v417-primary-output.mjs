#!/usr/bin/env node

import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV417PrimaryOutput } from "./lib/v417-fresh-validation.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v417-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV417PrimaryOutput(output, packet), null, 2));
