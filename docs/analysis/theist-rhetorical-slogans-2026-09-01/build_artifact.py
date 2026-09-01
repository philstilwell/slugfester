#!/usr/bin/env python3
"""Build the canonical portable-report artifact from the executed analysis."""

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


def source_record(generated_at: str) -> dict:
    return {
        "id": "slogan-analysis-results",
        "label": "Executed slogan-risk corpus analysis",
        "path": "docs/analysis/theist-rhetorical-slogans-2026-09-01/results.json",
        "query": {
            "engine": "DuckDB",
            "language": "sql",
            "description": (
                "Join the corrected position taxonomy to every locked assessment ledger; "
                "construct the side-blind slogan-risk proxy; compute whole-debate clustered "
                "intervals, speaker-equal sensitivity, and restricted tag corroboration."
            ),
            "executed_at": generated_at,
            "filters": [
                "169 corrected theist/religious versus non-theist/skeptical debate assessments",
                "Primary diagnostic cohort restricted to 146 debates with closed calibration and precision findings",
                "Full-corpus evidence context uses all 169 debates",
                "Published fallacy/bias corroboration restricted to 59 relevant tag-bearing debates",
            ],
            "metric_definitions": [
                "Strict slogan-risk proxy = evidence/warrant below 70 AND materially or radically overstated force AND at least one unstable-term, unstable-scope, or missing/materially-misleading-qualification finding.",
                "Pooled share = flagged moves divided by all moves on the stated side and cohort.",
                "Paired difference = mean across debates of theist flagged share minus non-theist flagged share.",
                "Debate-cluster interval = 2.5th and 97.5th percentiles from 20,000 deterministic resamples of whole debate differences.",
                "Insulation tag cluster = argument from ignorance, special pleading, subjective validation, confirmation bias, or belief bias.",
            ],
            "tables_used": [
                "docs/analysis/theist-rhetorical-slogans-2026-09-01/results.json",
            ],
            "sql": "SELECT * FROM read_json_auto('docs/analysis/theist-rhetorical-slogans-2026-09-01/results.json')",
        },
    }


