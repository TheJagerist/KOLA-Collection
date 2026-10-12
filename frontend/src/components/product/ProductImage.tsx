import { useState } from 'react';
import { Shirt } from 'lucide-react';
import type { Product } from '../../lib/api/types';
import { cn } from '../../lib/cn';
import { productTint } from '../../lib/format';

type P = Pick<Product, 'image_url' | 'name' | 'ensemble' | 'cat'>;

export function ProductImage({ product, className, imgClassName }: { product: P; className?: string; imgClassName?: string }) {
  const [failed, setFailed] = useState(false);
  const show = product.image_url && !failed;
  return (
    <div className={cn('relative overflow-hidden bg-photo', className)}>
      {show ? (
        <img
          src={product.image_url!}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('size-full object-cover', imgClassName)}
        />
      ) : (
        <div className={cn('grid size-full place-items-center bg-gradient-to-br', productTint(product))}>
          <Shirt className="size-1/4 text-white/50" strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}
