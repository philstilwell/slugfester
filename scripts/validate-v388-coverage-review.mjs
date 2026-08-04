#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateReviewOutput } from "./lib/v388-coverage-review.mjs";
const [outputPath, packetPath, schemaPath, eventsPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath, eventsPath].every(Boolean)) throw new Error("usage: validate-v388-coverage-review.mjs OUTPUT PACKET SCHEMA EVENTS");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema, events] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath), readJson(eventsPath)]);
const summary = validateReviewOutput(output, packet, schema, events);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, scoreFields: 0, ...summary }, null, 2));
