'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@estlem/shared';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface Props {
  product: Product;
  onAdd: () => void;
}

export function ProductCard({ product, onAdd }: Props) {
  const { t, lang } = useTranslation();
  const price = Number(product.salePrice ?? product.price);
  const originalPrice = product.salePrice ? Number(product.price) : null;
  const soldOut = product.stockQuantity === 0;
  const productName = lang === 'ar' ? product.nameAr : ((product as any).name || product.nameAr);

  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col border border-[#EBEBEB] transition-all duration-150 active:scale-[0.97]">
      {/* Image */}
      <div className="relative h-36 bg-[#F5F5F5] overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={productName}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center select-none">
            <span className="text-5xl font-black text-[#111]/[0.07]">
              {productName?.charAt(0) ?? '؟'}
            </span>
          </div>
        )}

        {product.salePrice && (
          <div className="absolute top-2 right-2 bg-[#111] text-white text-[9px] font-black px-2 py-1 rounded-lg">
            خصم
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
            <span className="bg-[#111] text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {t('product.outOfStock')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[13px] font-bold leading-snug mb-2.5 line-clamp-2 text-[#111]">
          {productName}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[#111] font-black text-[15px] leading-none">{formatPrice(price)}</span>
            {originalPrice && (
              <span className="text-[#BBB] text-[10px] line-through mt-0.5">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          <button
            disabled={soldOut}
            onClick={onAdd}
            className="h-9 w-9 shrink-0 rounded-full bg-[#111] text-white flex items-center justify-center transition-all duration-150 active:scale-90 hover:bg-[#333] disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label={t('product.addToCart')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
