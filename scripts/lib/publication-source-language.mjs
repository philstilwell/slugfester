const internalDebateMetadataPattern =
  /(?:SHA-?256|\.assessment-cache|locally cached|timestamped events|below-high-confidence|audio checks?|adjudicated-consensus|disputed-field adjudication|quote-eligible|locked source spans?|repository code|isolated judgments?|source-exact|manifest\.json|transcript\.txt|events\.json)/i;

// This disclosure explains source quality to readers without exposing workflow data.
const automatedAudioDisclosure = "Automatic captions were supplemented by targeted automated audio checks; this was not direct human listening.";

export function hasInternalDebateMetadata(value, fieldName) {
  const reviewedText = fieldName === "sourceNote"
    ? value.replaceAll(automatedAudioDisclosure, "")
    : value;
  return internalDebateMetadataPattern.test(reviewedText);
}
