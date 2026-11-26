import { useId, useState } from 'react';
import type { Product } from '../api/types';

type ArtProduct = Pick<Product, 'brand' | 'model' | 'capacityAh' | 'voltage' | 'vehicleCategory'> & Pick<Partial<Product>, 'productType' | 'inverterSpecs'>;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/**
 * Product-style render of a battery (three-quarter view), used until the shop uploads
 * the real photo. Proportions follow the vehicle type; the label uses the brand colour.
 */
export function BatteryArt({ product, className = '' }: { product: ArtProduct; className?: string }) {
  const id = useId().replace(/:/g, '');
  const accent = product.brand?.accentColor || '#14213D';
  const small = product.vehicleCategory === 'TWO_WHEELER';
  const big = ['COMMERCIAL', 'TRACTOR', 'INVERTER'].includes(product.vehicleCategory);
  const W = small ? 142 : big ? 200 : 178;
  const H = small ? 146 : big ? 140 : 124;
  const D = small ? 70 : 86;
  const dx = D * 0.62;
  const dy = -D * 0.38;
  const x0 = (300 - (W + dx)) / 2;
  const y0 = 250 - H - 26;
  const brand = (product.brand?.name ?? '').toUpperCase();
  const tX = (f: number) => x0 + W * f + dx * 0.5;
  const tY = y0 + dy * 0.5;
  const bandY = y0 + H * 0.2;
  const bandH = H * 0.36;

  return (
    <svg viewBox="0 0 300 250" className={className} role="img" aria-label={`${product.brand?.name ?? ''} ${product.model} battery`}>
      <defs>
        <linearGradient id={`f${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#2B3342" />
          <stop offset=".55" stopColor="#1E2531" />
          <stop offset="1" stopColor="#181E28" />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4A5466" />
          <stop offset="1" stopColor="#343C4B" />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={shade(accent, 0.1)} />
          <stop offset="1" stopColor={shade(accent, -0.08)} />
        </linearGradient>
        <linearGradient id={`p${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#B81C2F" />
          <stop offset=".45" stopColor="#E84A5C" />
          <stop offset="1" stopColor="#A5192A" />
        </linearGradient>
        <linearGradient id={`n${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6B7280" />
          <stop offset=".45" stopColor="#C4C9D2" />
          <stop offset="1" stopColor="#5B616C" />
        </linearGradient>
        <radialGradient id={`s${id}`}>
          <stop offset="0" stopColor="#14213D" stopOpacity=".28" />
          <stop offset="1" stopColor="#14213D" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={x0 + (W + dx) / 2} cy={y0 + H + 6} rx={(W + dx) * 0.62} ry="14" fill={`url(#s${id})`} />

      {/* side */}
      <path d={`M${x0 + W} ${y0}l${dx} ${dy}v${H}l${-dx} ${-dy}z`} fill="#131820" />
      <path d={`M${x0 + W} ${bandY}l${dx} ${dy}v${bandH}l${-dx} ${-dy}z`} fill={shade(accent, -0.22)} />
      {/* front */}
      <rect x={x0} y={y0} width={W} height={H} fill={`url(#f${id})`} />
      <rect x={x0} y={y0} width={W} height="7" fill="#3B4454" />
      {/* top */}
      <path d={`M${x0} ${y0}h${W}l${dx} ${dy}h${-W}z`} fill={`url(#t${id})`} />
      <path d={`M${x0 + 8} ${y0 - 2}h${W - 16}l${dx * 0.8} ${dy * 0.8}h${-(W - 16)}z`} fill="#2C3441" opacity=".55" />

      {/* terminals */}
      {[
        { f: 0.18, grad: `n${id}`, top: '#D9DDE3', sign: '−' },
        { f: 0.82, grad: `p${id}`, top: '#F27A88', sign: '+' },
      ].map(({ f, grad, top, sign }) => (
        <g key={sign}>
          <rect x={tX(f) - 9} y={tY - 14} width="18" height="14" fill={`url(#${grad})`} />
          <ellipse cx={tX(f)} cy={tY} rx="9" ry="3.6" fill={`url(#${grad})`} />
          <ellipse cx={tX(f)} cy={tY - 14} rx="9" ry="3.6" fill={top} />
          <text x={tX(f) + (f < 0.5 ? 16 : -16)} y={tY + 1} textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="700" fontSize="12" fill="#C9CFD8">{sign}</text>
        </g>
      ))}

      {/* label band */}
      <rect x={x0} y={bandY} width={W} height={bandH} fill={`url(#b${id})`} />
      <rect x={x0} y={bandY} width={W} height="2" fill="#fff" opacity=".25" />
      <text x={x0 + W / 2} y={bandY + bandH * 0.62} textAnchor="middle" fontFamily="'Barlow Condensed', Barlow, sans-serif" fontWeight="800" fontSize={small ? 23 : 27} letterSpacing="1" fill="#fff">
        {brand}
      </text>
      <text x={x0 + W / 2} y={bandY + bandH + (small ? 20 : 22)} textAnchor="middle" fontFamily="'Barlow Condensed', Barlow, sans-serif" fontWeight="600" fontSize={small ? 13 : 15} fill="#E4E7EC">
        {product.model}
      </text>
      <text x={x0 + W / 2} y={bandY + bandH + (small ? 38 : 42)} textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="700" fontSize={small ? 12 : 13} fill="#FFC629">
        {product.capacityAh ? `${product.voltage}V ${product.capacityAh}Ah` : `${product.voltage}V`}
      </text>
      {/* edge highlight */}
      <rect x={x0} y={y0} width="2" height={H} fill="#fff" opacity=".08" />
    </svg>
  );
}

/** Product-style render of an inverter / home UPS unit. */
export function InverterArt({ product, className = '' }: { product: ArtProduct; className?: string }) {
  const id = useId().replace(/:/g, '');
  const accent = product.brand?.accentColor || '#14213D';
  const W = 170, H = 150, D = 70;
  const dx = D * 0.62, dy = -D * 0.38;
  const x0 = (300 - (W + dx)) / 2;
  const y0 = 250 - H - 22;
  const va = product.inverterSpecs?.vaRating;
  return (
    <svg viewBox="0 0 300 250" className={className} role="img" aria-label={`${product.brand?.name ?? ''} ${product.model} inverter`}>
      <defs>
        <linearGradient id={`if${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#F4F6F9" />
          <stop offset="1" stopColor="#DCE1E8" />
        </linearGradient>
        <radialGradient id={`is${id}`}>
          <stop offset="0" stopColor="#14213D" stopOpacity=".25" />
          <stop offset="1" stopColor="#14213D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x0 + (W + dx) / 2} cy={y0 + H + 6} rx={(W + dx) * 0.6} ry="13" fill={`url(#is${id})`} />
      <path d={`M${x0 + W} ${y0}l${dx} ${dy}v${H}l${-dx} ${-dy}z`} fill="#B9C1CC" />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${x0 + W + 10} ${y0 + 34 + i * 12 - 6}l${dx - 20} ${dy * ((dx - 20) / dx)}`} stroke="#8E98A6" strokeWidth="3" strokeLinecap="round" />
      ))}
      <rect x={x0} y={y0} width={W} height={H} rx="4" fill={`url(#if${id})`} />
      <path d={`M${x0} ${y0}h${W}l${dx} ${dy}h${-W}z`} fill="#E9EDF2" />
      {/* display */}
      <rect x={x0 + 22} y={y0 + 20} width={W - 44} height="44" rx="4" fill="#1B2533" />
      <text x={x0 + W / 2} y={y0 + 49} textAnchor="middle" fontFamily="'Barlow Condensed', Barlow, sans-serif" fontWeight="700" fontSize="22" fill="#7FE0A7">
        {va ? `${va} VA` : 'INVERTER'}
      </text>
      {/* status lights */}
      {['#2BB673', '#FFC629', '#D7263D'].map((c, i) => (
        <circle key={c} cx={x0 + W / 2 - 18 + i * 18} cy={y0 + 80} r="4" fill={c} />
      ))}
      {/* brand band */}
      <rect x={x0} y={y0 + H - 46} width={W} height="30" fill={accent} />
      <text x={x0 + W / 2} y={y0 + H - 25} textAnchor="middle" fontFamily="'Barlow Condensed', Barlow, sans-serif" fontWeight="800" fontSize="19" letterSpacing="1" fill="#fff">
        {(product.brand?.name ?? '').toUpperCase()}
      </text>
      <text x={x0 + W / 2} y={y0 + H - 4} textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="600" fontSize="11" fill="#3A4150">
        {product.model}
      </text>
    </svg>
  );
}

/** Illustration of a circuit board, used for PCB products without a photo. */
export function PcbArt({ product, className = '' }: { product: ArtProduct; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 300 250" className={className} role="img" aria-label={`${product.model} circuit board`}>
      <defs>
        <linearGradient id={`pb${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F7A4D" />
          <stop offset="1" stopColor="#135A37" />
        </linearGradient>
        <radialGradient id={`ps${id}`}>
          <stop offset="0" stopColor="#14213D" stopOpacity=".25" />
          <stop offset="1" stopColor="#14213D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="222" rx="118" ry="12" fill={`url(#ps${id})`} />
      <g transform="translate(150 125) skewX(-12) translate(-150 -125)">
        <rect x="45" y="45" width="210" height="160" rx="8" fill={`url(#pb${id})`} />
        <rect x="45" y="45" width="210" height="160" rx="8" fill="none" stroke="#0E4A2C" strokeWidth="3" />
        {/* traces */}
        {[70, 95, 120, 170, 185].map((y, i) => (
          <path key={y} d={`M${60 + i * 6} ${y}h${50 + i * 8}l12 12h${40 - i * 4}`} stroke="#C9A646" strokeWidth="2.2" fill="none" opacity=".85" />
        ))}
        {[[70, 60], [230, 60], [70, 190], [230, 190]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#E7EDF3" stroke="#C9A646" strokeWidth="2" />
        ))}
        {/* chip */}
        <rect x="132" y="92" width="62" height="50" rx="3" fill="#1B1F27" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <rect x={136 + i * 10} y="86" width="4" height="6" fill="#C9CFD8" />
            <rect x={136 + i * 10} y="142" width="4" height="6" fill="#C9CFD8" />
          </g>
        ))}
        {/* capacitors and connector */}
        <circle cx="222" cy="112" r="11" fill="#2B3342" stroke="#98A2B3" strokeWidth="2" />
        <circle cx="222" cy="150" r="8" fill="#2B3342" stroke="#98A2B3" strokeWidth="2" />
        <rect x="70" y="128" width="42" height="18" rx="2" fill="#E9EDF2" />
        <rect x="200" y="180" width="40" height="14" rx="2" fill="#FFC629" />
      </g>
      <text x="150" y="244" textAnchor="middle" fontFamily="'Barlow Condensed', Barlow, sans-serif" fontWeight="700" fontSize="14" fill="#3A4150">{product.model}</text>
    </svg>
  );
}

export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  const img = product.images?.[0];
  const [broken, setBroken] = useState(false);
  if (img && !broken)
    return <img src={img.url} alt={img.alt || product.name} className={`object-contain ${className}`} loading="lazy" onError={() => setBroken(true)} />;
  if (product.productType === 'INVERTER') return <InverterArt product={product} className={className} />;
  if (product.productType === 'PCB') return <PcbArt product={product} className={className} />;
  return <BatteryArt product={product} className={className} />;
}
