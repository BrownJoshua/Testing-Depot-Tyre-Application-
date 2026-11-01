import re,os,json,sys
root=sys.argv[1]
for r,_,fs in os.walk(root):
    for f in sorted(fs):
        p=os.path.join(r,f); t=open(p,encoding='utf-8').read()
        m=re.search(r'window\.PROTO=(\{.*?\});</script>',t,re.S)
        title=re.search(r'<title>(.*?)</title>',t)
        rel=os.path.relpath(p,root).replace('\\','/')
        if m:
            try:
                d=json.loads(m.group(1))
                print(rel,'|',title.group(1) if title else '','| role=',d.get('role'),'| nav=',json.dumps(d.get('nav'))[:300],'| popups=',list(d.get('popups',{}).keys())[:6])
            except Exception as e: print(rel,'PROTO parse fail',e, m.group(1)[:200])
        else: print(rel,'| no PROTO |',title.group(1) if title else '')
