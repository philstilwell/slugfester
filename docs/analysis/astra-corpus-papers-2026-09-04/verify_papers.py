#!/usr/bin/env python3
"""Numerical, source-link, font, page-boundary, and rendering checks."""
import concurrent.futures
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse,unquote
from PIL import Image,ImageOps,ImageDraw
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];TMP=ROOT/'tmp/pdfs/astra-edition-qa'
TMP.mkdir(parents=True,exist_ok=True)
R=json.loads((HERE/'results.json').read_text());D=json.loads((HERE/'debates.json').read_text())
PUB=json.loads((HERE/'publication-manifest.json').read_text())
SOURCE=json.loads((HERE/'source-manifest.json').read_text())
for entry in SOURCE['files']:
    assert hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest()==entry['sha256'],entry['path']
for entry in PUB:
    assert hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest()==entry['sha256'],entry['path']
vector_figures=list((HERE/'figures').glob('*.pdf'))
assert len(vector_figures)==31
for figure in vector_figures:
    fonts=subprocess.check_output(['pdffonts',str(figure)],text=True)
    for line in fonts.splitlines()[2:]:
        assert line.split()[-5]=='yes',(figure.name,'Figure font not embedded',line)
assert len(D)==253 and len({d['id'] for d in D})==253
rel=[d for d in D if d['theist_side']]; locked=[d for d in D if d['cohort']!='unlocked']
assert len(rel)==187 and len(locked)==237
assert abs(sum(d['gap'] for d in rel)/187-R['p1']['gap']['mean'])<1e-12
assert abs(sum(d['con']-d['pro'] for d in locked)/237-R['p4']['raw']['mean'])<1e-12
assert sum(t['n'] for t in R['p2']['topics'])==187
assert sum(t['positive'] for t in R['p2']['topics'])==160
assert R['p5']['losses_without_fallacy']==150 and R['p5']['decisive']==243
assert sum(R['p5']['tag_inventory'].values())==354
assert abs(sum(R['p1']['contributions'].values())+R['p1']['rounding']+R['p1']['adjustment']-R['p1']['gap']['mean'])<1e-10
ids={d['id'] for d in D};seen_urls=set()
for src in (HERE/'manuscripts').glob('*.md'):
    text=src.read_text()
    assert not re.search(r'\b(TODO|TBD|FIXME)\b',text)
    for url in re.findall(r'\]\((https?://[^\s)]+)\)',text):
        seen_urls.add(url);p=urlparse(url)
        if p.hostname=='slugfester.com' and p.path.startswith('/debate/'):
            assert unquote(p.path.split('/')[2]) in ids,(src,url)
        if p.hostname=='github.com' and '/tree/main/' in p.path:
            assert (ROOT/p.path.split('/tree/main/')[1]).exists(),(src,url)

def inspect(pub):
    path=ROOT/pub['path'];pdf=PdfReader(path);text='\n'.join(p.extract_text() for p in pdf.pages)
    page_ids={p.indirect_reference.idnum for p in pdf.pages}
    for page in pdf.pages:
        for ref in page.get('/Annots',[]):
            annot=ref.get_object()
            if annot.get('/Subtype')!='/Link':continue
            if '/Dest' in annot:
                assert annot['/Dest'][0].idnum in page_ids,(path.name,'Invalid internal link')
            if '/A' in annot:
                action=annot['/A']
                assert action.get('/S')=='/URI' and urlparse(action['/URI']).scheme in ['https','http'],(path.name,'Invalid external link')
    assert len(pdf.pages)==pub['pages']
    assert 'September 4, 2026' in text and '253' in text
    assert 'Executive summary' in text and 'Methods and sources' in text
    assert '\ufffd' not in text and '{{' not in text
    fonts=subprocess.check_output(['pdffonts',str(path)],text=True)
    for line in fonts.splitlines()[2:]:
        fields=line.split();assert fields[-5]=='yes', (path.name,'Font not embedded',line)
    bbox=subprocess.check_output(['pdftotext','-bbox',str(path),'-'])
    tree=ET.fromstring(bbox);boundary=[];page_stats=[]
    for i,page in enumerate(tree.findall('.//{*}page'),1):
        w,h=float(page.attrib['width']),float(page.attrib['height']);ws=page.findall('.//{*}word')
        for word in ws:
            a=word.attrib
            if float(a['xMin'])<0 or float(a['xMax'])>w+.5 or float(a['yMin'])<0 or float(a['yMax'])>h+.5:boundary.append((i,word.text,a))
        page_stats.append(dict(page=i,words=len(ws),images=len(pdf.pages[i-1].images)))
    assert not boundary,(path.name,boundary[:5])
    out=TMP/f"paper-{pub['id']:02d}";out.mkdir(exist_ok=True)
    subprocess.run(['pdftoppm','-r','85','-png',str(path),str(out/'page')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    digits=len(str(len(pdf.pages)))
    imgs=[out/f'page-{i:0{digits}d}.png' for i in range(1,len(pdf.pages)+1)]
    thumb_w=224;thumb_h=290;cols=3;rows=(len(imgs)+2)//3
    sheet=Image.new('RGB',(cols*(thumb_w+16)+16,rows*(thumb_h+29)+16),'#E5EAED');draw=ImageDraw.Draw(sheet)
    for i,p in enumerate(imgs):
        im=Image.open(p).convert('RGB');im.thumbnail((thumb_w,thumb_h));x=16+(i%cols)*(thumb_w+16);y=16+(i//cols)*(thumb_h+29)
        sheet.paste(im,(x,y));draw.text((x,y+thumb_h+4),f"Paper {pub['id']} / page {i+1}",fill='#17354B')
    sheet.save(TMP/f"paper-{pub['id']:02d}-contact.png")
    return dict(paper=pub['id'],pages=len(pdf.pages),fonts_fully_embedded=True,page_boundaries_pass=True,
                link_destinations_valid=True,
                pdf_links=len([a for p in pdf.pages for a in p.get('/Annots',[]) if a.get_object().get('/Subtype')=='/Link']),page_stats=page_stats)

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:qa=list(pool.map(inspect,PUB))
report=dict(status='Automated checks passed; rendered pages require visual review',papers=qa,
            total_pages=sum(p['pages'] for p in qa),unique_source_links=len(seen_urls),source_link_targets_valid=True,
            numerical_reconciliation=True,source_hashes_verified=len(SOURCE['files']),publication_hashes_verified=len(PUB),
            vector_figures_fonts_embedded=len(vector_figures),render_directory=str(TMP))
(HERE/'qa-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='papers'},indent=2))
