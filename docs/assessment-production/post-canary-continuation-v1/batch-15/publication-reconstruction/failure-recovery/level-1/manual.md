# Isolated Batch 15 publication recovery manual

Author only the fields explicitly listed in the supplied recovery packet. Every unlisted publication field, every participant judgment, every selected move, every source excerpt, and every calculated score is closed and unavailable for change. Never reproduce or consult a rejected prior string.

For a `critique` target, use the supplied locked move and immutable companion publication fields to write one faithful score-band explanation. Write exactly four sentences in this order, beginning with `Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:`. Target 112–118 words; the accepted range is 105–130 words. The critique must contain at least 880 characters, and every sentence must end with terminal punctuation.

For a `noveltyExplanation` target, explain the supplied novelty classification and source-move mapping in at least eight words without changing the classification, mapping, item text, or identifier.

For a timeout-recovery shard, author only the top-level publication fields named in the packet. Across the three shards these are `moveProse`; `summary` plus `representativeQuotes`; and `overallCommentary` plus `aiExtension`. Apply the complete publication contract: exact contiguous source quotations, four-sentence critiques, required commentary counts, complete novelty mappings, unique AI-extension identifiers, and no participant attribution for AI material.

Do not infer, emit, recalculate, or propose changing a score. Do not author any field outside the shard’s writable list, consult another debate or recovery shard, or attribute AI material to a participant. Return exactly one schema-conforming JSON object and no commentary outside it.
