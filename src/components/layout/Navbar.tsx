'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Store, UserCheck, ChevronDown, LogOut, Settings, Calculator, Sparkles } from 'lucide-react';
import CalculatorModal from '@/components/common/CalculatorModal';

export const Navbar: React.FC = () => {
  const { user, activeBranch, branches, setActiveBranch, isOwner, loginAsDemoUser, logout } = useAuth();
  const { settings } = useApp();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-900 text-amber-50 shadow-md border-b border-brand-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand Name */}
            <Link href={isOwner ? '/dashboard' : '/pos'} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center font-bold text-brand-900 text-lg">
                {settings.logo_url && !settings.logo_url.includes('placeholder') ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span>PL</span>
                )}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  {settings.app_name}
                </h1>
                <p className="text-[11px] text-amber-300 font-medium">{settings.brand_owner}</p>
              </div>
            </Link>

            {/* Branch Selector & Active User Status */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Calculator Quick Button for Cashier */}
              <button
                onClick={() => setShowCalc(true)}
                className="p-2 rounded-lg bg-brand-800 hover:bg-brand-700 text-amber-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Buka Kalkulator Kasir"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Kalkulator</span>
              </button>

              {/* Branch Selector (Owner can switch, Seller sees assigned branch) */}
              <div className="relative">
                {isOwner ? (
                  <button
                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800 border border-brand-700 hover:bg-brand-700 text-xs sm:text-sm font-medium text-amber-100 transition-colors"
                  >
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>{activeBranch ? activeBranch.name : 'Pilih Cabang'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400 ml-1" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800/80 border border-brand-700 text-xs sm:text-sm font-medium text-amber-200">
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>{activeBranch ? activeBranch.name : 'Cabang'}</span>
                  </div>
                )}

                {/* Branch Dropdown */}
                {showBranchMenu && isOwner && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-2xl py-1.5 border border-slate-100 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Pilih Cabang Aktif
                    </div>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBranch(b);
                          setShowBranchMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-amber-50 transition-colors ${
                          activeBranch?.id === b.id ? 'bg-amber-100/70 font-bold text-brand-900' : 'text-slate-700'
                        }`}
                      >
                        <span>{b.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-brand-900 font-mono">
                          {b.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Profile & Demo Role Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-brand-800 hover:bg-brand-700 border border-brand-700 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-brand-900 font-bold text-xs flex items-center justify-center">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:block text-left text-xs">
                    <p className="font-semibold leading-tight text-white">{user?.full_name?.split(' ')[0]}</p>
                    <p className="text-[10px] text-amber-300 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl py-2 border border-slate-100 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                      <p className="text-[11px] text-slate-500">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 capitalize">
                        Role: {user?.role?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Fast Switch Role (Demo helper for multi-role testing) */}
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1.5">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Simulasi Role (Demo Fast Switch):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            loginAsDemoUser('owner');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded text-[11px] bg-white border hover:bg-amber-50 text-left font-medium text-slate-700"
                        >
                          👑 Owner
                        </button>
                        <button
                          onClick={() => {
                            loginAsDemoUser('admin_pusat');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded text-[11px] bg-white border hover:bg-amber-50 text-left font-medium text-slate-700"
                        >
                          💼 Admin Pusat
                        </button>
                        <button
                          onClick={() => {
                            loginAsDemoUser('admin_cabang');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded text-[11px] bg-white border hover:bg-amber-50 text-left font-medium text-slate-700"
                        >
                          🏢 Admin Cabang
                        </button>
                        <button
                          onClick={() => {
                            loginAsDemoUser('penjual');
                            setShowRoleMenu(false);
                          }}
                          className="px-2 py-1 rounded text-[11px] bg-white border hover:bg-amber-50 text-left font-medium text-slate-700"
                        >
                          🛒 Penjual
                        </button>
                      </div>
                    </div>

                    {isOwner && (
                      <Link
                        href="/settings"
                        onClick={() => setShowRoleMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Pengaturan Aplikasi</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
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
