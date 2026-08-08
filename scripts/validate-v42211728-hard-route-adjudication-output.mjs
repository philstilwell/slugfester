#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { validateV42211728AdjudicationOutput } from "./lib/v42211728-hard-route-adjudication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v42211728-hard-route-adjudication-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([outputPath, packetPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
console.log(JSON.stringify(validateV42211728AdjudicationOutput(output, packet), null, 2));
