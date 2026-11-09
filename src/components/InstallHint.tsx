import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const KEY = 'mtc-install-hint-dismissed';

/** Tyre Man app: offers "Add to home screen". Android shows the real install button; iPhone gets the Share steps. */
export function InstallHint() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (hidden || standalone() || (!ev && !ios)) return null;
  const close = () => { setHidden(true); try { localStorage.setItem(KEY, '1'); } catch { /* private window */ } };
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <Download size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">Add this app to your home screen</div>
        {ev ? <button className="mt-1 rounded-lg bg-blue-700 px-3 py-1.5 font-semibold text-white" onClick={() => void ev.prompt().then(() => setEv(null))}>Install</button>
          : <p className="mt-0.5">Tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</p>}
      </div>
      <button aria-label="Dismiss" onClick={close} className="p-1"><X size={18} /></button>
    </div>
  );
}
