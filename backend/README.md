# 🚀 Social Media Autopilot Backend

Production-grade **Express.js** backend powering automated social media content generation, multi-platform post scheduling, and asynchronous queue processing. Built with **PostgreSQL / Prisma ORM**, **BullMQ & Redis**, **OpenAI GPT API**, and native **Social Media Publishing APIs** (Instagram, LinkedIn, X/Twitter).

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Variables](#-environment-variables)
- [Quick Start Guide](#-quick-start-guide)
- [API Documentation](#-api-documentation)
  - [Health & Status](#health--status)
  - [Authentication & Social Accounts](#authentication--social-accounts)
  - [Post Generation & Scheduling](#post-generation--scheduling)
- [BullMQ Queue & Worker Architecture](#-bullmq-queue--worker-architecture)
- [Database Schema](#-database-schema)
- [Security Notice](#-security-notice)

---

## 🌐 Overview

The **Social Media Autopilot Backend** decouples web request handling from background social media publishing. It leverages **BullMQ** with **Redis** to execute immediate and delayed post publications reliably across multiple social media platforms with automatic retries and execution logging.

---

## ✨ Key Features

1. **Distributed Queue Engine (BullMQ + Redis)**:
   - Asynchronous job execution for immediate (`publishNow: true`) and scheduled (`scheduledAt`) posts.
   - Native delayed job processing using BullMQ timers.
   - Automatic exponential backoff retries (3 attempts with 5-second initial delay) for network or API rate limits.
   - Startup recovery job (`syncScheduledPostsToQueue`) to automatically sync overdue or pending database posts into the queue.

2. **OpenAI Multi-Platform Content Adaptation Engine**:
   - Automated content tailoring for specific platform nuances:
     - **Instagram**: Engaging hooks, line breaks, emojis, and target hashtags (8-15).
     - **LinkedIn**: Thought leadership structure, structured paragraphs, professional tone, and relevant industry tags (3-5).
     - **X (Twitter)**: Concise single tweet (< 280 chars) or thread format with concise hashtags.
   - Built-in fallback template generator when OpenAI API keys are not provided in local test environments.

3. **Social Media Platform Integration**:
   - **Instagram Graph API**: Two-step media container creation and publishing.
   - **LinkedIn REST API**: Support for UGC posts and organization/member shares.
   - **X (Twitter) API v2**: OAuth 2.0 PKCE authentication and post publishing.

4. **Production Readiness & Observability**:
   - Request tracing with `X-Request-ID`.
   - Zod request body validation middleware.
   - Standardized `ApiError` class and consistent JSON response envelopes.
   - Operational log utility with multi-level severity logging (`info`, `warn`, `error`, `debug`).

---

## 📐 System Architecture

```
                               ┌─────────────────────────┐
                               │   Express.js Web Server │
                               └────────────┬────────────┘
                                            │
                               ┌────────────▼────────────┐
                               │  API Routes & Zod Rules │
                               └────────────┬────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               │                            │                            │
    ┌──────────▼──────────┐      ┌──────────▼──────────┐      ┌──────────▼──────────┐
    │  Prisma PostgreSQL   │      │ OpenAI GPT Engine   │      │   BullMQ Queue      │
    │  (Database State)   │      │ (Content Generation)│      │  (Redis Backend)    │
    └─────────────────────┘      └─────────────────────┘      └──────────┬──────────┘
                                                                         │
                                                              ┌──────────▼──────────┐
                                                              │   BullMQ Worker     │
                                                              └──────────┬──────────┘
                                                                         │
                                                 ┌───────────────────────┼───────────────────────┐
                                                 │                       │                       │
                                      ┌──────────▼──────────┐ ┌──────────▼──────────┐ ┌──────────▼──────────┐
                                      │ Instagram Graph API │ │ LinkedIn REST API   │ │   X (Twitter) API   │
                                      └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 📁 Project Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL Database Schema & Models
│   └── seed.js                    # Initial Seed Script for Development
├── src/
│   ├── config/
│   │   ├── db.js                  # Prisma Client Singleton & Health Checker
│   │   └── redis.js               # Redis / IORedis Connection Options for BullMQ
│   ├── utils/
│   │   ├── httpStatus.js          # Centralized HTTP Status Codes
│   │   ├── ApiError.js            # Operational Custom Error Class
│   │   ├── logger.js              # Structured Logging Utility
│   │   └── responseHandler.js     # Standardized API Response Formatter & Async Handler
│   ├── middlewares/
│   │   ├── requestLogger.js       # Request ID Tracing & Latency Logging
│   │   ├── errorHandler.js        # Global Error Normalization (Prisma, Zod, ApiError)
│   │   └── validate.js            # Zod Validation Middleware
│   ├── queues/
│   │   └── postQueue.js           # BullMQ Queue Instance Management
│   ├── workers/
│   │   └── postWorker.js          # Asynchronous Worker for Executing Social Media Posts
│   ├── services/
│   │   ├── aiService.js           # OpenAI GPT Text Generation & Platform Adaptation Engine
│   │   ├── auth/
│   │   │   └── tokenManager.js    # Automated Token Refresh Manager (OOD)
│   │   ├── social/
│   │   │   ├── socialAdapter.js   # Base Strategy Class for Platform Publishers
│   │   │   ├── socialAdapterFactory.js # Creational Strategy Resolver Factory
│   │   │   ├── instagramService.js # Instagram Graph API Strategy Adapter
│   │   │   ├── linkedinService.js  # LinkedIn REST API Strategy Adapter
│   │   │   └── xService.js         # X (Twitter) API Strategy Adapter
│   │   └── upload/
│   │       ├── uploadStrategy.js  # Base Strategy Interface for Media Uploads
│   │       ├── cloudinaryStrategy.js # Primary Cloudinary Stream Upload Strategy
│   │       ├── simulationStrategy.js # Local Sandbox Simulation Fallback Strategy
│   │       └── resilientUploader.js  # Coordinator utilizing strategy/resilience patterns
│   ├── jobs/
│   │   └── postScheduler.js       # Overdue Post Recovery & BullMQ Queue Synchronization
│   ├── controllers/
│   │   ├── authController.js      # OAuth Link Generation & Social Account Linking
│   │   ├── postController.js      # Post Enqueuing, Management, and Generation Controllers
│   │   └── uploadController.js    # Resilient Media Upload Endpoint Controller
│   └── routes/
│       ├── authRoutes.js          # Express Routes for /api/auth
│       ├── postRoutes.js          # Express Routes for /api/posts
│       └── uploadRoutes.js        # Express Routes for /api/upload (Multer middleware)
├── .env.example                   # Sanitized Environment Variable Template
├── server.js                      # Main Application Entrypoint & API Dashboard
└── package.json                   # Project Dependencies & NPM Scripts
```

---

## ⚙️ Prerequisites

Ensure you have the following installed on your system:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local instance or cloud provider (e.g., Neon, Supabase, AWS RDS)
- **Redis**: Local instance or managed service (e.g., Upstash, Redis Cloud)

---

## 🔒 Environment Variables

All app settings and secrets are configured using environment variables. Copy `.env.example` to `.env` to configure your environment variables:

```bash
cp .env.example .env
```

The keys in `.env.example` are categorized into:
- **Server Settings**: `PORT`, `NODE_ENV`, and logging level.
- **Database**: PostgreSQL connection string (`DATABASE_URL`).
- **Distributed Queue**: Redis connection hosts and passwords (`REDIS_HOST`, etc.).
- **Content Generation**: OpenAI API keys and configuration.
- **Media Upload Strategy**: Cloudinary API credentials and simulation endpoints.
- **OAuth Credentials**: OAuth client IDs and secrets for LinkedIn, X (Twitter), and Meta/Instagram.

> [!CAUTION]
> Never commit your `.env` file containing live credentials to version control. It is ignored by default in the project's `.gitignore` configuration.

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create your local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in your database connection string, Redis host, and API keys.

### 3. Setup Database Schema (Prisma)

Generate the Prisma client and apply database migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply Migrations to Database
npm run prisma:migrate
```

*(Optional)* Seed sample development data:
```bash
npm run prisma:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The backend server will start at `http://localhost:5000`. Access `http://localhost:5000` in your browser to view the interactive API Dashboard.

---

## 📡 API Documentation

### Health & Status

#### `GET /health`
Returns system operational status, database connectivity, and timestamp.

**Sample Response**:
```json
{
  "status": "UP",
  "service": "Social Media Autopilot Backend (BullMQ & Redis Enabled)",
  "database": "CONNECTED",
  "timestamp": "2026-07-20T11:28:00.000Z"
}
```

---

### Authentication & Social Accounts (`/api/auth`)

#### `GET /api/auth/url`
Generates OAuth authorization URL for connecting social accounts.

- **Query Parameters**:
  - `platform` (`LINKEDIN` | `X` | `INSTAGRAM`)

**Sample Response**:
```json
{
  "status": "success",
  "data": {
    "platform": "LINKEDIN",
    "authUrl": "https://www.linkedin.com/oauth/v2/authorization?..."
  }
}
```

#### `POST /api/auth/connect`
Links a social media account to a user profile using token exchange data.

- **Request Body**:
```json
{
  "userId": "usr_12345",
  "platform": "LINKEDIN",
  "accessToken": "<ACCESS_TOKEN>",
  "refreshToken": "<REFRESH_TOKEN>",
  "platformUserId": "link_9876",
  "accountName": "John Doe"
}
```

#### `GET /api/auth/accounts`
Retrieves connected social accounts for a user.

- **Query Parameters**:
  - `userId` (string, required)

---

### Post Generation & Scheduling (`/api/posts`)

#### `POST /api/posts/ai-generate`
Generates tailored post content for multiple platforms using OpenAI.

- **Request Body**:
```json
{
  "topic": "Launching our new AI social media scheduling feature!",
  "targetPlatforms": ["LINKEDIN", "X", "INSTAGRAM"],
  "tone": "professional",
  "customPrompt": "Focus on time-saving benefits for marketing teams."
}
```

- **Sample Response**:
```json
{
  "status": "success",
  "data": {
    "generatedPosts": {
      "LINKEDIN": "🚀 Excited to announce...",
      "X": "Streamline your social media workflow with AI...",
      "INSTAGRAM": "✨ Automate your content strategy..."
    }
  }
}
```

#### `POST /api/posts`
Schedules a post into the BullMQ queue or publishes it immediately.

- **Request Body**:
```json
{
  "userId": "usr_12345",
  "title": "Product Launch Announcement",
  "content": "Excited to share our new features!",
  "platforms": ["LINKEDIN", "X"],
  "mediaUrls": ["https://example.com/image.png"],
  "scheduledAt": "2026-07-25T14:00:00.000Z",
  "publishNow": false
}
```

#### `GET /api/posts`
Lists posts filtered by status or user.

- **Query Parameters**:
  - `userId` (optional)
  - `status` (`DRAFT` | `SCHEDULED` | `PUBLISHED` | `FAILED` | `CANCELLED`)

#### `GET /api/posts/:id`
Retrieves post detail along with platform publication logs.

#### `PATCH /api/posts/:id/cancel`
Cancels a scheduled post and removes the active job from BullMQ.

#### `POST /api/posts/trigger-scheduler`
Manually triggers synchronization of overdue or unscheduled posts from PostgreSQL into BullMQ.

---

## ⚡ BullMQ Queue & Worker Architecture

- **Queue Initialization**: Handled by `src/queues/postQueue.js`.
- **Worker Execution**: `src/workers/postWorker.js` listens to jobs on `social-post-queue`.
- **Job Processing Logic**:
  1. Receives job containing `postId` and target platforms.
  2. Updates post status in database to `PUBLISHING`.
  3. Iterates over target platforms and invokes corresponding adapter services (`instagramService`, `linkedinService`, `xService`).
  4. Records detailed logs in `SocialPostLog` table.
  5. Updates main `Post` record status to `PUBLISHED` or `FAILED`.
- **Retries**: BullMQ handles retries automatically with exponential backoff configuration.

---

## 🗄️ Database Schema

The PostgreSQL database (managed via Prisma ORM) includes the following core entities:

- **User**: User profiles and settings.
- **SocialAccount**: Linked OAuth accounts for LinkedIn, Instagram, and X.
- **Post**: Post draft, scheduled, or published records containing content, scheduled time, and state.
- **SocialPostLog**: Per-platform publication log records (tracking execution status, platform post ID, and error messages).
- **AIGenerationLog**: Audit log of AI generation requests and outputs.

---

## 🛡️ Security Notice

> [!IMPORTANT]
> - Never commit real credentials, database passwords, OAuth secrets, or API keys to repository documentation or git commits.
> - Always use environment variables (`.env`) for local development and secret management platforms (e.g. AWS Secrets Manager, Vercel Env Vars, Render Environment Variables) in production.
> - `.env` is listed in `.gitignore` to prevent accidental credential leaks.
