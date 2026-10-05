import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

const sanitizedUrl = (config.supabaseUrl || '')
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

if (!sanitizedUrl || sanitizedUrl.includes('your-project-id')) {
  console.warn('⚠️ PERINGATAN: SUPABASE_URL belum dikonfigurasi dengan URL project asli Anda di backend/.env');
}

export const supabase = createClient(sanitizedUrl, config.supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


export default supabase;
