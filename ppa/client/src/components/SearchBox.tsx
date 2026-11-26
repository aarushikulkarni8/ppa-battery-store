import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

const EXAMPLES = ['Two wheeler', 'Honda Activa', 'Maruti Swift', 'Hyundai Grand i10', 'Amaron', 'Royal Enfield Classic', '4Ah', '40Ah'];

export function HeroSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const go = (term: string) => term.trim() && nav(`/search?q=${encodeURIComponent(term.trim())}`);
  return (
    <div className="relative mx-auto max-w-3xl pt-5">
      {/* battery terminals */}
      <div aria-hidden className="absolute left-10 top-0 h-5 w-14 rounded-t-md bg-[#56627d]">
        <span className="absolute inset-x-0 -top-0.5 text-center font-display text-lg font-bold leading-none text-white/80">−</span>
      </div>
      <div aria-hidden className="absolute right-10 top-0 h-5 w-14 rounded-t-md bg-plus">
        <span className="absolute inset-x-0 -top-0.5 text-center font-display text-lg font-bold leading-none text-white">+</span>
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          go(q);
        }}
        className="relative rounded-xl bg-ink-700 p-3 shadow-plate ring-1 ring-white/10 sm:p-4"
        role="search"
      >
        <label htmlFor="hero-search" className="mb-2 block px-1 font-display text-lg font-semibold text-white">
          Search for your battery
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" />
            <input
              id="hero-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Vehicle, brand or capacity — e.g. Honda Activa"
              className="h-14 w-full rounded-lg border-0 bg-white pl-11 pr-3 text-lg text-ink placeholder:text-ink-300 focus:outline-none focus:ring-4 focus:ring-volt"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn-volt h-14 px-6 text-base">
            Search
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => go(e)} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/80 hover:border-volt hover:text-white">
              {e}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

export function CompactSearch({ className = '' }: { className?: string }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const nav = useNavigate();
  useEffect(() => setQ(params.get('q') ?? ''), [params]);
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
      <input
        aria-label="Search for your battery"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for your battery"
        className="h-10 w-full rounded-md border border-steel-400/60 bg-steel-50 pl-9 pr-3 text-sm focus:border-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-volt/60"
      />
    </form>
  );
}

/** Store-style search bar for the dark header. */
export function HeaderSearch({ className = '' }: { className?: string }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const nav = useNavigate();
  useEffect(() => setQ(params.get('q') ?? ''), [params]);
  return (
    <form
      role="search"
      className={`flex h-11 overflow-hidden rounded-md bg-white focus-within:ring-[3px] focus-within:ring-volt ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        aria-label="Search for your battery"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by battery model, series or capacity, e.g. DIN65 or 150Ah"
        className="min-w-0 flex-1 border-0 bg-transparent px-3.5 text-[15px] text-ink placeholder:text-ink-300 focus:outline-none"
        autoComplete="off"
      />
      <button type="submit" aria-label="Search" className="grid w-12 shrink-0 place-items-center bg-volt text-ink hover:bg-[#f4b800]">
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}
