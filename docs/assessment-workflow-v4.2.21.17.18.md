# Slugfester Fresh Hard-Route Held-Out Five v4.2.21.17.18

This selector freezes a third clean five-debate sample after the two failed discovery gates. It excludes the ten debates consumed by those gates, all earlier source-only and development exclusions, and the corpus pool's retired debates. Selection may mechanically hash and measure transcript chains but may not semantically inspect them or access legacy assessments, prior judgments, scores, winners, or publication prose.

No genuinely unused direct-route controls remain. The sample therefore contains five partition-route debates, the operationally harder discovery lane. This is an explicit route-coverage limitation, not evidence that direct and partition routes were both cleanly held out under the final protocol.

Eligible partition debates are ranked by a fixed salted hash of route, corrected motion family, and debate ID. The selector examines only the first forty ranked candidates and chooses the five-debate tuple that lexicographically maximizes topic-family, duration-bin, caption-kind, speaker, and partition-severity coverage before minimizing aggregate rank. At least five distinct topic families are required. Passing metadata screening authorizes only hardened source preparation.
