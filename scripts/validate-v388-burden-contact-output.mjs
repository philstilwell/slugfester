#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateV388ContactOutput } from "./lib/v388-burden-contact.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-burden-contact-output.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(process.cwd(), file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
console.log(JSON.stringify({ status: "passed", ...validateV388ContactOutput(output, packet, schema) }, null, 2));
