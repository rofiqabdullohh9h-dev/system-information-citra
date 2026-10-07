import React from 'react';

/**
 * lazyWithRetry
 * Solusi pencegahan error chunk loading Vite saat deployment baru di hosting seperti Netlify:
 * "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'"
 *
 * Jika browser pengguna masih meminta berkas JS lama yang hash-nya sudah berganti pada deployment baru,
 * utilitas ini akan menangkap chunk error dan secara otomatis memuat ulang (hard reload) halaman sekali
 * agar browser mengambil index.html dan bundle aset terbaru tanpa crash.
 */
export function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_reload_attempted') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('chunk_reload_attempted', 'false');
      return component;
    } catch (error) {
      const isChunkError = (
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('dynamically imported module') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('MIME type of "text/html"') ||
        error.name === 'ChunkLoadError'
      );

      if (isChunkError && !pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('chunk_reload_attempted', 'true');
        console.warn('Pembaruan versi baru aplikasi terdeteksi di server. Memuat ulang browser untuk mengambil aset terbaru...');
        window.location.reload();
        return new Promise(() => {}); // Tahan render sampai reload selesai
      }

      window.sessionStorage.setItem('chunk_reload_attempted', 'false');
      throw error;
    }
  });
}
