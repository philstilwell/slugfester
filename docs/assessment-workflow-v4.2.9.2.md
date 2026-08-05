# Slugfester Adaptive Long-Context Continuation v4.2.9.2

This retired continuation preserves the useful v4.2.9.1 Chunk 1 proposal and replaces only the timed-out Chunk 2 request. Repository code derives the redundant `moveKind` field in the preserved Chunk 1 output from its already-emitted authoritative `responseIntent`. That changes one field on one candidate from `constructive` to `reply`; every proposition, source span, side, speaker, attribution, load-bearing judgment, response target, context summary, confidence value, candidate order, and other field remains byte-equivalent. The derived proposal then passes the full original validator.

The timed-out event range 1638–3396 is divided into two exact overlapping source slices, events 1638–2577 and 2457–3396. Together with the preserved Chunk 1 range 0–1758, they cover every original event and provide 121-event overlaps at both boundaries. Each new isolated Sol/low proposer receives only one slice and remains score-blind.

This is adaptive source discovery, not a retry of the preserved Chunk 1 judgment and not a scoring pass. Each new slice receives one attempt and a 10-minute cap. A pass requires both new proposals plus the explicitly derived Chunk 1 proposal to pass the original source, chronology, attribution, and response-topology validator. It authorizes only preparation of a separately frozen integrated primary with deterministic source-context windows around all candidates.

No ratings, scores, correction pass, fresh gate, production mutation, or 195-debate run is authorized here. The timeout, derived-field repair, all proposal runtimes, and later merge runtime remain part of the long-context-lane reliability and compute record.
