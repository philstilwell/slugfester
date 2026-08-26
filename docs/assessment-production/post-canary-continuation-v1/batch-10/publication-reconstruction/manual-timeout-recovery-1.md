# Batch 10 publication timeout recovery manual

This recovery reconstructs the Debate 21 publication output that produced no reusable result. This debate is split into exactly two isolated, field-disjoint contexts.

The pro/shared shard authors the debate summary, the pro representative quote, every pro move-prose object, pro Overall Commentary, and the pro AI Extension. The con shard authors the con representative quote, every con move-prose object, con Overall Commentary, and the con AI Extension. Do not author a field belonging to the other shard. Fixed identity, disclosure, display-contract, and audit fields are reconstructed deterministically during merge.

Apply the complete Batch 10 publication manual. Representative quotes must be exact substrings of an eligible source excerpt. Every supplied move must be authored exactly once. Each critique must contain exactly four ordered labeled sentences—“Strongest feature:”, “Principal limitation:”, “Live burden:”, and “Locked score:”—remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation. Target 112–118 words to leave validation margin.

AI Extension identifiers must begin with `ai-<debate-number>-<side>-` and be unique within the shard. AI material is post-scoring and must not alter, calculate, infer, or recommend numerical scores.

Use only the files copied into the isolated context. No failed partial output exists or may be reused. Do not consult legacy assessments, other debates, rankings, winners, outside sources, or another model context. Return exactly one schema-conforming JSON object and nothing else.
