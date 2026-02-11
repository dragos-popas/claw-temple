# CLAW-TEMPLE Developer Guide

**Project:** CLAW-TEMPLE - Cyberpunk AI Orchestration Platform  
**Repository:** https://github.com/dragos-popas/claw-temple  
**Theme:** Cyberpunk 2077 (neon aesthetics)

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend + backend |
| `npm run dev:backend` | Backend only (hot reload) |
| `npm run dev:frontend` | Frontend only (Vite dev server) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run db:init` | Initialize SQLite database |
| `npm run test:e2e` | Run end-to-end tests |

---

## Development Workflow

### 1. Start Development

```bash
cd claw-temple
npm run dev
```

This starts:
- Backend: `http://localhost:3000` (Express API + Socket.io)
- Frontend: `http://localhost:5173` (Vite dev server with HMR)

### 2. Make Changes

**Backend changes** (in `src/`):
- Routes: `src/api/routes/*.ts`
- Services: `src/services/*.ts`
- Stores: `src/stores/*.ts`
- Types: `src/types/index.ts`

**Frontend changes** (in `frontend/src/`):
- Components: `components/*.tsx`
- Hooks: `hooks/*.ts`
- Services: `services/api.ts`
- State: `stores/*.ts`

Changes auto-reload via:
- Backend: `tsx watch` (TypeScript runtime)
- Frontend: Vite HMR (Hot Module Replacement)

### 3. Run Tests

```bash
# E2E tests (requires running server)
npm run test:e2e

# Unit tests
npm test
```

---

## Project Structure

```
claw-temple/
├── src/                          # Backend
│   ├── api/
│   │   ├── router.ts             # Main API router
│   │   └── routes/               # Endpoint handlers
│   │       ├── tasks.ts          # Task CRUD
│   │       ├── agents.ts         # Agent pools
│   │       ├── models.ts         # OpenRouter models
│   │       ├── analytics.ts      # Analytics
│   │       ├── templates.ts      # Task templates
│   │       ├── config.ts         # User config
│   │       └── worktree.ts       # Git worktrees
│   ├── services/                 # Business logic
│   │   ├── orchestrator.ts       # Task orchestration
│   │   ├── openrouter.ts         # OpenRouter API
│   │   ├── openclaw.ts           # OpenClaw SDK
│   │   ├── analytics.ts          # Metrics
│   │   ├── notifications.ts      # Alerts
│   │   └── worktree.ts           # Git worktrees
│   ├── stores/                   # Data layer
│   │   ├── sqlite.ts             # DB connection
│   │   ├── taskStore.ts          # Tasks
│   │   └── agentStore.ts         # Pools
│   ├── types/                    # TypeScript types
│   ├── socket/                   # Socket.io handlers
│   └── utils/                    # Helpers
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/          # UI components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskModal.tsx
│   │   │   ├── AgentPool.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/               # React hooks
│   │   │   ├── useTasks.ts
│   │   │   ├── useAgents.ts
│   │   │   ├── useAnalytics.ts
│   │   │   └── useSocket.ts
│   │   ├── services/            # API client
│   │   │   └── api.ts
│   │   ├── stores/               # State
│   │   └── types/               # Types
│   └── ...config files
├── scripts/                      # Utilities
│   ├── db:init.ts               # DB init
│   └── test-e2e.js              # E2E tests
├── tests/                        # Unit tests
├── data/                         # SQLite database
├── worktrees/                    # Git worktrees
├── logs/                         # Log files
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/move` | Move to column |
| DELETE | `/api/tasks/:id` | Delete task |

**Task Status Flow:**
```
TODO → RESEARCH → DEV → QA → DONE
```

### Agent Pools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/pools` | List pools |
| POST | `/api/agents/pools` | Create pool |
| GET | `/api/agents/pools/:id` | Get pool |
| PUT | `/api/agents/pools/:id` | Update pool |
| POST | `/api/agents/pools/:id/pause` | Pause pool |
| POST | `/api/agents/pools/:id/resume` | Resume pool |
| DELETE | `/api/agents/pools/:id` | Delete pool |

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List OpenRouter models |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Full dashboard data |
| GET | `/api/analytics/spend` | Spend metrics |
| GET | `/api/analytics/productivity` | Productivity metrics |
| GET | `/api/analytics/model-usage` | Model usage breakdown |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| POST | `/api/templates/seed` | Seed defaults |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get all config |
| PUT | `/api/config` | Set config value |
| POST | `/api/config/batch` | Batch update |

### Worktrees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worktrees` | List worktrees |
| POST | `/api/worktrees` | Create worktree |
| DELETE | `/api/worktrees/:id` | Remove worktree |
| POST | `/api/worktrees/cleanup-orphans` | Clean orphans |

