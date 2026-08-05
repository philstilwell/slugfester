#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateV41PrimaryOutput } from "./lib/v41-lean-production.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v41-lean-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([outputPath, packetPath].map(async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"))));
console.log(JSON.stringify(validateV41PrimaryOutput(output, packet), null, 2));
