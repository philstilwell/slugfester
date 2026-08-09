#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { validateV212Discovery } from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const [outputPath, preparationPath, debateNumber, chunkId] =
  process.argv.slice(2);
assertV4(
  outputPath && preparationPath && debateNumber && chunkId,
  "usage: validate-v212-discovery.mjs OUTPUT PREPARATION DEBATE_NUMBER CHUNK_ID"
);
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
const context = preparation.contexts.find(
  (item) => item.debateNumber === debateNumber
);
assertV4(context, `${debateNumber}: successor context missing`);
const chunk = context.chunks.find((item) => item.chunkId === chunkId);
assertV4(chunk, `${debateNumber}/${chunkId}: successor chunk missing`);
const [outputBytes, packetBytes, planBytes, eventsBytes, chunkBytes, fullLedgerBytes] =
  await Promise.all([
    outputPath,
    context.packet,
    context.plan,
    context.originalEvents,
    chunk.chunkLedgerPath,
    context.fullLedger,
  ].map((file) => readFile(file)));
const validation = validateV212Discovery(JSON.parse(outputBytes), {
  packet: JSON.parse(packetBytes),
  chunk,
  plan: JSON.parse(planBytes),
  eventsDocument: JSON.parse(eventsBytes),
  eventsBytes,
  chunkBytes,
  fullLedgerBytes,
});
console.log(
  JSON.stringify(
    {
      status: validation.status,
      debateNumber,
      chunkId,
      candidates: validation.candidates,
      repositoryDerivedLexicalTokenCounts:
        validation.repositoryDerivedLexicalTokenCounts,
      modelAuthoredLexicalTokenCounts:
        validation.modelAuthoredLexicalTokenCounts,
      modelAuthoredBoundedEndEvents:
        validation.modelAuthoredBoundedEndEvents,
      startDependentLockedLookaheadCapacityStructurallyBounded:
        validation.startDependentLockedLookaheadCapacityStructurallyBounded,
      derivedWindows: validation.derivedWindows,
      minimumLexicalTokens: validation.minimumLexicalTokens,
      localTargetIdsModelAuthored: validation.localTargetIdsModelAuthored,
      primaryAOwnsSelectedTargetTopology:
        validation.primaryAOwnsSelectedTargetTopology,
      scoresDerived: validation.scoresDerived,
    },
    null,
    2
  )
);
