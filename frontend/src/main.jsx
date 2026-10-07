import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload saat Vite mendeteksi versi chunk baru telah di-deploy di server
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Terdeteksi vite:preloadError (aset chunk baru telah di-deploy). Memuat ulang halaman...');
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