def chart(
    *,
    chart_id: str,
    title: str,
    subtitle: str,
    question: str,
    rationale: str,
    dataset: str,
    rows: int,
    grouped: bool,
    unit: str = "share of moves",
) -> dict:
    encodings = {
        "x": {"field": "metric", "type": "nominal", "label": "Diagnostic"},
        "y": {
            "field": "value",
            "type": "quantitative",
            "aggregate": "none",
            "format": "percent" if unit == "share of moves" else "number",
            "label": "Move share" if unit == "share of moves" else "Percentage-point difference",
        },
        "tooltip": [
            {"field": "count", "type": "quantitative", "format": "number", "label": "Flagged moves"},
            {"field": "moves", "type": "quantitative", "format": "number", "label": "Moves"},
            {"field": "coverage", "type": "nominal", "label": "Coverage"},
        ],
    }
    if grouped:
        encodings["color"] = {"field": "side", "type": "nominal", "label": "Side"}
    return {
        "id": chart_id,
        "title": title,
        "subtitle": subtitle,
        "showDescription": True,
        "intent": "comparison",
        "question": question,
        "rationale": rationale,
        "comparisonContext": {
            "denominator": "Moves in the named cohort",
            "grain": "one scored argumentative move",
            "normalization": "flagged moves divided by all moves on the stated side",
            "semanticFamily": "slogan-like epistemic-risk diagnostics",
            "unit": unit,
        },
        "type": "bar",
        "dataset": dataset,
        "sourceId": "slogan-analysis-results",
        "encodings": encodings,
        "yAxisTitle": "Move share" if unit == "share of moves" else "Percentage points",
        "valueFormat": "percent" if unit == "share of moves" else "number",
        "layout": "full",
        "maxRows": rows,
        "palette": {"kind": "categorical" if grouped else "sequential", "name": "blue-orange" if grouped else "blue"},
        "legend": {"interactive": False, "position": "bottom", "sort": "spec", "title": "Side"} if grouped else None,
        "labels": {"values": "all"},
        "settings": {
            "orientation": "horizontal",
            "groupMode": "grouped" if grouped else "single",
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


def build() -> dict:
    results = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    source = source_record(generated_at)
    primary = results["diagnostic_metrics"]["slogan_risk"]
    paired = results["paired_primary"]
    metrics = results["diagnostic_metrics"]
    tags = results["tag_corroboration"]

    metric_labels = [
        ("low_warrant", "Evidence below 70"),
        ("material_overclaim", "Material/radical overclaim"),
        ("compression_deficit", "Compression deficit"),
        ("missing_qualification", "Missing qualification"),
        ("slogan_risk", "Strict slogan-risk intersection"),
    ]
    component_rows = []
    for metric_id, label in metric_labels:
        for side_id, side_label in (("theist", "Theist"), ("non_theist", "Non-theist")):
            row = metrics[metric_id][side_id]
            component_rows.append(
                {
                    "metric": label,
                    "side": side_label,
                    "value": row["share"],
                    "count": row["count"],
                    "moves": row["moves"],
                    "coverage": "2,800 moves / 146 debates",
                }
            )

    robustness_rows = []
    for item in results["subset_checks"]:
        robustness_rows.append(
            {
                "metric": item["subset"],
                "side": "Theist minus non-theist",
                "value": item["difference_pp"],
                "count": item["paired"]["positive"],
                "moves": item["paired"]["n_debates"],
                "coverage": f"95% interval {100 * item['paired']['ci_95_low']:.1f} to {100 * item['paired']['ci_95_high']:.1f} pp",
                "ci_low": 100 * item["paired"]["ci_95_low"],
                "ci_high": 100 * item["paired"]["ci_95_high"],
            }
        )

    tag_rows = []
    for metric_id, label in (("tagged_moves", "Any published fallacy/bias tag"), ("insulation_moves", "Epistemic-insulation tag cluster")):
        for side_id, side_label in (("theist", "Theist"), ("non_theist", "Non-theist")):
            row = tags["pooled"][metric_id][side_id]
            tag_rows.append(
                {
                    "metric": label,
                    "side": side_label,
                    "value": row["share"],
                    "count": row["count"],
                    "moves": row["moves"],
                    "coverage": "1,412 moves / 59 tag-bearing debates",
                }
            )

    example_rows = []
    for group, group_label in (("theist_slogan_risk", "Theist example"), ("non_theist_slogan_risk", "Non-theist counterexample"), ("theist_counterexamples", "Theist high-quality counterexample")):
        for row in results["examples"][group]:
            example_rows.append(
                {
                    "group": group_label,
                    "pattern": row["pattern"],
                    "location": f"Debate {int(row['number'])}: {row['speaker']}",
                    "claim": row["proposition"],
                    "diagnosis": row["diagnostic"],
                    "falsifiability_problem": row["falsifiability_problem"],
                    "evidence": row["evidence_warrant"],
                }
            )

    charts = [
        chart(
            chart_id="component-chart",
            title="Slogan-risk components by side",
            subtitle="Closed evidence, calibration, and precision findings; 2,800 moves in 146 debates",
            question="Which diagnostic components and intersections differ between the two sides?",
            rationale="Five grouped horizontal comparisons show that the strict intersection is not produced by one permissive component threshold.",
            dataset="component_rates",
            rows=len(component_rows),
            grouped=True,
        ),
        chart(
            chart_id="robustness-chart",
            title="Slogan-risk difference across robustness checks",
            subtitle="Theist share minus non-theist share; percentage points, with 95% intervals retained in the source rows",
            question="Does the side difference remain under role, importance, orientation, and speaker checks?",
            rationale="Six ordered bars compare the magnitude of the same rate difference across prespecified sensitivity cuts.",
            dataset="robustness_rates",
            rows=len(robustness_rows),
            grouped=False,
            unit="percentage points",
        ),
        chart(
            chart_id="tag-chart",
            title="Published fallacy and bias tags by side",
            subtitle="Secondary evidence only; 1,412 moves in 59 relevant tag-bearing debates",
            question="Do published fallacy/bias annotations corroborate the primary diagnostic pattern?",
            rationale="Two grouped comparisons distinguish the broad tag rate from the narrower epistemic-insulation cluster.",
            dataset="tag_rates",
            rows=len(tag_rows),
            grouped=True,
        ),
    ]
    charts = [{key: value for key, value in item.items() if value is not None} for item in charts]

    artifact = {
        "surface": "report",
        "manifest": {
            "version": 1,
            "surface": "report",
            "title": "Are Theist Arguments More Often Slogan-Like?",
            "description": "A corpus test of rhetorical overclaiming, epistemic compression, and non-falsifiability risk in SLUGFESTER debates.",
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
                    "id": "theist-rate-card",
                    "description": "Share of theist moves meeting all three strict slogan-risk conditions.",
                    "dataset": "headline_metrics",
                    "sourceId": "slogan-analysis-results",
                    "metrics": [
                        {"label": "Theist slogan-risk share", "field": "theist_share", "format": "percent"},
                        {"label": "Non-theist comparison", "field": "non_theist_share", "format": "percent"},
                    ],
                },
                {
                    "id": "risk-ratio-card",
                    "description": "Pooled theist rate divided by pooled non-theist rate in the primary cohort.",
                    "dataset": "headline_metrics",
                    "sourceId": "slogan-analysis-results",
                    "metrics": [
                        {"label": "Relative rate", "field": "risk_ratio", "format": "number", "unit": "x"},
                        {"label": "Difference", "field": "difference_pp", "format": "number", "unit": "pp", "signed": True},
                    ],
                },
                {
                    "id": "paired-card",
                    "description": "Mean within-debate rate difference and its whole-debate clustered interval.",
                    "dataset": "headline_metrics",
                    "sourceId": "slogan-analysis-results",
                    "metrics": [
                        {"label": "Paired difference", "field": "paired_difference", "format": "percent", "signed": True},
                        {"label": "95% interval low", "field": "paired_ci_low", "format": "percent", "signed": True},
                        {"label": "95% interval high", "field": "paired_ci_high", "format": "percent", "signed": True},
                    ],
                },
            ],
            "charts": charts,
            "tables": [
                {
                    "id": "robustness-table",
                    "title": "Robustness checks with debate-cluster intervals",
                    "subtitle": "Positive values mean the theist side has the higher slogan-risk rate",
                    "showDescription": True,
                    "dataset": "robustness_rates",
                    "defaultSort": {"field": "value", "direction": "desc"},
                    "density": "spacious",
                    "sourceId": "slogan-analysis-results",
                    "layout": "full",
                    "columns": [
                        {"field": "metric", "label": "Cohort", "type": "text"},
                        {"field": "value", "label": "Difference (pp)", "type": "number", "format": "number"},
                        {"field": "ci_low", "label": "95% low", "type": "number", "format": "number"},
                        {"field": "ci_high", "label": "95% high", "type": "number", "format": "number"},
                        {"field": "moves", "label": "Debates", "type": "number", "format": "number"},
                    ],
                },
                {
                    "id": "examples-table",
                    "title": "Representative cases and counterexamples",
                    "subtitle": "Examples illustrate the coding logic; prevalence comes from the complete cohort, not these selected rows",
                    "showDescription": True,
                    "dataset": "examples",
                    "defaultSort": {"field": "evidence", "direction": "asc"},
                    "density": "spacious",
                    "sourceId": "slogan-analysis-results",
                    "layout": "full",
                    "columns": [
                        {"field": "group", "label": "Type", "type": "text"},
                        {"field": "pattern", "label": "Pattern", "type": "text"},
                        {"field": "location", "label": "Location", "type": "text"},
                        {"field": "claim", "label": "Claim", "type": "text"},
                        {"field": "diagnosis", "label": "Diagnosis", "type": "text"},
                        {"field": "falsifiability_problem", "label": "Falsifiability check", "type": "text"},
                        {"field": "evidence", "label": "Evidence", "type": "number", "format": "number"},
                    ],
                },
            ],
            "blocks": [
                {
                    "id": "title",
                    "type": "markdown",
                    "body": (
                        "# Are Theist Arguments More Often Slogan-Like?\n\n"
                        "**Report date:** September 1, 2026  \n"
                        "**Relevant debate assessments:** 169  \n"
                        "**Scored argumentative moves:** 3,502"
                    ),
                    "layout": "full",
                },
                {
                    "id": "technical-summary",
                    "type": "markdown",
                    "body": (
                        "## Technical summary\n\n"
                        f"**The operationalized hypothesis is strongly supported.** The strict slogan-risk proxy appears in **{pct(primary['theist']['share'])}** of theist moves and **{pct(primary['non_theist']['share'])}** of non-theist moves: a **{primary['difference_pp']:.1f}-percentage-point** difference and a **{primary['risk_ratio']:.2f}x** relative rate. The within-debate estimate is {pct(paired['estimate'])}, with a 95% debate-cluster interval of {pct(paired['ci_95_low'])} to {pct(paired['ci_95_high'])}.\n\n"
                        "The result supports a narrower claim than the wording of the original hypothesis. It establishes that low-support, materially overstated, imprecisely qualified moves are substantially more common on the theist side. It does **not** by itself establish literal catchphrase form, strict philosophical non-falsifiability, or emotional enforcement as the cause."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {"id": "headline", "type": "metric-strip", "cardIds": ["theist-rate-card", "risk-ratio-card", "paired-card"], "layout": "full"},
                {
                    "id": "definition",
                    "type": "markdown",
                    "body": (
                        "## The strict proxy tests argumentative function, not a word list\n\n"
                        "A move is flagged only when three independently recorded defects coincide: evidence/warrant below 70; materially or radically overstated force; and unstable terms, unstable scope, or a missing/materially misleading qualification. This intersection captures what a slogan does in argument—compresses a conclusion, projects more confidence than its support permits, and discourages the qualifications that would expose it to correction.\n\n"
                        "The definition is side-blind and uses locked rubric fields. It does not search for religious vocabulary, sentiment words, or familiar theological phrases."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {
                    "id": "component-finding",
                    "type": "markdown",
                    "body": (
                        "## Every component of slogan risk is elevated\n\n"
                        f"Theist moves are more often below 70 on warrant ({pct(metrics['low_warrant']['theist']['share'])} versus {pct(metrics['low_warrant']['non_theist']['share'])}), materially or radically overstated ({pct(metrics['material_overclaim']['theist']['share'])} versus {pct(metrics['material_overclaim']['non_theist']['share'])}), and compressed or unstable ({pct(metrics['compression_deficit']['theist']['share'])} versus {pct(metrics['compression_deficit']['non_theist']['share'])}). The strict intersection remains large at {pct(primary['theist']['share'])} versus {pct(primary['non_theist']['share'])}.\n\n"
                        "Because the composite requires all three conditions, the finding cannot be created by a single low threshold or by mere concision."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {"id": "component-chart-block", "type": "chart", "chartId": "component-chart", "layout": "full"},
                {
                    "id": "robustness-finding",
                    "type": "markdown",
                    "body": (
                        "## The difference survives the main burden and speaker checks\n\n"
                        "The direction remains positive in constructives, replies, load-bearing moves, and after excluding William Lane Craig and Matt Dillahunty, the most frequent speaker on each side. Equal weighting across speakers also leaves a large difference: 28.3% for theist speakers versus 9.2% for non-theist speakers.\n\n"
                        "The role-reversal subset points the same way, but only 15 closed-findings debates store the theist side as `con`; its 95% interval crosses zero. It is supportive directionally, not a decisive standalone control."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {"id": "robustness-chart-block", "type": "chart", "chartId": "robustness-chart", "layout": "full"},
                {"id": "robustness-table-block", "type": "table", "tableId": "robustness-table", "layout": "full"},
                {
                    "id": "tag-finding",
                    "type": "markdown",
                    "body": (
                        "## Published fallacy and bias tags corroborate the pattern\n\n"
                        f"In the 59 relevant debates with at least one published tag, {pct(tags['pooled']['tagged_moves']['theist']['share'])} of theist moves and {pct(tags['pooled']['tagged_moves']['non_theist']['share'])} of non-theist moves carry a fallacy or bias tag. The narrower epistemic-insulation cluster—argument from ignorance, special pleading, subjective validation, confirmation bias, or belief bias—appears in {pct(tags['pooled']['insulation_moves']['theist']['share'])} versus {pct(tags['pooled']['insulation_moves']['non_theist']['share'])}.\n\n"
                        "This is secondary corroboration, not a full-corpus estimate, because published tag coverage is incomplete."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {"id": "tag-chart-block", "type": "chart", "chartId": "tag-chart", "layout": "full"},
                {
                    "id": "examples-finding",
                    "type": "markdown",
                    "body": (
                        "## Concrete examples of unfalsifiable slogan proffering\n\n"
                        f"John Lennox supplies several clear cases: {results['speaker_case_studies']['John Lennox']['flagged']} of his {results['speaker_case_studies']['John Lennox']['moves']} closed-field moves meet the same strict slogan-risk rule. Selected examples make miracle rejection evidence of prior bias, derive infinite worth from untestable createdness, or use postmortem compensation to absorb any present suffering. Other cases turn personal manifestation into public proof, explain disagreement as moral avoidance, invoke unknown divine reasons against counterevidence, treat unanswered questions as support for revelation, or convert a natural explanatory gap into positive agency evidence.\n\n"
                        "The falsifiability-check column states exactly what disconfirming route is absent. The table also includes non-theist moves meeting the same rule and high-quality theist counterexamples. The claim is a difference in frequency, not an essential property of either worldview."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {"id": "examples-table-block", "type": "table", "tableId": "examples-table", "layout": "full"},
                {
                    "id": "mechanism",
                    "type": "markdown",
                    "body": (
                        "## Emotional affirmation is a plausible mechanism, not a measured cause\n\n"
                        "The observed pattern is consistent with a mechanism in which identity, hope, personal experience, inherited authority, and moralized descriptions of unbelief reduce pressure to name disconfirming conditions. Such devices can make a proposition feel settled before its public evidential burden is complete.\n\n"
                        "But the ledgers score argumentative performance; they do not measure audience emotion, social enforcement, private conviction, or persuasion psychology. The mechanism is therefore an inference suggested by the cases and component pattern, not a direct result of this dataset."
                    ),
                    "layout": "full",
                },
                {
                    "id": "method",
                    "type": "markdown",
                    "body": (
                        "## Scope and method\n\n"
                        "The corrected population contains 169 relevant debates and 3,502 scored moves. The primary test uses the 2,800 moves in 146 debates that expose closed evidence, calibration, and precision findings. Side labels come from the corrected position taxonomy, not from whether the public data store calls a side `pro` or `con`.\n\n"
                        "Pooled rates provide the descriptive magnitude. The main uncertainty check first calculates a paired theist-minus-non-theist rate inside each debate and then resamples whole debates 20,000 times. Speaker-equal means and prespecified role, importance, orientation, and speaker-exclusion cuts test concentration and burden alternatives."
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
                },
                {
                    "id": "limitations",
                    "type": "markdown",
                    "body": (
                        "## What could change the conclusion\n\n"
                        "- The corpus is curated, not a random sample of all theist and non-theist debates.\n"
                        "- Speakers repeat and topics are not randomly assigned. Whole-debate and speaker checks reduce but do not eliminate that concern.\n"
                        "- The strict proxy has strong face validity for slogan-like overclaiming, but construct validity for literal slogans and non-falsifiability remains incomplete.\n"
                        "- The rubric judgments are AI-assisted and should be replicated by human coders blinded to side.\n"
                        "- Published fallacy/bias tags cover only 59 relevant debates and are secondary evidence.\n"
                        "- The result describes positions argued in scorecards, not a person's intelligence, sincerity, or private faith."
                    ),
                    "layout": "full",
                },
                {
                    "id": "next-test",
                    "type": "markdown",
                    "body": (
                        "## A direct falsification test\n\n"
                        "1. Blind trained coders to speaker and side and give them the original transcript span.\n"
                        "2. Code separately whether the wording is formulaic or slogan-like, whether a possible disconfirmation condition is stated, whether contrary outcomes can be absorbed without revision, and whether force exceeds public warrant.\n"
                        "3. Match moves by topic, constructive/reply role, importance, and burden.\n"
                        "4. Model repeated speakers and debates explicitly.\n"
                        "5. Weaken or reject the hypothesis if the side difference disappears under those controls."
                    ),
                    "layout": "full",
                },
                {
                    "id": "further-questions",
                    "type": "markdown",
                    "body": (
                        "## Further questions\n\n"
                        "- Is slogan risk concentrated in religious experience, morality, resurrection, cosmology, or design?\n"
                        "- Do particular apologetic traditions differ after topic and speaker controls?\n"
                        "- Does the same speaker's profile change between religious and nonreligious claims?\n"
                        "- Do blinded human raters reproduce the 3.62x relative rate?"
                    ),
                    "layout": "full",
                },
                {
                    "id": "conclusion",
                    "type": "markdown",
                    "body": (
                        "## Conclusion: the empirical core is strong; the psychological story remains open\n\n"
                        "The SLUGFESTER record strongly supports the claim that theist-side arguments more often function like slogans: they combine weak public warrant, force that outruns that warrant, and compressed or unstable qualification at more than three and a half times the non-theist rate. The pattern is broad, survives the main controls, and is corroborated by the partial fallacy/bias annotations.\n\n"
                        "The report should not pretend that this proves every flagged move is literally unfalsifiable or that emotional affirmation caused it. What the data establish is the epistemic profile that such rhetoric would predict. The next decisive step is blind human coding of literal slogan form and disconfirmation conditions. Until then, the most defensible verdict is: **strong support for more slogan-like overclaiming on the theist side; provisional support for the fuller non-falsifiability hypothesis; no direct proof yet of emotional enforcement as the cause.**"
                    ),
                    "layout": "full",
                    "sourceId": "slogan-analysis-results",
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
                        "theist_share": primary["theist"]["share"],
                        "non_theist_share": primary["non_theist"]["share"],
                        "risk_ratio": primary["risk_ratio"],
                        "difference_pp": primary["difference_pp"],
                        "paired_difference": paired["estimate"],
                        "paired_ci_low": paired["ci_95_low"],
                        "paired_ci_high": paired["ci_95_high"],
                    }
                ],
                "component_rates": component_rows,
                "robustness_rates": robustness_rows,
                "tag_rates": tag_rows,
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
    ARTIFACT_PATH.write_text(
        json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(ARTIFACT_PATH.relative_to(REPO_ROOT))
    return artifact


if __name__ == "__main__":
    build()
