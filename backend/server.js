import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './src/config/db.js';
import { checkRedisConnection } from './src/config/redis.js';
import { requestLogger } from './src/middlewares/requestLogger.js';
import { errorConverter, globalErrorHandler } from './src/middlewares/errorHandler.js';
import authRoutes from './src/routes/authRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import scheduleRoutes from './src/routes/scheduleRoutes.js';
import { initPostWorker } from './src/workers/postWorker.js';
import { startCronSchedulerLoop } from './src/jobs/postScheduler.js';
import logger from './src/utils/logger.js';

import helmet from 'helmet';
import { xssSanitizer } from './src/middlewares/xssSanitizer.js';
import hpp from 'hpp';
import { globalLimiter } from './src/middlewares/rateLimiter.js';

// Standard Middlewares & Security Enhancements
const app = express();
const PORT = process.env.PORT || 5000;

// VERY FIRST MIDDLEWARE: Universal CORS Handler (Must execute before Helmet & Rate Limiters)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, x-request-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Security & Protection Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(xssSanitizer);
app.use(hpp());
app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Tracing & Logging Middleware
app.use(requestLogger);

// Health Check Endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  const redisConnected = await checkRedisConnection();
  return res.json({
    status: dbConnected && redisConnected ? 'UP' : 'DEGRADED',
    service: 'OmniSync Platform Backend (BullMQ & Redis Enabled)',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    redis: redisConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

// Interactive API Explorer Dashboard Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>OmniSync API Dashboard (BullMQ & Redis)</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 900px; margin: 0 auto; }
        h1 { color: #38bdf8; border-bottom: 2px solid #334155; padding-bottom: 0.5rem; }
        .card { background: #1e293b; padding: 1.25rem; margin-bottom: 1rem; border-radius: 8px; border: 1px solid #334155; }
        code { background: #090d16; color: #f43f5e; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        a { color: #38bdf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        ul { line-height: 1.8; }
      </style>
    </head>
    <body>
      <h1>🚀 OmniSync Backend (BullMQ Queue & Redis)</h1>
      <p>High-performance Express.js Backend with PostgreSQL/Prisma, BullMQ, OpenAI, & Social Media APIs (Instagram, LinkedIn, X).</p>
      
      <div class="card">
        <h3>📍 Available API Modules</h3>
        <ul>
          <li><strong>Authentication & Social Accounts:</strong> <code>/api/auth</code></li>
          <li><strong>Post Creation & BullMQ Queue:</strong> <code>/api/posts</code></li>
          <li><strong>Automation Scheduling Dispatcher:</strong> <code>/api/schedules</code></li>
          <li><strong>Health Status:</strong> <a href="/health"><code>GET /health</code></a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static uploads directory serving
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

import notificationRoutes from './src/routes/notificationRoutes.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middlewares (Must be last)
import http from 'http';
import { initSocket } from './src/services/socketService.js';

app.use(errorConverter);
app.use(globalErrorHandler);

// Create HTTP Server & Initialize Socket.io WebSocket Server
const server = http.createServer(app);
initSocket(server);

// Start Server & Initialize BullMQ Worker & Scheduler Sync
server.listen(PORT, async () => {
  logger.info(`🚀 Social Autopilot Server & Socket.io listening on http://localhost:${PORT}`);
  
  // Database and Redis connection checks
  await checkDatabaseConnection();
  await checkRedisConnection();

  // Initialize BullMQ Worker & 60-Second Automated Scheduler Loop
  try {
    initPostWorker();
    startCronSchedulerLoop();
  } catch (queueErr) {
    logger.warn(`[Scheduler Init Warning] ${queueErr.message}`);
  }
});

export default app;
