#!/usr/bin/env node

import { validateV2InventoryUniqueSelectionMapSuccessorProposal } from "./lib/assessment-production-score-stability-v2-inventory-unique-selection-map-successor-stage.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] =
  process.argv.slice(2);
await validateV2InventoryUniqueSelectionMapSuccessorProposal({
  proposalPath,
  preparationPath,
  debateNumber,
  shouldWrite: writeFlag === "--write",
});
