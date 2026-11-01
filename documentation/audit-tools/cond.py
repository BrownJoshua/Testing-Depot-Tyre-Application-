import re,sys
lines=open(sys.argv[1],encoding='utf-8').read().split('\n')
out=open(sys.argv[2],'w',encoding='utf-8')
page=None;seen=set();cnt=0;gseen={}
for l in lines:
    if l.startswith('####'):
        page=l;seen=set();cnt=0;out.write('\n'+l+'\n');continue
    if not l.startswith('- ['): continue
    m=re.match(r'- \[[^\]]*\] (.*?)( \||$)',l); title=m.group(1) if m else l[:40]
    norm=re.sub(r'\d+','#',title)
    if norm in seen: continue
    seen.add(norm)
    body=re.sub(r'^- \[[^\]]*\] ','- ',l)
    # skip content-identical to a previous page (same body)
    key=body[:300]
    if key in gseen: 
        out.write('- (same as %s) %s\n'%(gseen[key],title[:60])); continue
    gseen[key]=page.split()[1]
    cnt+=1
    if cnt>22: continue
    out.write(body[:850]+'\n')
