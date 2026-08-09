# Slugfester production-canary audio-verification workflow

Transcribe the four confidence-triggered clips with `gpt-4o-transcribe-diarize`, automatic chunking, English language guidance, and measured eight-second known-speaker references for the two debate participants in each source. Save every raw diarized transcript locally. ChatGPT subscription authentication does not apply to transcription; use the paid OpenAI transcription API only after explicit user approval of the frozen cost estimate.

Each clip receives one attempt and no retry. A request-level failure stops remaining calls because it may indicate a shared parameter or account problem. A completed transcript that fails deterministic verification does not stop later independent calls. Preserve all failures and raw transcripts without correction.

Verification requires the locked excerpt to be recovered across the full clip and within the expected speaker's diarized segments, with a sufficient recall margin over every other speaker and sufficient expected-speaker duration. This expected-speaker test applies to all four moves even though their queue trigger arose from assessment confidence rather than repository attribution confidence.

Passing all four checks authorizes dispute-only adjudication-packet preparation. Adjudication execution, final-ledger assembly, score derivation, publication finalization, production mutation, and remaining production batches stay unauthorized.
