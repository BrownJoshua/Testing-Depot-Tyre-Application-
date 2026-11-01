import re,os,json,sys,html
root=sys.argv[1]
pages=set()
for r,_,fs in os.walk(root):
    for f in fs: pages.add(os.path.relpath(os.path.join(r,f),root).replace('\\','/'))
navs={}
for p in pages:
    t=open(os.path.join(root,p),encoding='utf-8').read()
    m=re.search(r'window\.PROTO=(\{.*?\});</script>',t,re.S)
    if m:
        d=json.loads(m.group(1))
        if d['role'] in('ae','ho','sup','tic','tm'):
            for k,v in d['nav'].items(): navs.setdefault(d['role'],{})[k]=v
for role,n in navs.items():
    for k,v in n.items():
        if role+'/'+v not in pages: print('MISSING',role,k,v)
# sidebar nav groups (from tic dashboard / ho / ae / sup)
for p in ['tic/dashboard.html','ho/shift-master.html','ae/norm-master.html','sup/job-management.html']:
    t=open(os.path.join(root,p),encoding='utf-8').read()
    m=re.search(r'<nav id="sbNav">(.*?)</nav>',t,re.S)
    if m:
        seq=re.findall(r'<div class="app-nav-(group|item)[^"]*"[^>]*>(.*?)</div>',m.group(1),re.S)
        print('\nSIDEBAR',p); print(' > '.join(('['+re.sub('<[^>]+>','',b).strip()+']') if a=='group' else re.sub('<[^>]+>','',b).strip() for a,b in seq))
# dashboard text
t=open(os.path.join(root,'tic/dashboard.html'),encoding='utf-8').read()
m=re.search(r'<main class="app-main".*?</main>',t,re.S)
b=re.sub(r'<script.*?</script>','',m.group(0),flags=re.S)
txt=[' '.join(html.unescape(x).split()) for x in re.sub(r'<[^>]+>','\n',b).split('\n')]
print('\nDASHBOARD:',' | '.join(x for x in txt if x)[:2500])
t=open(os.path.join(root,'tic/notifications.html'),encoding='utf-8').read()
m=re.search(r'<main class="app-main".*?</main>',t,re.S)
b=re.sub(r'<script.*?</script>','',m.group(0),flags=re.S)
txt=[' '.join(html.unescape(x).split()) for x in re.sub(r'<[^>]+>','\n',b).split('\n')]
print('\nNOTIF:',' | '.join(x for x in txt if x)[:1800])
