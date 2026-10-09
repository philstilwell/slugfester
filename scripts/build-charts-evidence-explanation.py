"""Typeset the source-backed Charts explanation with embedded TrueType fonts.

Requires reportlab. Run from any directory. No remote services or image generation.
"""
from pathlib import Path
import json, re, html
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/charts/evidence-explanation-2026-10-08'
OUT = ROOT / 'output/pdf/slugfester-evidence-faith-and-ai-bias.pdf'
A = json.loads((SOURCE / 'analysis.json').read_text())
FONT = Path('/System/Library/Fonts/Supplemental')
if FONT.exists():
    font_files = {'Body':'Georgia.ttf','BodyBold':'Georgia Bold.ttf','BodyItalic':'Georgia Italic.ttf',
                  'BodyBoldItalic':'Georgia Bold Italic.ttf','UI':'Arial.ttf','UIBold':'Arial Bold.ttf','UIItalic':'Arial Italic.ttf'}
else:
    FONT = Path('/usr/share/fonts/truetype/dejavu')
    font_files = {'Body':'DejaVuSerif.ttf','BodyBold':'DejaVuSerif-Bold.ttf','BodyItalic':'DejaVuSerif-Italic.ttf',
                  'BodyBoldItalic':'DejaVuSerif-BoldItalic.ttf','UI':'DejaVuSans.ttf','UIBold':'DejaVuSans-Bold.ttf','UIItalic':'DejaVuSans-Oblique.ttf'}
