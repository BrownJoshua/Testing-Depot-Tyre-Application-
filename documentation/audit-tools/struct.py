import re,os,json,sys
from html.parser import HTMLParser
root,out=sys.argv[1],sys.argv[2]
os.makedirs(out,exist_ok=True)
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.stack=[];s.txt=[];s.d=dict(title='',h=[],tables=[],labels=[],fields=[],buttons=[],tabs=[],modals=[],selects=[],scripts_n=0)
        s.cur_table=None;s.in_th=False;s.th_buf='';s.cur_btn=None;s.btn_buf='';s.cur_h=None;s.h_buf='';s.cur_label=None;s.lab_buf='';s.cur_sel=None;s.opt=None;s.opt_buf='';s.skip=0;s.ttl=False;s.cur_tab=None;s.tab_buf=''
        s.th_depth=0;s.last_table_ctx=''
    def handle_starttag(s,tag,a):
        a=dict(a);cl=a.get('class','') or ''
        if tag in('script','style'): s.skip+=1; s.d['scripts_n']+=tag=='script'; return
        if tag=='title': s.ttl=True
        if tag in('h1','h2','h3','h4'): s.cur_h=tag;s.h_buf=''
        if tag=='table': s.cur_table=dict(cols=[],id=a.get('id',''),cls=cl,ctx=s.last_table_ctx)
        if tag=='th' and s.cur_table is not None: s.in_th=True;s.th_buf=''
        if tag=='button' or 'btn' in cl.split() or a.get('role')=='button' or 'tab' in cl.split() or 'chip' in cl.split():
            if tag=='button' or 'btn' in cl.split(): s.cur_btn=dict(cls=cl,id=a.get('id',''),onclick=(a.get('onclick') or '')[:80],data={k:v for k,v in a.items() if k.startswith('data-')});s.btn_buf=''
        if tag=='label': s.cur_label=1;s.lab_buf=''
        if tag in('input','textarea'):
            if a.get('type') not in('hidden',):
                s.d['fields'].append(dict(tag=tag,type=a.get('type','text'),id=a.get('id',''),name=a.get('name',''),ph=a.get('placeholder',''),val=(a.get('value') or '')[:30],req=('required' in a),ro=('readonly' in a),dis=('disabled' in a),label=s.d['labels'][-1] if s.d['labels'] else ''))
        if tag=='select':
            s.cur_sel=dict(id=a.get('id',''),name=a.get('name',''),opts=[],label=s.d['labels'][-1] if s.d['labels'] else '')
        if tag=='option' and s.cur_sel is not None: s.opt=1;s.opt_buf=''
        if re.search(r'\b(modal|ov|drawer)',cl) and a.get('id'): s.d['modals'].append(a['id'])
        if any(c in cl.split() for c in('tab','tabs-i','sub-tab','st-tab','seg')) or a.get('role')=='tab':
            s.cur_tab=1;s.tab_buf=''
    def handle_endtag(s,tag):
        if tag in('script','style'): s.skip=max(0,s.skip-1); return
        if tag=='title': s.ttl=False
        if s.cur_h and tag==s.cur_h:
            t=' '.join(s.h_buf.split())
            if t: s.d['h'].append((tag,t))
            s.cur_h=None
        if tag=='th' and s.in_th:
            s.in_th=False;t=' '.join(s.th_buf.split())
            if s.cur_table is not None and t!='' : s.cur_table['cols'].append(t)
        if tag=='table' and s.cur_table is not None:
            if s.cur_table['cols']: s.d['tables'].append(s.cur_table)
            s.cur_table=None
        if tag=='button' or (s.cur_btn and tag in('a','div','span')):
            if s.cur_btn is not None:
                t=' '.join(s.btn_buf.split())
                if t or s.cur_btn['id']: s.d['buttons'].append(dict(text=t[:60],id=s.cur_btn['id'],onclick=s.cur_btn['onclick'],data=s.cur_btn['data']))
                s.cur_btn=None
        if tag=='label' and s.cur_label:
            t=' '.join(s.lab_buf.split())
            if t: s.d['labels'].append(t)
            s.cur_label=None
        if tag=='option' and s.opt: s.cur_sel['opts'].append(' '.join(s.opt_buf.split())); s.opt=None
        if tag=='select' and s.cur_sel is not None:
            s.d['selects'].append(s.cur_sel); s.cur_sel=None
        if s.cur_tab and tag in('button','a','div','span'):
            t=' '.join(s.tab_buf.split())
            if t: s.d['tabs'].append(t[:60])
            s.cur_tab=None
    def handle_data(s,x):
        if s.skip: return
        if s.ttl: s.d['title']+=x
        if s.cur_h: s.h_buf+=x
        if s.in_th: s.th_buf+=x
        if s.cur_btn is not None: s.btn_buf+=x
        if s.cur_label: s.lab_buf+=x
        if s.opt: s.opt_buf+=x
        if s.cur_tab: s.tab_buf+=x
        if not s.skip:
            t=x.strip()
            if t and len(t)<60: s.last_table_ctx=t
for r,_,fs in os.walk(root):
    for f in sorted(fs):
        p=os.path.join(r,f);rel=os.path.relpath(p,root).replace('\\','/')
        t=open(p,encoding='utf-8').read()
        t=re.sub(r'<tbody.*?</tbody>',lambda m:m.group(0)[:0],t,flags=re.S) if False else t
        ps=P();ps.feed(t)
        d=ps.d
        # dedupe
        d['tabs']=list(dict.fromkeys(d['tabs']))
        seen=set();bt=[]
        for b in d['buttons']:
            k=(b['text'],b['id'])
            if k in seen: continue
            seen.add(k);bt.append(b)
        d['buttons']=bt
        d['size']=len(t)
        o=os.path.join(out,rel.replace('/','__')+'.json')
        json.dump(d,open(o,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('done')
