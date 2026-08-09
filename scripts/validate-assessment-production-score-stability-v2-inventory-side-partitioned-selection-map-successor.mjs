#!/usr/bin/env node

import { validateV2InventorySidePartitionedSelectionMapSuccessorProposal } from "./lib/assessment-production-score-stability-v2-inventory-side-partitioned-selection-map-successor-stage.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] =
  process.argv.slice(2);
await validateV2InventorySidePartitionedSelectionMapSuccessorProposal({
  proposalPath,
  preparationPath,
  debateNumber,
  shouldWrite: writeFlag === "--write",
});