---

## Database Schema

### tasks
- `id` (TEXT, PK)
- `title` (TEXT)
- `description` (TEXT)
- `repo_url` (TEXT)
- `template_id` (TEXT)
- `pool_id` (TEXT)
- `model` (TEXT)
- `status` (TEXT: TODO/RESEARCH/DEV/QA/DONE)
- `priority` (INTEGER)
- `cost_estimate` (REAL)
- `actual_cost` (REAL)
- `metadata` (TEXT: JSON)
- `created_at` (TEXT)
- `updated_at` (TEXT)
- `completed_at` (TEXT)

### agent_pools
- `id` (TEXT, PK)
- `name` (TEXT)
- `icon` (TEXT)
- `default_model` (TEXT)
- `max_parallel` (INTEGER)
- `cost_limit` (REAL)
- `auto_accept` (BOOLEAN)
- `timeout_minutes` (INTEGER)
- `retry_count` (INTEGER)
- `notification_mode` (TEXT)
- `is_paused` (BOOLEAN)
- `created_at` (TEXT)
- `updated_at` (TEXT)

---

## Adding New Features

### 1. Add New API Route

1. Create `src/api/routes/newfeature.ts`:
```typescript
import { Router } from 'express';
export const newfeatureRouter = Router();

newfeatureRouter.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});
```

2. Mount in `src/api/router.ts`:
```typescript
import { newfeatureRouter } from './routes/newfeature.js';
router.use('/newfeature', newfeatureRouter);
```

### 2. Add New Store

1. Create `src/stores/newfeatureStore.ts`:
```typescript
import { getDb } from './sqlite.js';

export function getNewFeature(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM newfeature WHERE id = ?').get(id);
}
```

### 3. Add New Service

1. Create `src/services/newfeature.ts`:
```typescript
export class NewFeatureService {
  async process(): Promise<void> {
    // Business logic
  }
}
export const newFeatureService = new NewFeatureService();
```

### 4. Add Frontend Component

1. Create `frontend/src/components/NewFeature.tsx`:
```tsx
export function NewFeature() {
  return <div>New Feature</div>;
}
```

2. Add to `frontend/src/App.tsx`:
```tsx
import { NewFeature } from './components/NewFeature';
```

---

## Testing

### Running Tests

```bash
# E2E tests (full API test suite)
npm run test:e2e

# Unit tests
npm test
```

### Writing E2E Tests

Add test cases in `scripts/test-e2e.js`:

```javascript
// Example test
const { data } = await request('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
addResult('Test name', data.key === 'expected' ? 'PASS' : 'FAIL');
```

### Writing Unit Tests

Add test file in `tests/`:
```typescript
describe('Feature', () => {
  it('should work', async () => {
    const result = await someFunction();
    expect(result).toBeDefined();
  });
});
```

---

## Commit Convention

We use **Conventional Commits** with Commitizen.

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Restructuring |
| `perf` | Performance |
| `test` | Testing |
| `build` | Build system |
| `ci` | CI/CD |
| `chore` | Maintenance |

### Scopes

| Scope | Description |
|-------|-------------|
| `core` | Core application |
| `api` | API routes |
| `db` | Database |
| `frontend` | React UI |
| `backend` | Express server |
| `agents` | Agent logic |
| `analytics` | Metrics |
| `worktree` | Git integration |
| `notifications` | Alerts |

### Examples

```bash
npm run commit
# Select type and fill in description
```

Or commit directly:
```bash
git commit -m "feat(api): add new endpoint for task templates"
git commit -m "fix(frontend): resolve drag-drop glitch in KanbanBoard"
git commit -m "docs: update API documentation"
```

---

## Environment Variables

```env
# Server
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/claw-temple.db

# Worktrees
WORKTREE_BASE=./worktrees

# OpenClaw
OPENCLAW_DIR=/home/dp420/.openclaw
OPENCLAW_GATEWAY_URL=http://localhost:11434
```

---

## Troubleshooting

### Database Issues

```bash
# Reinitialize database
rm -rf data/claw-temple.db*
npm run db:init
```

### Frontend Not Loading

```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite
npm run dev:frontend
```

### API Not Responding

```bash
# Check server logs
cat logs/combined.log
cat logs/error.log
```

### Socket.io Issues

Ensure CORS is configured in `src/index.ts`:
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
```

---

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Access

- Local: `http://localhost:3000`
- LAN: `http://{lan-ip}:3000`

---

## Resources

- **Repository:** https://github.com/dragos-popas/claw-temple
- **Theme:** Cyberpunk 2077 (neon aesthetics)
- **Icons:** Use emojis for agent pools
- **Fonts:** Rajdhani (headings) + JetBrains Mono (code)

---

_Last updated: 2026-02-11_