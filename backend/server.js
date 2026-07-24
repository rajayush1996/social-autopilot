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
import { syncScheduledPostsToQueue } from './src/jobs/postScheduler.js';
import logger from './src/utils/logger.js';

// Standard Middlewares
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
    service: 'Social Media Autopilot Backend (BullMQ & Redis Enabled)',
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
      <title>Social Autopilot API Dashboard (BullMQ & Redis)</title>
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
      <h1>🚀 Social Autopilot Backend (BullMQ Queue & Redis)</h1>
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedules', scheduleRoutes);

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

  // Initialize BullMQ Worker
  try {
    initPostWorker();
    await syncScheduledPostsToQueue();
  } catch (queueErr) {
    logger.warn(`[BullMQ Init Warning] ${queueErr.message}`);
  }
});

export default app;
