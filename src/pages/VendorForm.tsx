import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import {
  createRequest, listCategories, listRequests, listVendorContacts, listVendors, submitRequest, updateRequest, friendlyError,
  type RefValue, type Vendor,
} from '../lib/masters';
import { Banner, btnPlain, btnPrimary, cardCls, Field, inputCls, PageHeader } from '../components/ui';

type Contact = { contact_name: string; designation: string; phone_demo: string; email_demo: string; is_primary: boolean };
type Form = {
  vendor_code: string; vendor_name: string; category_code: string; contact_person: string; address_text: string;
  city: string; state: string; pincode: string; phone_demo: string; email_demo: string; gstin: string; contacts: Contact[];
};
const EMPTY: Form = {
  vendor_code: '', vendor_name: '', category_code: '', contact_person: '', address_text: '', city: '', state: 'Tamil Nadu',
  pincode: '', phone_demo: '', email_demo: '', gstin: '', contacts: [],
};
const TEXT_KEYS = ['vendor_name', 'category_code', 'contact_person', 'address_text', 'city', 'state', 'pincode', 'phone_demo', 'email_demo', 'gstin'] as const;
const blankContact = (): Contact => ({ contact_name: '', designation: '', phone_demo: '', email_demo: '', is_primary: false });

/** Propose a new vendor (/ho/vendors/new), a change (/ho/vendors/:id/edit), or continue a draft (?draft=<request id>). */
export function VendorForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const draftId = params.get('draft');
  const nav = useNavigate();
  const [cats, setCats] = useState<RefValue[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orig, setOrig] = useState<Form>(EMPTY);
  const [f, setF] = useState<Form>(EMPTY);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const isNew = !id && !draftId;

  useEffect(() => {
    (async () => {
      const c = await listCategories(); setCats(c);
      let base = EMPTY; let v: Vendor | null = null;
      let vendorId = id ?? null;
      const draft = draftId ? (await listRequests(['DRAFT'])).find((r) => r.id === draftId) : undefined;
      if (draftId && !draft) throw new Error('That draft was not found.');
      if (draft) vendorId = draft.action === 'CREATE' ? null : draft.target_id;
      if (vendorId) {
        v = (await listVendors()).find((x) => x.id === vendorId) ?? null;
        if (!v) throw new Error('Vendor not found.');
        const contacts = await listVendorContacts(v.id);
        base = {
          vendor_code: v.vendor_code, vendor_name: v.vendor_name, category_code: c.find((x) => x.id === v!.vendor_category_ref)?.code ?? '',
          contact_person: v.contact_person ?? '', address_text: v.address_text ?? '', city: v.city ?? '', state: v.state ?? '',
          pincode: v.pincode ?? '', phone_demo: v.phone_demo ?? '', email_demo: v.email_demo ?? '', gstin: v.gstin ?? '',
          contacts: contacts.map((x) => ({ contact_name: x.contact_name, designation: x.designation ?? '', phone_demo: x.phone_demo ?? '',
            email_demo: x.email_demo ?? '', is_primary: x.is_primary })),
        };
      }
      setVendor(v); setOrig(base);
      if (draft) {
        const p = draft.proposed_payload as Partial<Form>;
        setF({ ...base, ...p, contacts: (p.contacts as Contact[] | undefined) ?? base.contacts });
        setSummary(draft.change_summary ?? '');
      } else setF(base);
      setReady(true);
    })().catch((e: Error) => setError(friendlyError(e.message)));
  }, [id, draftId]);

  const set = <K extends keyof Form>(k: K, val: Form[K]) => setF((p) => ({ ...p, [k]: val }));

  function buildPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (isNew || (draftId && !vendor)) out.vendor_code = f.vendor_code.trim().toUpperCase();
    for (const k of TEXT_KEYS) {
      const val = f[k].trim();
      const create = !vendor;
      if (create ? (val !== '' || k === 'vendor_name' || k === 'category_code') : val !== orig[k].trim()) out[k] = val === '' ? null : val;
    }
    if (vendor ? JSON.stringify(f.contacts) !== JSON.stringify(orig.contacts) : f.contacts.length > 0) {
      out.contacts = f.contacts.filter((c) => c.contact_name.trim() !== '').map((c) => ({
        contact_name: c.contact_name.trim(), designation: c.designation.trim() || null, phone_demo: c.phone_demo.trim() || null,
        email_demo: c.email_demo.trim() || null, is_primary: c.is_primary,
      }));
    }
    return out;
  }

  async function save(e: { preventDefault(): void }, andSubmit: boolean) {
    e.preventDefault();
    setError(null);
    const payload = buildPayload();
    if (vendor && Object.keys(payload).length === 0) { setError('Nothing has changed.'); return; }
    if (!summary.trim()) { setError('Please add a short reason for this request.'); return; }
    setBusy(true);
    let reqId = draftId;
    try {
      if (draftId) await updateRequest(draftId, payload, summary.trim());
      else reqId = await createRequest('vendor', vendor ? 'UPDATE' : 'CREATE', vendor?.id ?? null, payload, summary.trim());
      if (andSubmit && reqId) await submitRequest(reqId);
      nav('/ho/requests', { state: { notice: andSubmit ? 'Request sent to AM for approval.' : 'Draft saved.' } });
    } catch (err) {
      const msg = (err as Error).message;
      setError(reqId && !draftId ? `${msg} (A draft was saved — open My change requests to fix it.)` : msg);
    } finally { setBusy(false); }
  }

  if (!ready && !error) return <p className="text-slate-500">Loading…</p>;
  const lockCode = !!vendor;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={vendor ? `Propose change: ${vendor.vendor_name}` : 'Propose a new vendor'}
        subtitle="Nothing changes until AM (Tech) approves. Only the fields you edit are sent."
      />
      {error && <Banner kind="error">{error}</Banner>}
      <form className={`${cardCls} space-y-4 p-4 sm:p-6`} onSubmit={(e) => void save(e, true)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vendor code" hint={lockCode ? 'A code cannot be changed.' : '3–20 characters: A–Z, 0–9, hyphen (placeholder rule).'}>
            <input className={inputCls} value={f.vendor_code} disabled={lockCode} required onChange={(e) => set('vendor_code', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Vendor name"><input className={inputCls} value={f.vendor_name} required onChange={(e) => set('vendor_name', e.target.value)} /></Field>
          <Field label="Category">
            <select className={inputCls} value={f.category_code} required onChange={(e) => set('category_code', e.target.value)}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Contact person"><input className={inputCls} value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></Field>
          <Field label="Address"><input className={inputCls} value={f.address_text} onChange={(e) => set('address_text', e.target.value)} /></Field>
          <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><input className={inputCls} value={f.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Pincode" hint="6 digits"><input className={inputCls} inputMode="numeric" value={f.pincode} onChange={(e) => set('pincode', e.target.value)} /></Field>
          <Field label="Phone (demo value)"><input className={inputCls} value={f.phone_demo} onChange={(e) => set('phone_demo', e.target.value)} /></Field>
          <Field label="Email (demo value)"><input className={inputCls} type="email" value={f.email_demo} onChange={(e) => set('email_demo', e.target.value)} /></Field>
          <Field label="GSTIN (demo value)" hint="15 characters, e.g. 33ABCDE1234F1Z5">
            <input className={inputCls} value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Contacts</h2>
            <button type="button" className={btnPlain} onClick={() => set('contacts', [...f.contacts, blankContact()])}><Plus size={14} className="mr-1 inline" />Add contact</button>
          </div>
          {f.contacts.length === 0 && <p className="text-sm text-slate-500">No contacts.</p>}
          {f.contacts.map((c, i) => {
            const upd = (patch: Partial<Contact>) => set('contacts', f.contacts.map((x, j) => (j === i ? { ...x, ...patch } : patch.is_primary ? { ...x, is_primary: false } : x)));
            return (
              <div key={i} className="mb-2 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-5">
                <input className={inputCls} placeholder="Name" aria-label="Contact name" value={c.contact_name} onChange={(e) => upd({ contact_name: e.target.value })} />
                <input className={inputCls} placeholder="Designation" aria-label="Designation" value={c.designation} onChange={(e) => upd({ designation: e.target.value })} />
                <input className={inputCls} placeholder="Phone (demo)" aria-label="Phone" value={c.phone_demo} onChange={(e) => upd({ phone_demo: e.target.value })} />
                <input className={inputCls} placeholder="Email (demo)" aria-label="Email" value={c.email_demo} onChange={(e) => upd({ email_demo: e.target.value })} />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={c.is_primary} onChange={(e) => upd({ is_primary: e.target.checked })} />Primary</label>
                  <button type="button" aria-label="Remove contact" className="p-2 text-slate-500 hover:text-red-600" onClick={() => set('contacts', f.contacts.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <Field label="Reason for this request (shown to the approver)">
          <textarea className={inputCls} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </Field>

        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/ho/vendors" className={btnPlain}>Cancel</Link>
          <button type="button" className={btnPlain} disabled={busy} onClick={(e) => void save(e, false)}>Save as draft</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? 'Working…' : 'Send for approval'}</button>
        </div>
      </form>
    </div>
  );
}
