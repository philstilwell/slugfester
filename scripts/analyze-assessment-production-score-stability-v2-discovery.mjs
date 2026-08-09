#!/usr/bin/env node

import { analyzeV2Discovery } from "./lib/assessment-production-score-stability-v2-discovery-stage.mjs";

await analyzeV2Discovery({ shouldWrite: process.argv.includes("--write") });
