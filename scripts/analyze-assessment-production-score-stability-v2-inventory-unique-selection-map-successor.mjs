#!/usr/bin/env node

import { analyzeV2InventoryUniqueSelectionMapSuccessor } from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map-successor-stage.mjs";

await analyzeV2InventoryUniqueSelectionMapSuccessor({ shouldWrite: process.argv.includes("--write") });
