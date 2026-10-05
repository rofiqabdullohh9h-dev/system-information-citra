import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import eventRoutes from './routes/events.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import jamaahRoutes from './routes/jamaah.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import adminRoutes from './routes/admin.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import exportRoutes from './routes/export.routes.js';
import auditRoutes from './routes/audit.routes.js';
import bulletinRoutes from './routes/bulletin.routes.js';

const app = express();

// Middlewares - Dynamic CORS for development
app.use(cors({
  origin: true,
  credentials: true,
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize Netlify function path prefix if routed through Netlify serverless
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
  }
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SIAP Backend API is running.',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes (support both standard /api and Netlify Functions rewrite path)
const prefixes = ['/api', '/.netlify/functions/api'];

prefixes.forEach(prefix => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/public`, publicRoutes);
  app.use(`${prefix}/events`, eventRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/jamaah`, jamaahRoutes);
  app.use(`${prefix}/categories`, categoryRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/export`, exportRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/bulletins`, bulletinRoutes);
});

import fs from 'fs';
import path from 'path';

const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');

// If frontend/dist exists, serve static assets and handle SPA routing
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 Handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} tidak ditemukan.`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
