'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Product, Category, SaleTransaction } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah } from '@/lib/utils/formatters';
import { Search, ShoppingBag, Plus, Sparkles, Filter, X } from 'lucide-react';
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

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelectProduct = (product: Product) => {
    addToCart(product, [], 1);
  };

  return (
    <div className="space-y-3 pb-24 md:pb-6">
      
      {/* Top Banner / Branch Header */}
      <div className="bg-gradient-to-r from-[#3d1e0f] via-[#522b17] to-amber-950 text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
            Kasir POS Cabang
          </span>
          <h1 className="text-base sm:text-xl font-black text-white mt-0.5">
            {activeBranch ? `Cabang ${activeBranch.name}` : 'Mister Pancong Lumer'}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Sentuh menu untuk langsung menambahkan ke pesanan kasir</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        
        {/* Left 2 Cols: Search, Category Chips & Product Grid */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Search Bar & Category Filters */}
          <div className="space-y-2.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pancong, crispy, es teh..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3d1e0f] focus:bg-white"
              />
            </div>

            {/* Category Filter Chips Horizontal Slider */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#3d1e0f] text-amber-200 shadow-xs scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Menu
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-[#3d1e0f] text-amber-200 shadow-xs scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Optimized Product Grid (2 columns on mobile) */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Memuat katalog pancong...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl p-6 border border-slate-100">
              <p className="text-sm font-bold text-slate-700">Produk Tidak Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain atau pilih kategori Semua Menu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-amber-900/10 shadow-xs hover:shadow-md transition-all p-2.5 sm:p-3 flex flex-col justify-between cursor-pointer group active:scale-95"
                >
                  <div>
                    {/* Image Box */}
                    <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-amber-50 mb-2">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 leading-snug group-hover:text-amber-900 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harga</p>
                      <p className="text-sm sm:text-base font-black text-[#3d1e0f] leading-tight">
                        {formatRupiah(product.base_price)}
                      </p>
                    </div>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 text-[#3d1e0f] font-black group-hover:bg-[#3d1e0f] group-hover:text-amber-200 flex items-center justify-center transition-colors shadow-xs">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
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
        <div className="fixed bottom-14 inset-x-3 z-40 lg:hidden animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full p-3.5 rounded-2xl bg-[#3d1e0f] text-amber-100 font-black text-xs shadow-2xl flex items-center justify-between border border-amber-700/50 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-[#3d1e0f] font-black text-xs flex items-center justify-center">
                {cartTotalCount}
              </div>
              <div className="text-left leading-none">
                <p className="text-[10px] text-amber-300 font-bold">Keranjang Belanja</p>
                <p className="text-sm font-black text-white mt-0.5">{formatRupiah(cartSubtotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-[#3d1e0f] font-black text-xs">
              <span>Bayar / Detail</span>
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Fullscreen Bottom Sheet Cart Modal */}
      {showMobileCart && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex flex-col justify-end lg:hidden animate-in fade-in">
          <div className="bg-white rounded-t-3xl max-h-[92dvh] h-[92dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 bg-[#3d1e0f] text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm">Pesanan & Pembayaran</span>
                {cartTotalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-[#3d1e0f]">
                    {cartTotalCount} item
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-amber-900 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              <CartDrawer
                hideHeader={true}
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
