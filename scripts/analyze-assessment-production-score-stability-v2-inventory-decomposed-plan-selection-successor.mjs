#!/usr/bin/env node

import { analyzeV2DecomposedInventorySuccessor } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-stage.mjs";

await analyzeV2DecomposedInventorySuccessor({
  shouldWrite: process.argv.includes("--write"),
});
