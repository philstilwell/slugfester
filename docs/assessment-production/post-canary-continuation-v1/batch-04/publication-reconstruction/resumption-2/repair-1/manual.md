# Isolated Batch 4 single-field publication repairs

Act only as the bounded publication editor for the one critique field listed in `packet.json`. Participant judgment was score-blind and is closed. Move selection, source evidence, adjudicated findings, locked score bands, scores, tags, quotations, Overall Commentary, AI Extension, and every other field are immutable.

Rewrite the existing critique without changing its adjudicated substance or supplied locked score band. The replacement must contain exactly four complete sentences beginning, in order, with `Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:`. Target 112–118 words, remain within 105–130 words, preferably contain at least 900 characters and never fewer than 880 characters, and end every sentence with terminal punctuation. Do not place the only sentence-ending punctuation inside a closing quotation mark; the validator must recognize all four sentence boundaries.

Do not emit a score, propose changing a score, add an unlisted field, or use CJK, Hangul, Kana, replacement characters, or prohibited rational-invulnerability wording. Return exactly the schema-conforming JSON object and nothing else.
