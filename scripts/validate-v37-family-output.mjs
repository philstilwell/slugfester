#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, validateV37Batch, V37_FAMILIES } from "./lib/v37-retired-semantic.mjs";

const [outputPath, packetPath, schemaPath, family] = process.argv.slice(2);
assert(outputPath && packetPath && schemaPath && V37_FAMILIES.includes(family), "usage: validate-v37-family-output <output> <packet> <schema> <family>");
const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const output = JSON.parse(await read(outputPath)), packet = JSON.parse(await read(packetPath)), schema = JSON.parse(await read(schemaPath));
await validateV37Batch(root, output, packet, schema, family);
console.log(JSON.stringify({ status: "passed", family, cardCount: output.cards.length, deterministicValidation: true }, null, 2));
