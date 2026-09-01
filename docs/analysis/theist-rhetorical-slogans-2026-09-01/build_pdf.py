#!/usr/bin/env python3
"""Build the comprehensive embedded-font PDF for the slogan-risk hypothesis."""

from __future__ import annotations

import html
import importlib.util
import json
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Rect
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
OUTPUT_PATH = REPO_ROOT / "output/pdf/are-theist-arguments-more-often-slogan-like.pdf"

BASE_PDF_PATH = (
    REPO_ROOT
    / "docs/analysis/theist-argument-weaknesses-2026-09-01/build_pdf.py"
)
SPEC = importlib.util.spec_from_file_location("slugfester_pdf_base", BASE_PDF_PATH)
BASE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BASE)


def clean(text: str) -> str:
    return (
        str(text)
        .replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
    )


def para(text: str, style) -> Paragraph:
    return Paragraph(clean(text), style)


def escaped(text: str) -> str:
    return html.escape(clean(str(text)), quote=False)


def bullet(text: str, st: dict) -> Paragraph:
    return para(f"- {text}", st["bullet"])


def section(title: str, st: dict) -> list:
    return [BASE.SectionRule(BASE.CONTENT_W), para(title, st["h1"])]


def metric_grid(results: dict, st: dict) -> Table:
    primary = results["diagnostic_metrics"]["slogan_risk"]
    paired = results["paired_primary"]
    cells = [
        [
            BASE.metric_card(f"{primary['theist']['share']:.1%}", "theist moves meeting the strict slogan-risk rule", st),
            BASE.metric_card(f"{primary['non_theist']['share']:.1%}", "non-theist moves meeting the same rule", st),
        ],
        [
            BASE.metric_card(f"{primary['risk_ratio']:.2f}x", "pooled theist-to-non-theist relative rate", st),
            BASE.metric_card(
                f"{100 * paired['estimate']:.1f} points",
                "mean within-debate difference<br/>(95% interval 16.3 to 25.0)",
                st,
            ),
        ],
    ]
    table = Table(
        cells,
        colWidths=[BASE.CONTENT_W / 2 - 5, BASE.CONTENT_W / 2 - 5],
        rowHeights=[0.80 * inch, 0.80 * inch],
        hAlign="CENTER",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BASE.PAPER),
                ("BOX", (0, 0), (-1, -1), 0.5, BASE.RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BASE.RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def title_and_legend(d: Drawing, title: str, subtitle: str, *, grouped: bool = True) -> None:
    BASE.chart_label(d, clean(title), 0, d.height - 16, size=9.3, bold=True, color=BASE.NAVY)
    BASE.chart_label(d, clean(subtitle), 0, d.height - 30, size=6.9, color=BASE.MUTED)
    if grouped:
        x = d.width - 170
        d.add(Rect(x, d.height - 25, 9, 9, fillColor=BASE.RUST, strokeColor=None))
        BASE.chart_label(d, "Theist", x + 13, d.height - 23, size=7.0)
        d.add(Rect(x + 76, d.height - 25, 9, 9, fillColor=BASE.BLUE, strokeColor=None))
        BASE.chart_label(d, "Non-theist", x + 89, d.height - 23, size=7.0)


def primary_chart(results: dict) -> Drawing:
    primary = results["diagnostic_metrics"]["slogan_risk"]
    width, height = BASE.CONTENT_W, 205
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    title_and_legend(
        d,
        "Strict slogan-risk share by side",
        "2,800 scored moves in 146 debates; bars start at zero",
    )
    bar_x, bar_w = 74, width - 130
    axis_y, max_value = 40, 0.35
    for tick in (0, 0.1, 0.2, 0.3):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, axis_y, x, height - 48, strokeColor=BASE.RULE, strokeWidth=0.45))
        BASE.chart_label(d, f"{tick:.0%}", x, 25, size=6.8, color=BASE.MUTED, anchor="middle")
    rows = [
        ("Theist", primary["theist"]["share"], BASE.RUST, primary["theist"]["count"], primary["theist"]["moves"]),
        ("Non-theist", primary["non_theist"]["share"], BASE.BLUE, primary["non_theist"]["count"], primary["non_theist"]["moves"]),
    ]
    for index, (label, value, color, count, moves) in enumerate(rows):
        y = 125 - index * 50
        BASE.chart_label(d, label, bar_x - 12, y + 2, size=8.1, color=BASE.INK, anchor="end", bold=True)
        d.add(Rect(bar_x, y - 7, value / max_value * bar_w, 20, fillColor=color, strokeColor=None))
        BASE.chart_label(d, f"{value:.1%}", bar_x + value / max_value * bar_w + 7, y, size=8.0, color=BASE.NAVY, bold=True)
        BASE.chart_label(d, f"{count} of {moves} moves", bar_x, y - 18, size=6.6, color=BASE.MUTED)
    return d


