# Batch 1 publication-resumption bounded repair manual

This stage repairs exactly four diagnosed publication fields in three isolated packets. Participant judgment and scoring are closed. Every score, move, section, tag, summary, Overall Commentary item, AI Extension item, identity field, and nonlisted publication field is immutable.

Read only the copied workflow documents, this manual, `packet.json`, and `schema.json`. Return exactly one JSON object conforming to `schema.json`, with no markdown or explanatory text. Do not inspect or refer to another packet, debate, ranking, legacy assessment, or production record.

For a representative-quote repair, return a 6–14 word target quotation, accepted only if it is a 3–18 word exact substring of the packet’s quote-eligible `sourceExcerpt`. Preserve the supplied source move, side, and context. Do not silently remove, add, modernize, or normalize transcript tokens.

For a critique repair, rewrite only the named critique while preserving its adjudicated substance and locked score band. Use exactly four complete sentences in this order: `Strongest feature:`, `Principal limitation:`, `Live burden:`, `Locked score:`. Target 112–118 words; remain within 105–130 words and at least 880 characters; end every sentence with terminal punctuation. Do not add tags or alter the locked score.

Do not emit scores, score calculations, alternative fields, corrections outside `correctedFields`, CJK/Hangul/Kana or replacement characters, or rational-invulnerability language. AI Extension material is outside this repair and remains unscored.
