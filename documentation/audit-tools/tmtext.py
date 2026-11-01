import re,os,sys,html
root=sys.argv[1]; out=open(sys.argv[2],'w',encoding='utf-8')
for f in ['my-jobs.html','round-AIR.html','fleet-AIR.html','job-TC.html','job-ST.html','job-US.html','fleet-ROT.html','fleet-CENSUS.html','duty-shift.html','my-wsr.html','norms.html','grn.html','mrn.html','srn.html','notifications.html','month-ROT.html','round-CENSUS.html']:
    t=open(os.path.join(root,'tm',f),encoding='utf-8').read()
    t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',t,flags=re.S)
    m=re.search(r'<div class="phone.*',t,re.S)
    t=m.group(0) if m else t
    t=re.sub(r'<(div|p|li|tr|h\d|button|label|option|td|th|span)[^>]*>','\n',t)
    txt=[' '.join(html.unescape(x).split()) for x in re.sub(r'<[^>]+>',' ',t).split('\n')]
    seen=[];
    for x in txt:
        if x and x not in seen: seen.append(x)
    out.write('\n##### tm/%s\n'%f+' | '.join(seen)[:3500]+'\n')
