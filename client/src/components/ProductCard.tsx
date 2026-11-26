import { Link } from 'react-router-dom';
import { ShoppingCart, MessageSquareText, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import type { Product } from '../api/types';
import { ProductImage } from './BatteryArt';
import { Price } from './Price';
import { useBuy } from './useBuy';
import { isInverter, specLine } from '../lib/format';

/** PCBs are ordered by quantity (no price), so their card leads to the order page. */
function PcbCard({ product }: { product: Product }) {
  const url = `/product/${product.slug}`;
  return (
    <article className="group flex h-full flex-col rounded-md border border-steel bg-white transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(20,33,61,.35)]">
      <Link to={url} className="block aspect-[4/3] overflow-hidden rounded-t-md bg-white p-3" tabIndex={-1} aria-hidden>
        <ProductImage product={product} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5">
        <p className="text-[13px] font-semibold text-graphite">{product.brand?.name}</p>
        <Link to={url} className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-medium leading-snug text-ink hover:text-link">
          {product.name}
        </Link>
        <p className="mt-1 text-[13px] text-graphite">Part no. {product.sku}</p>
        {!!product.specs?.length && <p className="mt-1 line-clamp-2 text-[13px] text-graphite">{specLine(product)}</p>}
        <div className="mt-auto pt-3">
          <Link to={url} className="btn-volt w-full py-2 text-sm">
            <ShoppingCart className="h-4 w-4" /> View &amp; order
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductCard({ product, vehicleHint }: { product: Product; vehicleHint?: string }) {
  return product.productType === 'PCB' ? <PcbCard product={product} /> : <BatteryCard product={product} vehicleHint={vehicleHint} />;
}

function BatteryCard({ product, vehicleHint }: { product: Product; vehicleHint?: string }) {
  const { addToCart, busy } = useBuy();
  const url = `/product/${product.slug}`;
  const priced = product.sellingPrice != null;
  const outOfStock = priced && product.stock <= 0;
  const fewLeft = priced && product.stock > 0 && product.stock <= 3;

  return (
    <article className="group flex h-full flex-col rounded-md border border-steel bg-white transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(20,33,61,.35)]">
      <Link to={url} className="block aspect-[4/3] overflow-hidden rounded-t-md bg-white p-3" tabIndex={-1} aria-hidden>
        <ProductImage product={product} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5">
        <p className="text-[13px] font-semibold" style={{ color: product.brand?.accentColor || '#3A4150' }}>
          {product.brand?.name}
        </p>
        <Link to={url} className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[15px] font-medium leading-snug text-ink hover:text-link">
          {product.name}
        </Link>
        <p className="mt-1 text-[13px] text-graphite">
          {specLine(product)}{product.series && !isInverter(product) ? `, ${product.series}` : ''}
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-ok">
          <ShieldCheck className="h-3.5 w-3.5" /> {product.warranty.totalMonths} months warranty
        </p>
        {vehicleHint && <p className="mt-1 text-[12px] text-graphite">Fits {vehicleHint}</p>}

        <div className="mt-auto pt-3">
          <Price mrp={product.mrp} price={product.sellingPrice} />
          <p className="mt-0.5 h-4 text-[12px] font-medium">
            {outOfStock ? <span className="text-plus">Out of stock</span> : fewLeft ? <span className="text-buy">Only {product.stock} left</span> : null}
          </p>
          {product.purchasable ? (
            <button
              className="btn-volt mt-2 w-full py-2 text-sm"
              disabled={busy === `add-${product._id}`}
              onClick={() => addToCart(product)}
            >
              {busy === `add-${product._id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />} Add to cart
            </button>
          ) : (
            <Link to={`/enquiry?product=${product._id}&type=Product+Enquiry`} className="btn-outline mt-2 w-full py-2 text-sm">
              <MessageSquareText className="h-4 w-4" /> {priced ? 'Ask about stock' : 'Ask for price'}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, vehicleHint }: { products: Product[]; vehicleHint?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} vehicleHint={vehicleHint} />
      ))}
    </div>
  );
}

/** A titled, horizontally scrolling row of products, like a store shelf. */
export function ProductRail({ title, products, viewAll }: { title: string; products: Product[]; viewAll?: string }) {
  if (!products.length) return null;
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-sans text-xl font-bold tracking-normal sm:text-[22px]">{title}</h2>
        {viewAll && (
          <Link to={viewAll} className="flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-link hover:underline">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
        {products.map((p) => (
          <div key={p._id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23.5%] lg:w-[18.8%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