def component_chart(results: dict) -> Drawing:
    metrics = results["diagnostic_metrics"]
    items = [
        ("Evidence below 70", "low_warrant"),
        ("Material/radical overclaim", "material_overclaim"),
        ("Compression deficit", "compression_deficit"),
        ("Missing qualification", "missing_qualification"),
        ("Strict slogan-risk intersection", "slogan_risk"),
    ]
    width, height = BASE.CONTENT_W, 260
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    title_and_legend(
        d,
        "Component diagnostics and strict intersection",
        "Share of moves in the 146-debate closed-findings cohort",
    )
    label_x, bar_x, bar_w = 160, 172, width - 210
    top, row_h, max_value = 195, 33, 0.65
    for tick in (0, 0.2, 0.4, 0.6):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, 18, x, top + 12, strokeColor=BASE.RULE, strokeWidth=0.4))
        BASE.chart_label(d, f"{tick:.0%}", x, 7, size=6.7, color=BASE.MUTED, anchor="middle")
    for index, (label, key) in enumerate(items):
        y = top - index * row_h
        theist = metrics[key]["theist"]["share"]
        non = metrics[key]["non_theist"]["share"]
        BASE.chart_label(d, label, label_x, y + 1, size=7.4, anchor="end")
        d.add(Rect(bar_x, y + 2, theist / max_value * bar_w, 8, fillColor=BASE.RUST, strokeColor=None))
        d.add(Rect(bar_x, y - 9, non / max_value * bar_w, 8, fillColor=BASE.BLUE, strokeColor=None))
        BASE.chart_label(d, f"{theist:.1%}", bar_x + theist / max_value * bar_w + 4, y + 3, size=6.5, color=BASE.RUST, bold=True)
        BASE.chart_label(d, f"{non:.1%}", bar_x + non / max_value * bar_w + 4, y - 8, size=6.5, color=BASE.BLUE_DARK, bold=True)
    return d


def robustness_chart(results: dict) -> Drawing:
    rows = results["subset_checks"]
    short = {
        "All closed-findings moves": "All moves",
        "Constructive moves": "Constructives",
        "Replies": "Replies",
        "Load-bearing moves": "Load-bearing",
        "Debates with theist side stored as con": "Theist stored as con",
        "Excluding the most frequent speaker on each side": "Exclude top speaker / side",
    }
    width, height = BASE.CONTENT_W, 275
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    title_and_legend(
        d,
        "Whole-debate robustness intervals",
        "Theist minus non-theist slogan-risk rate, percentage points; 95% clustered intervals",
        grouped=False,
    )
    label_x, plot_x, plot_w = 155, 168, width - 205
    x_min, x_max = -10, 40
    top, row_h = 210, 30
    for tick in (-10, 0, 10, 20, 30, 40):
        x = plot_x + (tick - x_min) / (x_max - x_min) * plot_w
        d.add(Line(x, 19, x, top + 12, strokeColor=BASE.INK if tick == 0 else BASE.RULE, strokeWidth=1.0 if tick == 0 else 0.4))
        BASE.chart_label(d, f"{tick:+d}", x, 7, size=6.7, color=BASE.MUTED, anchor="middle")
    for index, row in enumerate(rows):
        y = top - index * row_h
        estimate = row["difference_pp"]
        low = 100 * row["paired"]["ci_95_low"]
        high = 100 * row["paired"]["ci_95_high"]
        x_low = plot_x + (low - x_min) / (x_max - x_min) * plot_w
        x_high = plot_x + (high - x_min) / (x_max - x_min) * plot_w
        x_est = plot_x + (estimate - x_min) / (x_max - x_min) * plot_w
        BASE.chart_label(d, short[row["subset"]], label_x, y, size=7.2, anchor="end")
        d.add(Line(x_low, y, x_high, y, strokeColor=BASE.RUST, strokeWidth=2.2))
        d.add(Line(x_low, y - 4, x_low, y + 4, strokeColor=BASE.RUST, strokeWidth=1.0))
        d.add(Line(x_high, y - 4, x_high, y + 4, strokeColor=BASE.RUST, strokeWidth=1.0))
        d.add(Rect(x_est - 3.5, y - 3.5, 7, 7, fillColor=BASE.RUST, strokeColor=BASE.RUST_DARK if hasattr(BASE, "RUST_DARK") else BASE.RUST))
        BASE.chart_label(d, f"{estimate:.1f}", x_high + 5, y - 2, size=6.6, color=BASE.NAVY, bold=True)
        BASE.chart_label(d, f"n={row['paired']['n_debates']}", plot_x + plot_w, y - 11, size=6.0, color=BASE.MUTED, anchor="end")
    return d


def tag_chart(results: dict) -> Drawing:
    tags = results["tag_corroboration"]["pooled"]
    items = [
        ("Any published fallacy/bias tag", tags["tagged_moves"]),
        ("Epistemic-insulation tag cluster", tags["insulation_moves"]),
    ]
    width, height = BASE.CONTENT_W, 205
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    title_and_legend(
        d,
        "Published fallacy and bias tag rates",
        "Secondary cohort: 1,412 moves in 59 relevant tag-bearing debates",
    )
    label_x, bar_x, bar_w = 172, 184, width - 220
    top, row_h, max_value = 127, 53, 0.26
    for tick in (0, 0.1, 0.2):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, 18, x, top + 12, strokeColor=BASE.RULE, strokeWidth=0.4))
        BASE.chart_label(d, f"{tick:.0%}", x, 7, size=6.7, color=BASE.MUTED, anchor="middle")
    for index, (label, metric) in enumerate(items):
        y = top - index * row_h
        theist = metric["theist"]["share"]
        non = metric["non_theist"]["share"]
        BASE.chart_label(d, label, label_x, y + 1, size=7.4, anchor="end")
        d.add(Rect(bar_x, y + 2, theist / max_value * bar_w, 9, fillColor=BASE.RUST, strokeColor=None))
        d.add(Rect(bar_x, y - 10, non / max_value * bar_w, 9, fillColor=BASE.BLUE, strokeColor=None))
        BASE.chart_label(d, f"{theist:.1%}", bar_x + theist / max_value * bar_w + 5, y + 3, size=6.8, color=BASE.RUST, bold=True)
        BASE.chart_label(d, f"{non:.1%}", bar_x + non / max_value * bar_w + 5, y - 9, size=6.8, color=BASE.BLUE_DARK, bold=True)
    return d


