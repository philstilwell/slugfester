#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV4221AdjudicationOutput } from "./lib/v4221-pass-b-consensus.mjs";
const [outputPath, packetPath] = process.argv.slice(2); if (!outputPath || !packetPath) throw new Error("usage: validate-v42214-adjudication-output.mjs <output> <packet>"); const [output, packet] = await Promise.all([outputPath, packetPath].map((file) => readFile(file, "utf8").then(JSON.parse))); console.log(JSON.stringify(validateV4221AdjudicationOutput(output, packet), null, 2));
