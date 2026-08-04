# Slugfester Decision-Card Schema Smoke Workflow v3.6.2

## Status and purpose

Version 3.6.2 is a remote structured-output compatibility smoke test. It executes four isolated, gold-free synthetic contexts—one per v3.6 decision-card schema—using subscription-backed 5.6 Terra. It tests transport, schema acceptance, and deterministic validation, not debate-level accuracy.

## Fixed execution

- Model: `5.6 Terra` (`gpt-5.6-terra`) at high reasoning.
- Authentication: ChatGPT subscription credentials copied into a fresh temporary `CODEX_HOME`; API keys removed.
- Contexts: target/component/example, diagnostic, reframe, and burden conflict.
- Isolation: one temporary read-only directory per context containing only workflow, rubric, manual, schema, and packet.
- Attempts: exactly one per context. No model-output retry or semantic repair.
- Cost: no metered API, transcription, or paid external service.

A response-schema rejection before inference is recorded separately and is not retried. A completed inference whose output violates a semantic invariant also fails without retry.

## Gate

The smoke test passes only if all four contexts complete, all four outputs conform to their closed schemas, all four pass deterministic family validation, pre-inference schema rejections and retries remain zero, and no scores or production mutations occur.

Synthetic expected cards may be consulted only after outputs close and only as non-gating semantic monitoring. Passing authorizes preregistration of a small retired semantic-card test with isolated Terra and Sol passes. It does not authorize held-out debates, numerical scoring, assessment prose, AI Extension generation, or production changes.
