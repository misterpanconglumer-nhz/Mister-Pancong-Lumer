'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Product, Category, ProductVariant } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah } from '@/lib/utils/formatters';
import { UtensilsCrossed, Plus, Edit, Trash2, Tag, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function ProductsManagementPage() {
  const { isOwner, isAdminPusat } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);

  // Form states for creating/editing products
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('cat-1');
  const [basePrice, setBasePrice] = useState<string>('12000');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [variantsList, setVariantsList] = useState<Array<{ name: string; variant_type: string; additional_price: number }>>([
    { name: 'Cokelat Lumer', variant_type: 'rasa', additional_price: 3000 },
    { name: 'Keju Parut Extra', variant_type: 'topping', additional_price: 2000 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [pList, cList] = await Promise.all([
        DataService.getProducts(),
        DataService.getCategories(),
      ]);
      setProducts(pList);
      setCategories(cList);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleOpenAdd = () => {
    setEditingProductId(null);
    setName('');
    setDescription('');
    setBasePrice('12000');
    setImageUrl('');
    setVariantsList([
      { name: 'Cokelat Lumer', variant_type: 'rasa', additional_price: 3000 },
      { name: 'Keju Parut Extra', variant_type: 'topping', additional_price: 2000 },
    ]);
    setShowProductModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setDescription(product.description || '');
    setCategoryId(product.category_id || 'cat-1');
    setBasePrice(String(product.base_price));
    setImageUrl(product.image_url || '');
    setVariantsList(
      product.variants?.map((v) => ({
        name: v.name,
        variant_type: v.variant_type,
        additional_price: v.additional_price,
      })) || []
    );
    setShowProductModal(true);
  };

  const handleAddVariantRow = () => {
    setVariantsList([...variantsList, { name: '', variant_type: 'rasa', additional_price: 0 }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariantsList(variantsList.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const productVariants: ProductVariant[] = variantsList
        .filter((v) => v.name.trim() !== '')
        .map((v, idx) => ({
          id: `v-${Date.now()}-${idx}`,
          product_id: editingProductId || '',
          variant_type: v.variant_type,
          name: v.name,
          additional_price: Number(v.additional_price) || 0,
          is_available: true,
        }));

      await DataService.saveProduct({
        id: editingProductId || undefined,
        name,
        description,
        category_id: categoryId,
        base_price: Number(basePrice) || 0,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
        is_active: true,
        variants: productVariants,
      });

      setShowProductModal(false);
      await fetchCatalog();
    } catch (err) {
      console.error('Failed to save product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manajemen Produk & Varian</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola menu pancong lumer, minuman, varian rasa & topping tambahan</p>
        </div>
        {(isOwner || isAdminPusat) && (
          <button
            onClick={handleOpenAdd}
            className="py-3 px-5 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-lg shadow-brand-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        )}
      </div>

      {/* Product List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">Memuat katalog...</div>
        ) : products.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">Belum ada produk tersimpan.</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-amber-50">
                  <img
                    src={p.image_url || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80'}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-bold text-amber-300">
                    {formatRupiah(p.base_price)}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{p.name}</h3>
                {p.description && <p className="text-xs text-slate-500">{p.description}</p>}

                {/* Varian chips */}
                {p.variants && p.variants.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Varian ({p.variants.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {p.variants.map((v) => (
                        <span key={v.id} className="px-2 py-0.5 rounded-lg bg-amber-100/70 text-amber-900 text-[10px] font-semibold">
                          {v.name} {v.additional_price > 0 ? `(+${formatRupiah(v.additional_price)})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {p.is_active ? 'Tersedia' : 'Non-aktif'}
                </span>

                {(isOwner || isAdminPusat) && (
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Produk</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              {editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pancong Lumer Signature / Es Teh Manis"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Harga Dasar (Rp)</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="12000"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">URL Foto Produk (Opsional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Ringkas</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pancong khas Mister Pancong Lumer..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              {/* Dynamic Variants Builder */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Varian & Topping Tambahan</span>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-brand-800 font-bold hover:underline"
                  >
                    + Tambah Varian
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {variantsList.map((v, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nama varian (e.g. Cokelat Lumer)"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[idx].name = e.target.value;
                          setVariantsList(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold"
                      />
                      <select
                        value={v.variant_type}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[idx].variant_type = e.target.value;
                          setVariantsList(updated);
                        }}
                        className="w-24 px-2 py-1.5 border rounded-lg text-[11px] font-semibold"
                      >
                        <option value="rasa">Rasa</option>
                        <option value="ukuran">Ukuran</option>
                        <option value="topping">Topping</option>
                        <option value="ekstra">Ekstra</option>
                      </select>
                      <input
                        type="number"
                        placeholder="+Harga"
                        value={v.additional_price}
                        onChange={(e) => {
                          const updated = [...variantsList];
                          updated[idx].additional_price = Number(e.target.value) || 0;
                          setVariantsList(updated);
                        }}
                        className="w-20 px-2 py-1.5 border rounded-lg text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
