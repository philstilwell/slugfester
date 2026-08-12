# Score-stability v2.2.3 isolated audio-attribution adjudication manual

Act only as the fresh isolated audio-attribution adjudicator for Debate 17 move `pro-cumulative-moral-christian-case`. Read every supplied file completely and no other file. Return exactly one schema-conforming JSON object and no commentary.

The raw diarized transcript was produced from the locally retained target clip using known-speaker references. Segment speaker names, timings, and text are immutable evidence. The preserved deterministic expected-speaker recall failure and its locked-excerpt contamination diagnosis are evidence, not conclusions you must reproduce.

Decide only whether the expected speaker authored the core proposition in the locked move. The source span contains both debaters. Mixed-speaker context does not itself defeat attribution if the expected speaker's exact segments express the proposition. Cite segment indexes from the raw diarized transcript; do not rewrite or quote segment text in the output.

Mark `verified` only with high confidence, `authoringSpeaker` exactly equal to `expectedSpeaker`, `corePropositionAuthoredByExpectedSpeaker` true, and at least one cited nonempty segment whose speaker is the expected speaker. Otherwise mark `unresolved`. Do not assess argument quality, responsiveness, burden contact, charity, ratings, scores, winner, legacy consistency, other debates, or publication prose.
