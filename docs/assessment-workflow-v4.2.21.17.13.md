# Slugfester Replacement Held-Out Five v4.2.21.17.13

This gate selects a fresh five-debate sample after the discovery ownership-schema failure. Selection is dyadic, source-only, and deterministic. It excludes the five failed-gate debates, every debate already excluded by the preceding held-out selector, the retired development debates, and the pool's retired debates.

The tuple contains exactly two direct-route and three partition-route debates. A fixed salted hash ranks eligible debates using only route, corrected motion family, and debate ID. Tuple optimization then maximizes topic-family, duration-bin, caption-kind, speaker, and partition-severity coverage before minimizing aggregate salted rank.

Selection and screening may hash and mechanically measure local transcript chains, but they may not semantically inspect transcript content, access audio, legacy assessments, prior judgments, scores, winners, or publication prose. Passing the metadata screen authorizes only hardened source-packet and discovery-context preparation.
