import { createHash } from "node:crypto";

import { extractProductionDebateRecords } from "./assessment-production-post-canary-batch-11-production-publication.mjs";

export const BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER = "24";
export const BATCH_11_TITLE_CORRECTION_DEBATE_ID =
  "hitchens-olasky-religion-grace-2007";
export const BATCH_11_TITLE_CORRECTION_SECTION_ID =
  "scope-causation-and-attribution";
export const BATCH_11_TITLE_CORRECTION_BEFORE =
  "Scope of the Poison Charge and Attribution of Good and Harm";
export const BATCH_11_TITLE_CORRECTION_AFTER =
  "The Poison Charge and Attribution of Good and Harm";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function serializedJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function replaceExactOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected exactly one baseline anchor`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function buildBatch11TitleCorrectedProductionSource(baselineSource) {
  const records = extractProductionDebateRecords(baselineSource);
  const record = records.find(
    (item) => item.number === BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER
  );
  if (!record || record.id !== BATCH_11_TITLE_CORRECTION_DEBATE_ID) {
    throw new Error("Batch 11 title-correction production identity changed");
  }
  const beforeLiteral = JSON.stringify(BATCH_11_TITLE_CORRECTION_BEFORE);
  const afterLiteral = JSON.stringify(BATCH_11_TITLE_CORRECTION_AFTER);
  const correctedRecordText = replaceExactOnce(
    record.text,
    beforeLiteral,
    afterLiteral,
    "Batch 11 Debate 24 section title"
  );
  const beforeRecord = JSON.parse(record.text);
  const afterRecord = JSON.parse(correctedRecordText);
  if (
    beforeRecord.sections?.[0]?.sectionId !==
      BATCH_11_TITLE_CORRECTION_SECTION_ID ||
    beforeRecord.sections[0].title !== BATCH_11_TITLE_CORRECTION_BEFORE ||
    afterRecord.sections?.[0]?.title !== BATCH_11_TITLE_CORRECTION_AFTER
  ) {
    throw new Error("Batch 11 title-correction section identity changed");
  }
  const expected = structuredClone(beforeRecord);
  expected.sections[0].title = BATCH_11_TITLE_CORRECTION_AFTER;
  if (serializedJson(expected) !== serializedJson(afterRecord)) {
    throw new Error("Batch 11 title correction changes more than one field");
  }
  return (
    baselineSource.slice(0, record.start) +
    correctedRecordText +
    baselineSource.slice(record.end + 1)
  );
}

export function buildBatch11TitleCorrectedCompatibilityLibrary(
  baselineSource
) {
  const helperAnchor =
    "export function validatePostCanaryBatch11CandidateAgainstScores(\n";
  const helper = `export function postCanaryBatch11SectionTitleMatches({
  debateNumber,
  candidateSection,
  scoredSection
}) {
  if (candidateSection?.title === scoredSection?.title) return true;
  return (
    debateNumber === "${BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER}" &&
    candidateSection?.sectionId === "${BATCH_11_TITLE_CORRECTION_SECTION_ID}" &&
    scoredSection?.sectionId === "${BATCH_11_TITLE_CORRECTION_SECTION_ID}" &&
    scoredSection?.title === "${BATCH_11_TITLE_CORRECTION_BEFORE}" &&
    candidateSection?.title === "${BATCH_11_TITLE_CORRECTION_AFTER}"
  );
}

`;
  let source = replaceExactOnce(
    baselineSource,
    helperAnchor,
    `${helper}${helperAnchor}`,
    "Batch 11 title-correction helper insertion"
  );
  source = replaceExactOnce(
    source,
    "candidateSection.title === scoredSection.title &&",
    `postCanaryBatch11SectionTitleMatches({
          debateNumber: finalScores.debateNumber,
          candidateSection,
          scoredSection
        }) &&`,
    "Batch 11 title-correction comparison"
  );
  validateBatch11TitleCorrectedCompatibilityLibrary(source);
  return source;
}

export function validateBatch11TitleCorrectedCompatibilityLibrary(source) {
  for (const required of [
    "postCanaryBatch11SectionTitleMatches",
    BATCH_11_TITLE_CORRECTION_DEBATE_NUMBER,
    BATCH_11_TITLE_CORRECTION_SECTION_ID,
    BATCH_11_TITLE_CORRECTION_BEFORE,
    BATCH_11_TITLE_CORRECTION_AFTER
  ]) {
    if (!source.includes(required)) {
      throw new Error(`Batch 11 title-corrected library is missing ${required}`);
    }
  }
  return {
    status: "passed",
    bytes: Buffer.byteLength(source),
    sha256: sha256(source)
  };
}
