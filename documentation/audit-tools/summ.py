import json,sys,glob,os
pre=sys.argv[1]; aud=sys.argv[2]; sys.stdout=open(sys.argv[3],'w',encoding='utf-8')
for f in sorted(glob.glob(os.path.join(aud,pre+'__*.json'))):
    d=json.load(open(f,encoding='utf-8'))
    print('\n##',os.path.basename(f)[:-5].replace('__','/'),'|',d['title'])
    hs=[h[1] for h in d['h']][:12]
    if hs: print(' H:',' ; '.join(hs))
    if d['tabs']: print(' TABS:',' | '.join(d['tabs'][:25]))
    for t in d['tables'][:8]: print(' TABLE',t['id'] or '',':',', '.join(t['cols'][:40]))
    lab=list(dict.fromkeys(d['labels']))[:60]
    if lab: print(' LABELS:',' | '.join(lab))
    for s in d['selects'][:25]:
        print(' SEL',s['id'] or s['label'],'=',','.join(s['opts'][:12]))
    fl=[(x['label'] or x['ph'] or x['id'] or x['name'])+('*' if x['req'] else '') for x in d['fields'] if x['type'] not in('checkbox','radio')][:40]
    if fl: print(' INPUTS:',' | '.join(dict.fromkeys(fl)))
    b=list(dict.fromkeys([x['text'] for x in d['buttons'] if x['text']]))[:45]
    if b: print(' BTNS:',' | '.join(b))

