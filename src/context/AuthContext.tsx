'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, Branch, UserRole } from '@/types';
import { DataService } from '@/lib/services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  activeBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  isOwner: boolean;
  isAdminPusat: boolean;
  isAdminCabang: boolean;
  isPenjual: boolean;
  loginWithCredentials: (usernameOrEmail: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  loginAsDemoUser: (role: UserRole) => Promise<void>;
  setActiveBranch: (branch: Branch) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    try {
      const bList = await DataService.getBranches();
      setBranches(bList);

      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('mpl_current_user_id') : null;
      const users = await DataService.getUsers();
      
      let currentUser: UserProfile | undefined;
      if (savedUserId) {
        currentUser = users.find((u) => u.id === savedUserId);
      }
      
      if (!currentUser) {
        currentUser = users.find((u) => u.role === 'owner') || users[0];
      }

      setUser(currentUser);

      const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('mpl_active_branch_id') : null;
      let targetBranch = bList.find((b) => b.id === savedBranchId);
      
      if (!targetBranch && bList.length > 0) {
        targetBranch = bList[0];
      }
      setActiveBranchState(targetBranch || null);

    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const loginWithCredentials = async (usernameOrEmail: string, pass: string) => {
    const foundUser = await DataService.authenticateUser(usernameOrEmail, pass);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('mpl_current_user_id', foundUser.id);

      const bList = await DataService.getBranches();
      if (foundUser.role === 'penjual' && foundUser.username.includes('blj')) {
        const blj = bList.find((b) => b.code === 'BLJ') || bList[1];
        if (blj) setActiveBranch(blj);
      } else if (bList.length > 0) {
        setActiveBranch(bList[0]);
      }
      return { success: true };
    } else {
      return { success: false, message: 'Username / Email atau Password salah!' };
    }
  };

  const loginAsDemoUser = async (role: UserRole) => {
    const users = await DataService.getUsers();
    const demoUser = users.find((u) => u.role === role);
    if (demoUser) {
      setUser(demoUser);
      localStorage.setItem('mpl_current_user_id', demoUser.id);
      
      const bList = await DataService.getBranches();
      if (role === 'penjual' && demoUser.username.includes('blj')) {
        const blj = bList.find((b) => b.code === 'BLJ') || bList[1];
        if (blj) setActiveBranch(blj);
      } else if (bList.length > 0) {
        setActiveBranch(bList[0]);
      }
    }
  };

  const setActiveBranch = (branch: Branch) => {
    setActiveBranchState(branch);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mpl_active_branch_id', branch.id);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mpl_current_user_id');
    }
  };

  const isOwner = user?.role === 'owner';
  const isAdminPusat = user?.role === 'admin_pusat';
  const isAdminCabang = user?.role === 'admin_cabang';
  const isPenjual = user?.role === 'penjual';

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBranch,
        branches,
        loading,
        isOwner,
        isAdminPusat,
        isAdminCabang,
        isPenjual,
        loginWithCredentials,
        loginAsDemoUser,
        setActiveBranch,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
