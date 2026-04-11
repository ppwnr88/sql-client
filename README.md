# SQL Client

A production-ready web-based SQL client supporting MySQL, PostgreSQL, and Microsoft SQL Server.

## Features

- Connect to MySQL, PostgreSQL, and MSSQL databases
- Write and execute SQL queries with keyboard shortcut (Ctrl+Enter)
- View results in a paginated table
- Query history (last 50 queries, stored in browser)
- Save and manage multiple named connections (stored in browser)
- Import/export connections as JSON
- Test connection before saving
- JWT-based single-user authentication
- Dark sidebar + light editor layout

## Architecture

```
sql-client/
├── backend/          Express + TypeScript API server (port 3001)
├── frontend/         React + Vite SPA (port 5173)
├── api/              Vercel serverless functions
│   ├── auth.ts
│   ├── query.ts
│   ├── test-connection.ts
│   └── _lib/database.ts
├── docker-compose.yml
├── Dockerfile        Multi-stage build for backend
└── vercel.json
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# Install all dependencies
npm run install:all

# Copy and configure backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your JWT_SECRET

# Run both servers concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

The Vite dev server proxies all `/api/*` requests to `localhost:3001`.

### Default credentials

```
Username: admin
Password: admin123
```

Change these via environment variables (see below).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `AUTH_USERNAME` | `admin` | Login username |
| `AUTH_PASSWORD` | `admin123` | Login password (plain text or bcrypt hash) |
| `JWT_SECRET` | — | **Required.** Secret for signing JWTs |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `''` (empty) | API base URL. Leave empty for Vercel (uses `/api`), set to `http://localhost:3001` for local non-proxy mode |

## Docker

```bash
# Start everything (backend, frontend, MySQL, PostgreSQL)
docker-compose up

# Backend only
docker build -t sql-client-backend .
docker run -p 3001:3001 \
  -e JWT_SECRET=your-secret \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=admin123 \
  sql-client-backend
```

Docker Compose includes:
- Backend (port 3001)
- Frontend dev server (port 5173)
- MySQL 8.0 (port 3306, user: testuser / testpassword, db: testdb)
- PostgreSQL 16 (port 5432, user: testuser / testpassword, db: testdb)

## Deploy to Vercel

### One-click deploy

1. Push this repo to GitHub
2. Import the project at https://vercel.com/new
3. Set these environment variables in the Vercel dashboard:
   - `AUTH_USERNAME`
   - `AUTH_PASSWORD`
   - `JWT_SECRET` (use a strong random string)
4. Deploy

The `vercel.json` configuration:
- Builds the frontend (`cd frontend && npm install && npm run build`)
- Serves the SPA from `frontend/dist`
- Routes all `/api/*` requests to the serverless functions in `/api/`

### Vercel environment variables

Set in Project Settings → Environment Variables:

```
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password
JWT_SECRET=your-random-32-char-secret
```

## Connection JSON format

Import/export uses this format:

```json
{
  "connections": [
    {
      "name": "Local MySQL",
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "",
      "database": "myapp"
    },
    {
      "name": "Production PG",
      "type": "postgresql",
      "host": "db.example.com",
      "port": 5432,
      "user": "appuser",
      "password": "secret",
      "database": "production"
    }
  ]
}
```

Supported `type` values: `mysql`, `postgresql`, `mssql`

## Security notes

- Database credentials are sent from the browser on each request and never stored server-side
- JWTs expire after 8 hours
- All `/api/query` and `/api/test-connection` endpoints require a valid Bearer token
- Use HTTPS in production (Vercel provides this automatically)
- Set a strong `JWT_SECRET` — at least 32 random characters
