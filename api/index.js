import app from '../backend/src/app.js';

// Vercel Serverless Function entry point
export default function handler(req, res) {
  // Normalisasi URL agar selalu cocok dengan prefix /api di Express
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