def speaker_chart(results: dict) -> Drawing:
    primary = results["diagnostic_metrics"]["slogan_risk"]
    speakers = results["speaker_equal_weight"]
    items = [
        ("Pooled move rate", primary["theist"]["share"], primary["non_theist"]["share"]),
        ("Equal weight per speaker", speakers["theist"]["equal_weight_mean"], speakers["non_theist"]["equal_weight_mean"]),
    ]
    width, height = BASE.CONTENT_W, 205
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    title_and_legend(d, "Pooled and speaker-equal estimates", "Bars begin at zero; axis ends at 35%")
    label_x, bar_x, bar_w = 150, 162, width - 198
    top, row_h, max_value = 126, 56, 0.35
    for tick in (0, 0.1, 0.2, 0.3):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, 22, x, top + 13, strokeColor=BASE.RULE, strokeWidth=0.4))
        BASE.chart_label(d, f"{tick:.0%}", x, 11, size=6.7, color=BASE.MUTED, anchor="middle")
    for index, (label, theist, non) in enumerate(items):
        y = top - index * row_h
        BASE.chart_label(d, label, label_x, y + 1, size=7.4, anchor="end")
        d.add(Rect(bar_x, y + 2, theist / max_value * bar_w, 9, fillColor=BASE.RUST, strokeColor=None))
        d.add(Rect(bar_x, y - 10, non / max_value * bar_w, 9, fillColor=BASE.BLUE, strokeColor=None))
        BASE.chart_label(d, f"{theist:.1%}", bar_x + theist / max_value * bar_w + 5, y + 3, size=6.8, color=BASE.RUST, bold=True)
        BASE.chart_label(d, f"{non:.1%}", bar_x + non / max_value * bar_w + 5, y - 9, size=6.8, color=BASE.BLUE_DARK, bold=True)
    BASE.chart_label(
        d,
        "Speaker-equal means: 78 theist-side speakers and 44 non-theist-side speakers.",
        0,
        1,
        size=6.7,
        color=BASE.MUTED,
    )
    return d


def mechanism_chart() -> Drawing:
    width, height = BASE.CONTENT_W, 132
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=BASE.WHITE, strokeColor=None))
    BASE.chart_label(d, "The proposed emotional-affirmation mechanism", 0, height - 15, size=9.2, bold=True, color=BASE.NAVY)
    boxes = [
        ("Identity, hope,\nexperience, authority", BASE.RUST_LIGHT, BASE.RUST),
        ("Felt settlement\nbefore public testing", colors.HexColor("#F8EED4"), BASE.GOLD),
        ("Fewer disconfirming\nconditions and caveats", BASE.TEAL_LIGHT, BASE.TEAL),
        ("Low warrant + high force\n+ compressed scope", BASE.BLUE_LIGHT, BASE.BLUE),
    ]
    gap = 15
    box_w = (width - 3 * gap) / 4
    y, box_h = 42, 56
    for index, (label, fill, stroke) in enumerate(boxes):
        x = index * (box_w + gap)
        d.add(Rect(x, y, box_w, box_h, rx=4, ry=4, fillColor=fill, strokeColor=stroke, strokeWidth=0.8))
        for line_index, line in enumerate(label.split("\n")):
            BASE.chart_label(d, line, x + box_w / 2, y + 33 - line_index * 13, size=7.2, color=BASE.NAVY, anchor="middle", bold=True)
        if index < len(boxes) - 1:
            start = x + box_w + 2
            end = x + box_w + gap - 4
            middle = y + box_h / 2
            d.add(Line(start, middle, end, middle, strokeColor=BASE.MUTED, strokeWidth=1.2))
            d.add(Line(end - 4, middle + 3, end, middle, strokeColor=BASE.MUTED, strokeWidth=1.2))
            d.add(Line(end - 4, middle - 3, end, middle, strokeColor=BASE.MUTED, strokeWidth=1.2))
    BASE.chart_label(d, "Only the final box is directly measured by the primary proxy; the preceding links are the causal interpretation to be tested.", 0, 16, size=6.7, color=BASE.MUTED)
    return d


def data_table(headers: list[str], rows: list[list], widths: list[float], st: dict) -> Table:
    safe_rows = [[escaped(value) for value in row] for row in rows]
    return BASE.data_table(headers, safe_rows, widths, st)


