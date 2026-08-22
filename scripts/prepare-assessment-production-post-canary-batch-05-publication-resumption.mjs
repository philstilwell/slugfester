#!/usr/bin/env node

import { prepareBatch05PublicationResumption } from "./lib/assessment-production-post-canary-batch-05-publication-resumption-workflow.mjs";

const frozenAtIndex = process.argv.indexOf("--frozen-at");
const manifest = await prepareBatch05PublicationResumption({
  frozenAt: frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null,
  write: process.argv.includes("--write")
});
console.log(JSON.stringify({
  status: process.argv.includes("--write") ? manifest.status : "preview",
  debates: manifest.contexts.map((context) => context.debateNumber),
  contexts: manifest.contexts.length,
  resumptionMoves: manifest.totals.resumptionMoves,
  acceptedMoves: manifest.totals.acceptedMoves,
  cohortMoves: manifest.totals.cohortMoves,
  existingPacketsReused: manifest.userAuthorization.existingPacketsReused,
  packetsGenerated: manifest.userAuthorization.packetsGenerated,
  model: manifest.model,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  attemptsPerContext: manifest.executionPolicy.attemptsPerContext,
  retriesMaximum: manifest.executionPolicy.retriesMaximum,
  publicationModelContextsAuthorizedByStandingRecord: true,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
