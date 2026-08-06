#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { validateV4221175AdjudicationOutput } from "./lib/v4221175-decomposed-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v4221175-adjudication-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([outputPath, packetPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
console.log(JSON.stringify(validateV4221175AdjudicationOutput(output, packet), null, 2));
