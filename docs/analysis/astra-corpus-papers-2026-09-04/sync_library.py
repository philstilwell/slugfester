#!/usr/bin/env python3
"""Mechanically synchronize published PDF lengths and the download cache version."""
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
papers=json.loads((HERE/'publication-manifest.json').read_text())
app=ROOT/'src/app.js'
text=app.read_text()
for paper in papers:
    pattern=re.compile(r'<article class="backend-report-card">(?:(?!</article>).)*'+re.escape(paper['file']+'.pdf')+r'(?:(?!</article>).)*</article>',re.S)
    matches=list(pattern.finditer(text));assert len(matches)==1,paper['file']
    block=matches[0].group()
    revised,n=re.subn(r'\d+ pages · \d+ figures',f"{paper['pages']} pages · {paper['figures']} figures",block)
    assert n==1,paper['file']
    revised=re.sub(r'\?v=20260904-astra253(?:-r\d+)?', '?v=20260904-astra253-r2',revised)
    text=text[:matches[0].start()]+revised+text[matches[0].end():]
text=re.sub(r'20260904-astra-corpus-253(?:-r\d+)?','20260904-astra-corpus-253-r2',text)
app.write_text(text)
generator=ROOT/'scripts/generate-seo-pages.mjs'
generator.write_text(re.sub(r'20260904-astra-corpus-253(?:-r\d+)?','20260904-astra-corpus-253-r2',generator.read_text()))
print('Synchronized seven card lengths, figure counts, and revision-2 cache keys.')
