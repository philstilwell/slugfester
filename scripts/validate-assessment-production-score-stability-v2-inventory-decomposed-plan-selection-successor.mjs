#!/usr/bin/env node

import { validateV2DecomposedInventorySuccessor } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-stage.mjs";

const [planPath, selectionPath, preparationPath, debateNumber, writeFlag] =
  process.argv.slice(2);
await validateV2DecomposedInventorySuccessor({
  planPath,
  selectionPath,
  preparationPath,
  debateNumber,
  shouldWrite: writeFlag === "--write",
});
