#!/usr/bin/env python3
"""Typeset the seven authored manuscripts. All declared PDF fonts are embedded."""
from __future__ import annotations
import hashlib
import html
import json
import re
from pathlib import Path
from reportlab import rl_config
from reportlab.graphics import shapes
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate,Frame,PageTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Image,KeepTogether,Flowable)
from reportlab.platypus import tables
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUTPUT=ROOT/'output/pdf'
R=json.loads((HERE/'results.json').read_text())
CHARTS={c['id']:c for c in json.loads((HERE/'chart-contracts.json').read_text())}
NAVY=colors.HexColor('#17354B');TEAL=colors.HexColor('#137D82');RUST=colors.HexColor('#B8603A');GREY=colors.HexColor('#637581');LIGHT=colors.HexColor('#DCE4E8');PALE=colors.HexColor('#F3F6F7')
FONT=Path('/System/Library/Fonts/Supplemental')
for name,file in {'Body':'Georgia.ttf','Body-Bold':'Georgia Bold.ttf','Body-Italic':'Georgia Italic.ttf','Body-BoldItalic':'Georgia Bold Italic.ttf','Sans':'Arial.ttf','Sans-Bold':'Arial Bold.ttf','Sans-Italic':'Arial Italic.ttf','Sans-BoldItalic':'Arial Bold Italic.ttf'}.items():
    pdfmetrics.registerFont(TTFont(name,str(FONT/file)))
