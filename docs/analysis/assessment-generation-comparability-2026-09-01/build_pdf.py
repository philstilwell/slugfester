#!/usr/bin/env python3
"""Build the publication PDF for the SLUGFESTER score-scale comparability study."""

from __future__ import annotations

import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab import rl_config
from reportlab.graphics import shapes as graphics_shapes
from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import tables as platypus_tables
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
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
OUTPUT_PATH = REPO_ROOT / "output/pdf/are-all-slugfester-assessments-on-the-same-scale.pdf"

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONT_FILES = {
    "SLUGSans": FONT_DIR / "Arial.ttf",
    "SLUGSans-Bold": FONT_DIR / "Arial Bold.ttf",
    "SLUGSans-Italic": FONT_DIR / "Arial Italic.ttf",
    "SLUGSans-BoldItalic": FONT_DIR / "Arial Bold Italic.ttf",
}

NAVY = colors.HexColor("#12233F")
BLUE = colors.HexColor("#276AA8")
BLUE_DARK = colors.HexColor("#1F568A")
BLUE_LIGHT = colors.HexColor("#DCEAF6")
TEAL = colors.HexColor("#21857C")
TEAL_LIGHT = colors.HexColor("#DDF1EE")
GOLD = colors.HexColor("#D39B2A")
GOLD_LIGHT = colors.HexColor("#F8EBCB")
RUST = colors.HexColor("#B4553D")
RUST_LIGHT = colors.HexColor("#F6E5DF")
INK = colors.HexColor("#263448")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#D7DEE8")
PAPER = colors.HexColor("#F5F7FA")
WHITE = colors.white

PAGE_W, PAGE_H = letter
LEFT = 0.68 * inch
RIGHT = 0.68 * inch
TOP = 0.70 * inch
BOTTOM = 0.62 * inch
CONTENT_W = PAGE_W - LEFT - RIGHT


def register_fonts() -> None:
    for name, path in FONT_FILES.items():
        if not path.exists():
            raise FileNotFoundError(f"Required embeddable font is missing: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily(
        "SLUGSans",
        normal="SLUGSans",
        bold="SLUGSans-Bold",
        italic="SLUGSans-Italic",
        boldItalic="SLUGSans-BoldItalic",
    )
    rl_config.canvas_basefontname = "SLUGSans"
    graphics_shapes.STATE_DEFAULTS["fontName"] = "SLUGSans"
    platypus_tables._baseFontName = "SLUGSans"
    platypus_tables.CellStyle.fontname = "SLUGSans"


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=8.5,
            leading=11,
            textColor=BLUE,
            spaceAfter=12,
            tracking=1.1,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="SLUGSans-Bold",
            fontSize=27,
            leading=30,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=14,
            leading=18,
            textColor=BLUE_DARK,
            spaceAfter=18,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=8.2,
            leading=11,
            textColor=MUTED,
            spaceAfter=12,
        ),
        "cover_abstract": ParagraphStyle(
            "cover_abstract",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.5,
            leading=13.4,
            textColor=INK,
            spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="SLUGSans-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceBefore=3,
            spaceAfter=9,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="SLUGSans-Bold",
            fontSize=12.5,
            leading=15.5,
            textColor=BLUE_DARK,
            spaceBefore=7,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.25,
            leading=13.05,
            textColor=INK,
            spaceAfter=6,
            allowWidows=0,
            allowOrphans=0,
        ),
        "body_small": ParagraphStyle(
            "body_small",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=8.1,
            leading=10.8,
            textColor=INK,
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.05,
            leading=12.55,
            leftIndent=14,
            firstLineIndent=-8,
            bulletIndent=0,
            textColor=INK,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="SLUGSans-Italic",
            fontSize=7.55,
            leading=9.8,
            textColor=MUTED,
            spaceBefore=3,
            spaceAfter=7,
        ),
        "callout_title": ParagraphStyle(
            "callout_title",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=9.4,
            leading=12,
            textColor=NAVY,
            spaceAfter=3,
        ),
        "callout_body": ParagraphStyle(
            "callout_body",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=8.75,
            leading=12,
            textColor=INK,
        ),
        "metric": ParagraphStyle(
            "metric",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=19,
            leading=21,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "metric_label": ParagraphStyle(
            "metric_label",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=7.6,
            leading=9.8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=WHITE,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=7.5,
            leading=9.7,
            textColor=INK,
        ),
        "table_cell_bold": ParagraphStyle(
            "table_cell_bold",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=7.5,
            leading=9.7,
            textColor=INK,
        ),
        "conclusion": ParagraphStyle(
            "conclusion",
            parent=base["BodyText"],
            fontName="SLUGSans-Bold",
            fontSize=13.2,
            leading=18,
            textColor=NAVY,
            spaceAfter=10,
        ),
    }


