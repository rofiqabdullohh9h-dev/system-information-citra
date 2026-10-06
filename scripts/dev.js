import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('==================================================');
console.log('🚀 Memulai Citra System Information (Localhost Dev)');
console.log('📡 1. Menjalankan Backend Express di port 5000...');
console.log('💻 2. Menjalankan Frontend Vite di port 5173...');
console.log('==================================================\n');

// 1. Jalankan Backend (port 5000)
const backend = spawn('node', ['backend/src/server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// 2. Jalankan Frontend (Vite)
const frontend = spawn(npmCmd, ['run', 'dev', '--prefix', 'frontend'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🛑 Menghentikan server backend dan frontend...');
  try {
    if (backend && !backend.killed) backend.kill();
    if (frontend && !frontend.killed) frontend.kill();
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
