# 🚀 OmniSync (Social Copilot)

An enterprise-grade, multi-platform social media scheduler and automated content generator. The system leverages **OpenAI GPT** to dynamically generate and adapt posts for different social platforms, schedules them via distributed queues (**BullMQ & Redis**), handles direct media uploads, and publishes them across **Instagram**, **LinkedIn**, and **X (Twitter)**.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Design Patterns & Low-Level Design (LLD)](#-design-patterns--low-level-design-lld)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Setup & Installation](#-setup--installation)

---

## 🌐 Overview

**Social Autopilot** decouples web request handling from background social media publishing. It leverages **BullMQ** with **Redis** to execute immediate and delayed post publications reliably across multiple social media platforms with automatic retries and execution logging.

---

## ✨ Key Features

1. **Distributed Queue Engine (BullMQ + Redis)**:
   - Asynchronous job execution for immediate (`publishNow: true`) and scheduled (`scheduledAt`) posts.
   - Native delayed job processing using BullMQ timers.
   - Automatic exponential backoff retries (3 attempts with 5-second initial delay) for network or API rate limits.
   - Startup recovery job (`syncScheduledPostsToQueue`) to automatically sync overdue database posts.

2. **OpenAI Multi-Platform Content Adaptation**:
   - Automated content tailoring:
     - **Instagram**: Engaging hooks, line breaks, emojis, and target hashtags (8-15).
     - **LinkedIn**: Thought leadership structure, structured paragraphs, professional tone, and tags.
     - **X (Twitter)**: Concise single tweet (< 280 chars) with concise hashtags.
   - Built-in fallback template generator when OpenAI API keys are missing.

3. **Social Media Platform Integration**:
   - **Instagram Graph API**: Two-step media container creation and publishing.
   - **LinkedIn REST API**: Support for UGC posts and member shares.
   - **X (Twitter) API v2**: OAuth 2.0 PKCE authentication and post publishing.

4. **Production Readiness & Observability**:
   - Request tracing with `X-Request-ID`.
   - Zod request body validation middleware.
   - Standardized `ApiError` class and consistent JSON response envelopes.
   - Custom structured logging utility with multi-level severity logging.

---

## 📐 System Architecture

```
                               ┌─────────────────────────┐
                               │     Client Frontend     │
                               └────────────┬────────────┘
                                            │ HTTP Requests
                               ┌────────────▼────────────┐
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

```text
social-autopilot/
├── backend/                       # Express.js backend microservice
│   ├── prisma/                    # PostgreSQL Schema, migrations & seed scripts
│   ├── src/
│   │   ├── config/                # App bootstrap & connection pools
│   │   ├── controllers/           # HTTP Request Controllers
│   │   ├── jobs/                  # Background recovery cron schedulers
│   │   ├── middlewares/           # Global Error & validation handlers
│   │   ├── queues/                # BullMQ queue engines
│   │   ├── routes/                # Express Routing definitions
│   │   ├── services/
│   │   │   ├── auth/              # Automated token refresh managers
│   │   │   ├── social/            # Platform Adapter Strategies & Factories
│   │   │   └── upload/            # Cloudinary & simulation upload strategies
│   │   ├── utils/                 # Utility loggers and HTTP helpers
│   │   └── validations/           # Unified Zod request schemas
│   └── tests/                     # Jest/Node-Test unit suites
├── frontend/                      # Next.js (App Router) frontend dashboard
│   ├── src/
│   │   ├── app/                   # App routing pages (/accounts, /composer, /posts)
│   │   ├── components/            # Shared UI components (Sidebar)
│   │   └── lib/                   # API client configuration (api.ts)
└── README.md                      # Root documentation
```

---

## 🎨 Design Patterns & Low-Level Design (LLD)

The codebase implements standard Gang of Four (GoF) structural, behavioral, and creational design patterns:

### 1. Strategy Pattern
* **Media Uploading:** Implemented in `src/services/upload/`. Concrete strategies (`CloudinaryUploadStrategy`, `LocalSimulationUploadStrategy`) implement the base `UploadStrategy` interface.
* **Social Publishing:** Implemented in `src/services/social/`. Platform strategy adapters (`InstagramAdapter`, `LinkedinAdapter`, `XAdapter`) extend the base `SocialAdapter` interface.

### 2. Fallback (Failover) Pattern
* Configured in `ResilientUploader`. Attempts to stream file uploads to Cloudinary and automatically cascades to the `LocalSimulationUploadStrategy` if API credentials are down or unconfigured.

### 3. Factory Method Pattern
* Implemented in `SocialAdapterFactory`. Resolves and returns the corresponding polymorphic strategy adapter at runtime.

---

## 🗄️ Database Schema

Managed via **Prisma ORM** with PostgreSQL. Core entities include:

* **User**: Profiles, plans (`plan`), and remaining AI generation credits (`aiCredits`).
* **SocialAccount**: Linked OAuth account tokens (`accessToken`, `refreshToken`, `expiresAt`).
* **Post**: Content drafts, scheduled posts, and publish logs.
* **SocialPostLog**: Per-platform publication status logs.
* **AIGenerationLog**: Audit log tracking AI tokens and generated outputs.

---

## 📡 API Documentation

### 1. Health & Status
* **`GET /health`**: Returns connection states for PostgreSQL and Redis.

### 2. Authentication & Social Accounts (`/api/auth`)
* **`GET /api/auth/url?platform=X|LINKEDIN|INSTAGRAM`**: Generates OAuth authorization redirect URL.
* **`POST /api/auth/connect`**: Links a social media account and stores tokens in the database.
* **`GET /api/auth/accounts?userId=...`**: Lists all linked platform profiles.

### 3. Resilient Media Uploads (`/api/upload`)
* **`POST /api/upload`**: Accepts `file` field via multipart form-data. Streams file to Cloudinary and returns `fileUrl`, `mediaType` (`IMAGE` | `VIDEO`), and `publicId`.

### 4. Post Management & Generation (`/api/posts`)
* **`POST /api/posts/ai-generate`**: Generates platform-adapted texts. Performs user credit balance checks and decrements `aiCredits` by 1.
* **`POST /api/posts`**: Schedules a post or publishes it immediately.
* **`GET /api/posts`**: Returns list of posts filterable by status (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `FAILED`, `CANCELLED`).
* **`GET /api/posts/:id`**: Returns post details and platform logs.
* **`PATCH /api/posts/:id/cancel`**: Cancels scheduled posts and removes delayed queue tasks.

---

## ⚙️ Setup & Installation

To run the backend microservice locally:

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables:**
   Copy the example template file to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Edit `backend/.env` with your actual database URL, Redis options, and API credentials.*

3. **Synchronize Schema & Generate Client:**
   Ensure database is in sync with schema:
   ```bash
   # Push schema to PostgreSQL
   npx prisma db push --skip-generate
   
   # Generate Prisma client typings (ignoring DLL locking issues)
   $env:PRISMA_GENERATE_SKIP_ENGINES="true"; npx prisma generate
   ```

4. **Seed Mock Database Data:**
   ```bash
   npm run prisma:seed
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```
   *The backend will run at `http://localhost:5000`.*

6. **Run Unit Tests:**
   Verify all unit tests pass:
   ```bash
   npm test
   ```

---

### To run the frontend dashboard locally:

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```
   *The frontend dashboard will run at `http://localhost:3000`.*
