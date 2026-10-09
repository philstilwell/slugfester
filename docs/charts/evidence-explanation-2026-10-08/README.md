# Evidence gap explanation

This edition explains the fixed October 8, 2026 revision 2 Charts snapshot. It does not reassess debates or refresh Charts.

`analysis.json` contains equal-debate evidence means, strict below-threshold shares, paired role comparisons, topic comparisons, recorded assessment-format comparisons, and whole-debate leave-one-speaker-out checks. Supporting and challenging refer to positions, not personal identities. The sample is not Christianity-only or representative of all religious debate.

Reproduce the descriptive calculations from the repository root:

```sh
node scripts/analyze-charts-evidence-gap.mjs
```

The script checks current assessment adapters against their snapshot fingerprints and independently reconciles the aggregate calculations. No model calls are made. Role comparisons keep only debates with both sides represented in that role. Family chart rates preserve the side-specific denominators used on the Charts page. No statistical-significance, causal, independent-human-validation, or model-neutrality claim follows from these checks.

The accompanying PDF manuscript and layout source preserve the distinction between observed scores, the assessment method, proposed explanations, and recommended future bias audits. The hypotheses about faith, audience expectations, and motivation are not variables measured by the snapshot.

## Document files

- `manuscript.md`: editable explanation with numbered references.
- `../../../output/pdf/slugfester-evidence-faith-and-ai-bias.pdf`: 14-page PDF with embedded fonts, selectable text, bookmarks, and linked sources.
- `../../../scripts/build-charts-evidence-explanation.py`: local ReportLab layout program. It uses Georgia/Arial when available on macOS and DejaVu on Linux; different font metrics can change pagination.

Generate the PDF after the calculation record exists:

```sh
python3 scripts/build-charts-evidence-explanation.py
```

The Charts page features this document beside the reasoning-support heading. The published asset is `../../../assets/charts/evidence-faith-and-fair-assessment-2026-10-08.pdf`; copy the reviewed output there after rebuilding the PDF. It adds no model judgments and changes no assessments or snapshot values.
