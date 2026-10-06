import app from './app.js';
import { config } from './config/env.js';
import { checkAndSeedDatabase } from './services/dbInit.js';

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`🚀 SIAP Backend API running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`=========================================`);

  // Periksa dan inisialisasi akun & kategori dasar jika database baru/kosong
  await checkAndSeedDatabase();
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully.');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
