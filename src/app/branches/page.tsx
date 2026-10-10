'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Branch, UserProfile, UserRole } from '@/types';
import { DataService } from '@/lib/services/dataService';
import { Store, Plus, Users, MapPin, Phone, Edit, Trash2, UserPlus, Lock, Key, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function BranchesPage() {
  const { isOwner } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form states for Branch
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [initialCash, setInitialCash] = useState<string>('100000');

  // Form states for User
  const [empName, setEmpName] = useState<string>('');
  const [empUsername, setEmpUsername] = useState<string>('');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPassword, setEmpPassword] = useState<string>('123');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empRole, setEmpRole] = useState<UserRole>('penjual');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bList, uList] = await Promise.all([
        DataService.getBranches(),
        DataService.getUsers(),
      ]);
      setBranches(bList);
      setUsers(uList);
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!isOwner) {
    return (
      <div className="py-16 text-center space-y-3 bg-white rounded-3xl p-8 border border-slate-100 max-w-md mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500">
          Hanya Owner yang dapat mengelola dan mengedit cabang serta akun pegawai.
        </p>
      </div>
    );
  }

  // Branch Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setCode('');
    setName('');
    setAddress('');
    setPhone('');
    setIsActive(true);
    setInitialCash('100000');
    setShowAddBranchModal(true);
  };

  const handleOpenEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setCode(b.code);
    setName(b.name);
    setAddress(b.address || '');
    setPhone(b.phone || '');
    setIsActive(b.is_active);
    setInitialCash(String(b.initial_cash_default || 100000));
    setShowAddBranchModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    await DataService.saveBranch({
      id: editingBranch ? editingBranch.id : undefined,
      code: code.toUpperCase(),
      name,
      address,
      phone,
      is_active: isActive,
      initial_cash_default: Number(initialCash) || 100000,
    });

    setShowAddBranchModal(false);
    setEditingBranch(null);
    await fetchData();
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus cabang ini?')) {
      await DataService.deleteBranch(branchId);
      await fetchData();
    }
  };

  // User Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setEmpName('');
    setEmpUsername('');
    setEmpEmail('');
    setEmpPassword('123');
    setEmpPhone('');
    setEmpRole('penjual');
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEmpName(u.full_name);
    setEmpUsername(u.username || u.email.split('@')[0]);
    setEmpEmail(u.email);
    setEmpPassword(u.password || '123');
    setEmpPhone(u.phone || '');
    setEmpRole(u.role);
    setShowAddUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empUsername.trim()) return;

    await DataService.saveUser({
      id: editingUser ? editingUser.id : undefined,
      full_name: empName,
      username: empUsername.toLowerCase(),
      email: empEmail || `${empUsername.toLowerCase()}@panconglumer.com`,
      password: empPassword,
      phone: empPhone,
      role: empRole,
    });

    setShowAddUserModal(false);
    setEditingUser(null);
    await fetchData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus akun pegawai ini?')) {
      await DataService.deleteUser(userId);
      await fetchData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manajemen Cabang & Pegawai</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola data cabang, akun username, & password pegawai operasional</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenAddBranch}
            className="py-3 px-4 rounded-2xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Cabang</span>
          </button>
          <button
            onClick={handleOpenAddUser}
            className="py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold text-xs shadow-md flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pegawai</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="space-y-3">
        <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          <span>Daftar Cabang Aktif ({branches.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-brand-900 font-extrabold flex items-center justify-center font-mono text-sm">
                      {b.code}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Cabang {b.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">Kode: {b.code}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {b.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>

                {b.address && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEditBranch(b)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 text-brand-900 font-bold text-xs hover:bg-amber-200 transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Cabang</span>
                </button>
                <button
                  onClick={() => handleDeleteBranch(b.id)}
                  className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50"
                  title="Hapus Cabang"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      <div className="space-y-3 pt-4">
        <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-600" />
          <span>Daftar Akun Pegawai ({users.length})</span>
        </h2>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{u.full_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 capitalize">
                    {u.role.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500 font-mono">
                  <span>Username: <strong className="text-brand-900">{u.username}</strong></span>
                  <span>Pass: <strong className="text-slate-800">{u.password || '123'}</strong></span>
                  {u.email && <span className="font-sans text-[11px] text-slate-400">({u.email})</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditUser(u)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>Edit Pegawai</span>
                </button>
                {u.role !== 'owner' && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50"
                    title="Hapus Pegawai"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              {editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Baru'}
            </h3>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Cabang</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cidodol / Blujami"
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kode Cabang (3 Huruf)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CDD"
                    className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status Cabang</label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    className="w-full px-3 py-2.5 border rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="true">Aktif Beroperasi</option>
                    <option value="false">Non-aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Lengkap Cabang</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Cidodol Raya No. 12..."
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-amber-100 font-bold text-xs shadow-md"
                >
                  {editingBranch ? 'Simpan Perubahan' : 'Tambah Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Employee User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              {editingUser ? `Edit Pegawai: ${editingUser.full_name}` : 'Tambah Pegawai Baru'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap Pegawai</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Contoh: Budi Kasir"
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    placeholder="kasircdd"
                    className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password Login *</label>
                  <input
                    type="text"
                    required
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Pegawai (Opsional)</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="budi@panconglumer.com"
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Role / Hak Akses</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 border rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="penjual">Penjual / Kasir</option>
                  <option value="admin_cabang">Admin Cabang</option>
                  <option value="admin_pusat">Admin Pusat</option>
                  <option value="owner">Owner (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-brand-900 font-bold text-xs shadow-md"
                >
                  {editingUser ? 'Simpan Pegawai' : 'Tambah Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