for name in ['Body','Sans']:pdfmetrics.registerFontFamily(name,normal=name,bold=name+'-Bold',italic=name+'-Italic',boldItalic=name+'-BoldItalic')
rl_config.canvas_basefontname='Sans';shapes.STATE_DEFAULTS['fontName']='Sans';tables._baseFontName='Sans';tables.CellStyle.fontname='Sans'
W,H=612,792;MARGIN=53;CW=W-2*MARGIN
S={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.6,leading=15.7,textColor=NAVY,spaceAfter=8.5,allowWidows=0,allowOrphans=0),
 'methods':ParagraphStyle('methods',fontName='Sans',fontSize=9.4,leading=13.1,textColor=NAVY,spaceAfter=7,allowWidows=0,allowOrphans=0),
 'h1':ParagraphStyle('h1',fontName='Sans-Bold',fontSize=19,leading=23,textColor=NAVY,spaceBefore=18,spaceAfter=11,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='Sans-Bold',fontSize=12.7,leading=17,textColor=TEAL,spaceBefore=13,spaceAfter=6,keepWithNext=True),
 'caption':ParagraphStyle('caption',fontName='Sans',fontSize=8.4,leading=11.9,textColor=GREY,spaceBefore=5,spaceAfter=13),
 'small':ParagraphStyle('small',fontName='Sans',fontSize=8.2,leading=11.5,textColor=NAVY,spaceAfter=4),
 'table':ParagraphStyle('table',fontName='Sans',fontSize=8.8,leading=12,textColor=NAVY),
 'th':ParagraphStyle('th',fontName='Sans-Bold',fontSize=8.4,leading=11.5,textColor=colors.white),
 'box':ParagraphStyle('box',fontName='Sans',fontSize=10,leading=14.5,textColor=NAVY,spaceAfter=4),
 'bullet':ParagraphStyle('bullet',fontName='Body',fontSize=10.6,leading=15.7,textColor=NAVY,leftIndent=13,firstLineIndent=-10,spaceAfter=5,allowWidows=0,allowOrphans=0),
}
META=[
 {'id':1,'file':'why-do-the-theist-sides-score-lower','title':'Why Do the Theist Sides Score Lower?',
  'short':'Where the score gap comes from','subtitle':'A strong test of the substantiation hypothesis—and a careful account of what the scores cannot establish.',
  'stats':[('6.34','mean non-theist advantage\nin score points out of 100'),('187','relevant debate comparisons\nfrom the 253-assessment archive'),('4,086','assessed argumentative moves\nin the position comparison')],
  'finding':'The gap is persistent. Its largest raw dimension difference is in evidence and warrant, while logic, warrant, and replies together account for about three-quarters of the overall score gap.'},
 {'id':2,'file':'where-is-the-theist-disadvantage-largest','title':'Where Is the Theist Disadvantage Largest?',
  'short':'The geography of the score gap','subtitle':'Topics, burdens, and the argumentative transitions where a public case most often falls short.',
  'stats':[('8.27','largest observed topic mean:\nreligion, culture, and meaning'),('3.53','mean gap in resurrection debates:\nthe smallest of eight topic groups'),('187','debates mapped into eight\nexplicitly defined topic groups')],
  'finding':'The largest observed gap concerns religion, culture, and meaning. The more durable lesson is not a league table of topics, but the need to justify the step from an attractive possibility to a preferred explanation.'},
 {'id':3,'file':'are-theist-arguments-more-often-slogan-like','title':'Are Theist Arguments More Often Slogan-Like?',
  'short':'Affirmation, evidence, and escape routes','subtitle':'Testing a measurable pattern of weak warrant and overclaim, with close readings of Lennox and contrasting cases.',
  'stats':[('28.6%','theist moves meeting the\noriginal three-part risk rule'),('7.9%','non-theist moves meeting\nthat same rule'),('146','debates with the required fields;\n187 in a separate score-based check')],
  'finding':'The measured risk pattern is markedly more common on the theist side. It is not a literal census of unfalsifiable slogans, and it does not establish that emotional reinforcement caused the difference.'},
 {'id':4,'file':'does-the-con-side-have-an-inherent-advantage','title':'Does the CON Side Have an Inherent Advantage?',
  'short':'The role, the proposition, or the speaker?','subtitle':'Why a large raw difference is not the same thing as an advantage caused by the debating role.',
  'stats':[('4.70','raw mean CON advantage\nacross 237 comparable debates'),('0.80','weighted same-speaker estimate;\nits interval includes zero'),('31','speakers observed arguing\non both PRO and CON sides')],
  'finding':'The raw role gap is strongly entangled with the people and positions assigned to each side. A smaller residual advantage remains plausible; neither inevitability nor complete absence has been established.'},
 {'id':5,'file':'debates-are-usually-lost-without-a-named-fallacy','title':'Beyond the Fallacy Count',
  'short':'Why a missing label is not an acquittal','subtitle':'Cumulative weaknesses, uneven annotation, and the limits of treating debate as a hunt for named errors.',
  'stats':[('61.7%','lower-scoring sides with\nno named-fallacy tag overall'),('14.5%','the same rate in the\nlater assessment process'),('74.8%','untagged comparable losses that\ntrail on five or six dimensions')],
  'finding':'The archive-wide majority is real, but it reverses in newer assessments. What survives that reversal is the deeper conclusion: named fallacies neither exhaust argument quality nor determine who scores lower.'},
 {'id':6,'file':'are-all-slugfester-assessments-on-the-same-scale','title':'Are All Slugfester Assessments on the Same Scale?',
  'short':'Auditing the measuring instrument','subtitle':'What shifts between assessment processes—and how the next major-model review should test comparability.',
  'stats':[('2.82','point lower mean score\nin the later process'),('45 / 51','repeated speakers whose\nmean score is lower later'),('237','comparable assessments with\n5,282 verified scored moves')],
  'finding':'The score levels, dimension patterns, and tag rates differ enough to make unqualified pooling unsafe. These are warning signs of non-comparability, not proof that a particular process caused the changes.'},
 {'id':7,'file':'do-slugfester-rankings-measure-stable-performance','title':'Do Slugfester Rankings Measure Stable Performance?',
  'short':'A leaderboard with honest uncertainty','subtitle':'Why the broad ordering is informative, exact places are fragile, and a larger sample changes what a ranking means.',
  'stats':[('0.86','median rank correlation\nbetween random halves'),('0.17','median score gap between\nadjacent displayed ranks'),('50','ranked speakers meeting\nthe three-appearance minimum')],
  'finding':'The leaderboard contains a repeatable signal, but its precision is easy to overread. Typical 95% rank ranges span 12 positions under observed-score resampling and 19 under a pooled-variation model.'},
]

def inline(t):
    t=t.replace('\u2011','-').replace('\u2013','-').replace('\u2014',' - ')
    t=html.escape(t,quote=False)
    t=re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',lambda m:f'<link href="{m.group(2).replace(chr(34),"%22")}" color="#137D82">{m.group(1)}</link>',t)
    t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
    t=re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<i>\1</i>',t)
    t=re.sub(r'`([^`]+)`',r'<font name="Sans">\1</font>',t)
    return t

