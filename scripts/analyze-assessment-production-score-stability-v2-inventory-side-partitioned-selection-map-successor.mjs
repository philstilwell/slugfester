#!/usr/bin/env node

import { analyzeV2InventorySidePartitionedSelectionMapSuccessor } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-stage.mjs";

await analyzeV2InventorySidePartitionedSelectionMapSuccessor({ shouldWrite: process.argv.includes("--write") });
