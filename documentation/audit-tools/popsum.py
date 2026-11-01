import re,os,json,sys,html
from html.parser import HTMLParser
root,outp=sys.argv[1],sys.argv[2]
class Q(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.h=[];s.labels=[];s.btns=[];s.sels=[];s.inputs=[];s.th=[];s.stack=[];s.buf='';s.mode=None;s.cursel=None;s.sub=[]
        s.skip=0
    def handle_starttag(s,tag,a):
        a=dict(a);cl=a.get('class','') or ''
        if tag in('script','style'): s.skip+=1
        if tag in('h2','h3','h4'): s.mode='h';s.buf=''
        elif tag=='label': s.mode='l';s.buf=''
        elif tag=='button': s.mode='b';s.buf=''
        elif tag=='th': s.mode='th';s.buf=''
        elif tag=='select': s.cursel=dict(id=a.get('id') or a.get('name') or '',lab=s.labels[-1] if s.labels else '',opts=[])
        elif tag=='option' and s.cursel is not None: s.mode='o';s.buf=''
        elif tag in('input','textarea') and a.get('type') not in('hidden','radio','checkbox'):
            s.inputs.append(((s.labels[-1] if s.labels else '')+'|'+(a.get('placeholder') or a.get('id') or a.get('type','text'))+('*' if 'required' in a or 'data-rq' in a or 'data-required' in a else '')))
        elif tag in('input',) and a.get('type') in('radio','checkbox'):
            s.inputs.append(a.get('type')+':'+(a.get('value') or a.get('name') or ''))
    def handle_endtag(s,tag):
        if tag in('script','style'): s.skip=max(0,s.skip-1)
        t=' '.join(s.buf.split())
        if tag in('h2','h3','h4') and s.mode=='h':
            if t: s.h.append(t)
            s.mode=None
        elif tag=='label' and s.mode=='l':
            if t: s.labels.append(t)
            s.mode=None
        elif tag=='button' and s.mode=='b':
            if t: s.btns.append(t[:50])
            s.mode=None
        elif tag=='th' and s.mode=='th':
            if t: s.th.append(t)
            s.mode=None
        elif tag=='option' and s.mode=='o':
            s.cursel['opts'].append(t);s.mode=None
        elif tag=='select' and s.cursel is not None:
            s.sels.append(s.cursel);s.cursel=None
    def handle_data(s,x):
        if s.skip: return
        if s.mode: s.buf+=x
out=open(outp,'w',encoding='utf-8')
for r,_,fs in sorted(os.walk(root)):
    for f in sorted(fs):
        p=os.path.join(r,f);rel=os.path.relpath(p,root).replace('\\','/')
        t=open(p,encoding='utf-8').read()
        m=re.search(r'window\.PROTO=(\{.*?\});</script>',t,re.S)
        if not m: continue
        d=json.loads(m.group(1)); pops=d.get('popups',{})
        if not pops: continue
        out.write('\n#### %s  (%d popups)\n'%(rel,len(pops)))
        seen=set()
        for k,v in pops.items():
            q=Q();q.feed(v if isinstance(v,str) else ' '.join(str(x) for x in (v.values() if isinstance(v,dict) else v)))
            title=' / '.join(q.h) or '(untitled)'
            title=re.sub(r'\b[A-Z]{1,5}[-_]?\d[\w\-]*','#',title)  # collapse ids
            lab=list(dict.fromkeys(q.labels))
            sig=(title,tuple(lab),tuple(q.btns),tuple(q.th))
            if sig in seen: continue
            seen.add(sig)
            line='- [%s] %s'%(k,title)
            if lab: line+=' | LABELS: '+'; '.join(lab[:40])
            if q.inputs: line+=' | INPUTS: '+'; '.join(list(dict.fromkeys(q.inputs))[:30])
            if q.sels: line+=' | SEL: '+'; '.join('%s=%s'%(s['lab'] or s['id'],','.join(s['opts'][:10])) for s in q.sels[:12])
            if q.th: line+=' | COLS: '+', '.join(q.th[:30])
            if q.btns: line+=' | BTNS: '+', '.join(list(dict.fromkeys(q.btns))[:14])
            out.write(line+'\n')

