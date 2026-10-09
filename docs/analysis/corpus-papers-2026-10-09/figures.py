"""Data-derived chart labels, plotting inputs, and reading guides for this edition."""
import json
from pathlib import Path
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE=Path(__file__).resolve().parent
R=json.loads((HERE/'results.json').read_text())
D=json.loads((HERE/'debates.json').read_text())
M=json.loads((HERE/'moves.json').read_text())
S=json.loads((HERE.parent/'direct-slogan-study-2026-09-04/light-results.json').read_text())
FIG=HERE/'figures';FIG.mkdir(exist_ok=True)
INK='#17354B';TEAL='#137D82';RED='#B8603A';GREY='#637581';LIGHT='#DCE4E8'
for f in ['Arial.ttf','Arial Bold.ttf']:font_manager.fontManager.addfont('/System/Library/Fonts/Supplemental/'+f)
plt.rcParams.update({'font.family':'Arial','font.size':10,'text.color':INK,'axes.labelcolor':INK,'xtick.color':GREY,'ytick.color':INK,'axes.edgecolor':LIGHT,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.titleweight':'bold','axes.titlesize':13,'axes.titlepad':16,'pdf.fonttype':42})
DIM=list(R['p1']['dimensions']);LABEL=['Logic','Support','Replies','Task','Clarity','Care'];CONTRACTS=[]
FOREST='Dots show averages; lines contain the middle 95% from 20,000 repeated draws of the stated records. Zero means no average difference. These ranges describe sensitivity to the saved observations, not all sources of judging error or a representative population.'
def save(fig,key,title,unit,scope,source,reading):
    fig.savefig(FIG/f'{key}.png',dpi=220,bbox_inches='tight',pad_inches=.2,facecolor='white')
    fig.savefig(FIG/f'{key}.pdf',bbox_inches='tight',pad_inches=.2,facecolor='white');plt.close(fig)
    CONTRACTS.append(dict(id=key,title=title,unit=unit,scope=scope,source=source,reading_key=reading))
def forest(key,title,labels,values,cis,unit,scope,source,reading=FOREST):
    fig,ax=plt.subplots(figsize=(7.5,max(3.3,.48*len(labels)+1.2)))
    low=min(0,min(a for a,b in cis));high=max(0,max(b for a,b in cis));span=high-low or 1
    for i,(v,ci) in enumerate(zip(values,cis)):
        ax.plot(ci,[i,i],color=TEAL,lw=2);ax.scatter(v,i,c=TEAL,s=38,zorder=3)
        ax.text(high+span*.04,i,f'{v:.2f}',va='center',fontweight='bold',fontsize=10)
    ax.set_yticks(range(len(labels)),labels);ax.invert_yaxis();ax.set_xlim(low-span*.05,high+span*.2);ax.axvline(0,c=GREY,lw=.8)
    ax.set_title(title,loc='left');ax.set_xlabel(unit);ax.grid(axis='x',color=LIGHT,lw=.6);ax.set_axisbelow(True);fig.tight_layout()
    save(fig,key,title,unit,scope,source,reading)
def bars(key,title,labels,values,unit,scope,source,reading,colors=None,percent=False):
    fig,ax=plt.subplots(figsize=(7.5,max(3.2,.47*len(labels)+1.1)))
    ax.barh(range(len(labels)),values,color=colors or TEAL,height=.6);ax.set_yticks(range(len(labels)),labels);ax.invert_yaxis()
    high=100 if percent else max(values)*1.2
    for i,v in enumerate(values):ax.text(v+high*.013,i,f'{v:.1f}%' if percent else f'{v:g}',va='center',fontsize=10,fontweight='bold')
    ax.set_xlim(0,high);ax.set_title(title,loc='left');ax.set_xlabel(unit);ax.grid(axis='x',color=LIGHT,lw=.6);ax.set_axisbelow(True);fig.tight_layout()
    save(fig,key,title,unit,scope,source,reading)

p=R['p1'];n=p['gap']['n']
forest('p1-dimensions','Differences across six scoring areas',LABEL,[p['dimensions'][k]['mean'] for k in DIM],[p['dimensions'][k]['ci'] for k in DIM],'Non-theist minus religious-side score (area points)',f'{n} paired, officially weighted comparisons',p['dimensions'],FOREST+' Right of zero favors the skeptical side. These are area scores before weighting, not additive contributions.')
keys=['september_snapshot','new_since_september','narrow','earlier','later','theist_con','without_four_frequent_skeptics','without_new_origin_cases']
labels=['September comparison set','New since September','Narrower truth claims','Earlier process','Later process','Religious side is CON','Four frequent skeptics removed','Two new origins cases removed']
forest('p1-checks','The difference is smaller in the additions',[f'{l} ({p["sensitivity"][k]["n"]})' for k,l in zip(keys,labels)],[p['sensitivity'][k]['mean'] for k in keys],[p['sensitivity'][k]['ci'] for k in keys],'Non-theist minus religious-side score (points)','Counts shown per row; overlapping selections',p['sensitivity'],FOREST+' Parentheses count comparisons. Rows overlap and are not independent replications.')
bars('p1-decomposition','Where the overall score difference comes from',LABEL,[round(p['contributions'][k],3) for k in DIM],'Contribution to overall score gap (points)',f'{n} comparisons; official weights',p['contributions'],'Bar lengths show additive weighted contributions, not independent causes. The small rounding residual and any burden adjustment reconcile their sum with the overall gap; both are reported in the text.')
p=R['p2'];ts=sorted(p['topics'],key=lambda x:-x['mean'])
forest('p2-topics','Topic gaps: ordering remains uncertain',[f'{x["topic"]} ({x["n"]})' for x in ts],[x['mean'] for x in ts],[x['ci'] for x in ts],'Non-theist minus religious-side score (points)',f'{n} comparisons across eight research topics',ts,FOREST+' Counts are in parentheses. These stable research groups are not the current browsing categories.')
keys=['all','major','constructive','reply'];ls=['All moves','High-importance moves','Constructive moves','Replies'];mv=[p['move_subsets'][k]['dimensions']['evidenceWarrant'] for k in keys]
forest('p2-moves','Support gap by kind of assessed move',[f'{l} ({v["n"]})' for l,v in zip(ls,mv)],[v['mean'] for v in mv],[v['ci'] for v in mv],'Non-theist minus religious-side support (area points)','Both sides must contain the stated move kind; equal debate weights',mv,FOREST+' Each side’s qualifying moves are averaged before comparing sides. Rows overlap; these are not official weighted overall scores.')
bars('p2-order','How often does each topic have the largest gap?',[x['topic'] for x in ts],[100*x['highest_resample_share'] for x in ts],'Share of repeated calculations (%)','20,000 separate within-topic resamples',ts,'Each bar counts calculations in which the topic has the highest gap. This is a stability exercise, not the probability that it is truly the hardest topic in the wider world.',percent=True)

# Historical direct counts remain distinct from the new score-based warning rule.
stats=S['statistics']['all'];fig,axs=plt.subplots(1,2,figsize=(8,3.4))
for ax,key,title in zip(axs,['unsupported','protected_slogan'],['Unsupported slogans','Also protected from criticism']):
    ss=stats[key];vals=[ss['theist_equal_debate_rate'],ss['non_theist_equal_debate_rate']]
    ax.barh([0,1],vals,color=[RED,TEAL],height=.55);ax.set_yticks([0,1],['Theist','Non-theist']);ax.invert_yaxis();ax.set_xlim(0,1.2)
    ax.set_title(title,fontsize=11);ax.set_xlabel('Uses per 10,000 words')
    for i,v in enumerate(vals):ax.text(v+.035,i,f'{v:.2f}',va='center',fontweight='bold')
fig.tight_layout(w_pad=3)
save(fig,'p3-direct-rates','Historical direct review: September 5, 2026','Uses per 10,000 attributed words','187 previously reviewed transcripts, not the expanded archive',stats,'Rust is theist; teal is non-theist. Each debate receives equal weight after allowing for speech length. Both panels start at zero on the same scale. Protected slogans are a subset of unsupported slogans; do not add them. These dated counts have not been extended to new transcripts.')
forest('p3-direct-uncertainty','The narrower historical finding is clearer',['Unsupported slogans','Protected slogans'],[stats[k]['mean_gap'] for k in ['unsupported','protected_slogan']],[stats[k]['gap_ci'] for k in ['unsupported','protected_slogan']],'Theist minus non-theist uses per 10,000 words','187 historical transcript reviews',stats,FOREST+' The unsupported-slogan range crosses zero; the protected-slogan range does not. Both use the September direct annotations, not new scorecard judgments.')
proxy=R['p3']['proxy'];forest('p3-proxy','Current scores: a separate warning pattern',[f'{k.capitalize()} ({proxy[k]["paired_pp"]["n"]})' for k in ['earlier','later','all']],[proxy[k]['paired_pp']['mean'] for k in ['earlier','later','all']],[proxy[k]['paired_pp']['ci'] for k in ['earlier','later','all']],'Religious minus skeptical flagged share (percentage points)','Support <70, clarity <80 and care <80 together; not direct slogan detection',proxy,FOREST+' A flag requires all three score thresholds on the same move. A low score does not demonstrate a criticism-blocking slogan. Never combine these percentages with the transcript word rates.')

p=R['p4'];cross=len(p['cross_speakers']);vals=[p['raw']['mean'],p['orientation_balanced']['mean'],p['same_speaker_equal']['mean'],p['same_speaker_weighted']['estimate']];cis=[p[k]['ci'] for k in ['raw','orientation_balanced','same_speaker_equal','same_speaker_weighted']]
forest('p4-estimates','Role estimates answer different questions',[f'All comparable debates ({p["raw"]["n"]})','Religious orientations balanced 50/50',f'Same speakers, equal weight ({cross})',f'Same speakers, weighted ({cross})'],vals,cis,'CON minus PRO score (points)','Debate draws for first two rows; speaker draws for last two',p,FOREST+' Right of zero favors CON. The weighted same-speaker range is now above zero, but no comparison randomly assigns roles, opponents or topics.')
keys=['theist_pro','theist_con','outside'];ss=p['strata'];forest('p4-strata','The positions matter to the role contrast',[f'{l} ({ss[k]["n"]})' for k,l in zip(keys,['Religious side is PRO','Religious side is CON','Other comparisons'])],[ss[k]['mean'] for k in keys],[ss[k]['ci'] for k in keys],'CON minus PRO score (points)','Non-overlapping groups of comparable debates',ss)

p=R['p5'];co=p['cohorts'];labels=[f'Whole archive: {p["losses_without_fallacy"]} / {p["decisive"]}']+[f'{l}: {co[k]["no_fallacy"]} / {co[k]["n"]}' for k,l in [('earlier','Earlier process'),('later','Later process'),('unlocked','Other formats')]]
bars('p5-cohorts','Lower-scoring sides with no named-fallacy tag',labels,[100*p['losses_without_fallacy']/p['decisive']]+[100*co[k]['no_fallacy']/co[k]['n'] for k in co],'Share of decisive assessments (%)',f'{p["decisive"]} decisive assessments; {p["ties"]} ties excluded',p,'Fractions count lower-scoring sides without a fallacy label over all decisive results in each group. The dark total includes the other groups. No tag does not mean no error. Counts are assessments, including the disclosed shared-video pair.',colors=[INK,TEAL,RED,GREY],percent=True)
b=p['untagged_locked'];bars('p5-dimensions','Untagged losses can be weaker across many areas',[f'{i} of 6 areas' for i in range(6,-1,-1)],[b['behind_distribution'].get(str(i),0) for i in range(6,-1,-1)],'Number of lower-scoring sides',f'{b["n"]} comparable untagged losses',b,'Each bar counts losses with no named-fallacy label that trail in exactly the stated number of weighted scoring areas. Bars add to the eligible total; these are not independent deficiencies.')
tags=sorted(p['tag_inventory'].items(),key=lambda x:-x[1]);bars('p5-labels','What the accepted labels actually record',[k for k,v in tags],[v for k,v in tags],'Public label instances',f'{sum(v for k,v in tags)} labels on {p["tagged_moves"]} moves',p['tag_inventory'],'A move may carry several labels, so label instances exceed tagged moves. The six names are the accepted inventory in this snapshot, not an exhaustive catalogue of reasoning errors.')

p=R['p6'];br=p['bridge'];fig,ax=plt.subplots(figsize=(6.8,4.7));lo=min(min(x['earlier'],x['later']) for x in br)-2;hi=max(max(x['earlier'],x['later']) for x in br)+2
ax.plot([lo,hi],[lo,hi],c=GREY,ls='--');ax.scatter([x['earlier'] for x in br],[x['later'] for x in br],c=TEAL,s=30,alpha=.7);ax.set_xlim(lo,hi);ax.set_ylim(lo,hi)
ax.set_title(f'{len(br)} returning speakers across the two processes',loc='left');ax.set_xlabel('Earlier-process mean score');ax.set_ylabel('Later-process mean score');fig.tight_layout()
save(fig,'p6-bridge','Returning speakers across assessment processes','Average score points','One dot per person appearing in both groups',br,'The horizontal coordinate is the earlier average and the vertical coordinate the later average. Below the diagonal means lower later. Both axes enlarge the observed score range. These are different performances, not the same debate judged twice.')
co=p['cohorts'];forest('p6-levels','Average debate score by assessment process',[f'{k.capitalize()} ({co[k]["debates"]})' for k in co],[co[k]['midpoints']['mean'] for k in co],[co[k]['midpoints']['ci'] for k in co],'Average of the two sides (score points)','One equally weighted midpoint per comparable debate',co)
bars('p6-tags','Any fallacy or bias tag, by assessment process',[f'{k.capitalize()} ({co[k]["moves"]} moves)' for k in co],[co[k]['tag_pct'] for k in co],'Tagged moves (%)','Pooled move counts, not equal debate rates',co,'A move counts once if it has any fallacy or bias tag. Bar length is the percentage of all moves in that process. Different annotation rates can reflect procedure as well as different arguments.',colors=[TEAL,RED],percent=True)
score_use={k:{c:dict(sorted(Counter(m['dimensions'][k] for m in M if m['cohort']==c).items())) for c in co} for k in ['precisionClarity','relevanceBurden']}
fig,axs=plt.subplots(1,2,figsize=(7.8,3.8),sharey=True)
for ax,k,label in zip(axs,score_use,['Clarity','Task']):
    for c,color,offset in [('earlier',TEAL,-.23),('later',RED,.23)]:
        cnt=score_use[k][c];den=sum(cnt.values());ax.bar(np.array(list(cnt))+offset,[100*v/den for v in cnt.values()],width=.46,color=color,label=f'{c.capitalize()}: {len(cnt)} marks')
    ax.set_xlim(0,100);ax.set_ylim(0,70);ax.set_title(label);ax.set_xlabel('Exact area score / 100');ax.legend(fontsize=8,frameon=False,loc='upper left')
axs[0].set_ylabel('Share of moves (%)');fig.tight_layout()
save(fig,'p6-score-use','The same scale can use different score vocabularies','Share of moves at each exact mark','All comparable moves, grouped by process',score_use,'Teal is earlier; rust is later. Each bar shows the share of moves assigned that exact area score. Both panels use identical axes. More distinct marks mean finer numerical resolution, not necessarily better judgments.')

p=R['p7'];rr=p['ranking'];g=p['ranked_speakers'];top=rr[:15];fig,ax=plt.subplots(figsize=(7.8,6.2))
for i,r in enumerate(top):
    ax.plot(r['empirical_rank_ci'],[i-.12]*2,c=TEAL,lw=2);ax.plot(r['model_rank_ci'],[i+.12]*2,c=RED,lw=2,ls='--');ax.scatter(r['rank'],i,c=INK,s=20)
ax.set_yticks(range(len(top)),[f'{r["speaker"]} ({r["n"]})' for r in top]);ax.invert_yaxis();ax.set_xlim(.5,max(r['model_rank_ci'][1] for r in top)+2)
ax.set_title('Leading averages have overlapping rank ranges',loc='left');ax.set_xlabel(f'Rank in the fixed {g}-speaker field (1 = highest)');ax.plot([],[],c=TEAL,label='Resampled ranks');ax.plot([],[],c=RED,ls='--',label='Model ranks');ax.legend(loc='upper right',frameon=False);ax.grid(axis='x',color=LIGHT);ax.set_axisbelow(True);fig.tight_layout()
save(fig,'p7-ranges','Leading averages have overlapping rank ranges','Rank positions',f'Highest 15 means shown; all {g} eligible people included in calculation',top,'Dark dots are displayed places. Teal lines contain the middle 95% of ranks obtained by drawing again from recorded scores. Dashed rust lines use a model allowing variation estimated across the group. Parentheses count appearances. Neither line is a future-win probability.')
ac=p['appearance_counts'];bands=[('1',lambda n:n==1),('2',lambda n:n==2),('3–5',lambda n:3<=n<=5),('6–10',lambda n:6<=n<=10),('11+',lambda n:n>=11)]
bars('p7-samples','Most people still have limited evidence',[l+' appearances' for l,f in bands],[sum(v for k,v in ac.items() if f(int(k))) for l,f in bands],'Number of people',f'{p["all_speakers"]} people, {p["appearances"]} eligible appearances',ac,'Gray bars are below the three-appearance research threshold; teal bars enter the fixed field. A small sample is not a poor score.',colors=[GREY,GREY,TEAL,TEAL,TEAL])
widths=[r['model_rank_ci'][1]-r['model_rank_ci'][0] for r in rr];fig,ax=plt.subplots(figsize=(7.5,3.8));ax.scatter([r['n'] for r in rr],widths,c=TEAL,s=35,alpha=.8)
ax.set_xlim(0,max(r['n'] for r in rr)+2);ax.set_ylim(0,max(widths)+3);ax.set_xlabel('Eligible appearances');ax.set_ylabel('Width of 95% model rank range');ax.set_title('More evidence helps; crowded averages still overlap',loc='left');fig.tight_layout()
save(fig,'p7-counts-width','More evidence helps; crowded averages still overlap','Appearances / rank positions',f'All {g} ranked people',rr,'Each dot is a person. Height is the upper rank endpoint minus the lower: 2–9 has width 7. Lower means a narrower calculated range, not a lower performance score. Rank density and score variation matter as well as sample size.')
(HERE/'chart-contracts.json').write_text(json.dumps(CONTRACTS,indent=2,ensure_ascii=False)+'\n')
(HERE/'figure-reading-keys.json').write_text(json.dumps({c['id']:c['reading_key'] for c in CONTRACTS},indent=2,ensure_ascii=False)+'\n')
(HERE/'revision-checks.json').write_text(json.dumps({'exact_score_counts':score_use},indent=2)+'\n')
print(f'Created {len(CONTRACTS)} figures with data-derived labels and reading keys.')
