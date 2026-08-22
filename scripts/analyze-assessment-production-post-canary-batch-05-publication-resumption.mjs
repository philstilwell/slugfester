#!/usr/bin/env node

import { analyzeBatch05PublicationResumption } from "./lib/assessment-production-post-canary-batch-05-publication-resumption-workflow.mjs";

const analysis = await analyzeBatch05PublicationResumption({
  write: process.argv.includes("--write")
});
console.log(JSON.stringify({
  status: analysis.status,
  resumptionContextsAttempted: analysis.execution.contextsAttempted,
  validResumptionContexts: analysis.execution.validContexts,
  validCohortDebates: analysis.gate.cohortValidDebates,
  cohortMoves: analysis.gate.cohortMoves,
  cohortCritiques: analysis.gate.cohortCritiques,
  cohortExactSourceQuotes: analysis.gate.cohortExactSourceQuotes,
  retries: 0,
  timeoutExtensions: 0,
  repairPacketsPrepared: 0,
  publicationCompilationPasses: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
