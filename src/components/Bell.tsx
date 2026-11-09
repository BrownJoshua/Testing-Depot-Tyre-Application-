import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell as BellIcon } from 'lucide-react';
import { loadFeed } from '../lib/notify';

/** The notification bell with the unread count; refreshes every minute and when the page gets focus. */
export function Bell({ to, dark = true }: { to: string; dark?: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = () => { loadFeed().then((r) => { if (alive) setN(r.filter((x) => !x.read_at).length); }).catch(() => undefined); };
    tick();
    const t = setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', tick); };
  }, []);
  return (
    <Link to={to} aria-label={`Notifications${n ? `, ${n} unread` : ''}`} className={`relative rounded-lg p-3 ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'border border-slate-300'}`}>
      <BellIcon size={20} />
      {n > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-bold leading-5 text-white">{n > 99 ? '99+' : n}</span>}
    </Link>
  );
}
