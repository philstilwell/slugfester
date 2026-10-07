# Topic categories

Every published debate has one deliberately assigned primary category based on its main question. Secondary tags connect related subjects; their keyword matches never determine the primary group. Broad debates stay broad when no single specialist question defines their motion.

The definitions and supplementary keywords live in `src/data/topics.js`. New debate records must supply a recognized `topicCategory`. Editorial assignments for existing records live in `src/data/topic-assignments.js`, keyed by stable debate IDs. These override historical category metadata when producing `publishedDebates`, leaving frozen assessment objects, scores, and evidence unchanged. Update the editorial entry when correcting an existing debate.

Run `npm run seo` after changing assignments or definitions. Both `npm run check` and `npm run site:check` validate explicit primary assignments and generated catalogue consistency. A missing or invalid primary category stops publication.

The **Debates by topic** hover/focus previews and initial HTML are neutral browsing aids: describe the question and themes, not the winner, relative performance, or scores. `src/data/topic-preview.js` uses each debate's motion and section headings rather than its assessment summary, so new debates inherit this distinction. Published assessments and summaries elsewhere remain unchanged. `scripts/validate-neutral-topic-previews.mjs` checks every published preview and prevents verdict fields from entering these cards.

## October 6, 2026 expansion: creator arguments and theism

The 57-debate **God, theism, and atheism** group was reviewed against each debate's motion, summary, sections, and published analysis. The approved expansion adds three categories, narrows the old group, and moves specialist debates into existing groups. There are now **18 categories**. Counts below describe the 289-debate catalogue at this change, not targets or limits.

| Destination for the former 57 debates | ID | From the former group | Total in category |
| --- | --- | ---: | ---: |
| God’s existence and rational belief | `god-theism-atheism` | 18 | 18 |
| From a creator to a personal God | `creator-arguments-theism` | 8 | 8 |
| Theism, naturalism, and ultimate reality | `theism-naturalism-ultimate-reality` | 14 | 14 |
| God’s nature and attributes | `divine-nature-attributes` | 6 | 6 |
| Christian belief and doctrine | `christian-belief-doctrine` | 8 | 27 |
| Science and design | `science-design` | 2 | 23 |
| Cosmological & Contingency Arguments | `cosmological-arguments` | 1 | 21 |

The original `god-theism-atheism` ID and URL remain valid. All 57 debates still appear exactly once under a primary topic. Scores, biographies, original assessment records, and evidence are unchanged. Rankings, category statistics, search, topic pages, and initial HTML use the shared editorial assignments.

### Creator-only arguments are not the whole of theism

Here **deistic arguments** means arguments that defend only a creator, not a claim about the personal beliefs of a speaker. A creator-only conclusion does not by itself establish revelation, providential intervention, answered prayer, perfect goodness, or the God of a particular religion. Do not call an interlocutor a deist because a particular argument has this limited conclusion. Nor should a category label imply that an argument succeeds.

- Use **From a creator to a personal God** when a central dispute is whether a creator, designer, or ultimate foundation can be identified with the stronger God of theism, or when a limited/non-intervening creator is contrasted with stronger divine claims. Examples: Debate 263 explicitly distinguishes a designer from a good providential God; Debate 260 contrasts a possible first cause with interventionist religion; Debate 232 tests a creator with limited power. This is a question category, not a collection of speakers identified as deists.
- Keep a specialist case about beginnings, contingency, or cosmic fine-tuning in **Cosmological & Contingency Arguments**, even if its conclusion is creator-only. Keep mathematical or general scientific design in **Science and design**, and biological design in **Evolution and origins of life**. Mentioning a creator does not override the central specialist question.
- Use **Theism, naturalism, and ultimate reality** for comparisons of complete explanations of reality, centered on total evidence, simplicity, and explanatory scope. A passing creator-to-God objection does not move a whole-worldview comparison into the creator category.
- Use **God’s nature and attributes** for the coherence of simplicity, knowledge, power, goodness, timelessness, freedom, or uniqueness. Distinguish asking whether attributes are coherent from asking whether a creator argument establishes them.
- Use **God’s existence and rational belief** for broad cumulative existence debates without a more specific dominant question. A general “Does God exist?” title does not override the actual motion and content.
- Use **Christian belief and doctrine** when the motion specifically asks whether Christianity or the Christian/biblical God is true, rather than using Christian claims as one part of a wider comparison.

### Reviewed assignments

- God’s existence and rational belief (retained): 2, 22, 145, 152, 161, 195, 200, 203, 219, 222, 261, 273, 275, 279, 280, 283, 284, 287.
- From a creator to a personal God: 81, 86, 88, 196, 205, 232, 260, 263.
- Theism, naturalism, and ultimate reality: 14, 18, 26, 29, 79, 95, 105, 109, 112, 163, 175, 194, 267, 272.
- God’s nature and attributes: 42, 64, 94, 241, 246, 248.
- Christian belief and doctrine: 170, 202, 270, 271, 274, 278, 282, 285.
- Science and design: 76, 268.
- Cosmological & Contingency Arguments: 269.

### Verification of the October expansion

- All 57 existing site tests passed. Topic, generated-page, public-route, design, category-average, and search-engine metadata checks passed.
- All 39 changed generated assessment records differed only in `topicCategory`; scores, assessment text, and evidence were preserved.
- Browser checks confirmed 18 groups and 289 unique debate cards, the new topic-page counts (8, 14, and 6), the eight-scorecard creator-topic ranking filter, and no horizontal overflow at a 390-pixel phone width. The existing three-appearance ranking minimum remains unchanged.
- The creator-only explanation and full category listings are also present in initial HTML, so readers without JavaScript and search engines can access them.
- `scripts/validate-topic-scope.mjs` protects representative editorial boundaries, the original category URL, and initial topic content as part of `npm run site:check`.

## Historical September 3, 2026 distribution

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
- The former **God, theism, and atheism** category is now divided using the October 2026 boundaries above. A general title such as “Does God Exist?” does not by itself outweigh a more specific central question in the motion and summary.

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
