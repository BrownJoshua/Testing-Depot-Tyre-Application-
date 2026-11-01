import re,os,sys,html
root,out=sys.argv[1],sys.argv[2]
kw=re.compile(r'\b(must|cannot|can not|only|not allowed|required|at least|already|before|after|until|auto|automatically|mandatory|should|exceed|limit|maximum|minimum|approv|reject|return(ed)?|revert|hold|rule|norm|if |when |once|blocked|locked|read-only|cannot be|goes to|sent to|notif)',re.I)
seen={}
for r,_,fs in os.walk(root):
    for f in sorted(fs):
        p=os.path.join(r,f);rel=os.path.relpath(p,root).replace('\\','/')
        t=open(p,encoding='utf-8').read()
        t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',t,flags=re.S)
        # split by tags to get text nodes
        for node in re.split(r'<[^>]+>',t):
            s=' '.join(html.unescape(node).split())
            if 35<=len(s)<=420 and kw.search(s) and not re.match(r'^[\d\W]+$',s):
                seen.setdefault(s,[]).append(rel)
o=open(out,'w',encoding='utf-8')
for s,ps in sorted(seen.items(),key=lambda x:x[1][0]):
    o.write('[%s%s] %s\n'%(ps[0],'' if len(ps)==1 else ' +%d'%(len(ps)-1),s))
print(len(seen))
