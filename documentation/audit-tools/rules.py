import re,sys
t=open(sys.argv[1],encoding='utf-8').read()
out=open(sys.argv[2],'w',encoding='utf-8')
# toast messages
seen=[]
for m in re.finditer(r"toast\(\s*((?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")(?:\s*\+\s*(?:'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|[\w\.\[\]\(\)]+))*)",t):
    s=m.group(1)
    if s not in seen: seen.append(s)
out.write('== TOASTS (%d) ==\n'%len(seen))
for s in seen: out.write(s[:260]+'\n')
# rule-ish strings
out.write('\n== RULE-LIKE STRINGS ==\n')
cand=set()
for m in re.finditer(r"'((?:[^'\\\n]|\\.){25,240})'|\"((?:[^\"\\\n]|\\.){25,240})\"",t):
    s=m.group(1) or m.group(2)
    if re.search(r'\b(must|cannot|can\'t|only|not allowed|required|at least|already|before|after|until|auto|automatically|mandatory|should|cannot be|exceed|limit|maximum|minimum|approval|approve)\b',s,re.I) and not s.startswith('<') and '{' not in s and 'function' not in s:
        cand.add(s)
for s in sorted(cand): out.write(s+'\n')
