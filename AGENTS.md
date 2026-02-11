# CLAW-TEMPLE Developer Guide

**Project:** CLAW-TEMPLE - Cyberpunk AI Orchestration Platform  
**Repository:** https://github.com/dragos-popas/claw-temple  
**Theme:** Cyberpunk 2077 (neon aesthetics)  
**Version:** 0.0.1

---

## 🎯 QUICK REFERENCE

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend + backend |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:init` | Reset database (clears all data!) |

---

## 🏗️ ARCHITECTURE

```
claw-temple/
├── server-simple.mjs        # Main server (Express + Socket.io + SQLite)
├── task-worker.mjs         # Background task processor (Dragonfly queue)
├── scripts/
│   ├── db-init.mjs         # Database initialization
│   ├── db-migrate.mjs      # Database migrations
│   └── run-e2e.js          # Playwright test runner
├── services/
│   ├── task-queue.mjs      # Dragonfly task queue implementation
│   ├── task-processor.mjs  # Task execution engine
│   └── notification.mjs    # Status update notifications
├── tests/
│   └── e2e/
│       └── playwright.config.ts  # E2E test suite
├── frontend/               # React UI (built separately)
├── data/                   # SQLite database
└── systemd/                # SystemD service files
```

### Task Queue System (Dragonfly)

**Why Dragonfly?**
- Redis-compatible API
- Multi-threaded (better performance than Redis)
- Single binary, easy deployment
- No sudo required for installation

**Queue Structure:**
```
task:pending      # Tasks waiting to be picked up
task:processing   # Tasks currently being worked on
task:completed    # Completed tasks (optional)
task:failed       # Failed tasks with retry count
```

---

## 📋 WORKFLOW FOR FUTURE AIs

### 1. Making Changes

**Backend changes (server-simple.mjs):**
```javascript
// Add new route
app.get('/api/my-feature', (req, res) => {
  res.json({ message: 'Hello' });
});
```

**Database changes:**
- Modify `scripts/db-init.mjs` for schema changes
- Run `node scripts/db-init.mjs` to reset DB

**Frontend changes:**
- Edit files in `frontend/src/`
- Run `cd frontend && npm run build` to rebuild

### 2. Testing

**Run E2E tests:**
```bash
npm run test:e2e
```

**Test structure (tests/e2e/playwright.config.ts):**
- Health checks
- Kanban board tests
- Agent pool tests
- Analytics tests
- Settings tests
- Real-time features tests

### 3. Commit Convention

Use **Conventional Commits** with types:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(agents): add soul configuration` |
| `fix` | Bug fix | `fix(ui): resolve modal close button` |
| `docs` | Documentation | `docs: update API reference` |
| `test` | Tests | `test(e2e): add pool creation test` |
| `refactor` | Code restructuring | `refactor(api): simplify model routing` |
| `chore` | Maintenance | `chore: update dependencies` |

**Commit format:**
```
<type>(<scope>): <subject>

<body>

Footer
```

Example:
```
feat(pools): add agent customization with SOUL/IDENTITY/BIBLE

- Added agent_souls table for persona configuration
- Implemented soul endpoints for CRUD operations
- Integrated OpenRouter API for real model list

Closes #42
```

---

## 🔧 API REFERENCE

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/move` | Move to column |
| DELETE | `/api/tasks/:id` | Delete task |

### Agent Pools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/pools` | List pools |
| POST | `/api/agents/pools` | Create pool |
| PUT | `/api/agents/pools/:id` | Update pool |
| POST | `/api/agents/pools/:id/pause` | Pause pool |
| POST | `/api/agents/pools/:id/resume` | Resume pool |
| DELETE | `/api/agents/pools/:id` | Delete pool |

### Agent Souls (Customization)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/souls` | List all souls |
| GET | `/api/agents/souls?poolId=xxx` | List souls for pool |
| GET | `/api/agents/souls/:id` | Get soul details |
| POST | `/api/agents/souls` | Create soul |
| PUT | `/api/agents/souls/:id` | Update soul |
| DELETE | `/api/agents/souls/:id` | Delete soul |
| GET | `/api/agents/pools/:id/soul` | Get default soul for pool |

**Soul Configuration Structure:**
```json
{
  "poolId": "uuid",
  "name": "Web Crawler Agent",
  "description": "Specialized crawler for web scraping",
  "soul": "You are a meticulous web crawler. You prioritize accuracy and efficiency.",
  "identity": "Name: Crawler | Role: Data Extractor | Expertise: Web scraping",
  "bible": "1. Always verify extracted data\n2. Respect robots.txt\n3. Handle errors gracefully\n4. Report all findings",
  "systemPrompt": "Full system prompt (auto-built from SOUL/IDENTITY/BIBLE)",
  "model": "deepseek/deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List OpenRouter models with pricing |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List task templates |
| POST | `/api/templates` | Create template |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Full dashboard data |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get user config |
| PUT | `/api/config` | Update config |

### Task Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue/status` | Queue statistics |
| POST | `/api/queue/retry/:id` | Retry failed task |
| POST | `/api/queue/pause` | Pause queue processing |
| POST | `/api/queue/resume` | Resume queue processing |

