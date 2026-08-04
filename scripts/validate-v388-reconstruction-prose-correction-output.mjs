#!/usr/bin/env node

import { V388_RECON_MODEL, V388_RECON_PROTOCOL, assertV388Recon, displayedLanguagePasses, readJson, wordCount } from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const [outputPath, packetPath] = process.argv.slice(2);
const output = await readJson(root, outputPath), packet = await readJson(root, packetPath);
assertV388Recon(output.schemaVersion === "3.8.8-reconstruction-prose-correction" && output.protocolId === V388_RECON_PROTOCOL && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.assessmentModel === V388_RECON_MODEL.label && output.calibrationOnly, "correction identity mismatch");
assertV388Recon(output.corrections.length === packet.defects.length, "correction count mismatch");
for (let index = 0; index < output.corrections.length; index += 1) {
  const correction = output.corrections[index], defect = packet.defects[index];
  assertV388Recon(correction.moveId === defect.moveId, `${defect.moveId}: correction order/identity mismatch`);
  const count = wordCount(correction.critique);
  assertV388Recon(count >= 105 && count <= 130, `${defect.moveId}: corrected critique outside 105-130`);
  assertV388Recon(displayedLanguagePasses(correction.critique), `${defect.moveId}: prohibited language`);
}
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, correctedCritiques: output.corrections.length, wordCounts: output.corrections.map((item) => wordCount(item.critique)), scoreFieldsSuppliedByModel: 0, otherMutableFieldsSuppliedByModel: 0 }, null, 2));
