import re,os,sys
root=sys.argv[1]
rows=[]
for r,_,fs in os.walk(root):
    for f in fs:
        p=os.path.join(r,f);rel=os.path.relpath(p,root).replace('\\','/')
        t=open(p,encoding='utf-8').read()
        sc=re.findall(r'<script[^>]*>(.*?)</script>',t,re.S)
        tot=sum(len(s) for s in sc)
        rows.append((tot,len(sc),rel))
rows.sort(reverse=True)
for r in rows[:25]: print(r)
print('pages with inline script >2000 chars:',sum(1 for r in rows if r[0]>2000))