for name, filename in font_files.items():
    pdfmetrics.registerFont(TTFont(name, str(FONT / filename)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='BodyItalic',boldItalic='BodyBoldItalic')
pdfmetrics.registerFontFamily('UI',normal='UI',bold='UIBold',italic='UIItalic',boldItalic='UIBold')
INK=colors.HexColor('#172422'); TEAL=colors.HexColor('#367b76'); CORAL=colors.HexColor('#bb503f')
MUTED=colors.HexColor('#576662'); LINE=colors.HexColor('#d3deda'); PAPER=colors.HexColor('#f6f8f6'); GOLD=colors.HexColor('#daa843')
W,H=612,792; M=48; WIDTH=W-2*M
styles = {
 'body':ParagraphStyle('Body',fontName='Body',fontSize=10.1,leading=14.3,textColor=INK,spaceAfter=9,allowWidows=0,allowOrphans=0),
 'h1':ParagraphStyle('H1',fontName='UIBold',fontSize=22,leading=26,textColor=INK,spaceAfter=17,keepWithNext=True),
 'cover':ParagraphStyle('Cover',fontName='UIBold',fontSize=31,leading=35,textColor=INK,spaceAfter=12,keepWithNext=True),
 'h2':ParagraphStyle('H2',fontName='UIBold',fontSize=12.5,leading=16,textColor=TEAL,spaceBefore=6,spaceAfter=9,keepWithNext=True),
 'table':ParagraphStyle('Table',fontName='UI',fontSize=9.2,leading=12.3,textColor=INK),
 'tableHead':ParagraphStyle('TableHead',fontName='UIBold',fontSize=8.7,leading=11,textColor=colors.white),
 'note':ParagraphStyle('Note',fontName='UI',fontSize=8.6,leading=11.8,textColor=MUTED,spaceAfter=9),
 'ref':ParagraphStyle('Reference',fontName='Body',fontSize=9.6,leading=13.4,textColor=INK,spaceAfter=13),
}
def inline(s):
    s=s.replace('\u2011','-').replace('\u2013','-').replace('\u2014',' - ')
    s=html.escape(s)
    s=re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',r'<link href="\2" color="#246b66"><u>\1</u></link>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<i>\1</i>',s)
    s=re.sub(r'`([^`]+)`',r'<font name="UI" size="8.3">\1</font>',s)
    s=re.sub(r'\[REF:(\d+)\]',r'<b>[\1]</b>',s)
    return s
def P(s, style='body'):return Paragraph(inline(s),styles[style])
def table(headers, rows, widths):
    data=[[P(str(x),'tableHead') for x in headers]]+[[P(str(x),'table') for x in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'UI'),('BACKGROUND',(0,0),(-1,0),INK),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[PAPER,colors.white]),('LINEBELOW',(0,0),(-1,0),1,TEAL),
        ('LINEBELOW',(0,1),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    return [t,Spacer(1,12)]
def data_block(name):
    if name=='headline':
        e=A['all']['dimensionMeans'][1]['values']; b=A['all']['thresholds'][4]['rates']
        return table(['Recorded measure','Supporting','Challenging'],[
          ['Mean evidence score',f'{e[0]:.1f} / 100',f'{e[1]:.1f} / 100'],
          ['Mean share below 70',f'{b[0]:.1f}%',f'{b[1]:.1f}%'],
          ['Debates with higher evidence mean','38','188']], [266,125,125])
    if name=='dimensions':
        rows=[[x['label'],f"{x['values'][0]:.1f}",f"{x['values'][1]:.1f}",f"{x['values'][1]-x['values'][0]:+.1f}"]for x in A['all']['dimensionMeans']]
        return table(['Dimension','Supporting','Challenging','Difference'],rows,[231,95,100,90])+[P('Table 1. Equal-debate means, all included moves. Difference = challenging minus supporting. All scores use a 0-100 scale. Source: frozen snapshot and calculation record [1, 2].','note')]
    if name=='sensitivity':
        subsets=[('All included debates',A['all']),('Both sides: constructive',A['roles'][0]),('Both sides: replies',A['roles'][1]),('Earlier record format',A['formats'][0]),('Later record format',A['formats'][1])]
        rows=[]
        for label,r in subsets:
            x,y=r['dimensionMeans'][1]['values']; rows.append([label,r['debates'],f'{x:.1f}',f'{y:.1f}',f'{y-x:+.1f}'])
        return table(['Comparison','Debates','Supporting','Challenging','Difference'],rows,[188,57,87,94,90])+[P('Table 2. Evidence means and challenging-minus-supporting differences. The recorded format labels identify methodological subsets for this check, not visitor-facing filters. Source: calculation record [2].','note')]
    raise ValueError(name)

class ThresholdFigure(Flowable):
    def __init__(self):Flowable.__init__(self);self.width=WIDTH;self.height=195
    def draw(self):
        c=self.canv; x0,y0,cw,ch=37,28,459,127
        def point(t,v):return x0+(t-50)/50*cw,y0+v/100*ch
        c.setFont('UIBold',10);c.setFillColor(INK);c.drawString(0,182,'Share of moves below the selected evidence threshold')
        c.setFont('UI',8.4);c.setFillColor(MUTED);c.drawString(0,168,'Equal-debate average (%) · all 226 included debates')
        for v in [0,25,50,75,100]:
            y=point(50,v)[1];c.setStrokeColor(LINE);c.setLineWidth(.4);c.line(x0,y,x0+cw,y)
            c.setFillColor(MUTED);c.setFont('UI',8);c.drawRightString(x0-7,y-3,str(v))
        for t in range(50,101,5):
            x=point(t,0)[0];c.drawCentredString(x,12,str(t))
        c.setStrokeColor(GOLD);c.setLineWidth(1);c.setDash(3,3);x=point(70,0)[0];c.line(x,y0,x,y0+ch);c.setDash()
        for p,color in [(0,TEAL),(1,CORAL)]:
            c.setStrokeColor(color);c.setFillColor(color);c.setLineWidth(1.8)
            pts=[point(t['threshold'],t['rates'][p]) for t in A['all']['thresholds']]
            path=c.beginPath();path.moveTo(*pts[0])
            for xy in pts[1:]:path.lineTo(*xy)
            c.drawPath(path)
            for xy in pts:c.circle(*xy,2.1,stroke=0,fill=1)
        c.setFillColor(TEAL);c.setFont('UIBold',8.5);c.drawString(276,168,'Supporting')
        c.setFillColor(CORAL);c.drawString(348,168,'Challenging')
        c.setFillColor(MUTED);c.drawString(424,168,'Default: 70')

class EmbeddedCanvas(canvas.Canvas):
    def __init__(self,*args,**kw):
        kw['initialFontName']='UI';super().__init__(*args,**kw)

class Document(SimpleDocTemplate):
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and flowable.style.name in ['H1','Cover']:
            title=flowable.getPlainText(); key='section-'+str(self.page)
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,level=0,closed=False)

def chrome(c,doc):
    c.saveState();c.setFillColor(TEAL);c.rect(M,H-35,24,3,fill=1,stroke=0)
    c.setFont('UIBold',8);c.setFillColor(INK);c.drawString(M+32,H-34,'SLUGFESTER')
    c.setFont('UI',7.6);c.setFillColor(MUTED);c.drawRightString(W-M,H-34,'EVIDENCE, FAITH, AND FAIR ASSESSMENT')
    c.setStrokeColor(LINE);c.setLineWidth(.5);c.line(M,40,W-M,40)
    c.setFont('UI',7.5);c.drawString(M,27,'October 8, 2026 · Snapshot revision 2');c.drawRightString(W-M,27,str(doc.page))
    c.restoreState()

story=[]
raw=(SOURCE/'manuscript.md').read_text()
for section_index,section in enumerate(raw.split('<!-- page -->')):
    if section_index:story.append(PageBreak())
    for block in re.split(r'\n\s*\n',section.strip()):
        block=block.strip()
        if not block:continue
        if block.startswith('# '):story.append(P(block[2:],'cover' if section_index==0 else 'h1'))
        elif block.startswith('## '):story.append(P(block[3:],'h2'))
        elif block.startswith('[DATA:'):story.extend(data_block(block[6:-1]))
        elif block=='[FIGURE:threshold]':
            story.extend([ThresholdFigure(),P('Figure 1. Both positions converge at the high end of the slider. These are descriptive shares, not probabilities that a claim is false or confidence intervals. Sources [1, 2].','note')])
        elif block.startswith(('SLUGFESTER ·','Prepared with AI assistance.')):story.append(P(block,'note'))
        elif block.startswith('[REF:'):story.append(P(block,'ref'))
        else:story.append(P(block.replace('\n',' ')))
OUT.parent.mkdir(parents=True,exist_ok=True)
doc=Document(str(OUT),pagesize=(W,H),leftMargin=M,rightMargin=M,topMargin=56,bottomMargin=54,
    title='Evidence, faith, and fair assessment',author='SLUGFESTER',subject='Evidence scores, assessment safeguards, AI bias, and hypotheses about faith',
    pageCompression=1)
doc.build(story,onFirstPage=chrome,onLaterPages=chrome,canvasmaker=EmbeddedCanvas)
print(OUT)
print(f'{OUT.stat().st_size:,} bytes; manuscript {len(raw.split()):,} words')
