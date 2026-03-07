# Skrapo ♻️

Skrapo is a smart scrap pickup scheduling platform designed to make recycling effortless and rewarding. Built with a modern tech stack (Next.js, Node.js/Express, MongoDB) in an Nx Monorepo.

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### 1. Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MongoDB**: A local instance running at `127.0.0.1:27017` (or an Atlas URI)

### 2. Installation

Clone the repository and install all dependencies from the root directory:

```bash
# Install dependencies for the entire monorepo
npm install
```

### 3. Environment Configuration

The backend requires environment variables to connect to the database and handle authentication.

1. Navigate to the API app: `apps/api/`
2. Create a `.env` file (copying from `.env.example`):

```bash
# In apps/api directory
cp .env.example .env
```

3. Ensure the `MONGODB_URI` in `.env` matches your local MongoDB setup.

### 4. Running the Project

You can run both the API and the Web frontend using these commands from the **root directory**:

#### Start the Backend (API)

```bash
npm run api:serve
# or
npx nx serve api
```

The API will run at `http://localhost:3333`.

#### Start the Frontend (Web)

```bash
npm run web:serve
# or
npx nx serve web
```

The Web app will run at `http://localhost:4200`.

---

## 🏗️ Architecture

- **`apps/web`**: Next.js frontend with Tailwind CSS.
- **`apps/api`**: Node.js/Express backend using MongoDB driver.
- **RBAC**: Role-Based Access Control implemented for:
  - `customer`: Schedule and view pickups.
  - `admin`: Manage operations and champions.
  - `scrapChamp`: Accept and fulfill pickup jobs.

## 🎨 Branding

- **Primary Color**: `#6B9B5E` (Sage Green)
- **Logo**: Circular recycler icon (found in `apps/web/public/skrapo-logo.svg`)

---

## 🛠️ Key Commands

| Action        | Command                                |
| :------------ | :------------------------------------- |
| **Install**   | `npm install`                          |
| **Run API**   | `npx nx serve api`                     |
| **Run Web**   | `npx nx serve web`                     |
| **Build All** | `npx nx run-many --target=build --all` |
| **Lint All**  | `npx nx run-many --target=lint --all`  |

---

Developed with 💚 by the Skrapo Team.
