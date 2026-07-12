# AssetFlow

Enterprise Asset & Resource Management System — tracks organizational assets (laptops, furniture, equipment) and bookable resources (rooms, vehicles) through registration, allocation, transfer, booking, maintenance, auditing, and reporting.

## Tech stack

- **Client**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Server**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Auth**: JWT bearer tokens

## Structure

```
TrackAssets/
├── client/   # Next.js frontend
└── server/   # Express REST API (/api/v1)
```

`client/` and `server/` are independent projects, each with their own `package.json`, dependencies, and `.env`.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a connection string to a hosted instance)

### Server

```bash
cd server
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev
```

API runs at `http://localhost:4000`, mounted under `/api/v1`. Health check: `GET /health`.

### Client

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Modules

1. Auth (login / signup)
2. Dashboard
3. Organization Setup (admin) — departments, categories, employees
4. Asset Registration & Directory
5. Allocation & Transfer (double-allocation block)
6. Resource Booking
7. Maintenance Management (Kanban state machine)
8. Asset Audit
9. Reports & Analytics
10. Notifications / Activity Log

## Build order

Data-dependency order for implementation: Auth → Organization Setup (master data) → Asset Directory → Allocation/Transfer, Booking, Maintenance → Audit → Reports & Notifications (read-only aggregators) → Dashboard (can be stubbed early, finalized last).

See `Mockup design Asset.txt` for the full functional spec and API endpoint definitions this scaffold implements.
