# Slugfester Schema-Bounded Source-Integrity Workflow v4.1.9

This prospective amendment inherits v4.0 through v4.1.8 except where stated here. The v4.1.8 fresh-six gate failed on its first context because six of eight source-faithful excerpts exceeded a prose-only 90-token ceiling. That raw output and all six v4.1.8 sample debates remain diagnostic exclusions. No v4.1.8 judgment may be shortened, repaired, retried, scored, or reused.

## Schema-enforced excerpt compactness

The v4.1.8 provenance rules remain unchanged: exact event-file hashing, repository-owned millisecond compilation, 0.80 multiset lexical recall, and 0.80 ordered-token coverage are mandatory. v4.1.9 changes only the prospective excerpt compactness contract:

- the endpoint JSON schema sets `sourceSpan.excerpt.maxLength` to 600 characters;
- deterministic validation requires 12–100 lexical tokens; and
- the primary prompt states both limits and requires a source-ordered exact or near-exact excerpt from only the declared inclusive event range.

The 600-character schema limit directly constrains the observed long-excerpt generation mode. The 100-token deterministic ceiling allows compact excerpts composed of short words while preventing an entire speech segment from serving as a move's evidence. Character length is checked before token count; both are checked before lexical and ordered coverage. Model-supplied `startMs` or `endMs` fields remain invalid.

## Fixture boundary

Before sample selection, deterministic fixtures must prove that a known source-consistent output passes and that the validator rejects at least:

1. an excerpt longer than 600 characters;
2. an excerpt longer than 100 lexical tokens while remaining below 600 characters;
3. an unrelated excerpt within both size limits; and
4. reintroduced model-supplied milliseconds.

The endpoint schema introduces no new keyword beyond `maxLength`, already exercised by earlier accepted repository schemas. No judgment retry or schema-normalization path is authorized.

## New prospective sample and gate

Repository code selects a new six-debate dyadic source-blind sample from the frozen metadata pool after this workflow, schema, validator, and fixtures are committed. It excludes every earlier retired or calibration debate plus all six v4.1.7 and all six v4.1.8 debates. It retains the six topic families, the under-90-minute and over-120-minute requirements, and a new fixed v4.1.9 ranking salt. No legacy assessment field may enter selection or model contexts.

All remaining judgment, escalation, audio-verification, Pass B, disagreement, adjudication, compression-audit, score-lock, legacy-comparison, and compute-budget rules remain those of v4.1.8. A single invalid primary context fails fast without retry. A passed v4.1.9 fresh-six gate authorizes preparation only of a new held-out end-to-end gate; it does not authorize the 195-debate reassessment.
