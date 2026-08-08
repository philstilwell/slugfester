#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateV42211732PublicationOutput } from "./lib/v42211732-hard-route-publication.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v42211732-hard-route-publication-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([outputPath, packetPath].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
console.log(JSON.stringify(validateV42211732PublicationOutput(output, packet), null, 2));
