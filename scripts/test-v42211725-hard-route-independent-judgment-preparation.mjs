#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/preparation-manifest.json";
if (!(await access(PREPARATION).then(() => true, () => false))) {
  console.log(JSON.stringify({ status: "passed-prepreparation", modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const preparation = JSON.parse(await readFile(PREPARATION));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(preparation.status === "ten-hard-route-independent-judgment-contexts-prepared" && preparation.contexts.length === 10, "independent judgment preparation drifted");
assertV4(preparation.totals.debates === 5 && preparation.totals.uniqueMoves === 100 && preparation.totals.movesJudgedAcrossPasses === 200, "judgment move coverage drifted");
assertV4(preparation.totals.maximumCopiedInputBytes <= 115000 && preparation.contexts.every((context) => context.copiedInputBytes <= 115000), "judgment transport ceiling drifted");
for (const debateNumber of ["51", "63", "90", "153", "165"]) {
  const pair = preparation.contexts.filter((context) => context.debateNumber === debateNumber);
  assertV4(pair.length === 2 && pair.map((context) => context.reviewerPass).sort().join("") === "AB", `${debateNumber}: A/B pair drifted`);
  assertV4(pair[0].lockedInventoryCanonicalSha256 === pair[1].lockedInventoryCanonicalSha256 && pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256, `${debateNumber}: locked inventory pair mismatch`);
}
for (const context of preparation.contexts) {
  for (const [fileKey, hashKey] of [["lockedInventory", "lockedInventorySha256"], ["sourcePacket", "sourcePacketSha256"], ["originalEvents", "originalEventsSha256"], ["fullLedger", "fullLedgerSha256"], ["judgmentPacket", "judgmentPacketSha256"], ["schema", "schemaSha256"]]) {
    assertV4(sha256(await readFile(context[fileKey])) === context[hashKey], `${context.debateNumber}/${context.reviewerPass}: ${fileKey} hash drifted`);
  }
  assertV4(!(await readFile(context.schema, "utf8")).includes('"uniqueItems"'), `${context.debateNumber}/${context.reviewerPass}: unsupported schema keyword returned`);
}
assertV4(preparation.isolation.twoIndependentPassesPerDebate && preparation.isolation.otherPassUnavailable && preparation.deterministicDerivations.strictBurdenResidualExclusionRepositoryApplied, "independence or rubric derivation drifted");
assertV4(!preparation.authorization.modelExecution && !preparation.authorization.scoreDerivation && !preparation.authorization.all195Debates, "premature execution authorization");
console.log(JSON.stringify({
  status: "passed",
  debates: preparation.totals.debates,
  contexts: preparation.totals.contexts,
  uniqueMoves: preparation.totals.uniqueMoves,
  movesJudgedAcrossPasses: preparation.totals.movesJudgedAcrossPasses,
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
