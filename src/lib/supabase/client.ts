import { createBrowserClient } from '@supabase/ssr';

export const getSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('mpl_custom_supabase_url');
    const customKey = localStorage.getItem('mpl_custom_supabase_key');
    if (customUrl && customKey && !customUrl.includes('placeholder') && customUrl.startsWith('http')) {
      return { url: customUrl.trim(), anonKey: customKey.trim(), source: 'custom' as const };
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envUrl && envKey && !envUrl.includes('placeholder') && envUrl.startsWith('http')) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'env' as const };
  }
  return null;
};

export const isSupabaseConfigured = () => {
  return Boolean(getSupabaseConfig());
};

export function createClient() {
  const config = getSupabaseConfig();
  const supabaseUrl = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
  try {
    const targetUrl = url || getSupabaseConfig()?.url;
    const targetKey = key || getSupabaseConfig()?.anonKey;
    if (!targetUrl || !targetKey || targetUrl.includes('placeholder')) {
      return { success: false, message: 'URL atau Anon Key Supabase belum diisi atau masih placeholder.' };
    }
    const client = createBrowserClient(targetUrl, targetKey);
    const { error } = await client.from('app_settings').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: `Gagal terhubung ke Supabase: ${error.message}` };
    }
    return { success: true, message: 'Koneksi ke Supabase Cloud Berhasil Aktif!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menghubungi server Supabase.' };
  }
}
