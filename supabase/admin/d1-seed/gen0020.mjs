// Generates supabase/migrations/0020_d1_complaint_master.sql from the D1 prototype's Tyre Complaint Master (67 complaints, codes CMP001..).
// Needs the unpacked prototype and the P path set in d1data.mjs (see README.md).
import { writeFileSync } from 'node:fs';
import { tables } from './d1data.mjs';

const OUT = 'C:/Users/USER/Desktop/Test DTyre App/supabase/migrations/0020_d1_complaint_master.sql';
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const rows = tables('ho/complaint-master.html')[0].rows.filter((r) => /^CMP\d{3}$/.test(r['Complaint Code']));
const items = rows.map((r) => ({ code: r['Complaint Code'], name: r['Complaint Name'], inactive: /inactive/i.test(r['Status']), jobs: [...new Set(r['Required Jobs'].match(/JOB-\d{3}/g) ?? [])] }));
const links = items.flatMap((i) => i.jobs.map((j) => [i.code, j]));

const s = `-- 0020: D1 Tyre Complaint Master - ${items.length} complaints (CMP001..), names in the form Category-Name, with their Required Jobs.
-- GENERATED from "MTC-Depot-Tyre D1.html" (HO > Tyre Complaint Master). Replaces the 12 log-sheet types seeded in 0014.
delete from public.complaint_type_jobs;
delete from public.complaint_types;
insert into public.complaint_types (complaint_code, complaint_name, status) values
${items.map((i) => `  (${q(i.code)}, ${q(i.name)}, ${i.inactive ? "'INACTIVE'" : "'ACTIVE'"})`).join(',\n')};
${links.length ? `insert into public.complaint_type_jobs (complaint_type_id, job_id)
select c.id, j.id from (values ${links.map(([c, j]) => `(${q(c)}, ${q(j)})`).join(', ')}) as v(code, job)
join public.complaint_types c on c.complaint_code = v.code join public.maintenance_jobs j on j.job_code = v.job;` : '-- (the prototype lists no Required Jobs for these complaints)'}
`;
writeFileSync(OUT, s);
console.log({ complaints: items.length, withJobs: items.filter((i) => i.jobs.length).length, links: links.length, inactive: items.filter((i) => i.inactive).length });
