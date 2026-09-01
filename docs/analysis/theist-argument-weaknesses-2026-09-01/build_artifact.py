#!/usr/bin/env python3
"""Build the canonical portable-report artifact from the executed diagnosis."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ANALYSIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = ANALYSIS_DIR.parents[2]
RESULTS_PATH = ANALYSIS_DIR / "results.json"
ARTIFACT_PATH = ANALYSIS_DIR / "artifact.json"


def pct(value: float) -> str:
    return f"{value:.1%}"


def build() -> dict:
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    primary = results["primary"]
    evidence = results["evidence_bands"]
    legacy = results["legacy_closed_findings"]
    dimensions = sorted(
        results["dimension_decomposition"],
        key=lambda row: row["score_gap_contribution"],
        reverse=True,
    )

    source = {
        "id": "diagnostic-results",
        "label": "Executed rubric-dimension diagnosis",
        "path": "docs/analysis/theist-argument-weaknesses-2026-09-01/results.json",
        "query": {
            "engine": "DuckDB",
            "language": "sql",
            "description": (
                "Join the corrected position taxonomy to every locked assessment ledger, reconstruct "
                "the six final move dimensions, validate the deterministic score path, and decompose "
                "the paired overall margin."
            ),
            "executed_at": generated_at,
            "filters": [
                "The 169 position-level theist/religious versus non-theist/skeptical dyads in the corrected taxonomy",
                "All scored moves in the locked ledgers for those debates",
                "Team and panel scorecards excluded",
                "Closed calibration and response-class subfields restricted to the 146 debates that expose them",
            ],
            "metric_definitions": [
                "Dimension contribution = mean across debates of (non-theist section- and importance-weighted dimension mean minus theist mean) multiplied by the fixed rubric weight.",
                "Evidence below-70 share = moves with evidence/warrant below 70 divided by all scored moves on that side.",
                "Any overstatement = slightly-, materially-, or radically-overstated warrant fit in the locked calibration finding.",
                "Strong reply contact = full answer, diagnostic defeat, or justified reframe among moves classified as replies.",
            ],
            "tables_used": [
                "docs/analysis/theist-argument-weaknesses-2026-09-01/results.json",
            ],
            "sql": "SELECT * FROM read_json_auto('docs/analysis/theist-argument-weaknesses-2026-09-01/results.json')",
        },
    }

    evidence_rows = [
        {
            "side": "Theist/religious",
            "moves": evidence["theist"]["n_moves"],
            "mean_evidence": evidence["theist"]["mean"],
            "below_70_share": evidence["theist"]["below_70_share"],
            "below_80_share": evidence["theist"]["below_80_share"],
        },
        {
            "side": "Non-theist/skeptical",
            "moves": evidence["non_theist"]["n_moves"],
            "mean_evidence": evidence["non_theist"]["mean"],
            "below_70_share": evidence["non_theist"]["below_70_share"],
            "below_80_share": evidence["non_theist"]["below_80_share"],
        },
    ]
    structural_rows = [
        {
            "diagnostic": "Any overstatement relative to warrant",
            "theist_share": legacy["calibration"]["theist"]["any_overstatement_share"],
            "non_theist_share": legacy["calibration"]["non_theist"]["any_overstatement_share"],
            "coverage": "2,800 moves / 146 debates",
        },
        {
            "diagnostic": "Material or radical overstatement",
            "theist_share": legacy["calibration"]["theist"]["material_or_radical_overstatement_share"],
            "non_theist_share": legacy["calibration"]["non_theist"]["material_or_radical_overstatement_share"],
            "coverage": "2,800 moves / 146 debates",
        },
        {
            "diagnostic": "Strong contact with the target in replies",
            "theist_share": legacy["response_contact"]["theist"]["full_diagnostic_or_justified_reframe_share"],
            "non_theist_share": legacy["response_contact"]["non_theist"]["full_diagnostic_or_justified_reframe_share"],
            "coverage": "2,140 replies / 146 debates",
        },
        {
            "diagnostic": "Low charity when charity was tested",
            "theist_share": legacy["charity"]["theist"]["below_70_share"],
            "non_theist_share": legacy["charity"]["non_theist"]["below_70_share"],
            "coverage": "2,427 tested moves / 146 debates",
        },
    ]
    example_rows = [
        {
            "pattern": row["pattern"],
            "example": f"Debate {int(row['number'])}: {row['speaker']}",
            "diagnosis": row["diagnostic"],
            "evidence": row["evidence_warrant"],
            "logic": row["logical_coherence"],
        }
        for row in results["examples"]
    ]

    artifact = {
        "surface": "report",
        "manifest": {
            "version": 1,
            "surface": "report",
            "title": "Why Do the Theist Sides Score Lower?",
            "description": "A move-level diagnosis of the SLUGFESTER theist/non-theist score gap.",
            "generatedAt": generated_at,
            "sources": [
                source,
                {
                    "id": "scoring-rubric",
                    "label": "SLUGFESTER reassessment rubric",
                    "path": "docs/reassessment-rubric-v4.0.md",
                },
                {
                    "id": "corrected-taxonomy",
                    "label": "Corrected position taxonomy",
                    "path": "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv",
                },
            ],
            "cards": [
                {
                    "id": "evidence-contribution-card",
                    "description": "Direct score-point contribution of evidence/warrant to the mean paired 6.35-point gap.",
                    "dataset": "headline_metrics",
                    "sourceId": "diagnostic-results",
                    "metrics": [
                        {
                            "label": "Evidence contribution",
                            "field": "evidence_contribution",
                            "format": "number",
                            "signed": True,
                        },
                        {
                            "label": "Share of gap",
                            "field": "evidence_share",
                            "format": "percent",
                        },
                    ],
                },
                {
                    "id": "weak-evidence-card",
                    "description": "Share of all theist-side moves below the rubric's 70-point evidence threshold.",
                    "dataset": "headline_metrics",
                    "sourceId": "diagnostic-results",
                    "metrics": [
                        {
                            "label": "Theist moves below 70",
                            "field": "theist_below_70",
                            "format": "percent",
                        },
                        {
                            "label": "Non-theist comparison",
                            "field": "non_theist_below_70",
                            "format": "percent",
                        },
                    ],
                },
                {
                    "id": "overstatement-card",
                    "description": "Share of theist moves whose asserted force exceeds supplied warrant in the 146-debate closed-findings cohort.",
                    "dataset": "headline_metrics",
                    "sourceId": "diagnostic-results",
                    "metrics": [
                        {
                            "label": "Theist moves overstated",
                            "field": "theist_overstated",
                            "format": "percent",
                        },
                        {
                            "label": "Non-theist comparison",
                            "field": "non_theist_overstated",
                            "format": "percent",
                        },
                    ],
                },
            ],
            "charts": [
                {
                    "id": "dimension-contribution-chart",
                    "title": "Where the 6.35-point gap comes from",
                    "subtitle": "Mean paired score-point contribution; positive values favor the non-theist side",
                    "showDescription": True,
                    "intent": "comparison",
                    "question": "How much does each fixed rubric dimension contribute to the overall score gap?",
                    "rationale": "Six labeled horizontal bars make the additive contribution and ordering of the fixed dimensions directly comparable.",
                    "comparisonContext": {
                        "denominator": "169 classified debates",
                        "grain": "one paired debate-side dimension mean",
                        "normalization": "section- and importance-weighted within debate; averaged across debates",
                        "semanticFamily": "contribution to non-theist minus theist overall score",
                        "unit": "score points",
                    },
                    "type": "bar",
                    "dataset": "dimension_contributions",
                    "sourceId": "diagnostic-results",
                    "encodings": {
                        "x": {"field": "label", "type": "nominal", "label": "Rubric dimension"},
                        "y": {
                            "field": "score_gap_contribution",
                            "type": "quantitative",
                            "aggregate": "none",
                            "format": "number",
                            "label": "Score-point contribution",
                        },
                        "tooltip": [
                            {
                                "field": "dimension_gap",
                                "type": "quantitative",
                                "format": "number",
                                "label": "Raw dimension gap",
                            },
                            {
                                "field": "share_of_official_gap",
                                "type": "quantitative",
                                "format": "percent",
                                "label": "Share of official gap",
                            },
                        ],
                    },
                    "yAxisTitle": "Score-point contribution",
                    "valueFormat": "number",
                    "layout": "full",
                    "maxRows": 6,
                    "palette": {"kind": "sequential", "name": "blue"},
                    "labels": {"values": "all"},
                    "settings": {
                        "orientation": "horizontal",
                        "groupMode": "single",
                        "sort": "custom",
                        "showValues": True,
                    },
                    "surface": {
                        "surface": "card",
                        "interactiveLegend": False,
                        "showControls": False,
                        "viewMode": "both",
                    },
                }
            ],
            "tables": [
                {
                    "id": "evidence-comparison-table",
                    "title": "Evidence and warrant by side",
                    "subtitle": "Below 70 means assertion, anecdote, authority, selective examples, or speculation carries substantial weight",
                    "showDescription": True,
                    "dataset": "evidence_comparison",
                    "defaultSort": {"field": "below_70_share", "direction": "desc"},
                    "density": "spacious",
                    "sourceId": "diagnostic-results",
                    "layout": "full",
                    "columns": [
                        {"field": "side", "label": "Side", "type": "text"},
                        {"field": "moves", "label": "Moves", "type": "number", "format": "number"},
                        {"field": "mean_evidence", "label": "Mean evidence", "type": "number", "format": "number"},
                        {"field": "below_70_share", "label": "Below 70", "type": "number", "format": "percent"},
                        {"field": "below_80_share", "label": "Below 80", "type": "number", "format": "percent"},
                    ],
                },
                {
                    "id": "structural-findings-table",
                    "title": "What the closed findings say",
                    "subtitle": "Subfield diagnostics available for 146 of the 169 debates",
                    "showDescription": True,
                    "dataset": "structural_findings",
                    "defaultSort": {"field": "theist_share", "direction": "desc"},
                    "density": "spacious",
                    "sourceId": "diagnostic-results",
                    "layout": "full",
                    "columns": [
                        {"field": "diagnostic", "label": "Diagnostic", "type": "text"},
                        {"field": "theist_share", "label": "Theist", "type": "number", "format": "percent"},
                        {"field": "non_theist_share", "label": "Non-theist", "type": "number", "format": "percent"},
                        {"field": "coverage", "label": "Coverage", "type": "text"},
                    ],
                },
                {
                    "id": "examples-table",
                    "title": "Representative locations of the weakness",
                    "subtitle": "Illustrative load-bearing theist-side moves; examples diagnose patterns but do not determine prevalence",
                    "showDescription": True,
                    "dataset": "examples",
                    "defaultSort": {"field": "evidence", "direction": "asc"},
                    "density": "spacious",
                    "sourceId": "diagnostic-results",
                    "layout": "full",
                    "columns": [
                        {"field": "pattern", "label": "Pattern", "type": "text"},
                        {"field": "example", "label": "Example", "type": "text"},
                        {"field": "diagnosis", "label": "What is missing", "type": "text"},
                        {"field": "evidence", "label": "Evidence", "type": "number", "format": "number"},
                        {"field": "logic", "label": "Logic", "type": "number", "format": "number"},
                    ],
                },
            ],
            "blocks": [
                {
                    "id": "report-title",
                    "type": "markdown",
                    "body": "# Why Do the Theist Sides Score Lower?",
                    "layout": "full",
                },
                {
                    "id": "executive-summary",
                    "type": "markdown",
                    "body": (
                        "## Executive Summary\n\n"
                        "- **Yes: incomplete substantiation is a major, directly measured weakness.** Evidence and warrant accounts for 1.71 points, or 27.0%, of the corrected 6.35-point mean gap.\n"
                        "- **It is not the whole explanation, or quite the largest component.** Logical coherence contributes 1.81 points; responsiveness contributes 1.30. Together these show missing inferential bridges and weaker contact with objections in addition to thin evidence.\n"
                        "- **The pattern is not just an affirmative-burden artifact.** The evidence gap remains in constructives, replies, load-bearing moves, and the 20 debates where the theist side is `con`.\n"
                        "- **The causal claim about faith remains unproven.** The ledgers show where the arguments fail; they do not measure whether faith commitment caused those failures."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "headline-metrics",
                    "type": "metric-strip",
                    "cardIds": [
                        "evidence-contribution-card",
                        "weak-evidence-card",
                        "overstatement-card",
                    ],
                    "layout": "full",
                },
                {
                    "id": "method-definition",
                    "type": "markdown",
                    "body": (
                        "## What was measured\n\n"
                        "The diagnosis uses every scored move in the corrected 169-debate comparison: 1,746 theist-side moves and 1,756 non-theist-side moves. Within each debate, moves are weighted by their locked importance and sections by their locked share. The six fixed rubric dimensions are then decomposed so their contributions add back to the official score gap.\n\n"
                        "A score below 70 for evidence/warrant has a specific rubric meaning: assertion, anecdote, authority, selective examples, or speculation carries substantial argumentative weight. This is therefore a direct operational test of incomplete substantiation, not a keyword count."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "decomposition-finding",
                    "type": "markdown",
                    "body": (
                        "## Where the score gap is created\n\n"
                        "**Two weaknesses dominate.** Logical coherence contributes 1.81 points (28.6% of the gap) and evidence/warrant contributes 1.71 (27.0%). Responsiveness adds 1.30 (20.5%). Calibration/charity, precision, and relevance/burden contribute the remaining 1.58 points before the −0.06 rounding residual.\n\n"
                        "This matters for the hypothesis: direct substantiation explains about a quarter of the gap, while separate failures in the inference from premise to conclusion explain slightly more. The rubric explicitly keeps those defects separate."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "dimension-chart-block",
                    "type": "chart",
                    "chartId": "dimension-contribution-chart",
                    "layout": "full",
                },
                {
                    "id": "evidence-finding",
                    "type": "markdown",
                    "body": (
                        "## The substantiation deficit is broad and load-bearing\n\n"
                        f"**{pct(evidence['theist']['below_70_share'])} of theist moves fall below 70 on evidence/warrant, versus {pct(evidence['non_theist']['below_70_share'])} of non-theist moves.** Among importance-3 moves—the most load-bearing—the corresponding shares are 61.1% and 18.5%.\n\n"
                        "The gap is nearly the same inside constructive moves (8.16 dimension points) and replies (8.45), and remains 5.06 points in the 20 debates where the theist side is `con`. This weakens the explanation that the evidence gap is merely the cost of usually arguing the affirmative."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "evidence-table-block",
                    "type": "table",
                    "tableId": "evidence-comparison-table",
                    "layout": "full",
                },
                {
                    "id": "structural-finding",
                    "type": "markdown",
                    "body": (
                        "## The exact weaknesses extend beyond missing evidence\n\n"
                        "- **Inferential bridge:** the conclusion often outruns what the premises establish—possibility becomes probability, compatibility becomes explanation, or a difficulty for a natural account becomes positive evidence for a divine one.\n"
                        "- **Rival comparison:** alternatives are dismissed without representative treatment, comparative likelihoods, base rates, independence checks, or a discriminating prediction.\n"
                        "- **Response contact:** in the 146-debate closed-findings cohort, 55.7% of theist replies fully answer, diagnostically defeat, or justifiably reframe the target, versus 79.0% of non-theist replies.\n"
                        "- **Calibration:** 72.8% of theist moves are rated at least slightly overstated relative to warrant, versus 40.4%; material or radical overstatement is 36.3% versus 10.0%.\n"
                        "- **Precision and charity:** qualifications, scope, and stable terms are more often missing; when charity is tested, ratings below 70 occur in 44.6% of theist moves versus 17.8%.\n"
                        "- **Not mainly topical drift:** relevance/burden contributes only 0.21 points. The theist moves are usually on the right subject; the larger problem is how the claim is supported, inferred, qualified, and defended."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "structural-table-block",
                    "type": "table",
                    "tableId": "structural-findings-table",
                    "layout": "full",
                },
                {
                    "id": "examples-finding",
                    "type": "markdown",
                    "body": (
                        "## Where these weaknesses appear in practice\n\n"
                        "The examples below show the recurring form of the problem: prevalence treated as reliability, explanatory gaps converted into positive agency evidence, live alternatives ruled out without comparison, and a class of meaningful beliefs placed beyond ordinary evidential demands. They are illustrative locations in the audited record, not a separate frequency estimate."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "examples-table-block",
                    "type": "table",
                    "tableId": "examples-table",
                    "layout": "full",
                },
                {
                    "id": "causal-boundary",
                    "type": "markdown",
                    "body": (
                        "## What the data say about the faith hypothesis\n\n"
                        "**Supported:** theist-side transcript performances in this corpus contain substantially more incomplete warrant, overextended inference, partial reply contact, overstatement, and weak representation of alternatives. The pattern is especially strong in evidence/warrant and survives the main role and orientation checks.\n\n"
                        "**Not established:** that faith-based ideology caused those defects. The assessments do not observe private epistemic standards, prior faith commitment, preparation, topic difficulty, or how the same person would reason under a different worldview. Calling the pattern a ‘bleed-over from faith’ is a plausible interpretation, but it remains a causal hypothesis rather than a result of this dataset."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
                {
                    "id": "recommended-next-steps",
                    "type": "markdown",
                    "body": (
                        "## Recommended next steps\n\n"
                        "1. **Blind-code premise source.** Before revealing side, classify whether a move rests on public evidence, testimony, religious experience, scripture, intuition, conceptual necessity, or inference to the best explanation.\n"
                        "2. **Match claims by topic and burden.** Compare theist and non-theist constructives and replies within the same topic, importance, and burden tier.\n"
                        "3. **Estimate the faith-source effect.** Test whether faith-sourced premises predict lower evidence and calibration after accounting for speaker and debate.\n"
                        "4. **Add human calibration.** Have trained human judges repeat the blind coding and dimension ratings on a stratified subset."
                    ),
                    "layout": "full",
                },
                {
                    "id": "further-questions",
                    "type": "markdown",
                    "body": (
                        "## Further questions\n\n"
                        "- Is the evidence gap concentrated in religious experience, resurrection history, morality, cosmology, or design arguments?\n"
                        "- Do a few recurring speakers account for particular weakness types even if they do not account for the overall gap?\n"
                        "- Are evidential standards applied symmetrically to testimony and historical claims on both sides?\n"
                        "- Would blind human raters reproduce the same logic, evidence, response, and calibration decomposition?"
                    ),
                    "layout": "full",
                },
                {
                    "id": "caveats-and-assumptions",
                    "type": "markdown",
                    "body": (
                        "## Caveats and assumptions\n\n"
                        "- The corpus is selected rather than randomly sampled; speakers and moves repeat and are not independent.\n"
                        "- The side classification describes the position argued in the scorecard, not private belief or sincerity.\n"
                        "- The theist side is `pro` in 149 of 169 debates. Role- and orientation-restricted checks reduce this concern but do not create random assignment.\n"
                        "- The calibration/charity dimension combines overclaiming with representational fairness, so its full-corpus 0.85-point contribution cannot be assigned wholly to substantiation.\n"
                        "- Closed calibration and response-class subfields cover 146 debates; the other 23 provide the same six final dimensions but not those subfields.\n"
                        "- These are AI-assisted, transcript-grounded judgments under a fixed rubric, not measurements of worldview truth or a speaker's character.\n"
                        "- Debate 191 was corrected so the intelligent-design side is the theist side; the corrected headline is 145–5–19 and 6.35 points."
                    ),
                    "layout": "full",
                    "sourceId": "diagnostic-results",
                },
            ],
        },
        "snapshot": {
            "version": 1,
            "generatedAt": generated_at,
            "status": "ready",
            "datasets": {
                "headline_metrics": [
                    {
                        "evidence_contribution": next(
                            row["score_gap_contribution"]
                            for row in dimensions
                            if row["dimension"] == "evidenceWarrant"
                        ),
                        "evidence_share": next(
                            row["share_of_official_gap"]
                            for row in dimensions
                            if row["dimension"] == "evidenceWarrant"
                        ),
                        "theist_below_70": evidence["theist"]["below_70_share"],
                        "non_theist_below_70": evidence["non_theist"]["below_70_share"],
                        "theist_overstated": legacy["calibration"]["theist"]["any_overstatement_share"],
                        "non_theist_overstated": legacy["calibration"]["non_theist"]["any_overstatement_share"],
                    }
                ],
                "dimension_contributions": dimensions,
                "evidence_comparison": evidence_rows,
                "structural_findings": structural_rows,
                "examples": example_rows,
            },
        },
        "sources": [
            source,
            {
                "id": "scoring-rubric",
                "label": "SLUGFESTER reassessment rubric",
                "path": "docs/reassessment-rubric-v4.0.md",
            },
            {
                "id": "corrected-taxonomy",
                "label": "Corrected position taxonomy",
                "path": "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv",
            },
        ],
    }

    with ARTIFACT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(ARTIFACT_PATH.relative_to(REPO_ROOT))
    return artifact


if __name__ == "__main__":
    build()
