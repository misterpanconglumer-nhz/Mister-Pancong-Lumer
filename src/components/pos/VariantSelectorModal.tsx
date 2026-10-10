'use client';

import React, { useState } from 'react';
import { Product, ProductVariant, CartVariantSelection } from '@/types';
import { X, Plus, Minus, Check } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/formatters';

interface VariantSelectorModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (selectedVariants: CartVariantSelection[], quantity: number) => void;
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const variants = product.variants || [];
  
  // Group variants by variant_type
  const variantGroups = variants.reduce((acc, v) => {
    const type = v.variant_type || 'pilihan';
    if (!acc[type]) acc[type] = [];
    acc[type].push(v);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  // Default selection: pick first item of single-select groups
  const [selectedVariants, setSelectedVariants] = useState<CartVariantSelection[]>(() => {
    const initial: CartVariantSelection[] = [];
    Object.entries(variantGroups).forEach(([type, group]) => {
      // Pick first item if variant_type is rasa, tingkat_kematangan, or ukuran
      if (['rasa', 'ukuran', 'tingkat_kematangan'].includes(type) && group.length > 0) {
        initial.push({
          variant_id: group[0].id,
          variant_type: type,
          name: group[0].name,
          additional_price: group[0].additional_price,
        });
      }
    });
    return initial;
  });

  const [quantity, setQuantity] = useState<number>(1);

  const toggleVariant = (v: ProductVariant) => {
    const type = v.variant_type;
    const isSingleSelect = ['rasa', 'ukuran', 'tingkat_kematangan'].includes(type);

    setSelectedVariants((prev) => {
      if (isSingleSelect) {
        // Replace existing selection for this type
        const filtered = prev.filter((item) => item.variant_type !== type);
        return [
          ...filtered,
          {
            variant_id: v.id,
            variant_type: type,
            name: v.name,
            additional_price: v.additional_price,
          },
        ];
      } else {
        // Multi-select (like extra toppings)
        const exists = prev.some((item) => item.variant_id === v.id);
        if (exists) {
          return prev.filter((item) => item.variant_id !== v.id);
        } else {
          return [
            ...prev,
            {
              variant_id: v.id,
              variant_type: type,
              name: v.name,
              additional_price: v.additional_price,
            },
          ];
        }
      }
    });
  };

  const additionalPriceSum = selectedVariants.reduce((sum, v) => sum + v.additional_price, 0);
  const unitPrice = product.base_price + additionalPriceSum;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onAddToCart(selectedVariants, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="relative p-4 border-b border-slate-100 flex items-center justify-between bg-cream-50">
          <div className="flex items-center gap-3">
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80'}
              alt={product.name}
              className="w-12 h-12 rounded-xl object-cover shadow-sm border border-amber-200"
            />
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">{product.name}</h3>
              <p className="text-xs font-bold text-brand-800">{formatRupiah(product.base_price)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable options */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {Object.keys(variantGroups).length === 0 ? (
            <p className="text-xs text-slate-500 italic">Tidak ada varian tambahan untuk produk ini.</p>
          ) : (
            Object.entries(variantGroups).map(([type, group]) => {
              const isSingle = ['rasa', 'ukuran', 'tingkat_kematangan'].includes(type);
              const labelTitle =
                type === 'rasa'
                  ? 'Pilihan Rasa'
                  : type === 'ukuran'
                  ? 'Ukuran Porsi'
                  : type === 'tingkat_kematangan'
                  ? 'Tingkat Kematangan'
                  : 'Topping & Ekstra Tambahan';

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{labelTitle}</span>
                    <span className="text-[10px] text-slate-400">
                      {isSingle ? 'Pilih 1' : 'Bisa pilih lebih dari 1'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.map((v) => {
                      const isSelected = selectedVariants.some((sv) => sv.variant_id === v.id);
                      return (
                        <button
                          key={v.id}
                          onClick={() => toggleVariant(v)}
                          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-brand-700 bg-amber-50 shadow-sm ring-2 ring-brand-700/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{v.name}</p>
                            <p className="text-[11px] text-brand-800 font-semibold mt-0.5">
                              {v.additional_price > 0 ? `+${formatRupiah(v.additional_price)}` : 'Gratis'}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Quantity Selector */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Jumlah Pesanan</span>
            <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-xl bg-white text-slate-800 shadow-sm flex items-center justify-center font-bold hover:bg-slate-200"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-slate-900 text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-xl bg-brand-700 text-white shadow-sm flex items-center justify-center font-bold hover:bg-brand-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Subtotal Produk</p>
            <p className="text-lg font-extrabold text-brand-900 leading-tight">{formatRupiah(totalPrice)}</p>
          </div>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-sm shadow-lg shadow-brand-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Masukkan Keranjang</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default VariantSelectorModal;