def example_card(row: dict, st: dict, *, accent=BASE.RUST) -> Table:
    meta = (
        f"Debate {int(row['number'])} | {escaped(row['speaker'])} | "
        f"Evidence {row['evidence_warrant']} | {escaped(row['warrant_fit'])}"
    )
    content = [
        para(escaped(row["pattern"]), st["case_title"]),
        para(meta, st["case_meta"]),
        para(f"<b>Claim:</b> {escaped(row['proposition'])}", st["body_small"]),
        para(f"<b>Slogan function:</b> {escaped(row['diagnostic'])}", st["body_small"]),
        para(f"<b>Falsifiability problem:</b> {escaped(row['falsifiability_problem'])}", st["body_small"]),
    ]
    table = Table([[content]], colWidths=[BASE.CONTENT_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BASE.PAPER),
                ("BOX", (0, 0), (-1, -1), 0.55, BASE.RULE),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def page_chrome(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("SLUGSans", 7.3)
    canvas.setFillColor(BASE.MUTED)
    if doc.page > 1:
        canvas.drawString(BASE.LEFT, BASE.PAGE_H - 0.37 * inch, "ARE THEIST ARGUMENTS MORE OFTEN SLOGAN-LIKE?")
        canvas.setStrokeColor(BASE.RULE)
        canvas.setLineWidth(0.5)
        canvas.line(BASE.LEFT, BASE.PAGE_H - 0.44 * inch, BASE.PAGE_W - BASE.RIGHT, BASE.PAGE_H - 0.44 * inch)
    canvas.setStrokeColor(BASE.RULE)
    canvas.line(BASE.LEFT, 0.43 * inch, BASE.PAGE_W - BASE.RIGHT, 0.43 * inch)
    canvas.drawString(BASE.LEFT, 0.25 * inch, "SLUGFESTER | Rhetorical slogan-risk hypothesis")
    canvas.drawRightString(BASE.PAGE_W - BASE.RIGHT, 0.25 * inch, f"{doc.page}")
    canvas.restoreState()


def build_story(results: dict, st: dict) -> list:
    primary = results["diagnostic_metrics"]["slogan_risk"]
    paired = results["paired_primary"]
    metrics = results["diagnostic_metrics"]
    tags = results["tag_corroboration"]
    story: list = []

    story.extend(
        [
            Spacer(1, 0.26 * inch),
            para("SLUGFESTER CORPUS DIAGNOSTIC", st["cover_kicker"]),
            para("Are Theist Arguments More Often Slogan-Like?", st["cover_title"]),
            para("Testing Rhetorical Overclaiming, Epistemic Compression, and Non-Falsifiability Risk", st["cover_subtitle"]),
            para("Report date: September 1, 2026 | Relevant debate assessments: 169 | Scored moves: 3,502", st["cover_meta"]),
            BASE.SectionRule(BASE.CONTENT_W, color=BASE.RUST, thickness=3.5),
            Spacer(1, 0.08 * inch),
            BASE.callout(
                "Hypothesis tested",
                "The theist side will contain more rhetorical, non-falsifiable slogans than the non-theist side because faith is often reinforced through emotionally settling affirmations rather than publicly testable argument.",
                st,
                background=BASE.RUST_LIGHT,
                accent=BASE.RUST,
            ),
            Spacer(1, 0.16 * inch),
            metric_grid(results, st),
            Spacer(1, 0.16 * inch),
            para(
                "Verdict: the data strongly support the operationalized claim that theist-side moves more often function like slogans by combining weak public warrant, substantially overstated force, and compressed or unstable qualification. The data only provisionally support literal non-falsifiability, and they do not directly prove that emotional enforcement caused the pattern.",
                st["cover_abstract"],
            ),
            para(
                "This report separates those three levels - measured pattern, philosophical interpretation, and psychological cause - so a strong result is not inflated into a stronger conclusion than the corpus can bear.",
                st["cover_abstract"],
            ),
            Spacer(1, 0.08 * inch),
            para("Prepared from the locked SLUGFESTER assessment ledgers and corrected position taxonomy.", st["caption"]),
            PageBreak(),
        ]
    )

    story.extend(section("1. Technical summary", st))
    story.append(
        BASE.callout(
            "Direct result",
            f"The strict slogan-risk proxy flags {primary['theist']['count']} of {primary['theist']['moves']} theist moves ({primary['theist']['share']:.1%}) and {primary['non_theist']['count']} of {primary['non_theist']['moves']} non-theist moves ({primary['non_theist']['share']:.1%}). The pooled relative rate is {primary['risk_ratio']:.2f}x.",
            st,
            background=BASE.TEAL_LIGHT,
            accent=BASE.TEAL,
        )
    )
    story.append(Spacer(1, 8))
    for text in [
        f"<b>Magnitude:</b> the pooled difference is {primary['difference_pp']:.1f} percentage points. The mean paired difference inside debates is {100 * paired['estimate']:.1f} points.",
        f"<b>Uncertainty:</b> the 95% whole-debate bootstrap interval runs from {100 * paired['ci_95_low']:.1f} to {100 * paired['ci_95_high']:.1f} points. The hypothesis direction appears in {paired['positive']} debates, with {paired['ties']} ties and {paired['negative']} reversals.",
        "<b>Robustness:</b> the result persists in constructives, replies, load-bearing moves, equal-speaker weighting, and after removing the most frequent speaker on each side.",
        "<b>Boundary:</b> the result establishes slogan-like overclaiming. Literal slogan form, strict non-falsifiability, and emotional enforcement require direct coding not present in the locked rubric.",
    ]:
        story.append(bullet(text, st))
    story.append(Spacer(1, 7))
    story.append(primary_chart(results))
    story.append(para("Figure 1. The primary three-part intersection uses identical thresholds on both sides. A move must be weakly warranted, materially overstated, and imprecisely compressed to count.", st["caption"]))
    story.append(PageBreak())

    story.extend(section("2. What counts as slogan-like argument", st))
    story.append(para(
        "A slogan is not merely a short sentence. In debate, a slogan functions as a compact conclusion that carries emotional or identity-laden certainty while omitting the evidential and inferential work needed to expose the claim to correction. A concise argument can be excellent, and a long speech can be sloganistic. Word count is therefore a poor primary measure.",
        st["body"],
    ))
    story.append(para(
        "The analysis instead uses three locked dimensions that describe argumentative function. Evidence/warrant below 70 means assertion, anecdote, authority, selective examples, or speculation carries substantial weight. Material or radical overstatement means the claim's stated strength substantially exceeds that support. A compression defect means terms or scope are unstable or a needed qualification is missing or misleading.",
        st["body"],
    ))
    definition_rows = [
        ["Low warrant", "Evidence/warrant below 70", "The claim lacks enough public support or rival comparison"],
        ["High force", "Materially or radically overstated", "The conclusion is presented more strongly than the support permits"],
        ["Compression", "Unstable term/scope or missing qualification", "Language suppresses a boundary needed to test or interpret the claim"],
        ["Strict slogan risk", "All three conditions together", "A compressed high-force conclusion does work its warrant has not earned"],
    ]
    story.append(data_table(["Component", "Locked rule", "Argumentative meaning"], definition_rows, [1.18 * inch, 2.0 * inch, 2.98 * inch], st))
    story.append(Spacer(1, 8))
    story.append(
        BASE.callout(
            "Why the definition is conservative",
            "A move with poor evidence alone is not labeled slogan-like. A move with bold language alone is not labeled slogan-like. A move with an imprecise term alone is not labeled slogan-like. The flag requires the conjunction of weak support, excess force, and compression.",
            st,
            background=BASE.BLUE_LIGHT,
            accent=BASE.BLUE,
        )
    )
    story.append(Spacer(1, 9))
    story.append(para(
        "This makes the result harder to obtain and easier to interpret. It also avoids building religious vocabulary into the measure. The rule does not search for God, faith, revelation, hope, love, naturalism, science, or atheism. It reads the evaluator's closed judgments about support, force, and precision before applying the side label.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("3. Every component is elevated on the theist side", st))
    story.append(para(
        f"Theist moves are more often weakly warranted ({metrics['low_warrant']['theist']['share']:.1%} versus {metrics['low_warrant']['non_theist']['share']:.1%}), materially or radically overstated ({metrics['material_overclaim']['theist']['share']:.1%} versus {metrics['material_overclaim']['non_theist']['share']:.1%}), and compressed or unstable ({metrics['compression_deficit']['theist']['share']:.1%} versus {metrics['compression_deficit']['non_theist']['share']:.1%}). Missing qualification alone appears in {metrics['missing_qualification']['theist']['share']:.1%} versus {metrics['missing_qualification']['non_theist']['share']:.1%}.",
        st["body"],
    ))
    story.append(para(
        "The strict intersection is therefore not a statistical artifact produced by one permissive threshold. Each component points in the same direction, and requiring all three still leaves a 20.7-point difference. The result describes a recurring epistemic configuration: the claim is not sufficiently established, is stated at a force the evidence does not support, and lacks a stable boundary that would make correction easier.",
        st["body"],
    ))
    story.append(component_chart(results))
    story.append(para("Figure 2. Component shares and their strict intersection. All bars begin at zero and use the same 2,800-move denominator cohort.", st["caption"]))
    diagnostic_rows = []
    for label, key in [
        ("Evidence below 70", "low_warrant"),
        ("Material/radical overclaim", "material_overclaim"),
        ("Compression deficit", "compression_deficit"),
        ("Missing qualification", "missing_qualification"),
        ("Strict slogan risk", "slogan_risk"),
    ]:
        row = metrics[key]
        diagnostic_rows.append([label, f"{row['theist']['share']:.1%}", f"{row['non_theist']['share']:.1%}", f"{row['difference_pp']:.1f} pp"])
    story.append(data_table(["Diagnostic", "Theist", "Non-theist", "Difference"], diagnostic_rows, [2.35 * inch, 1.0 * inch, 1.0 * inch, 1.15 * inch], st))
    story.append(PageBreak())

    story.extend(section("4. The result is paired within debates", st))
    story.append(para(
        "Pooled move rates are easy to understand but moves are nested inside debates. The main uncertainty check therefore gives each debate one paired difference: its theist slogan-risk share minus its non-theist slogan-risk share. The analysis then resamples whole debates rather than pretending 2,800 moves are independent observations.",
        st["body"],
    ))
    story.append(
        BASE.callout(
            "Paired result",
            f"The mean within-debate difference is {100 * paired['estimate']:.1f} percentage points. Its 95% whole-debate bootstrap interval is {100 * paired['ci_95_low']:.1f} to {100 * paired['ci_95_high']:.1f} points.",
            st,
            background=BASE.TEAL_LIGHT,
            accent=BASE.TEAL,
        )
    )
    story.append(Spacer(1, 10))
    outcome_rows = [
        ["Theist side has higher slogan risk", paired["positive"], f"{paired['positive'] / paired['n_debates']:.1%}"],
        ["Equal rate", paired["ties"], f"{paired['ties'] / paired['n_debates']:.1%}"],
        ["Non-theist side has higher slogan risk", paired["negative"], f"{paired['negative'] / paired['n_debates']:.1%}"],
    ]
    story.append(data_table(["Within-debate outcome", "Debates", "Share"], outcome_rows, [3.6 * inch, 1.0 * inch, 1.0 * inch], st))
    story.append(Spacer(1, 10))
    story.append(para(
        "The existence of 17 reversals matters. It shows that the metric is not a disguised side label and prevents the report from treating all theists as one kind of reasoner. The finding is a distributional tendency: theist-side moves meet the strict rule much more often across the corpus, while particular debates and speakers can depart from that pattern.",
        st["body"],
    ))
    story.append(para(
        "The interval describes uncertainty across the observed debates, not a probability that the hypothesis is metaphysically true. The curated sample and repeated participants still limit generalization to all public debate. What the interval does establish is that the observed difference is not driven by a small handful of debate rows.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("5. Burden, role, and speaker checks", st))
    story.append(para(
        "The theist side usually argues the affirmative, which could create a generic burden disadvantage. Frequent speakers could also dominate pooled move counts. The robustness analysis therefore repeats the same strict rule within constructives, replies, load-bearing moves, the role-reversal subset, and after removing William Lane Craig and Matt Dillahunty, the most frequent speaker on each side.",
        st["body"],
    ))
    story.append(robustness_chart(results))
    story.append(para("Figure 3. Each square is the mean whole-debate difference; horizontal lines are 95% clustered bootstrap intervals. The role-reversal interval crosses zero because only 15 closed-findings debates qualify.", st["caption"]))
    robust_rows = []
    for row in results["subset_checks"]:
        robust_rows.append([
            row["subset"],
            f"{row['difference_pp']:.1f}",
            f"{100 * row['paired']['ci_95_low']:.1f} to {100 * row['paired']['ci_95_high']:.1f}",
            row["paired"]["n_debates"],
        ])
    story.append(data_table(["Check", "Difference (pp)", "95% interval", "Debates"], robust_rows, [2.65 * inch, 1.05 * inch, 1.55 * inch, 0.7 * inch], st))
    story.append(PageBreak())

    story.extend(section("6. Frequent speakers do not create the result", st))
    story.append(para(
        "The non-theist side is actually more concentrated in a smaller number of recurring speakers: 44 non-theist-side speakers versus 78 theist-side speakers in the primary cohort. To prevent either group's prolific participants from receiving disproportionate influence, the analysis computes each speaker's personal flag rate and then gives every speaker equal weight.",
        st["body"],
    ))
    story.append(speaker_chart(results))
    story.append(para("Figure 4. Pooled move rates and equal-speaker means tell the same story. Equal weighting yields 28.3% for theist-side speakers and 9.2% for non-theist-side speakers.", st["caption"]))
    speaker_rows = [
        ["Pooled moves", f"{primary['theist']['share']:.1%}", f"{primary['non_theist']['share']:.1%}", f"{primary['difference_pp']:.1f} pp"],
        ["Each speaker equal", f"{results['speaker_equal_weight']['theist']['equal_weight_mean']:.1%}", f"{results['speaker_equal_weight']['non_theist']['equal_weight_mean']:.1%}", f"{100 * (results['speaker_equal_weight']['theist']['equal_weight_mean'] - results['speaker_equal_weight']['non_theist']['equal_weight_mean']):.1f} pp"],
        ["Median speaker", f"{results['speaker_equal_weight']['theist']['median']:.1%}", f"{results['speaker_equal_weight']['non_theist']['median']:.1%}", f"{100 * (results['speaker_equal_weight']['theist']['median'] - results['speaker_equal_weight']['non_theist']['median']):.1f} pp"],
    ]
    story.append(data_table(["Weighting", "Theist", "Non-theist", "Difference"], speaker_rows, [2.2 * inch, 1.1 * inch, 1.1 * inch, 1.2 * inch], st))
    story.append(Spacer(1, 9))
    story.append(para(
        "Removing the most frequent speaker on each side also preserves a large difference. This does not eliminate every speaker effect; it shows that the headline is not simply a William Lane Craig versus Matt Dillahunty comparison. A mixed-effects model in a future human-coded study would be the stronger next step.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("7. Fallacy and bias tags corroborate the pattern", st))
    story.append(para(
        "Published move tags provide an independent-looking but incomplete layer. Fifty-nine relevant debates contain at least one published fallacy or bias tag, covering 1,412 moves split almost perfectly between sides. In this cohort, 23.5% of theist moves and 7.4% of non-theist moves receive any tag.",
        st["body"],
    ))
    story.append(para(
        "The narrower epistemic-insulation cluster includes argument from ignorance, special pleading, subjective validation, confirmation bias, and belief bias. These tags capture routes by which a preferred conclusion can be protected from rival explanations, contrary outcomes, or independent testing. The cluster appears in 8.2% of theist moves and 1.0% of non-theist moves.",
        st["body"],
    ))
    story.append(tag_chart(results))
    story.append(para("Figure 5. Tag rates in the partial tag-bearing cohort. The denominator is moves, so a move with multiple tags still counts once within each displayed category.", st["caption"]))
    story.append(
        BASE.callout(
            "Why this remains secondary",
            "Tag coverage is not corpus-complete and may reflect when detailed annotations were added to the publication pipeline. The paired direction is strong, but these tags corroborate the primary closed-field result rather than replace it.",
            st,
            background=BASE.BLUE_LIGHT,
            accent=BASE.BLUE,
        )
    )
    story.append(PageBreak())

    story.extend(section("8. Examples of unfalsifiable slogan proffering", st))
    story.append(para(
        f"The complete count comes from the mechanical rule, not from selected examples. Here, <b>unfalsifiable slogan proffering</b> means offering a rhetorically settled conclusion without stating a clear observation or argumentative result that would count against it. John Lennox supplies several concrete cases: {results['speaker_case_studies']['John Lennox']['flagged']} of his {results['speaker_case_studies']['John Lennox']['moves']} closed-field moves meet the strict rule. Each card below identifies both the slogan function and the missing route to disconfirmation.",
        st["body"],
    ))
    for row in results["examples"]["theist_slogan_risk"]:
        story.append(example_card(row, st, accent=BASE.RUST))
        story.append(Spacer(1, 7))
    story.append(PageBreak())

    story.extend(section("9. Counterexamples keep the claim honest", st))
    story.append(para(
        "The pattern is not uniquely theist, and good theist arguments are common enough to matter. The same strict rule flags non-theist moves when scientific confidence becomes antireligious dismissal, when simplicity claims rely on undefined probability measures, or when naturalistic possibilities are treated as established explanations.",
        st["body"],
    ))
    for row in results["examples"]["non_theist_slogan_risk"]:
        story.append(example_card(row, st, accent=BASE.BLUE))
        story.append(Spacer(1, 7))
    story.append(para("High-quality theist counterexamples", st["h2"]))
    story.append(para(
        "The following theist-side moves do not meet the slogan-risk rule. They show explicit evidence, disciplined modal scope, or careful comparative method. Their presence is important: the result is a frequency difference in argumentative practice, not an assertion that theism prevents rigorous reasoning.",
        st["body"],
    ))
    for row in results["examples"]["theist_counterexamples"]:
        story.append(example_card(row, st, accent=BASE.TEAL))
        story.append(Spacer(1, 7))
    story.append(PageBreak())

    story.extend(section("10. Emotional affirmation as the proposed mechanism", st))
    story.append(para(
        "The user's causal proposal is that theism is often maintained through emotional devices such as affirmation rather than through rationally discriminating argument. The observed data are consistent with that mechanism. Personal manifestation, hope, identity, moralized descriptions of unbelief, inherited authority, and theological fit can make a conclusion feel settled from inside a tradition before the public evidential burden has been met.",
        st["body"],
    ))
    story.append(mechanism_chart())
    story.append(para("Figure 6. The proposed causal chain. The strict proxy directly measures the final epistemic configuration. The emotional and social links remain interpretive hypotheses.", st["caption"]))
    story.append(para(
        "A rational argument exposes itself to loss: it states what evidence bears on the claim, compares live alternatives, limits its force, and identifies conditions under which revision would be appropriate. Affirmation works differently. It rehearses the conclusion, binds it to identity or value, interprets doubt as a personal or moral failure, and makes contrary outcomes compatible with the original commitment. When this structure enters debate, the predictable trace is exactly the one measured here: low warrant, high asserted force, and compressed qualification.",
        st["body"],
    ))
    story.append(
        BASE.callout(
            "Causal boundary",
            "The ledgers do not observe emotion, persuasion, social enforcement, or private conviction. Emotional affirmation is therefore a plausible explanation of the measured configuration, not an experimentally established cause.",
            st,
            background=BASE.RUST_LIGHT,
            accent=BASE.RUST,
        )
    )
    story.append(PageBreak())

    story.extend(section("11. Rival explanations", st))
    rival_rows = [
        ["Affirmative burden", "Theist sides must build more cases from scratch", "Constructive and reply differences remain large; load-bearing moves show a 22.2-point difference"],
        ["A few frequent speakers", "Prolific apologists or skeptics dominate the count", "Equal-speaker weighting is 28.3% versus 9.2%; excluding the top speaker on each side preserves the result"],
        ["Role storage", "The public pro/con orientation creates the result", "The role-reversal direction remains positive, but only 15 debates qualify and its interval crosses zero"],
        ["Evaluator preference", "The rubric favors skeptical styles", "Three separate closed fields must coincide, but only blinded human replication can rule this out decisively"],
        ["Topic difficulty", "Theist claims may be intrinsically harder to substantiate", "This may be part of the mechanism, but topic-matched human coding is needed to separate worldview practice from claim difficulty"],
        ["Literal language only", "The result is a vocabulary artifact", "The proxy uses no religious or emotional keywords; it uses support, calibration, and precision judgments"],
    ]
    story.append(data_table(["Rival", "Prediction", "Assessment"], rival_rows, [1.22 * inch, 1.72 * inch, 3.15 * inch], st))
    story.append(Spacer(1, 9))
    story.append(para(
        "The strongest unresolved rivals are evaluator preference and topic difficulty. The current design reduces several obvious confounds but cannot make debate topics random or replace the AI-assisted rubric with independent human judgments. That is why the report's conclusion is strong about the observed epistemic profile and more cautious about its ultimate cause.",
        st["body"],
    ))
    story.append(para(
        "The emotional-affirmation account nevertheless earns consideration because it predicts a conjunction rather than a generic score loss. It predicts claims that are publicly under-supported, asserted too forcefully, and protected by imprecise scope or missing qualification. That distinctive configuration is exactly what appears at a 3.62-fold relative rate.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("12. Data, method, and reproducibility", st))
    story.append(para(
        "The analysis joins the corrected position taxonomy to every relevant locked assessment ledger. It normalizes the six final dimensions, maps each move to theist or non-theist by the position argued, and restricts the primary proxy to the 146 debates whose ledgers expose closed calibration and precision fields. The remaining 23 debates contribute to the full-corpus evidence context but not to the strict composite.",
        st["body"],
    ))
    quality_rows = [
        ["Relevant debates", 169, "Corrected theist/non-theist taxonomy"],
        ["All scored moves", "3,502", "1,746 theist; 1,756 non-theist"],
        ["Primary debates", 146, "Closed evidence, calibration, and precision findings"],
        ["Primary moves", "2,800", "1,393 theist; 1,407 non-theist"],
        ["Paired resamples", "20,000", "Whole debates, deterministic seed"],
        ["Tag-bearing debates", 59, "Secondary annotation cohort only"],
        ["Missing primary fields", 0, "All required component fields present"],
    ]
    story.append(data_table(["Validation item", "Result", "Meaning"], quality_rows, [1.65 * inch, 0.95 * inch, 3.55 * inch], st))
    story.append(Spacer(1, 9))
    story.append(para("Reproducible artifacts", st["h2"]))
    source_rows = [
        ["Executed analysis", "docs/analysis/theist-rhetorical-slogans-2026-09-01/analysis.py"],
        ["Results", "docs/analysis/theist-rhetorical-slogans-2026-09-01/results.json"],
        ["Move audit trail", "docs/analysis/theist-rhetorical-slogans-2026-09-01/move-diagnostics.csv"],
        ["Paired debate rates", "docs/analysis/theist-rhetorical-slogans-2026-09-01/debate-rates.csv"],
        ["Tag audit trail", "docs/analysis/theist-rhetorical-slogans-2026-09-01/tag-diagnostics.csv"],
        ["Notebook companion", "docs/analysis/theist-rhetorical-slogans-2026-09-01/analysis.ipynb"],
        ["Portable report", "docs/analysis/theist-rhetorical-slogans-2026-09-01/report.html"],
    ]
    story.append(data_table(["Artifact", "Repository path"], source_rows, [1.55 * inch, 4.55 * inch], st))
    story.append(Spacer(1, 8))
    story.append(para(
        "The companion analysis script runs successfully in the bundled local Python runtime. A Jupyter kernel is not installed on the host, so the notebook is a standards-compliant reader-facing wrapper around the same executed script but was not itself kernel-executed. The exact limitation is recorded in the source notes.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("13. Limits and a decisive falsification test", st))
    for text in results["validation"]["required_caveats"]:
        story.append(bullet(escaped(text), st))
    story.append(Spacer(1, 8))
    story.append(para("What the next study must code directly", st["h2"]))
    for text in [
        "Whether the original wording is formulaic, aphoristic, repetitive, or explicitly offered as an affirmation.",
        "Whether the move states an observable or argumentative condition that would count against its conclusion.",
        "Whether contrary outcomes can be absorbed by modifying auxiliary theology without lowering confidence.",
        "Whether emotional valence, identity protection, hope, fear, moral condemnation, or communal authority does argumentative work.",
        "Whether force exceeds warrant after coders are blinded to speaker, side, and religious vocabulary.",
    ]:
        story.append(bullet(text, st))
    story.append(Spacer(1, 7))
    story.append(
        BASE.callout(
            "Falsification condition",
            "The fuller hypothesis should be weakened if trained blind coders find no theist-side excess in literal slogan form, absence of disconfirmation conditions, or outcome-insulation after matching topic, role, importance, speaker, and debate.",
            st,
            background=BASE.TEAL_LIGHT,
            accent=BASE.TEAL,
        )
    )
    story.append(Spacer(1, 9))
    story.append(para(
        "This is not a ceremonial recommendation. It names evidence that could overturn the interpretation. If the side difference disappears under direct human coding, the current composite should be reclassified as a broader substantiation and precision deficit rather than evidence of slogan or non-falsifiability specifically.",
        st["body"],
    ))
    story.append(PageBreak())

    story.extend(section("14. Conclusion: a strong pattern with a disciplined boundary", st))
    story.append(
        BASE.callout(
            "The finding in one sentence",
            "In the assessed corpus, theist-side moves are more than three and a half times as likely to combine weak warrant, excessive asserted force, and compressed qualification - the precise argumentative profile expected when affirmation substitutes for completed public justification.",
            st,
            background=BASE.RUST_LIGHT,
            accent=BASE.RUST,
        )
    )
    story.append(Spacer(1, 10))
    story.append(para(
        "The result is both large and structured. It is not merely that theist moves receive lower evidence scores. More of them simultaneously lack public warrant, project a confidence their support does not sustain, and omit the stable scope or qualification needed for correction. The strict conjunction appears in 398 theist moves and 111 non-theist moves. It favors the hypothesis in 103 of 146 paired debates and reverses in only 17.",
        st["body"],
    ))
    story.append(para("What the evidence supports strongly", st["h2"]))
    story.append(para(
        "The data strongly support the operationalized core: theist-side performances contain substantially more slogan-like overclaiming. The pattern survives affirmative-versus-reply separation, grows among load-bearing moves, remains after speaker balancing, and is echoed in the partial fallacy/bias record. Good theist counterexamples and bad non-theist counterexamples show that the measure is not reducible to side identity; the difference lies in prevalence.",
        st["body"],
    ))
    story.append(para("What remains provisional", st["h2"]))
    story.append(para(
        "The word non-falsifiable carries a stricter burden. The current records do not ask of every move: What precise observation would lower confidence? Can every outcome be assimilated? Does the claim make a risky prediction? Some representative cases plainly display insulation, but the complete 3.62-fold result is a proxy for the surrounding epistemic profile, not a full census of Popperian falsifiability.",
        st["body"],
    ))
    story.append(para("The explanatory judgment", st["h2"]))
    story.append(para(
        "Emotional affirmation is a plausible unifying explanation. When a belief is bound to hope, identity, salvation, personal manifestation, inherited authority, or the moral status of doubt, repeating the conclusion can become psychologically sufficient even when it is not publicly sufficient. That mechanism predicts exactly the observed combination: weak comparative evidence, strong declarative force, and qualifications compressed until the claim becomes difficult to dislodge.",
        st["body"],
    ))
    story.append(para(
        "Yet explanatory force does not erase evidential limits. The corpus measures argument, not emotion or enforcement. The responsible conclusion is therefore neither a retreat to agnosticism nor an overstatement of causation. It is a tiered verdict: the empirical pattern is strong, the non-falsifiability interpretation is plausible but incomplete, and the emotional-enforcement account is a serious causal hypothesis awaiting direct blinded testing.",
        st["body"],
    ))
    story.append(
        BASE.callout(
            "Final conclusion",
            "The strongest defensible reading is that the theist sides in these debates do use substantially more moves that function as rhetorical slogans: conclusions are affirmed with too little common warrant, too much confidence, and too little qualifying structure. This supports the hypothesis's epistemic core. Whether those moves are literally non-falsifiable, and whether emotional reinforcement causes their prevalence, are now sharply formulated questions for the next study rather than assumptions smuggled into this one.",
            st,
            background=BASE.TEAL_LIGHT,
            accent=BASE.TEAL,
        )
    )
    return story


def build_pdf() -> Path:
    BASE.register_fonts()
    results = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=BASE.letter,
        leftMargin=BASE.LEFT,
        rightMargin=BASE.RIGHT,
        topMargin=BASE.TOP,
        bottomMargin=BASE.BOTTOM,
        title="Are Theist Arguments More Often Slogan-Like?",
        author="SLUGFESTER",
        subject="A corpus test of rhetorical overclaiming, epistemic compression, and non-falsifiability risk",
        creator="SLUGFESTER ReportLab PDF pipeline",
    )
    frame = Frame(
        BASE.LEFT,
        BASE.BOTTOM,
        BASE.CONTENT_W,
        BASE.PAGE_H - BASE.TOP - BASE.BOTTOM,
        id="body",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=page_chrome)])
    doc.multiBuild(build_story(results, BASE.styles()))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf().relative_to(REPO_ROOT))
