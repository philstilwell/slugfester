#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV422115EvidenceBundle } from "./lib/v422115-candidate-evidence-transport.mjs";
import { validateV4221162InventoryCandidateTransport } from "./lib/v4221162-inventory-transport.mjs";

const PREPARATION = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/preparation-manifest.json";
if (!(await access(PREPARATION).then(() => true, () => false))) {
  console.log(JSON.stringify({ status: "passed-prepreparation", modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}
const preparation = JSON.parse(await readFile(PREPARATION));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(preparation.status === "five-hard-route-score-blind-inventory-contexts-prepared" && preparation.contexts.length === 5, "inventory preparation status drifted");
assertV4(preparation.totals.candidates === 189 && preparation.transport.everyCandidateRetained && !preparation.transport.semanticCandidateDownselectionPerformed, "candidate coverage drifted");
assertV4(preparation.totals.maximumCopiedInputBytes <= 115000 && preparation.contexts.every((context) => context.copiedInputBytes <= 115000), "inventory transport ceiling drifted");
for (const context of preparation.contexts) {
  const [fullBytes, transportBytes, schemaBytes, eventsBytes] = await Promise.all([context.validatorCandidateEvidenceBundle, context.modelCandidateTransport, context.schema, context.originalEvents].map((file) => readFile(file)));
  assertV4(sha256(fullBytes) === context.validatorCandidateEvidenceBundleSha256 && sha256(transportBytes) === context.modelCandidateTransportSha256 && sha256(schemaBytes) === context.schemaSha256, `${context.debateNumber}: prepared hash drifted`);
  const full = JSON.parse(fullBytes);
  const transport = JSON.parse(transportBytes);
  const candidateBundle = JSON.parse(await readFile(`docs/calibration/v4.2.21.17.23/mechanical-discovery-recovery/candidate-bundles/debate-${context.debateNumber}.json`));
  assertV4(validateV422115EvidenceBundle(full, candidateBundle, JSON.parse(eventsBytes)).status === "passed", `${context.debateNumber}: evidence replay failed`);
  assertV4(validateV4221162InventoryCandidateTransport(transport, full).status === "passed", `${context.debateNumber}: model transport replay failed`);
}
assertV4(preparation.isolation.scoreBlindCurator && preparation.isolation.performanceJudgmentsUnavailable && !preparation.authorization.modelExecution && !preparation.authorization.all195Debates, "inventory isolation or authorization drifted");
console.log(JSON.stringify({
  status: "passed",
  debates: preparation.totals.debates,
  candidates: preparation.totals.candidates,
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  everyCandidateRetained: true,
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
