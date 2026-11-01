import re,sys,os
sp=sys.argv[1]; out=open(sys.argv[2],'w',encoding='utf-8')
noise=re.compile(r'Username / Employee ID \| Password \| Employee ID ?\|? ?|Sign in \| 🔔 \| ⎋ \| 🔔\d+ ?\|? ?')
out.write('# Screen inventory — generated appendix\n\n')
out.write('> **Machine-extracted** from `MTC-Depot-Tyre-Prototype.html` (118 screen files). It lists every table column, filter, dropdown, form field and button found in each screen and in its modal/popup definitions, so nothing is silently omitted. It is reference material: the curated per-screen analysis (purpose, role, validations, relationships) is in `screen-inventory.md`.\n>\n')
out.write('> Notation: `*` = marked required in the prototype. `SEL` = dropdown (first options shown). `COLS` = table columns. Popup lines are de-duplicated per screen; "(same as …)" points to an identical popup defined on another screen. Long lists of employees/folios/dates are truncated.\n\n')
names={'ae':'AE (HO Technical) — approver','ho':'HO (Technical) — maker / master data','sup':'Supervisor','tic':'Tyre Incharge (TIC) — desktop/tablet','tm':'Tyre Man (TM) — mobile'}
for role in ['ho','ae','sup','tic','tm']:
    out.write('\n---\n\n## Role folder `%s/` — %s\n'%(role,names[role]))
    pops={}
    cur=None
    for l in open(os.path.join(sp,'popups_cond.txt'),encoding='utf-8'):
        l=l.rstrip('\n')
        if l.startswith('####'):
            cur=l.split()[1]; pops[cur]=[]
        elif cur and l.startswith('- '): pops[cur].append(l)
    txt=open(os.path.join(sp,'summary_%s.txt'%role),encoding='utf-8').read()
    for blk in txt.split('\n## ')[1:] if '\n## ' in txt else []:
        head,*rest=blk.split('\n')
        page=head.split(' | ')[0].strip(); title=head.split(' | ',1)[1] if ' | ' in head else ''
        out.write('\n### `%s` — %s\n'%(page,title))
        for r in rest:
            r=noise.sub('',r.rstrip())
            r=re.sub(r'\| Sign in \| 🔔 \| ⎋ \| 🔔\d+','',r)
            if not r.strip() or r.strip().startswith('LABELS: Username') : continue
            r=re.sub(r'^ (H|LABELS|INPUTS|BTNS|TABLE|SEL|TABS)',r'- \1',r)
            r=r.replace('H: Sign in ; ','H: ').replace('Sign in | 🔔 | ⎋ | ','').replace('Sign in | ','')
            if len(r)>900: r=r[:900]+' …'
            if r.strip('- ').strip() in('INPUTS:','BTNS:','LABELS:'): continue
            out.write(r+'\n')
        p=pops.get(page)
        if p:
            out.write('- **Popups / modals:**\n')
            for x in p: out.write('  '+x[:700].replace('\n',' ')+('' if len(x)<=700 else ' …')+'\n')
