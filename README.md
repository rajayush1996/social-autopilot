# 🚀 Social Autopilot (Social Copilot)

An enterprise-grade, multi-platform social media scheduler and automated content generator. The system leverages **OpenAI GPT** to dynamically generate and adapt posts for different social platforms, schedules them via distributed queues (**BullMQ & Redis**), handles direct media uploads, and publishes them across **Instagram**, **LinkedIn**, and **X (Twitter)**.

---

## 📂 Project Directory Structure

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
│   │   ├── services/              # Business logic (Publishing, Upload strategies)
│   │   ├── utils/                 # Utility loggers and HTTP helpers
│   │   └── validations/           # Unified Zod request schemas
│   └── tests/                     # Jest/Node-Test unit suites
└── README.md                      # Root documentation
```

---

## ⚙️ Microservices

### 🖥️ Backend Service (`/backend`)
The backend is a production-ready **Node.js / Express** application built with strict **Low-Level Design (LLD)** principles.

#### Key Features:
1. **Strategy & Resilience Upload Pipeline:** Streams image and video uploads to Cloudinary with automatic local sandbox failover.
2. **Polymorphic Social Media Publishing:** Runs platform-specific adapters (Instagram Graph API, LinkedIn UGC, X OAuth 2 PKCE) through a centralized `SocialAdapterFactory`.
3. **Distributed Job Queue:** Uses BullMQ and Redis for robust post scheduling, task processing, and exponential backoff retry states.
4. **Token Refresh Manager:** Automatic token expiration validation and refresh database sync before background queue dispatches.
5. **Observability:** Custom structured logging, request correlation IDs (`X-Request-ID`), and global error converters.

#### Quick Start (Backend):
To get the backend server running locally, follow these steps:

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

## 🛡️ Security notice

* **Never** commit live credentials or `.env` files to git.
* All configuration parameters must be declared inside the respective environmental template `backend/.env.example`.