class Cover(Flowable):
    def __init__(self,meta):Flowable.__init__(self);self.meta=meta;self.width=CW;self.height=663
    def draw(self):
        c=self.canv;m=self.meta
        c.setFillColor(TEAL);c.rect(0,642,32,4,stroke=0,fill=1)
        c.setFont('Sans-Bold',9);c.drawString(43,640,'SLUGFESTER  /  CORPUS RESEARCH')
        c.setFillColor(LIGHT);c.setFont('Sans-Bold',78);c.drawRightString(CW,582,f"{m['id']:02d}")
        c.setFillColor(GREY);c.setFont('Sans',9);c.drawString(0,593,'ASTRA-ERA RESEARCH EDITION')
        title=Paragraph(inline(m['title']),ParagraphStyle('coverTitle',fontName='Body-Bold',fontSize=32,leading=37,textColor=NAVY))
        tw,th=title.wrap(CW-30,180);title.drawOn(c,0,555-th)
        sub=Paragraph(inline(m['subtitle']),ParagraphStyle('coverSub',fontName='Sans',fontSize=13,leading=19,textColor=GREY))
        _,sh=sub.wrap(CW-20,150);sub.drawOn(c,0,530-th-sh)
        c.setStrokeColor(LIGHT);c.line(0,289,CW,289)
        for i,(value,label) in enumerate(m['stats']):
            x=i*(CW/3)
            c.setFillColor(TEAL if i!=1 else RUST);c.setFont('Sans-Bold',29);c.drawString(x,247,value)
            p=Paragraph(html.escape(label).replace('\n','<br/>'),ParagraphStyle('metric',fontName='Sans',fontSize=8.5,leading=12,textColor=NAVY));p.wrap(CW/3-12,70);p.drawOn(c,x,210)
        p=Paragraph(inline(m['finding']),ParagraphStyle('coverFinding',fontName='Body',fontSize=11.5,leading=17,textColor=NAVY));_,ph=p.wrap(CW-30,150);p.drawOn(c,0,173-ph)
        c.setFillColor(NAVY);c.setFont('Sans-Bold',9);c.drawString(0,51,'PHIL STILWELL  ·  SLUGFESTER')
        c.setFont('Sans',9);c.drawString(0,34,'September 4, 2026  |  Frozen archive: 253 assessments')
        c.setFillColor(GREY);c.setFont('Sans',8);c.drawString(0,17,'New analysis and writing; not an Astra re-judging of the source debates.')

class Document(BaseDocTemplate):
    def __init__(self,path,meta):
        super().__init__(str(path),pagesize=(W,H),leftMargin=MARGIN,rightMargin=MARGIN,topMargin=52,bottomMargin=48,
          title=meta['title'],author='Phil Stilwell | SLUGFESTER',subject='September 4, 2026; 253-assessment corpus research edition',
          creator='SLUGFESTER research | ReportLab; all fonts embedded',pageCompression=1)
        self.meta=meta;self.addPageTemplates(PageTemplate(id='body',frames=Frame(MARGIN,48,CW,H-100,id='main',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),onPage=self.page))
    def page(self,c,doc):
        if doc.page==1:return
        c.saveState();c.setStrokeColor(LIGHT);c.line(MARGIN,H-35,W-MARGIN,H-35);c.setFillColor(GREY);c.setFont('Sans',8)
        c.drawString(MARGIN,H-25,f"{self.meta['id']:02d}  /  {self.meta['short']}")
        c.drawRightString(W-MARGIN,H-25,'SLUGFESTER RESEARCH')
        c.line(MARGIN,35,W-MARGIN,35);c.drawString(MARGIN,23,'September 4, 2026  ·  253-assessment snapshot');c.drawRightString(W-MARGIN,23,str(doc.page));c.restoreState()
    def afterFlowable(self,f):
        if isinstance(f,Paragraph) and getattr(f,'toc_key',None):
            self.canv.bookmarkPage(f.toc_key);self.canv.addOutlineEntry(f.getPlainText(),f.toc_key,level=0,closed=False)
            self.notify('TOCEntry',(0,f.getPlainText(),self.page,f.toc_key))

def table(rows):
    n=len(rows[0]); widths=[CW/n]*n
    if n==2:widths=[CW*.32,CW*.68]
    elif n>=4:widths=[CW*.35]+[CW*.65/(n-1)]*(n-1)
    body=[[Paragraph(inline(x),S['th' if i==0 else 'table']) for x in row] for i,row in enumerate(rows)]
    t=Table(body,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),
       ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
       ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,-1),(-1,-1),.6,LIGHT)]))
    return t

def expand_metrics(text):
    # {{p1.gap.mean:2}} keeps key headline values linked to the saved analysis.
    def sub(m):
        key,digits=m.group(1),m.group(2);v=R
        for p in key.split('.'):v=v[p] if isinstance(v,dict) else v[int(p)]
        return f'{v:,.{digits}f}' if digits else str(v)
    return re.sub(r'\{\{([\w.]+)(?::(\d+))?\}\}',sub,text)

