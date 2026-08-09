#!/usr/bin/env node

import { preregisterV2InventoryColumnarRecovery } from "./lib/assessment-production-score-stability-v2-inventory-columnar-recovery-stage.mjs";

const frozenIndex = process.argv.indexOf("--frozen-at");
await preregisterV2InventoryColumnarRecovery({
  shouldWrite: process.argv.includes("--write"),
  frozenAt: frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null,
});
