#!/usr/bin/env node

import { activateBatch05PublicationResumption } from "./lib/assessment-production-post-canary-batch-05-publication-resumption-workflow.mjs";

const activatedAtIndex = process.argv.indexOf("--activated-at");
const activation = await activateBatch05PublicationResumption({
  activatedAt: activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null,
  write: process.argv.includes("--write")
});
console.log(JSON.stringify({
  status: process.argv.includes("--write") ? activation.status : "preview",
  debates: activation.contexts.map((context) => context.debateNumber),
  contexts: activation.contexts.length,
  resumptionMoves: activation.acceptanceContract.resumptionMovesRequired,
  model: activation.model,
  schedulerRamp: activation.executionPolicy.schedulerRamp,
  attemptsPerContext: activation.executionPolicy.attemptsPerContext,
  retriesMaximum: activation.executionPolicy.retriesMaximum,
  directIncrementalCostUsdMaximum: 0,
  publicationModelContextsAuthorized: true,
  repairPacketPreparationAuthorized: false,
  publicationCompilationAuthorized: false,
  productionMutationAuthorized: false,
  nextRequiredAction: activation.nextRequiredAction
}, null, 2));
