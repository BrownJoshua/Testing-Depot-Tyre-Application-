import re,os,sys,html
root=sys.argv[1]; out=open(sys.argv[2],'w',encoding='utf-8')
for r,_,fs in sorted(os.walk(root)):
    for f in sorted(fs):
        if r.endswith('tm') : continue
        p=os.path.join(r,f);rel=os.path.relpath(p,root).replace('\\','/')
        t=open(p,encoding='utf-8').read()
        m=re.search(r'<main class="app-main".*?</main>',t,re.S)
        body=m.group(0) if m else t
        body=re.sub(r'<script.*?</script>','',body,flags=re.S)
        pills=re.findall(r'<span class="pill[^"]*"[^>]*>(.*?)</span>',body,re.S)
        c={}
        for x in pills:
            x=' '.join(html.unescape(re.sub(r'<[^>]+>','',x)).split())
            if 0<len(x)<40: c[x]=c.get(x,0)+1
        if c: out.write('%s: %s\n'%(rel,'; '.join('%s(%d)'%(k,v) for k,v in sorted(c.items(),key=lambda a:-a[1])[:22])))
