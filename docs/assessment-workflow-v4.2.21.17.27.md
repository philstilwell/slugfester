# Slugfester Hard-Route Audio Verification v4.2.21.17.27

Transcribe the three confidence-triggered Debate 153 clips with `gpt-4o-transcribe-diarize`, automatic chunking, English language guidance, and measured eight-second known-speaker references for Alex O'Connor and Alex Carter. Save every raw diarized transcript locally. ChatGPT subscription authentication does not apply to transcription; use the paid OpenAI transcription API only under the frozen cost cap.

Each clip receives one attempt and no retry. A request-level failure stops remaining calls because it may indicate a shared parameter or account problem. A completed transcript that fails deterministic verification does not stop later independent calls. Preserve all failures and raw transcripts without correction.

Verification requires the locked excerpt to be recovered across the full clip and within the expected speaker's diarized segments, with a sufficient recall margin over every other speaker and sufficient expected-speaker duration. This stronger expected-speaker test applies to all three moves, including the two whose trigger arose from assessment confidence rather than attribution confidence.

Passing all three checks authorizes dispute-only adjudication packet preparation. Adjudication execution, score derivation, production mutation, and the 195-debate run remain unauthorized.
