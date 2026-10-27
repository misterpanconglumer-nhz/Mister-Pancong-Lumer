'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Product, Category, ProductVariant } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { formatRupiah } from '@/lib/utils/formatters';
import { UtensilsCrossed, Plus, Edit, Trash2, Tag, Layers, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { testSupabaseConnection } from '@/lib/supabase/client';

export default function ProductsManagementPage() {
  const { isOwner, isAdminPusat } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Modals
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);

  // Form states for Product
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [basePrice, setBasePrice] = useState<string>('12000');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState<boolean>(false);

  // Form states for Category
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);
  const [isDbPaused, setIsDbPaused] = useState<boolean>(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [pList, cList, conn] = await Promise.all([
        DataService.getProducts(),
        DataService.getCategories(),
        testSupabaseConnection(),
      ]);
      setProducts(pList);
      setCategories(cList);
      setIsDbPaused(!conn.success);
      if (cList.length > 0 && !categoryId) {
        setCategoryId(cList[0].id);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
      setIsDbPaused(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setName('');
    setDescription('');
    setBasePrice('12000');
    setImageUrl('');
    setCategoryId(categories[0]?.id || '');
    setIsActive(true);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setDescription(product.description || '');
    setCategoryId(product.category_id || categories[0]?.id || '');
    setBasePrice(String(product.base_price));
    setImageUrl(product.image_url || '');
    setIsActive(product.is_active ?? true);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama menu/produk tidak boleh kosong!');
      return;
    }

    const priceNum = Number(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Harga produk harus berupa angka nominal yang valid!');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      await DataService.saveProduct({
        id: editingProductId || undefined,
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId || categories[0]?.id || undefined,
        base_price: priceNum,
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
        is_active: isActive,
        variants: [],
      });

      setShowProductModal(false);
      alert(editingProductId ? '✓ Menu berhasil diperbarui!' : '✓ Menu baru berhasil ditambahkan!');
      await fetchCatalog();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert('Gagal menyimpan menu: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Nama kategori tidak boleh kosong!');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      await DataService.saveCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      alert('✓ Kategori baru berhasil ditambahkan!');
      await fetchCatalog();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      alert('Gagal menambah kategori: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      await DataService.deleteCategory(catId);
      await fetchCatalog();
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!isOwner && !isAdminPusat) {
      alert('Akses Dibatasi: Hanya Owner yang berhak menghapus menu.');
      return;
    }

    const confirmMsg = `Hapus menu "${productName}" secara permanen?\n\nMenu ini tidak akan tampil lagi di kasir.`;
    if (window.confirm(confirmMsg)) {
      try {
        await DataService.deleteProduct(productId);
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        if (editingProductId === productId) {
          setShowProductModal(false);
          setEditingProductId(null);
        }
        alert(`✓ Menu "${productName}" berhasil dihapus!`);
        await fetchCatalog();
      } catch (err: any) {
        console.error('Failed to delete product:', err);
        alert('Gagal menghapus produk: ' + (err?.message || 'Terjadi kesalahan'));
      }
    }
  };

  const filteredProducts = selectedCategoryId === 'all'
    ? products
    : products.filter((p) => p.category_id === selectedCategoryId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manajemen Kategori, Produk & Varian</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola kategori menu, varian rasa, topping, dan harga produk</p>
        </div>
        {(isOwner || isAdminPusat) ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="py-3 px-4 rounded-2xl bg-amber-100 hover:bg-amber-200 text-[#3d1e0f] font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-amber-300/60"
            >
              <Layers className="w-4 h-4" />
              <span>Kelola Kategori</span>
            </button>

            <button
              onClick={handleOpenAddProduct}
              className="py-3 px-5 rounded-2xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-lg shadow-amber-950/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        ) : (
          <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <span>Login sebagai <strong>Owner</strong> untuk menambah atau mengedit menu</span>
          </div>
        )}
      </div>

      {/* Banner Notifikasi Database Cloud Terjeda */}
      {isDbPaused && (
        <div className="bg-amber-500/15 border border-amber-400 rounded-3xl p-4 sm:p-5 text-amber-950 text-xs space-y-2.5 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-black text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Database Cloud (Supabase) Sedang Terjeda (Paused Otomatis)</span>
          </div>
          <p className="leading-relaxed text-slate-700">
            Daftar menu yang terlihat saat ini adalah <strong>data cadangan lokal</strong>. Seluruh data menu asli Anda (yang sudah Anda tambah foto, revisi harga, dan hapus menu teh) <strong>tersimpan dengan aman</strong> di server Supabase.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/urjakwhbkwsimtzdftpb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3d1e0f] text-amber-100 rounded-xl font-bold text-xs hover:bg-black active:scale-95 transition-all shadow-sm"
            >
              <span>Buka Supabase &amp; Klik &quot;Restore project&quot;</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={fetchCatalog}
              className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 rounded-xl font-bold text-xs hover:bg-amber-50 active:scale-95 transition-all"
            >
              Cek Ulang Koneksi
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold shrink-0 transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-[#3d1e0f] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          Semua Produk ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold shrink-0 transition-all ${
                selectedCategoryId === c.id
                  ? 'bg-[#3d1e0f] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold">Memuat katalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 p-8">
            <UtensilsCrossed className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Belum ada produk di kategori ini</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Tambah Produk Baru' di atas untuk menambahkan menu.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const catName = categories.find((c) => c.id === p.category_id)?.name || 'Kategori';
            return (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-amber-200 transition-all">
                <div className="space-y-2">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-amber-50">
                    <img
                      src={p.image_url || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-[10px] font-black text-amber-300 shadow-sm">
                      {formatRupiah(p.base_price)}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-amber-500 text-[#3d1e0f] text-[10px] font-black uppercase">
                      {catName}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{p.name}</h3>
                  {p.description && <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>}


                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {p.is_active ? 'Tersedia' : 'Non-aktif'}
                  </span>

                  {(isOwner || isAdminPusat) && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-[#3d1e0f] font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Menu</span>
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-colors"
                        title="Hapus Menu Ini (Khusus Owner)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Kelola Kategori */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-amber-950/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-slate-900">Kelola Kategori Menu</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form Tambah Kategori Baru */}
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Tambah Kategori Baru</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Contoh: Pancong Lumer, Minuman Segar..."
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-4 py-2.5 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shrink-0 shadow-sm"
                >
                  {isSubmittingCategory ? 'Simpan...' : '+ Tambah'}
                </button>
              </div>
            </form>

            {/* List Kategori Saat Ini */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daftar Kategori ({categories.length}):</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50">
                    <span className="text-xs font-extrabold text-slate-800">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs mt-2"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
            <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
              {editingProductId ? 'Edit Menu Produk' : 'Tambah Produk Baru'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Produk / Menu</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pancong Lumer Signature / Es Teh Manis"
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
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

              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-1">Status Ketersediaan</label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="true">Tersedia (Aktif di Kasir)</option>
                  <option value="false">Habis / Nonaktif</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingProductId && (isOwner || isAdminPusat) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = products.find((p) => p.id === editingProductId);
                      if (prod) handleDeleteProduct(prod.id, prod.name);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Menu</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProduct}
                    className="py-2.5 px-5 rounded-xl bg-[#3d1e0f] hover:bg-amber-950 text-amber-100 font-bold text-xs shadow-md disabled:opacity-50"
                  >
                    {isSubmittingProduct ? 'Memproses...' : 'Simpan Produk'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
