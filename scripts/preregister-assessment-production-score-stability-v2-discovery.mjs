#!/usr/bin/env node

import { preregisterV2Discovery } from "./lib/assessment-production-score-stability-v2-discovery-stage.mjs";

const frozenIndex = process.argv.indexOf("--frozen-at");
await preregisterV2Discovery({
  shouldWrite: process.argv.includes("--write"),
  frozenAt: frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null,
});
