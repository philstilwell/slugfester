#!/usr/bin/env node

import { analyzeV2Inventory } from "./lib/assessment-production-score-stability-v2-inventory-stage.mjs";

await analyzeV2Inventory({ shouldWrite: process.argv.includes("--write") });
