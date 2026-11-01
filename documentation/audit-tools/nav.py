import re,os,json,sys
root=sys.argv[1]; seen={}
for r,_,fs in os.walk(root):
    for f in sorted(fs):
        p=os.path.join(r,f); t=open(p,encoding='utf-8').read()
        m=re.search(r'window\.PROTO=(\{.*?\});</script>',t,re.S)
        if not m: continue
        d=json.loads(m.group(1)); role=d.get('role')
        key=(role,json.dumps(d.get('nav'),sort_keys=False))
        seen.setdefault(role,{})
        seen[role][json.dumps(d.get('nav'))]=seen[role].get(json.dumps(d.get('nav')),0)+1
for role,v in seen.items():
    print('=== ROLE',role)
    for nav,c in v.items(): print(c,'pages:',nav)
