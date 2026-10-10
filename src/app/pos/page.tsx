'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Product, Category, SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah } from '@/lib/utils/formatters';
import { Search, ShoppingBag, Plus, Sparkles, Filter } from 'lucide-react';
import VariantSelectorModal from '@/components/pos/VariantSelectorModal';
import CartDrawer from '@/components/pos/CartDrawer';
import ReceiptModal from '@/components/pos/ReceiptModal';

export default function PosPage() {
  const { activeBranch } = useAuth();
  const { addToCart, cartTotalCount, cartSubtotal } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<SaleTransaction | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pList, cList] = await Promise.all([
          DataService.getProducts(),
          DataService.getCategories(),
        ]);
        setProducts(pList.filter((p) => p.is_active));
        setCategories(cList);
      } catch (err) {
        console.error('Error fetching POS data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelectProduct = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      addToCart(product, [], 1);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner / Branch Info */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-800 text-amber-50 p-4 rounded-3xl shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
            Kasir Operasional
          </span>
          <h1 className="text-lg md:text-xl font-extrabold text-white mt-0.5">
            {activeBranch ? `Cabang ${activeBranch.name}` : 'Mister Pancong Lumer'}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Sentuh gambar untuk memilih varian lumer & topping</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Search, Category Chips & Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search Bar & Category Filters */}
          <div className="space-y-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pancong lumer, crispy, atau minuman..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:bg-white"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-brand-900 text-amber-200 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Menu
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-brand-900 text-amber-200 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat menu produk...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-3xl p-6 border border-slate-100">
              <p className="text-sm font-bold text-slate-700">Produk Tidak Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian atau kategori lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-3 flex flex-col justify-between cursor-pointer group active:scale-98"
                >
                  <div>
                    {/* Image with Placeholder Support */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-amber-50 mb-2.5">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.variants && product.variants.length > 0 && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-amber-300">
                          {product.variants.length} Varian
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-xs md:text-sm text-slate-900 leading-tight group-hover:text-brand-800 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Mulai</p>
                      <p className="text-xs md:text-sm font-extrabold text-brand-900 leading-tight">
                        {formatRupiah(product.base_price)}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-brand-900 font-bold group-hover:bg-brand-800 group-hover:text-amber-100 flex items-center justify-center transition-colors shadow-xs">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Right Col (Desktop): Cart Drawer */}
        <div className="hidden lg:block sticky top-20 h-[calc(100vh-6rem)]">
          <CartDrawer onTransactionComplete={(trx) => setCompletedTransaction(trx)} />
        </div>

      </div>

      {/* Mobile Sticky Floating Cart Button */}
      {cartTotalCount > 0 && (
        <div className="fixed bottom-16 inset-x-4 z-40 lg:hidden animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full p-4 rounded-2xl bg-brand-900 text-amber-100 font-bold text-sm shadow-2xl flex items-center justify-between border border-brand-700 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-brand-900 font-extrabold flex items-center justify-center">
                {cartTotalCount}
              </div>
              <div className="text-left">
                <p className="text-xs text-amber-300">Total Keranjang</p>
                <p className="text-sm font-extrabold text-white">{formatRupiah(cartSubtotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-300 font-bold text-xs">
              <span>Bayar Sekarang</span>
              <ShoppingBag className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Fullscreen Cart Modal */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end lg:hidden">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-100 flex justify-end">
              <button
                onClick={() => setShowMobileCart(false)}
                className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Tutup [X]
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartDrawer
                onTransactionComplete={(trx) => {
                  setShowMobileCart(false);
                  setCompletedTransaction(trx);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <VariantSelectorModal
          product={selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          onAddToCart={(selectedVariants, quantity) => {
            addToCart(selectedProductForVariant, selectedVariants, quantity);
          }}
        />
      )}

      {/* Printable Receipt Proof Modal */}
      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          onClose={() => setCompletedTransaction(null)}
        />
      )}

    </div>
  );
}
