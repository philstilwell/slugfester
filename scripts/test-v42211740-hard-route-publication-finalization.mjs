#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { compileV42211732PublicationPreview, V42211732_BYLINE } from "./lib/v42211732-hard-route-publication.mjs";
import { validateV42211736PublicationOutput } from "./lib/v42211736-hard-route-publication-integrity.mjs";
import { V42211740_DEBATES, V42211740_PROTOCOL_ID, V42211740_ROOT } from "./lib/v42211740-hard-route-publication-finalization.mjs";

const parse = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const audit = await parse(`${V42211740_ROOT}/merge-audit.json`);
assert.equal(audit.protocolId, V42211740_PROTOCOL_ID);
assert.equal(audit.status, "passed-five-debate-publication-finalization");
assert.deepEqual(audit.totals, { debates: 5, sections: 27, moves: 100, critiques: 100, quoteExactSourceMatches: 10, authorizedRepairFields: 9, modelContexts: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 });
assert.equal(audit.production.debateDataMutated, false);
assert.equal(audit.authorization.renderingVerification, true);
for (const [file, digest] of Object.entries(audit.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);

let moves = 0;
for (const debateNumber of V42211740_DEBATES) {
  const result = audit.outputs.find((item) => item.debateNumber === debateNumber);
  assert.ok(result, `missing Debate ${debateNumber}`);
  const packetPath = `docs/calibration/v4.2.21.17.33/hard-route-publication-transport-repair/packets/debate-${debateNumber}.json`;
  const [packet, output, compiled] = await Promise.all([parse(packetPath), parse(result.output), parse(result.compiled)]);
  const validation = validateV42211736PublicationOutput(output, packet);
  const replay = compileV42211732PublicationPreview(output, packet);
  assert.equal(sha256(await readFile(path.resolve(result.output))), result.outputSha256);
  assert.equal(sha256(await readFile(path.resolve(result.compiled))), result.compiledSha256);
  assert.equal(canonicalJson(compiled), canonicalJson(replay));
  assert.equal(compiled.calibration.displayContract.byline, V42211732_BYLINE);
  assert.equal(compiled.calibration.displayContract.defaultCollapsed, true);
  assert.ok(compiled.logicalExtension.pro && compiled.logicalExtension.con);
  assert.equal(validation.modelAuthoredScores ?? 0, 0);
  moves += validation.moves;
}
assert.equal(moves, 100);
assert.equal(sha256(await readFile(path.resolve(audit.preview.path))), audit.preview.sha256);
console.log(JSON.stringify({ status: "passed", debates: 5, moves, exactQuotes: 10, aiExtensions: 5, modelAuthoredScores: 0 }, null, 2));
