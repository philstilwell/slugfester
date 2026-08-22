# Batch 5 Debate 64 bounded publication repair

Return one JSON object conforming exactly to `schema.json`. Write only the two keys named in `correctedFields`.

- For `representativeQuotes.con.text`, select a target-length 6–14 word quotation, accepted only when it is a 3–18 word exact substring of the supplied quote-eligible `sourceExcerpt`. Copy transcript tokens exactly.
- For `moveProse.con-first-cause-identification-gap.critique`, preserve the supplied adjudicated substance and locked score band. Use exactly four ordered labeled sentences: `Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:`. Target 112–118 words; acceptance is 105–130 words and at least 880 characters.

Participant judgment and scoring are closed. Do not calculate, emit, infer, suggest, or alter scores. Do not supply any other publication field, move, debate, tag, commentary, or AI Extension content.