class SectionRule(Flowable):
    def __init__(self, width: float = CONTENT_W, color=BLUE, height: float = 7):
        super().__init__()
        self.width = width
        self.height = height
        self.color = color

    def draw(self) -> None:
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(2.2)
        self.canv.line(0, self.height / 2, self.width, self.height / 2)


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullet(text: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(f"• {text}", styles["bullet"])


def callout(
    title: str,
    text: str,
    styles: dict[str, ParagraphStyle],
    fill=BLUE_LIGHT,
    accent=BLUE,
) -> Table:
    content = [
        Paragraph(escape(title), styles["callout_title"]),
        Paragraph(text, styles["callout_body"]),
    ]
    table = Table([[content]], colWidths=[CONTENT_W - 16], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.6, accent),
                ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def metric_strip(items: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    width = CONTENT_W / len(items)
    cells = []
    for value, label in items:
        cells.append(
            [
                Paragraph(escape(value), styles["metric"]),
                Paragraph(escape(label), styles["metric_label"]),
            ]
        )
    table = Table([cells], colWidths=[width] * len(items), hAlign="LEFT")
    style_commands = [
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for index in range(1, len(items)):
        style_commands.append(("LINEBEFORE", (index, 0), (index, 0), 0.6, RULE))
    table.setStyle(TableStyle(style_commands))
    return table


def data_table(
    headers: list[str],
    rows: list[list[str]],
    widths: list[float],
    styles: dict[str, ParagraphStyle],
    first_bold: bool = False,
) -> Table:
    formatted = [[Paragraph(escape(value), styles["table_header"]) for value in headers]]
    for row in rows:
        formatted.append(
            [
                Paragraph(
                    escape(str(value)),
                    styles["table_cell_bold"] if first_bold and index == 0 else styles["table_cell"],
                )
                for index, value in enumerate(row)
            ]
        )
    table = Table(formatted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for index in range(1, len(formatted)):
        if index % 2 == 0:
            commands.append(("BACKGROUND", (0, index), (-1, index), PAPER))
    table.setStyle(TableStyle(commands))
    return table


def chart_header(drawing: Drawing, title: str, subtitle: str, width: float) -> None:
    drawing.add(String(0, drawing.height - 14, title, fontName="SLUGSans-Bold", fontSize=10.5, fillColor=NAVY))
    drawing.add(String(0, drawing.height - 28, subtitle, fontName="SLUGSans", fontSize=7.5, fillColor=MUTED))
    drawing.add(Line(0, drawing.height - 34, width, drawing.height - 34, strokeColor=RULE, strokeWidth=0.7))


def score_level_chart(closed: dict, standalone: dict) -> Drawing:
    width, height = CONTENT_W, 245
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean overall side score by assessment generation",
        "All locked debates; scores are on the published 0-100 scale and bars begin at zero",
        width,
    )
    left, bottom, top = 72, 38, height - 50
    chart_w = width - left - 38
    chart_h = top - bottom
    for tick in range(0, 101, 20):
        y = bottom + chart_h * tick / 100
        drawing.add(Line(left, y, left + chart_w, y, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(left - 8, y - 3, str(tick), textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    positions = [left + chart_w * 0.31, left + chart_w * 0.69]
    values = [closed["mean_side_score"], standalone["mean_side_score"]]
    labels = ["Earlier generation", "Later generation"]
    fills = [BLUE, GOLD]
    for x, value, label, fill in zip(positions, values, labels, fills):
        bar_w = 92
        bar_h = chart_h * value / 100
        drawing.add(Rect(x - bar_w / 2, bottom, bar_w, bar_h, fillColor=fill, strokeColor=colors.HexColor("#23435E"), strokeWidth=0.55))
        drawing.add(String(x, bottom + bar_h + 7, f"{value:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=10, fillColor=NAVY))
        drawing.add(String(x, bottom - 15, label, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.7, fillColor=INK))
    drawing.add(String(width - 2, 7, "Later minus earlier: -3.16 points", textAnchor="end", fontName="SLUGSans-Bold", fontSize=8.4, fillColor=RUST))
    return drawing


def sequence_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 248
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean side scores across assessment-number blocks",
        "Focused 74-84 vertical scale; the generation boundary is between 176-195 and 196-205",
        width,
    )
    left, right, bottom, top = 42, 16, 52, height - 50
    chart_w = width - left - right
    chart_h = top - bottom
    y_min, y_max = 74, 84
    for tick in range(y_min, y_max + 1, 2):
        y = bottom + chart_h * (tick - y_min) / (y_max - y_min)
        drawing.add(Line(left, y, left + chart_w, y, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(left - 7, y - 3, str(tick), textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    gap = chart_w / len(rows)
    bar_w = gap * 0.62
    for index, row in enumerate(rows):
        x = left + gap * (index + 0.5)
        value = row["mean_side_score"]
        base = bottom
        bar_h = chart_h * (value - y_min) / (y_max - y_min)
        fill = BLUE if row["generation"] == "closed" else GOLD
        drawing.add(Rect(x - bar_w / 2, base, bar_w, bar_h, fillColor=fill, strokeColor=NAVY, strokeWidth=0.4))
        drawing.add(String(x, base + bar_h + 5, f"{value:.1f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=6.6, fillColor=INK))
        drawing.add(String(x, bottom - 13, row["label"], textAnchor="middle", fontName="SLUGSans", fontSize=6.2, fillColor=MUTED))
        drawing.add(String(x, bottom - 25, f"n={row['debates']}", textAnchor="middle", fontName="SLUGSans", fontSize=5.7, fillColor=MUTED))
    boundary_x = left + gap * 8
    drawing.add(Line(boundary_x, bottom - 4, boundary_x, top + 4, strokeColor=RUST, strokeWidth=1.4, strokeDashArray=[4, 3]))
    drawing.add(String(boundary_x + 4, top - 4, "generation boundary", fontName="SLUGSans-Bold", fontSize=6.5, fillColor=RUST))
    return drawing


def speaker_bridge_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 470
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Repeated-speaker bridge: later minus earlier mean side score",
        "All 31 speakers appearing in both generations; negative values mean lower scores in the later generation",
        width,
    )
    columns = [rows[:16], rows[16:]]
    col_width = width / 2 - 10
    y_top = height - 55
    row_h = 24.1
    x_min, x_max = -14, 8
    label_w = 84
    plot_w = col_width - label_w - 26
    for col_index, subset in enumerate(columns):
        x0 = col_index * (width / 2 + 4)
        zero_x = x0 + label_w + plot_w * (0 - x_min) / (x_max - x_min)
        drawing.add(Line(zero_x, 39, zero_x, y_top + 3, strokeColor=MUTED, strokeWidth=0.7))
        for tick in (-12, -8, -4, 0, 4, 8):
            x = x0 + label_w + plot_w * (tick - x_min) / (x_max - x_min)
            drawing.add(Line(x, 35, x, y_top + 3, strokeColor=RULE, strokeWidth=0.35))
            drawing.add(String(x, 26, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=6, fillColor=MUTED))
        for index, row in enumerate(subset):
            y = y_top - index * row_h
            value = row["difference"]
            end_x = x0 + label_w + plot_w * (value - x_min) / (x_max - x_min)
            drawing.add(String(x0, y - 2.5, row["speaker"], fontName="SLUGSans", fontSize=6.7, fillColor=INK))
            left = min(zero_x, end_x)
            bar_w = max(1.2, abs(end_x - zero_x))
            fill = RUST if value < 0 else TEAL
            drawing.add(Rect(left, y - 5.8, bar_w, 7.5, fillColor=fill, strokeColor=fill, strokeWidth=0.2))
            anchor = "end" if value < 0 else "start"
            offset = -3 if value < 0 else 3
            drawing.add(String(end_x + offset, y - 3, f"{value:+.1f}", textAnchor=anchor, fontName="SLUGSans-Bold", fontSize=6.3, fillColor=fill))
    drawing.add(String(width / 2, 9, "score-point difference", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def dimension_dumbbell_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 290
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Move-level dimension means by assessment generation",
        "Focused 64-90 scale; 3,423 earlier-generation moves and 1,026 later-generation moves",
        width,
    )
    labels = []
    grouped = {}
    for row in rows:
        grouped.setdefault(row["dimension"], {})[row["cohort"]] = row
        if row["label"] not in labels:
            labels.append(row["label"])
    key_by_label = {row["label"]: row["dimension"] for row in rows}
    left, right, bottom, top = 128, 28, 40, height - 48
    chart_w = width - left - right
    x_min, x_max = 64, 90
    for tick in range(64, 91, 4):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(labels)
    for index, label in enumerate(labels):
        y = top - step * (index + 0.5)
        key = key_by_label[label]
        closed = grouped[key]["closed"]["mean"]
        standalone = grouped[key]["standalone"]["mean"]
        x1 = left + chart_w * (closed - x_min) / (x_max - x_min)
        x2 = left + chart_w * (standalone - x_min) / (x_max - x_min)
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.6, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=MUTED, strokeWidth=1.2))
        drawing.add(Circle(x1, y, 4.2, fillColor=BLUE, strokeColor=BLUE_DARK, strokeWidth=0.6))
        drawing.add(Circle(x2, y, 4.2, fillColor=GOLD, strokeColor=colors.HexColor("#8A6210"), strokeWidth=0.6))
        drawing.add(String(x1 + 6, y + 6, f"{closed:.1f}", fontName="SLUGSans-Bold", fontSize=6.4, fillColor=BLUE_DARK))
        drawing.add(String(x2 - 6, y - 12, f"{standalone:.1f}", textAnchor="end", fontName="SLUGSans-Bold", fontSize=6.4, fillColor=colors.HexColor("#8A6210")))
    drawing.add(Circle(width - 154, 16, 4, fillColor=BLUE, strokeColor=BLUE_DARK))
    drawing.add(String(width - 144, 13, "Earlier", fontName="SLUGSans", fontSize=7, fillColor=INK))
    drawing.add(Circle(width - 83, 16, 4, fillColor=GOLD, strokeColor=colors.HexColor("#8A6210")))
    drawing.add(String(width - 73, 13, "Later", fontName="SLUGSans", fontSize=7, fillColor=INK))
    return drawing


def correlation_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 285
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Correlation of relevance-and-burden with the other dimensions",
        "Pearson correlations across all locked moves; self-correlation omitted",
        width,
    )
    filtered = [row for row in rows if row["population"] == "all moves" and row["dimension"] != "relevanceBurden"]
    labels = []
    grouped = {}
    for row in filtered:
        grouped.setdefault(row["dimension"], {})[row["cohort"]] = row["relevance_correlation"]
        if row["label"] not in labels:
            labels.append(row["label"])
    key_by_label = {row["label"]: row["dimension"] for row in filtered}
    left, right, bottom, top = 128, 28, 43, height - 50
    chart_w = width - left - right
    x_min, x_max = -0.1, 0.85
    for tick in (-0.1, 0.0, 0.2, 0.4, 0.6, 0.8):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, f"{tick:.1f}", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(labels)
    for index, label in enumerate(labels):
        y = top - step * (index + 0.5)
        key = key_by_label[label]
        closed = grouped[key]["closed"]
        standalone = grouped[key]["standalone"]
        x1 = left + chart_w * (closed - x_min) / (x_max - x_min)
        x2 = left + chart_w * (standalone - x_min) / (x_max - x_min)
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans", fontSize=7.7, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=MUTED, strokeWidth=1.2))
        drawing.add(Circle(x1, y, 4.2, fillColor=BLUE, strokeColor=BLUE_DARK, strokeWidth=0.6))
        drawing.add(Circle(x2, y, 4.2, fillColor=GOLD, strokeColor=colors.HexColor("#8A6210"), strokeWidth=0.6))
        drawing.add(String(x1 - 6, y + 6, f"{closed:.2f}", textAnchor="end", fontName="SLUGSans-Bold", fontSize=6.3, fillColor=BLUE_DARK))
        drawing.add(String(x2 + 6, y - 11, f"{standalone:.2f}", fontName="SLUGSans-Bold", fontSize=6.3, fillColor=colors.HexColor("#8A6210")))
    drawing.add(Circle(width - 154, 16, 4, fillColor=BLUE, strokeColor=BLUE_DARK))
    drawing.add(String(width - 144, 13, "Earlier", fontName="SLUGSans", fontSize=7, fillColor=INK))
    drawing.add(Circle(width - 83, 16, 4, fillColor=GOLD, strokeColor=colors.HexColor("#8A6210")))
    drawing.add(String(width - 73, 13, "Later", fontName="SLUGSans", fontSize=7, fillColor=INK))
    return drawing


def tag_rate_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 245
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Share of published move cards carrying at least one rhetorical tag",
        "Public rendering audit across all 228 assessments; bars begin at zero",
        width,
    )
    left, bottom, top = 54, 44, height - 50
    chart_w = width - left - 26
    chart_h = top - bottom
    y_max = 0.32
    for tick in (0.0, 0.1, 0.2, 0.3):
        y = bottom + chart_h * tick / y_max
        drawing.add(Line(left, y, left + chart_w, y, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(left - 8, y - 3, f"{tick:.0%}", textAnchor="end", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    gap = chart_w / len(rows)
    labels = ["Earlier generation", "Later generation", "No locked ledger"]
    fills = [BLUE, GOLD, MUTED]
    for index, (row, label, fill) in enumerate(zip(rows, labels, fills)):
        x = left + gap * (index + 0.5)
        bar_w = 84
        bar_h = chart_h * row["tagged_move_rate"] / y_max
        drawing.add(Rect(x - bar_w / 2, bottom, bar_w, bar_h, fillColor=fill, strokeColor=NAVY, strokeWidth=0.45))
        drawing.add(String(x, bottom + bar_h + 7, f"{row['tagged_move_rate']:.1%}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=9, fillColor=NAVY))
        drawing.add(String(x, bottom - 15, label, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=INK))
        drawing.add(String(x, bottom - 27, f"{row['tagged_moves']}/{row['public_moves']} moves", textAnchor="middle", fontName="SLUGSans", fontSize=6.3, fillColor=MUTED))
    return drawing


def first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.rect(0, 0, PAGE_W, 0.12 * inch, fill=1, stroke=0)
    canvas.restoreState()


def later_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, PAGE_H - 0.43 * inch, PAGE_W - RIGHT, PAGE_H - 0.43 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("SLUGSans-Bold", 6.8)
    canvas.drawString(LEFT, PAGE_H - 0.33 * inch, "SLUGFESTER CORPUS-LEVEL ANALYSIS")
    canvas.setFont("SLUGSans", 6.8)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 0.33 * inch, "ASSESSMENT SCALE COMPARABILITY")
    canvas.setStrokeColor(RULE)
    canvas.line(LEFT, 0.40 * inch, PAGE_W - RIGHT, 0.40 * inch)
    canvas.setFont("SLUGSans", 6.8)
    canvas.drawString(LEFT, 0.25 * inch, "September 1, 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, str(doc.page))
    canvas.restoreState()


def build_story(results: dict, styles: dict[str, ParagraphStyle]) -> list:
    closed = next(row for row in results["cohort_summary"] if row["cohort"] == "closed")
    standalone = next(row for row in results["cohort_summary"] if row["cohort"] == "standalone")
    difference = results["score_difference"]
    repeated = results["repeated_speakers"]
    corpus = results["corpus"]
    tags = results["tag_summary"]
    pca = results["pca"]

    story = []

    # 1. Cover
    story.extend(
        [
            Spacer(1, 0.38 * inch),
            Paragraph("CORPUS-LEVEL MEASUREMENT AUDIT", styles["cover_kicker"]),
            Paragraph("Are All Slugfester Assessments on the Same Scale?", styles["cover_title"]),
            Paragraph(
                "Evidence of a scoring-generation discontinuity across 228 published debate assessments",
                styles["cover_subtitle"],
            ),
            Paragraph(
                "REPORT DATE  ·  SEPTEMBER 1, 2026 &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
                "CORPUS  ·  228 PUBLISHED ASSESSMENTS &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
                "LOCKED-LEDGER ANALYSIS  ·  212 ASSESSMENTS / 4,449 MOVES",
                styles["cover_meta"],
            ),
            SectionRule(),
            Spacer(1, 8),
            Paragraph(
                "<b>Answer.</b> The current evidence does not justify treating every published absolute score as if it were generated by one perfectly uniform measuring instrument. The 179 earlier locked-ledger assessments average 81.32 points per side; the 33 later standalone assessments average 78.17, a 3.16-point reduction. Thirty-one repeated speakers provide a partial bridge: 26 score lower in the later generation, with an average shift of -2.81 points. The six rubric dimensions also become much more tightly coupled in the later ledgers, while rhetorical-tag coverage rises sevenfold.",
                styles["cover_abstract"],
            ),
            Paragraph(
                "These patterns are strong evidence of a <b>measurement-generation comparability risk</b>. They are not proof that either generation is wrong, and they do not identify the protocol as the sole cause: assessment generation is perfectly confounded with assessment order and debate selection. The practical conclusion is narrower and consequential. Within-debate score differences remain the safest comparisons; absolute scores, cross-generation speaker averages, dimension distributions, and tag frequencies require generation-aware analysis.",
                styles["cover_abstract"],
            ),
            Spacer(1, 9),
            callout(
                "Planned revision cycle",
                "SLUGFESTER intends to rerun the assessments roughly twice each year, when meaningful improvements in AI models make more accurate, consistent, and objective judgments realistically achievable. Each rerun should preserve the old snapshot, apply one protocol across the full corpus, and publish a bridge showing how the scale changed.",
                styles,
                fill=TEAL_LIGHT,
                accent=TEAL,
            ),
            Spacer(1, 12),
            Paragraph(
                "<i>Scores are AI-generated estimates of argumentative performance. This report audits their comparability; it does not convert revisable judgments into final verdicts.</i>",
                styles["caption"],
            ),
            PageBreak(),
        ]
    )

    # 2. Technical summary
    story.extend(
        [
            Paragraph("Technical summary", styles["h1"]),
            Paragraph(
                "<b>The corpus shows a clear assessment-generation discontinuity.</b> The later generation is lower on the overall score, lower on every move-level dimension, more internally correlated, and far more densely tagged. No single diagnostic proves a scale change. Together, however, they form a coherent pattern that a uniform-scale assumption does not explain well.",
                styles["body"],
            ),
            metric_strip(
                [
                    ("-3.16", "later-minus-earlier mean overall side-score difference"),
                    ("26 of 31", "repeated speakers who score lower in the later generation"),
                    ("7.2×", "later-generation rhetorical-tag rate relative to earlier"),
                ],
                styles,
            ),
            Spacer(1, 10),
            Paragraph("What the evidence supports", styles["h2"]),
            bullet(
                "A global severity shift is plausible: the later generation's mean is 3.16 points lower, and a debate-level bootstrap interval runs from -4.28 to -1.99 points.",
                styles,
            ),
            bullet(
                "The pattern is not solely a different cast of speakers: the same 31 named speakers average 2.81 points lower later, and 26 of the 31 shift downward.",
                styles,
            ),
            bullet(
                "The internal meaning of the six numbers may also have changed: one common quality component explains 71.4% of later-generation move variance, versus 56.9% earlier.",
                styles,
            ),
            bullet(
                "Tag prevalence is strongly audit-generation dependent: 2.5% of earlier move cards, 18.2% of later cards, and 29.5% of public-only cards carry tags.",
                styles,
            ),
            Paragraph("What the evidence does not establish", styles["h2"]),
            bullet(
                "It does not show that the later generation is less accurate. A stricter, more coherent scale could be an improvement.",
                styles,
            ),
            bullet(
                "It does not isolate a causal protocol effect because generation, chronology, topic mix, and debate selection change together.",
                styles,
            ),
            bullet(
                "It does not invalidate within-debate margins. Both sides of a debate are judged under the same generation, so paired comparisons cancel much of a global level shift.",
                styles,
            ),
            callout(
                "Decision rule",
                "Treat the present corpus as <b>internally paired but not fully exchangeable across assessment generations</b>. Use score margins for same-debate comparisons. Stratify or calibrate analyses that compare absolute scores, dimensions, speakers, or tags across generations.",
                styles,
            ),
            PageBreak(),
        ]
    )

    # 3. Conceptual definition
    story.extend(
        [
            Paragraph("What would it mean for every assessment to be on the same scale?", styles["h1"]),
            Paragraph(
                "A score scale is comparable when the same performance would receive approximately the same score regardless of when or through which production route it was assessed. The requirement is not exact numerical identity: even good human judges vary. The requirement is that the interpretation of a point remains stable enough that an 82 in one generation means roughly what an 82 means in another.",
                styles["body"],
            ),
            Paragraph(
                "This report tests four observable consequences of that idea. If the scale is stable, generation alone should not produce a large level shift after allowing for changes in debate mix; repeated speakers should not move overwhelmingly in one direction; the six dimensions should retain broadly similar relationships; and non-score annotations should not be mistaken for comparable frequencies when their audit coverage changed.",
                styles["body"],
            ),
            data_table(
                ["Diagnostic", "Question", "What would count as concern?"],
                [
                    ["Score level", "Are later absolute scores systematically higher or lower?", "A sizable cohort difference that is not a one-bin anomaly"],
                    ["Repeated speakers", "Do people appearing in both generations shift together?", "A strong directional imbalance across the bridge speakers"],
                    ["Dimension structure", "Do the six rubric scores relate to one another similarly?", "Large correlation or common-factor changes"],
                    ["Annotation coverage", "Are rhetorical tags applied with similar density?", "Large generation-linked differences in tagging rate"],
                ],
                [92, 183, CONTENT_W - 275],
                styles,
                first_bold=True,
            ),
            Spacer(1, 9),
            Paragraph("Uniformity is not the same as objectivity", styles["h2"]),
            Paragraph(
                "A perfectly uniform system can be uniformly mistaken, and a changed system can be more accurate. The audit therefore asks a measurement question, not a metaphysical one: <i>are the numbers directly comparable?</i> It cannot decide which generation is closer to an ideal objective judgment without an external reference such as expert human ratings, repeated model runs, or a deliberately rescored bridge sample.",
                styles["body"],
            ),
            callout(
                "Why this matters",
                "A three-point shift can change speaker rankings, apparent trends, dimension averages, and threshold counts even when the relative result inside each debate is unchanged. A corpus can therefore remain useful for paired analysis while becoming misleading for pooled absolute comparisons.",
                styles,
                fill=GOLD_LIGHT,
                accent=GOLD,
            ),
            PageBreak(),
        ]
    )

    # 4. Scope and cohorts
    story.extend(
        [
            Paragraph("The corpus contains two locked-ledger generations", styles["h1"]),
            Paragraph(
                f"The public site contains {corpus['published_assessments']} debate assessments. Of these, {corpus['locked_ledgers']} have machine-readable locked ledgers and are included in the score-scale tests; the remaining {corpus['public_without_locked_ledger']} are included only in the public tag-coverage audit. Across the locked ledgers, the analysis covers {corpus['locked_moves']:,} scored moves and 424 side-level overall scores.",
                styles["body"],
            ),
            data_table(
                ["Generation", "Assessment numbers", "Debates", "Moves", "Mean side score", "Score SD"],
                [
                    ["Earlier closed-findings", f"{closed['number_min']}-{closed['number_max']}", str(closed["debates"]), f"{closed['moves']:,}", f"{closed['mean_side_score']:.2f}", f"{closed['side_score_sd']:.2f}"],
                    ["Later standalone", f"{standalone['number_min']}-{standalone['number_max']}", str(standalone["debates"]), f"{standalone['moves']:,}", f"{standalone['mean_side_score']:.2f}", f"{standalone['side_score_sd']:.2f}"],
                    ["Public without ledger", "Earlier numbers", "16", "210 public cards", "Not audited", "Not audited"],
                ],
                [132, 82, 48, 78, 86, CONTENT_W - 426],
                styles,
                first_bold=True,
            ),
            Spacer(1, 10),
            Paragraph("The named model and rubric are constant", styles["h2"]),
            Paragraph(
                "All 212 locked ledgers identify the assessment model as <b>5.6 Sol</b> and the rubric as <b>Slugfester Reassessment Rubric v2</b>. This is important: the observed discontinuity is not explained by a changed label in those two fields. The record format and production route do change, however. Earlier adapters expose closed precision, calibration, charity, and response findings; later standalone ledgers preserve two isolated judgments and their final resolved dimension values.",
                styles["body"],
            ),
            Paragraph("Move mix changed, but not in every respect", styles["h2"]),
            Paragraph(
                f"Constructive moves account for {closed['constructive_share']:.1%} of earlier moves and {standalone['constructive_share']:.1%} of later moves. By contrast, the share assigned the highest importance level is almost identical: {closed['importance_3_share']:.1%} earlier and {standalone['importance_3_share']:.1%} later. The constructive-move shift is a genuine composition difference and one reason the raw cohort mean cannot be interpreted as a pure protocol effect.",
                styles["body"],
            ),
            callout(
                "Critical confounding",
                "Every earlier-generation ledger is numbered 195 or below, and every later-generation ledger is numbered 196 or above. Generation is therefore perfectly tied to assessment order. Topic, speaker, source quality, and debate selection may also differ. The report diagnoses comparability risk; it does not claim a clean experiment.",
                styles,
                fill=RUST_LIGHT,
                accent=RUST,
            ),
            PageBreak(),
        ]
    )

    # 5. Score levels
    story.extend(
        [
            Paragraph("Later assessments sit about three points lower", styles["h1"]),
            Paragraph(
                f"The central level result is simple: the earlier generation averages {closed['mean_side_score']:.2f}, while the later generation averages {standalone['mean_side_score']:.2f}. The later-minus-earlier difference is {difference['estimate']:.2f} points. Resampling whole debates 20,000 times gives a 95% interval from {difference['ci_95'][0]:.2f} to {difference['ci_95'][1]:.2f} points.",
                styles["body"],
            ),
            score_level_chart(closed, standalone),
            Paragraph(
                "Figure 1. The bars show absolute means on the full 0-100 scale. The interval is calculated on debate-level means so the two sides of one debate remain together during resampling. Source: 212 locked assessment ledgers.",
                styles["caption"],
            ),
            Paragraph(
                "The spread of side scores is almost unchanged—standard deviations of 5.01 in both generations—so the most obvious difference is location rather than overall dispersion. This resembles a stricter or lower-centered ruler more than a wholesale expansion or compression of the published overall-score range.",
                styles["body"],
            ),
            callout(
                "Interpretation",
                "A common downward level shift does not by itself damage winner calls or margins: subtracting one side from the other cancels it. It does damage comparisons that read an absolute 78 in a later assessment as directly weaker than an 81 in an earlier one without calibration.",
                styles,
            ),
            PageBreak(),
        ]
    )

    # 6. Chronology
    story.extend(
        [
            Paragraph("The change is abrupt at the generation boundary", styles["h1"]),
            Paragraph(
                "The difference is not created by a smooth decline across the whole publication sequence. The last earlier block, assessments 176-195, averages 82.66. The first later block, 196-205, averages 75.90. Subsequent later blocks recover part of that drop but remain below the earlier-generation mean.",
                styles["body"],
            ),
            sequence_chart(results["score_bins"]),
            Paragraph(
                "Figure 2. Each bar averages both sides in the locked ledgers available for the labeled assessment-number block. The vertical scale is intentionally focused and explicitly labeled so the discontinuity is legible without implying that the scores approach zero.",
                styles["caption"],
            ),
            Paragraph(
                "The abrupt boundary supports a generation-linked explanation, but it also sharpens the confounding problem. The first ten standalone debates could simply be a harder or weaker set. The rebound from 75.90 to values around 78.6-80.0 shows that the initial block is not the entire later-generation story. This is why the repeated-speaker bridge is essential.",
                styles["body"],
            ),
            callout(
                "Not a time-series causal claim",
                "Assessment numbers record publication order, not repeated measurements of one stable population. The bars show where the scale discontinuity appears; they do not prove that time or the protocol caused it.",
                styles,
                fill=GOLD_LIGHT,
                accent=GOLD,
            ),
            PageBreak(),
        ]
    )

    # 7. Repeated speakers
    story.extend(
        [
            Paragraph("Repeated speakers reproduce most of the downward shift", styles["h1"]),
            Paragraph(
                f"Thirty-one named speakers appear in both assessment generations. Their average later-minus-earlier change is {repeated['mean_difference']:.2f} points, and the median is {repeated['median_difference']:.1f}. Twenty-six score lower later and five score higher. Under an equal-probability sign model, a split at least this imbalanced has a two-sided probability of {repeated['exact_two_sided_sign_probability']:.6f}.",
                styles["body"],
            ),
            speaker_bridge_chart(repeated["rows"]),
            Paragraph(
                "Figure 3. Each value compares a speaker's mean overall side score in the later generation with that same speaker's earlier-generation mean. The figure uses all bridge speakers, not a selected subset. Source: 31 speakers across the 212 locked assessments.",
                styles["caption"],
            ),
            PageBreak(),
        ]
    )

    # 8. Bridge interpretation
    story.extend(
        [
            Paragraph("The bridge weakens—but does not remove—the selection objection", styles["h1"]),
            Paragraph(
                "The repeated-speaker comparison is the most useful internal control because it holds speaker identity constant. Its -2.81-point average shift is close to the raw -3.16-point cohort difference. William Lane Craig, Alex O'Connor, John Lennox, Matt Dillahunty, Richard Dawkins, Bart Ehrman, and other heavily represented speakers all contribute to the bridge.",
                styles["body"],
            ),
            data_table(
                ["Speaker", "Earlier mean", "Later mean", "Difference", "Earlier / later debates"],
                [
                    [row["speaker"], f"{row['closed_mean']:.1f}", f"{row['standalone_mean']:.1f}", f"{row['difference']:+.1f}", f"{row['closed_debates']} / {row['standalone_debates']}"]
                    for row in repeated["rows"][:10]
                ],
                [145, 76, 74, 72, CONTENT_W - 367],
                styles,
                first_bold=True,
            ),
            Spacer(1, 8),
            Paragraph("Why the bridge is still not a matched experiment", styles["h2"]),
            Paragraph(
                "A repeated speaker is not a repeated performance. The speaker may face a different opponent, motion, role, format, date, or evidential burden. Many bridge estimates also rest on one later debate. The sign imbalance is therefore evidence against a pure speaker-composition explanation, not a clean estimate of what the production route would do to identical content.",
                styles["body"],
            ),
            Paragraph("The outliers matter in both directions", styles["h2"]),
            Paragraph(
                "Ross Douthat shifts -13 points, while Tyler Vela shifts +7. These cases are reminders that individual debate content can dominate any general severity tendency. A calibration adjustment should therefore be estimated from many rescored debates or identical move inventories, not mechanically applied to every speaker as a fixed three-point correction.",
                styles["body"],
            ),
            callout(
                "Best reading",
                "The bridge makes a genuine generation effect more plausible, because most of the raw cohort gap survives after holding names constant. It cannot tell us whether that effect comes from stricter judging, changed move inventories, new aggregation behavior, debate difficulty, or some combination.",
                styles,
            ),
            PageBreak(),
        ]
    )

    # 9. Dimensions
    story.extend(
        [
            Paragraph("Every rubric dimension is lower in the later generation", styles["h1"]),
            Paragraph(
                "The level shift is not confined to one rubric component. Later-generation means are lower on logical coherence, evidence and warrant, responsiveness, relevance and burden, precision and clarity, and calibration and charity. The largest raw move-level differences are responsiveness (-4.39), precision and clarity (-4.16), and evidence and warrant (-3.69).",
                styles["body"],
            ),
            dimension_dumbbell_chart(results["dimension_summary"]),
            Paragraph(
                "Figure 4. Dots show unweighted move-level means. The scale is focused from 64 to 90 and every value is labeled. These are descriptive move aggregates, not debate-paired causal effects.",
                styles["caption"],
            ),
            Paragraph(
                "The uniform direction is consistent with a global severity change, but the unequal magnitudes show that a simple constant subtraction may be insufficient. If the later route is especially strict about response contact or precision, a one-number calibration could preserve overall means while still distorting dimension-level comparisons.",
                styles["body"],
            ),
            callout(
                "Composition check",
                "The share of highest-importance moves is nearly identical across generations, but the later ledgers contain more constructive moves. Move-level differences therefore mix judgment behavior with a changed inventory. Debate-paired or identical-inventory rescoring is needed for calibration.",
                styles,
                fill=GOLD_LIGHT,
                accent=GOLD,
            ),
            PageBreak(),
        ]
    )

    # 10. Internal structure
    story.extend(
        [
            Paragraph("The six dimensions behave more like one general score later", styles["h1"]),
            Paragraph(
                "Scale comparability concerns not only the mean but also the structure of the measure. In the earlier ledgers, relevance and burden is almost independent of logical coherence, evidence and warrant, precision, and calibration. In the later standalone ledgers, relevance and burden correlates from 0.40 to 0.78 with those same dimensions.",
                styles["body"],
            ),
            correlation_chart(results["correlations"]),
            Paragraph(
                "Figure 5. The later-generation gold dots show much stronger coupling between relevance/burden and every other dimension. The same pattern remains when the calculation is restricted to moves by speakers represented in both generations.",
                styles["caption"],
            ),
            Paragraph(
                f"A principal-component analysis reaches the same conclusion. The first common component explains {pca['closed']['first_component_share']:.1%} of standardized dimension variance earlier and {pca['standalone']['first_component_share']:.1%} later. This is compatible with a stronger overall-quality or 'halo' factor in the standalone judgments, although it could also reflect a more coherent latent construct or differences in the kinds of moves inventoried.",
                styles["body"],
            ),
            callout(
                "Why this is more than a three-point shift",
                "If dimensions have become more tightly coupled, the later six-number profile may not be merely lower; it may encode argumentative quality differently. Cross-generation factor analysis and dimension-ranking claims should therefore be stratified even after mean adjustment.",
                styles,
            ),
            PageBreak(),
        ]
    )

    # 11. Tags
    story.extend(
        [
            Paragraph("Rhetorical-tag frequency is plainly generation dependent", styles["h1"]),
            Paragraph(
                f"Only {tags[0]['tagged_move_rate']:.1%} of earlier-generation public move cards carry a rhetorical tag, compared with {tags[1]['tagged_move_rate']:.1%} in the later generation. That is a {results['tag_rate_ratio_standalone_to_closed']:.1f}-fold difference. The 16 public assessments without locked ledgers have the highest rate, {tags[2]['tagged_move_rate']:.1%}.",
                styles["body"],
            ),
            tag_rate_chart(tags),
            Paragraph(
                "Figure 6. Tagged-move prevalence is based on the current public rendering, not on the locked dimension ledgers. It measures annotation coverage as presently published and does not imply that later debates objectively contain seven times as much rhetoric.",
                styles["caption"],
            ),
            Paragraph(
                "The likely explanation is at least partly procedural: later debates received a more explicit post-publication rhetorical-tag audit. Whatever the cause, pooled tag counts are not directly comparable across publication generations. A topical or ideological group concentrated in later debates can appear more rhetoric-heavy simply because those debates were examined more aggressively for tags.",
                styles["body"],
            ),
            callout(
                "Consequence for the slogan paper",
                "The earlier slogan-risk paper's primary result uses closed, side-blind rubric findings and within-debate comparisons, not raw public tags. Its restricted tag corroboration should nevertheless be read as audit-dependent and rechecked after a uniform corpus-wide tag pass.",
                styles,
                fill=RUST_LIGHT,
                accent=RUST,
            ),
            PageBreak(),
        ]
    )

    # 12. Implications
    story.extend(
        [
            Paragraph("Which conclusions remain safe, and which need calibration?", styles["h1"]),
            Paragraph(
                "The audit does not force a choice between trusting the corpus and discarding it. Different questions have different exposure to a generation shift. The safest analyses compare two sides scored inside the same debate. The most exposed analyses compare absolute levels or annotation frequencies across publication cohorts.",
                styles["body"],
            ),
            data_table(
                ["Use of the data", "Current status", "Reason"],
                [
                    ["Within-debate winner and margin", "Relatively robust", "Both sides share the same assessment generation; a common level shift largely cancels"],
                    ["Theist vs non-theist paired mean gap", "Relatively robust", "Primary estimate is computed inside debates, though dimension-specific generation sensitivity should be reported"],
                    ["Absolute speaker averages across all debates", "Use caution", "A speaker's cohort mix can move the mean by several points"],
                    ["Absolute score trends by assessment number", "Not directly comparable", "The 195/196 boundary coincides with a level break"],
                    ["Pooled dimension means or factor structure", "Stratify by generation", "Dimension levels and correlations both change"],
                    ["Raw rhetorical-tag prevalence", "Do not pool naively", "Tag audit coverage differs by roughly sevenfold"],
                ],
                [162, 102, CONTENT_W - 264],
                styles,
                first_bold=True,
            ),
            Spacer(1, 9),
            Paragraph("The 6.35-point theist/non-theist result is not explained away", styles["h2"]),
            Paragraph(
                "The previously reported 6.35-point non-theist advantage is a within-debate difference. A generation-wide downward shift applied to both sides cannot create that advantage. It remains possible that generation interacts with side, topic, or argument type, so the paired gap should be reported separately by assessment generation as a sensitivity check. But this audit supplies no basis for simply subtracting 3.16 from one worldview and not the other.",
                styles["body"],
            ),
            callout(
                "Practical policy",
                "Every corpus-level paper should state whether its estimand is within-debate, within-generation, or cross-generation. When absolute scores or tags are pooled, generation must appear as a stratification variable, calibration term, or explicit limitation.",
                styles,
            ),
            PageBreak(),
        ]
    )

    # 13. Limitations and robustness
    story.extend(
        [
            Paragraph("Robust evidence, incomplete identification", styles["h1"]),
            Paragraph(
                "Three results make the comparability concern difficult to dismiss: the overall level break, the repeated-speaker sign imbalance, and the changed correlation structure. Three limitations prevent a stronger causal verdict: no identical debates were independently scored under both generations, the cohorts are chronologically separated, and the public tag audits were not applied uniformly.",
                styles["body"],
            ),
            data_table(
                ["Check", "Result", "Interpretive value"],
                [
                    ["Debate-level bootstrap", "-3.16; 95% interval -4.28 to -1.99", "Shows the score-level difference is not driven by treating two sides as independent"],
                    ["Repeated-speaker bridge", "26/31 lower; mean -2.81", "Reduces concern that different speaker casts explain the whole gap"],
                    ["Importance mix", "73.6% vs 73.3% importance-3", "Rules out a large shift in this one move-composition feature"],
                    ["Constructive mix", "23.2% vs 36.5% constructive", "Confirms another material inventory difference remains"],
                    ["Repeated-speaker correlations", "Same relevance-coupling discontinuity", "Shows the structural change is not only different speaker identity"],
                    ["Ledger integrity", "No missing dimensions or within-debate duplicate IDs", "Supports the mechanical completeness of the analyzed records"],
                ],
                [140, 135, CONTENT_W - 275],
                styles,
                first_bold=True,
            ),
            Spacer(1, 9),
            Paragraph("Unmeasured alternatives", styles["h2"]),
            bullet("Later debates may be intrinsically harder, more conversational, or less polished.", styles),
            bullet("The later inventory process may select more vulnerable or more granular moves from the same transcript.", styles),
            bullet("A stronger two-judgment consensus process may be stricter and more holistic rather than less reliable.", styles),
            bullet("Early derived precision and calibration values may have discretization properties that affect correlations.", styles),
            bullet("The public-only assessments cannot enter the scale analysis because their locked dimension ledgers are unavailable.", styles),
            callout(
                "Verdict strength",
                "The evidence warrants <b>strong concern about direct cross-generation comparability</b>, but only <b>provisional attribution</b> of that concern to the production-route change. The decisive study is a bridge rescore of identical debates and locked move inventories.",
                styles,
                fill=GOLD_LIGHT,
                accent=GOLD,
            ),
            PageBreak(),
        ]
    )

    # 14. Reassessment cycle
    story.extend(
        [
            Paragraph("A roughly twice-yearly reassessment cycle can repair the scale", styles["h1"]),
            Paragraph(
                "SLUGFESTER treats AI assessment as revisable measurement, not a one-time oracle. The intended practice is to rerun the corpus roughly twice per year when model improvements are meaningful enough to promise more accurate, consistent, and objective judgments. 'Objective' here means better constrained by shared evidence, explicit rules, repeatability, and disagreement checks—not freedom from every interpretive judgment.",
                styles["body"],
            ),
            Paragraph("Requirements for the next full rerun", styles["h2"]),
            bullet("Freeze the transcript, event, and move-inventory inputs so score changes can be attributed to judging rather than source drift.", styles),
            bullet("Apply one model configuration, rubric, aggregation rule, and rhetorical-tag protocol to the entire live corpus.", styles),
            bullet("Use two isolated judgments plus explicit adjudication thresholds, preserving the individual ratings and the resolution path.", styles),
            bullet("Publish a versioned snapshot rather than overwriting prior scores without an archive.", styles),
            bullet("Report old-versus-new score bridges for debates, speakers, dimensions, and tags, including uncertainty and outliers.", styles),
            bullet("Retain stable identifiers so every published move can be compared across assessment generations.", styles),
            Paragraph("If a full rerun is temporarily too expensive", styles["h2"]),
            Paragraph(
                "Rescore a preregistered bridge sample spanning early and late assessments, theist and non-theist motions, high- and low-scoring debates, common speakers, and multiple formats. Use the exact old move inventory as one arm and a newly inventoried arm as another. This separates judgment-scale drift from inventory drift and gives an empirical calibration before the full corpus is refreshed.",
                styles["body"],
            ),
            Paragraph("Questions the next bridge must answer", styles["h2"]),
            bullet("Does the later judging system score the exact same locked moves lower, and by how much?", styles),
            bullet("Does a newly generated move inventory explain the stronger dimension coupling?", styles),
            bullet("Does any score shift interact with worldview, motion type, speaker, or debate role?", styles),
            bullet("Which assessment vintage better agrees with blinded expert-human judgments?", styles),
            callout(
                "Why scheduled reruns matter",
                "A recurring reassessment policy converts this paper's limitation into a testable maintenance program. Each new model generation can be evaluated against the same locked evidence, and each public paper can name the assessment vintage on which it rests.",
                styles,
                fill=TEAL_LIGHT,
                accent=TEAL,
            ),
            PageBreak(),
        ]
    )

    # 15. Method and reproducibility
    story.extend(
        [
            Paragraph("Method and reproducibility", styles["h1"]),
            Paragraph(
                "The analysis loads every JSON adapter in <b>docs/assessment-ledgers</b>. Earlier adapters expose closed findings from which precision/clarity and calibration/charity are deterministically reconstructed under the repository's published scoring rules. Later adapters point to standalone final ledgers that contain the resolved six dimensions directly. Overall side scores are read from each adapter's calculated output.",
                styles["body"],
            ),
            Paragraph(
                "Public rhetorical-tag coverage is counted from the currently published debate objects in <b>src/data/debates.js</b>. A move card is tagged if its tags array contains at least one item. This public annotation audit is deliberately separate from the locked score analysis.",
                styles["body"],
            ),
            data_table(
                ["Output", "Purpose"],
                [
                    ["analysis.py", "Loads the corpus, normalizes both ledger generations, validates records, and calculates every statistic"],
                    ["results.json", "Machine-readable full result set used to build this paper"],
                    ["cohort-summary.csv", "Debate, move, overall-score, and move-mix summaries by generation"],
                    ["dimension-summary.csv", "Move-level means and standard deviations for all six dimensions"],
                    ["repeated-speaker-bridge.csv", "All 31 speaker-level cross-generation comparisons"],
                    ["correlation-diagnostics.csv", "Relevance/burden correlations for all moves and repeated-speaker moves"],
                    ["tag-coverage.csv", "Published move-card tag counts and rates by generation"],
                    ["score-bins.csv", "Assessment-number block means used in Figure 2"],
                ],
                [150, CONTENT_W - 150],
                styles,
                first_bold=True,
            ),
            Spacer(1, 8),
            Paragraph("Statistical details", styles["h2"]),
            Paragraph(
                "The mean-level interval uses 20,000 seeded bootstrap samples of whole-debate mean scores, separately within each generation. The repeated-speaker directional check is an exact two-sided sign probability over the 31 nonzero differences. Correlations are Pearson correlations. Principal-component shares are calculated from the standardized six-dimension covariance matrix. These inferential summaries describe the observed corpus and do not convert the nonrandom debate selection into a population sample.",
                styles["body"],
            ),
            Paragraph("Source snapshot", styles["h2"]),
            Paragraph(
                f"Report date: September 1, 2026. Repository commit: {escape(results['snapshot_commit'])}. Public assessments: 228. Locked-ledger assessments: 212. Locked moves: 4,449. Public move cards: 4,659.",
                styles["body"],
            ),
            PageBreak(),
        ]
    )

    # 16. Conclusion
    story.extend(
        [
            Paragraph("Conclusion: preserve the paired evidence, retire the uniform-scale assumption", styles["h1"]),
            Paragraph(
                "The answer to the title question is <b>not yet</b>. The published assessments share a named model, a named rubric, and a 0-100 display, but those labels do not guarantee measurement equivalence. At the point where the locked-ledger production generation changes, mean overall scores fall by 3.16 points. The same speakers fall by 2.81 points on average. Every dimension moves downward. The dimensions also become substantially more interdependent, and rhetorical-tag coverage changes by a factor of seven.",
                styles["conclusion"],
            ),
            Paragraph(
                "No one fact is decisive. Debate selection can move a cohort mean; repeat speakers face different opponents; correlations can change with inventory; tags reflect explicit audit effort. Yet the convergence is too systematic to ignore. The responsible position is neither that the corpus is invalid nor that every score is timelessly interchangeable. It is that the corpus contains <b>valuable paired judgments produced in distinguishable measurement generations</b>.",
                styles["body"],
            ),
            Paragraph(
                "That distinction protects the strongest existing findings. A non-theist/theist margin calculated inside each debate is far less vulnerable to a common severity shift than an absolute speaker ranking or a pooled tag rate. At the same time, it demands discipline: name the generation, stratify absolute comparisons, and do not treat annotation density as behavior density without uniform auditing.",
                styles["body"],
            ),
            Spacer(1, 7),
            callout(
                "Strong final verdict",
                "<b>SLUGFESTER should continue using the present assessments for within-debate comparison, but it should stop presenting cross-generation absolute scores and tag frequencies as automatically commensurable.</b> The next model-enabled corpus rerun should be treated as a formal measurement recalibration: one locked evidence base, one judging protocol, one tag audit, archived vintages, and a published bridge between them.",
                styles,
                fill=TEAL_LIGHT,
                accent=TEAL,
            ),
            Spacer(1, 11),
            Paragraph(
                "The intended roughly twice-yearly reassessment cycle is therefore not cosmetic maintenance. It is the mechanism by which the project can become progressively more accurate and objective while remaining honest about change. A revisable score is credible when the revision is transparent, reproducible, and calibrated against what came before.",
                styles["conclusion"],
            ),
            Spacer(1, 12),
            SectionRule(color=TEAL),
            Spacer(1, 10),
            Paragraph(
                "<b>Recommended citation:</b> SLUGFESTER. <i>Are All Slugfester Assessments on the Same Scale? Evidence of a Scoring-Generation Discontinuity Across 228 Published Debate Assessments.</i> Corpus-level analysis report, September 1, 2026.",
                styles["caption"],
            ),
        ]
    )
    return story


def build_pdf() -> Path:
    register_fonts()
    styles = make_styles()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(
        LEFT,
        BOTTOM,
        CONTENT_W,
        PAGE_H - TOP - BOTTOM,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="body",
    )
    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Are All Slugfester Assessments on the Same Scale?",
        author="SLUGFESTER",
        subject="Corpus-level audit of assessment-generation comparability",
        creator="SLUGFESTER corpus-level analysis pipeline",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame], onPage=first_page, autoNextPageTemplate="body"),
            PageTemplate(id="body", frames=[frame], onPage=later_page),
        ]
    )
    doc.build(build_story(results, styles))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
