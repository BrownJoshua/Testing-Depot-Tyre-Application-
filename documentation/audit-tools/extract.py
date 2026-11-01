import json,re,os,sys
src,out=sys.argv[1],sys.argv[2]
t=open(src,encoding='utf-8').read()
m=re.search(r'<script id="bundle" type="application/json">(.*?)</script>\n<script>',t,re.S)
B=json.loads(m.group(1))
print({k:len(v) for k,v in B.items()})
for kind in B:
    for name,content in B[kind].items():
        if kind=='img': 
            print('img',name,len(content)); continue
        p=os.path.join(out,kind,name)
        os.makedirs(os.path.dirname(p),exist_ok=True)
        open(p,'w',encoding='utf-8').write(content)
        print(kind,name,len(content))
