import re,json,sys
t=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'window\.PROTO=(\{.*?\});</script>',t,re.S)
d=json.loads(m.group(1))
for k,v in d['popups'].items():
    print('POPUP',k,len(v)); print(re.sub(r'\s+',' ',v)[:1200]); print()
