import { wordCount } from "./v388-reconstruction.mjs";

export const V4217_ROOT = "docs/calibration/v4.2.17/no-truncation-finalization-gate";
export const V4217_PROTOCOL_ID = "v4.2.17-no-truncation-finalization-gate";
export const V4217_DEBATES = ["55", "103", "161"];

function closeTags(tags) {
  tags.minItems = 0;
  tags.maxItems = 0;
}

export function closeV4217Schema(source) {
  const schema = structuredClone(source);
  const scorecard = schema.properties.scorecard.properties;
  for (const side of ["pro", "con"]) {
    const quote = scorecard.quotes.properties[side].properties.context;
    quote.minLength = 120;
    delete quote.maxLength;
    const newArgument = schema.properties.aiExtension.properties[side].properties.newArguments.items.properties.text;
    newArgument.minLength = 280;
    delete newArgument.maxLength;
    const move = scorecard.sections.items.properties.exchanges.items.properties[side].anyOf[1].properties;
    move.critique.minLength = 700;
    delete move.critique.maxLength;
    closeTags(move.tags);
    closeTags(scorecard.overall.properties[side].properties.blunders.items.properties.tags);
  }
  schema.$id = `slugfester-v4217-finalization-${schema.properties.debateNumber.const}`;
  return schema;
}

export function validateV4217Prose(output) {
  const markerPattern = /^(strongest feature|principal limitation|live burden|locked score):/i;
  const expectedMarkers = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
  let critiques = 0;
  for (const side of ["pro", "con"]) {
    const quoteCount = wordCount(output.scorecard.quotes[side].context);
    if (quoteCount < 20 || quoteCount > 80) throw new Error(`v4.2.17 ${side} quote context word count ${quoteCount}`);
    for (const item of output.aiExtension[side].newArguments) {
      const itemCount = wordCount(item.text);
      if (itemCount < 45 || itemCount > 130) throw new Error(`v4.2.17 ${side}:${item.id} new argument word count ${itemCount}`);
    }
  }
  for (const section of output.scorecard.sections) for (const exchange of section.exchanges) for (const side of ["pro", "con"]) if (exchange[side]) {
    const argument = exchange[side];
    const summaryWords = wordCount(argument.words);
    if (summaryWords < 8 || summaryWords > 55) throw new Error(`v4.2.17 ${argument.moveId} summary word count ${summaryWords}`);
    const critiqueWords = wordCount(argument.critique);
    if (critiqueWords < 105 || critiqueWords > 130) throw new Error(`v4.2.17 ${argument.moveId} critique word count ${critiqueWords}`);
    const sentences = String(argument.critique).trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length !== 4) throw new Error(`v4.2.17 ${argument.moveId} critique sentence count ${sentences.length}`);
    for (let index = 0; index < expectedMarkers.length; index += 1) {
      if (!sentences[index].toLowerCase().startsWith(expectedMarkers[index])) throw new Error(`v4.2.17 ${argument.moveId} critique marker order ${index}`);
      if (!markerPattern.test(sentences[index])) throw new Error(`v4.2.17 ${argument.moveId} critique marker missing ${index}`);
    }
    if (argument.tags.length !== 0) throw new Error(`v4.2.17 ${argument.moveId} tags not empty`);
    critiques += 1;
  }
  for (const side of ["pro", "con"]) for (const blunder of output.scorecard.overall[side].blunders) if (blunder.tags.length !== 0) throw new Error(`v4.2.17 ${side} blunder tags not empty`);
  return { critiquesChecked: critiques, proseMutations: 0, tagArraysClosed: true };
}
