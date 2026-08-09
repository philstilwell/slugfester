#!/usr/bin/env node

import { preregisterV2Inventory } from "./lib/assessment-production-score-stability-v2-inventory-stage.mjs";

const frozenIndex = process.argv.indexOf("--frozen-at");
await preregisterV2Inventory({
  shouldWrite: process.argv.includes("--write"),
  frozenAt: frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null,
});
