import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircuitBoard, MessageSquareText } from 'lucide-react';
import { api } from '../api/client';
import type { Product } from '../api/types';
import { ProductGrid } from '../components/ProductCard';
import { Empty, ErrorNote, Spinner } from '../components/ui';

export default function Pcb() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ products: Product[] }>('/products?category=PCB&limit=200')
      .then((r) => setProducts(r.products.filter((p) => p.productType === 'PCB')))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="container-x py-6 sm:py-8">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ink text-volt">
          <CircuitBoard className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-normal">PCB</h1>
          <p className="mt-1 max-w-2xl text-graphite">
            Choose a board, enter the quantity you need and place your order. We will contact you to confirm the order and pricing.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <ErrorNote>{err}</ErrorNote>
        {!products && !err && <Spinner />}
        {products && !products.length && (
          <Empty
            title="PCB products are being added"
            action={
              <Link to="/enquiry?type=Product+Enquiry&product_label=PCB" className="btn-primary">
                <MessageSquareText className="h-4 w-4" /> Ask us about PCBs
              </Link>
            }
          >
            Tell us what board you need and we will get back to you.
          </Empty>
        )}
        {!!products?.length && <ProductGrid products={products} />}
      </div>
    </div>
  );
}
