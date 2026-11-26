import { inr } from '../lib/format';

export function Price({ mrp, price, large = false }: { mrp: number | null; price: number | null; large?: boolean }) {
  if (price == null)
    return <p className={`font-semibold text-graphite ${large ? 'text-2xl' : 'text-[15px]'}`}>Price on request</p>;
  const off = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {large && off > 0 && <span className="text-2xl font-light text-plus">-{off}%</span>}
        <span className={`font-bold tabular-nums text-ink ${large ? 'text-[34px] leading-none' : 'text-xl'}`}>{inr(price)}</span>
        {!large && off > 0 && (
          <>
            <span className="text-[13px] text-ink-300 line-through">{inr(mrp)}</span>
            <span className="text-[13px] font-semibold text-ok">{off}% off</span>
          </>
        )}
      </div>
      {large && off > 0 && <p className="mt-1 text-sm text-ink-300">M.R.P.: <span className="line-through">{inr(mrp)}</span></p>}
      {large && <p className="mt-0.5 text-xs text-ink-300">Inclusive of all taxes</p>}
    </div>
  );
}
