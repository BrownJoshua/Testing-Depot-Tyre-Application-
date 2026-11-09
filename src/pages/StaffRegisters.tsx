import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { all, rpc, type Row } from '../lib/ops';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader, ReasonDialog } from '../components/ui';
import { Modal } from '../components/OpsBits';

/** Outsource Employee (D1): labour-contractor staff kept by the Tyre IC; identified by phone and Aadhaar. */
export function OutsourceEmployees() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const blank = { name: '', type: 'DIRECT', contractor: '', phone: '', aadhaar: '', address: '', qualification: '', skills: '' };
  const [f, setF] = useState(blank);

  const load = useCallback(() => { all('outsource_employees', 'employee_no').then(setRows).catch((e: Error) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const shown = (rows ?? []).filter((r) => !status || r.status === status);

  async function run(fn: () => Promise<unknown>, ok: string, done: () => void) {
    setBusy(true); setDlgError(null);
    try { await fn(); setNotice(ok); done(); load(); } catch (e) { setDlgError((e as Error).message); } finally { setBusy(false); }
  }
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Outsource Employee" subtitle="Labour-contractor staff available for job assignment, kept by the Tyre Incharge. Identified by phone and Aadhaar, not an MTC Employee ID."
        action={<button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => { setF(blank); setDlgError(null); setAdding(true); }}><Plus size={16} /> Add Employee</button>} />
      {error && <Banner kind="error">{error}</Banner>}{notice && <Banner kind="ok">{notice}</Banner>}
      <div className="mb-3 flex items-center gap-3 text-sm">
        <select className={`${inputCls} w-40`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
        <button className={btnPlain} onClick={() => setStatus('')}>Reset</button><span className="text-slate-600">{shown.length} outsource employees</span>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'Employee ID', 'Name', 'Work order', 'Phone', 'Aadhaar No.', 'Address', 'Educational qualification', 'Skill', 'Status', 'Action'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {!rows && !error && <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {shown.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.employee_no}</td><td className="px-3 py-2">{r.full_name}</td>
                <td className="px-3 py-2">{r.work_order_type === 'DIRECT' ? 'Direct' : <>Contractor<div className="text-xs text-slate-500">{r.contractor_name}</div></>}</td>
                <td className="px-3 py-2">{r.phone}</td><td className="px-3 py-2">{r.aadhaar_no}</td><td className="px-3 py-2">{r.address}</td><td className="px-3 py-2">{r.qualification}</td><td className="px-3 py-2">{r.skills}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{r.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>{r.removed_reason && <div className="text-xs text-slate-500">{r.removed_reason}</div>}</td>
                <td className="px-3 py-2">{r.status === 'ACTIVE' && <button className={btnPlain} onClick={() => { setDlgError(null); setRemoving(r); }}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <Modal title="Add Outsource Employee" onClose={() => setAdding(false)}>
          {dlgError && <Banner kind="error">{dlgError}</Banner>}
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => rpc('outsource_add', { p_name: f.name, p_type: f.type, p_contractor: f.contractor || null, p_phone: f.phone, p_aadhaar: f.aadhaar, p_address: f.address || null, p_qualification: f.qualification || null, p_skills: f.skills || null }), 'Employee added.', () => setAdding(false)); }}>
            <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work order *"><select className={inputCls} value={f.type} onChange={set('type')}><option value="DIRECT">Direct</option><option value="CONTRACTOR">Contractor</option></select></Field>
              {f.type === 'CONTRACTOR' && <Field label="Contractor *"><input className={inputCls} value={f.contractor} onChange={set('contractor')} required /></Field>}
              <Field label="Phone * (10 digits)"><input className={inputCls} value={f.phone} onChange={set('phone')} inputMode="numeric" maxLength={10} required /></Field>
              <Field label="Aadhaar No. * (1111 2222 3333)"><input className={inputCls} value={f.aadhaar} onChange={set('aadhaar')} required /></Field>
            </div>
            <Field label="Address"><input className={inputCls} value={f.address} onChange={set('address')} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Educational qualification"><input className={inputCls} value={f.qualification} onChange={set('qualification')} /></Field><Field label="Skill"><input className={inputCls} value={f.skills} onChange={set('skills')} /></Field></div>
            <div className="flex justify-end gap-2"><button type="button" className={btnPlain} onClick={() => setAdding(false)} disabled={busy}>Cancel</button><button type="submit" className={btnPrimary} disabled={busy}>Add Employee</button></div>
          </form>
        </Modal>
      )}
      {removing && <ReasonDialog title={`Remove ${removing.full_name} — ${removing.employee_no}`} label="Reason *" confirmLabel="Remove Employee" danger required busy={busy} error={dlgError}
        onConfirm={(t) => void run(() => rpc('outsource_remove', { p_id: removing.id, p_reason: t }), 'Employee removed.', () => setRemoving(null))} onCancel={() => setRemoving(null)} />}
    </div>
  );
}

/** Tyre Man Register: the depot's Tyre IC and Tyre Men (read only). */
export function TyreManRegister() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [role, setRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.from('employees').select('*').in('role_code', ['TIC', 'TM']).order('employee_code').then(({ data, error: e }) => { if (e) setError(e.message); else setRows((data ?? []) as Row[]); });
  }, []);
  const shown = (rows ?? []).filter((r) => !role || r.role_code === role);
  return (
    <div>
      <PageHeader title="Tyre Man Register" subtitle="Tyre Incharge and Tyre Men of your depot." />
      {error && <Banner kind="error">{error}</Banner>}
      <div className="mb-3 flex items-center gap-3 text-sm">
        <select className={`${inputCls} w-44`} aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option value="TIC">Tyre Incharge</option><option value="TM">Tyre Man</option></select>
        <button className={btnPlain} onClick={() => setRole('')}>Reset</button><span className="text-slate-600">{shown.length} employees</span>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{['S.No', 'Employee ID', 'Name', 'Role', 'Phone', 'Experience', 'Status'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {!rows && !error && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
            {shown.map((r, i) => <tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.employee_code}</td><td className="px-3 py-2">{r.full_name}</td>
              <td className="px-3 py-2">{r.role_code === 'TIC' ? 'Tyre Incharge' : 'Tyre Man'}</td><td className="px-3 py-2">{r.phone_demo ?? '—'}</td><td className="px-3 py-2">{r.experience_years != null ? `${r.experience_years} yr` : '—'}</td>
              <td className="px-3 py-2">{r.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
