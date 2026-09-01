#!/usr/bin/env python3
"""Build the reader-facing notebook companion with notebook-safe tooling."""

from __future__ import annotations

import json
from pathlib import Path


ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
NOTEBOOK_PATH = ANALYSIS_DIR / "analysis.ipynb"


def markdown(source: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source.splitlines(keepends=True),
    }


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


def build() -> Path:
    results = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    primary = results["diagnostic_metrics"]["slogan_risk"]
    paired = results["paired_primary"]
    tags = results["tag_corroboration"]

    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {"name": "python", "version": "3"},
        },
        "cells": [
        markdown(
            "# Are Theist Arguments More Often Slogan-Like?\n\n"
            "A reproducible companion to the September 1, 2026 SLUGFESTER corpus report."
        ),
        markdown(
            "## tl;dr\n\n"
            f"- The strict slogan-risk proxy flags **{primary['theist']['share']:.1%}** of theist moves and **{primary['non_theist']['share']:.1%}** of non-theist moves in the 2,800-move closed-findings cohort.\n"
            f"- The pooled difference is **{primary['difference_pp']:.1f} percentage points** and the risk ratio is **{primary['risk_ratio']:.2f}x**.\n"
            f"- The whole-debate paired estimate is **{paired['estimate']:.1%}**, with a 95% debate-cluster bootstrap interval of **{paired['ci_95_low']:.1%} to {paired['ci_95_high']:.1%}**.\n"
            "- The result supports the operationalized low-warrant/high-force/compression pattern. Literal non-falsifiability and emotional enforcement remain hypotheses requiring direct blinded coding."
        ),
        markdown(
            "## Context & Methods\n\n"
            "The population is the corrected 169-debate theist/religious versus non-theist/skeptical comparison. The primary cohort is the 146 debates whose ledgers expose closed evidence, calibration, and precision findings. A move is flagged only when evidence/warrant is below 70, force is materially or radically overstated, and terms, scope, or qualification are compressed or unstable.\n\n"
            "### Key Assumptions\n\n"
            "- The fixed rubric fields are meaningful indicators of public argumentative support.\n"
            "- The proxy captures slogan-like argumentative function, not literal catchphrase form.\n"
            "- Whole-debate resampling is more honest than treating 2,800 nested moves as independent trials."
        ),
        markdown("## Data"),
        code(
            "from pathlib import Path\n"
            "import importlib.util\n"
            "import json\n"
            "\n"
            "analysis_dir = Path.cwd()\n"
            "if analysis_dir.name != 'theist-rhetorical-slogans-2026-09-01':\n"
            "    analysis_dir = Path('docs/analysis/theist-rhetorical-slogans-2026-09-01').resolve()\n"
            "spec = importlib.util.spec_from_file_location('slogan_analysis', analysis_dir / 'analysis.py')\n"
            "module = importlib.util.module_from_spec(spec)\n"
            "spec.loader.exec_module(module)\n"
            "results = module.run_analysis()\n"
            "results['data_quality']"
        ),
        markdown("## Results"),
        code(
            "primary = results['diagnostic_metrics']['slogan_risk']\n"
            "{\n"
            "    'theist': f\"{primary['theist']['count']}/{primary['theist']['moves']} ({primary['theist']['share']:.1%})\",\n"
            "    'non_theist': f\"{primary['non_theist']['count']}/{primary['non_theist']['moves']} ({primary['non_theist']['share']:.1%})\",\n"
            "    'difference_pp': round(primary['difference_pp'], 1),\n"
            "    'risk_ratio': round(primary['risk_ratio'], 2),\n"
            "}"
        ),
        code(
            "results['paired_primary']"
        ),
        code(
            "[\n"
            "    {\n"
            "        'subset': row['subset'],\n"
            "        'difference_pp': round(row['difference_pp'], 1),\n"
            "        'ci_low_pp': round(100 * row['paired']['ci_95_low'], 1),\n"
            "        'ci_high_pp': round(100 * row['paired']['ci_95_high'], 1),\n"
            "        'debates': row['paired']['n_debates'],\n"
            "    }\n"
            "    for row in results['subset_checks']\n"
            "]"
        ),
        code(
            "results['tag_corroboration']['coverage'], results['tag_corroboration']['pooled']"
        ),
        markdown(
            "## Takeaways\n\n"
            f"The primary result is large and internally consistent: {primary['theist']['count']} theist moves and {primary['non_theist']['count']} non-theist moves meet the same strict three-part rule. The paired interval excludes zero in the main cohort, and the direction survives the main role, importance, and speaker checks.\n\n"
            f"The secondary tag cohort also points the same way: epistemic-insulation tags occur in {tags['pooled']['insulation_moves']['theist']['share']:.1%} of theist moves and {tags['pooled']['insulation_moves']['non_theist']['share']:.1%} of non-theist moves, but only across {tags['coverage']['debates']} tag-bearing debates.\n\n"
            "The shareable conclusion is therefore qualified: the data strongly support a greater rate of slogan-like overclaiming on the theist side, while direct claims about literal non-falsifiability or emotional enforcement still need blinded human coding."
        ),
        ],
    }
    NOTEBOOK_PATH.write_text(
        json.dumps(notebook, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(NOTEBOOK_PATH)
    return NOTEBOOK_PATH


if __name__ == "__main__":
    build()
