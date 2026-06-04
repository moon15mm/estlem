'use client';

import Image from 'next/image';
import { Plus, Package } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@estlem/shared';

interface Props {
  product: Product;
  onAdd: () => void;
}

export function ProductCard({ product, onAdd }: Props) {
  const price = Number(product.salePrice ?? product.price);
  const originalPrice = product.salePrice ? Number(product.price) : null;
  const soldOut = product.stockQuantity === 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all group">
      <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.nameAr}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-[#1B4F72]/10 group-hover:scale-110 transition-transform duration-300">
              {product.nameAr?.charAt(0) ?? '?'}
            </span>
          </div>
        )}

        {product.salePrice && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg animate-pulse-soft">
            خصم
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-white/95 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">نفذت الكمية</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-bold leading-tight mb-2 line-clamp-2 text-gray-800">{product.nameAr}</p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[#1B4F72] font-black text-base leading-none">{formatPrice(price)}</span>
            {originalPrice && (
              <span className="text-gray-400 text-[10px] line-through mt-0.5">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          <button
            disabled={soldOut}
            onClick={onAdd}
            className="relative h-9 w-9 rounded-full bg-gradient-to-br from-[#1B4F72] to-[#16537E] text-white shadow-lg shadow-[#1B4F72]/30 flex items-center justify-center cursor-pointer active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed group/btn"
            aria-label="إضافة للسلة"
          >
            <Plus className="h-4 w-4 group-hover/btn:rotate-90 transition-transform duration-300" />
            <span className="absolute inset-0 rounded-full bg-[#1ABC9C]/0 group-active/btn:bg-[#1ABC9C]/30 group-active/btn:animate-ripple" />
          </button>
        </div>
      </div>
    </div>
  );
}
