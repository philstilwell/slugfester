#!/usr/bin/env node

import { validateV2InventoryColumnarRecoveryProposal } from "./lib/assessment-production-score-stability-v2-inventory-columnar-recovery-stage.mjs";

const [proposalPath, preparationPath, debateNumber, writeFlag] =
  process.argv.slice(2);
await validateV2InventoryColumnarRecoveryProposal({
  proposalPath,
  preparationPath,
  debateNumber,
  shouldWrite: writeFlag === "--write",
});
