'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, isOwner, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (isOwner) {
        router.push('/dashboard');
      } else {
        router.push('/pos');
      }
    }
  }, [user, isOwner, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full" />
    </div>
  );
}
