# CLAW-TEMPLE - Progress as of 2026-02-11

## Working Features
- ✅ Server runs with 345 OpenRouter models loaded
- ✅ Kanban board (TODO → DONE)
- ✅ Agent Pools (create/edit/pause/resume)
- ✅ Task creation with framework selector (Crawlee/Scrapy/Puppeteer/Playwright)
- ✅ Analytics dashboard
- ✅ Settings page
- ✅ API endpoints for souls (/api/agents/souls)
- ✅ Pre-seeded Crawlee (TypeScript) and Scrapy (Python) souls

## Known Issues to Fix

### 1. Model Dropdowns Show Limited Models (FIX NEEDED)
- Location: frontend/src/components/AgentPool.tsx and TaskModal.tsx
- Issue: Model dropdowns only show 2-3 hardcoded models instead of 345
- Cause: API calls to /api/models fail silently, falling back to defaults
- Fix: Ensure api.getModels() returns all 345 models

### 2. Task Settings Override Pool (NOT IMPLEMENTED)
- When creating a task, the selected model should override pool's default
- Currently: Pool's default_model is always used
- Fix: Task model field takes precedence over pool default_model

### 3. Server Stability - Use PM2
- Server crashes frequently
- Setup PM2 for auto-restart

### 4. Dragonfly Queue Integration (NEW)
- **task-worker-dragonfly.mjs** - Full Dragonfly-based queue worker
- **server-simple.mjs** - Updated to enqueue tasks to Dragonfly on creation
- **New API endpoints:**
  - `GET /api/queue/status` - View Dragonfly queue stats
  - `POST /api/queue/pause` - Pause queue processing
  - `POST /api/queue/resume` - Resume queue processing
  - `POST /api/queue/retry/:taskId` - Retry failed task

### 5. Enhanced Task Worker (NEW - NEEDS TESTING)
- Created `task-worker-enhanced.mjs` for full Kanban workflow
- General programming tasks now flow through: TODO → RESEARCH → DEV → QA → DONE
- Realistic developer comments from 5 personas at each step
- See `task-worker-enhanced-usage.md` for details

### 6. UI Bugs Fixed (2026-02-11 22:26)
- **Bug 1: No Agent Pools** ✅ FIXED - Created "General Developer" pool
- **Bug 2: No Souls** ✅ FIXED - Seeded Crawlee and Scrapy souls
- **Bug 3: UI Goes Black on Card Click** ✅ FIXED - Added null metadata checks in TaskDetail
- **Frontend**: Rebuilt with mobile-responsive updates
- **Database**: Fixed pool_id constraints and heartbeats table

## Files Modified/Added

### Frontend
- frontend/src/App.tsx - Added Souls tab
- frontend/src/components/AgentPool.tsx - Model dropdown
- frontend/src/components/TaskModal.tsx - Model dropdown + framework selector
- frontend/src/components/SoulManager.tsx - Souls UI (simplified)
- frontend/src/components/SoulEditor.tsx - Soul editor modal

### Backend
- server-simple.mjs - Model caching, souls endpoints, seed-defaults + **Dragonfly queue integration**
- task-worker.mjs - Updated to pick up tasks from TODO status
- **task-worker-dragonfly.mjs (NEW)** - Dragonfly queue worker with full workflow
- **task-worker-enhanced.mjs (NEW)** - Enhanced workflow with realistic dev comments
- scripts/create-hello-world-tasks.mjs - Updated to create tasks in TODO (not BACKLOG)
- **task-worker-enhanced-usage.md (NEW)** - Usage guide for enhanced worker
- **task-worker-dragonfly-usage.md (NEW)** - Usage guide for Dragonfly worker

### Documentation
- **CONTINUATION_PLAN.md (NEW)** - Detailed resume plan
- **README_FIRST.md (NEW)** - Quick reference guide

## Quick Commands

### Setup Dragonfly
```bash
# Start Dragonfly (Docker)
docker run --name dragonfly -p 6379:6379 -d dragonflydb/dragonfly

# Verify Dragonfly
redis-cli ping
```

### Start Services
```bash
cd /home/dp420/.openclaw/workspace/claw-temple

# Start server (enqueues tasks to Dragonfly)
node server-simple.mjs

# Start Dragonfly worker (processes from Dragonfly queue)
node task-worker-dragonfly.mjs

# Or use HTTP polling worker (legacy)
node task-worker.mjs
```

### With PM2
```bash
pm2 start server-simple.mjs --name claw-temple
pm2 start task-worker-dragonfly.mjs --name claw-temple-worker

pm2 status
pm2 logs claw-temple
pm2 logs claw-temple-worker
```

### Monitor Queue
```bash
# Check queue status
curl http://localhost:3000/api/queue/status

# Pause/Resume queue
curl -X POST http://localhost:3000/api/queue/pause
curl -X POST http://localhost:3000/api/queue/resume

# Retry failed task
curl -X POST http://localhost:3000/api/queue/retry/<task-id>
```

### Test API
```bash
# Create test task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","type":"general","language":"Python","priority":5}'

# Check task comments
curl http://localhost:3000/api/tasks/<task-id>/comments

# View all tasks
curl http://localhost:3000/api/tasks | python3 -m json.tool
```

## API Endpoints

### Models
- GET /api/models - Returns 345 OpenRouter models

### Souls
- GET /api/agents/souls - List all souls
- POST /api/agents/souls - Create soul
- PUT /api/agents/souls/:id - Update soul
- DELETE /api/agents/souls/:id - Delete soul
- POST /api/agents/souls/seed-defaults - Create Crawlee + Scrapy souls

### Pools
- GET /api/agents/pools - List pools
- POST /api/agents/pools - Create pool
- PUT /api/agents/pools/:id - Update pool
- POST /api/agents/pools/:id/pause - Pause
- POST /api/agents/pools/:id/resume - Resume

### Tasks
- GET /api/tasks - List tasks
- POST /api/tasks - Create task
- POST /api/tasks/:id/move - Move task (status change)

## To Continue Development

1. Check PROGRESS.md for current state
2. Run pm2 status to see if server is running
3. If down, run pm2 restart claw-temple
4. Check frontend with curl http://localhost:3000/
5. Test model loading with curl http://localhost:3000/api/models

## PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server-simple.mjs --name claw-temple

# Auto-boot
pm2 save
pm2 startup
```