import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Modal } from './OpsBits';
import { btnPlain } from './ui';

interface Detector { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (o?: { formats?: string[] }) => Detector;
const Ctor = () => (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

/** Scan a barcode / QR code with the phone camera and hand back its text. Hidden when the browser cannot scan (the number is typed). */
export function ScanButton({ onScan }: { onScan: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const supported = typeof window !== 'undefined' && !!Ctor() && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!open) return;
    let stop = false; let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const det = new (Ctor()!)();
        while (!stop) {
          const found = await det.detect(video.current).catch(() => []);
          if (found.length) { onScan(found[0].rawValue.trim()); setOpen(false); return; }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setErr('The camera could not be opened. Type the number instead.'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [open, onScan]);

  if (!supported) return null;
  return <>
    <button type="button" className={`${btnPlain} inline-flex items-center gap-1`} onClick={() => { setErr(null); setOpen(true); }}><ScanLine size={16} /> Scan</button>
    {open && <Modal title="Scan the tyre" onClose={() => setOpen(false)}>
      {err ? <p className="text-sm text-red-700">{err}</p> : <video ref={video} className="w-full rounded-lg bg-black" muted playsInline />}
      <div className="mt-3 flex justify-end"><button type="button" className={btnPlain} onClick={() => setOpen(false)}>Cancel</button></div>
    </Modal>}
  </>;
}
