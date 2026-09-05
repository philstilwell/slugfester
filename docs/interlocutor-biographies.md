# Interlocutor biographies

Every published interlocutor profile requires a short, neutral biography, including people with only team or panel appearances. The initial catalogue covers 172 people, researched on 5 September 2026.

## Adding a person

1. Confirm the person's identity using the debate source and an independent public biographical page. Check namesakes carefully; do not infer credentials or beliefs from a photograph or assigned debate position.
2. Read an authoritative source, preferably the person's own biography, university, organization, or publisher. Write roughly 25–50 words (20–90 permitted) covering public work and relevant interests. Avoid promotional claims, private details, unsupported credentials, and unnecessarily changeable job titles. Preserve uncertainty rather than filling gaps with guesses.
3. Add the canonical name, original prose, and supporting HTTPS source to `src/data/interlocutor-bios.js`. Record the actual source-review date; override the entry's date when it differs from the initial catalogue review date. Existing entries need not be rewritten when adding a person.
4. Keep biographies entirely out of assessment evidence, judgment packets, scores, rankings, and tag calculations. They are background information, not an endorsement or an explanation of performance.
5. Run `npm run seo`, then `node scripts/validate-interlocutor-bios.mjs` and `npm run site:preflight`. Missing biographies block generation and publication checks. Check that the bio appears left of the chart on desktop and above it on a phone. Team-only profiles show the bio without inventing individual scores.

Biographies also appear in the initial HTML and the profile's structured description for readers without JavaScript and search engines. Sources are linked visibly. Review wording and sources when a correction arrives or a person's public circumstances materially change.
