#!/usr/bin/env node

import { preregisterV2DecomposedInventorySuccessor } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-stage.mjs";

const frozenIndex = process.argv.indexOf("--frozen-at");
await preregisterV2DecomposedInventorySuccessor({
  shouldWrite: process.argv.includes("--write"),
  frozenAt: frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null,
});
