#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateV373Output } from "./lib/v373-atomic-packets.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !schemaPath) throw new Error("usage: validate-v373-atomic-output.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(process.cwd(), file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateV373Output(output, packet, schema);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, reviewerPass: packet.reviewerPass, bundleCount: output.bundles.length }, null, 2));
