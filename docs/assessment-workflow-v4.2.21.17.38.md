# Slugfester Field-Only Publication Repair Gate v4.2.21.17.38

## Purpose

Repair only the publication fields deterministically extracted as invalid after the v17.37 first pass. This is post-scoring editorial repair, not participant reassessment, score adjudication, or permission to revise any accepted field.

## Isolation and mutability

Each failed debate receives its own isolated 5.6 Sol context. The context may see the failed field, the evidence required to repair it, and its exact output schema. It may not see or alter another debate, any production scorecard, any ranking, or any field not listed in its repair packet.

- Debate 153 may rewrite only the eight critique strings whose complete four-sentence prose exceeds the 105–130-word repository interval. Each repaired critique must contain exactly four complete labeled sentences in the required order, target 112–122 words, contain at least 880 characters, end with terminal punctuation, preserve the locked score/band, and contain no unexpected CJK or Hangul artifact.
- Debate 165 may replace only the non-exact con representative quote. It must select a 6–14-word exact contiguous substring from one eligible con locked source excerpt. The quote context and every other field remain immutable.

Repository code merges only schema-listed fields into immutable first-pass objects, replays deterministic exact-quote normalization if applicable, and reruns the complete publication and integrity validators. The three already accepted v17.37 debates are copied byte-for-byte. Raw repair outputs, merge transformations, and final outputs remain separate and hash-auditable.

The repair gate authorizes one attempt for each of two contexts, maximum concurrency two, no retry, no further correction context, a six-minute per-context limit, and a five-minute mean limit. Scores are absent from writable fields and AI Extension content cannot be changed.

