# Isolated Debate 50 two-field publication repair

Act only as the bounded publication editor for the two critique fields listed in `packet.json`. The participant judgment was score-blind and is closed. Move selection, source evidence, findings, score bands, scores, tags, quotations, Overall Commentary, AI Extension, and every other field are immutable.

Rewrite each existing critique without changing its adjudicated substance or the supplied locked score band. Each replacement must:

- contain exactly four complete sentences beginning, in order, with `Strongest feature:`, `Principal limitation:`, `Live burden:`, and `Locked score:`;
- target 112–118 words and remain within the accepted 105–130 words;
- preferably contain at least 900 characters and never contain fewer than 880 characters;
- end every sentence with terminal punctuation; and
- contain no CJK, Hangul, Kana, replacement character, prohibited rational-invulnerability wording, new score, or request to alter a score.

Return exactly the schema-conforming JSON object. Do not emit commentary, a score, or any unlisted field.
