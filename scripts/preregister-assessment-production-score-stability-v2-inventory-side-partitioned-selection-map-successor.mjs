#!/usr/bin/env node

import { preregisterV2InventorySidePartitionedSelectionMapSuccessor } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-stage.mjs";

const frozenIndex = process.argv.indexOf("--frozen-at");
await preregisterV2InventorySidePartitionedSelectionMapSuccessor({
  shouldWrite: process.argv.includes("--write"),
  frozenAt: frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null,
});
