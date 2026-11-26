import { useEffect, useId, useRef, useState } from 'react';
import { Phone, MessageCircle, ChevronDown } from 'lucide-react';
import { CONTACT } from '../config/contact';

/** "+91 98xx…" → "9198xx…" for wa.me links (adds 91 to 10-digit Indian numbers). */
export function waNumber(raw: string) {
  const d = raw.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}
export const telHref = (raw: string) => `tel:${raw.replace(/[^\d+]/g, '')}`;
export const waHref = (raw: string, text = CONTACT.whatsappMessage) =>
  `https://wa.me/${waNumber(raw)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/**
 * A phone number that, when clicked, offers "Call" and "WhatsApp".
 * `whatsapp` can be a different number from `phone`; it defaults to the same one.
 */
export function PhoneAction({
  phone,
  whatsapp,
  className = '',
  light = false,
  openUp = false,
}: {
  phone: string;
  whatsapp?: string;
  className?: string;
  /** For dark backgrounds (footer). */
  light?: boolean;
  /** Open the menu above the number (near the bottom of the page). */
  openUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', click);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-md text-left font-semibold tabular-nums hover:underline ${light ? 'text-sm text-white' : 'text-lg text-link'}`}
      >
        <Phone className={`shrink-0 ${light ? 'h-4 w-4 text-volt' : 'h-5 w-5'}`} />
        {phone}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={menuId} role="menu" className={`absolute left-0 z-30 w-64 overflow-hidden rounded-md border border-steel bg-white text-left shadow-xl ${openUp ? 'bottom-full mb-2' : 'mt-2'}`}>
          <a role="menuitem" href={telHref(phone)} className="flex items-center gap-3 px-4 py-3 hover:bg-steel-50" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
              <Phone className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold text-ink">Call</span>
              <span className="block text-[13px] text-graphite">{phone}</span>
            </span>
          </a>
          <a
            role="menuitem"
            href={waHref(whatsapp || phone)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 border-t border-steel px-4 py-3 hover:bg-steel-50"
            onClick={() => setOpen(false)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold text-ink">WhatsApp</span>
              <span className="block text-[13px] text-graphite">Chat with us on WhatsApp</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
