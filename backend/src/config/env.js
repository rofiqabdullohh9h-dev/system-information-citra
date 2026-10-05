import dotenv from 'dotenv';
import path from 'path';

// Load from backend/.env if exists locally
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();


export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'your-key',
  jwtSecret: process.env.JWT_SECRET || 'siap_default_jwt_secret_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
