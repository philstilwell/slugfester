#!/usr/bin/env node

import { validateV2InventoryProposal } from "./lib/assessment-production-score-stability-v2-inventory-stage.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] =
  process.argv.slice(2);
await validateV2InventoryProposal({
  proposalPath,
  preparationPath,
  debateNumber,
  shouldWrite: writeFlag === "--write",
});
