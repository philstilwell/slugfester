# Topic categories

Every published debate has one deliberately assigned primary category based on its main question. Secondary tags connect related subjects; their keyword matches never determine the primary group. Broad debates stay broad when no single specialist question defines their motion.

The definitions and supplementary keywords live in `src/data/topics.js`. New debate records must supply a recognized `topicCategory`. Editorial assignments for existing records live in `src/data/topic-assignments.js`, keyed by stable debate IDs. These override historical category metadata when producing `publishedDebates`, leaving frozen assessment objects, scores, and evidence unchanged. Update the editorial entry when correcting an existing debate.

Run `npm run seo` after changing assignments or definitions. Both `npm run check` and `npm run site:check` validate explicit primary assignments and generated catalogue consistency. A missing or invalid primary category stops publication.

## Approved September 3, 2026 distribution

These counts describe the 244-debate catalogue at implementation, not limits on future growth. Existing IDs for the two renamed categories remain unchanged so older topic links and ranking filters continue to work.

| Category | ID | Debates |
| --- | --- | ---: |
| Cosmological & Contingency Arguments | `cosmological-arguments` | 19 |
| Science and design | `science-design` | 20 |
| Evolution and origins of life | `evolution-origins-life` | 7 |
| Bible and historical Jesus | `scripture-jesus-resurrection` | 15 |
| Resurrection and miracles | `resurrection-miracles` | 18 |
| Christian belief and doctrine | `christian-belief-doctrine` | 19 |
| Meaning and purpose | `meaning-purpose` | 10 |
| Morality and ethics | `morality-ethics` | 16 |
| Moral realism and objectivity | `moral-realism-objectivity` | 11 |
| Evil, suffering, and hiddenness | `evil-suffering-hiddenness` | 16 |
| Mind and consciousness | `mind-consciousness-free-will` | 18 |
| Free will and determinism | `free-will-determinism` | 7 |
| Logic, reason, and presuppositions | `logic-reason-presuppositions` | 13 |
| Religion, society, and public reason | `religion-society-public-reason` | 20 |
| God, theism, and atheism | `god-theism-atheism` | 35 |

## Choosing between related categories

- Use **Christian belief and doctrine** for an overall case for Christianity or a question about salvation, atonement, hell, or purgatory. Use **Bible and historical Jesus** for textual reliability, authorship, historicity, interpretation, or biblical ethics. Use **Resurrection and miracles** when the supernatural event and its evidence are the central question.
- Use **Moral realism and objectivity** when the question is whether objective moral facts exist. Use **Morality and ethics** for moral arguments for God, religious and secular ethical foundations, obligations, and moral practice.
- Use **Free will and determinism** for freedom, determinism, and responsibility. A debate invoking free will to argue for a soul can remain under **Mind and consciousness** when the soul is the main question (for example, Debate 235).
- Use **Evolution and origins of life** for biological evolution, prebiotic chemistry, and cellular design. Keep broader scientific explanation and physics questions in **Science and design**; superdeterminism as a quantum physics proposal remains there (Debate 224).
- Use **Meaning and purpose** for existential meaning and religious symbolism; **Religion, society, and public reason** for social institutions, cultural inheritance, and public consequences.
- Use **God, theism, and atheism** for broad cumulative cases and comparisons that span multiple specialist questions. A general title such as “Does God Exist?” does not by itself outweigh a more specific central question in the motion and summary.

## Initial reassignments

75 debates changed primary groups; the remaining assignments explicitly preserve their previous grouping.

- Resurrection and miracles: 31, 37, 52, 60, 69, 78, 87, 130, 136, 137, 138, 150, 158, 179, 180, 181, 212, 237.
- Christian belief and doctrine: 32, 39, 50, 63, 66, 93, 96, 102, 119, 120, 142, 157, 182, 215, 220, 226, 233, 238, 243.
- Moral realism and objectivity: 19, 23, 40, 41, 45, 56, 82, 183, 184, 221, 236.
- Free will and determinism: 44, 73, 133, 146, 153, 185, 186.
- Evolution and origins of life: 110, 111, 144, 174, 189, 191, 192.
- Evil, suffering, and hiddenness: 208–211.
- Science and design: 206, 223.
- Religion, society, and public reason: 46, 61, 218.
- Logic, reason, and presuppositions: 217.
- Meaning and purpose: 207, 214, 216.

## Verification at implementation

- All 47 existing site tests passed, including accessibility, mobile layout, loading budgets, and visual contracts.
- Browser review confirmed 15 groups, 244 unique debate cards, the proposed counts, a working resurrection ranking filter, and no horizontal overflow at 390 pixels.
- Topic, public-route, generated-page, and design validators passed. All 181 changed generated debate detail files differed only in `topicCategory`.
- The full campaign audit and all `postcheck` audits passed. Exact original copies of the category validator, package configuration, and standalone auditor were added to the existing control-snapshot mechanism; historical locks and evidence were not rewritten.
- The general `npm run check` stopped at an existing transcript-audit mismatch on the starting `main` revision `bf65abfd9`: the audit records 243 debates while the catalogue contains 244. Its preceding topic, syntax, scoring, debate, and calibration checks passed. The unrelated transcript audit was left unchanged.
