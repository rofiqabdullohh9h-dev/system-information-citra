import dotenv from 'dotenv';
import path from 'path';

// Load from backend/.env if exists locally
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();


export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'production',
  supabaseUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://whmlbwdaetzcqhqzvwwi.supabase.co').trim(),
  supabaseKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobWxid2RhZXR6Y3FocXp2d3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzcxNDUsImV4cCI6MjEwNjcxMzE0NX0.TMqsIgphVrLhuRH9w_g7kNWUCDeA2oeclWY82CH_tbQ').trim(),
  jwtSecret: process.env.JWT_SECRET || 'siap_pengajian_jwt_secret_key_2026_super_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || '*',
};
