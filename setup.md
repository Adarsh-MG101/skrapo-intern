# Skrapo Local Setup Guide

This guide provides step-by-step instructions for setting up Skrapo on a local development environment.

## 1. Prerequisites

- **Node.js**: [Download](https://nodejs.org/en) (v18+)
- **MongoDB**: [Download Community Server](https://www.mongodb.com/try/download/community) or use [Docker](https://hub.docker.com/_/mongo).
- **Git**: [Download](https://git-scm.com/downloads)

## 2. Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd skrapo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## 3. Backend Setup (API)

1. Go to `apps/api/`
2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` if necessary:
   - `MONGODB_URI`: Usually `mongodb://127.0.0.1:27017/`
   - `JWT_SECRET`: Any random string (e.g., `skrapo_local_only_123`)

## 4. Running the Project

Open two terminal windows/tabs in the root directory:

**Terminal 1 (Backend):**

```bash
npx nx serve api
```

**Terminal 2 (Frontend):**

```bash
npx nx serve web
```

## 5. Verification

- Frontend: [http://localhost:4200](http://localhost:4200)
- Backend: [http://localhost:3333](http://localhost:3333) (API endpoints like `/api/auth/me`)

## 6. Common Issues

- **MongoDB Connection Refused**: Ensure the MongoDB service is running on your machine.
- **Port Conflicts**: If port 3333 or 4200 is busy, you can change them in the respective config files.
