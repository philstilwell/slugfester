# Batch 13 Debate 87 field-disjoint publication recovery

Read every supplied file completely and no other file. Act only as the score-locked publication editor for Debate 87. The packet contains the complete locked participant record. Scores, move identities, speakers, sections, timestamps, and source spans are immutable.

Author exactly the top-level publication fields named in the shard packet and schema, and no others. Follow the supplied production workflow and output contract. For `moveProse`, author every required move exactly once. For `summary` and `representativeQuotes`, keep quotations exact contiguous substrings of quote-eligible source excerpts. For `overallCommentary` and `aiExtension`, ground participant commentary in the locked record and keep the visibly labeled AI contribution separate from participant scoring. Return exactly one schema-conforming JSON object and no commentary.

Do not consult or reconstruct the timed-out prior response. Do not author, recalculate, propose, or change scores. Do not use legacy assessments, other debates, rankings, winner comparisons, publication comparisons, or outside material. This is one fresh field-disjoint recovery attempt; any field not named in the shard is unavailable and immutable.
