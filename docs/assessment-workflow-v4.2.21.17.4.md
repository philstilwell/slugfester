# Slugfester Medium-Confidence Audio Verification v4.2.21.17.4

Every move assigned less than high assessment confidence by either independent judge must be transcribed directly from its locked source-span audio before adjudication. Because speaker attribution is already repository-locked and high-confidence in this gate, the verification uses plain audio transcription rather than diarization.

Each clip is transcribed once with `gpt-4o-mini-transcribe`, saved under `output/transcribe/`, and tested deterministically against the source-exact excerpt selected before judgment. Verification requires at least 0.80 bag-of-words recall. A request failure or subthreshold transcript remains unresolved; there is no retry or semantic override.

The two clips total 2.5733 minutes. At the official rate of $0.003 per minute, the expected API cost is $0.0077 and the hard cap is $0.01. ChatGPT subscription billing does not apply to this transcription endpoint. No judgment-model API call or score calculation occurs in this stage.
