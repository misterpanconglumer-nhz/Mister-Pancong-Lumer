'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Store, ChevronDown, LogOut, Settings, Calculator, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import CalculatorModal from '@/components/common/CalculatorModal';

export const Navbar: React.FC = () => {
  const { user, activeBranch, branches, setActiveBranch, isOwner, loginAsDemoUser, logout } = useAuth();
  const { settings } = useApp();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#3d1e0f] text-amber-50 shadow-md border-b border-amber-950/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Logo & Brand Name */}
            <Link href={isOwner ? '/dashboard' : '/pos'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center font-bold text-[#3d1e0f] text-base sm:text-lg shrink-0">
                {settings.logo_url && !settings.logo_url.includes('placeholder') ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span>PL</span>
                )}
              </div>
              <div className="leading-none">
                <h1 className="text-sm sm:text-lg font-black tracking-tight text-white truncate max-w-[140px] sm:max-w-none">
                  {settings.app_name}
                </h1>
                <p className="text-[10px] text-amber-300 font-medium mt-0.5">{settings.brand_owner}</p>
              </div>
            </Link>

            {/* Controls Header */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              
              {/* Calculator Quick Button */}
              <button
                onClick={() => setShowCalc(true)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 transition-colors flex items-center gap-1 text-xs font-bold border border-amber-800/40"
                title="Buka Kalkulator Kasir"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Kalkulator</span>
              </button>

              {/* Branch Picker */}
              <div className="relative">
                {isOwner ? (
                  <button
                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/40 hover:bg-amber-900/80 text-xs font-bold text-amber-100 transition-colors"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span className="max-w-[80px] sm:max-w-none truncate">{activeBranch ? activeBranch.name : 'Cabang'}</span>
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/40 text-xs font-bold text-amber-200">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span className="max-w-[80px] sm:max-w-none truncate">{activeBranch ? activeBranch.name : 'Cabang'}</span>
                  </div>
                )}

                {/* Branch Dropdown */}
                {showBranchMenu && isOwner && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-2xl shadow-2xl py-1.5 border border-slate-100 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Pilih Cabang Aktif
                    </div>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBranch(b);
                          setShowBranchMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-amber-50 transition-colors ${
                          activeBranch?.id === b.id ? 'bg-amber-100 font-extrabold text-[#3d1e0f]' : 'text-slate-700'
                        }`}
                      >
                        <span>{b.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-[#3d1e0f] font-mono">
                          {b.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Profile / Fast Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-[#3d1e0f] font-black text-xs flex items-center justify-center">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-white">{user?.full_name?.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl py-2 border border-slate-100 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-extrabold text-slate-900">{user?.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{user?.username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 capitalize">
                        Role: {user?.role?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Fast Switch Role */}
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-1.5">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Simulasi Role (Demo):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            loginAsDemoUser('owner');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] bg-white border hover:bg-amber-50 text-left font-bold text-slate-700"
                        >
                          👑 Owner
                        </button>
                        <button
                          onClick={() => {
                            loginAsDemoUser('admin_pusat');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] bg-white border hover:bg-amber-50 text-left font-bold text-slate-700"
                        >
                          💼 Admin
                        </button>
                        <button
                          onClick={() => {
                            loginAsDemoUser('penjual');
                            setShowRoleMenu(false);
                          }}
                          className="col-span-2 px-2 py-1 rounded-lg text-[11px] bg-white border hover:bg-amber-50 text-left font-bold text-slate-700"
                        >
                          🛒 Penjual (Kasir)
                        </button>
                      </div>
                    </div>

                    {isOwner && (
                      <Link
                        href="/settings"
                        onClick={() => setShowRoleMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Pengaturan Brand</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Calculator Modal */}
      {showCalc && <CalculatorModal onClose={() => setShowCalc(false)} />}
    </>
  );
};

export default Navbar;
