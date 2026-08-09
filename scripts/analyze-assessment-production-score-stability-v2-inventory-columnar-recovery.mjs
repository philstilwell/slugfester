#!/usr/bin/env node

import { analyzeV2InventoryColumnarRecovery } from "./lib/assessment-production-score-stability-v2-inventory-columnar-recovery-stage.mjs";

await analyzeV2InventoryColumnarRecovery({ shouldWrite: process.argv.includes("--write") });
