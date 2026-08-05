import { wordCount } from "./v388-reconstruction.mjs";
import { normalizeV4215Critique } from "./v4215-deterministic-prose-normalization.mjs";

export const V4216_ROOT = "docs/calibration/v4.2.16/three-debate-finalization-gate";
export const V4216_PROTOCOL_ID = "v4.2.16-three-debate-finalization-gate";
export const V4216_DEBATES = ["55", "103", "161"];

export function closeV4216LengthSchema(source) {
  const schema = structuredClone(source), scorecard = schema.properties.scorecard.properties;
  for (const side of ["pro", "con"]) { Object.assign(scorecard.quotes.properties[side].properties.context, { minLength: 130, maxLength: 600 }); Object.assign(schema.properties.aiExtension.properties[side].properties.newArguments.items.properties.text, { minLength: 300, maxLength: 850 }); }
  for (const side of ["pro", "con"]) Object.assign(scorecard.sections.items.properties.exchanges.items.properties[side].anyOf[1].properties.critique, { minLength: 800, maxLength: 960 });
  schema.$id = `slugfester-v4216-finalization-${schema.properties.debateNumber.const}`; return schema;
}

export function normalizeV4216Output(raw) {
  const output = structuredClone(raw), report = [];
  for (const side of ["pro", "con"]) { const count = wordCount(output.scorecard.quotes[side].context); if (count < 20 || count > 80) throw new Error(`v4.2.16 ${side} quote context word count ${count}`); for (const item of output.aiExtension[side].newArguments) { const itemCount = wordCount(item.text); if (itemCount < 45 || itemCount > 130) throw new Error(`v4.2.16 ${side}:${item.id} new argument word count ${itemCount}`); } }
  for (const section of output.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]) { const argument = exchange[side], summaryWords = wordCount(argument.words); if (summaryWords < 8 || summaryWords > 55) throw new Error(`v4.2.16 ${argument.moveId} summary word count ${summaryWords}`); const critiqueWords = wordCount(argument.critique); if (critiqueWords < 105) throw new Error(`v4.2.16 ${argument.moveId} critique word count ${critiqueWords}`); if (critiqueWords > 130) { const normalized = normalizeV4215Critique(argument.critique); argument.critique = normalized.text; report.push({ moveId: argument.moveId, beforeWords: normalized.beforeWords, afterWords: normalized.afterWords, removedSentences: normalized.removedSentences }); } }
  return { output, report };
}
