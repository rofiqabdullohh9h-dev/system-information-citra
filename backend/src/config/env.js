import dotenv from 'dotenv';
import path from 'path';

// Load from backend/.env if exists locally
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();


export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'production',
  supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim(),
  supabaseKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim(),
  jwtSecret: process.env.JWT_SECRET || 'citra_system_jwt_default_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || '*',
};