**Queue Status Response:**
```json
{
  "pending": 5,
  "processing": 2,
  "completed": 10,
  "failed": 1,
  "isPaused": false
}
```

---

## 🗄️ DATABASE SCHEMA

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | Task title |
| description | TEXT | Task description |
| repo_url | TEXT | GitHub repo URL |
| template_id | TEXT FK | Template used |
| pool_id | TEXT FK | Assigned agent pool |
| model | TEXT | OpenRouter model ID |
| status | TEXT | TODO/RESEARCH/DEV/QA/DONE |
| priority | INTEGER | 0-10 |
| cost_estimate | REAL | Estimated cost |
| actual_cost | REAL | Actual cost |
| metadata | TEXT | JSON extra data |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### agent_pools
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Pool name |
| icon | TEXT | Emoji icon |
| default_model | TEXT | Default model |
| max_parallel | INTEGER | Max concurrent agents |
| cost_limit | REAL | Monthly cost limit |
| auto_accept | INTEGER | Auto-start tasks |
| timeout_minutes | INTEGER | Agent timeout |
| retry_count | INTEGER | Retry attempts |
| notification_mode | TEXT | browser/telegram/both/none |
| is_paused | INTEGER | 0/1 |
| created_at | TEXT | ISO timestamp |

### agent_souls
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| pool_id | TEXT FK | Parent pool |
| name | TEXT NOT NULL | Soul name |
| description | TEXT | Soul description |
| soul | TEXT NOT NULL | Core personality |
| identity | TEXT NOT NULL | Identity config |
| bible | TEXT NOT NULL | Rules/principles |
| system_prompt | TEXT | Full LLM prompt |
| model | TEXT | Override model |
| temperature | REAL | LLM temperature |
| max_tokens | INTEGER | Max output tokens |

---

## 🧪 TESTING GUIDE

### Writing E2E Tests

Add tests to `tests/e2e/playwright.config.ts`:

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async () => {
    // Setup
  });

  test('should do something', async () => {
    // Test
    await page.click('text=Button');
    await expect(page.locator('text=Result')).toBeVisible();
  });
});
```

### Running Tests

```bash
# All tests
npm run test:e2e

# With UI
npm run test:e2e:ui

# Headed (visible browser)
npm run test:e2e:headed
```

### Test Coverage

- ✅ Health checks
- ✅ Kanban board (create, move tasks)
- ✅ Agent pools (create, edit, pause, resume)
- ✅ Analytics dashboard
- ✅ Settings
- ✅ Real-time updates
- ✅ API integration

---

## 🚀 DEPLOYMENT

### Production Build

```bash
# Build frontend
cd frontend && npm run build

# Start server
cd ..
node server-simple.mjs
```

### Environment Variables

```env
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=./data/claw-temple.db
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## 🐛 TROUBLESHOOTING

### Server won't start

```bash
# Check if port in use
lsof -i :3000

# Kill existing process
pkill -f "server-simple"

# Restart
node server-simple.mjs
```

### Database issues

```bash
# Reset database (WARNING: deletes all data!)
node scripts/db-init.mjs
```

### Frontend not loading

```bash
# Rebuild frontend
cd frontend && npm run build

# Check build output
ls -la frontend/dist/
```

### Tests failing

```bash
# Check server is running
curl http://localhost:3000/api/health

# Restart server if needed
node server-simple.mjs

# Run tests again
npm run test:e2e
```

---

## 📚 RESOURCES

- **Repository:** https://github.com/dragos-popas/claw-temple
- **Theme:** Cyberpunk 2077 (neon aesthetics)
- **Icons:** Use emojis for agent pools
- **Fonts:** Rajdhani (headings) + JetBrains Mono (code)

---

## 🦀 PRINCIPLES

1. **Production Quality** - Write tests, use TypeScript, follow conventions
2. **Documentation** - Document for future AIs
3. **Automation** - Maximize efficiency through automation
4. **Cyberpunk Aesthetic** - Keep the neon vibes
5. **OpenClaw Integration** - Leverage OpenClaw's SDK and services

---

_Last updated: 2026-02-11_  
_Maintained by: Kira (CLAW-TEMPLE AI Assistant)_