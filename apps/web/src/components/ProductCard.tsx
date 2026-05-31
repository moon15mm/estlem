'use client';

import Image from 'next/image';
import { Plus, Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@estlem/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  product: Product;
  onAdd: () => void;
}

export function ProductCard({ product, onAdd }: Props) {
  const price = Number(product.salePrice ?? product.price);
  const originalPrice = product.salePrice ? Number(product.price) : null;
  const soldOut = product.stockQuantity === 0;

  return (
    <Card className="overflow-hidden flex flex-col p-0">
      <div className="relative h-36 bg-secondary">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.nameAr} fill className="object-cover" sizes="50vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <Package className="h-12 w-12" />
          </div>
        )}
        {product.salePrice && (
          <Badge variant="destructive" className="absolute top-2 right-2">خصم</Badge>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="muted" className="bg-black/60 text-white">نفذت الكمية</Badge>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-semibold leading-tight mb-1 line-clamp-2">{product.nameAr}</p>
        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-primary font-bold text-sm">{formatPrice(price)}</span>
            {originalPrice && (
              <span className="text-muted-foreground text-xs line-through mr-1">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <Button size="icon" disabled={soldOut} onClick={onAdd} className="h-8 w-8 rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
