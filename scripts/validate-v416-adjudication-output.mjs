#!/usr/bin/env node

import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV416AdjudicationOutput } from "./lib/v416-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v416-adjudication-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
console.log(JSON.stringify(validateV416AdjudicationOutput(output, packet), null, 2));