def parse(meta,text):
    story=[Cover(meta),PageBreak()];lines=expand_metrics(text).splitlines();i=0;fig_count=0;heading=0;in_methods=False
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line=='[[contents]]':
            story+=[PageBreak(),Paragraph('Reader’s guide',S['h1'])]
            toc=TableOfContents();toc.levelStyles=[ParagraphStyle('toc0',fontName='Sans',fontSize=10,leading=15.5,textColor=NAVY,spaceBefore=5,leftIndent=0,firstLineIndent=0,rightIndent=20)]
            story+=[toc,Spacer(1,23),Paragraph('Reading the evidence',S['h2']),Paragraph('Start with the summary and figures for the main argument. The worked examples explain the statistical ideas; the final methods and sources show how the numbers can be checked. Counts and results refer to the frozen September 4 archive, not to later additions to the site.',S['body']),PageBreak()];i+=1;continue
        if line=='[[pagebreak]]':story.append(PageBreak());i+=1;continue
        if line=='[[ranking_table]]':
            rows=[['Speaker','Appearances','Mean','Resampled ranks','Model ranks']]
            for r in R['p7']['ranking']:
                rows.append([r['speaker'],str(r['n']),f"{r['mean']:.2f}",f"{r['empirical_rank_ci'][0]:g}-{r['empirical_rank_ci'][1]:g}",f"{r['model_rank_ci'][0]:g}-{r['model_rank_ci'][1]:g}"])
            story+=[table(rows),Spacer(1,10)];i+=1;continue
        if line.startswith('## '):
            in_methods=line[3:]=='Methods and sources'
            heading+=1;p=Paragraph(inline(line[3:]),S['h1']);p.toc_key=f'p{meta["id"]}-s{heading}';story.append(p);i+=1;continue
        if line.startswith('### '):story.append(Paragraph(inline(line[4:]),S['h2']));i+=1;continue
        m=re.fullmatch(r'!\[([^\]]*)\]\((p\d-[a-z0-9-]+)\)',line)
        if m:
            key=m.group(2);fig_count+=1;img=Image(str(HERE/'figures'/f'{key}.png'))
            fac=min(CW/img.imageWidth,(400 if key=='p7-ranges' else 365)/img.imageHeight);img.drawWidth=img.imageWidth*fac;img.drawHeight=img.imageHeight*fac;img.hAlign='CENTER'
            chart=CHARTS[key];cap=f'<b>Figure {fig_count}.</b> '+inline(m.group(1))+f'<br/><font size="7.6">Scope: {html.escape(chart["scope"])}.</font>'
            story.append(KeepTogether([Spacer(1,5),img,Paragraph(cap,S['caption'])]));i+=1;continue
        if line.startswith('> '):
            parts=[]
            while i<len(lines) and lines[i].strip().startswith('> '):parts.append(lines[i].strip()[2:]);i+=1
            box=Table([[Paragraph(inline(' '.join(parts)),S['box'])]],colWidths=[CW])
            box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LIGHT),('LINEBEFORE',(0,0),(0,-1),3,TEAL),('LEFTPADDING',(0,0),(-1,-1),14),('RIGHTPADDING',(0,0),(-1,-1),14),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]));story+=[Spacer(1,5),box,Spacer(1,13)];continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[x.strip() for x in lines[i].strip().strip('|').split('|')];i+=1
                if all(re.fullmatch(r':?-+:?',x) for x in row):continue
                rows.append(row)
            tab=table(rows);story+=[KeepTogether([tab]) if len(rows)<=10 else tab,Spacer(1,12)];continue
        if line.startswith('- '):story.append(Paragraph('• '+inline(line[2:]),S['bullet']));i+=1;continue
        parts=[line];i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].strip().startswith(('##','> ','|','- ','![','[[')):
            parts.append(lines[i].strip());i+=1
        story.append(Paragraph(inline(' '.join(parts)),S['methods' if in_methods else 'body']))
    # Keep the compact endnotes together rather than leaving a few final lines
    # on an otherwise empty page. The source block is shorter than one page.
    endnote_index=next((j for j,f in enumerate(story) if isinstance(f,Paragraph) and f.getPlainText()=='Methods and sources'),None)
    if endnote_index is not None:story=story[:endnote_index]+[KeepTogether(story[endnote_index:])]
    return story,fig_count

def main():
    OUTPUT.mkdir(parents=True,exist_ok=True);manifest=[]
    for meta in META:
        src=HERE/'manuscripts'/f"{meta['id']:02d}.md";text=src.read_text();path=OUTPUT/(meta['file']+'.pdf')
        story,nfig=parse(meta,text);doc=Document(path,meta);doc.multiBuild(story)
        pdf=PdfReader(path);words=len(re.findall(r'\b\w+\b',expand_metrics(text)))
        manifest.append(dict(**meta,pages=len(pdf.pages),figures=nfig,manuscript_words=words,path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        print(f"Paper {meta['id']}: {len(pdf.pages)} pages, {nfig} figures, {words:,} manuscript words")
    (HERE/'publication-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__':main()
