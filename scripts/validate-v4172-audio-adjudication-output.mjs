#!/usr/bin/env node

import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV4172AudioAdjudicationOutput } from "./lib/v4172-audio-adjudication.mjs";
const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v4172-audio-adjudication-output.mjs <output> <packet>");
console.log(JSON.stringify(await validateV4172AudioAdjudicationOutput(await readJson(outputPath), await readJson(packetPath)), null, 2));
