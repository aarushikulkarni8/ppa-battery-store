import { Link } from 'react-router-dom';
import { Mail, Clock, MapPin, Navigation, MessageSquareText, Store, UserRound } from 'lucide-react';
import { STORE } from '../config/store';
import { CONTACT } from '../config/contact';
import { PhoneAction } from '../components/PhoneAction';

const address = STORE.addressLines.join(', ');
const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(`${STORE.name}, ${address}`)}&z=16&output=embed`;

export default function Contact() {
  const phones = [STORE.phone, ...CONTACT.otherPhones].filter(Boolean);
  const about =
    CONTACT.about ||
    `${STORE.name} is a multi-brand battery shop in Hubballi. We sell Amaron, Exide and Bosch batteries for bikes, scooters, cars, commercial vehicles and tractors, and help customers find the right battery for their vehicle and with warranty claims.`;

  return (
    <div className="container-x space-y-3 py-3 sm:space-y-4 sm:py-4">
      <div className="px-1 pt-2">
        <h1 className="font-sans text-2xl font-bold tracking-normal sm:text-3xl">About and contact</h1>
        <p className="mt-1 text-graphite">{STORE.tagline}</p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Contact */}
        <section id="contact" className="panel scroll-mt-32 p-5 sm:p-6" aria-labelledby="contact-h">
          <h2 id="contact-h" className="font-sans text-xl font-bold tracking-normal">Contact us</h2>

          <div className="mt-5 space-y-5">
            {phones.length > 0 ? (
              <div>
                <p className="text-sm text-graphite">Phone. Tap a number to call or WhatsApp.</p>
                <div className="mt-2 flex flex-col items-start gap-3">
                  {phones.map((ph, i) => (
                    <PhoneAction key={ph} phone={ph} whatsapp={i === 0 && STORE.whatsapp ? STORE.whatsapp : undefined} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-md bg-steel-50 p-3 text-sm text-graphite">Phone number coming soon. Please use the enquiry form below.</p>
            )}

            {CONTACT.email && (
              <div>
                <p className="text-sm text-graphite">Email</p>
                <a href={`mailto:${CONTACT.email}`} className="mt-1 inline-flex items-center gap-2 break-all text-lg font-semibold text-link hover:underline">
                  <Mail className="h-5 w-5 shrink-0" /> {CONTACT.email}
                </a>
              </div>
            )}

            {STORE.hours && (
              <div>
                <p className="text-sm text-graphite">Shop hours</p>
                <p className="mt-1 flex items-center gap-2 font-semibold">
                  <Clock className="h-5 w-5 shrink-0 text-ink-300" /> {STORE.hours}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-md border border-steel p-4">
            <p className="font-semibold">Prefer to write to us?</p>
            <p className="mt-1 text-sm text-graphite">Send a question, warranty claim or installation request. The owner gets it straight away.</p>
            <Link to="/enquiry" className="btn-primary mt-3">
              <MessageSquareText className="h-4 w-4" /> Raise an enquiry
            </Link>
          </div>
        </section>

        {/* About */}
        <section id="about" className="panel scroll-mt-32 overflow-hidden" aria-labelledby="about-h">
          <div className="p-5 sm:p-6">
            <h2 id="about-h" className="font-sans text-xl font-bold tracking-normal">About us</h2>
            <p className="mt-3 max-w-prose leading-relaxed text-graphite">{about}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {CONTACT.ownerName && (
                <div className="flex items-center gap-3">
                  {CONTACT.photoUrl ? (
                    <img src={CONTACT.photoUrl} alt={CONTACT.ownerName} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-steel-50">
                      <UserRound className="h-7 w-7 text-ink-300" />
                    </span>
                  )}
                  <div>
                    <p className="font-semibold">{CONTACT.ownerName}</p>
                    {CONTACT.ownerRole && <p className="text-sm text-graphite">{CONTACT.ownerRole}</p>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-steel-50">
                  <Store className="h-7 w-7 text-ink-300" />
                </span>
                <div>
                  <p className="font-semibold">{STORE.name}</p>
                  <p className="text-sm text-graphite">{CONTACT.since ? `Serving Hubballi since ${CONTACT.since}` : 'Hubballi, Karnataka'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-graphite">Location</p>
              <p className="mt-1 flex items-start gap-2 font-semibold">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-plus" />
                <span>
                  {STORE.addressLines.map((l) => (
                    <span key={l} className="block">{l}</span>
                  ))}
                </span>
              </p>
              <a href={STORE.mapUrl} target="_blank" rel="noreferrer" className="btn-volt mt-3">
                <Navigation className="h-4 w-4" /> Get directions
              </a>
            </div>
          </div>
          <iframe
            title={`Map showing ${STORE.name}`}
            src={mapEmbed}
            className="block h-72 w-full border-0 sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </div>
    </div>
  );
}
