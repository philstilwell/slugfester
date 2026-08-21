#!/usr/bin/env node

import { runBatch04PublicationResumption } from "./lib/assessment-production-post-canary-batch-04-publication-resumption-workflow.mjs";

const execution = await runBatch04PublicationResumption();
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  contextsUnattempted: execution.contextsUnattempted,
  validContexts: execution.validContexts,
  invalidContexts: execution.invalidContexts,
  elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts,
  retries: execution.retries,
  timeoutExtensions: execution.timeoutExtensions,
  correctionContexts: execution.correctionContexts,
  meteredApiCostUsd: execution.meteredApiCostUsd,
  paidServiceCalls: execution.paidServiceCallsThisStage,
  modelAuthoredScores: execution.modelAuthoredScores
}, null, 2));
