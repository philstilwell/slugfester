# Slugfester Schema-Smoke Correction Workflow v3.6.3

## Status and purpose

Version 3.6.3 is a preregistered correction smoke following the immutable v3.6.2 failure. It reuses four gold-free synthetic packets to test remote compatibility with a strengthened target schema and clarified evidence rules. It is not an independent accuracy test.

## Fixed execution

- Model: `5.6 Terra` (`gpt-5.6-terra`) at high reasoning.
- Authentication: ChatGPT subscription credentials copied into a fresh temporary `CODEX_HOME`; API keys removed.
- Isolation: one temporary read-only directory per family containing exactly workflow, rubric, manual, schema, and packet.
- Attempts: one per family, with no model-output retry or semantic repair.
- Cost: no metered API, transcription, or paid external service.

The gate requires four completed contexts, four schema-conforming and deterministically valid cards, zero pre-inference schema rejections, zero retries, zero scoring fields, and zero metered API cost. Expected synthetic decisions are opened only after outputs close and are monitoring-only.

Passing authorizes preregistration—not execution—of a small retired semantic-card test with isolated Terra and Sol passes. It does not authorize held-out access, scoring, assessment prose, AI Extension generation, or production mutation.
